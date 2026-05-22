-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: v2.5.2 — Loyalty Points v2
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-13
-- Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.5.1 (v2.5.2)
--
-- Three rules tightened:
--   1. NO points on orders with any discount (gift / promo / referral)
--   2. 5-star rating reward: 5 → 20 points (Reciprocity + ASO investment)
--   3. Apply loyalty_multiplier (Mega Referrer 1.25×) + Streak Platinum (1.10×)
--   4. Cancel Birthday Points (+20 one-time, no longer awarded)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Birthday points: mark all existing as granted (prevent future grants) ──
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthday_points_granted BOOLEAN NOT NULL DEFAULT FALSE;

-- Set to TRUE for everyone to disable future birthday point awards
UPDATE public.profiles SET birthday_points_granted = TRUE;

-- ─── 2. award_order_loyalty_points: v2 with multipliers + discount blocker ─────
DROP FUNCTION IF EXISTS public.award_order_loyalty_points(UUID, UUID, BIGINT, BIGINT);

CREATE OR REPLACE FUNCTION public.award_order_loyalty_points(
  p_user_id                UUID,
  p_order_id               UUID,
  p_subtotal_piasters      BIGINT,
  p_discount_piasters      BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_points         INT;
  v_loyalty_multiplier  NUMERIC(3,2);
  v_streak_multiplier   NUMERIC(3,2);
  v_combined_multiplier NUMERIC(4,3);
  v_final_points        INT;
  v_new_balance         INT;
  v_new_lifetime        INT;
  v_new_tier            TEXT;
BEGIN
  -- Rule 1: No points on discounted orders
  IF COALESCE(p_discount_piasters, 0) > 0 THEN
    RETURN jsonb_build_object(
      'points',  0,
      'reason',  'discount_applied',
      'message_ar', 'لا تُكتسب نقاط على الطلبات التي بها خصم',
      'message_en', 'No points awarded on discounted orders'
    );
  END IF;

  -- Base: 1 point per 10 EGP (subtotal in piasters / 1000)
  v_base_points := FLOOR(p_subtotal_piasters / 1000);
  IF v_base_points <= 0 THEN
    RETURN jsonb_build_object('points', 0, 'reason', 'zero_subtotal');
  END IF;

  -- Multipliers (Mega Referrer 1.25× + Streak Platinum 1.10×)
  SELECT COALESCE(loyalty_multiplier, 1.00) INTO v_loyalty_multiplier
  FROM public.profiles WHERE id = p_user_id;

  SELECT COALESCE(points_multiplier, 1.00) INTO v_streak_multiplier
  FROM public.customer_streaks WHERE user_id = p_user_id;

  v_loyalty_multiplier := COALESCE(v_loyalty_multiplier, 1.00);
  v_streak_multiplier  := COALESCE(v_streak_multiplier,  1.00);
  v_combined_multiplier := v_loyalty_multiplier * v_streak_multiplier;

  v_final_points := FLOOR(v_base_points * v_combined_multiplier);

  -- Idempotency: skip if already processed
  IF EXISTS (
    SELECT 1 FROM public.loyalty_transactions
    WHERE order_id = p_order_id AND transaction_type = 'earn'
  ) THEN
    RETURN jsonb_build_object('points', 0, 'reason', 'already_awarded');
  END IF;

  -- Record transaction
  INSERT INTO public.loyalty_transactions (
    user_id, order_id, points, transaction_type, description
  ) VALUES (
    p_user_id, p_order_id, v_final_points, 'earn',
    format('Order completion (base %s × %s)', v_base_points::TEXT, v_combined_multiplier::TEXT)
  );

  -- Update balance
  UPDATE public.loyalty_points
  SET points_balance  = points_balance  + v_final_points,
      lifetime_points = lifetime_points + v_final_points,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING points_balance, lifetime_points INTO v_new_balance, v_new_lifetime;

  IF v_new_balance IS NULL THEN
    INSERT INTO public.loyalty_points (user_id, points_balance, lifetime_points)
    VALUES (p_user_id, v_final_points, v_final_points)
    RETURNING points_balance, lifetime_points INTO v_new_balance, v_new_lifetime;
  END IF;

  -- Recompute tier
  v_new_tier := public.compute_loyalty_tier(v_new_lifetime);

  UPDATE public.profiles
  SET loyalty_tier         = v_new_tier,
      loyalty_points_cache = v_new_balance
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'points',              v_final_points,
    'base_points',         v_base_points,
    'multiplier',          v_combined_multiplier,
    'loyalty_multiplier',  v_loyalty_multiplier,
    'streak_multiplier',   v_streak_multiplier,
    'new_balance',         v_new_balance,
    'new_lifetime',        v_new_lifetime,
    'new_tier',            v_new_tier
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_order_loyalty_points(UUID, UUID, BIGINT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_order_loyalty_points(UUID, UUID, BIGINT, BIGINT) TO service_role;

-- ─── 3. award_rating_bonus: 5★ = 20 points (was 5) ─────────────────────────────
DROP FUNCTION IF EXISTS public.award_rating_bonus(UUID, UUID, INT);

CREATE OR REPLACE FUNCTION public.award_rating_bonus(
  p_user_id    UUID,
  p_order_id   UUID,
  p_stars      INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bonus_points INT;
  v_new_balance  INT;
BEGIN
  -- Only 5-star earns the bonus
  IF p_stars < 5 THEN
    RETURN jsonb_build_object('points', 0, 'reason', 'below_5_stars');
  END IF;

  -- Idempotency: one bonus per order
  IF EXISTS (
    SELECT 1 FROM public.loyalty_transactions
    WHERE order_id = p_order_id AND transaction_type = 'bonus'
      AND description LIKE '5-star rating%'
  ) THEN
    RETURN jsonb_build_object('points', 0, 'reason', 'already_rated');
  END IF;

  v_bonus_points := 20;  -- v2.5.2: was 5, Aman raised to 20

  INSERT INTO public.loyalty_transactions (
    user_id, order_id, points, transaction_type, description
  ) VALUES (
    p_user_id, p_order_id, v_bonus_points, 'bonus',
    '5-star rating bonus'
  );

  UPDATE public.loyalty_points
  SET points_balance  = points_balance  + v_bonus_points,
      lifetime_points = lifetime_points + v_bonus_points,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING points_balance INTO v_new_balance;

  RETURN jsonb_build_object(
    'points',       v_bonus_points,
    'new_balance',  v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_rating_bonus(UUID, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_rating_bonus(UUID, UUID, INT) TO service_role;

COMMENT ON FUNCTION public.award_order_loyalty_points(UUID, UUID, BIGINT, BIGINT) IS
  'v2.5.2: No points on discounted orders + apply loyalty_multiplier × streak_multiplier.';
COMMENT ON FUNCTION public.award_rating_bonus(UUID, UUID, INT) IS
  'v2.5.2: 5-star rating now awards 20 points (was 5) — Reciprocity Principle + ASO investment.';
