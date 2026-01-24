-- ============================================================================
-- QUICK FIX: Create admin_notifications table
-- إصلاح سريع: إنشاء جدول إشعارات المشرفين
-- ============================================================================
-- Run this directly in Supabase SQL Editor to fix the missing table
-- ============================================================================

-- Step 1: Create the table
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

-- Step 2: Add foreign key to admin_users
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
  RAISE NOTICE 'Foreign key admin_id: %', SQLERRM;
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- Step 4: Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
DROP POLICY IF EXISTS "Admins can view own notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins can update own notifications" ON admin_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON admin_notifications;

CREATE POLICY "Admins can view own notifications"
  ON admin_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = admin_notifications.admin_id AND is_active = true
    )
  );

CREATE POLICY "Admins can update own notifications"
  ON admin_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = admin_notifications.admin_id AND is_active = true
    )
  );

CREATE POLICY "System can insert notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

-- Step 6: Verify
SELECT
  'admin_notifications table' as table_name,
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_notifications')
    THEN '✅ CREATED SUCCESSFULLY'
    ELSE '❌ FAILED'
  END as status;
