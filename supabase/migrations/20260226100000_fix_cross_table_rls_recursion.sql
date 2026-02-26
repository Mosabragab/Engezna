-- ============================================================================
-- Fix Cross-Table RLS Recursion: profiles ↔ providers ↔ orders
-- ============================================================================
-- Problem: The profiles_select_provider_customers and profiles_select_staff_customers
-- policies (from 20260226000002) query orders JOIN providers. But the providers table
-- has a providers_admin policy that does SELECT FROM profiles. This creates
-- cross-table RLS recursion:
--
--   profiles → profiles_select_provider_customers → orders JOIN providers
--   → providers_admin → SELECT FROM profiles → RECURSION!
--
-- Similarly, governorates/cities/districts admin policies reference profiles
-- directly, which can trigger profiles RLS evaluation chains.
--
-- Fix Strategy:
-- 1. Replace profiles_select_provider_customers and profiles_select_staff_customers
--    with SECURITY DEFINER functions that bypass RLS on the sub-queried tables
-- 2. Replace providers_admin direct profiles sub-query with is_admin() function
-- 3. Replace governorates/cities/districts admin policies to use is_admin()
-- ============================================================================

-- ============================================================================
-- STEP 1: Create SECURITY DEFINER helper functions for profiles RLS
-- These bypass RLS on orders/providers/provider_staff to avoid recursion
-- ============================================================================

-- Check if a profile belongs to a customer of the current user's provider
CREATE OR REPLACE FUNCTION public.is_provider_customer(p_profile_id UUID, p_owner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders o
    INNER JOIN public.providers prov ON o.provider_id = prov.id
    WHERE o.customer_id = p_profile_id
      AND prov.owner_id = p_owner_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if a profile belongs to a customer of a provider where the user is staff
CREATE OR REPLACE FUNCTION public.is_staff_customer(p_profile_id UUID, p_staff_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders o
    INNER JOIN public.provider_staff ps ON o.provider_id = ps.provider_id
    WHERE o.customer_id = p_profile_id
      AND ps.user_id = p_staff_user_id
      AND ps.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 2: Replace profiles RLS policies to use SECURITY DEFINER functions
-- ============================================================================

-- Drop the recursive policies
DROP POLICY IF EXISTS "profiles_select_provider_customers" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_staff_customers" ON public.profiles;

-- Recreate using SECURITY DEFINER functions (no cross-table recursion)
CREATE POLICY "profiles_select_provider_customers"
  ON public.profiles
  FOR SELECT
  USING (is_provider_customer(id, auth.uid()));

CREATE POLICY "profiles_select_staff_customers"
  ON public.profiles
  FOR SELECT
  USING (is_staff_customer(id, auth.uid()));

-- ============================================================================
-- STEP 3: Fix providers_admin policy to use is_admin() instead of sub-query
-- This prevents providers → profiles → providers recursion
-- ============================================================================

DROP POLICY IF EXISTS "providers_admin" ON public.providers;

CREATE POLICY "providers_admin"
  ON public.providers FOR ALL
  USING (is_admin(auth.uid()));

-- ============================================================================
-- STEP 4: Fix governorates/cities/districts admin policies
-- These all do SELECT FROM profiles which triggers profiles RLS
-- Replace with is_admin() SECURITY DEFINER function
-- ============================================================================

-- Governorates
DROP POLICY IF EXISTS "Admins can manage governorates" ON public.governorates;
CREATE POLICY "Admins can manage governorates"
  ON public.governorates
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Cities
DROP POLICY IF EXISTS "Admins can manage cities" ON public.cities;
CREATE POLICY "Admins can manage cities"
  ON public.cities
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Districts
DROP POLICY IF EXISTS "Admins can manage districts" ON public.districts;
CREATE POLICY "Admins can manage districts"
  ON public.districts
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
