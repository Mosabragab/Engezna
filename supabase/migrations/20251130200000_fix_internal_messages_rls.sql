-- Fix RLS policy for internal_messages table
-- The original UPDATE policy only allowed sender to update, but recipients need to mark messages as read

-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Admins can update their messages" ON internal_messages;

-- Create a new policy that allows:
-- 1. Sender to update any field of their messages
-- 2. Recipients to update read_by and read_confirmations fields
CREATE POLICY "Admins can update messages"
  ON internal_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        -- Sender can update their own messages
        au.id = internal_messages.sender_id
        -- Recipients can update messages they received (for marking as read)
        OR au.id = ANY(internal_messages.recipient_ids)
        -- Admins can update broadcast messages they received
        OR internal_messages.is_broadcast = true
      )
    )
  );

-- Add a comment explaining the policy
COMMENT ON POLICY "Admins can update messages" ON internal_messages IS
  'Allows senders to update their messages and recipients to mark messages as read';
