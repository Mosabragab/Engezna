-- ============================================================================
-- PHASE 1: PERFORMANCE INDEXES (SAFE - No functionality changes)
-- ============================================================================
-- This migration ONLY adds missing indexes to improve query performance.
-- It does NOT change any RLS policies or security settings.
-- Safe to run on production - will only SPEED UP the application.
-- ============================================================================

-- ============================================================================
-- SECTION 1: support_tickets indexes (CRITICAL - causes full table scans)
-- ============================================================================

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

-- Composite index for common query pattern (user's tickets by status)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_user_status
  ON support_tickets(user_id, status);

-- ============================================================================
-- SECTION 2: approval_requests indexes
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_provider_id
  ON approval_requests(provider_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_status
  ON approval_requests(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_requests_created_at
  ON approval_requests(created_at DESC);

-- ============================================================================
-- SECTION 3: activity_log indexes
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_user_id
  ON activity_log(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_created_at
  ON activity_log(created_at DESC);

-- Composite for user's recent activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_log_user_created
  ON activity_log(user_id, created_at DESC);

-- ============================================================================
-- SECTION 4: menu_items optimization (74% sequential scan rate)
-- ============================================================================

-- Partial index for available items by provider (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_provider_available
  ON menu_items(provider_id, is_available)
  WHERE is_available = true;

-- Partial index for category browsing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_menu_items_category_available
  ON menu_items(category_id, is_available)
  WHERE is_available = true;

-- ============================================================================
-- SECTION 5: orders optimization for settlements
-- ============================================================================

-- Composite index for settlement calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_settlement_lookup
  ON orders(provider_id, status, created_at DESC)
  WHERE status IN ('completed', 'delivered');

-- ============================================================================
-- VERIFICATION QUERY (Run after migration to verify indexes were created)
-- ============================================================================
/*
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_indexes
JOIN pg_stat_user_indexes USING (indexrelname)
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_support_tickets%'
    OR indexname LIKE 'idx_approval_requests%'
    OR indexname LIKE 'idx_activity_log%'
    OR indexname LIKE 'idx_menu_items_provider_available%'
    OR indexname LIKE 'idx_menu_items_category_available%'
    OR indexname LIKE 'idx_orders_settlement_lookup%'
  )
ORDER BY tablename, indexname;
*/
