-- ============================================================================
-- Fix: Notification Webhooks + FCM Push Sync
-- Engezna - إنجزنا
-- ============================================================================
--
-- Problems Fixed:
-- 1. customer_notifications INSERT had no webhook trigger, so FCM push was
--    never sent for order status changes (even though the in-app notification
--    was created correctly by notify_customer_order_status trigger).
-- 2. provider_notifications INSERT had no webhook trigger for FCM push sync.
-- 3. The old webhook function silently swallowed errors without logging.
--
-- Architecture:
-- Order Status Change → notify_customer_order_status() → INSERT customer_notifications
--    → trigger_notification_fcm_sync() → Edge Function → send-notification → FCM → Device
--
-- This ensures that EVERY notification record created (by any trigger) also
-- gets delivered as a push notification via FCM.
-- ============================================================================

-- ============================================================================
-- Improved webhook function with better error handling
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

  -- If the setting is not available, skip silently
  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING '[Notification Webhook] service_role_key not available, skipping push notification for table=%', p_table_name;
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
    -- Log error with details but don't fail the transaction
    RAISE WARNING '[Notification Webhook] Failed to call webhook for table=% event=%: %',
      p_table_name, p_event_type, SQLERRM;
END;
$$;

-- ============================================================================
-- NEW: Trigger function for customer_notifications → FCM push sync
-- When a notification record is created in customer_notifications (by any trigger),
-- this fires the webhook to send it as a push notification via FCM.
-- ============================================================================
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
END;
$$;

-- ============================================================================
-- Drop existing sync triggers (if any)
-- ============================================================================
DROP TRIGGER IF EXISTS on_customer_notification_fcm_sync ON public.customer_notifications;
DROP TRIGGER IF EXISTS on_provider_notification_fcm_sync ON public.provider_notifications;

-- ============================================================================
-- Create FCM sync triggers on notification tables
-- ============================================================================

-- When a customer notification is created → send FCM push
CREATE TRIGGER on_customer_notification_fcm_sync
  AFTER INSERT ON public.customer_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_fcm_sync();

-- When a provider notification is created → send FCM push
CREATE TRIGGER on_provider_notification_fcm_sync
  AFTER INSERT ON public.provider_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_fcm_sync();

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.trigger_notification_fcm_sync TO service_role;
