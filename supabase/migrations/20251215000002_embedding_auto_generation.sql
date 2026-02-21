-- Migration: Automatic Embedding Generation for Menu Items
-- This migration adds:
-- 1. Embedding columns to menu_items table
-- 2. Trigger functions for automatic embedding generation
-- 3. pg_cron job for catch-up processing
-- 4. Helper functions for embedding statistics

-- ============================================
-- 1. ADD EMBEDDING COLUMNS TO MENU_ITEMS
-- ============================================

-- Add embedding column (using vector type if pg_vector is available, otherwise jsonb)
DO $$
BEGIN
  -- Try to add as vector type first (if pg_vector extension is enabled)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    ALTER TABLE public.menu_items
      ADD COLUMN IF NOT EXISTS embedding vector(1536);
  ELSE
    -- Fall back to jsonb if pg_vector is not available
    ALTER TABLE public.menu_items
      ADD COLUMN IF NOT EXISTS embedding jsonb;
  END IF;
END
$$;

-- Add metadata columns for embedding
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS embedding_text text,
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp with time zone;

-- Index for finding items without embeddings
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding_null
  ON public.menu_items(id)
  WHERE embedding IS NULL;

-- Index for embedding updated timestamp
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding_updated
  ON public.menu_items(embedding_updated_at);

-- ============================================
-- 2. CREATE EMBEDDING QUEUE TABLE
-- For async processing of embedding requests
-- ============================================

CREATE TABLE IF NOT EXISTS public.embedding_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  priority int DEFAULT 0, -- Higher = more urgent
  error_message text,
  retry_count int DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at timestamp with time zone,
  UNIQUE(menu_item_id, status) -- Prevent duplicate pending entries
);

CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON public.embedding_queue(status);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_priority ON public.embedding_queue(priority DESC, created_at ASC);

-- Enable RLS
ALTER TABLE public.embedding_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access embedding queue
CREATE POLICY "Service role only for embedding_queue"
  ON public.embedding_queue FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================
-- 3. TRIGGER FUNCTION FOR NEW ITEMS
-- Queues embedding generation when new item is created
-- ============================================

CREATE OR REPLACE FUNCTION queue_embedding_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if the item is available
  IF NEW.is_available = true THEN
    INSERT INTO public.embedding_queue (menu_item_id, priority)
    VALUES (NEW.id, 10) -- High priority for new items
    ON CONFLICT (menu_item_id, status) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for inserts
DROP TRIGGER IF EXISTS trigger_queue_embedding_on_insert ON public.menu_items;
CREATE TRIGGER trigger_queue_embedding_on_insert
  AFTER INSERT ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_on_insert();

-- ============================================
-- 4. TRIGGER FUNCTION FOR UPDATED ITEMS
-- Re-queues embedding when relevant fields change
-- ============================================

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

-- Create trigger for updates
DROP TRIGGER IF EXISTS trigger_queue_embedding_on_update ON public.menu_items;
CREATE TRIGGER trigger_queue_embedding_on_update
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_on_update();

-- ============================================
-- 5. FUNCTION TO PROCESS EMBEDDING QUEUE
-- Called by pg_cron or manually
-- ============================================

CREATE OR REPLACE FUNCTION process_embedding_queue(batch_size int DEFAULT 50)
RETURNS TABLE (
  processed int,
  pending int,
  failed int
) AS $$
DECLARE
  v_processed int := 0;
  v_pending int := 0;
  v_failed int := 0;
BEGIN
  -- Count pending items
  SELECT COUNT(*) INTO v_pending
  FROM public.embedding_queue
  WHERE status = 'pending';

  -- Return stats (actual processing is done by Edge Function)
  RETURN QUERY SELECT v_processed, v_pending, v_failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNCTION TO GET EMBEDDING STATISTICS
-- ============================================

CREATE OR REPLACE FUNCTION get_embedding_stats()
RETURNS TABLE (
  total_items bigint,
  items_with_embedding bigint,
  items_without_embedding bigint,
  coverage_percentage numeric,
  pending_in_queue bigint,
  failed_in_queue bigint,
  oldest_without_embedding timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.menu_items WHERE is_available = true)::bigint as total_items,
    (SELECT COUNT(*) FROM public.menu_items WHERE embedding IS NOT NULL AND is_available = true)::bigint as items_with_embedding,
    (SELECT COUNT(*) FROM public.menu_items WHERE embedding IS NULL AND is_available = true)::bigint as items_without_embedding,
    ROUND(
      (SELECT COUNT(*) FROM public.menu_items WHERE embedding IS NOT NULL AND is_available = true)::numeric /
      NULLIF((SELECT COUNT(*) FROM public.menu_items WHERE is_available = true), 0) * 100,
      2
    ) as coverage_percentage,
    (SELECT COUNT(*) FROM public.embedding_queue WHERE status = 'pending')::bigint as pending_in_queue,
    (SELECT COUNT(*) FROM public.embedding_queue WHERE status = 'failed')::bigint as failed_in_queue,
    (SELECT MIN(created_at) FROM public.menu_items WHERE embedding IS NULL AND is_available = true) as oldest_without_embedding;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_embedding_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_embedding_stats() TO anon;

-- ============================================
-- 7. FUNCTION TO BULK QUEUE ITEMS WITHOUT EMBEDDINGS
-- For initial setup or catch-up
-- ============================================

CREATE OR REPLACE FUNCTION queue_missing_embeddings(batch_limit int DEFAULT 1000)
RETURNS int AS $$
DECLARE
  queued_count int;
BEGIN
  WITH items_to_queue AS (
    SELECT id
    FROM public.menu_items
    WHERE embedding IS NULL
      AND is_available = true
    LIMIT batch_limit
  )
  INSERT INTO public.embedding_queue (menu_item_id, priority)
  SELECT id, 1 FROM items_to_queue
  ON CONFLICT (menu_item_id, status) DO NOTHING;

  GET DIAGNOSTICS queued_count = ROW_COUNT;
  RETURN queued_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. PG_CRON JOB FOR AUTOMATIC CATCH-UP
-- Runs every 5 minutes to process queue
-- Note: Requires pg_cron extension to be enabled
-- ============================================

-- Check if pg_cron is available and create job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if any
    PERFORM cron.unschedule('process-embedding-queue');

    -- Schedule new job to run every 5 minutes
    -- This job calls the Edge Function to process the queue
    PERFORM cron.schedule(
      'process-embedding-queue',
      '*/5 * * * *',
      $$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-embedding',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object('mode', 'catchup', 'limit', 50)
      );
      $$
    );

    RAISE NOTICE 'pg_cron job created for embedding queue processing';
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Set up external scheduler or manual processing.';
  END IF;
END
$$;

-- ============================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN public.menu_items.embedding IS 'Vector embedding for semantic search (1536 dimensions from text-embedding-3-small)';
COMMENT ON COLUMN public.menu_items.embedding_text IS 'The text that was used to generate the embedding';
COMMENT ON COLUMN public.menu_items.embedding_updated_at IS 'When the embedding was last updated';
COMMENT ON TABLE public.embedding_queue IS 'Queue for async embedding generation';
COMMENT ON FUNCTION get_embedding_stats() IS 'Returns statistics about embedding coverage';
COMMENT ON FUNCTION queue_missing_embeddings(int) IS 'Queues items without embeddings for processing';
