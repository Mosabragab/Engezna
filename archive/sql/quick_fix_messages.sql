-- Quick fix: Create internal_messages table and related components
-- Run this in Supabase SQL Editor if full migration wasn't applied

-- Check if admin_users table exists first
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
    RAISE EXCEPTION 'admin_users table does not exist. Please run the full admin_dashboard_schema.sql migration first.';
  END IF;
END $$;

-- Create internal_messages table if not exists
CREATE TABLE IF NOT EXISTS public.internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,

  sender_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  recipient_ids UUID[] NOT NULL,

  subject VARCHAR(255),
  body TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  attachments JSONB,

  related_approval_id UUID,
  related_task_id UUID,

  read_by UUID[],
  read_confirmations JSONB,

  is_broadcast BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_internal_messages_sender ON internal_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_conversation ON internal_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_created ON internal_messages(created_at DESC);

-- Enable RLS
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view their messages" ON internal_messages;
DROP POLICY IF EXISTS "Admins can send messages" ON internal_messages;
DROP POLICY IF EXISTS "Admins can update their messages" ON internal_messages;
DROP POLICY IF EXISTS "Admins can update messages" ON internal_messages;

-- Create RLS policies
CREATE POLICY "Admins can view their messages"
  ON internal_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND is_active = true
      AND (
        id = internal_messages.sender_id
        OR id = ANY(internal_messages.recipient_ids)
        OR internal_messages.is_broadcast = true
      )
    )
  );

CREATE POLICY "Admins can send messages"
  ON internal_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can update messages"
  ON internal_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        au.id = internal_messages.sender_id
        OR au.id = ANY(internal_messages.recipient_ids)
        OR internal_messages.is_broadcast = true
      )
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'internal_messages table created successfully with RLS policies!';
END $$;
