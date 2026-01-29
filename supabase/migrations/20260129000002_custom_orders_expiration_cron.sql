-- ============================================================================
-- Custom Orders Expiration Cron Job (pg_cron)
-- انتهاء صلاحية الطلبات المسعرة تلقائياً
--
-- This migration sets up automatic expiration for priced custom orders
-- that customers haven't responded to within the allowed time.
--
-- @version 1.0
-- @date January 2026
-- ============================================================================

-- ============================================================================
-- 1. Enable pg_cron extension (if not already enabled)
-- ============================================================================

-- Note: pg_cron must be enabled by Supabase support for hosted projects
-- For local development, this will work if pg_cron is installed
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 2. Create function to expire priced custom orders
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_priced_custom_orders()
RETURNS JSONB AS $$
DECLARE
  v_expired_count INT := 0;
  v_request RECORD;
  v_result JSONB;
BEGIN
  -- Loop through priced requests that have expired
  -- Uses pricing_expires_at (set by provider based on customer_approval_timeout_hours)
  -- Falls back to 24 hours from priced_at if pricing_expires_at is not set
  FOR v_request IN
    SELECT
      r.id,
      r.provider_id,
      r.broadcast_id,
      r.order_id,
      b.customer_id
    FROM custom_order_requests r
    JOIN custom_order_broadcasts b ON b.id = r.broadcast_id
    WHERE r.status = 'priced'
    AND (
      -- Either pricing_expires_at is set and has passed
      (r.pricing_expires_at IS NOT NULL AND r.pricing_expires_at < NOW())
      OR
      -- Or fallback: 24 hours from priced_at
      (r.pricing_expires_at IS NULL AND r.priced_at IS NOT NULL AND r.priced_at < NOW() - INTERVAL '24 hours')
    )
  LOOP
    -- Update request to expired
    UPDATE custom_order_requests
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE id = v_request.id;

    -- Cancel the associated order if exists
    IF v_request.order_id IS NOT NULL THEN
      UPDATE orders
      SET
        status = 'cancelled',
        pricing_status = 'pricing_expired',
        cancellation_reason = 'انتهت مهلة موافقة العميل على التسعير - Customer approval deadline expired',
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = v_request.order_id
      AND status NOT IN ('cancelled', 'delivered', 'completed');
    END IF;

    -- Notify customer that their order expired
    INSERT INTO customer_notifications (
      customer_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      data
    ) VALUES (
      v_request.customer_id,
      'CUSTOM_ORDER_EXPIRED',
      'انتهت صلاحية طلبك الخاص',
      'Your custom order has expired',
      'انتهت صلاحية عرض السعر لطلبك الخاص. يمكنك إنشاء طلب جديد.',
      'The price quote for your custom order has expired. You can create a new order.',
      jsonb_build_object(
        'request_id', v_request.id,
        'broadcast_id', v_request.broadcast_id,
        'is_custom_order', true
      )
    );

    -- Notify provider that the pricing expired
    INSERT INTO provider_notifications (
      provider_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      data
    ) VALUES (
      v_request.provider_id,
      'CUSTOM_ORDER_PRICING_EXPIRED',
      'انتهت مهلة موافقة العميل',
      'Customer approval deadline passed',
      'لم يرد العميل على تسعيرتك في الوقت المحدد',
      'Customer did not respond to your quote in time',
      jsonb_build_object(
        'request_id', v_request.id,
        'is_custom_order', true
      )
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'executed_at', NOW()
  );

  -- Log execution
  RAISE NOTICE 'expire_priced_custom_orders: Expired % orders at %', v_expired_count, NOW();

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_priced_custom_orders IS
  'Expires priced custom orders where customer did not respond within the allowed time.
   Uses pricing_expires_at or falls back to 24 hours from priced_at.';

-- ============================================================================
-- 3. Schedule the cron job (runs every hour)
-- ============================================================================

-- Remove existing job if any
SELECT cron.unschedule('expire-priced-custom-orders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-priced-custom-orders'
);

-- Schedule job to run every hour
SELECT cron.schedule(
  'expire-priced-custom-orders',  -- job name
  '0 * * * *',                     -- every hour at minute 0
  'SELECT expire_priced_custom_orders()'
);

-- ============================================================================
-- 4. Grant necessary permissions
-- ============================================================================

-- Allow the function to be called by cron (runs as postgres user)
GRANT EXECUTE ON FUNCTION expire_priced_custom_orders() TO postgres;

-- ============================================================================
-- 5. Create manual trigger function for testing/admin use
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_expire_custom_orders()
RETURNS JSONB AS $$
BEGIN
  -- This can be called manually by admins via RPC
  RETURN expire_priced_custom_orders();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to authenticated (for admin dashboard)
GRANT EXECUTE ON FUNCTION admin_expire_custom_orders() TO authenticated;

COMMENT ON FUNCTION admin_expire_custom_orders IS
  'Admin function to manually trigger custom order expiration. Can be called via RPC.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
