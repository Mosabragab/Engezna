-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Phase 10 — Manual Campaigns + Birthday Gifts
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- Reuses the existing public.gift_rules table for storage:
--   • Manual campaigns:  trigger = 'manual_campaign'   (admin-fired one-shots)
--   • Birthday auto:     trigger = 'birthday'          (daily cron walks profiles.birthdate)
--
-- Adds two atomic RPCs and a small index for the birthday cron.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Index — birthday cron walks profiles by birth month/day                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Functional index on (month, day) so the daily query is O(log N) per match.

CREATE INDEX IF NOT EXISTS idx_profiles_birthday_md
  ON public.profiles((EXTRACT(MONTH FROM birthdate)), (EXTRACT(DAY FROM birthdate)))
  WHERE birthdate IS NOT NULL;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ execute_manual_campaign_atomic — admin one-shot dispatch                      ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Walks the audience defined by gift_rules.conditions and grants each matching
-- user a gift via grant_gift_atomic. Each grant is its own atomic call so a
-- failure on one user doesn't roll back the whole campaign.
--
-- Audience filter (as JSONB on gift_rules.conditions):
--   { "governorate_id": "<uuid>" }   (optional — null = all)
--   { "segment": "<segment>" }        (optional — matches profiles.last_segment)
-- Action shape (as JSONB on gift_rules.action):
--   { "value_piasters": 500,
--     "bucket": "manual_campaign",
--     "expiry_days": 7,
--     "max_recipients": 500 }

DROP FUNCTION IF EXISTS public.execute_manual_campaign_atomic(UUID);

CREATE OR REPLACE FUNCTION public.execute_manual_campaign_atomic(p_rule_id UUID)
RETURNS TABLE (granted INT, attempted INT, total_cost_piasters BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rule public.gift_rules%ROWTYPE;
  v_value_piasters BIGINT;
  v_bucket TEXT;
  v_expiry_days INT;
  v_max_recipients INT;
  v_governorate UUID;
  v_segment TEXT;
  v_user RECORD;
  v_entry public.gift_box_entries%ROWTYPE;
  v_granted INT := 0;
  v_attempted INT := 0;
  v_total_cost BIGINT := 0;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_admin(v_user_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_rule FROM public.gift_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_found';
  END IF;
  IF v_rule.trigger <> 'manual_campaign' THEN
    RAISE EXCEPTION 'not_a_manual_campaign';
  END IF;
  IF NOT v_rule.is_active THEN
    RAISE EXCEPTION 'campaign_inactive';
  END IF;

  -- Pull action params with sane defaults
  v_value_piasters := COALESCE((v_rule.action->>'value_piasters')::BIGINT, 500);
  v_bucket         := COALESCE(v_rule.action->>'bucket', v_rule.budget_bucket, 'mystery');
  v_expiry_days    := COALESCE((v_rule.action->>'expiry_days')::INT, 7);
  v_max_recipients := COALESCE((v_rule.action->>'max_recipients')::INT, 500);

  -- Pull audience filter
  v_governorate    := NULLIF(v_rule.conditions->>'governorate_id', '')::UUID;
  v_segment        := NULLIF(v_rule.conditions->>'segment', '');

  -- Walk matching users (capped at max_recipients)
  FOR v_user IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.role = 'customer'
      AND (v_governorate IS NULL OR p.governorate_id = v_governorate)
      AND (v_segment IS NULL OR p.last_segment::text = v_segment)
    ORDER BY p.created_at DESC
    LIMIT v_max_recipients
  LOOP
    v_attempted := v_attempted + 1;

    SELECT * INTO v_entry FROM public.grant_gift_atomic(
      v_user.id,
      NULL,
      'manual_campaign'::public.gift_source,
      p_rule_id,
      v_bucket,
      v_value_piasters,
      'engezna',
      NULL,
      v_expiry_days
    );

    IF v_entry.id IS NOT NULL THEN
      v_granted := v_granted + 1;
      v_total_cost := v_total_cost + v_value_piasters;
    END IF;
  END LOOP;

  -- Update campaign stats
  UPDATE public.gift_rules
  SET
    applied_count = COALESCE(applied_count, 0) + v_granted,
    total_cost_piasters = COALESCE(total_cost_piasters, 0) + v_total_cost,
    updated_at = NOW()
  WHERE id = p_rule_id;

  granted := v_granted;
  attempted := v_attempted;
  total_cost_piasters := v_total_cost;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_manual_campaign_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_manual_campaign_atomic(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.execute_manual_campaign_atomic(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.execute_manual_campaign_atomic(UUID) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ process_birthday_gifts — daily cron entry point                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Walks every customer whose birthdate matches today's month/day and grants a
-- birthday gift via grant_gift_atomic. Idempotent for the day via a unique
-- partial index on gift_box_entries (user_id + source='birthday' + date trunc).
--
-- The birthday rule lives in gift_rules with trigger='birthday' and is_active=
-- true; if no such rule exists we skip the run entirely (operator opt-in).

DROP FUNCTION IF EXISTS public.process_birthday_gifts();

CREATE OR REPLACE FUNCTION public.process_birthday_gifts()
RETURNS TABLE (granted INT, attempted INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.gift_rules%ROWTYPE;
  v_value_piasters BIGINT;
  v_bucket TEXT;
  v_expiry_days INT;
  v_today_month INT := EXTRACT(MONTH FROM CURRENT_DATE);
  v_today_day INT := EXTRACT(DAY FROM CURRENT_DATE);
  v_user RECORD;
  v_entry public.gift_box_entries%ROWTYPE;
  v_already INT;
  v_granted INT := 0;
  v_attempted INT := 0;
BEGIN
  -- Find the active birthday rule (operator-managed)
  SELECT * INTO v_rule
  FROM public.gift_rules
  WHERE trigger = 'birthday' AND is_active = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE '[process_birthday_gifts] no active birthday rule — skipping';
    granted := 0;
    attempted := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  v_value_piasters := COALESCE((v_rule.action->>'value_piasters')::BIGINT, 1500); -- 15 EGP default
  v_bucket         := COALESCE(v_rule.action->>'bucket', v_rule.budget_bucket, 'win_back');
  v_expiry_days    := COALESCE((v_rule.action->>'expiry_days')::INT, 7);

  FOR v_user IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.birthdate IS NOT NULL
      AND p.role = 'customer'
      AND EXTRACT(MONTH FROM p.birthdate) = v_today_month
      AND EXTRACT(DAY FROM p.birthdate) = v_today_day
  LOOP
    v_attempted := v_attempted + 1;

    -- Idempotency for the day: skip if this user already got a birthday gift today
    SELECT COUNT(*) INTO v_already
    FROM public.gift_box_entries
    WHERE user_id = v_user.id
      AND source = 'birthday'
      AND created_at >= CURRENT_DATE
      AND created_at < CURRENT_DATE + INTERVAL '1 day';

    IF v_already > 0 THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_entry FROM public.grant_gift_atomic(
      v_user.id,
      NULL,
      'birthday'::public.gift_source,
      v_rule.id,
      v_bucket,
      v_value_piasters,
      'engezna',
      NULL,
      v_expiry_days
    );

    IF v_entry.id IS NOT NULL THEN
      v_granted := v_granted + 1;
    END IF;
  END LOOP;

  -- Update rule stats
  UPDATE public.gift_rules
  SET
    applied_count = COALESCE(applied_count, 0) + v_granted,
    total_cost_piasters = COALESCE(total_cost_piasters, 0) + (v_granted * v_value_piasters),
    updated_at = NOW()
  WHERE id = v_rule.id;

  granted := v_granted;
  attempted := v_attempted;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.process_birthday_gifts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_birthday_gifts() FROM anon;
REVOKE ALL ON FUNCTION public.process_birthday_gifts() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_birthday_gifts() TO service_role;
