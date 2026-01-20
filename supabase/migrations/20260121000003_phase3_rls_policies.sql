-- ============================================================================
-- PHASE 3: RLS POLICIES (REQUIRES TESTING BEFORE PRODUCTION)
-- ============================================================================
-- ⚠️ WARNING: This migration changes access control!
-- Run the TEST CASES at the bottom BEFORE applying to production.
-- Each table section includes its own rollback script.
-- ============================================================================

-- ============================================================================
-- TABLE 1: admin_users
-- Currently has INSERT policy only - missing SELECT/UPDATE/DELETE
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_update_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_delete_policy" ON admin_users;

-- SELECT: Admins see all, users see their own record only
CREATE POLICY "admin_users_select_policy" ON admin_users
  FOR SELECT USING (
    is_admin(auth.uid()) OR user_id = auth.uid()
  );

-- UPDATE: Only super admins can modify admin users
CREATE POLICY "admin_users_update_policy" ON admin_users
  FOR UPDATE USING (
    is_super_admin(auth.uid())
  );

-- DELETE: Only super admins can delete admin users
CREATE POLICY "admin_users_delete_policy" ON admin_users
  FOR DELETE USING (
    is_super_admin(auth.uid())
  );

-- Grant table access
GRANT SELECT ON admin_users TO authenticated;

-- ============================================================================
-- TABLE 2: approval_requests
-- Currently has NO RLS policies at all
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "approval_requests_select_policy" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_insert_policy" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_update_policy" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_delete_policy" ON approval_requests;

-- SELECT: Admins see all, provider owners see their own
CREATE POLICY "approval_requests_select_policy" ON approval_requests
  FOR SELECT USING (
    is_admin(auth.uid()) OR
    user_owns_provider(provider_id, auth.uid())
  );

-- INSERT: Admins or provider owners creating their own request
CREATE POLICY "approval_requests_insert_policy" ON approval_requests
  FOR INSERT WITH CHECK (
    is_admin(auth.uid()) OR
    user_owns_provider(provider_id, auth.uid())
  );

-- UPDATE: Only admins can approve/reject
CREATE POLICY "approval_requests_update_policy" ON approval_requests
  FOR UPDATE USING (
    is_admin(auth.uid())
  );

-- DELETE: Only admins
CREATE POLICY "approval_requests_delete_policy" ON approval_requests
  FOR DELETE USING (
    is_admin(auth.uid())
  );

-- Grant table access
GRANT SELECT, INSERT ON approval_requests TO authenticated;

-- ============================================================================
-- TABLE 3: activity_log
-- Currently has NO RLS policies - privacy violation
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "activity_log_select_policy" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert_policy" ON activity_log;

-- SELECT: Admins see all, users see only their own activity
CREATE POLICY "activity_log_select_policy" ON activity_log
  FOR SELECT USING (
    is_admin(auth.uid()) OR user_id = auth.uid()
  );

-- INSERT: Users can log their own activity, admins can log any
CREATE POLICY "activity_log_insert_policy" ON activity_log
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR is_admin(auth.uid())
  );

-- Note: No UPDATE/DELETE - activity logs should be immutable

-- Grant table access
GRANT SELECT, INSERT ON activity_log TO authenticated;

-- ============================================================================
-- TABLE 4: support_tickets
-- Currently has NO RLS policies - critical privacy violation
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "support_tickets_select_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete_policy" ON support_tickets;

-- SELECT: Admins see all, users see their own, providers see tickets about their orders
CREATE POLICY "support_tickets_select_policy" ON support_tickets
  FOR SELECT USING (
    is_admin(auth.uid()) OR
    user_id = auth.uid() OR
    user_owns_provider(provider_id, auth.uid())
  );

-- INSERT: Users create their own tickets
CREATE POLICY "support_tickets_insert_policy" ON support_tickets
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- UPDATE: Admins can update any, users/providers can update their related tickets
CREATE POLICY "support_tickets_update_policy" ON support_tickets
  FOR UPDATE USING (
    is_admin(auth.uid()) OR
    user_id = auth.uid() OR
    user_owns_provider(provider_id, auth.uid())
  );

-- DELETE: Only admins
CREATE POLICY "support_tickets_delete_policy" ON support_tickets
  FOR DELETE USING (
    is_admin(auth.uid())
  );

-- Grant table access
GRANT SELECT, INSERT, UPDATE ON support_tickets TO authenticated;

-- ============================================================================
-- ⚠️ ROLLBACK SCRIPTS (Use if something breaks)
-- ============================================================================
/*
-- ROLLBACK admin_users:
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_update_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_delete_policy" ON admin_users;
-- Re-enable open access temporarily:
CREATE POLICY "admin_users_temp_open" ON admin_users FOR ALL USING (true);

-- ROLLBACK approval_requests:
DROP POLICY IF EXISTS "approval_requests_select_policy" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_insert_policy" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_update_policy" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_delete_policy" ON approval_requests;
ALTER TABLE approval_requests DISABLE ROW LEVEL SECURITY;

-- ROLLBACK activity_log:
DROP POLICY IF EXISTS "activity_log_select_policy" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert_policy" ON activity_log;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;

-- ROLLBACK support_tickets:
DROP POLICY IF EXISTS "support_tickets_select_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete_policy" ON support_tickets;
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
*/
