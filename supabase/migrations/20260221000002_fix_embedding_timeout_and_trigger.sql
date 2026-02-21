-- ============================================================================
-- Migration: Fix embedding cron timeout + update trigger column name
-- Date: 2026-02-21
--
-- Fixes two issues:
-- 1. process_missing_embeddings(): pg_net default timeout is 5s, too short
--    for embedding generation (50 items). Increase to 30s.
-- 2. queue_embedding_on_update() trigger: references provider_category_id
--    but the actual column is category_id.
-- ============================================================================

-- ============================================================================
-- Fix 1: Update process_missing_embeddings() with proper timeout
-- The function is called by pg_cron every 5 minutes.
-- When new menu items are added without embeddings, the Edge Function needs
-- time to generate embeddings for up to 50 items.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_missing_embeddings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  edge_function_url text;
  v_service_key text;
  items_count int;
  request_id bigint;
BEGIN
  -- Count items that need embeddings
  SELECT COUNT(*) INTO items_count
  FROM menu_items
  WHERE embedding IS NULL AND is_available = true;

  IF items_count = 0 THEN
    RAISE NOTICE 'No items need embedding generation';
    RETURN;
  END IF;

  RAISE NOTICE 'Processing % items for embeddings', items_count;

  -- Build URL from Supabase settings
  edge_function_url := current_setting('supabase_url', true) || '/functions/v1/generate-embedding';
  IF edge_function_url IS NULL OR edge_function_url = '' THEN
    -- Fallback: try app.settings variant
    edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-embedding';
  END IF;

  -- Get service role key
  v_service_key := current_setting('supabase.service_role_key', true);

  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING '[Embedding] service_role_key not available, skipping';
    RETURN;
  END IF;

  -- Queue HTTP request with 30s timeout (default was 5s, too short for batch processing)
  SELECT net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('mode', 'catchup', 'limit', 50),
    timeout_milliseconds := 30000
  ) INTO request_id;

  RAISE NOTICE 'HTTP request queued with ID: %', request_id;
END;
$function$;

-- ============================================================================
-- Fix 2: Fix queue_embedding_on_update() trigger
-- The trigger referenced provider_category_id but the actual column is
-- category_id. This caused the trigger to fail silently on item updates.
-- ============================================================================
CREATE OR REPLACE FUNCTION queue_embedding_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if relevant fields changed
  IF (
    OLD.name_ar IS DISTINCT FROM NEW.name_ar OR
    OLD.name_en IS DISTINCT FROM NEW.name_en OR
    OLD.description_ar IS DISTINCT FROM NEW.description_ar OR
    OLD.description_en IS DISTINCT FROM NEW.description_en OR
    OLD.price IS DISTINCT FROM NEW.price OR
    OLD.category_id IS DISTINCT FROM NEW.category_id
  ) THEN
    -- Clear old embedding since content changed
    NEW.embedding := NULL;
    NEW.embedding_text := NULL;
    NEW.embedding_updated_at := NULL;

    -- Queue for re-generation
    IF NEW.is_available = true THEN
      -- Delete any existing pending entry first
      DELETE FROM public.embedding_queue
      WHERE menu_item_id = NEW.id AND status = 'pending';

      INSERT INTO public.embedding_queue (menu_item_id, priority)
      VALUES (NEW.id, 5) -- Medium priority for updates
      ON CONFLICT (menu_item_id, status) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
