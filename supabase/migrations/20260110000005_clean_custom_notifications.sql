-- ============================================================================
-- CLEAN Custom Order Notifications - Final Solution
-- تنظيف وإعادة كتابة إشعارات الطلبات المفتوحة
--
-- Strategy:
-- 1. DROP all old problematic functions
-- 2. Use existing columns smartly:
--    - provider_notifications.related_message_id → stores request_id
--    - provider_notifications.related_customer_id → stores customer_id
--    - customer_notifications.related_provider_id → stores provider_id
--    - customer_notifications.related_order_id → stores order_id (after approval)
-- 3. Use UPPERCASE type values for easy filtering: NEW_CUSTOM_ORDER, CUSTOM_ORDER_PRICED, etc.
--
-- @version 3.0 (FINAL)
-- @date January 2026
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP OLD FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_notify_new_custom_order ON custom_order_requests;
DROP TRIGGER IF EXISTS trigger_notify_custom_order_priced ON custom_order_requests;
DROP TRIGGER IF EXISTS trigger_notify_custom_order_approved ON custom_order_requests;
DROP TRIGGER IF EXISTS trigger_notify_custom_order_rejected ON custom_order_requests;

-- Drop old functions
DROP FUNCTION IF EXISTS notify_new_custom_order_request();
DROP FUNCTION IF EXISTS notify_custom_order_priced();
DROP FUNCTION IF EXISTS notify_custom_order_approved();
DROP FUNCTION IF EXISTS notify_custom_order_rejected();
DROP FUNCTION IF EXISTS expire_custom_order_requests();

-- ============================================================================
-- STEP 2: CREATE NEW CLEAN FUNCTIONS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 Notify merchant of NEW custom order
-- إشعار التاجر بطلب مفتوح جديد
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_new_custom_order_request()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
  v_input_type TEXT;
BEGIN
  -- Get customer info from broadcast
  SELECT
    b.customer_id,
    COALESCE(p.full_name, 'عميل'),
    b.original_input_type
  INTO v_customer_id, v_customer_name, v_input_type
  FROM custom_order_broadcasts b
  LEFT JOIN profiles p ON p.id = b.customer_id
  WHERE b.id = NEW.broadcast_id;

  -- Insert notification using existing columns
  -- related_message_id → request_id (smart reuse!)
  -- related_customer_id → customer_id
  INSERT INTO provider_notifications (
    provider_id,
    type,
    title_ar,
    title_en,
    body_ar,
    body_en,
    related_message_id,      -- ← Stores request_id
    related_customer_id      -- ← Stores customer_id
  ) VALUES (
    NEW.provider_id,
    'NEW_CUSTOM_ORDER',      -- ← UPPERCASE for easy filtering
    'طلب مفتوح جديد! 📦',
    'New Custom Order! 📦',
    CASE v_input_type
      WHEN 'voice' THEN 'طلب صوتي جديد من ' || v_customer_name
      WHEN 'image' THEN 'طلب بالصور من ' || v_customer_name
      ELSE 'طلب مفتوح جديد من ' || v_customer_name
    END,
    CASE v_input_type
      WHEN 'voice' THEN 'Voice order from ' || v_customer_name
      WHEN 'image' THEN 'Image order from ' || v_customer_name
      ELSE 'Custom order from ' || v_customer_name
    END,
    NEW.id,                  -- ← request_id stored here
    v_customer_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 2.2 Notify CUSTOMER when merchant prices their order
-- إشعار العميل عند تسعير الطلب
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_custom_order_priced()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_provider_name TEXT;
  v_provider_id UUID;
  v_broadcast_id UUID;
BEGIN
  -- Only trigger on status change to 'priced'
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'priced' THEN
    RETURN NEW;
  END IF;

  -- Get info
  SELECT
    b.customer_id,
    b.id,
    p.name_ar,
    p.id
  INTO v_customer_id, v_broadcast_id, v_provider_name, v_provider_id
  FROM custom_order_broadcasts b
  JOIN providers p ON p.id = NEW.provider_id
  WHERE b.id = NEW.broadcast_id;

  IF v_customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert notification for customer
  -- related_order_id → temporarily stores request_id (until order is created)
  -- related_provider_id → stores provider_id
  INSERT INTO customer_notifications (
    customer_id,
    type,
    title_ar,
    title_en,
    body_ar,
    body_en,
    related_order_id,        -- ← Stores request_id temporarily
    related_provider_id      -- ← Stores provider_id
  ) VALUES (
    v_customer_id,
    'CUSTOM_ORDER_PRICED',   -- ← UPPERCASE
    'تم تسعير طلبك! 💰',
    'Order Priced! 💰',
    v_provider_name || ' سعّر طلبك بـ ' || NEW.total || ' ج.م - راجع العرض الآن',
    v_provider_name || ' priced your order at ' || NEW.total || ' EGP - Review now',
    NEW.id,                  -- ← request_id
    v_provider_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 2.3 Notify MERCHANT when customer APPROVES
-- إشعار التاجر عند موافقة العميل
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_custom_order_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name TEXT;
BEGIN
  -- Only trigger on status change to 'customer_approved'
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'customer_approved' THEN
    RETURN NEW;
  END IF;

  -- Get customer info
  SELECT b.customer_id, COALESCE(p.full_name, 'العميل')
  INTO v_customer_id, v_customer_name
  FROM custom_order_broadcasts b
  LEFT JOIN profiles p ON p.id = b.customer_id
  WHERE b.id = NEW.broadcast_id;

  -- Insert notification for merchant
  INSERT INTO provider_notifications (
    provider_id,
    type,
    title_ar,
    title_en,
    body_ar,
    body_en,
    related_order_id,        -- ← Now we have real order_id!
    related_message_id,      -- ← request_id for reference
    related_customer_id
  ) VALUES (
    NEW.provider_id,
    'CUSTOM_ORDER_APPROVED', -- ← UPPERCASE
    'تمت الموافقة! ✅',
    'Order Approved! ✅',
    'وافق ' || v_customer_name || ' على تسعيرتك (' || NEW.total || ' ج.م) - ابدأ التحضير!',
    v_customer_name || ' approved your quote (' || NEW.total || ' EGP) - Start preparing!',
    NEW.order_id,            -- ← Real order_id
    NEW.id,                  -- ← request_id
    v_customer_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 2.4 Notify MERCHANT when customer REJECTS
-- إشعار التاجر عند رفض العميل
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_custom_order_rejected()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Only trigger on status change to 'customer_rejected'
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'customer_rejected' THEN
    RETURN NEW;
  END IF;

  -- Get customer_id
  SELECT b.customer_id INTO v_customer_id
  FROM custom_order_broadcasts b
  WHERE b.id = NEW.broadcast_id;

  -- Insert notification
  INSERT INTO provider_notifications (
    provider_id,
    type,
    title_ar,
    title_en,
    body_ar,
    body_en,
    related_message_id,      -- ← request_id
    related_customer_id
  ) VALUES (
    NEW.provider_id,
    'CUSTOM_ORDER_REJECTED', -- ← UPPERCASE
    'تم رفض العرض ❌',
    'Quote Rejected ❌',
    'اختار العميل تاجراً آخر',
    'Customer chose another merchant',
    NEW.id,
    v_customer_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 2.5 Expire old requests (cleanup function)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_custom_order_requests()
RETURNS void AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Find and expire pending requests past deadline
  FOR v_request IN
    SELECT r.id, r.provider_id, b.customer_id
    FROM custom_order_requests r
    JOIN custom_order_broadcasts b ON b.id = r.broadcast_id
    WHERE r.status = 'pending'
    AND r.pricing_expires_at < NOW()
  LOOP
    -- Update status
    UPDATE custom_order_requests
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_request.id;

    -- Notify merchant
    INSERT INTO provider_notifications (
      provider_id, type, title_ar, title_en, body_ar, body_en, related_message_id
    ) VALUES (
      v_request.provider_id,
      'PRICING_EXPIRED',
      'انتهت مهلة التسعير ⏰',
      'Pricing Deadline Passed ⏰',
      'فاتتك مهلة تسعير طلب مفتوح',
      'You missed a custom order pricing deadline',
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: CREATE TRIGGERS
-- ============================================================================

CREATE TRIGGER trigger_notify_new_custom_order
  AFTER INSERT ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_custom_order_request();

CREATE TRIGGER trigger_notify_custom_order_priced
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_order_priced();

CREATE TRIGGER trigger_notify_custom_order_approved
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_order_approved();

CREATE TRIGGER trigger_notify_custom_order_rejected
  AFTER UPDATE ON custom_order_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_order_rejected();

-- ============================================================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION notify_new_custom_order_request() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_custom_order_priced() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_custom_order_approved() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_custom_order_rejected() TO authenticated;
GRANT EXECUTE ON FUNCTION expire_custom_order_requests() TO service_role;

-- ============================================================================
-- DONE!
-- Summary of column usage:
--
-- provider_notifications:
--   - type: 'NEW_CUSTOM_ORDER', 'CUSTOM_ORDER_APPROVED', 'CUSTOM_ORDER_REJECTED', 'PRICING_EXPIRED'
--   - related_message_id: stores request_id
--   - related_customer_id: stores customer_id
--   - related_order_id: stores order_id (after approval)
--
-- customer_notifications:
--   - type: 'CUSTOM_ORDER_PRICED'
--   - related_order_id: stores request_id (temporarily, until order exists)
--   - related_provider_id: stores provider_id
-- ============================================================================
