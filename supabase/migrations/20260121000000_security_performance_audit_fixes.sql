-- ============================================================================
-- SECURITY & PERFORMANCE AUDIT FIXES
-- Generated from comprehensive database audit on 2026-01-20
-- ============================================================================
-- This migration addresses:
-- 1. CRITICAL: Missing RLS policies on admin tables
-- 2. HIGH: Missing indexes on foreign keys and frequently queried columns
-- 3. MEDIUM: Index optimization and cleanup
-- ============================================================================

-- ============================================================================
-- SECTION 0: HELPER FUNCTIONS (SECURITY DEFINER to bypass RLS)
-- ============================================================================

-- Check if user is an admin (any admin role)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in admin_users table (active admin)
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_user_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is a super admin (highest level)
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is super_admin role
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_user_id
    AND is_active = true
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;

-- ============================================================================
-- SECTION 1: CRITICAL SECURITY FIXES - RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 admin_users - Currently only has INSERT policy, missing SELECT/UPDATE/DELETE
-- ----------------------------------------------------------------------------

-- Ensure RLS is enabled (idempotent)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly (if any incomplete ones exist)
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_update_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_users_delete_policy" ON admin_users;

-- Allow admins to read admin users (needed for admin dashboard)
CREATE POLICY "admin_users_select_policy" ON admin_users
  FOR SELECT USING (
    -- Admins can see all admin users
    is_admin(auth.uid()) OR
    -- Users can see their own admin record (if they are an admin)
    user_id = auth.uid()
  );

-- Only super admins can update admin users
CREATE POLICY "admin_users_update_policy" ON admin_users
  FOR UPDATE USING (
    is_super_admin(auth.uid())
  );

-- Only super admins can delete admin users
CREATE POLICY "admin_users_delete_policy" ON admin_users
  FOR DELETE USING (
    is_super_admin(auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 1.2 approval_requests - No RLS policies at all
-- ----------------------------------------------------------------------------

-- Ensure RLS is enabled
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "approval_requests_select_policy" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_insert_policy" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_update_policy" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_delete_policy" ON approval_requests;

-- Providers can see their own approval requests, admins can see all
CREATE POLICY "approval_requests_select_policy" ON approval_requests
  FOR SELECT USING (
    -- Admins can see all approval requests
    is_admin(auth.uid()) OR
    -- Provider owners can see their own approval requests
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- System/admins can create approval requests (created when provider registers)
CREATE POLICY "approval_requests_insert_policy" ON approval_requests
  FOR INSERT WITH CHECK (
    -- Admins can insert
    is_admin(auth.uid()) OR
    -- Auto-created during provider registration (user creating their own)
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- Only admins can update approval status
CREATE POLICY "approval_requests_update_policy" ON approval_requests
  FOR UPDATE USING (
    is_admin(auth.uid())
  );

-- Only admins can delete approval requests
CREATE POLICY "approval_requests_delete_policy" ON approval_requests
  FOR DELETE USING (
    is_admin(auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 1.3 activity_log - No RLS policies (privacy violation risk)
-- ----------------------------------------------------------------------------

-- Ensure RLS is enabled
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "activity_log_select_policy" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert_policy" ON activity_log;

-- Users can only see their own activity, admins can see all
CREATE POLICY "activity_log_select_policy" ON activity_log
  FOR SELECT USING (
    -- Admins can see all activity logs
    is_admin(auth.uid()) OR
    -- Users can only see their own activity
    user_id = auth.uid()
  );

-- Activity log entries are inserted by the system (via triggers/functions)
-- Allow authenticated users to have their activity logged
CREATE POLICY "activity_log_insert_policy" ON activity_log
  FOR INSERT WITH CHECK (
    -- System can insert for the authenticated user
    user_id = auth.uid() OR
    -- Admins can insert any activity (for admin actions)
    is_admin(auth.uid())
  );

-- Note: No UPDATE or DELETE policies - activity logs should be immutable

-- ----------------------------------------------------------------------------
-- 1.4 support_tickets - No RLS policies (critical privacy violation)
-- ----------------------------------------------------------------------------

-- Ensure RLS is enabled
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "support_tickets_select_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete_policy" ON support_tickets;

-- Users can see their own tickets, providers can see tickets about their orders
CREATE POLICY "support_tickets_select_policy" ON support_tickets
  FOR SELECT USING (
    -- Admins can see all tickets
    is_admin(auth.uid()) OR
    -- Users can see their own tickets
    user_id = auth.uid() OR
    -- Providers can see tickets related to their orders
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- Users can create their own tickets
CREATE POLICY "support_tickets_insert_policy" ON support_tickets
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Users can update their own tickets (add info), admins can update any
CREATE POLICY "support_tickets_update_policy" ON support_tickets
  FOR UPDATE USING (
    -- Admins can update any ticket
    is_admin(auth.uid()) OR
    -- Users can update their own tickets
    user_id = auth.uid() OR
    -- Providers can update tickets about their orders
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- Only admins can delete tickets
CREATE POLICY "support_tickets_delete_policy" ON support_tickets
  FOR DELETE USING (
    is_admin(auth.uid())
  );

-- ============================================================================
-- SECTION 2: HIGH PRIORITY - MISSING INDEXES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 support_tickets - Missing ALL indexes (causes full table scans)
-- ----------------------------------------------------------------------------

-- Index for user's tickets lookup (critical for /profile page)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_user_id
  ON support_tickets(user_id);

-- Index for provider's tickets lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_provider_id
  ON support_tickets(provider_id);

-- Index for order-related tickets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_order_id
  ON support_tickets(order_id);

-- Index for filtering by status (admin dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_status
  ON support_tickets(status);

-- Index for sorting by creation date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_created_at
  ON support_tickets(created_at DESC);

-- Composite index for common query pattern (user's open tickets)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_user_status
  ON support_tickets(user_id, status);

-- ----------------------------------------------------------------------------
-- 2.2 approval_requests - Missing index on provider_id FK
-- ----------------------------------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_provider_id
  ON approval_requests(provider_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_status
  ON approval_requests(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_created_at
  ON approval_requests(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2.3 activity_log - Missing indexes for filtering
-- ----------------------------------------------------------------------------

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_user_id
  ON activity_log(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_created_at
  ON activity_log(created_at DESC);

-- Composite for user's recent activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_user_created
  ON activity_log(user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2.4 Additional FK indexes identified in audit
-- ----------------------------------------------------------------------------

-- ticket_messages foreign keys (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_messages') THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id)';
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_messages_sender_id ON ticket_messages(sender_id)';
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: PERFORMANCE OPTIMIZATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 menu_items optimization - High sequential scan rate (74%)
-- ----------------------------------------------------------------------------

-- Composite index for common filtering patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_provider_available
  ON menu_items(provider_id, is_available)
  WHERE is_available = true;

-- Index for category browsing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_category_available
  ON menu_items(category_id, is_available)
  WHERE is_available = true;

-- ----------------------------------------------------------------------------
-- 3.2 Add index hints for financial_settlement_engine optimization
-- Note: The VIEW itself should be converted to materialized view for better performance
-- This is a placeholder index that may help with the underlying queries
-- ----------------------------------------------------------------------------

-- Composite index for settlement calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_settlement_lookup
  ON orders(provider_id, status, created_at DESC)
  WHERE status IN ('completed', 'delivered');

-- ============================================================================
-- SECTION 4: GRANT PERMISSIONS
-- ============================================================================

-- Ensure authenticated users can access the protected tables through RLS
GRANT SELECT ON admin_users TO authenticated;
GRANT SELECT, INSERT ON approval_requests TO authenticated;
GRANT SELECT, INSERT ON activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON support_tickets TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify changes)
-- ============================================================================
/*
-- Check RLS status after migration:
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('admin_users', 'approval_requests', 'activity_log', 'support_tickets');

-- Check new policies:
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('admin_users', 'approval_requests', 'activity_log', 'support_tickets')
ORDER BY tablename, policyname;

-- Check new indexes:
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_support_tickets%'
  OR indexname LIKE 'idx_approval_requests%'
  OR indexname LIKE 'idx_activity_log%'
ORDER BY tablename, indexname;
*/
