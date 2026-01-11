-- ============================================================================
-- Custom Order Notification System
-- نظام إشعارات الطلبات المفتوحة
--
-- This migration adds:
-- 1. Notification triggers for custom order status changes
-- 2. Functions to send notifications on key events
-- 3. Auto-expiration scheduling setup
--
-- @version 1.0
-- @date January 2026
-- ============================================================================

-- ============================================================================
-- 1. Function to notify customer when merchant prices an order
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_custom_order_priced()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_provider_name TEXT;
  v_broadcast_id UUID;
BEGIN
  -- Only trigger when status changes to 'priced'
  IF OLD.status <> 'priced' AND NEW.status = 'priced' THEN
    -- Get broadcast and customer info
    SELECT
      b.customer_id,
      b.id,
      p.name_ar
    INTO v_customer_id, v_broadcast_id, v_provider_name
    FROM custom_order_broadcasts b
    JOIN providers p ON p.id = NEW.provider_id
    WHERE b.id = NEW.broadcast_id;

    -- Insert notification for customer
    IF v_customer_id IS NOT NULL THEN
      INSERT INTO customer_notifications (
        customer_id,
        type,
        title_ar,
        title_en,
        body_ar,
        body_en,
        data
      ) VALUES (
        v_customer_id,
        'custom_order_priced',
        'تم تسعير طلبك!',
        'Your order has been priced!',
        format('قام %s بتسعير طلبك. راجع العرض الآن!', v_provider_name),
        format('%s has priced your order. Review the offer now!', v_provider_name),
        jsonb_build_object(
          'broadcast_id', v_broadcast_id,
          'request_id', NEW.id,
          'provider_id', NEW.provider_id,
          'total', NEW.total
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_custom_order_priced ON custom_order_requests;
CREATE TRIGGER trigger_notify_custom_order_priced
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_order_priced();

-- ============================================================================
-- 2. Function to notify merchant when customer approves their pricing
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_custom_order_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_id UUID;
  v_customer_name TEXT;
BEGIN
  -- Only trigger when status changes to 'customer_approved'
  IF OLD.status <> 'customer_approved' AND NEW.status = 'customer_approved' THEN
    v_provider_id := NEW.provider_id;

    -- Get customer name
    SELECT p.full_name INTO v_customer_name
    FROM custom_order_broadcasts b
    JOIN profiles p ON p.id = b.customer_id
    WHERE b.id = NEW.broadcast_id;

    -- Insert notification for merchant
    INSERT INTO provider_notifications (
      provider_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      data
    ) VALUES (
      v_provider_id,
      'custom_order_approved',
      'تمت الموافقة على تسعيرتك!',
      'Your quote was approved!',
      format('وافق %s على تسعيرتك. ابدأ تحضير الطلب!', COALESCE(v_customer_name, 'العميل')),
      format('%s approved your quote. Start preparing the order!', COALESCE(v_customer_name, 'Customer')),
      jsonb_build_object(
        'request_id', NEW.id,
        'order_id', NEW.order_id,
        'total', NEW.total
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_custom_order_approved ON custom_order_requests;
CREATE TRIGGER trigger_notify_custom_order_approved
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_order_approved();

-- ============================================================================
-- 3. Function to notify merchant of new custom order request
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_new_custom_order_request()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_input_type TEXT;
BEGIN
  -- Get customer name and input type
  SELECT
    p.full_name,
    b.original_input_type
  INTO v_customer_name, v_input_type
  FROM custom_order_broadcasts b
  JOIN profiles p ON p.id = b.customer_id
  WHERE b.id = NEW.broadcast_id;

  -- Insert notification for merchant
  INSERT INTO provider_notifications (
    provider_id,
    type,
    title_ar,
    title_en,
    body_ar,
    body_en,
    data
  ) VALUES (
    NEW.provider_id,
    'new_custom_order',
    'طلب مفتوح جديد!',
    'New Custom Order!',
    CASE v_input_type
      WHEN 'voice' THEN format('لديك طلب صوتي جديد من %s', COALESCE(v_customer_name, 'عميل'))
      WHEN 'image' THEN format('لديك طلب بالصور جديد من %s', COALESCE(v_customer_name, 'عميل'))
      ELSE format('لديك طلب مفتوح جديد من %s', COALESCE(v_customer_name, 'عميل'))
    END,
    CASE v_input_type
      WHEN 'voice' THEN format('New voice order from %s', COALESCE(v_customer_name, 'Customer'))
      WHEN 'image' THEN format('New image order from %s', COALESCE(v_customer_name, 'Customer'))
      ELSE format('New custom order from %s', COALESCE(v_customer_name, 'Customer'))
    END,
    jsonb_build_object(
      'request_id', NEW.id,
      'broadcast_id', NEW.broadcast_id,
      'input_type', v_input_type
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_new_custom_order ON custom_order_requests;
CREATE TRIGGER trigger_notify_new_custom_order
  AFTER INSERT ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_custom_order_request();

-- ============================================================================
-- 4. Function to notify customer when order is rejected
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_custom_order_rejected()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_provider_name TEXT;
  v_broadcast_id UUID;
BEGIN
  -- Only trigger when status changes to 'customer_rejected'
  IF OLD.status <> 'customer_rejected' AND NEW.status = 'customer_rejected' THEN
    -- Get broadcast and provider info
    SELECT
      b.customer_id,
      b.id,
      p.name_ar
    INTO v_customer_id, v_broadcast_id, v_provider_name
    FROM custom_order_broadcasts b
    JOIN providers p ON p.id = NEW.provider_id
    WHERE b.id = NEW.broadcast_id;

    -- Notify merchant that their quote was rejected
    INSERT INTO provider_notifications (
      provider_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      data
    ) VALUES (
      NEW.provider_id,
      'custom_order_rejected',
      'تم رفض تسعيرتك',
      'Your quote was rejected',
      'اختار العميل تاجراً آخر',
      'Customer chose another merchant',
      jsonb_build_object(
        'request_id', NEW.id,
        'broadcast_id', v_broadcast_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_custom_order_rejected ON custom_order_requests;
CREATE TRIGGER trigger_notify_custom_order_rejected
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_order_rejected();

-- ============================================================================
-- 5. Function to check and expire old requests (called by pg_cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_custom_order_requests()
RETURNS void AS $$
DECLARE
  v_expired_count INT := 0;
  v_request RECORD;
BEGIN
  -- Expire pending requests past their deadline
  FOR v_request IN
    SELECT r.id, r.provider_id, r.broadcast_id, b.customer_id
    FROM custom_order_requests r
    JOIN custom_order_broadcasts b ON b.id = r.broadcast_id
    WHERE r.status = 'pending'
    AND r.pricing_expires_at < NOW()
  LOOP
    UPDATE custom_order_requests
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_request.id;

    v_expired_count := v_expired_count + 1;

    -- Notify merchant
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
      'pricing_expired',
      'فاتتك مهلة التسعير',
      'Pricing deadline missed',
      'انتهت مهلة تسعير طلب مفتوح',
      'A custom order pricing deadline has passed',
      jsonb_build_object('request_id', v_request.id)
    );
  END LOOP;

  -- Expire broadcasts with no responses
  UPDATE custom_order_broadcasts
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
  AND pricing_deadline < NOW()
  AND NOT EXISTS (
    SELECT 1 FROM custom_order_requests
    WHERE broadcast_id = custom_order_broadcasts.id
    AND status IN ('priced', 'customer_approved')
  );

  RAISE NOTICE 'Expired % custom order requests', v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Schedule auto-expiration (if pg_cron is available)
-- ============================================================================
-- Note: Uncomment if pg_cron extension is enabled
-- SELECT cron.schedule(
--   'expire-custom-orders',
--   '*/5 * * * *',  -- Every 5 minutes
--   $$SELECT expire_custom_order_requests()$$
-- );

-- ============================================================================
-- 7. Grant necessary permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION notify_custom_order_priced() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_custom_order_approved() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_new_custom_order_request() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_custom_order_rejected() TO authenticated;
GRANT EXECUTE ON FUNCTION expire_custom_order_requests() TO service_role;

-- ============================================================================
-- 8. Add notification type enum values if not exists
-- ============================================================================
DO $$
BEGIN
  -- This ensures the notification types are recognized
  COMMENT ON FUNCTION notify_custom_order_priced() IS
    'Triggers customer notification when merchant prices a custom order';
  COMMENT ON FUNCTION notify_custom_order_approved() IS
    'Triggers merchant notification when customer approves their pricing';
  COMMENT ON FUNCTION notify_new_custom_order_request() IS
    'Triggers merchant notification for new custom order requests';
END $$;
