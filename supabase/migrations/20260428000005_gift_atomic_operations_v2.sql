-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Gift Atomic Operations v2 — additional RPCs + index
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-28
-- Resolves CodeRabbit follow-up review on Phase 8 PR:
--   - revoke_gift_atomic (TOCTOU-safe revoke)
--   - clawback_order_atomic (atomic batch clawback)
--   - expire_overdue_gifts_batch (batch expire)
--   - complete_referral_atomic v2: now validates subtotal min internally
--   - idx_gift_financial_log_budget (perf index for monthly bucket sums)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 1: Performance index for grant_gift_atomic budget query                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_gift_financial_log_budget
  ON public.gift_financial_log(bucket, funder_type, created_at)
  WHERE transaction_type = 'grant';


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 2: revoke_gift_atomic (replaces TS-side read-modify-write)              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Conditional UPDATE (only revokes non-used gifts) + INSERT log in one txn.

DROP FUNCTION IF EXISTS public.revoke_gift_atomic(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.revoke_gift_atomic(p_id UUID, p_reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.gift_box_entries%ROWTYPE;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'p_id cannot be NULL';
  END IF;

  UPDATE public.gift_box_entries
  SET status = 'revoked'
  WHERE id = p_id
    AND status IN ('granted', 'opened')
  RETURNING * INTO v_entry;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.gift_financial_log (
    transaction_type, amount_piasters, bucket, funder_type,
    funder_provider_id, user_id, gift_entry_id, notes
  ) VALUES (
    'revoke', v_entry.cost_piasters, v_entry.bucket_name, v_entry.funder_type,
    v_entry.funder_provider_id, v_entry.user_id, v_entry.id, p_reason
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_gift_atomic(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_gift_atomic(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.revoke_gift_atomic(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_gift_atomic(UUID, TEXT) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 3: clawback_order_atomic                                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Single transaction logs clawback for every used gift on the order.
-- All-or-nothing: a single failure rolls back the whole batch.

DROP FUNCTION IF EXISTS public.clawback_order_atomic(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.clawback_order_atomic(
  p_order_id UUID,
  p_fault_source TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id cannot be NULL';
  END IF;

  IF p_fault_source NOT IN ('customer', 'fraud') THEN
    -- No clawback for provider/delivery/system faults (per plan §12.0)
    RETURN 0;
  END IF;

  WITH inserted AS (
    INSERT INTO public.gift_financial_log (
      transaction_type, amount_piasters, bucket, funder_type,
      funder_provider_id, user_id, gift_entry_id, order_id, notes
    )
    SELECT
      'clawback',
      e.cost_piasters,
      e.bucket_name,
      e.funder_type,
      e.funder_provider_id,
      e.user_id,
      e.id,
      p_order_id,
      'Clawback due to ' || p_fault_source || ' refund on order ' || p_order_id::text
    FROM public.gift_box_entries e
    WHERE e.used_order_id = p_order_id
      AND e.status = 'used'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.clawback_order_atomic(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clawback_order_atomic(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.clawback_order_atomic(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.clawback_order_atomic(UUID, TEXT) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 4: expire_overdue_gifts_batch                                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Single CTE: conditional UPDATE on all overdue gifts + INSERT into log.

DROP FUNCTION IF EXISTS public.expire_overdue_gifts_batch();

CREATE OR REPLACE FUNCTION public.expire_overdue_gifts_batch()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH expired AS (
    UPDATE public.gift_box_entries
    SET status = 'expired'
    WHERE status IN ('granted', 'opened')
      AND expires_at < NOW()
    RETURNING *
  ),
  logged AS (
    INSERT INTO public.gift_financial_log (
      transaction_type, amount_piasters, bucket, funder_type,
      funder_provider_id, user_id, gift_entry_id, notes
    )
    SELECT
      'expire', cost_piasters, bucket_name, funder_type,
      funder_provider_id, user_id, id, 'Auto-expired by cron (batch)'
    FROM expired
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM logged;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_overdue_gifts_batch() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_overdue_gifts_batch() FROM anon;
REVOKE ALL ON FUNCTION public.expire_overdue_gifts_batch() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_gifts_batch() TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 5: complete_referral_atomic v2 — adds subtotal eligibility check       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Replaces v1: now self-validates the order qualifies (status + payment +
-- subtotal min + customer match + first delivered order) so the RPC is safe to
-- call directly without external pre-checks.

DROP FUNCTION IF EXISTS public.complete_referral_atomic(UUID, UUID);

CREATE OR REPLACE FUNCTION public.complete_referral_atomic(
  p_referee_id UUID,
  p_order_id UUID
)
RETURNS TABLE (
  referral_id UUID,
  referrer_gift_entry_id UUID,
  referee_gift_entry_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
  v_settings public.retention_settings%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_subtotal_piasters BIGINT;
  v_prior_orders INT;
  v_month_start TIMESTAMPTZ;
  v_monthly_count INT;
  v_referrer_entry public.gift_box_entries%ROWTYPE;
  v_referee_entry public.gift_box_entries%ROWTYPE;
BEGIN
  IF p_referee_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_referee_id and p_order_id required';
  END IF;

  -- Lock pending referral row
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referee_id = p_referee_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_pending_referral';
  END IF;

  -- Load + verify the order (delivered + paid + owned by referee)
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND OR v_order.customer_id IS DISTINCT FROM p_referee_id THEN
    RAISE EXCEPTION 'order_not_qualifying';
  END IF;
  IF v_order.status::text <> 'delivered' OR v_order.payment_status::text <> 'completed' THEN
    RAISE EXCEPTION 'order_not_qualifying';
  END IF;

  -- Must be first delivered order
  SELECT COUNT(*) INTO v_prior_orders
  FROM public.orders
  WHERE customer_id = p_referee_id
    AND status::text = 'delivered'
    AND created_at < v_order.created_at;
  IF v_prior_orders > 0 THEN
    RAISE EXCEPTION 'order_not_qualifying';
  END IF;

  -- Settings + subtotal eligibility
  SELECT * INTO v_settings FROM public.retention_settings WHERE id = 1 FOR SHARE;
  v_subtotal_piasters := ROUND(COALESCE(v_order.subtotal, 0) * 100);
  IF v_subtotal_piasters < v_settings.referral_min_first_order_piasters THEN
    RAISE EXCEPTION 'order_below_minimum';
  END IF;

  -- Monthly cap check for referrer
  v_month_start := DATE_TRUNC('month', NOW());
  SELECT COUNT(*) INTO v_monthly_count
  FROM public.referrals
  WHERE referrer_id = v_referral.referrer_id
    AND status = 'completed'
    AND completed_at >= v_month_start;
  IF v_monthly_count >= v_settings.referral_monthly_limit_per_user THEN
    RAISE EXCEPTION 'monthly_cap_reached';
  END IF;

  -- Grant referrer reward
  SELECT * INTO v_referrer_entry FROM public.grant_gift_atomic(
    v_referral.referrer_id, NULL, 'referral'::public.gift_source, NULL,
    'referral', v_settings.referral_reward_piasters, 'engezna', NULL,
    v_settings.gift_default_expiry_days
  );
  IF v_referrer_entry.id IS NULL THEN
    RAISE EXCEPTION 'referrer_grant_failed';
  END IF;

  -- Grant referee welcome reward
  SELECT * INTO v_referee_entry FROM public.grant_gift_atomic(
    p_referee_id, NULL, 'welcome'::public.gift_source, NULL,
    'welcome', v_settings.referral_reward_piasters, 'engezna', NULL,
    v_settings.gift_default_expiry_days
  );
  IF v_referee_entry.id IS NULL THEN
    RAISE EXCEPTION 'referee_grant_failed';
  END IF;

  UPDATE public.referrals
  SET
    status = 'completed',
    completed_at = NOW(),
    referee_first_order_id = p_order_id,
    referrer_credit_applied = TRUE,
    referee_credit_applied = TRUE
  WHERE id = v_referral.id;

  referral_id := v_referral.id;
  referrer_gift_entry_id := v_referrer_entry.id;
  referee_gift_entry_id := v_referee_entry.id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_referral_atomic(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_referral_atomic(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.complete_referral_atomic(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_referral_atomic(UUID, UUID) TO service_role;
