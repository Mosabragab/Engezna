-- ============================================================================
-- URGENT FIX: Reviews RLS infinite recursion
-- إصلاح عاجل: التكرار اللانهائي في سياسات التقييمات
-- ============================================================================
-- Date: 2025-12-05
-- Problem: "infinite recursion detected in policy for relation providers"
-- Solution: Use SECURITY DEFINER functions to bypass RLS checks
-- ============================================================================

-- First, drop ALL existing reviews policies to start fresh
DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Providers can respond to reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "reviews_select_policy" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_policy" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_policy" ON public.reviews;

-- ============================================================================
-- Helper function to check if user owns a provider (bypasses RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_owns_provider(p_provider_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = p_provider_id AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- Helper function to check if order belongs to user and is delivered (bypasses RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_review_order(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id
    AND customer_id = p_user_id
    AND status = 'delivered'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- NEW SIMPLE POLICIES (no nested queries that trigger RLS)
-- ============================================================================

-- 1. Anyone can view reviews
CREATE POLICY "reviews_select_policy"
  ON public.reviews FOR SELECT
  USING (true);

-- 2. Customers can insert reviews (using helper function)
CREATE POLICY "reviews_insert_policy"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND customer_id = auth.uid()
    AND public.can_review_order(order_id, auth.uid())
  );

-- 3. Customers can update their own reviews OR providers can respond
CREATE POLICY "reviews_update_policy"
  ON public.reviews FOR UPDATE
  USING (
    -- Customer can update their own review
    customer_id = auth.uid()
    -- OR provider owner can update (to add response)
    OR public.user_owns_provider(provider_id, auth.uid())
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR public.user_owns_provider(provider_id, auth.uid())
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Test the helper functions:
-- SELECT public.can_review_order('order-uuid-here', auth.uid());
-- SELECT public.user_owns_provider('provider-uuid-here', auth.uid());
--
-- Check policies:
-- SELECT * FROM pg_policies WHERE tablename = 'reviews';
-- ============================================================================
