-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Partner Gifts Workflow — atomic state-transition RPCs
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- Phase 9 of the Gift Box plan. The gift_partner_offers table already exists
-- (migration 20260428000001). This migration adds the workflow plumbing:
--
--   draft ── submit_partner_offer ──> pending_approval
--   pending_approval ── approve_partner_offer ──> approved (then auto activates
--     if starts_at <= now() <= ends_at via the active_partner_offer view)
--   pending_approval ── reject_partner_offer ──> rejected
--   active ── pause_partner_offer ──> paused
--   paused ── resume_partner_offer ──> active
--
-- All transitions guard the previous state inside the UPDATE so concurrent
-- callers can't double-transition.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Indexes for fast lookups in the dashboards                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_gift_partner_offers_provider_status
  ON public.gift_partner_offers(provider_id, status);

CREATE INDEX IF NOT EXISTS idx_gift_partner_offers_pending
  ON public.gift_partner_offers(created_at DESC)
  WHERE status = 'pending_approval';

CREATE INDEX IF NOT EXISTS idx_gift_partner_offers_active
  ON public.gift_partner_offers(ends_at)
  WHERE status IN ('approved', 'active');


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ submit_partner_offer_atomic — provider moves draft to pending_approval       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Provider-callable. Validates the row is still a draft, the caller owns the
-- provider, and terms_accepted = true. Returns the updated row or NULL.

DROP FUNCTION IF EXISTS public.submit_partner_offer_atomic(UUID);

CREATE OR REPLACE FUNCTION public.submit_partner_offer_atomic(p_offer_id UUID)
RETURNS public.gift_partner_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_offer public.gift_partner_offers%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_offer_id IS NULL THEN
    RAISE EXCEPTION 'p_offer_id required';
  END IF;

  UPDATE public.gift_partner_offers o
  SET status = 'pending_approval'
  WHERE o.id = p_offer_id
    AND o.status = 'draft'
    AND o.terms_accepted = TRUE
    AND o.provider_id IN (SELECT id FROM public.providers WHERE owner_id = v_user)
  RETURNING * INTO v_offer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cannot_submit_offer';
  END IF;

  RETURN v_offer;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_partner_offer_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_partner_offer_atomic(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_partner_offer_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_partner_offer_atomic(UUID) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ approve_partner_offer_atomic — admin approves a pending offer                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.approve_partner_offer_atomic(UUID);

CREATE OR REPLACE FUNCTION public.approve_partner_offer_atomic(p_offer_id UUID)
RETURNS public.gift_partner_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_offer public.gift_partner_offers%ROWTYPE;
BEGIN
  IF v_user IS NULL OR NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_offer_id IS NULL THEN
    RAISE EXCEPTION 'p_offer_id required';
  END IF;

  UPDATE public.gift_partner_offers o
  SET
    status = CASE
      WHEN NOW() BETWEEN o.starts_at AND o.ends_at THEN 'active'::partner_offer_status
      ELSE 'approved'::partner_offer_status
    END,
    approved_by = v_user,
    approved_at = NOW(),
    rejection_reason = NULL
  WHERE o.id = p_offer_id
    AND o.status = 'pending_approval'
  RETURNING * INTO v_offer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cannot_approve_offer';
  END IF;

  RETURN v_offer;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_partner_offer_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_partner_offer_atomic(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.approve_partner_offer_atomic(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.approve_partner_offer_atomic(UUID) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ reject_partner_offer_atomic — admin rejects with reason                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.reject_partner_offer_atomic(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.reject_partner_offer_atomic(p_offer_id UUID, p_reason TEXT)
RETURNS public.gift_partner_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_offer public.gift_partner_offers%ROWTYPE;
BEGIN
  IF v_user IS NULL OR NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF p_offer_id IS NULL OR p_reason IS NULL OR LENGTH(TRIM(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  UPDATE public.gift_partner_offers o
  SET
    status = 'rejected',
    rejection_reason = p_reason,
    approved_by = v_user,
    approved_at = NOW()
  WHERE o.id = p_offer_id
    AND o.status = 'pending_approval'
  RETURNING * INTO v_offer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cannot_reject_offer';
  END IF;

  RETURN v_offer;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_partner_offer_atomic(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_partner_offer_atomic(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.reject_partner_offer_atomic(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reject_partner_offer_atomic(UUID, TEXT) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ pause / resume — provider toggles their own active campaigns                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.pause_partner_offer_atomic(UUID);

CREATE OR REPLACE FUNCTION public.pause_partner_offer_atomic(p_offer_id UUID)
RETURNS public.gift_partner_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_offer public.gift_partner_offers%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  UPDATE public.gift_partner_offers o
  SET status = 'paused'
  WHERE o.id = p_offer_id
    AND o.status IN ('approved', 'active')
    AND o.provider_id IN (SELECT id FROM public.providers WHERE owner_id = v_user)
  RETURNING * INTO v_offer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cannot_pause_offer';
  END IF;
  RETURN v_offer;
END;
$$;

REVOKE ALL ON FUNCTION public.pause_partner_offer_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pause_partner_offer_atomic(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.pause_partner_offer_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pause_partner_offer_atomic(UUID) TO service_role;


DROP FUNCTION IF EXISTS public.resume_partner_offer_atomic(UUID);

CREATE OR REPLACE FUNCTION public.resume_partner_offer_atomic(p_offer_id UUID)
RETURNS public.gift_partner_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_offer public.gift_partner_offers%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  UPDATE public.gift_partner_offers o
  SET status = CASE
    WHEN NOW() BETWEEN o.starts_at AND o.ends_at THEN 'active'::partner_offer_status
    ELSE 'approved'::partner_offer_status
  END
  WHERE o.id = p_offer_id
    AND o.status = 'paused'
    AND o.provider_id IN (SELECT id FROM public.providers WHERE owner_id = v_user)
  RETURNING * INTO v_offer;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cannot_resume_offer';
  END IF;
  RETURN v_offer;
END;
$$;

REVOKE ALL ON FUNCTION public.resume_partner_offer_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resume_partner_offer_atomic(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.resume_partner_offer_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_partner_offer_atomic(UUID) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Provider UPDATE policy — only own DRAFT rows                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Existing policies cover SELECT + INSERT for providers and ALL for admins.
-- We add a narrow UPDATE policy so a provider can edit their drafts only.

DO $$ BEGIN
  CREATE POLICY "Providers can edit own drafts"
    ON public.gift_partner_offers FOR UPDATE
    USING (
      status = 'draft'
      AND provider_id IN (SELECT id FROM public.providers WHERE owner_id = auth.uid())
    )
    WITH CHECK (
      status = 'draft'
      AND provider_id IN (SELECT id FROM public.providers WHERE owner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- DELETE policy — only own drafts
DO $$ BEGIN
  CREATE POLICY "Providers can delete own drafts"
    ON public.gift_partner_offers FOR DELETE
    USING (
      status = 'draft'
      AND provider_id IN (SELECT id FROM public.providers WHERE owner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
