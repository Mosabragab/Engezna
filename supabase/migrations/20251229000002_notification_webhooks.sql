-- ============================================================================
-- Database Webhooks for Push Notifications
-- Engezna - إنجزنا
-- ============================================================================
-- This script creates database triggers that call the handle-notification-trigger
-- Edge Function when specific events occur.
-- ============================================================================

-- Enable the pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- Configuration
-- ============================================================================
-- Store the Edge Function URL and Service Role Key as database settings
-- IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY with your actual service role key

DO $$
BEGIN
  -- Set the Edge Function URL
  PERFORM set_config('app.edge_function_url',
    'https://cmxpvzqrmptfnuymhxmr.supabase.co/functions/v1/handle-notification-trigger',
    false);
END $$;

-- ============================================================================
-- Helper Function: Call Edge Function
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
  -- Get the service role key from vault or environment
  -- For security, we'll use the SUPABASE_SERVICE_ROLE_KEY from Edge Function secrets
  -- The webhook will authenticate using the anon key, and the Edge Function
  -- will use the service role internally

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
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := v_payload::text
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to call notification webhook: %', SQLERRM;
END;
$$;

-- ============================================================================
-- Trigger Function: New Order
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_new_order_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger on INSERT
  IF TG_OP = 'INSERT' THEN
    PERFORM public.call_notification_webhook(
      'orders',
      'INSERT',
      to_jsonb(NEW),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Trigger Function: Order Status Update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_order_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger when status actually changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.call_notification_webhook(
      'orders',
      'UPDATE',
      to_jsonb(NEW),
      to_jsonb(OLD)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Trigger Function: New Chat Message
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_new_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger on INSERT
  IF TG_OP = 'INSERT' THEN
    PERFORM public.call_notification_webhook(
      'chat_messages',
      'INSERT',
      to_jsonb(NEW),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Trigger Function: New Review
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trigger_new_review_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger on INSERT
  IF TG_OP = 'INSERT' THEN
    PERFORM public.call_notification_webhook(
      'reviews',
      'INSERT',
      to_jsonb(NEW),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Drop existing triggers (if any)
-- ============================================================================
DROP TRIGGER IF EXISTS on_new_order_notification ON public.orders;
DROP TRIGGER IF EXISTS on_order_status_change_notification ON public.orders;
DROP TRIGGER IF EXISTS on_new_message_notification ON public.chat_messages;
DROP TRIGGER IF EXISTS on_new_review_notification ON public.reviews;

-- ============================================================================
-- Create Triggers
-- ============================================================================

-- Trigger: New Order → Notify Provider
CREATE TRIGGER on_new_order_notification
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_new_order_notification();

-- Trigger: Order Status Change → Notify Customer
CREATE TRIGGER on_order_status_change_notification
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trigger_order_status_notification();

-- Trigger: New Chat Message → Notify Recipient
CREATE TRIGGER on_new_message_notification
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_new_message_notification();

-- Trigger: New Review → Notify Provider
CREATE TRIGGER on_new_review_notification
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_new_review_notification();

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.call_notification_webhook TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_new_order_notification TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_order_status_notification TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_new_message_notification TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_new_review_notification TO service_role;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify triggers were created successfully:
--
-- SELECT
--   trigger_name,
--   event_manipulation,
--   event_object_table,
--   action_timing
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND trigger_name LIKE '%notification%';
-- ============================================================================
