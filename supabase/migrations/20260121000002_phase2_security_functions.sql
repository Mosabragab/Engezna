-- ============================================================================
-- PHASE 2: SECURITY HELPER FUNCTIONS (SAFE - Preparation only)
-- ============================================================================
-- This migration ONLY creates helper functions for RLS policies.
-- It does NOT enable RLS or create any policies yet.
-- These functions use SECURITY DEFINER to bypass RLS and avoid recursion.
-- Safe to run - functions won't be used until Phase 3 policies are created.
-- ============================================================================

-- ============================================================================
-- SECTION 1: Admin check functions
-- ============================================================================

-- Check if user is an admin (any admin role, must be active)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user_id provided
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user exists in admin_users table and is active
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is a super admin (highest level permissions)
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if no user_id provided
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user is super_admin role and active
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_user_id
    AND is_active = true
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- SECTION 2: Provider ownership check (for support_tickets & approval_requests)
-- ============================================================================

-- Check if user owns a specific provider
CREATE OR REPLACE FUNCTION public.user_owns_provider(p_provider_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if either parameter is null
  IF p_provider_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = p_provider_id
    AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- SECTION 3: Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_provider(UUID, UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Test these functions before Phase 3)
-- ============================================================================
/*
-- Test 1: Check if a known admin user is recognized
-- Replace 'your-admin-user-id' with an actual admin user_id from admin_users
SELECT is_admin('your-admin-user-id'::uuid) as should_be_true;

-- Test 2: Check if a regular customer is NOT recognized as admin
-- Replace 'your-customer-user-id' with an actual customer user_id
SELECT is_admin('your-customer-user-id'::uuid) as should_be_false;

-- Test 3: Check super_admin function
SELECT is_super_admin('your-super-admin-user-id'::uuid) as should_be_true;

-- Test 4: Check provider ownership
-- Replace with actual provider_id and owner user_id
SELECT user_owns_provider('provider-id'::uuid, 'owner-user-id'::uuid) as should_be_true;

-- Test 5: List all admin users to verify function will work
SELECT
  au.id,
  au.user_id,
  au.role,
  au.is_active,
  p.full_name,
  p.email
FROM admin_users au
JOIN profiles p ON p.id = au.user_id
WHERE au.is_active = true
ORDER BY au.role, p.full_name;
*/
