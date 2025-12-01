-- ============================================================================
-- Migration: Create admin_notifications table
-- إنشاء جدول إشعارات المشرفين
-- ============================================================================
-- Date: 2025-11-30
-- Description: Creates the missing admin_notifications table with RLS policies
-- ============================================================================

-- ============================================================================
-- CREATE ADMIN NOTIFICATIONS TABLE
-- إنشاء جدول الإشعارات
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,

  type VARCHAR(50) NOT NULL, -- 'task', 'approval', 'message', 'announcement', 'reminder', 'escalation', 'system'
  title VARCHAR(255) NOT NULL,
  body TEXT,

  -- Related entities
  related_task_id UUID,
  related_approval_id UUID,
  related_message_id UUID,
  related_announcement_id UUID,
  related_ticket_id UUID,

  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS SAFELY
-- إضافة القيود الخارجية بأمان
-- ============================================================================

DO $$
BEGIN
  -- Add admin_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'admin_notifications_admin_id_fkey'
  ) THEN
    ALTER TABLE admin_notifications
    ADD CONSTRAINT admin_notifications_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add admin_id foreign key: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Add related_task_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'admin_notifications_related_task_id_fkey'
  ) THEN
    ALTER TABLE admin_notifications
    ADD CONSTRAINT admin_notifications_related_task_id_fkey
    FOREIGN KEY (related_task_id) REFERENCES admin_tasks(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add related_task_id foreign key: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Add related_approval_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'admin_notifications_related_approval_id_fkey'
  ) THEN
    ALTER TABLE admin_notifications
    ADD CONSTRAINT admin_notifications_related_approval_id_fkey
    FOREIGN KEY (related_approval_id) REFERENCES approval_requests(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add related_approval_id foreign key: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Add related_message_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'admin_notifications_related_message_id_fkey'
  ) THEN
    ALTER TABLE admin_notifications
    ADD CONSTRAINT admin_notifications_related_message_id_fkey
    FOREIGN KEY (related_message_id) REFERENCES internal_messages(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add related_message_id foreign key: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Add related_announcement_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'admin_notifications_related_announcement_id_fkey'
  ) THEN
    ALTER TABLE admin_notifications
    ADD CONSTRAINT admin_notifications_related_announcement_id_fkey
    FOREIGN KEY (related_announcement_id) REFERENCES announcements(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add related_announcement_id foreign key: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Add related_ticket_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'admin_notifications_related_ticket_id_fkey'
  ) THEN
    ALTER TABLE admin_notifications
    ADD CONSTRAINT admin_notifications_related_ticket_id_fkey
    FOREIGN KEY (related_ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add related_ticket_id foreign key: %', SQLERRM;
END $$;

-- ============================================================================
-- CREATE INDEXES
-- إنشاء الفهارس
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- تفعيل أمان مستوى الصفوف
-- ============================================================================

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- إنشاء سياسات أمان الصفوف
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view own notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins can update own notifications" ON admin_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON admin_notifications;

-- Admins can view their own notifications
CREATE POLICY "Admins can view own notifications"
  ON admin_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = admin_notifications.admin_id AND is_active = true
    )
  );

-- Admins can update their own notifications (mark as read)
CREATE POLICY "Admins can update own notifications"
  ON admin_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = admin_notifications.admin_id AND is_active = true
    )
  );

-- System/triggers can insert notifications for any admin
CREATE POLICY "System can insert notifications"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RECREATE NOTIFICATION FUNCTION
-- إعادة إنشاء دالة الإشعارات
-- ============================================================================

CREATE OR REPLACE FUNCTION create_admin_notification(
  p_admin_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_body TEXT DEFAULT NULL,
  p_related_task_id UUID DEFAULT NULL,
  p_related_approval_id UUID DEFAULT NULL,
  p_related_ticket_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO admin_notifications (
    admin_id,
    type,
    title,
    body,
    related_task_id,
    related_approval_id,
    related_ticket_id
  )
  VALUES (
    p_admin_id,
    p_type,
    p_title,
    p_body,
    p_related_task_id,
    p_related_approval_id,
    p_related_ticket_id
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERY
-- استعلام التحقق
-- ============================================================================
-- Run this to verify: SELECT * FROM admin_notifications LIMIT 5;
-- ============================================================================
