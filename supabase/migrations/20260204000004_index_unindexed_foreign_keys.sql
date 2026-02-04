-- ============================================================================
-- Add missing indexes for unindexed foreign keys
-- إضافة الفهارس الناقصة للمفاتيح الأجنبية
-- ============================================================================
-- This migration addresses Supabase Performance Advisor warnings about
-- unindexed foreign keys on multiple tables.
--
-- Unindexed FKs can cause:
-- 1. Full table scans on DELETE/UPDATE of referenced rows
-- 2. Slow JOINs and lookups
-- 3. Lock contention during referential integrity checks
-- ============================================================================

-- ============================================================================
-- SECTION 1: admin_tasks indexes
-- ============================================================================
-- Existing indexes: assigned_to, created_by, status, priority, deadline, created_at
-- Missing: related_provider_id, related_order_id, related_ticket_id, related_customer_id

CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_provider
ON public.admin_tasks(related_provider_id)
WHERE related_provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_order
ON public.admin_tasks(related_order_id)
WHERE related_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_ticket
ON public.admin_tasks(related_ticket_id)
WHERE related_ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_customer
ON public.admin_tasks(related_customer_id)
WHERE related_customer_id IS NOT NULL;

-- ============================================================================
-- SECTION 2: approval_requests indexes
-- ============================================================================
-- Existing indexes: requested_by, status, type, created_at, related_provider_id
-- Missing: decided_by, related_order_id, related_customer_id, related_ticket_id, follow_up_task_id

CREATE INDEX IF NOT EXISTS idx_approval_requests_decided_by
ON public.approval_requests(decided_by)
WHERE decided_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_requests_related_order
ON public.approval_requests(related_order_id)
WHERE related_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_requests_related_customer
ON public.approval_requests(related_customer_id)
WHERE related_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_requests_related_ticket
ON public.approval_requests(related_ticket_id)
WHERE related_ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_requests_follow_up_task
ON public.approval_requests(follow_up_task_id)
WHERE follow_up_task_id IS NOT NULL;

-- ============================================================================
-- SECTION 3: admin_users index
-- ============================================================================
-- The user_id FK references profiles(id)
-- This helps with JOINs between admin_users and profiles

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id
ON public.admin_users(user_id);

-- ============================================================================
-- SECTION 4: task_updates indexes (if missing)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_task_updates_admin
ON public.task_updates(admin_id)
WHERE admin_id IS NOT NULL;

-- ============================================================================
-- SECTION 5: approval_discussions indexes (if missing)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_approval_discussions_admin
ON public.approval_discussions(admin_id)
WHERE admin_id IS NOT NULL;

-- ============================================================================
-- SECTION 6: admin_permissions index
-- ============================================================================
-- The granted_by FK references admin_users(id)

CREATE INDEX IF NOT EXISTS idx_admin_permissions_granted_by
ON public.admin_permissions(granted_by)
WHERE granted_by IS NOT NULL;

-- ============================================================================
-- SECTION 7: internal_messages indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_internal_messages_related_approval
ON public.internal_messages(related_approval_id)
WHERE related_approval_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_internal_messages_related_task
ON public.internal_messages(related_task_id)
WHERE related_task_id IS NOT NULL;

-- ============================================================================
-- Update statistics for query planner optimization
-- ============================================================================

ANALYZE public.admin_tasks;
ANALYZE public.approval_requests;
ANALYZE public.admin_users;
ANALYZE public.task_updates;
ANALYZE public.approval_discussions;
ANALYZE public.admin_permissions;
ANALYZE public.internal_messages;
