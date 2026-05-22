-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: v2.5.2 — Customer Streak System (weekly habit hook)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-13
-- Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §4.1 (v2.5.2)
--
-- Aman approved: Streak implemented in Phase 1 (not Phase 2). Daily Hook
-- system that complements Stamp Card and Loyalty. Duolingo model.
--
-- Rules:
--   - Weekly streak (1 qualifying order ≥ 200 EGP per week)
--   - 4 weeks  → +10 loyalty points (one-time)
--   - 8 weeks  → +25 points + Silver Streak badge 🥈
--   - 12 weeks → +50 points + Gold Streak badge 🥇
--   - 24 weeks → 1.10× points multiplier (permanent) + Platinum Streak 💎
--   - Breaking streak resets to 0
--
-- Visual design: small icon in Header (not large progress bar) to avoid
-- cognitive overload alongside Stamp Card + Daily Surprise.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. customer_streaks table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_streaks (
  user_id                 UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak_weeks    INT  NOT NULL DEFAULT 0,
  longest_streak_weeks    INT  NOT NULL DEFAULT 0,
  last_qualifying_week    DATE,  -- ISO week start (Monday) of last qualifying order
  streak_tier             TEXT NOT NULL DEFAULT 'none',
  points_multiplier       NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  total_milestones_hit    INT  NOT NULL DEFAULT 0,
  last_milestone_hit_week INT,  -- 4 / 8 / 12 / 24 to dedupe milestone rewards
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT streak_tier_valid CHECK (streak_tier IN ('none', 'silver', 'gold', 'platinum')),
  CONSTRAINT multiplier_valid  CHECK (points_multiplier >= 1.00 AND points_multiplier <= 2.00)
);

CREATE INDEX IF NOT EXISTS idx_streaks_tier  ON public.customer_streaks(streak_tier);
CREATE INDEX IF NOT EXISTS idx_streaks_last  ON public.customer_streaks(last_qualifying_week);

-- ─── 2. RPC: update streak on qualifying order ─────────────────────────────────
DROP FUNCTION IF EXISTS public.update_customer_streak(UUID, BIGINT);

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
  v_threshold       BIGINT := 20000;  -- 200 EGP
  v_current_week    DATE := DATE_TRUNC('week', NOW())::DATE;
  v_last_week       DATE;
  v_streak          INT;
  v_new_tier        TEXT;
  v_milestone_pts   INT := 0;
  v_last_milestone  INT;
  v_multiplier      NUMERIC(3,2) := 1.00;
BEGIN
  -- Threshold check
  IF p_order_value_piasters < v_threshold THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'below_threshold',
                              'threshold_piasters', v_threshold);
  END IF;

  -- Get current state with lock
  SELECT last_qualifying_week, current_streak_weeks, last_milestone_hit_week
  INTO v_last_week, v_streak, v_last_milestone
  FROM public.customer_streaks WHERE user_id = p_user_id FOR UPDATE;

  -- First-ever qualifying order
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

  -- Same week: no change
  IF v_last_week = v_current_week THEN
    RETURN jsonb_build_object('updated', false, 'reason', 'same_week', 'streak', v_streak);
  END IF;

  -- Consecutive week: extend
  IF v_last_week = v_current_week - INTERVAL '7 days' THEN
    v_streak := v_streak + 1;
  ELSE
    -- Streak broken: reset to 1
    v_streak := 1;
    v_last_milestone := NULL;
  END IF;

  -- Determine tier
  v_new_tier := CASE
    WHEN v_streak >= 24 THEN 'platinum'
    WHEN v_streak >= 12 THEN 'gold'
    WHEN v_streak >= 8  THEN 'silver'
    ELSE 'none'
  END;

  v_multiplier := CASE WHEN v_streak >= 24 THEN 1.10 ELSE 1.00 END;

  -- Award milestone points (only once per milestone)
  IF v_streak = 4  AND COALESCE(v_last_milestone, 0) < 4  THEN
    v_milestone_pts := 10;  v_last_milestone := 4;
  ELSIF v_streak = 8  AND COALESCE(v_last_milestone, 0) < 8  THEN
    v_milestone_pts := 25;  v_last_milestone := 8;
  ELSIF v_streak = 12 AND COALESCE(v_last_milestone, 0) < 12 THEN
    v_milestone_pts := 50;  v_last_milestone := 12;
  END IF;

  -- Persist
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

  -- Grant milestone points
  IF v_milestone_pts > 0 THEN
    INSERT INTO public.loyalty_transactions (
      user_id, points, transaction_type, description
    ) VALUES (
      p_user_id, v_milestone_pts, 'bonus',
      format('Streak milestone: %s weeks', v_streak::TEXT)
    );

    UPDATE public.loyalty_points
    SET points_balance  = points_balance  + v_milestone_pts,
        lifetime_points = lifetime_points + v_milestone_pts,
        updated_at = NOW()
    WHERE user_id = p_user_id;
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

-- ─── 3. Cron-friendly: reset streaks for inactive users ────────────────────────
-- Users who missed last week's qualifying order have their streak reset to 0
DROP FUNCTION IF EXISTS public.reset_inactive_streaks();

CREATE OR REPLACE FUNCTION public.reset_inactive_streaks()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_week DATE := DATE_TRUNC('week', NOW() - INTERVAL '14 days')::DATE;
  v_count INT;
BEGIN
  WITH reset AS (
    UPDATE public.customer_streaks
    SET
      current_streak_weeks    = 0,
      streak_tier             = 'none',
      points_multiplier       = 1.00,
      last_milestone_hit_week = NULL,
      updated_at = NOW()
    WHERE current_streak_weeks > 0
      AND last_qualifying_week < v_cutoff_week
    RETURNING user_id
  )
  SELECT COUNT(*) INTO v_count FROM reset;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_inactive_streaks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_inactive_streaks() TO service_role;

-- ─── 4. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.customer_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own streak" ON public.customer_streaks;
CREATE POLICY "Users can view own streak"
  ON public.customer_streaks FOR SELECT
  USING (auth.uid() = user_id);

-- Realtime: users want live streak updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_streaks;

COMMENT ON TABLE public.customer_streaks IS
  'v2.5.2: Weekly streak tracking. Active streak requires order ≥200 EGP/week. Resets to 0 on miss.';
