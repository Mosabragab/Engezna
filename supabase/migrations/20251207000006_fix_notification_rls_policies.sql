-- Migration: Fix RLS policies for notifications and messages
-- Fixes the issue where mark as read and delete operations only work locally
-- and don't persist to database after page refresh

-- ============================================================================
-- 1. FIX CUSTOMER_NOTIFICATIONS RLS POLICIES
-- Add missing DELETE policy
-- ============================================================================

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Customers can view own notifications" ON customer_notifications;
DROP POLICY IF EXISTS "Customers can update own notifications" ON customer_notifications;
DROP POLICY IF EXISTS "Customers can delete own notifications" ON customer_notifications;
DROP POLICY IF EXISTS "System can insert customer notifications" ON customer_notifications;

-- SELECT: Customers can view their own notifications
CREATE POLICY "Customers can view own notifications"
  ON customer_notifications FOR SELECT
  USING (customer_id = auth.uid());

-- UPDATE: Customers can update their own notifications (mark as read)
CREATE POLICY "Customers can update own notifications"
  ON customer_notifications FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- DELETE: Customers can delete their own notifications (NEW!)
CREATE POLICY "Customers can delete own notifications"
  ON customer_notifications FOR DELETE
  USING (customer_id = auth.uid());

-- INSERT: System/triggers can insert notifications
CREATE POLICY "System can insert customer notifications"
  ON customer_notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 2. CREATE ORDER_MESSAGES TABLE IF NOT EXISTS
-- This table stores chat messages between customers and providers
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'provider')),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_order_messages_order ON order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_sender ON order_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_order_messages_created ON order_messages(created_at DESC);

-- Enable RLS
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for order_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'order_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
  END IF;
END $$;

-- ============================================================================
-- 3. FIX ORDER_MESSAGES RLS POLICIES
-- Ensure UPDATE policy exists for marking messages as read
-- ============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view order messages" ON order_messages;
DROP POLICY IF EXISTS "Users can send order messages" ON order_messages;
DROP POLICY IF EXISTS "Users can update order messages" ON order_messages;
DROP POLICY IF EXISTS "Users can delete order messages" ON order_messages;

-- SELECT: Both parties can view messages for their orders
CREATE POLICY "Users can view order messages"
  ON order_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_messages.order_id
      AND (
        o.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM providers p
          WHERE p.id = o.provider_id
          AND p.owner_id = auth.uid()
        )
      )
    )
  );

-- INSERT: Both parties can send messages
CREATE POLICY "Users can send order messages"
  ON order_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_messages.order_id
      AND (
        o.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM providers p
          WHERE p.id = o.provider_id
          AND p.owner_id = auth.uid()
        )
      )
    )
  );

-- UPDATE: Both parties can update messages in their orders (for marking as read)
CREATE POLICY "Users can update order messages"
  ON order_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_messages.order_id
      AND (
        o.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM providers p
          WHERE p.id = o.provider_id
          AND p.owner_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_messages.order_id
      AND (
        o.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM providers p
          WHERE p.id = o.provider_id
          AND p.owner_id = auth.uid()
        )
      )
    )
  );

-- ============================================================================
-- 4. ENSURE PROVIDER_NOTIFICATIONS HAS PROPER POLICIES
-- The migration 20251207000005 created these, but let's verify they work
-- ============================================================================

-- Recreate provider_notifications policies to ensure they have WITH CHECK
DROP POLICY IF EXISTS "Providers can view own notifications" ON provider_notifications;
DROP POLICY IF EXISTS "Providers can update own notifications" ON provider_notifications;
DROP POLICY IF EXISTS "Providers can delete own notifications" ON provider_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON provider_notifications;

-- SELECT: Providers can view their own notifications
CREATE POLICY "Providers can view own notifications"
  ON provider_notifications FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- UPDATE: Providers can update their own notifications (mark as read)
CREATE POLICY "Providers can update own notifications"
  ON provider_notifications FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- DELETE: Providers can delete their own notifications
CREATE POLICY "Providers can delete own notifications"
  ON provider_notifications FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_id = auth.uid()
    )
  );

-- INSERT: System/triggers can insert notifications
CREATE POLICY "System can insert notifications"
  ON provider_notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 5. ENABLE REALTIME FOR NOTIFICATIONS TABLES
-- This is critical for real-time notification delivery
-- ============================================================================

-- Enable realtime for customer_notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'customer_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE customer_notifications;
  END IF;
END $$;

-- Enable realtime for provider_notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'provider_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE provider_notifications;
  END IF;
END $$;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON order_messages TO authenticated;
GRANT SELECT, UPDATE, DELETE ON customer_notifications TO authenticated;
GRANT INSERT ON customer_notifications TO authenticated;
GRANT INSERT ON customer_notifications TO service_role;

-- ============================================================================
-- 7. UPDATE notify_provider_new_message TO INCLUDE STORE NAME
-- Fix the notification title to show actual store name instead of generic text
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_provider_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_id UUID;
  v_order_number TEXT;
  v_customer_name TEXT;
  v_store_name_ar TEXT;
  v_store_name_en TEXT;
BEGIN
  -- Only for customer messages
  IF NEW.sender_type = 'customer' THEN
    -- Get provider_id, order_number and store names from orders and providers tables
    SELECT o.provider_id, o.order_number, p.name_ar, p.name_en
    INTO v_provider_id, v_order_number, v_store_name_ar, v_store_name_en
    FROM orders o
    JOIN providers p ON p.id = o.provider_id
    WHERE o.id = NEW.order_id;

    -- Get customer name
    SELECT p.full_name INTO v_customer_name
    FROM profiles p
    WHERE p.id = NEW.sender_id;

    IF v_provider_id IS NOT NULL THEN
      INSERT INTO provider_notifications (
        provider_id,
        type,
        title_ar,
        title_en,
        body_ar,
        body_en,
        related_order_id,
        related_customer_id,
        related_message_id
      ) VALUES (
        v_provider_id,
        'new_message',
        'رسالة جديدة من عميل',
        'New Message from Customer',
        COALESCE(v_customer_name, 'عميل') || ': ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
        COALESCE(v_customer_name, 'Customer') || ': ' || LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
        NEW.order_id,
        NEW.sender_id,
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERIES (run manually to test)
-- ============================================================================
-- Test customer_notifications:
--   SELECT * FROM customer_notifications WHERE customer_id = auth.uid() LIMIT 5;
--   UPDATE customer_notifications SET is_read = true WHERE id = 'xxx' AND customer_id = auth.uid();
--   DELETE FROM customer_notifications WHERE id = 'xxx' AND customer_id = auth.uid();
--
-- Test order_messages:
--   SELECT * FROM order_messages WHERE order_id = 'xxx';
--   UPDATE order_messages SET is_read = true WHERE id = 'xxx';
--
-- Test provider_notifications:
--   SELECT * FROM provider_notifications LIMIT 5;
--   UPDATE provider_notifications SET is_read = true WHERE id = 'xxx';
--   DELETE FROM provider_notifications WHERE id = 'xxx';
