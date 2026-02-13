-- ============================================================================
-- Expire Pending Payment Orders - pg_cron function
-- ============================================================================
-- Runs every 15 minutes via Supabase pg_cron.
-- Cancels orders stuck in 'pending_payment' status for more than 30 minutes.
--
-- These are online payment orders where:
--   - The user was redirected to Kashier but never completed payment
--   - The user closed the browser during payment
--   - Kashier failed to send a webhook
--
-- For each expired order:
--   1. Cancel the order (status → 'cancelled', payment_status → 'failed')
--   2. Roll back promo code usage (if applicable)
--   3. Notify the customer
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_pending_payment_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_usage RECORD;
  v_cancelled_count INTEGER := 0;
  v_cutoff TIMESTAMPTZ := now() - INTERVAL '30 minutes';
BEGIN
  -- Find all expired pending_payment orders
  FOR v_order IN
    SELECT id, customer_id, promo_code
    FROM orders
    WHERE status = 'pending_payment'
      AND created_at < v_cutoff
  LOOP
    -- Cancel the order (idempotent: only if still pending_payment)
    UPDATE orders
    SET
      status = 'cancelled',
      payment_status = 'failed',
      cancelled_at = now()
    WHERE id = v_order.id
      AND status = 'pending_payment';

    IF NOT FOUND THEN
      CONTINUE; -- Already processed by another path (webhook, payment-result page)
    END IF;

    -- Roll back promo code usage if applicable
    IF v_order.promo_code IS NOT NULL THEN
      FOR v_usage IN
        SELECT id, promo_code_id
        FROM promo_code_usage
        WHERE order_id = v_order.id
      LOOP
        -- Delete the usage record
        DELETE FROM promo_code_usage WHERE id = v_usage.id;

        -- Decrement usage count (min 0)
        UPDATE promo_codes
        SET usage_count = GREATEST(usage_count - 1, 0)
        WHERE id = v_usage.promo_code_id;
      END LOOP;
    END IF;

    -- Notify customer about expired payment
    INSERT INTO customer_notifications (
      customer_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      related_order_id
    ) VALUES (
      v_order.customer_id,
      'payment_expired',
      'انتهت صلاحية الدفع',
      'Payment Expired',
      'انتهت صلاحية عملية الدفع. يمكنك إعادة الطلب من جديد.',
      'Your payment has expired. You can place a new order.',
      v_order.id
    );

    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;

  -- Log result (visible in Supabase logs)
  IF v_cancelled_count > 0 THEN
    RAISE LOG '[expire_pending_payment_orders] Cancelled % orders', v_cancelled_count;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION expire_pending_payment_orders() TO service_role;

-- ============================================================================
-- Schedule the cron job (every 15 minutes)
-- ============================================================================
-- Run this ONCE in SQL Editor to register the cron:
--
--   SELECT cron.schedule(
--     'expire-pending-payments',
--     '*/15 * * * *',
--     $$SELECT expire_pending_payment_orders()$$
--   );
--
-- To verify it's registered:
--   SELECT * FROM cron.job WHERE jobname = 'expire-pending-payments';
--
-- To check execution history:
--   SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-pending-payments')
--   ORDER BY start_time DESC LIMIT 10;
-- ============================================================================
