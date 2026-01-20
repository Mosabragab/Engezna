-- ============================================================================
-- 🧪 RLS POLICY TEST CASES
-- ============================================================================
-- Run these tests BEFORE applying Phase 3 migration to production.
-- Each test simulates different user roles accessing the tables.
-- ============================================================================

-- ============================================================================
-- STEP 0: Get Test User IDs (Run this first to get actual IDs)
-- ============================================================================

-- Get a super admin user_id
SELECT
  'SUPER_ADMIN' as role_type,
  au.user_id,
  p.full_name,
  p.email
FROM admin_users au
JOIN profiles p ON p.id = au.user_id
WHERE au.role = 'super_admin' AND au.is_active = true
LIMIT 1;

-- Get a regular admin user_id (not super_admin)
SELECT
  'REGULAR_ADMIN' as role_type,
  au.user_id,
  p.full_name,
  p.email
FROM admin_users au
JOIN profiles p ON p.id = au.user_id
WHERE au.role != 'super_admin' AND au.is_active = true
LIMIT 1;

-- Get a provider owner user_id
SELECT
  'PROVIDER_OWNER' as role_type,
  pr.owner_id as user_id,
  p.full_name,
  p.email,
  pr.id as provider_id,
  pr.name_ar as provider_name
FROM providers pr
JOIN profiles p ON p.id = pr.owner_id
LIMIT 1;

-- Get a regular customer user_id (not admin, not provider)
SELECT
  'CUSTOMER' as role_type,
  p.id as user_id,
  p.full_name,
  p.email
FROM profiles p
WHERE p.id NOT IN (SELECT user_id FROM admin_users WHERE is_active = true)
  AND p.id NOT IN (SELECT owner_id FROM providers)
  AND p.role = 'customer'
LIMIT 1;

-- ============================================================================
-- STEP 1: Test Helper Functions (After Phase 2)
-- ============================================================================
-- Replace the UUIDs below with actual IDs from Step 0

-- Test is_admin() function
-- Expected: true for admin, false for customer
SELECT
  'is_admin test' as test_name,
  is_admin('REPLACE_WITH_ADMIN_USER_ID'::uuid) as admin_result,
  is_admin('REPLACE_WITH_CUSTOMER_USER_ID'::uuid) as customer_result;

-- Test is_super_admin() function
-- Expected: true for super_admin only
SELECT
  'is_super_admin test' as test_name,
  is_super_admin('REPLACE_WITH_SUPER_ADMIN_USER_ID'::uuid) as super_admin_result,
  is_super_admin('REPLACE_WITH_REGULAR_ADMIN_USER_ID'::uuid) as regular_admin_result;

-- Test user_owns_provider() function
-- Expected: true for owner, false for others
SELECT
  'user_owns_provider test' as test_name,
  user_owns_provider('REPLACE_WITH_PROVIDER_ID'::uuid, 'REPLACE_WITH_OWNER_USER_ID'::uuid) as owner_result,
  user_owns_provider('REPLACE_WITH_PROVIDER_ID'::uuid, 'REPLACE_WITH_CUSTOMER_USER_ID'::uuid) as customer_result;

-- ============================================================================
-- STEP 2: Test admin_users Table (After Phase 3)
-- ============================================================================

-- Test 2.1: Admin viewing all admin users (should work)
-- Run as: Admin user
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'REPLACE_WITH_ADMIN_USER_ID';
SELECT count(*) as admin_can_see_all FROM admin_users;
RESET role;
RESET request.jwt.claim.sub;

-- Test 2.2: Customer trying to view admin users (should see 0 or only if they're admin)
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'REPLACE_WITH_CUSTOMER_USER_ID';
SELECT count(*) as customer_sees FROM admin_users;  -- Should be 0
RESET role;
RESET request.jwt.claim.sub;

-- Test 2.3: Super admin updating another admin (should work)
-- Don't actually run this - just verify it doesn't error
-- UPDATE admin_users SET is_active = is_active WHERE user_id = 'some-id';

-- ============================================================================
-- STEP 3: Test approval_requests Table (After Phase 3)
-- ============================================================================

-- Test 3.1: Admin viewing all approval requests
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'REPLACE_WITH_ADMIN_USER_ID';
SELECT count(*) as admin_sees FROM approval_requests;
RESET role;
RESET request.jwt.claim.sub;

-- Test 3.2: Provider owner viewing their requests only
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'REPLACE_WITH_PROVIDER_OWNER_USER_ID';
SELECT count(*) as provider_sees FROM approval_requests;  -- Should be their requests only
RESET role;
RESET request.jwt.claim.sub;

-- Test 3.3: Customer viewing approval requests (should see 0)
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'REPLACE_WITH_CUSTOMER_USER_ID';
SELECT count(*) as customer_sees FROM approval_requests;  -- Should be 0
RESET role;
RESET request.jwt.claim.sub;

-- ============================================================================
-- STEP 4: Test activity_log Table (After Phase 3)
-- ============================================================================

-- Test 4.1: Admin viewing all activity
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'REPLACE_WITH_ADMIN_USER_ID';
SELECT count(*) as admin_sees FROM activity_log;
RESET role;
RESET request.jwt.claim.sub;

-- Test 4.2: Customer viewing only their activity
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'REPLACE_WITH_CUSTOMER_USER_ID';
SELECT count(*) as customer_sees FROM activity_log;  -- Should be their own only
RESET role;
RESET request.jwt.claim.sub;

-- ============================================================================
-- STEP 5: Test support_tickets Table (After Phase 3)
-- ============================================================================

-- Test 5.1: Admin viewing all tickets
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'REPLACE_WITH_ADMIN_USER_ID';
SELECT count(*) as admin_sees FROM support_tickets;
RESET role;
RESET request.jwt.claim.sub;

-- Test 5.2: Customer viewing their own tickets
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'REPLACE_WITH_CUSTOMER_USER_ID';
SELECT count(*) as customer_sees FROM support_tickets;  -- Should be their own only
RESET role;
RESET request.jwt.claim.sub;

-- Test 5.3: Provider viewing tickets about their orders
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claim.sub TO 'REPLACE_WITH_PROVIDER_OWNER_USER_ID';
SELECT count(*) as provider_sees FROM support_tickets;  -- Should include their provider's tickets
RESET role;
RESET request.jwt.claim.sub;

-- ============================================================================
-- EXPECTED RESULTS SUMMARY
-- ============================================================================
/*
| Table              | Admin      | Provider Owner  | Customer        |
|--------------------|------------|-----------------|-----------------|
| admin_users        | See ALL    | See NOTHING*    | See NOTHING*    |
| approval_requests  | See ALL    | See OWN only    | See NOTHING     |
| activity_log       | See ALL    | See OWN only    | See OWN only    |
| support_tickets    | See ALL    | See OWN+Provider| See OWN only    |

* Unless they ARE an admin, then they see their own record
*/

-- ============================================================================
-- QUICK SMOKE TEST (Run after Phase 3 to verify basic access)
-- ============================================================================
/*
-- 1. Login to Supabase Dashboard as a customer
-- 2. Try to access these URLs in the app:
--    - /profile (should work, see own data)
--    - /admin (should be blocked or show limited data)
--
-- 3. Login as an admin
-- 4. Try to access:
--    - /admin (should see full dashboard)
--    - /admin/users (should see all users)
--    - /admin/tickets (should see all tickets)
--
-- 5. Login as a provider owner
-- 6. Try to access:
--    - /provider/orders (should see own orders)
--    - /admin (should be blocked unless they're also an admin)
*/
