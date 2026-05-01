-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Phase 10 follow-up — Replace birthday idempotency index with a
-- UNIQUE partial index + race-safe insert
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- Supersedes 20260429000005. The previous (non-unique) index sped up the
-- COUNT(*) idempotency check inside process_birthday_gifts but did NOT close
-- the TOCTOU window between the COUNT and the grant_gift_atomic INSERT — two
-- concurrent cron runs could both pass the COUNT check and both insert, giving
-- the same user two birthday gifts on the same day.
--
-- Defense in depth at the database layer:
--   1. Drop the non-unique index.
--   2. Create a UNIQUE partial index on (user_id, day-as-UTC) WHERE source =
--      'birthday'. The index expression is IMMUTABLE (AT TIME ZONE with a
--      literal), so it is index-safe.
--   3. Recreate process_birthday_gifts with an exception handler around the
--      grant_gift_atomic call so a unique_violation (raced sibling cron) is
--      swallowed silently — the loop just moves to the next user.
--
-- The COUNT(*) pre-check is kept as the fast path; it avoids triggering an
-- exception in the common (non-raced) case.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Index swap                                                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP INDEX IF EXISTS public.idx_gift_box_entries_birthday_idempotency;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_box_entries_birthday_idempotency
  ON public.gift_box_entries (user_id, ((created_at AT TIME ZONE 'UTC')::date))
  WHERE source = 'birthday';


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ process_birthday_gifts — race-safe via EXCEPTION WHEN unique_violation        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

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

    -- Fast-path idempotency: skip if this user already got a birthday gift today.
    -- The unique partial index is the authoritative guard against concurrent
    -- runs; this query just avoids forcing exceptions in the common case.
    SELECT COUNT(*) INTO v_already
    FROM public.gift_box_entries
    WHERE user_id = v_user.id
      AND source = 'birthday'
      AND created_at >= CURRENT_DATE
      AND created_at < CURRENT_DATE + INTERVAL '1 day';

    IF v_already > 0 THEN
      CONTINUE;
    END IF;

    -- Defense in depth: a concurrent cron run could pass the COUNT check at
    -- the same time. The unique partial index on
    -- (user_id, (created_at AT TIME ZONE 'UTC')::date) WHERE source='birthday'
    -- guarantees only one row wins; the loser raises unique_violation, which
    -- we catch and treat as "another runner already granted this user today".
    BEGIN
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
    EXCEPTION
      WHEN unique_violation THEN
        -- Sibling cron raced us — their grant counts; we simply move on.
        NULL;
    END;
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


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Permissions — match Phase 10 baseline                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

REVOKE ALL ON FUNCTION public.process_birthday_gifts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_birthday_gifts() FROM anon;
REVOKE ALL ON FUNCTION public.process_birthday_gifts() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_birthday_gifts() TO service_role;
