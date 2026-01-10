-- ============================================================================
-- Fix Custom Order Notifications - Use existing notification structure
-- إصلاح إشعارات الطلبات المفتوحة - استخدام البنية الموجودة
--
-- This migration fixes the notification functions to work with existing tables
-- without requiring a new 'data' column
--
-- @version 1.1
-- @date January 2026
-- ============================================================================

-- First, add related columns for custom orders if they don't exist
ALTER TABLE public.customer_notifications
ADD COLUMN IF NOT EXISTS related_broadcast_id UUID;

ALTER TABLE public.customer_notifications
ADD COLUMN IF NOT EXISTS related_request_id UUID;

ALTER TABLE public.provider_notifications
ADD COLUMN IF NOT EXISTS related_broadcast_id UUID;

ALTER TABLE public.provider_notifications
ADD COLUMN IF NOT EXISTS related_request_id UUID;

-- ============================================================================
-- 1. Fix: Notify customer when merchant prices an order
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_custom_order_priced()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_provider_name TEXT;
  v_broadcast_id UUID;
  v_provider_id UUID;
BEGIN
  -- Only trigger when status changes to 'priced'
  IF OLD.status <> 'priced' AND NEW.status = 'priced' THEN
    -- Get broadcast and customer info
    SELECT
      b.customer_id,
      b.id,
      p.name_ar,
      p.id
    INTO v_customer_id, v_broadcast_id, v_provider_name, v_provider_id
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
        related_provider_id,
        related_broadcast_id,
        related_request_id
      ) VALUES (
        v_customer_id,
        'custom_order_priced',
        'تم تسعير طلبك!',
        'Your order has been priced!',
        format('قام %s بتسعير طلبك. المبلغ: %s ج.م. راجع العرض الآن!', v_provider_name, NEW.total),
        format('%s has priced your order. Total: %s EGP. Review the offer now!', v_provider_name, NEW.total),
        v_provider_id,
        v_broadcast_id,
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Fix: Notify merchant when customer approves their pricing
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_custom_order_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_id UUID;
  v_customer_id UUID;
  v_customer_name TEXT;
BEGIN
  -- Only trigger when status changes to 'customer_approved'
  IF OLD.status <> 'customer_approved' AND NEW.status = 'customer_approved' THEN
    v_provider_id := NEW.provider_id;

    -- Get customer info
    SELECT b.customer_id, p.full_name
    INTO v_customer_id, v_customer_name
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
      related_customer_id,
      related_order_id,
      related_broadcast_id,
      related_request_id
    ) VALUES (
      v_provider_id,
      'custom_order_approved',
      'تمت الموافقة على تسعيرتك!',
      'Your quote was approved!',
      format('وافق %s على تسعيرتك بقيمة %s ج.م. ابدأ تحضير الطلب!', COALESCE(v_customer_name, 'العميل'), NEW.total),
      format('%s approved your quote of %s EGP. Start preparing the order!', COALESCE(v_customer_name, 'Customer'), NEW.total),
      v_customer_id,
      NEW.order_id,
      NEW.broadcast_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Fix: Notify merchant of new custom order request
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_new_custom_order_request()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_input_type TEXT;
BEGIN
  -- Get customer name and input type
  SELECT
    b.customer_id,
    p.full_name,
    b.original_input_type
  INTO v_customer_id, v_customer_name, v_input_type
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
    related_customer_id,
    related_broadcast_id,
    related_request_id
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
    v_customer_id,
    NEW.broadcast_id,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Fix: Notify merchant when quote is rejected
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
    -- Get broadcast info
    SELECT
      b.customer_id,
      b.id
    INTO v_customer_id, v_broadcast_id
    FROM custom_order_broadcasts b
    WHERE b.id = NEW.broadcast_id;

    -- Notify merchant that their quote was rejected
    INSERT INTO provider_notifications (
      provider_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      related_customer_id,
      related_broadcast_id,
      related_request_id
    ) VALUES (
      NEW.provider_id,
      'custom_order_rejected',
      'تم رفض تسعيرتك',
      'Your quote was rejected',
      'اختار العميل تاجراً آخر',
      'Customer chose another merchant',
      v_customer_id,
      v_broadcast_id,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Fix: Expire requests function
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
      related_broadcast_id,
      related_request_id
    ) VALUES (
      v_request.provider_id,
      'pricing_expired',
      'فاتتك مهلة التسعير',
      'Pricing deadline missed',
      'انتهت مهلة تسعير طلب مفتوح',
      'A custom order pricing deadline has passed',
      v_request.broadcast_id,
      v_request.id
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
-- 6. Recreate triggers (ensure they're properly attached)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_notify_custom_order_priced ON custom_order_requests;
CREATE TRIGGER trigger_notify_custom_order_priced
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_order_priced();

DROP TRIGGER IF EXISTS trigger_notify_custom_order_approved ON custom_order_requests;
CREATE TRIGGER trigger_notify_custom_order_approved
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_order_approved();

DROP TRIGGER IF EXISTS trigger_notify_new_custom_order ON custom_order_requests;
CREATE TRIGGER trigger_notify_new_custom_order
  AFTER INSERT ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_custom_order_request();

DROP TRIGGER IF EXISTS trigger_notify_custom_order_rejected ON custom_order_requests;
CREATE TRIGGER trigger_notify_custom_order_rejected
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_order_rejected();

-- ============================================================================
-- 7. Add indexes for the new columns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customer_notifications_broadcast
  ON customer_notifications(related_broadcast_id) WHERE related_broadcast_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_notifications_request
  ON customer_notifications(related_request_id) WHERE related_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_notifications_broadcast
  ON provider_notifications(related_broadcast_id) WHERE related_broadcast_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_notifications_request
  ON provider_notifications(related_request_id) WHERE related_request_id IS NOT NULL;

-- ============================================================================
-- Done!
-- ============================================================================
