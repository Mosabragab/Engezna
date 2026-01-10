-- ============================================================================
-- Migration: Add data column to notification tables
-- إضافة عمود البيانات لجداول الإشعارات
-- ============================================================================
-- Date: 2026-01-10
-- Description:
--   Adds JSONB 'data' column to customer_notifications and provider_notifications
--   This column is needed by custom order notification triggers to store
--   broadcast_id, request_id, provider_id, and total information.
-- ============================================================================

-- ============================================================================
-- ADD DATA COLUMN TO CUSTOMER_NOTIFICATIONS
-- إضافة عمود data لإشعارات العملاء
-- ============================================================================

ALTER TABLE customer_notifications
ADD COLUMN IF NOT EXISTS data JSONB;

COMMENT ON COLUMN customer_notifications.data IS 'JSON data for custom notifications (broadcast_id, request_id, etc.)';

-- ============================================================================
-- ADD DATA COLUMN TO PROVIDER_NOTIFICATIONS
-- إضافة عمود data لإشعارات التجار
-- ============================================================================

ALTER TABLE provider_notifications
ADD COLUMN IF NOT EXISTS data JSONB;

COMMENT ON COLUMN provider_notifications.data IS 'JSON data for custom notifications (request_id, order_id, etc.)';

-- ============================================================================
-- VERIFY TRIGGERS ARE WORKING
-- التحقق من عمل الـ Triggers
-- ============================================================================

-- Re-create the notification functions to ensure they work with the new column
-- The functions already exist from migration 20260110000001, this just ensures
-- they can now successfully insert into the data column

-- Grant usage
GRANT SELECT, INSERT, UPDATE ON customer_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON provider_notifications TO authenticated;
