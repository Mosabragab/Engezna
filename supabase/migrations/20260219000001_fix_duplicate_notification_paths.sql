-- ============================================================================
-- Fix: Remove Duplicate Notification Push Paths
-- Engezna - إنجزنا
-- Date: 2026-02-19
-- ============================================================================
--
-- PROBLEM:
-- The notification system had TWO parallel paths that both sent FCM push
-- notifications, causing users to receive DUPLICATE push notifications
-- for every event (order status change, new message, new review, etc.)
--
-- Path A (Direct Webhooks - BEING REMOVED):
--   orders/chat_messages/reviews INSERT/UPDATE
--     → trigger_new_order_notification() / trigger_order_status_notification() / etc.
--     → call_notification_webhook('orders', ...)
--     → handle-notification-trigger Edge Function
--     → send-notification → FCM → Device
--
-- Path B (FCM Sync via Notification Tables - KEEPING):
--   orders UPDATE
--     → notify_customer_order_status() → INSERT customer_notifications
--     → trigger_notification_fcm_sync()
--     → call_notification_webhook('customer_notifications', ...)
--     → handle-notification-trigger → send-notification → FCM → Device
--
-- SOLUTION:
-- Remove Path A triggers (direct webhooks on source tables) and keep
-- only Path B (FCM sync from notification tables). This ensures:
-- 1. Single Source of Truth: every push has a DB notification record
-- 2. No duplicate push notifications
-- 3. Easier auditing and debugging
--
-- RETAINED TRIGGERS (Path B - these stay):
-- - trigger_notification_fcm_sync on customer_notifications (AFTER INSERT)
-- - trigger_notification_fcm_sync on provider_notifications (AFTER INSERT)
-- - notify_customer_order_status on orders (creates DB record only)
-- - notify_provider_new_order on orders (creates DB record only)
-- - notify_customer_new_message on order_messages (creates DB record only)
-- - notify_provider_new_message on order_messages (creates DB record only)
-- - notify_custom_order_* triggers (create DB records only)
-- ============================================================================

-- ============================================================================
-- Step 1: Drop Path A triggers (direct webhook calls on source tables)
-- These caused the DUPLICATE push notifications
-- ============================================================================

-- Drop: New order → direct webhook (from 20251229000002_notification_webhooks.sql)
DROP TRIGGER IF EXISTS on_new_order_notification ON public.orders;

-- Drop: Order status change → direct webhook (from 20251229000002_notification_webhooks.sql)
DROP TRIGGER IF EXISTS on_order_status_change_notification ON public.orders;

-- Drop: New chat message → direct webhook (from 20251229000002_notification_webhooks.sql)
DROP TRIGGER IF EXISTS on_new_message_notification ON public.chat_messages;

-- Drop: New review → direct webhook (from 20251229000002_notification_webhooks.sql)
DROP TRIGGER IF EXISTS on_new_review_notification ON public.reviews;

-- ============================================================================
-- Step 2: Drop the now-unused Path A trigger functions
-- (The call_notification_webhook helper is still used by Path B, so keep it)
-- ============================================================================

DROP FUNCTION IF EXISTS public.trigger_new_order_notification() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_order_status_notification() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_new_message_notification() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_new_review_notification() CASCADE;

-- ============================================================================
-- Step 3: Verify Path B triggers exist and are correct
-- These are the ONLY triggers that should call FCM webhooks
-- ============================================================================

-- Ensure FCM sync trigger function exists with improved error handling
CREATE OR REPLACE FUNCTION public.trigger_notification_fcm_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger on INSERT (new notifications)
  IF TG_OP = 'INSERT' THEN
    PERFORM public.call_notification_webhook(
      TG_TABLE_NAME,
      'INSERT',
      to_jsonb(NEW),
      NULL
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but never fail the original transaction
    RAISE WARNING '[FCM Sync] Failed for table=% id=%: %',
      TG_TABLE_NAME, NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate FCM sync triggers (idempotent)
DROP TRIGGER IF EXISTS on_customer_notification_fcm_sync ON public.customer_notifications;
CREATE TRIGGER on_customer_notification_fcm_sync
  AFTER INSERT ON public.customer_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_fcm_sync();

DROP TRIGGER IF EXISTS on_provider_notification_fcm_sync ON public.provider_notifications;
CREATE TRIGGER on_provider_notification_fcm_sync
  AFTER INSERT ON public.provider_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_fcm_sync();

-- Also ensure admin notifications get FCM sync
DROP TRIGGER IF EXISTS on_admin_notification_fcm_sync ON public.admin_notifications;
CREATE TRIGGER on_admin_notification_fcm_sync
  AFTER INSERT ON public.admin_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_fcm_sync();

-- ============================================================================
-- Step 4: Ensure call_notification_webhook has robust error handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.call_notification_webhook(
  p_table_name text,
  p_event_type text,
  p_record jsonb,
  p_old_record jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text := 'https://cmxpvzqrmptfnuymhxmr.supabase.co/functions/v1/handle-notification-trigger';
  v_service_key text;
  v_payload jsonb;
BEGIN
  -- Get service role key from Supabase's built-in setting
  v_service_key := current_setting('supabase.service_role_key', true);

  -- If the setting is not available, log and skip
  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING '[Notification Webhook] service_role_key not available, skipping FCM push for table=% event=% record_id=%',
      p_table_name, p_event_type, p_record->>'id';
    RETURN;
  END IF;

  v_payload := jsonb_build_object(
    'type', p_event_type,
    'table', p_table_name,
    'record', p_record,
    'old_record', p_old_record,
    'schema', 'public'
  );

  -- Make async HTTP request to Edge Function
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := v_payload::text
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error with full context but never fail the transaction
    RAISE WARNING '[Notification Webhook] Failed for table=% event=% record_id=%: %',
      p_table_name, p_event_type, p_record->>'id', SQLERRM;
END;
$$;

-- ============================================================================
-- Step 5: Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.trigger_notification_fcm_sync TO service_role;
GRANT EXECUTE ON FUNCTION public.call_notification_webhook TO service_role;

-- ============================================================================
-- Verification: After applying this migration, run the following to verify
-- only the correct triggers remain:
--
-- SELECT trigger_name, event_object_table, action_timing, event_manipulation
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND trigger_name LIKE '%notification%'
-- ORDER BY event_object_table, trigger_name;
--
-- Expected results:
-- - on_customer_notification_fcm_sync | customer_notifications | AFTER | INSERT
-- - on_provider_notification_fcm_sync | provider_notifications | AFTER | INSERT
-- - on_admin_notification_fcm_sync    | admin_notifications    | AFTER | INSERT
-- - trigger_notify_customer_order_status | orders | AFTER | UPDATE  (DB record only)
-- - trigger_notify_provider_new_order    | orders | AFTER | INSERT  (DB record only)
-- - trigger_notify_customer_new_message  | order_messages | AFTER | INSERT (DB record only)
-- - trigger_notify_provider_new_message  | order_messages | AFTER | INSERT (DB record only)
--
-- The following should NO LONGER exist:
-- ✗ on_new_order_notification
-- ✗ on_order_status_change_notification
-- ✗ on_new_message_notification
-- ✗ on_new_review_notification
-- ============================================================================
