-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: v2.5.2 — Welcome Box System
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-13
-- Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.1 (v2.5.2)
--
-- Welcome Box is now an independent acquisition mechanism (separate from
-- Daily Surprise). Every email-verified signup receives a free-delivery gift
-- valid for 7 days. Aman's feedback: budget raised from 2,000 → 6,000 EGP
-- (30% of total) based on actual Beni Suef delivery cost of 22.5 EGP.
--
-- Changes:
--   1. New gift_source enum value: 'welcome_signup'
--   2. Track welcome_box state on profiles
--   3. Update retention_settings budget allocation (30/30/20/20)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Add new gift_source value ──────────────────────────────────────────────
-- Safe-pattern: ADD VALUE inside DO block + EXCEPTION (Postgres < 12 compat)
DO $$ BEGIN
  ALTER TYPE gift_source ADD VALUE IF NOT EXISTS 'welcome_signup';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Track Welcome Box lifecycle on profiles ────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_box_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS welcome_box_used_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS welcome_box_entry_id   UUID REFERENCES public.gift_box_entries(id);

CREATE INDEX IF NOT EXISTS idx_profiles_welcome_unused
  ON public.profiles(id)
  WHERE welcome_box_granted_at IS NOT NULL AND welcome_box_used_at IS NULL;

-- ─── 3. Update retention_settings budget (v2.5.2) ──────────────────────────────
-- New allocation: Welcome 30% / Daily 30% / Stamp 20% / Referral 20%
-- (Win-back merged into Daily Surprise — its bucket goes to 0)
UPDATE public.retention_settings
SET
  bucket_welcome_percent  = 30.00,  -- was 10
  bucket_mystery_percent  = 30.00,  -- was 30 (Daily Surprise stays)
  bucket_stamp_percent    = 20.00,  -- was 25
  bucket_referral_percent = 20.00,  -- was 20 (unchanged)
  bucket_winback_percent  = 0.00,   -- was 15 (merged into mystery)
  updated_at              = NOW()
WHERE id = 1;

-- ─── 4. Grant Welcome Box RPC (idempotent) ─────────────────────────────────────
DROP FUNCTION IF EXISTS public.grant_welcome_box_atomic(UUID);

CREATE OR REPLACE FUNCTION public.grant_welcome_box_atomic(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_grant TIMESTAMPTZ;
  v_gift_id        UUID;
  v_entry_id       UUID;
  v_expires_at     TIMESTAMPTZ := NOW() + INTERVAL '7 days';
BEGIN
  -- Idempotency: skip if already granted
  SELECT welcome_box_granted_at INTO v_existing_grant
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF v_existing_grant IS NOT NULL THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_granted', 'granted_at', v_existing_grant);
  END IF;

  -- Resolve a free_delivery gift template (created in seed data)
  SELECT id INTO v_gift_id
  FROM public.gifts
  WHERE type = 'free_delivery' AND metadata->>'template' = 'welcome_signup'
  LIMIT 1;

  IF v_gift_id IS NULL THEN
    -- Auto-create the template if missing
    INSERT INTO public.gifts (type, value_piasters, title_ar, title_en, description_ar, description_en, metadata)
    VALUES (
      'free_delivery',
      2250,  -- 22.5 EGP estimated cost (informational)
      'هدية الترحيب: أول توصيل علينا',
      'Welcome Gift: First delivery on us',
      'أهلًا بيك في إنجزنا! أول طلب التوصيل علينا.',
      'Welcome to Engezna! Your first delivery is on us.',
      jsonb_build_object('template', 'welcome_signup')
    )
    RETURNING id INTO v_gift_id;
  END IF;

  -- Insert gift_box_entry
  INSERT INTO public.gift_box_entries (
    user_id, gift_id, source, status, expires_at,
    bucket_name, cost_piasters, funder_type
  ) VALUES (
    p_user_id, v_gift_id, 'welcome_signup', 'granted', v_expires_at,
    'welcome', 2250, 'engezna'
  )
  RETURNING id INTO v_entry_id;

  -- Log financial transaction
  INSERT INTO public.gift_financial_log (
    transaction_type, amount_piasters, bucket,
    funder_type, user_id, gift_entry_id, notes
  ) VALUES (
    'grant', 2250, 'welcome',
    'engezna', p_user_id, v_entry_id, 'Welcome Box on signup'
  );

  -- Update profile
  UPDATE public.profiles
  SET welcome_box_granted_at = NOW(),
      welcome_box_entry_id   = v_entry_id
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'granted',     true,
    'entry_id',    v_entry_id,
    'expires_at',  v_expires_at,
    'gift_type',   'free_delivery'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_welcome_box_atomic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_welcome_box_atomic(UUID) TO service_role;

-- ─── 5. Mark Welcome Box used hook ─────────────────────────────────────────────
-- NOTE: The WHEN clause of a CREATE TRIGGER is type-checked at trigger creation
-- time. Since 'welcome_signup' was just added to gift_source in the same
-- transaction, Postgres rejects it ("unsafe use of new enum value").
-- We filter inside the function body instead (evaluated at runtime, safe).
CREATE OR REPLACE FUNCTION public.mark_welcome_box_used()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.source::TEXT = 'welcome_signup'
     AND NEW.status = 'used'
     AND (OLD.status IS DISTINCT FROM 'used') THEN
    UPDATE public.profiles
    SET welcome_box_used_at = NOW()
    WHERE welcome_box_entry_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_welcome_box_used ON public.gift_box_entries;
CREATE TRIGGER trg_welcome_box_used
  AFTER UPDATE OF status ON public.gift_box_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_welcome_box_used();

COMMENT ON FUNCTION public.grant_welcome_box_atomic(UUID) IS
  'v2.5.2: Idempotent grant of Welcome Box (free_delivery, 7-day expiry) for newly verified signups.';
