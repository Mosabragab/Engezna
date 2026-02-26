-- ============================================================================
-- Fix Profiles RLS: Eliminate Self-Referential Policy Recursion
-- ============================================================================
-- Problem: The profiles_select_admin policy created in 20260226000002 uses a
-- self-referential sub-query: SELECT FROM profiles to check profiles access.
-- This causes infinite RLS recursion because evaluating the policy requires
-- re-evaluating the same policy on the inner query.
--
-- Impact: ALL tables with admin RLS policies that sub-query profiles
-- (governorates, cities, districts, etc.) fail with recursion errors.
-- This breaks the governorate dropdown and all location data loading.
--
-- Fix: Use the existing is_admin() SECURITY DEFINER function which checks
-- admin_users table and bypasses RLS, avoiding the recursion entirely.
-- ============================================================================

-- Drop the self-referential policy
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

-- Recreate using SECURITY DEFINER function (no recursion)
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  USING (is_admin(auth.uid()));
