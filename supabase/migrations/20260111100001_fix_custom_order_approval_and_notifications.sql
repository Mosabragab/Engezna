-- ============================================================================
-- Fix Custom Order Approval and Notifications
-- إصلاح موافقة العميل وإشعارات الطلبات المفتوحة
--
-- This migration fixes:
-- 1. Customer cannot approve/reject pricing (RLS blocks update)
-- 2. Missing 'data' column in notification tables
-- 3. Notification type mismatch (lowercase vs UPPERCASE)
--
-- @version 2.0
-- @date January 2026
-- ============================================================================

-- ============================================================================
-- 0. Add missing 'data' column to notification tables
-- ============================================================================

-- Add data column to customer_notifications if not exists
ALTER TABLE customer_notifications
ADD COLUMN IF NOT EXISTS data JSONB;

-- Add data column to provider_notifications if not exists
ALTER TABLE provider_notifications
ADD COLUMN IF NOT EXISTS data JSONB;

-- ============================================================================
-- 1. RPC Function for Customer Approval (bypasses RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION customer_approve_custom_order(
  p_request_id UUID,
  p_broadcast_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_request RECORD;
  v_order_id UUID;
  v_result JSONB;
BEGIN
  -- Get the authenticated user
  v_customer_id := auth.uid();

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Verify the customer owns the broadcast
  IF NOT EXISTS (
    SELECT 1 FROM custom_order_broadcasts
    WHERE id = p_broadcast_id
    AND customer_id = v_customer_id
    AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Broadcast not found or not active');
  END IF;

  -- Get the request and verify it's priced
  SELECT cor.*, b.customer_id
  INTO v_request
  FROM custom_order_requests cor
  JOIN custom_order_broadcasts b ON b.id = cor.broadcast_id
  WHERE cor.id = p_request_id
  AND cor.broadcast_id = p_broadcast_id
  AND cor.status = 'priced';

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not priced');
  END IF;

  -- Check if pricing has expired
  IF v_request.pricing_expires_at IS NOT NULL AND v_request.pricing_expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pricing has expired');
  END IF;

  -- Store the order_id for response
  v_order_id := v_request.order_id;

  -- Update request status to approved
  UPDATE custom_order_requests
  SET
    status = 'approved',
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Update order status if order exists
  IF v_order_id IS NOT NULL THEN
    UPDATE orders
    SET
      status = 'accepted',
      pricing_status = 'pricing_approved',
      pricing_responded_at = NOW(),
      updated_at = NOW()
    WHERE id = v_order_id;
  END IF;

  -- Update broadcast to completed
  UPDATE custom_order_broadcasts
  SET
    status = 'completed',
    winning_order_id = v_order_id,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_broadcast_id;

  -- Cancel all other pending/priced requests for this broadcast
  UPDATE custom_order_requests
  SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE broadcast_id = p_broadcast_id
  AND id != p_request_id
  AND status IN ('pending', 'priced');

  -- Cancel corresponding orders
  UPDATE orders
  SET
    status = 'cancelled',
    pricing_status = 'pricing_rejected',
    cancellation_reason = 'تم اختيار تاجر آخر',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE broadcast_id = p_broadcast_id
  AND id != v_order_id
  AND status NOT IN ('cancelled', 'rejected');

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'message', 'Order approved successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION customer_approve_custom_order(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION customer_approve_custom_order IS 'Allows customer to approve a priced custom order request, bypassing RLS';

-- ============================================================================
-- 2. RPC Function for Customer Rejection
-- ============================================================================

CREATE OR REPLACE FUNCTION customer_reject_custom_order(
  p_request_id UUID,
  p_broadcast_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
  v_request RECORD;
BEGIN
  -- Get the authenticated user
  v_customer_id := auth.uid();

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Verify the customer owns the broadcast
  IF NOT EXISTS (
    SELECT 1 FROM custom_order_broadcasts
    WHERE id = p_broadcast_id
    AND customer_id = v_customer_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Broadcast not found');
  END IF;

  -- Get the request and verify it's priced
  SELECT * INTO v_request
  FROM custom_order_requests
  WHERE id = p_request_id
  AND broadcast_id = p_broadcast_id
  AND status = 'priced';

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not priced');
  END IF;

  -- Update request status to rejected
  UPDATE custom_order_requests
  SET
    status = 'rejected',
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Cancel corresponding order if exists
  IF v_request.order_id IS NOT NULL THEN
    UPDATE orders
    SET
      status = 'cancelled',
      pricing_status = 'pricing_rejected',
      cancellation_reason = 'العميل رفض التسعيرة',
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = v_request.order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Quote rejected successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION customer_reject_custom_order(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION customer_reject_custom_order IS 'Allows customer to reject a priced custom order request, bypassing RLS';

-- ============================================================================
-- 3. Update status check constraint to include new values
-- ============================================================================

-- Drop and recreate check constraint on custom_order_requests.status
ALTER TABLE custom_order_requests DROP CONSTRAINT IF EXISTS custom_order_requests_status_check;
ALTER TABLE custom_order_requests ADD CONSTRAINT custom_order_requests_status_check
  CHECK (status IN (
    'pending',
    'pricing_in_progress', -- Important! Used when provider locks order for pricing
    'priced',
    'approved',         -- Simpler version
    'rejected',         -- Simpler version
    'customer_approved', -- Keep for backwards compatibility
    'customer_rejected', -- Keep for backwards compatibility
    'expired',
    'cancelled'
  ));

-- ============================================================================
-- 4. Fix Notification Triggers (UPPERCASE types, use data column)
-- ============================================================================

-- Update notify_custom_order_priced to use UPPERCASE type
-- Store broadcast_id in data column (not related_order_id which has FK constraint)
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

    -- Insert notification for customer with UPPERCASE type
    -- NOTE: related_order_id is NULL, broadcast_id is in data column
    IF v_customer_id IS NOT NULL THEN
      INSERT INTO customer_notifications (
        customer_id,
        type,
        title_ar,
        title_en,
        body_ar,
        body_en,
        related_provider_id,
        data
      ) VALUES (
        v_customer_id,
        'CUSTOM_ORDER_PRICED',
        'تم تسعير طلبك!',
        'Your order has been priced!',
        format('قام %s بتسعير طلبك بـ %s ج.م - راجع العرض الآن!', v_provider_name, NEW.total::text),
        format('%s priced your order at %s EGP - Review now!', v_provider_name, NEW.total::text),
        NEW.provider_id,
        jsonb_build_object(
          'broadcast_id', v_broadcast_id,
          'request_id', NEW.id,
          'provider_id', NEW.provider_id,
          'total', NEW.total,
          'is_custom_order', true
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notify_custom_order_approved for provider
CREATE OR REPLACE FUNCTION notify_custom_order_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_id UUID;
  v_customer_name TEXT;
  v_order_id UUID;
BEGIN
  -- Only trigger when status changes to 'approved' or 'customer_approved'
  IF OLD.status NOT IN ('approved', 'customer_approved')
     AND NEW.status IN ('approved', 'customer_approved') THEN
    v_provider_id := NEW.provider_id;
    v_order_id := NEW.order_id;

    -- Get customer name
    SELECT p.full_name INTO v_customer_name
    FROM custom_order_broadcasts b
    JOIN profiles p ON p.id = b.customer_id
    WHERE b.id = NEW.broadcast_id;

    -- Insert notification for merchant with UPPERCASE type
    -- Use related_order_id for the actual order (has valid FK)
    INSERT INTO provider_notifications (
      provider_id,
      type,
      title_ar,
      title_en,
      body_ar,
      body_en,
      related_order_id,
      data
    ) VALUES (
      v_provider_id,
      'CUSTOM_ORDER_APPROVED',
      'تمت الموافقة على تسعيرتك!',
      'Your quote was approved!',
      format('وافق %s على تسعيرتك. ابدأ تحضير الطلب!', COALESCE(v_customer_name, 'العميل')),
      format('%s approved your quote. Start preparing the order!', COALESCE(v_customer_name, 'Customer')),
      v_order_id,
      jsonb_build_object(
        'request_id', NEW.id,
        'order_id', v_order_id,
        'total', NEW.total,
        'is_custom_order', true
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notify_new_custom_order_request for provider
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

  -- Insert notification for merchant with UPPERCASE type
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
    'NEW_CUSTOM_ORDER',
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
      'input_type', v_input_type,
      'is_custom_order', true
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notify_custom_order_rejected for provider
CREATE OR REPLACE FUNCTION notify_custom_order_rejected()
RETURNS TRIGGER AS $$
DECLARE
  v_broadcast_id UUID;
BEGIN
  -- Only trigger when status changes to 'rejected' or 'customer_rejected'
  IF OLD.status NOT IN ('rejected', 'customer_rejected')
     AND NEW.status IN ('rejected', 'customer_rejected') THEN
    -- Get broadcast id
    SELECT b.id INTO v_broadcast_id
    FROM custom_order_broadcasts b
    WHERE b.id = NEW.broadcast_id;

    -- Notify merchant that their quote was rejected with UPPERCASE type
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
      'CUSTOM_ORDER_REJECTED',
      'تم رفض تسعيرتك',
      'Your quote was rejected',
      'اختار العميل تاجراً آخر',
      'Customer chose another merchant',
      jsonb_build_object(
        'request_id', NEW.id,
        'broadcast_id', v_broadcast_id,
        'is_custom_order', true
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update expire_custom_order_requests function
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

    -- Notify merchant with UPPERCASE type
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
      'PRICING_EXPIRED',
      'فاتتك مهلة التسعير',
      'Pricing deadline missed',
      'انتهت مهلة تسعير طلب مفتوح',
      'A custom order pricing deadline has passed',
      jsonb_build_object(
        'request_id', v_request.id,
        'is_custom_order', true
      )
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
    AND status IN ('priced', 'approved', 'customer_approved')
  );

  RAISE NOTICE 'Expired % custom order requests', v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Recreate triggers
-- ============================================================================

-- Drop and recreate triggers to ensure they use updated functions
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
-- END OF MIGRATION
-- ============================================================================
