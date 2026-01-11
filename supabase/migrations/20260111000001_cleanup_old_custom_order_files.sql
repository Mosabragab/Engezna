-- ============================================================================
-- Cleanup Old Custom Order Files - نظام حذف ملفات الطلبات الخاصة القديمة
-- ============================================================================
--
-- This migration adds:
-- 1. Function to clean up old files (voice, images) from custom orders
-- 2. Scheduled job to run weekly (if pg_cron is available)
--
-- Files are cleaned up after:
-- - Broadcast is completed/cancelled/expired AND older than 7 days
-- - OR broadcast is older than 30 days regardless of status
--
-- @version 1.0
-- @date January 2026
-- ============================================================================

-- ============================================================================
-- 1. Function to mark old broadcasts for cleanup
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_broadcasts_for_cleanup()
RETURNS TABLE (
  broadcast_id UUID,
  voice_url TEXT,
  image_urls TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.voice_url,
    b.image_urls
  FROM custom_order_broadcasts b
  WHERE
    -- Completed/cancelled/expired broadcasts older than 7 days
    (
      b.status IN ('completed', 'cancelled', 'expired')
      AND b.updated_at < NOW() - INTERVAL '7 days'
    )
    -- OR any broadcast older than 30 days
    OR b.created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Function to clear file URLs after cleanup (called after storage deletion)
-- ============================================================================
CREATE OR REPLACE FUNCTION clear_broadcast_file_urls(p_broadcast_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE custom_order_broadcasts
  SET
    voice_url = NULL,
    image_urls = NULL,
    updated_at = NOW()
  WHERE id = p_broadcast_id;

  -- Also clear from related requests
  UPDATE custom_order_requests
  SET
    voice_url = NULL,
    image_urls = NULL,
    updated_at = NOW()
  WHERE broadcast_id = p_broadcast_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Table to track cleanup jobs (for monitoring)
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_order_cleanup_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  broadcasts_processed INT DEFAULT 0,
  voice_files_deleted INT DEFAULT 0,
  image_files_deleted INT DEFAULT 0,
  storage_freed_mb DECIMAL(10,2) DEFAULT 0,
  errors TEXT[],
  status TEXT DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed'))
);

-- ============================================================================
-- 4. Function to log cleanup results
-- ============================================================================
CREATE OR REPLACE FUNCTION log_cleanup_result(
  p_broadcasts INT,
  p_voice_files INT,
  p_image_files INT,
  p_storage_mb DECIMAL,
  p_errors TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO custom_order_cleanup_log (
    broadcasts_processed,
    voice_files_deleted,
    image_files_deleted,
    storage_freed_mb,
    errors,
    status
  ) VALUES (
    p_broadcasts,
    p_voice_files,
    p_image_files,
    p_storage_mb,
    p_errors,
    CASE WHEN p_errors IS NOT NULL AND array_length(p_errors, 1) > 0 THEN 'failed' ELSE 'completed' END
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION mark_broadcasts_for_cleanup() TO service_role;
GRANT EXECUTE ON FUNCTION clear_broadcast_file_urls(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION log_cleanup_result(INT, INT, INT, DECIMAL, TEXT[]) TO service_role;

-- ============================================================================
-- 6. Schedule weekly cleanup (if pg_cron is available)
-- ============================================================================
-- Note: Uncomment if pg_cron extension is enabled
-- The actual file deletion is handled by Edge Function that reads from mark_broadcasts_for_cleanup()
--
-- SELECT cron.schedule(
--   'cleanup-custom-order-files',
--   '0 3 * * 0',  -- Every Sunday at 3 AM
--   $$SELECT mark_broadcasts_for_cleanup()$$
-- );

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON FUNCTION mark_broadcasts_for_cleanup() IS
'Returns broadcasts that need file cleanup. Called by Edge Function weekly.
Criteria:
- Completed/cancelled/expired broadcasts older than 7 days
- Any broadcast older than 30 days';

COMMENT ON FUNCTION clear_broadcast_file_urls(UUID) IS
'Clears file URLs from broadcast and related requests after storage deletion.
Called by Edge Function after successfully deleting files.';

COMMENT ON TABLE custom_order_cleanup_log IS
'Tracks cleanup job executions for monitoring and debugging.
Each row represents one cleanup run with statistics.';
