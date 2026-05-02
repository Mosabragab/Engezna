-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Phase 16 — Gift Notifications + Reminders
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- Wires the gift system into the existing customer_notifications table so
-- customers see in-app activity for the events that matter (gift granted,
-- stamp card complete, loyalty tier upgrade, gift about to expire).
--
-- All notifications go through send_gift_notification(), which checks the
-- customer's notification_preferences before inserting — letting users opt
-- out of marketing-style notifications without losing transactional ones.
--
-- New schema:
--   • notification_preferences.gift_reminders BOOLEAN DEFAULT TRUE
--     Per plan §13.3, marketing-style reminders (expiry warnings, birthday
--     teasers, stamp progress) can be silenced; granted/used/refunded gifts
--     remain transactional and always notify.
--
--   • gift_reminder_log (gift_entry_id, kind, sent_at)
--     Idempotency table for the daily reminder cron — prevents the same gift
--     from triggering the same warning twice.
--
-- New triggers (all SECURITY DEFINER, AFTER INSERT/UPDATE):
--   • gift_box_entries AFTER INSERT  → notify "your gift just landed"
--   • gift_stamps AFTER UPDATE WHEN is_completed flipped to TRUE → notify
--   • profiles AFTER UPDATE OF loyalty_tier → notify on upgrade
--
-- New RPC for cron:
--   • send_gift_expiry_reminders_all() — finds gifts expiring within 48h
--     that haven't been reminded yet, inserts notifications, logs the send
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Schema additions                                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS gift_reminders BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.gift_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_entry_id UUID NOT NULL REFERENCES public.gift_box_entries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (gift_entry_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_gift_reminder_log_entry
  ON public.gift_reminder_log (gift_entry_id);


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ send_gift_notification — central insert helper (respects preferences)         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Categories:
--   • 'transactional' — granted/used/refunded gifts; ALWAYS sent
--   • 'marketing'      — expiry warnings, birthday teasers, stamp progress;
--                        silenced when notification_preferences.gift_reminders = false

DROP FUNCTION IF EXISTS public.send_gift_notification(
  UUID, TEXT, TEXT, VARCHAR, VARCHAR, TEXT, TEXT, JSONB
);

CREATE OR REPLACE FUNCTION public.send_gift_notification(
  p_user_id UUID,
  p_category TEXT,        -- 'transactional' | 'marketing'
  p_type TEXT,            -- 'gift_granted' | 'gift_expiry_warning' | 'stamp_complete' | 'loyalty_tier_up'
  p_title_ar VARCHAR,
  p_title_en VARCHAR,
  p_body_ar TEXT,
  p_body_en TEXT,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_send BOOLEAN := TRUE;
  v_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_category = 'marketing' THEN
    SELECT COALESCE(gift_reminders, TRUE) INTO v_send
    FROM public.notification_preferences
    WHERE user_id = p_user_id;
    IF v_send IS NULL THEN v_send := TRUE; END IF;
    IF NOT v_send THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.customer_notifications (
    customer_id, type, title_ar, title_en, body_ar, body_en, data
  ) VALUES (
    p_user_id, p_type, p_title_ar, p_title_en, p_body_ar, p_body_en, p_data
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_gift_notification(
  UUID, TEXT, TEXT, VARCHAR, VARCHAR, TEXT, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_gift_notification(
  UUID, TEXT, TEXT, VARCHAR, VARCHAR, TEXT, TEXT, JSONB
) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Trigger: gift_box_entries AFTER INSERT → "your gift just landed"              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.tg_notify_gift_granted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value_egp NUMERIC;
  v_title_ar VARCHAR;
  v_title_en VARCHAR;
  v_body_ar TEXT;
  v_body_en TEXT;
BEGIN
  -- Only notify for newly-granted, non-forwarded entries (gift_forward claims
  -- already produce a granted notification for the recipient via this same
  -- INSERT path; that's intentional)
  IF NEW.status <> 'granted' THEN
    RETURN NEW;
  END IF;

  v_value_egp := ROUND(NEW.cost_piasters / 100.0);

  -- Compose human messages — the customer-facing channel doesn't need to
  -- expose internal source codes
  v_title_ar := 'هدية جديدة في صندوقك! 🎁';
  v_title_en := 'A new gift just landed! 🎁';
  v_body_ar  := 'وصلتك هدية بقيمة ' || v_value_egp || ' ج.م. افتح صندوق الهدايا قبل ما تنتهي صلاحيتها.';
  v_body_en  := 'You got a gift worth ' || v_value_egp || ' EGP. Open your gift box before it expires.';

  PERFORM public.send_gift_notification(
    NEW.user_id,
    'transactional',
    'gift_box',
    v_title_ar,
    v_title_en,
    v_body_ar,
    v_body_en,
    jsonb_build_object(
      'gift_entry_id', NEW.id,
      'source', NEW.source,
      'cost_piasters', NEW.cost_piasters,
      'expires_at', NEW.expires_at
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gift_box_entries_after_insert_notify ON public.gift_box_entries;
CREATE TRIGGER gift_box_entries_after_insert_notify
  AFTER INSERT ON public.gift_box_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_notify_gift_granted();


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Trigger: gift_stamps UPDATE → notify on completion (one-shot)                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.tg_notify_stamp_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fire only on the transition false -> true
  IF NEW.is_completed = TRUE AND COALESCE(OLD.is_completed, FALSE) = FALSE THEN
    PERFORM public.send_gift_notification(
      NEW.user_id,
      'transactional',
      'stamp_complete',
      'بطاقة الأختام اكتملت! ✨',
      'Your stamp card is complete! ✨',
      'مبروك! بطاقة الأختام اكتملت. صندوق ذهبي في انتظارك في صفحة الهدايا.',
      'Congrats! Your stamp card is full. A golden box is waiting in your rewards.',
      jsonb_build_object('stamp_id', NEW.id, 'golden_box_id', NEW.golden_box_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gift_stamps_after_update_notify ON public.gift_stamps;
CREATE TRIGGER gift_stamps_after_update_notify
  AFTER UPDATE ON public.gift_stamps
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_notify_stamp_complete();


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Trigger: profiles UPDATE OF loyalty_tier → notify on upgrade                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Tier order (low → high): bronze, silver, gold, platinum. We notify only on
-- upgrades (preventing noise when admin manually downgrades or on new sign-up
-- defaults).

CREATE OR REPLACE FUNCTION public.tg_notify_loyalty_tier_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rank_old INT;
  v_rank_new INT;
  v_label_ar TEXT;
  v_label_en TEXT;
BEGIN
  v_rank_old := CASE COALESCE(OLD.loyalty_tier, 'bronze')
    WHEN 'bronze' THEN 1 WHEN 'silver' THEN 2 WHEN 'gold' THEN 3 WHEN 'platinum' THEN 4
    ELSE 0
  END;
  v_rank_new := CASE COALESCE(NEW.loyalty_tier, 'bronze')
    WHEN 'bronze' THEN 1 WHEN 'silver' THEN 2 WHEN 'gold' THEN 3 WHEN 'platinum' THEN 4
    ELSE 0
  END;

  IF v_rank_new <= v_rank_old THEN
    RETURN NEW;
  END IF;

  v_label_ar := CASE NEW.loyalty_tier
    WHEN 'silver' THEN 'الفضي'
    WHEN 'gold' THEN 'الذهبي'
    WHEN 'platinum' THEN 'البلاتيني'
    ELSE NEW.loyalty_tier
  END;
  v_label_en := initcap(NEW.loyalty_tier);

  PERFORM public.send_gift_notification(
    NEW.id,
    'transactional',
    'loyalty',
    'وصلت للمستوى ' || v_label_ar || '! 🏆',
    'Welcome to ' || v_label_en || '! 🏆',
    'مبارك الترقية. مكافآت جديدة في انتظارك في صفحة الهدايا.',
    'Congrats on the upgrade. New rewards await in your rewards hub.',
    jsonb_build_object('previous_tier', OLD.loyalty_tier, 'new_tier', NEW.loyalty_tier)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_loyalty_tier_change_notify ON public.profiles;
CREATE TRIGGER profiles_loyalty_tier_change_notify
  AFTER UPDATE OF loyalty_tier ON public.profiles
  FOR EACH ROW
  WHEN (OLD.loyalty_tier IS DISTINCT FROM NEW.loyalty_tier)
  EXECUTE FUNCTION public.tg_notify_loyalty_tier_change();


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ send_gift_expiry_reminders_all — daily cron entry point                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Walks all unused gifts that expire within the next 48 hours, sends a single
-- "expires soon" reminder per gift, and writes to gift_reminder_log so the
-- next cron run skips them.
--
-- Returns: number of reminders actually sent (0 when everything's logged).

DROP FUNCTION IF EXISTS public.send_gift_expiry_reminders_all();

CREATE OR REPLACE FUNCTION public.send_gift_expiry_reminders_all()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_row RECORD;
  v_value_egp NUMERIC;
  v_hours_left INT;
BEGIN
  FOR v_row IN
    SELECT e.id, e.user_id, e.cost_piasters, e.expires_at
    FROM public.gift_box_entries e
    LEFT JOIN public.gift_reminder_log l
      ON l.gift_entry_id = e.id AND l.kind = 'expiry_warning_48h'
    WHERE e.status IN ('granted', 'opened')
      AND e.expires_at > NOW()
      AND e.expires_at <= NOW() + INTERVAL '48 hours'
      AND l.id IS NULL
  LOOP
    v_value_egp  := ROUND(v_row.cost_piasters / 100.0);
    v_hours_left := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_row.expires_at - NOW())) / 3600.0))::INT;

    PERFORM public.send_gift_notification(
      v_row.user_id,
      'marketing',
      'gift_expiry',
      'هديتك على وشك تنتهي ⏰',
      'Your gift is about to expire ⏰',
      'صندوق الهدية بقيمة ' || v_value_egp || ' ج.م يخلص خلال ' || v_hours_left || ' ساعة. استخدمه قبل ما يفوت!',
      'Your ' || v_value_egp || ' EGP gift expires in ~' || v_hours_left || 'h. Use it before it''s gone!',
      jsonb_build_object(
        'gift_entry_id', v_row.id,
        'expires_at', v_row.expires_at,
        'hours_left', v_hours_left
      )
    );

    -- Log even when the user opted out of marketing — so we don't keep
    -- evaluating them daily (the helper returned NULL but the gift is the
    -- same; treating both branches identically keeps the cron O(1) per gift).
    INSERT INTO public.gift_reminder_log (gift_entry_id, kind)
    VALUES (v_row.id, 'expiry_warning_48h')
    ON CONFLICT DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.send_gift_expiry_reminders_all() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_gift_expiry_reminders_all() FROM anon;
REVOKE ALL ON FUNCTION public.send_gift_expiry_reminders_all() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.send_gift_expiry_reminders_all() TO service_role;
