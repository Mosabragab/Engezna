-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Loyalty Points + Order Completion Hook
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-28
-- Purpose: Phase 12A — wire up the order-completion flow that activates the
-- entire gift/loyalty/referral system, plus atomic loyalty operations.
--
-- Adds:
--   - order_completion_processed (idempotency table)
--   - loyalty_redemption gift_source enum value
--   - award_loyalty_points_atomic RPC
--   - redeem_loyalty_points_atomic RPC
--   - clawback_loyalty_points_atomic RPC
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 1: Idempotency table for order completion processing                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- One row per order that has been processed by the completion hook. PK on
-- order_id makes the hook trivially idempotent — concurrent cron runs that race
-- on the same order will lose the INSERT and skip processing.

CREATE TABLE IF NOT EXISTS public.order_completion_processed (
  order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  results JSONB DEFAULT '{}'::jsonb,
  error_count INT DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_order_completion_processed_at
  ON public.order_completion_processed(processed_at DESC);

ALTER TABLE public.order_completion_processed ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service can manage completion log"
    ON public.order_completion_processed FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view completion log"
    ON public.order_completion_processed FOR SELECT
    USING (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 2: Add loyalty_redemption to gift_source enum                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DO $$ BEGIN
  ALTER TYPE public.gift_source ADD VALUE IF NOT EXISTS 'loyalty_redemption';
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 3: Helper — compute_loyalty_tier(p_lifetime_points)                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Single source of truth for tier thresholds. Called by award/clawback RPCs.

CREATE OR REPLACE FUNCTION public.compute_loyalty_tier(p_lifetime_points INT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_lifetime_points >= 5000 THEN RETURN 'platinum'; END IF;
  IF p_lifetime_points >= 1500 THEN RETURN 'gold'; END IF;
  IF p_lifetime_points >= 500  THEN RETURN 'silver'; END IF;
  RETURN 'bronze';
END;
$$;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 4: ATOMIC RPC — award_loyalty_points_atomic                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Single transaction:
--   1. Lock loyalty_points row (creates if missing) FOR UPDATE
--   2. Increment balance + lifetime
--   3. Recompute tier (auto-promotion)
--   4. INSERT into loyalty_transactions
-- Returns the updated row + a flag indicating tier change for celebration UI.

DROP FUNCTION IF EXISTS public.award_loyalty_points_atomic(UUID, UUID, INT, TEXT);

CREATE OR REPLACE FUNCTION public.award_loyalty_points_atomic(
  p_user_id UUID,
  p_order_id UUID,
  p_points INT,
  p_description TEXT DEFAULT 'Order completion reward'
)
RETURNS TABLE (
  user_id UUID,
  points_balance INT,
  lifetime_points INT,
  tier TEXT,
  tier_changed BOOLEAN,
  previous_tier TEXT,
  transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.loyalty_points%ROWTYPE;
  v_old_tier TEXT;
  v_new_tier TEXT;
  v_new_balance INT;
  v_new_lifetime INT;
  v_tx_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be NULL';
  END IF;

  IF p_points IS NULL OR p_points < 0 THEN
    RAISE EXCEPTION 'p_points must be non-negative';
  END IF;

  -- Lock or create loyalty row
  SELECT * INTO v_existing
  FROM public.loyalty_points
  WHERE loyalty_points.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.loyalty_points (user_id, points_balance, lifetime_points, tier)
    VALUES (p_user_id, 0, 0, 'bronze')
    RETURNING * INTO v_existing;
  END IF;

  v_old_tier := v_existing.tier;
  v_new_balance := v_existing.points_balance + p_points;
  v_new_lifetime := v_existing.lifetime_points + p_points;
  v_new_tier := public.compute_loyalty_tier(v_new_lifetime);

  UPDATE public.loyalty_points
  SET
    points_balance = v_new_balance,
    lifetime_points = v_new_lifetime,
    tier = v_new_tier
  WHERE loyalty_points.user_id = p_user_id;

  -- Skip transaction log + cache update for zero-point awards
  IF p_points > 0 THEN
    INSERT INTO public.loyalty_transactions (
      user_id, order_id, points, transaction_type, description, balance_after
    ) VALUES (
      p_user_id, p_order_id, p_points, 'earned', p_description, v_new_balance
    )
    RETURNING id INTO v_tx_id;
  END IF;

  -- Mirror tier + balance into profiles cache for quick reads
  UPDATE public.profiles
  SET loyalty_tier = v_new_tier, loyalty_points_cache = v_new_balance
  WHERE id = p_user_id;

  user_id := p_user_id;
  points_balance := v_new_balance;
  lifetime_points := v_new_lifetime;
  tier := v_new_tier;
  tier_changed := v_new_tier IS DISTINCT FROM v_old_tier;
  previous_tier := v_old_tier;
  transaction_id := v_tx_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.award_loyalty_points_atomic(UUID, UUID, INT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_loyalty_points_atomic(UUID, UUID, INT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.award_loyalty_points_atomic(UUID, UUID, INT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.award_loyalty_points_atomic(UUID, UUID, INT, TEXT) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 5: ATOMIC RPC — redeem_loyalty_points_atomic                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Single transaction:
--   1. Lock loyalty_points row FOR UPDATE
--   2. Validate balance >= requested points
--   3. Validate points are a multiple of 100 (the redemption unit)
--   4. Deduct points, log transaction
--   5. Mint a discount_code gift entry via grant_gift_atomic
-- Returns gift entry id + new balance, or raises 'insufficient_points'.

DROP FUNCTION IF EXISTS public.redeem_loyalty_points_atomic(UUID, INT);

CREATE OR REPLACE FUNCTION public.redeem_loyalty_points_atomic(
  p_user_id UUID,
  p_points INT
)
RETURNS TABLE (
  gift_entry_id UUID,
  points_balance INT,
  discount_piasters BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loyalty public.loyalty_points%ROWTYPE;
  v_discount_piasters BIGINT;
  v_new_balance INT;
  v_gift public.gift_box_entries%ROWTYPE;
  v_settings public.retention_settings%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be NULL';
  END IF;

  IF p_points IS NULL OR p_points < 100 OR (p_points % 100) <> 0 THEN
    RAISE EXCEPTION 'invalid_redemption_amount';
  END IF;

  SELECT * INTO v_loyalty
  FROM public.loyalty_points
  WHERE loyalty_points.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_loyalty.points_balance < p_points THEN
    RAISE EXCEPTION 'insufficient_points';
  END IF;

  -- 100 points = 5 EGP = 500 piasters
  v_discount_piasters := (p_points / 100) * 500;
  v_new_balance := v_loyalty.points_balance - p_points;

  UPDATE public.loyalty_points
  SET points_balance = v_new_balance
  WHERE loyalty_points.user_id = p_user_id;

  INSERT INTO public.loyalty_transactions (
    user_id, order_id, points, transaction_type, description, balance_after
  ) VALUES (
    p_user_id, NULL, -p_points, 'redeemed',
    'Redeemed ' || p_points || ' points for ' || (v_discount_piasters / 100) || ' EGP coupon',
    v_new_balance
  );

  UPDATE public.profiles
  SET loyalty_points_cache = v_new_balance
  WHERE id = p_user_id;

  -- Grant the discount as a gift entry. Bucket = 'welcome' since loyalty
  -- redemption isn't a marketing spend (it's customer's earned points being
  -- converted), but we still want it to flow through the same plumbing.
  -- We use cost_piasters = 0 so it doesn't count against the welcome budget.
  SELECT * INTO v_settings FROM public.retention_settings WHERE id = 1 FOR SHARE;

  SELECT * INTO v_gift FROM public.grant_gift_atomic(
    p_user_id,
    NULL,
    'loyalty_redemption'::public.gift_source,
    NULL,
    'welcome',
    0, -- zero cost: not a marketing spend
    'engezna',
    NULL,
    v_settings.gift_default_expiry_days
  );

  IF v_gift.id IS NULL THEN
    -- Queue full or other grant failure — refund points so user doesn't lose value.
    UPDATE public.loyalty_points
    SET points_balance = v_loyalty.points_balance
    WHERE loyalty_points.user_id = p_user_id;
    UPDATE public.profiles
    SET loyalty_points_cache = v_loyalty.points_balance
    WHERE id = p_user_id;
    INSERT INTO public.loyalty_transactions (
      user_id, order_id, points, transaction_type, description, balance_after
    ) VALUES (
      p_user_id, NULL, p_points, 'bonus',
      'Refund: redemption failed (queue full)', v_loyalty.points_balance
    );
    RAISE EXCEPTION 'redemption_grant_failed';
  END IF;

  -- Patch the gift entry with the actual discount value (cost_piasters stays 0
  -- but we encode the user-facing discount so checkout reads it from one place).
  UPDATE public.gifts
  SET value_piasters = v_discount_piasters
  WHERE FALSE;
  -- (We don't actually mutate the template — discount comes from gift_box_entries)

  -- Re-update the gift_box_entries row with the discount value for use at checkout.
  -- This is logically the "face value" of the redemption.
  UPDATE public.gift_box_entries
  SET cost_piasters = v_discount_piasters
  WHERE id = v_gift.id;

  gift_entry_id := v_gift.id;
  points_balance := v_new_balance;
  discount_piasters := v_discount_piasters;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_points_atomic(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_loyalty_points_atomic(UUID, INT) FROM anon;
REVOKE ALL ON FUNCTION public.redeem_loyalty_points_atomic(UUID, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points_atomic(UUID, INT) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 6: ATOMIC RPC — clawback_loyalty_points_atomic                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- For refund flows where fault_source IN ('customer','fraud'). Deducts the
-- proportional points originally awarded for the order. NEVER goes below zero.

DROP FUNCTION IF EXISTS public.clawback_loyalty_points_atomic(UUID, UUID, INT);

CREATE OR REPLACE FUNCTION public.clawback_loyalty_points_atomic(
  p_user_id UUID,
  p_order_id UUID,
  p_points INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loyalty public.loyalty_points%ROWTYPE;
  v_clawback INT;
  v_new_balance INT;
  v_new_lifetime INT;
  v_new_tier TEXT;
BEGIN
  IF p_user_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id and p_order_id required';
  END IF;

  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_loyalty
  FROM public.loyalty_points
  WHERE loyalty_points.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_clawback := LEAST(p_points, v_loyalty.points_balance);
  v_new_balance := v_loyalty.points_balance - v_clawback;
  v_new_lifetime := GREATEST(0, v_loyalty.lifetime_points - v_clawback);
  v_new_tier := public.compute_loyalty_tier(v_new_lifetime);

  UPDATE public.loyalty_points
  SET
    points_balance = v_new_balance,
    lifetime_points = v_new_lifetime,
    tier = v_new_tier
  WHERE loyalty_points.user_id = p_user_id;

  INSERT INTO public.loyalty_transactions (
    user_id, order_id, points, transaction_type, description, balance_after
  ) VALUES (
    p_user_id, p_order_id, -v_clawback, 'expired',
    'Clawback for refunded order ' || p_order_id::text,
    v_new_balance
  );

  UPDATE public.profiles
  SET loyalty_tier = v_new_tier, loyalty_points_cache = v_new_balance
  WHERE id = p_user_id;

  RETURN v_clawback;
END;
$$;

REVOKE ALL ON FUNCTION public.clawback_loyalty_points_atomic(UUID, UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clawback_loyalty_points_atomic(UUID, UUID, INT) FROM anon;
REVOKE ALL ON FUNCTION public.clawback_loyalty_points_atomic(UUID, UUID, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.clawback_loyalty_points_atomic(UUID, UUID, INT) TO service_role;
