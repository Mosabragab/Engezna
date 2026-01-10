-- ============================================================================
-- Fix Custom Order Notifications - WITHOUT Adding New Columns
-- إصلاح إشعارات الطلبات المفتوحة - بدون إضافة أعمدة جديدة
--
-- Strategy:
-- 1. Use existing columns (type, related_customer_id, related_provider_id, related_order_id)
-- 2. Embed request_id/broadcast_id in body text with format: | REF:uuid
-- 3. Frontend can parse this reference when type starts with 'custom_'
--
-- @version 2.0
-- @date January 2026
-- ============================================================================

-- ============================================================================
-- 1. Function to notify merchant of new custom order request
-- إشعار التاجر بطلب مفتوح جديد
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_new_custom_order_request()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_input_type TEXT;
  v_body_ar TEXT;
  v_body_en TEXT;
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

  -- Build body with embedded reference
  v_body_ar := CASE v_input_type
    WHEN 'voice' THEN format('لديك طلب صوتي جديد من %s', COALESCE(v_customer_name, 'عميل'))
    WHEN 'image' THEN format('لديك طلب بالصور جديد من %s', COALESCE(v_customer_name, 'عميل'))
    ELSE format('لديك طلب مفتوح جديد من %s', COALESCE(v_customer_name, 'عميل'))
  END || ' | REF:' || NEW.id::text;

  v_body_en := CASE v_input_type
    WHEN 'voice' THEN format('New voice order from %s', COALESCE(v_customer_name, 'Customer'))
    WHEN 'image' THEN format('New image order from %s', COALESCE(v_customer_name, 'Customer'))
    ELSE format('New custom order from %s', COALESCE(v_customer_name, 'Customer'))
  END || ' | REF:' || NEW.id::text;

  -- Insert notification for merchant (using existing columns only)
  INSERT INTO provider_notifications (
    provider_id,
    type,
    title_ar,
    title_en,
    body_ar,
    body_en,
    related_customer_id
  ) VALUES (
    NEW.provider_id,
    'new_custom_order',
    'طلب مفتوح جديد!',
    'New Custom Order!',
    v_body_ar,
    v_body_en,
    v_customer_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Function to notify customer when merchant prices an order
-- إشعار العميل عند تسعير الطلب
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_custom_order_priced()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_provider_name TEXT;
  v_provider_id UUID;
  v_body_ar TEXT;
  v_body_en TEXT;
BEGIN
  -- Only trigger when status changes to 'priced'
  IF OLD.status IS DISTINCT FROM 'priced' AND NEW.status = 'priced' THEN
    -- Get broadcast and customer info
    SELECT
      b.customer_id,
      p.name_ar,
      p.id
    INTO v_customer_id, v_provider_name, v_provider_id
    FROM custom_order_broadcasts b
    JOIN providers p ON p.id = NEW.provider_id
    WHERE b.id = NEW.broadcast_id;

    -- Build body with embedded reference
    v_body_ar := format('قام %s بتسعير طلبك. المبلغ: %s ج.م', v_provider_name, NEW.total)
      || ' | REF:' || NEW.id::text;
    v_body_en := format('%s priced your order. Total: %s EGP', v_provider_name, NEW.total)
      || ' | REF:' || NEW.id::text;

    -- Insert notification for customer
    IF v_customer_id IS NOT NULL THEN
      INSERT INTO customer_notifications (
        customer_id,
        type,
        title_ar,
        title_en,
        body_ar,
        body_en,
        related_provider_id
      ) VALUES (
        v_customer_id,
        'custom_order_priced',
        'تم تسعير طلبك!',
        'Your order has been priced!',
        v_body_ar,
        v_body_en,
        v_provider_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Function to notify merchant when customer approves their pricing
-- إشعار التاجر عند موافقة العميل
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_custom_order_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_body_ar TEXT;
  v_body_en TEXT;
BEGIN
  -- Only trigger when status changes to 'customer_approved'
  IF OLD.status IS DISTINCT FROM 'customer_approved' AND NEW.status = 'customer_approved' THEN
    -- Get customer info
    SELECT b.customer_id, p.full_name
    INTO v_customer_id, v_customer_name
    FROM custom_order_broadcasts b
    JOIN profiles p ON p.id = b.customer_id
    WHERE b.id = NEW.broadcast_id;

    -- Build body with embedded reference (now we have order_id!)
    v_body_ar := format('وافق %s على تسعيرتك بقيمة %s ج.م. ابدأ تحضير الطلب!',
      COALESCE(v_customer_name, 'العميل'), NEW.total);
    v_body_en := format('%s approved your quote of %s EGP. Start preparing!',
      COALESCE(v_customer_name, 'Customer'), NEW.total);

    -- Insert notification for merchant (with order_id if available)
    INSERT INTO provider_notifications (
      provider_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      related_customer_id,
      related_order_id
    ) VALUES (
      NEW.provider_id,
      'custom_order_approved',
      'تمت الموافقة على تسعيرتك!',
      'Your quote was approved!',
      v_body_ar,
      v_body_en,
      v_customer_id,
      NEW.order_id  -- This will be set when order is created
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Function to notify merchant when quote is rejected
-- إشعار التاجر عند رفض التسعيرة
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_custom_order_rejected()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Only trigger when status changes to 'customer_rejected'
  IF OLD.status IS DISTINCT FROM 'customer_rejected' AND NEW.status = 'customer_rejected' THEN
    -- Get customer id
    SELECT b.customer_id INTO v_customer_id
    FROM custom_order_broadcasts b
    WHERE b.id = NEW.broadcast_id;

    -- Insert notification for merchant
    INSERT INTO provider_notifications (
      provider_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      related_customer_id
    ) VALUES (
      NEW.provider_id,
      'custom_order_rejected',
      'تم رفض تسعيرتك',
      'Your quote was rejected',
      'اختار العميل تاجراً آخر | REF:' || NEW.id::text,
      'Customer chose another merchant | REF:' || NEW.id::text,
      v_customer_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Function to expire requests (no notification changes needed)
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

    -- Notify merchant (simple notification)
    INSERT INTO provider_notifications (
      provider_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en
    ) VALUES (
      v_request.provider_id,
      'pricing_expired',
      'فاتتك مهلة التسعير',
      'Pricing deadline missed',
      'انتهت مهلة تسعير طلب مفتوح | REF:' || v_request.id::text,
      'A custom order pricing deadline has passed | REF:' || v_request.id::text
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
-- 6. Recreate triggers
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_notify_new_custom_order ON custom_order_requests;
CREATE TRIGGER trigger_notify_new_custom_order
  AFTER INSERT ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_custom_order_request();

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

DROP TRIGGER IF EXISTS trigger_notify_custom_order_rejected ON custom_order_requests;
CREATE TRIGGER trigger_notify_custom_order_rejected
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_order_rejected();

-- ============================================================================
-- Done! No new columns added.
-- الـ Frontend يمكنه تحليل REF: من body للحصول على request_id
-- ============================================================================
