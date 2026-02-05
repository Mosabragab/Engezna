-- ============================================================================
-- Add missing indexes for unindexed foreign keys
-- إضافة الفهارس الناقصة للمفاتيح الأجنبية
-- ============================================================================
-- This migration addresses Supabase Performance Advisor warnings about
-- unindexed foreign keys on multiple tables.
--
-- NOTE: Uses dynamic SQL to handle tables that may not exist in production
-- ============================================================================

-- ============================================================================
-- SECTION 1: admin_tasks indexes
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_tasks') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_provider ON public.admin_tasks(related_provider_id) WHERE related_provider_id IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_order ON public.admin_tasks(related_order_id) WHERE related_order_id IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_ticket ON public.admin_tasks(related_ticket_id) WHERE related_ticket_id IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_tasks_related_customer ON public.admin_tasks(related_customer_id) WHERE related_customer_id IS NOT NULL';
    ANALYZE public.admin_tasks;
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: approval_requests indexes
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'approval_requests') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_approval_requests_decided_by ON public.approval_requests(decided_by) WHERE decided_by IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_approval_requests_related_order ON public.approval_requests(related_order_id) WHERE related_order_id IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_approval_requests_related_customer ON public.approval_requests(related_customer_id) WHERE related_customer_id IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_approval_requests_related_ticket ON public.approval_requests(related_ticket_id) WHERE related_ticket_id IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_approval_requests_follow_up_task ON public.approval_requests(follow_up_task_id) WHERE follow_up_task_id IS NOT NULL';
    ANALYZE public.approval_requests;
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: admin_users index
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_users') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id)';
    ANALYZE public.admin_users;
  END IF;
END $$;

-- ============================================================================
-- SECTION 4: task_updates indexes
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_updates') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_task_updates_admin ON public.task_updates(admin_id) WHERE admin_id IS NOT NULL';
    ANALYZE public.task_updates;
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: approval_discussions indexes
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'approval_discussions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_approval_discussions_admin ON public.approval_discussions(admin_id) WHERE admin_id IS NOT NULL';
    ANALYZE public.approval_discussions;
  END IF;
END $$;

-- ============================================================================
-- SECTION 6: admin_permissions index
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_permissions') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_permissions_granted_by ON public.admin_permissions(granted_by) WHERE granted_by IS NOT NULL';
    ANALYZE public.admin_permissions;
  END IF;
END $$;

-- ============================================================================
-- SECTION 7: internal_messages indexes
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internal_messages') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_internal_messages_related_approval ON public.internal_messages(related_approval_id) WHERE related_approval_id IS NOT NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_internal_messages_related_task ON public.internal_messages(related_task_id) WHERE related_task_id IS NOT NULL';
    ANALYZE public.internal_messages;
  END IF;
END $$;
