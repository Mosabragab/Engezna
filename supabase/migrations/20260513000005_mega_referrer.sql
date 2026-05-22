-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: v2.5.2 — Mega Referrer System (first 10 with 10+ referrals)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-13
-- Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §4.2 (v2.5.2)
--
-- Aman's approval: First 10 customers to achieve 10+ successful referrals
-- receive a permanent 1.25× multiplier on all loyalty points earned.
--
-- Scarcity Marketing (Tesla 2016 model) + Identity Building (permanent badge).
-- ROI: 9× cost (2,000 EGP referral costs + ~200 EGP/month multiplier vs.
-- 18,000 EGP/year in commission from 100+ acquired customers).
--
-- Race-safe via slot table with row locks.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Add columns to profiles ────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_mega_referrer            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mega_referrer_rank          INT,  -- 1-10
  ADD COLUMN IF NOT EXISTS mega_referrer_qualified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS loyalty_multiplier          NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS successful_referrals_count  INT NOT NULL DEFAULT 0,
  ADD CONSTRAINT mega_rank_range CHECK (mega_referrer_rank IS NULL OR (mega_referrer_rank BETWEEN 1 AND 10)),
  ADD CONSTRAINT loyalty_multiplier_range CHECK (loyalty_multiplier >= 1.00 AND loyalty_multiplier <= 2.00);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mega_referrer_rank
  ON public.profiles(mega_referrer_rank)
  WHERE mega_referrer_rank IS NOT NULL;

-- ─── 2. Mega Referrer Slots (1-10) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mega_referrer_slots (
  rank                                INT PRIMARY KEY CHECK (rank BETWEEN 1 AND 10),
  user_id                             UUID REFERENCES public.profiles(id),
  qualified_at                        TIMESTAMPTZ,
  referrals_count_at_qualification    INT,
  created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-fill the 10 empty slots (idempotent)
INSERT INTO public.mega_referrer_slots (rank)
SELECT s FROM generate_series(1, 10) AS s
ON CONFLICT (rank) DO NOTHING;

-- ─── 3. RPC: check & grant Mega Referrer status ────────────────────────────────
DROP FUNCTION IF EXISTS public.check_and_grant_mega_referrer(UUID);

CREATE OR REPLACE FUNCTION public.check_and_grant_mega_referrer(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count        INT;
  v_already_mega BOOLEAN;
  v_next_rank    INT;
BEGIN
  -- Count successful referrals (race-safe via FOR UPDATE on profile row)
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  SELECT COUNT(*) INTO v_count
  FROM public.referrals
  WHERE referrer_id = p_user_id AND status = 'completed';

  -- Update count
  UPDATE public.profiles
  SET successful_referrals_count = v_count
  WHERE id = p_user_id;

  -- Check if already Mega Referrer
  SELECT is_mega_referrer INTO v_already_mega
  FROM public.profiles WHERE id = p_user_id;

  IF v_already_mega THEN
    RETURN jsonb_build_object(
      'granted',        false,
      'reason',         'already_mega_referrer',
      'count',          v_count
    );
  END IF;

  -- Need at least 10 successful referrals
  IF v_count < 10 THEN
    RETURN jsonb_build_object(
      'granted',     false,
      'reason',      'below_threshold',
      'count',       v_count,
      'remaining',   10 - v_count
    );
  END IF;

  -- Try to claim a slot (race-safe via row lock on slots)
  SELECT rank INTO v_next_rank
  FROM public.mega_referrer_slots
  WHERE user_id IS NULL
  ORDER BY rank
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_next_rank IS NULL THEN
    RETURN jsonb_build_object(
      'granted',  false,
      'reason',   'all_slots_taken',
      'count',    v_count
    );
  END IF;

  -- Claim the slot
  UPDATE public.mega_referrer_slots
  SET user_id                             = p_user_id,
      qualified_at                        = NOW(),
      referrals_count_at_qualification    = v_count
  WHERE rank = v_next_rank;

  -- Mark user as Mega Referrer
  UPDATE public.profiles
  SET is_mega_referrer           = TRUE,
      mega_referrer_rank         = v_next_rank,
      mega_referrer_qualified_at = NOW(),
      loyalty_multiplier         = 1.25
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'granted',     true,
    'rank',        v_next_rank,
    'multiplier',  1.25,
    'count',       v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_grant_mega_referrer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_grant_mega_referrer(UUID) TO service_role;

-- ─── 4. RPC: get Mega Referrer leaderboard (public) ────────────────────────────
DROP FUNCTION IF EXISTS public.get_mega_referrer_leaderboard();

CREATE OR REPLACE FUNCTION public.get_mega_referrer_leaderboard()
RETURNS TABLE (
  rank           INT,
  display_name   TEXT,
  qualified_at   TIMESTAMPTZ,
  referrals_count INT,
  is_filled      BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.rank,
    CASE
      WHEN p.id IS NULL THEN NULL
      ELSE COALESCE(p.first_name, 'مجهول')
    END AS display_name,
    s.qualified_at,
    s.referrals_count_at_qualification,
    (s.user_id IS NOT NULL) AS is_filled
  FROM public.mega_referrer_slots s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  ORDER BY s.rank;
END;
$$;

REVOKE ALL ON FUNCTION public.get_mega_referrer_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mega_referrer_leaderboard() TO authenticated, service_role;

-- ─── 5. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.mega_referrer_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view mega referrer slots" ON public.mega_referrer_slots;
CREATE POLICY "Public can view mega referrer slots"
  ON public.mega_referrer_slots FOR SELECT
  USING (true);

COMMENT ON TABLE public.mega_referrer_slots IS
  'v2.5.2: 10 lifetime slots for the first customers to hit 10+ successful referrals. Permanent 1.25× points multiplier.';
