-- ============================================================================
-- Add assigned_by column to admin_roles and create index
-- إضافة عمود assigned_by لجدول admin_roles وإنشاء فهرس
-- ============================================================================
-- This migration addresses the Supabase Performance Advisor warning about
-- unindexed foreign keys on admin_roles table.
--
-- The assigned_by column tracks which admin assigned a role to another admin,
-- following the same pattern used in:
-- - admin_invitations (invited_by, cancelled_by)
-- - admin_permissions (granted_by)
-- - admin_tasks (created_by, assigned_to)
-- ============================================================================

-- Add assigned_by column to track who assigned the role
ALTER TABLE public.admin_roles
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- Create index for the foreign key to improve query performance
-- This prevents full table scans when:
-- 1. Deleting/updating admin_users (referential integrity checks)
-- 2. Joining admin_roles with admin_users on assigned_by
-- 3. Filtering admin_roles by who assigned them
CREATE INDEX IF NOT EXISTS idx_admin_roles_assigned_by
ON public.admin_roles(assigned_by);

-- Add comment for documentation
COMMENT ON COLUMN public.admin_roles.assigned_by IS 'Admin user who assigned this role (المشرف الذي قام بتعيين هذا الدور)';

-- Update statistics for the query planner
ANALYZE public.admin_roles;
