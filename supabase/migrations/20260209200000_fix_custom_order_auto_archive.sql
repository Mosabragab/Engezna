-- ============================================================================
-- Fix Custom Order Auto-Archive System
-- إصلاح نظام أرشفة الطلبات الخاصة تلقائياً
--
-- Problems solved:
-- 1. Broadcasts stay 'active' even when ALL requests are expired/cancelled/rejected
-- 2. expire_custom_order_broadcasts() was never scheduled in cron
-- 3. Cron interval too long (2 hours) - notifications arrive late
-- 4. Provider badge counts include expired-but-not-yet-updated requests
--
-- Solutions:
-- 1. Trigger on custom_order_requests: auto-archive broadcast when all requests terminal
-- 2. Schedule expire_custom_order_broadcasts() in cron
-- 3. Reduce cron interval from 2 hours to 30 minutes
-- 4. Combined cron job that runs both expiration functions
--
-- @version 1.0
-- @date February 2026
-- ============================================================================

-- ============================================================================
-- 1. Trigger: Auto-archive broadcast when ALL requests become terminal
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_archive_broadcast_on_request_change()
RETURNS TRIGGER AS $$
DECLARE
  v_broadcast_id UUID;
  v_total_requests INT;
  v_terminal_requests INT;
  v_has_approved BOOLEAN;
BEGIN
  v_broadcast_id := NEW.broadcast_id;

  -- Skip if broadcast_id is null
  IF v_broadcast_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count total and terminal requests for this broadcast
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('expired', 'cancelled', 'customer_rejected')),
    COUNT(*) FILTER (WHERE status = 'customer_approved') > 0
  INTO v_total_requests, v_terminal_requests, v_has_approved
  FROM custom_order_requests
  WHERE broadcast_id = v_broadcast_id;

  -- If a request was approved, the broadcast is handled by handle_custom_order_approval()
  -- So we only auto-archive when ALL requests are terminal (expired/cancelled/rejected)
  IF NOT v_has_approved AND v_total_requests > 0 AND v_terminal_requests = v_total_requests THEN
    -- All requests are terminal - archive the broadcast
    UPDATE custom_order_broadcasts
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE id = v_broadcast_id
    AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (fires after any status update on requests)
DROP TRIGGER IF EXISTS trigger_auto_archive_broadcast ON custom_order_requests;
CREATE TRIGGER trigger_auto_archive_broadcast
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION auto_archive_broadcast_on_request_change();

COMMENT ON FUNCTION auto_archive_broadcast_on_request_change() IS
  'Auto-archives a broadcast to expired when ALL its requests become terminal (expired/cancelled/rejected).
   This prevents stale active broadcasts from showing in the customer orders page.';

-- ============================================================================
-- 2. Combined cron job: expire requests + expire broadcasts (every 30 min)
-- ============================================================================

-- Remove old separate cron jobs
SELECT cron.unschedule('expire-priced-custom-orders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-priced-custom-orders'
);

SELECT cron.unschedule('expire-custom-orders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-custom-orders'
);

-- Create combined expiration function
CREATE OR REPLACE FUNCTION expire_all_custom_orders()
RETURNS JSONB AS $$
DECLARE
  v_expired_requests INT := 0;
  v_expired_broadcasts INT := 0;
  v_request RECORD;
  v_result JSONB;
BEGIN
  -- ═══════════════════════════════════════════════════════════════
  -- PART 1: Expire priced requests (customer didn't respond in time)
  -- ═══════════════════════════════════════════════════════════════
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
      (r.pricing_expires_at IS NOT NULL AND r.pricing_expires_at < NOW())
      OR
      (r.pricing_expires_at IS NULL AND r.priced_at IS NOT NULL AND r.priced_at < NOW() - INTERVAL '24 hours')
    )
  LOOP
    UPDATE custom_order_requests
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_request.id;

    -- Cancel associated order
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

    -- Notify customer
    INSERT INTO customer_notifications (customer_id, type, title_ar, title_en, body_ar, body_en, data)
    VALUES (
      v_request.customer_id,
      'CUSTOM_ORDER_EXPIRED',
      'انتهت صلاحية طلبك الخاص',
      'Your custom order has expired',
      'انتهت صلاحية عرض السعر لطلبك الخاص. يمكنك إنشاء طلب جديد.',
      'The price quote for your custom order has expired. You can create a new order.',
      jsonb_build_object('request_id', v_request.id, 'broadcast_id', v_request.broadcast_id, 'is_custom_order', true)
    );

    -- Notify provider
    INSERT INTO provider_notifications (provider_id, type, title_ar, title_en, body_ar, body_en, data)
    VALUES (
      v_request.provider_id,
      'CUSTOM_ORDER_PRICING_EXPIRED',
      'انتهت مهلة موافقة العميل',
      'Customer approval deadline passed',
      'لم يرد العميل على تسعيرتك في الوقت المحدد',
      'Customer did not respond to your quote in time',
      jsonb_build_object('request_id', v_request.id, 'is_custom_order', true)
    );

    v_expired_requests := v_expired_requests + 1;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════
  -- PART 2: Expire pending requests past pricing deadline
  -- ═══════════════════════════════════════════════════════════════
  FOR v_request IN
    SELECT r.id, r.provider_id, r.broadcast_id, b.customer_id
    FROM custom_order_requests r
    JOIN custom_order_broadcasts b ON b.id = r.broadcast_id
    WHERE r.status = 'pending'
    AND b.pricing_deadline < NOW()
  LOOP
    UPDATE custom_order_requests
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_request.id;

    -- Notify merchant
    INSERT INTO provider_notifications (provider_id, type, title_ar, title_en, body_ar, body_en, data)
    VALUES (
      v_request.provider_id,
      'pricing_expired',
      'فاتتك مهلة التسعير',
      'Pricing deadline missed',
      'انتهت مهلة تسعير طلب مفتوح',
      'A custom order pricing deadline has passed',
      jsonb_build_object('request_id', v_request.id)
    );

    v_expired_requests := v_expired_requests + 1;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════
  -- PART 3: Expire broadcasts past their expires_at deadline
  -- (Safety net - trigger should handle most cases)
  -- ═══════════════════════════════════════════════════════════════
  WITH expired_broadcasts AS (
    UPDATE custom_order_broadcasts
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
    AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_broadcasts FROM expired_broadcasts;

  -- Also expire any active broadcasts where ALL requests are terminal
  -- (Safety net for any missed trigger events)
  WITH stale_broadcasts AS (
    UPDATE custom_order_broadcasts b
    SET status = 'expired', updated_at = NOW()
    WHERE b.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM custom_order_requests r
      WHERE r.broadcast_id = b.id
      AND r.status IN ('pending', 'priced', 'customer_approved')
    )
    AND EXISTS (
      SELECT 1 FROM custom_order_requests r
      WHERE r.broadcast_id = b.id
    )
    RETURNING id
  )
  SELECT v_expired_broadcasts + COUNT(*) INTO v_expired_broadcasts FROM stale_broadcasts;

  -- Cancel orders for expired broadcasts
  UPDATE orders
  SET
    status = 'cancelled',
    pricing_status = 'pricing_expired',
    cancellation_reason = 'انتهت مهلة التسعير - Pricing deadline expired',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE order_flow = 'custom'
  AND pricing_status = 'awaiting_pricing'
  AND status NOT IN ('cancelled', 'delivered', 'completed')
  AND EXISTS (
    SELECT 1 FROM custom_order_broadcasts b
    WHERE b.id = orders.broadcast_id
    AND b.status = 'expired'
  );

  v_result := jsonb_build_object(
    'success', true,
    'expired_requests', v_expired_requests,
    'expired_broadcasts', v_expired_broadcasts,
    'executed_at', NOW()
  );

  RAISE NOTICE 'expire_all_custom_orders: % requests, % broadcasts at %',
    v_expired_requests, v_expired_broadcasts, NOW();

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION expire_all_custom_orders() TO postgres;
GRANT EXECUTE ON FUNCTION expire_all_custom_orders() TO authenticated;

COMMENT ON FUNCTION expire_all_custom_orders() IS
  'Combined expiration function: expires priced requests, pending requests, and stale broadcasts.
   Runs every 30 minutes via pg_cron. Also callable manually via admin_expire_custom_orders().';

-- Schedule combined job every 30 minutes
SELECT cron.schedule(
  'expire-all-custom-orders',
  '*/30 * * * *',
  'SELECT expire_all_custom_orders()'
);

-- Update admin function to use the new combined function
CREATE OR REPLACE FUNCTION admin_expire_custom_orders()
RETURNS JSONB AS $$
BEGIN
  RETURN expire_all_custom_orders();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_expire_custom_orders() TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
