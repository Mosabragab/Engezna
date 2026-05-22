-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: v2.5.2 — Harden award_rating_bonus (existence + ownership)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-13
-- Source: CodeRabbit review on migration 009 award_rating_bonus
--
-- The previous version used `PERFORM 1 FROM orders WHERE id = p_order_id FOR
-- UPDATE` which:
--   1. Silently succeeds with no lock when the order does not exist.
--   2. Does NOT validate that p_user_id actually owns p_order_id, so a buggy
--      or malicious caller could award the 5-star bonus to user A for an
--      order owned by user C.
--
-- Fix: read orders.customer_id into a local var with FOR UPDATE, then
--   - IF NOT FOUND → return order_not_found (fail closed)
--   - IF customer_id <> p_user_id → return ownership_mismatch (fail closed)
-- ═══════════════════════════════════════════════════════════════════════════════

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
  v_bonus_points  INT := 20;
  v_new_balance   INT;
  v_owner_id      UUID;
BEGIN
  IF p_stars < 5 THEN
    RETURN jsonb_build_object('points', 0, 'reason', 'below_5_stars');
  END IF;

  -- v2.5.2 fix (migration 010): read + lock + validate in one statement.
  -- Replaces the bare PERFORM that silently succeeded on missing orders and
  -- skipped ownership enforcement.
  SELECT customer_id INTO v_owner_id
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('points', 0, 'reason', 'order_not_found');
  END IF;

  IF v_owner_id IS DISTINCT FROM p_user_id THEN
    -- Order exists but caller is not the owner. Fail closed; do not leak
    -- whether the bonus was already awarded.
    RETURN jsonb_build_object('points', 0, 'reason', 'ownership_mismatch');
  END IF;

  -- Idempotency check (now safely serialized by the row lock above).
  IF EXISTS (
    SELECT 1 FROM public.loyalty_transactions
    WHERE order_id = p_order_id AND transaction_type = 'bonus'
      AND description LIKE '5-star rating%'
  ) THEN
    RETURN jsonb_build_object('points', 0, 'reason', 'already_rated');
  END IF;

  -- Upsert loyalty_points so missing rows are created (v2.5.2 fix from 009).
  INSERT INTO public.loyalty_points (user_id, points_balance, lifetime_points)
  VALUES (p_user_id, v_bonus_points, v_bonus_points)
  ON CONFLICT (user_id) DO UPDATE SET
    points_balance  = public.loyalty_points.points_balance  + v_bonus_points,
    lifetime_points = public.loyalty_points.lifetime_points + v_bonus_points,
    updated_at = NOW()
  RETURNING points_balance INTO v_new_balance;

  INSERT INTO public.loyalty_transactions (
    user_id, order_id, points, transaction_type, description
  ) VALUES (
    p_user_id, p_order_id, v_bonus_points, 'bonus',
    '5-star rating bonus'
  );

  RETURN jsonb_build_object(
    'points',       v_bonus_points,
    'new_balance',  v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_rating_bonus(UUID, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_rating_bonus(UUID, UUID, INT) TO service_role;

COMMENT ON FUNCTION public.award_rating_bonus(UUID, UUID, INT) IS
  'v2.5.2 (migration 010): existence + ownership enforced; row-locked to serialize concurrent calls per order.';
