-- Migration: Fix embedding_queue table creation
-- This is a simplified version that works without pg_cron/net extensions

-- ============================================
-- 1. CREATE EMBEDDING QUEUE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.embedding_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'pending',
  priority int DEFAULT 0,
  error_message text,
  retry_count int DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  processed_at timestamp with time zone
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON public.embedding_queue(status);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_priority ON public.embedding_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_menu_item ON public.embedding_queue(menu_item_id);

-- Enable RLS
ALTER TABLE public.embedding_queue ENABLE ROW LEVEL SECURITY;

-- Service role policy (allow all for service role)
DROP POLICY IF EXISTS "Service role full access" ON public.embedding_queue;
CREATE POLICY "Service role full access"
  ON public.embedding_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. RECREATE TRIGGER FUNCTIONS (SAFER VERSION)
-- These won't fail if embedding_queue doesn't exist
-- ============================================

CREATE OR REPLACE FUNCTION queue_embedding_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if the item is available and table exists
  IF NEW.is_available = true THEN
    BEGIN
      INSERT INTO public.embedding_queue (menu_item_id, priority)
      VALUES (NEW.id, 10)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN undefined_table THEN
      -- Table doesn't exist, skip silently
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION queue_embedding_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if relevant fields changed
  IF (
    OLD.name_ar IS DISTINCT FROM NEW.name_ar OR
    OLD.name_en IS DISTINCT FROM NEW.name_en OR
    OLD.description_ar IS DISTINCT FROM NEW.description_ar OR
    OLD.description_en IS DISTINCT FROM NEW.description_en OR
    OLD.price IS DISTINCT FROM NEW.price
  ) THEN
    -- Clear old embedding since content changed
    NEW.embedding := NULL;
    NEW.embedding_text := NULL;
    NEW.embedding_updated_at := NULL;

    -- Queue for re-generation (with error handling)
    IF NEW.is_available = true THEN
      BEGIN
        DELETE FROM public.embedding_queue
        WHERE menu_item_id = NEW.id AND status = 'pending';

        INSERT INTO public.embedding_queue (menu_item_id, priority)
        VALUES (NEW.id, 5)
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, skip silently
        NULL;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. RECREATE TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trigger_queue_embedding_on_insert ON public.menu_items;
CREATE TRIGGER trigger_queue_embedding_on_insert
  AFTER INSERT ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_on_insert();

DROP TRIGGER IF EXISTS trigger_queue_embedding_on_update ON public.menu_items;
CREATE TRIGGER trigger_queue_embedding_on_update
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_on_update();

-- ============================================
-- 4. ADD EMBEDDING COLUMNS IF NOT EXISTS
-- ============================================

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS embedding jsonb,
  ADD COLUMN IF NOT EXISTS embedding_text text,
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamp with time zone;

-- ============================================
-- 5. HELPER FUNCTION FOR STATS (optional)
-- ============================================

CREATE OR REPLACE FUNCTION get_embedding_stats()
RETURNS TABLE (
  total_items bigint,
  items_with_embedding bigint,
  items_without_embedding bigint,
  pending_in_queue bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.menu_items WHERE is_available = true)::bigint,
    (SELECT COUNT(*) FROM public.menu_items WHERE embedding IS NOT NULL AND is_available = true)::bigint,
    (SELECT COUNT(*) FROM public.menu_items WHERE embedding IS NULL AND is_available = true)::bigint,
    (SELECT COUNT(*) FROM public.embedding_queue WHERE status = 'pending')::bigint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_embedding_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_embedding_stats() TO anon;
