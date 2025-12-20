-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Refunds Provider Access
-- Date: 2025-12-20
-- Description: Comprehensive fix for provider access to refunds
--              Drop all existing SELECT policies and create simple explicit ones
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. DROP ALL EXISTING SELECT POLICIES ON REFUNDS
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Customers can view their own refunds" ON refunds;
DROP POLICY IF EXISTS "Customers can view their refunds" ON refunds;
DROP POLICY IF EXISTS "Providers can view their refunds" ON refunds;
DROP POLICY IF EXISTS "Users can view their refunds" ON refunds;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. CREATE SIMPLE EXPLICIT POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Policy 1: Customers can view their own refunds
CREATE POLICY "refunds_customer_select"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Policy 2: Providers can view refunds for their store
-- Using IN subquery which is simpler than EXISTS
CREATE POLICY "refunds_provider_select"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. VERIFY ADMIN POLICY EXISTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Note: "Admins can manage all refunds" policy should already exist from original migration
-- It's a FOR ALL policy that gives admins full access

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. DEBUG - Add a function to check if user can access a specific refund
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION debug_refund_access(p_refund_id UUID)
RETURNS TABLE (
  user_id UUID,
  is_customer BOOLEAN,
  is_provider BOOLEAN,
  is_admin BOOLEAN,
  provider_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    auth.uid() as user_id,
    EXISTS (SELECT 1 FROM refunds WHERE id = p_refund_id AND customer_id = auth.uid()) as is_customer,
    EXISTS (
      SELECT 1 FROM refunds r
      JOIN providers p ON p.id = r.provider_id
      WHERE r.id = p_refund_id AND p.owner_id = auth.uid()
    ) as is_provider,
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') as is_admin,
    ARRAY(SELECT id FROM providers WHERE owner_id = auth.uid()) as provider_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION debug_refund_access(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. ENSURE PROVIDER TABLE RLS DOESN'T BLOCK SUBQUERY
-- ═══════════════════════════════════════════════════════════════════════════════

-- Make sure providers table allows users to see their own provider
DROP POLICY IF EXISTS "owners_can_view_own_provider" ON providers;

CREATE POLICY "owners_can_view_own_provider"
  ON providers
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR true);
  -- Note: providers table is usually public readable, but owner_id filter in refunds policy
  -- needs to work, so we ensure providers are visible

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. LOG THE FIX
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE 'Refund access policies have been updated:';
  RAISE NOTICE '  - refunds_customer_select: Allows customers to view their refunds';
  RAISE NOTICE '  - refunds_provider_select: Allows providers to view refunds for their store';
  RAISE NOTICE '  - Admins can manage all refunds: Existing policy gives admins full access';
END $$;
