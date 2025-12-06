-- ============================================================================
-- Migration: Payment Confirmation Notification
-- Date: December 7, 2025
-- Purpose: Add trigger to notify customer when payment is confirmed
-- ============================================================================

-- ============================================================================
-- FUNCTION: Create customer notification when payment status changes to completed
-- دالة: إنشاء إشعار للعميل عند تأكيد استلام المبلغ
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_customer_payment_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_order_number TEXT;
  v_provider_name_ar TEXT;
  v_provider_name_en TEXT;
BEGIN
  -- Only trigger if payment_status changed from something else to 'completed'
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status
     AND NEW.payment_status = 'completed'
     AND OLD.payment_status != 'completed' THEN

    -- Get order number
    v_order_number := COALESCE(NEW.order_number, 'ORD-' || LEFT(NEW.id::text, 8));

    -- Get provider name
    SELECT name_ar, name_en INTO v_provider_name_ar, v_provider_name_en
    FROM providers WHERE id = NEW.provider_id;

    -- Insert customer notification
    INSERT INTO customer_notifications (
      customer_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      related_order_id,
      related_provider_id
    ) VALUES (
      NEW.customer_id,
      'payment_confirmed',
      'تم تأكيد استلام المبلغ',
      'Payment Confirmed',
      'تم تأكيد استلام مبلغ طلبك #' || v_order_number || ' من ' || COALESCE(v_provider_name_ar, 'المتجر') || '. شكراً لك!',
      'Payment for your order #' || v_order_number || ' from ' || COALESCE(v_provider_name_en, 'the store') || ' has been confirmed. Thank you!',
      NEW.id,
      NEW.provider_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DROP existing trigger if exists and CREATE new trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_notify_customer_payment_confirmed ON orders;

CREATE TRIGGER trigger_notify_customer_payment_confirmed
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_payment_confirmed();

-- ============================================================================
-- Add comment for documentation
-- ============================================================================

COMMENT ON FUNCTION notify_customer_payment_confirmed() IS
  'Creates a notification for the customer when payment_status changes to completed';
