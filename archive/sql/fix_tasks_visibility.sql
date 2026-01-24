-- ============================================================================
-- FIX SCRIPT: ADMIN TASKS VISIBILITY ISSUES
-- سكريبت إصلاح: مشاكل ظهور المهام
-- ============================================================================
-- This script fixes common issues preventing tasks from appearing
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: ENSURE admin_notifications TABLE EXISTS
-- التأكد من وجود جدول الإشعارات
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  related_task_id UUID,
  related_approval_id UUID,
  related_message_id UUID,
  related_announcement_id UUID,
  related_ticket_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add foreign key if not exists (safe way)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'admin_notifications_admin_id_fkey'
  ) THEN
    ALTER TABLE admin_notifications
    ADD CONSTRAINT admin_notifications_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add foreign key - admin_users may not exist yet';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- Enable RLS on admin_notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies for admin_notifications
DROP POLICY IF EXISTS "Admins can view their notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins can update their notifications" ON admin_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON admin_notifications;

CREATE POLICY "Admins can view their notifications"
  ON admin_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = admin_notifications.admin_id AND is_active = true
    )
  );

CREATE POLICY "Admins can update their notifications"
  ON admin_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = admin_notifications.admin_id AND is_active = true
    )
  );

CREATE POLICY "System can create notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- STEP 2: SYNC ADMIN_USERS WITH PROFILES
-- مزامنة admin_users مع profiles
-- ============================================================================
INSERT INTO admin_users (user_id, role, is_active, created_at, updated_at)
SELECT
  p.id,
  'admin',
  true,
  NOW(),
  NOW()
FROM profiles p
WHERE p.role = 'admin'
AND NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- Activate all existing admins
UPDATE admin_users au
SET is_active = true, updated_at = NOW()
FROM profiles p
WHERE au.user_id = p.id
AND p.role = 'admin'
AND au.is_active = false;

-- ============================================================================
-- STEP 3: ENSURE admin_tasks TABLE EXISTS WITH PROPER STRUCTURE
-- التأكد من وجود جدول المهام
-- ============================================================================

-- Create task_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('new', 'accepted', 'in_progress', 'pending', 'completed', 'cancelled');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create task_priority enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('urgent', 'high', 'medium', 'low');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create admin_tasks table if not exists
CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number VARCHAR(20) UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'new',
  progress_percentage INTEGER DEFAULT 0,
  created_by UUID,
  assigned_to UUID,
  cc_to UUID[],
  deadline TIMESTAMP WITH TIME ZONE,
  reminder_before INTERVAL,
  auto_escalate BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  related_provider_id UUID,
  related_order_id UUID,
  related_ticket_id UUID,
  related_customer_id UUID,
  attachments JSONB,
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned ON admin_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_created_by ON admin_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON admin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_priority ON admin_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_deadline ON admin_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_created ON admin_tasks(created_at DESC);

-- Enable RLS
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: FIX RLS POLICIES FOR admin_tasks
-- إصلاح سياسات RLS للمهام
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view their tasks" ON admin_tasks;
DROP POLICY IF EXISTS "Admins can update assigned tasks" ON admin_tasks;
DROP POLICY IF EXISTS "Super admins can manage all tasks" ON admin_tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON admin_tasks;

-- Create new, more permissive policies for troubleshooting

-- SELECT policy: Admins can view tasks they created, are assigned to, or are CC'd on
CREATE POLICY "Admins can view their tasks"
  ON admin_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        au.id = admin_tasks.assigned_to
        OR au.id = admin_tasks.created_by
        OR au.id = ANY(COALESCE(admin_tasks.cc_to, ARRAY[]::UUID[]))
        OR au.role = 'super_admin'
      )
    )
  );

-- UPDATE policy
CREATE POLICY "Admins can update assigned tasks"
  ON admin_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        au.id = admin_tasks.assigned_to
        OR au.id = admin_tasks.created_by
        OR au.role = 'super_admin'
      )
    )
  );

-- INSERT policy
CREATE POLICY "Admins can create tasks"
  ON admin_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- DELETE policy (super admin only)
CREATE POLICY "Super admins can delete tasks"
  ON admin_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- ============================================================================
-- STEP 5: CREATE TASK NUMBER GENERATION TRIGGER
-- إنشاء مولد رقم المهمة
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS task_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.task_number IS NULL OR NEW.task_number = '' THEN
    NEW.task_number := 'TSK-' || lpad(nextval('task_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_task_number ON admin_tasks;
CREATE TRIGGER set_task_number
  BEFORE INSERT ON admin_tasks
  FOR EACH ROW
  EXECUTE FUNCTION generate_task_number();

-- ============================================================================
-- STEP 6: GRANT SUPER_ADMIN TO FIRST ADMIN (if none exists)
-- منح صلاحيات super_admin للمشرف الأول
-- ============================================================================
DO $$
DECLARE
  super_admin_count INTEGER;
  first_admin_id UUID;
BEGIN
  SELECT COUNT(*) INTO super_admin_count FROM admin_users WHERE role = 'super_admin';

  IF super_admin_count = 0 THEN
    SELECT id INTO first_admin_id FROM admin_users WHERE is_active = true ORDER BY created_at ASC LIMIT 1;

    IF first_admin_id IS NOT NULL THEN
      UPDATE admin_users SET role = 'super_admin' WHERE id = first_admin_id;
      RAISE NOTICE '✅ Promoted first active admin to super_admin: %', first_admin_id;
    ELSE
      RAISE NOTICE '⚠️ No active admins found to promote';
    END IF;
  ELSE
    RAISE NOTICE '✅ Super admin already exists (%)', super_admin_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: VERIFICATION
-- التحقق من الإصلاحات
-- ============================================================================
SELECT
  '✅ FIX COMPLETED - Verification' as status,
  (SELECT COUNT(*) FROM admin_tasks) as total_tasks,
  (SELECT COUNT(*) FROM admin_users WHERE is_active = true) as active_admins,
  (SELECT COUNT(*) FROM admin_users WHERE role = 'super_admin') as super_admins,
  (SELECT COUNT(*) FROM admin_notifications) as notifications;

-- Show all admin users
SELECT
  'Admin Users After Fix' as section,
  au.id,
  p.full_name,
  p.email,
  au.role,
  au.is_active
FROM admin_users au
JOIN profiles p ON au.user_id = p.id
ORDER BY au.role DESC, au.created_at;
