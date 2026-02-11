-- ============================================================================
-- Fix Providers RLS: Drop vulnerable + duplicate SELECT policies
-- Issues: #1 (OR true vulnerability) + #6 (duplicate policies)
-- ============================================================================

-- Drop the VULNERABLE policy: (owner_id = auth.uid()) OR true → exposes ALL data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'owners_can_view_own_provider' AND tablename = 'providers'
  ) THEN
    DROP POLICY "owners_can_view_own_provider" ON public.providers;
  END IF;
END $$;

-- Drop DUPLICATE: 'Allow public read access' (too narrow: only open, closed)
-- Superseded by 'Public can view active providers' (open, closed, temporarily_paused, on_vacation)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Allow public read access' AND tablename = 'providers'
  ) THEN
    DROP POLICY "Allow public read access" ON public.providers;
  END IF;
END $$;

-- Drop DUPLICATE: 'providers_select_active' (same as 'Public can view active providers')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'providers_select_active' AND tablename = 'providers'
  ) THEN
    DROP POLICY "providers_select_active" ON public.providers;
  END IF;
END $$;

-- Drop DUPLICATE: 'Owners can view all own providers' (same as 'providers_select_owner')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Owners can view all own providers' AND tablename = 'providers'
  ) THEN
    DROP POLICY "Owners can view all own providers" ON public.providers;
  END IF;
END $$;

-- ============================================================================
-- Remaining SELECT policies (kept):
--   1. providers_admin        → admins can see all
--   2. Public can view active providers → public sees open/closed/paused/vacation
--   3. providers_select_owner → owners see their own
--   4. providers_select_staff → staff see their provider
-- ============================================================================

-- Add CHECK constraint for commission_rate max 7% (Issue #7)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'providers_commission_rate_max'
  ) THEN
    ALTER TABLE public.providers
      ADD CONSTRAINT providers_commission_rate_max
      CHECK (commission_rate >= 0 AND commission_rate <= 7);
  END IF;
END $$;
