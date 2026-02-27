-- ═══════════════════════════════════════════════════════════════════════════
-- Fix Realtime Publication: Add missing tables subscribed to in the codebase
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Currently published (3): customer_notifications, order_messages, provider_notifications
-- Subscribed in code but NOT published (4): orders, custom_order_requests,
--   custom_order_broadcasts, ticket_messages
--
-- Without publication, Realtime subscriptions fail silently — no events received.
-- This migration adds the 4 missing tables so subscriptions actually work.
--
-- Total after migration: 7 tables (only those with active subscriptions)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. orders — 9 subscriptions (provider orders, customer order details, provider layout)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;

-- 2. custom_order_requests — 9 subscriptions (custom order pages, provider layout)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'custom_order_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE custom_order_requests;
  END IF;
END $$;

-- 3. custom_order_broadcasts — 3 subscriptions (broadcast review, realtime hook)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'custom_order_broadcasts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE custom_order_broadcasts;
  END IF;
END $$;

-- 4. ticket_messages — 2 subscriptions (admin support chat, customer support chat)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
  END IF;
END $$;
