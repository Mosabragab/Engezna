-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: v2.5.2 — Hide gift values in notifications (real surprise)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-13
-- Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §1.1 point 5 (v2.5.2)
--
-- Aman's correction: Notification reveals gift value before user opens it →
-- destroys the surprise. New rule: notification triggers fascination, not
-- expectation. Value is only revealed during the reveal animation.
--
-- Examples (before → after):
--   "وصلتك هدية بقيمة 15 ج.م 🎁" → "📦 إنجزنا أرسلت لك مفاجأة"
--   "أكملت بطاقة الأختام! استلم 50 ج.م" → "🎉 صندوقك الذهبي جاهز"
--   "صديقك أكمل طلبه. وصلتك 25 ج.م" → "🎁 صديقك أرسل لك شيئًا"
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Rebuild send_gift_notification to omit values ──────────────────────────
DROP FUNCTION IF EXISTS public.send_gift_notification(UUID, TEXT, TEXT, JSONB, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.send_gift_notification(TEXT, TEXT, JSONB, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.send_gift_notification(
  p_user_id   UUID,
  p_category  TEXT,    -- 'transactional' (always sent) or 'marketing' (respects opt-out)
  p_kind      TEXT     -- 'gift_box' / 'loyalty' / 'referral_reward' / 'stamp_complete' / 'gift_expiry'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title_ar TEXT;
  v_title_en TEXT;
  v_body_ar  TEXT;
  v_body_en  TEXT;
  v_prefs    BOOLEAN := TRUE;
BEGIN
  -- Respect marketing opt-out
  IF p_category = 'marketing' THEN
    SELECT COALESCE(gift_reminders, TRUE) INTO v_prefs
    FROM public.notification_preferences
    WHERE user_id = p_user_id;

    IF NOT v_prefs THEN
      RETURN;
    END IF;
  END IF;

  -- Choose copy by kind — values NEVER revealed
  CASE p_kind
    WHEN 'gift_box' THEN
      v_title_ar := '🎁 لديك مفاجأة جديدة';
      v_title_en := '🎁 You have a new surprise';
      v_body_ar  := 'افتح التطبيق لاكتشاف هديتك. تنتهي خلال أيام قليلة!';
      v_body_en  := 'Open the app to discover your gift. Expires in a few days!';

    WHEN 'stamp_complete' THEN
      v_title_ar := '🎉 صندوقك الذهبي جاهز';
      v_title_en := '🎉 Your Golden Box is ready';
      v_body_ar  := 'أكملت بطاقة الأختام! افتح التطبيق لاستلام مفاجأتك.';
      v_body_en  := 'You completed the stamp card! Open the app to claim.';

    WHEN 'referral_reward' THEN
      v_title_ar := '🎁 صديقك أرسل لك شيئًا';
      v_title_en := '🎁 Your friend sent you something';
      v_body_ar  := 'صديقك أكمل أول طلب. مكافأتك في انتظارك!';
      v_body_en  := 'Your friend completed their first order. Reward awaits!';

    WHEN 'loyalty_tier_up' THEN
      v_title_ar := '🏆 وصلت لمستوى جديد!';
      v_title_en := '🏆 You reached a new tier!';
      v_body_ar  := 'افتح التطبيق لاكتشاف مزاياك الجديدة.';
      v_body_en  := 'Open the app to discover your new benefits.';

    WHEN 'gift_expiry' THEN
      v_title_ar := '⏰ مفاجأتك مازالت في انتظارك';
      v_title_en := '⏰ Your surprise is still waiting';
      v_body_ar  := 'لا تفوّتها — افتح التطبيق قبل انتهاء الصلاحية.';
      v_body_en  := 'Don''t miss it — open the app before expiry.';

    WHEN 'welcome_signup' THEN
      v_title_ar := '🎁 أهلًا بيك في إنجزنا';
      v_title_en := '🎁 Welcome to Engezna';
      v_body_ar  := 'هديتك التُرحيبية في انتظارك. افتح التطبيق لاكتشافها!';
      v_body_en  := 'Your welcome gift awaits. Open the app to discover!';

    WHEN 'streak_milestone' THEN
      v_title_ar := '🔥 أنت في طريق الإنجاز';
      v_title_en := '🔥 You''re on a roll';
      v_body_ar  := 'افتح التطبيق لرؤية شارتك الجديدة.';
      v_body_en  := 'Open the app to see your new badge.';

    ELSE
      -- Generic fallback (no value revealed)
      v_title_ar := '🎁 لديك مفاجأة';
      v_title_en := '🎁 You have a surprise';
      v_body_ar  := 'افتح التطبيق لاكتشاف التفاصيل.';
      v_body_en  := 'Open the app to discover.';
  END CASE;

  -- Insert in-app notification (FCM is dispatched by trigger on customer_notifications)
  INSERT INTO public.customer_notifications (
    customer_id, type, title_ar, title_en, body_ar, body_en, is_read
  ) VALUES (
    p_user_id, p_kind, v_title_ar, v_title_en, v_body_ar, v_body_en, FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_gift_notification(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_gift_notification(UUID, TEXT, TEXT) TO service_role;

-- ─── 2. Rebuild existing triggers to call new function (no value leakage) ──────
-- The triggers from migration 20260429000008 still exist but called the old
-- function with embedded values. Drop & recreate.

DROP TRIGGER IF EXISTS trg_gift_box_entry_notify ON public.gift_box_entries;
DROP TRIGGER IF EXISTS trg_gift_stamps_complete_notify ON public.gift_stamps;
DROP TRIGGER IF EXISTS trg_profile_tier_upgrade_notify ON public.profiles;

CREATE OR REPLACE FUNCTION public.trg_notify_gift_box_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use 'welcome_signup' kind for the welcome flow, otherwise 'gift_box'
  IF NEW.source = 'welcome_signup' THEN
    PERFORM public.send_gift_notification(NEW.user_id, 'transactional', 'welcome_signup');
  ELSE
    PERFORM public.send_gift_notification(NEW.user_id, 'marketing', 'gift_box');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gift_box_entry_notify
  AFTER INSERT ON public.gift_box_entries
  FOR EACH ROW
  WHEN (NEW.status = 'granted')
  EXECUTE FUNCTION public.trg_notify_gift_box_inserted();

CREATE OR REPLACE FUNCTION public.trg_notify_stamp_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_completed = TRUE AND (OLD.is_completed IS NULL OR OLD.is_completed = FALSE) THEN
    PERFORM public.send_gift_notification(NEW.user_id, 'transactional', 'stamp_complete');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gift_stamps_complete_notify
  AFTER UPDATE OF is_completed ON public.gift_stamps
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_stamp_complete();

CREATE OR REPLACE FUNCTION public.trg_notify_tier_upgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tier_order JSONB := '{"bronze":1,"silver":2,"gold":3,"platinum":4}'::JSONB;
  v_old_rank   INT := COALESCE((v_tier_order->>OLD.loyalty_tier)::INT, 0);
  v_new_rank   INT := COALESCE((v_tier_order->>NEW.loyalty_tier)::INT, 0);
BEGIN
  IF v_new_rank > v_old_rank AND NEW.loyalty_tier != 'bronze' THEN
    PERFORM public.send_gift_notification(NEW.id, 'transactional', 'loyalty_tier_up');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_tier_upgrade_notify
  AFTER UPDATE OF loyalty_tier ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_tier_upgrade();

COMMENT ON FUNCTION public.send_gift_notification(UUID, TEXT, TEXT) IS
  'v2.5.2: Notification copy never reveals gift values. Triggers fascination, not expectation.';
