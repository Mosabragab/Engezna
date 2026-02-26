-- ============================================================================
-- Fix Profiles RLS: Prevent PII Leakage
-- ============================================================================
-- Problem: Current SELECT policy on profiles uses `auth.uid() IS NOT NULL`
-- which means ANY authenticated user can read ALL profiles (email, phone, name).
--
-- Solution: Users can only read their own profile. Provider owners can read
-- profiles of customers who placed orders with them (for order management).
-- Admins can read all profiles.
-- ============================================================================

-- Drop the overly-permissive policy
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- 1. Users can always read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Admins can read all profiles
-- IMPORTANT: Uses is_admin() SECURITY DEFINER function to avoid infinite recursion.
-- A self-referential sub-query on profiles here would cause RLS recursion because
-- evaluating this policy would trigger another evaluation of the same policy.
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  USING (is_admin(auth.uid()));

-- 3. Provider owners can read profiles of their customers (for order display)
CREATE POLICY "profiles_select_provider_customers"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      INNER JOIN public.providers prov ON o.provider_id = prov.id
      WHERE o.customer_id = profiles.id
        AND prov.owner_id = auth.uid()
    )
  );

-- 4. Provider staff can read profiles of customers in their provider's orders
CREATE POLICY "profiles_select_staff_customers"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      INNER JOIN public.provider_staff ps ON o.provider_id = ps.provider_id
      WHERE o.customer_id = profiles.id
        AND ps.user_id = auth.uid()
        AND ps.is_active = true
    )
  );
