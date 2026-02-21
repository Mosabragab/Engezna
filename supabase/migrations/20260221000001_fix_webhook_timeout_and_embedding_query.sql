-- ============================================================================
-- Migration: Fix webhook timeout + verify FK for embeddings
-- Date: 2026-02-21
--
-- Fixes two issues:
-- 1. call_notification_webhook: pg_net default timeout is 5s, which is too
--    short for Edge Function cold start + FCM call chain. Increase to 30s.
-- 2. Verify menu_items.category_id FK to provider_categories exists (needed
--    for generate-embedding Edge Function PostgREST query).
-- ============================================================================

-- ============================================================================
-- Fix 1: Increase webhook timeout from 5s (default) to 30s
-- The notification chain: trigger → call_notification_webhook → HTTP POST
-- → handle-notification-trigger → send-notification → FCM API
-- This can take >5s especially on cold starts.
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
  -- timeout_milliseconds increased from default 5000ms to 30000ms (30s)
  -- to handle cold starts + FCM call chain
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := v_payload::text,
    timeout_milliseconds := 30000
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error with full context but never fail the transaction
    RAISE WARNING '[Notification Webhook] Failed for table=% event=% record_id=%: %',
      p_table_name, p_event_type, p_record->>'id', SQLERRM;
END;
$$;

-- ============================================================================
-- Fix 2: Ensure FK from menu_items.category_id → provider_categories.id
-- This is required for the generate-embedding Edge Function's PostgREST
-- query: provider_categories!category_id(name_ar)
-- ============================================================================
DO $$
BEGIN
  -- Check if the FK already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'menu_items_category_id_fkey'
    AND table_name = 'menu_items'
  ) THEN
    -- Drop any old FK on category_id first
    ALTER TABLE public.menu_items
      DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

    -- Create the correct FK to provider_categories
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_category_id_fkey
      FOREIGN KEY (category_id)
      REFERENCES public.provider_categories(id)
      ON DELETE SET NULL;

    RAISE NOTICE 'Created FK: menu_items.category_id → provider_categories.id';
  ELSE
    RAISE NOTICE 'FK menu_items_category_id_fkey already exists';
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.call_notification_webhook TO service_role;
