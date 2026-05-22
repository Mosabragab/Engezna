-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: v2.5.2 — CodeRabbit review fixes (Phase 2 review pass)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-13
-- Source: CodeRabbit review on migrations 002 / 003 / 004 / 006 / 008
--
-- Fixes applied:
--   1. add_gift_stamp_atomic — count active stamps excluding overdue (002 fix)
--   2. consume_tier_free_delivery — idempotent per-order via consumption log (003 fix)
--   3. grant_platinum_monthly_box — claim-then-grant race-safe pattern (003 fix)
--   4. get_tier_benefits_for_checkout — auth.uid() enforcement (003 fix)
--   5. update_customer_streak — upsert loyalty_points on milestone (004 fix)
--   6. award_rating_bonus — upsert loyalty_points (006 fix)
--   7. create_gift_forward_atomic — re-grant authenticated for deprecation msg (008 fix)
--   8. Backfill: remaining 5 EGP template gifts updated to 10 EGP (008 fix)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 0. Idempotency log for tier benefit consumption ──────────────────────────
-- Records each consume call by (user_id, order_id, kind) so retries are no-ops.
CREATE TABLE IF NOT EXISTS public.tier_benefits_consumption_log (
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id     UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,  -- 'free_delivery' for now; extensible
  consumed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, order_id, kind)
);

ALTER TABLE public.tier_benefits_consumption_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own consumption log" ON public.tier_benefits_consumption_log;
CREATE POLICY "Users can view own consumption log"
  ON public.tier_benefits_consumption_log FOR SELECT
  USING (auth.uid() = user_id);


-- ─── 1. add_gift_stamp_atomic — exclude overdue stamps from active count ──────
-- Replaces the version from 20260513000002.
CREATE OR REPLACE FUNCTION public.add_gift_stamp_atomic(
  p_user_id    UUID,
  p_order_id   UUID,
  p_subtotal_piasters BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings        RECORD;  -- v2.5.2 defensive: avoid compile-time %ROWTYPE lookup
  v_card_id         UUID;
  v_active_stamps   INT;
  v_golden_value    BIGINT;
  v_golden_entry_id UUID;
  v_gift_id         UUID;
BEGIN
  SELECT * INTO v_settings FROM public.retention_settings WHERE id = 1 FOR SHARE;

  IF p_subtotal_piasters < v_settings.stamp_min_order_piasters THEN
    RETURN jsonb_build_object('stamped', false, 'reason', 'below_minimum',
                              'minimum_piasters', v_settings.stamp_min_order_piasters);
  END IF;

  SELECT id INTO v_card_id
  FROM public.gift_stamps
  WHERE user_id = p_user_id AND is_completed = FALSE
  FOR UPDATE;

  IF v_card_id IS NULL THEN
    INSERT INTO public.gift_stamps (user_id, card_started_at)
    VALUES (p_user_id, NOW())
    RETURNING id INTO v_card_id;
  END IF;

  BEGIN
    INSERT INTO public.gift_stamp_entries (
      stamp_card_id, user_id, order_id, expires_at
    ) VALUES (
      v_card_id, p_user_id, p_order_id,
      NOW() + INTERVAL '30 days'
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('stamped', false, 'reason', 'already_stamped');
  END;

  -- v2.5.2 fix: only count stamps that are non-expired AND not past expires_at.
  -- Without this, overdue stamps that the cron hasn't flagged yet would be
  -- counted, potentially triggering an unfair Golden Box.
  SELECT COUNT(*) INTO v_active_stamps
  FROM public.gift_stamp_entries
  WHERE stamp_card_id = v_card_id
    AND is_expired = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());

  UPDATE public.gift_stamps
  SET stamp_count = v_active_stamps,
      order_ids = array_append(order_ids, p_order_id)
  WHERE id = v_card_id;

  IF v_active_stamps >= v_settings.stamp_card_size THEN
    IF random() * 100 < v_settings.golden_box_weight_max THEN
      v_golden_value := v_settings.golden_box_max_piasters;
    ELSE
      v_golden_value := v_settings.golden_box_default_piasters;
    END IF;

    SELECT id INTO v_gift_id
    FROM public.gifts
    WHERE type = 'golden_box' AND value_piasters = v_golden_value
    LIMIT 1;

    IF v_gift_id IS NULL THEN
      INSERT INTO public.gifts (type, value_piasters, title_ar, title_en, metadata)
      VALUES (
        'golden_box', v_golden_value,
        format('صندوق ذهبي %s ج.م', (v_golden_value / 100)::TEXT),
        format('Golden Box %s EGP', (v_golden_value / 100)::TEXT),
        jsonb_build_object('source', 'stamp_card_completion')
      )
      RETURNING id INTO v_gift_id;
    END IF;

    INSERT INTO public.gift_box_entries (
      user_id, gift_id, source, status, expires_at,
      bucket_name, cost_piasters, funder_type
    ) VALUES (
      p_user_id, v_gift_id, 'stamp_card', 'granted',
      NOW() + INTERVAL '7 days',
      'stamp', v_golden_value, 'engezna'
    )
    RETURNING id INTO v_golden_entry_id;

    INSERT INTO public.gift_financial_log (
      transaction_type, amount_piasters, bucket, funder_type,
      user_id, gift_entry_id, notes
    ) VALUES (
      'grant', v_golden_value, 'stamp', 'engezna',
      p_user_id, v_golden_entry_id,
      format('Stamp Card v2 completion (Golden Box %s EGP)', (v_golden_value / 100)::TEXT)
    );

    UPDATE public.gift_stamps
    SET is_completed = TRUE, golden_box_id = v_golden_entry_id
    WHERE id = v_card_id;

    RETURN jsonb_build_object(
      'stamped',        true,
      'stamp_count',    v_active_stamps,
      'card_completed', true,
      'golden_box_value_piasters', v_golden_value,
      'golden_entry_id', v_golden_entry_id
    );
  END IF;

  RETURN jsonb_build_object(
    'stamped',     true,
    'stamp_count', v_active_stamps,
    'remaining',   v_settings.stamp_card_size - v_active_stamps
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_gift_stamp_atomic(UUID, UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_gift_stamp_atomic(UUID, UUID, BIGINT) TO service_role;


-- ─── 2. consume_tier_free_delivery — idempotent per-order ─────────────────────
CREATE OR REPLACE FUNCTION public.consume_tier_free_delivery(
  p_user_id  UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_year TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_inserted INT;
BEGIN
  -- Claim the consumption slot for this (user, order, kind).
  -- ON CONFLICT DO NOTHING makes retries no-ops.
  WITH ins AS (
    INSERT INTO public.tier_benefits_consumption_log (user_id, order_id, kind)
    VALUES (p_user_id, p_order_id, 'free_delivery')
    ON CONFLICT (user_id, order_id, kind) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM ins;

  IF v_inserted = 0 THEN
    -- Already consumed for this order — short-circuit, do not increment again.
    RETURN jsonb_build_object('consumed', false, 'reason', 'already_consumed_for_order');
  END IF;

  -- First-time consumption for this order: increment monthly counter.
  INSERT INTO public.tier_benefits_usage (user_id, month_year, free_deliveries_used)
  VALUES (p_user_id, v_month_year, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    free_deliveries_used = public.tier_benefits_usage.free_deliveries_used + 1,
    updated_at = NOW();

  RETURN jsonb_build_object('consumed', true, 'month', v_month_year);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_tier_free_delivery(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_tier_free_delivery(UUID, UUID) TO service_role;


-- ─── 3. grant_platinum_monthly_box — claim-then-grant race-safe ──────────────
CREATE OR REPLACE FUNCTION public.grant_platinum_monthly_box()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count        INT := 0;
  v_user_id      UUID;
  v_month_year   TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_box_value    BIGINT;
  v_gift_id      UUID;
  v_entry_id     UUID;
  v_claimed      INT;
BEGIN
  SELECT monthly_box_value_piasters INTO v_box_value
  FROM public.tier_rewards WHERE tier = 'platinum';

  IF v_box_value IS NULL OR v_box_value = 0 THEN
    RETURN 0;
  END IF;

  SELECT id INTO v_gift_id
  FROM public.gifts
  WHERE type = 'discount_code' AND value_piasters = v_box_value
    AND metadata->>'template' = 'platinum_monthly'
  LIMIT 1;

  IF v_gift_id IS NULL THEN
    INSERT INTO public.gifts (type, value_piasters, title_ar, title_en, metadata)
    VALUES (
      'discount_code', v_box_value,
      'صندوق بلاتيني الشهري',
      'Platinum Monthly Box',
      jsonb_build_object('template', 'platinum_monthly')
    )
    RETURNING id INTO v_gift_id;
  END IF;

  FOR v_user_id IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.tier_benefits_usage u
      ON u.user_id = p.id AND u.month_year = v_month_year
    WHERE p.loyalty_tier = 'platinum'
      AND u.monthly_box_granted_at IS NULL
  LOOP
    -- v2.5.2 fix: claim the slot FIRST. If another concurrent run already
    -- claimed this user this month, the INSERT/UPDATE returns 0 rows and we
    -- skip granting the box.
    WITH claim AS (
      INSERT INTO public.tier_benefits_usage (
        user_id, month_year, monthly_box_granted_at
      ) VALUES (
        v_user_id, v_month_year, NOW()
      )
      ON CONFLICT (user_id, month_year) DO UPDATE
        SET monthly_box_granted_at = NOW()
        WHERE public.tier_benefits_usage.monthly_box_granted_at IS NULL
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_claimed FROM claim;

    IF v_claimed = 0 THEN
      CONTINUE;  -- already claimed by another run
    END IF;

    -- Slot claimed: now grant the box and log financials.
    -- v2.5.2 fix: Platinum monthly box belongs to the engagement bucket
    -- (Daily Surprise), NOT the Welcome bucket. The original code mistakenly
    -- charged it to 'welcome' which is reserved for first-order signup
    -- incentives. Using 'mystery' keeps budget tracking accurate since
    -- Platinum benefits are continued-engagement rewards.
    INSERT INTO public.gift_box_entries (
      user_id, gift_id, source, status, expires_at,
      bucket_name, cost_piasters, funder_type
    ) VALUES (
      v_user_id, v_gift_id, 'manual_campaign', 'granted',
      NOW() + INTERVAL '30 days',
      'mystery', v_box_value, 'engezna'
    )
    RETURNING id INTO v_entry_id;

    INSERT INTO public.gift_financial_log (
      transaction_type, amount_piasters, bucket, funder_type,
      user_id, gift_entry_id, notes
    ) VALUES (
      'grant', v_box_value, 'mystery', 'engezna',
      v_user_id, v_entry_id, 'Platinum monthly box (tier reward)'
    );

    -- Backfill the entry_id reference on the claimed row.
    UPDATE public.tier_benefits_usage
    SET monthly_box_entry_id = v_entry_id,
        updated_at = NOW()
    WHERE user_id = v_user_id AND month_year = v_month_year;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_platinum_monthly_box() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_platinum_monthly_box() TO service_role;


-- ─── 4. get_tier_benefits_for_checkout — enforce caller identity ──────────────
-- v2.5.2 fix: replaced `tier_rewards%ROWTYPE` with `RECORD` to avoid
-- compile-time "relation does not exist" errors when the function is
-- (re)created in an environment where the schema-resolution context hasn't
-- materialised the table reference yet. Behaviour is unchanged at runtime.
CREATE OR REPLACE FUNCTION public.get_tier_benefits_for_checkout(
  p_user_id            UUID,
  p_order_subtotal_piasters BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       UUID := auth.uid();
  v_tier         TEXT;
  v_rewards      RECORD;
  v_month_year   TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_used_free    INT;
  v_can_use_free BOOLEAN := FALSE;
  v_discount_pct NUMERIC(5,2) := 0;
BEGIN
  -- v2.5.2 fix: authenticated callers may only query their own benefits.
  -- service_role bypasses this check (auth.uid() returns NULL for it).
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized_user_mismatch'
      USING HINT = 'Authenticated users can only fetch their own tier benefits.';
  END IF;

  SELECT loyalty_tier INTO v_tier FROM public.profiles WHERE id = p_user_id;
  v_tier := COALESCE(v_tier, 'bronze');

  SELECT * INTO v_rewards FROM public.tier_rewards WHERE tier = v_tier;

  IF v_rewards.free_delivery_unlimited THEN
    v_can_use_free := (p_order_subtotal_piasters >= COALESCE(v_rewards.free_delivery_min_order_piasters, 0));
  ELSIF v_rewards.free_deliveries_per_month > 0 THEN
    SELECT free_deliveries_used INTO v_used_free
    FROM public.tier_benefits_usage
    WHERE user_id = p_user_id AND month_year = v_month_year;
    v_used_free := COALESCE(v_used_free, 0);
    v_can_use_free := (v_used_free < v_rewards.free_deliveries_per_month);
  END IF;

  IF NOT v_can_use_free THEN
    v_discount_pct := v_rewards.delivery_discount_percent;
  END IF;

  RETURN jsonb_build_object(
    'tier',                       v_tier,
    'badge_emoji',                v_rewards.badge_emoji,
    'delivery_discount_percent',  v_discount_pct,
    'can_use_free_delivery',      v_can_use_free,
    'free_deliveries_remaining',  CASE
                                    WHEN v_rewards.free_delivery_unlimited THEN -1
                                    ELSE GREATEST(0, v_rewards.free_deliveries_per_month - COALESCE(v_used_free, 0))
                                  END,
    'priority_support',           v_rewards.priority_support
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_tier_benefits_for_checkout(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tier_benefits_for_checkout(UUID, BIGINT) TO authenticated, service_role;


-- ─── 5. update_customer_streak — upsert loyalty_points on milestone ──────────
CREATE OR REPLACE FUNCTION public.update_customer_streak(
  p_user_id              UUID,
  p_order_value_piasters BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold       BIGINT := 20000;
  v_current_week    DATE := DATE_TRUNC('week', NOW())::DATE;
  v_last_week       DATE;
  v_streak          INT;
  v_new_tier        TEXT;
  v_milestone_pts   INT := 0;
  v_last_milestone  INT;
  v_multiplier      NUMERIC(3,2) := 1.00;
BEGIN
  IF p_order_value_piasters < v_threshold THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'below_threshold',
                              'threshold_piasters', v_threshold);
  END IF;

  SELECT last_qualifying_week, current_streak_weeks, last_milestone_hit_week
  INTO v_last_week, v_streak, v_last_milestone
  FROM public.customer_streaks WHERE user_id = p_user_id FOR UPDATE;

  IF v_last_week IS NULL THEN
    INSERT INTO public.customer_streaks (
      user_id, current_streak_weeks, last_qualifying_week, longest_streak_weeks
    ) VALUES (
      p_user_id, 1, v_current_week, 1
    )
    ON CONFLICT (user_id) DO UPDATE SET
      current_streak_weeks  = 1,
      last_qualifying_week  = v_current_week,
      longest_streak_weeks  = GREATEST(public.customer_streaks.longest_streak_weeks, 1),
      updated_at = NOW();
    RETURN jsonb_build_object('updated', true, 'streak', 1, 'tier', 'none');
  END IF;

  IF v_last_week = v_current_week THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'same_week', 'streak', v_streak);
  END IF;

  IF v_last_week = v_current_week - INTERVAL '7 days' THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
    v_last_milestone := NULL;
  END IF;

  v_new_tier := CASE
    WHEN v_streak >= 24 THEN 'platinum'
    WHEN v_streak >= 12 THEN 'gold'
    WHEN v_streak >= 8  THEN 'silver'
    ELSE 'none'
  END;

  v_multiplier := CASE WHEN v_streak >= 24 THEN 1.10 ELSE 1.00 END;

  IF v_streak = 4  AND COALESCE(v_last_milestone, 0) < 4  THEN
    v_milestone_pts := 10;  v_last_milestone := 4;
  ELSIF v_streak = 8  AND COALESCE(v_last_milestone, 0) < 8  THEN
    v_milestone_pts := 25;  v_last_milestone := 8;
  ELSIF v_streak = 12 AND COALESCE(v_last_milestone, 0) < 12 THEN
    v_milestone_pts := 50;  v_last_milestone := 12;
  END IF;

  UPDATE public.customer_streaks
  SET
    current_streak_weeks    = v_streak,
    longest_streak_weeks    = GREATEST(longest_streak_weeks, v_streak),
    last_qualifying_week    = v_current_week,
    streak_tier             = v_new_tier,
    points_multiplier       = v_multiplier,
    last_milestone_hit_week = v_last_milestone,
    total_milestones_hit    = total_milestones_hit + (CASE WHEN v_milestone_pts > 0 THEN 1 ELSE 0 END),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  IF v_milestone_pts > 0 THEN
    INSERT INTO public.loyalty_transactions (
      user_id, points, transaction_type, description
    ) VALUES (
      p_user_id, v_milestone_pts, 'bonus',
      format('Streak milestone: %s weeks', v_streak::TEXT)
    );

    -- v2.5.2 fix: ensure loyalty_points row exists before crediting.
    -- A plain UPDATE silently dropped the bonus when the user had never
    -- earned points before (rare but possible if streak fires before order).
    INSERT INTO public.loyalty_points (user_id, points_balance, lifetime_points)
    VALUES (p_user_id, v_milestone_pts, v_milestone_pts)
    ON CONFLICT (user_id) DO UPDATE SET
      points_balance  = public.loyalty_points.points_balance  + v_milestone_pts,
      lifetime_points = public.loyalty_points.lifetime_points + v_milestone_pts,
      updated_at = NOW();
  END IF;

  RETURN jsonb_build_object(
    'updated',          true,
    'streak',           v_streak,
    'tier',             v_new_tier,
    'milestone_points', v_milestone_pts,
    'multiplier',       v_multiplier
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_customer_streak(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_customer_streak(UUID, BIGINT) TO service_role;


-- ─── 6. award_rating_bonus — upsert loyalty_points + atomic claim ────────────
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
  v_bonus_points INT := 20;
  v_new_balance  INT;
BEGIN
  IF p_stars < 5 THEN
    RETURN jsonb_build_object('points', 0, 'reason', 'below_5_stars');
  END IF;

  -- v2.5.2 fix: serialize concurrent calls on the same order.
  -- The previous EXISTS check + INSERT was a classic TOCTOU race — two
  -- workers could both pass the check and award 40 points. Locking the
  -- order row first forces serial execution for this order.
  PERFORM 1 FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.loyalty_transactions
    WHERE order_id = p_order_id AND transaction_type = 'bonus'
      AND description LIKE '5-star rating%'
  ) THEN
    RETURN jsonb_build_object('points', 0, 'reason', 'already_rated');
  END IF;

  -- v2.5.2 fix: upsert loyalty_points so missing rows are created.
  -- Previously a plain UPDATE returned 0 rows, leaving v_new_balance NULL
  -- while the bonus transaction was still recorded — a permanent leak.
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


-- ─── 7. create_gift_forward_atomic — re-grant authenticated for deprecation msg
-- Restoring authenticated grant so legacy callers see the clear "deprecated"
-- exception text instead of an opaque "permission denied" error.
GRANT EXECUTE ON FUNCTION public.create_gift_forward_atomic(UUID) TO authenticated;


-- ─── 8. Backfill: any remaining 5 EGP gifts (templates included) → 10 EGP ────
-- The first pass in 20260513000008 deliberately excluded template-backed
-- entries via `NOT (metadata ? 'template')`. The intent was to avoid touching
-- specially-configured templates, but if any 5 EGP template gift slipped in,
-- the v2.5.2 minimum-value rule should still cover it.
UPDATE public.gifts
SET value_piasters = 1000,
    title_ar       = REPLACE(title_ar, '٥ ج.م', '١٠ ج.م'),
    title_en       = REPLACE(title_en, '5 EGP', '10 EGP')
WHERE type = 'discount_code'
  AND value_piasters = 500;
-- (no `metadata` filter — covers both template and non-template rows)
-- Note: `gifts` table has no `updated_at` column; update timestamp omitted.


COMMENT ON TABLE public.tier_benefits_consumption_log IS
  'v2.5.2: Per-order idempotency log for tier_benefits consumption (free deliveries).';
