-- ============================================================================
-- INDEX REMAINING UNINDEXED FOREIGN KEYS
-- ============================================================================
-- Migration: 20260204000005_index_remaining_unindexed_fks.sql
-- Description: Adds indexes for remaining unindexed foreign keys identified by
--              Supabase Performance Advisor (splinter)
--
-- Tables affected:
--   - chat_messages (sender_id)
--   - addresses (user_id)
--   - custom_order_broadcasts (customer_id, delivery_address_id)
--   - custom_order_price_history (request_id, order_id)
--   - admin_users (reports_to) - if column exists
--
-- Note: Uses defensive DO blocks to check table/column existence before creating indexes
-- ============================================================================

-- ============================================================================
-- SECTION 1: chat_messages indexes
-- ============================================================================
-- Note: conversation_id already has idx_chat_messages_conversation index

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
  ) THEN
    -- Index on sender_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'sender_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id) WHERE sender_id IS NOT NULL';
      RAISE NOTICE 'Created index idx_chat_messages_sender on chat_messages';
    END IF;

    ANALYZE public.chat_messages;
  ELSE
    RAISE NOTICE 'Table chat_messages does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: addresses indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'addresses'
  ) THEN
    -- Index on user_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'user_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id)';
      RAISE NOTICE 'Created index idx_addresses_user on addresses';
    END IF;

    ANALYZE public.addresses;
  ELSE
    RAISE NOTICE 'Table addresses does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: custom_order_broadcasts indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'custom_order_broadcasts'
  ) THEN
    -- Index on customer_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_broadcasts' AND column_name = 'customer_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_broadcasts_customer ON public.custom_order_broadcasts(customer_id)';
      RAISE NOTICE 'Created index idx_custom_order_broadcasts_customer';
    END IF;

    -- Index on delivery_address_id for FK lookups (partial - where not null)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_broadcasts' AND column_name = 'delivery_address_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_broadcasts_delivery_address ON public.custom_order_broadcasts(delivery_address_id) WHERE delivery_address_id IS NOT NULL';
      RAISE NOTICE 'Created index idx_custom_order_broadcasts_delivery_address';
    END IF;

    ANALYZE public.custom_order_broadcasts;
  ELSE
    RAISE NOTICE 'Table custom_order_broadcasts does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- SECTION 4: custom_order_price_history indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'custom_order_price_history'
  ) THEN
    -- Index on request_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_price_history' AND column_name = 'request_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_price_history_request ON public.custom_order_price_history(request_id)';
      RAISE NOTICE 'Created index idx_custom_order_price_history_request';
    END IF;

    -- Index on order_id for FK lookups (partial - where not null)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_price_history' AND column_name = 'order_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_price_history_order ON public.custom_order_price_history(order_id) WHERE order_id IS NOT NULL';
      RAISE NOTICE 'Created index idx_custom_order_price_history_order';
    END IF;

    ANALYZE public.custom_order_price_history;
  ELSE
    RAISE NOTICE 'Table custom_order_price_history does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- SECTION 5: admin_users.reports_to index (Schema drift - exists in prod only)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_users'
  ) THEN
    -- Check if reports_to column exists (may have been added directly in production)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'reports_to'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_users_reports_to ON public.admin_users(reports_to) WHERE reports_to IS NOT NULL';
      RAISE NOTICE 'Created index idx_admin_users_reports_to';
    ELSE
      -- Column doesn't exist, add it with FK constraint
      EXECUTE 'ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES public.admin_users(id) ON DELETE SET NULL';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_admin_users_reports_to ON public.admin_users(reports_to) WHERE reports_to IS NOT NULL';
      RAISE NOTICE 'Added reports_to column and index to admin_users';
    END IF;

    ANALYZE public.admin_users;
  ELSE
    RAISE NOTICE 'Table admin_users does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- SECTION 6: custom_order_requests indexes (additional FKs from custom_order_system)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'custom_order_requests'
  ) THEN
    -- Index on broadcast_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_requests' AND column_name = 'broadcast_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_requests_broadcast ON public.custom_order_requests(broadcast_id) WHERE broadcast_id IS NOT NULL';
      RAISE NOTICE 'Created index idx_custom_order_requests_broadcast';
    END IF;

    -- Index on provider_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_requests' AND column_name = 'provider_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_requests_provider ON public.custom_order_requests(provider_id)';
      RAISE NOTICE 'Created index idx_custom_order_requests_provider';
    END IF;

    -- Index on order_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_requests' AND column_name = 'order_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_requests_order ON public.custom_order_requests(order_id) WHERE order_id IS NOT NULL';
      RAISE NOTICE 'Created index idx_custom_order_requests_order';
    END IF;

    ANALYZE public.custom_order_requests;
  ELSE
    RAISE NOTICE 'Table custom_order_requests does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- SECTION 7: custom_order_items indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'custom_order_items'
  ) THEN
    -- Index on request_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_items' AND column_name = 'request_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_items_request ON public.custom_order_items(request_id)';
      RAISE NOTICE 'Created index idx_custom_order_items_request';
    END IF;

    -- Index on order_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_items' AND column_name = 'order_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_items_order ON public.custom_order_items(order_id) WHERE order_id IS NOT NULL';
      RAISE NOTICE 'Created index idx_custom_order_items_order';
    END IF;

    ANALYZE public.custom_order_items;
  ELSE
    RAISE NOTICE 'Table custom_order_items does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- SECTION 8: custom_order_conversations indexes
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'custom_order_conversations'
  ) THEN
    -- Index on provider_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_conversations' AND column_name = 'provider_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_conversations_provider ON public.custom_order_conversations(provider_id)';
      RAISE NOTICE 'Created index idx_custom_order_conversations_provider';
    END IF;

    -- Index on customer_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_conversations' AND column_name = 'customer_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_conversations_customer ON public.custom_order_conversations(customer_id)';
      RAISE NOTICE 'Created index idx_custom_order_conversations_customer';
    END IF;

    -- Index on order_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_conversations' AND column_name = 'order_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_conversations_order ON public.custom_order_conversations(order_id) WHERE order_id IS NOT NULL';
      RAISE NOTICE 'Created index idx_custom_order_conversations_order';
    END IF;

    -- Index on request_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_conversations' AND column_name = 'request_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_conversations_request ON public.custom_order_conversations(request_id) WHERE request_id IS NOT NULL';
      RAISE NOTICE 'Created index idx_custom_order_conversations_request';
    END IF;

    -- Index on custom_item_id for FK lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'custom_order_conversations' AND column_name = 'custom_item_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_custom_order_conversations_custom_item ON public.custom_order_conversations(custom_item_id) WHERE custom_item_id IS NOT NULL';
      RAISE NOTICE 'Created index idx_custom_order_conversations_custom_item';
    END IF;

    ANALYZE public.custom_order_conversations;
  ELSE
    RAISE NOTICE 'Table custom_order_conversations does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
--   - chat_messages: sender_id index
--   - addresses: user_id index
--   - custom_order_broadcasts: customer_id, delivery_address_id indexes
--   - custom_order_price_history: request_id, order_id indexes
--   - admin_users: reports_to column + index (handles schema drift)
--   - custom_order_requests: broadcast_id, provider_id, order_id indexes
--   - custom_order_items: request_id, order_id indexes
--   - custom_order_conversations: provider_id, customer_id, order_id, request_id, custom_item_id indexes
--
-- Total new indexes: Up to 17 (depending on table/column existence)
-- ============================================================================
