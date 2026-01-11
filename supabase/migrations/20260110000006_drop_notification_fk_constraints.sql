-- ============================================================================
-- Drop Foreign Key Constraints for Flexible Notification System
-- فك قيود المفاتيح الأجنبية لنظام إشعارات مرن
--
-- This allows us to use existing columns for multiple purposes:
-- - related_message_id can store request_id for custom orders
-- - related_order_id can store request_id temporarily in customer_notifications
--
-- @version 1.0
-- @date January 2026
-- ============================================================================

-- ============================================================================
-- 1. Drop Foreign Key on provider_notifications.related_message_id
-- ============================================================================
ALTER TABLE provider_notifications
DROP CONSTRAINT IF EXISTS provider_notifications_related_message_id_fkey;

-- ============================================================================
-- 2. Drop Foreign Key on customer_notifications.related_order_id (if exists)
-- This allows us to store request_id temporarily before order is created
-- ============================================================================
ALTER TABLE customer_notifications
DROP CONSTRAINT IF EXISTS customer_notifications_related_order_id_fkey;

-- ============================================================================
-- 3. Also check for other potential constraints on these columns
-- ============================================================================

-- Drop any other FK constraints that might exist with different names
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Find and drop all FK constraints on related_message_id in provider_notifications
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'provider_notifications'::regclass
    AND contype = 'f'
    AND conname LIKE '%related_message_id%'
  ) LOOP
    EXECUTE 'ALTER TABLE provider_notifications DROP CONSTRAINT IF EXISTS ' || r.conname;
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;

  -- Find and drop all FK constraints on related_order_id in customer_notifications
  FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'customer_notifications'::regclass
    AND contype = 'f'
    AND conname LIKE '%related_order_id%'
  ) LOOP
    EXECUTE 'ALTER TABLE customer_notifications DROP CONSTRAINT IF EXISTS ' || r.conname;
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;
END $$;

-- ============================================================================
-- 4. Add comments to document the flexible usage
-- ============================================================================
COMMENT ON COLUMN provider_notifications.related_message_id IS
  'Flexible UUID field: stores message_id for chat notifications OR request_id for custom order notifications';

COMMENT ON COLUMN customer_notifications.related_order_id IS
  'Flexible UUID field: stores order_id for standard orders OR request_id for custom orders (before order creation)';

-- ============================================================================
-- Done! Columns remain UUID type but without FK constraints
-- ============================================================================
