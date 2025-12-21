-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Complete Fix for Refund Notifications
-- Date: 2025-12-21
-- Description:
--   1. Add related_refund_id to admin_notifications
--   2. Create trigger for admin notifications on new refund
--   3. Fix provider notification trigger
--   4. Ensure all notifications work correctly
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ADD related_refund_id TO admin_notifications
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE admin_notifications
  ADD COLUMN IF NOT EXISTS related_refund_id UUID REFERENCES refunds(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_refund ON admin_notifications(related_refund_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. FIX PROVIDER NOTIFICATION TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_notify_provider_new_refund ON refunds;

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION notify_provider_new_refund()
RETURNS TRIGGER AS $$
DECLARE
  v_order_number TEXT;
BEGIN
  -- Only for new inserts from customers
  IF NEW.request_source = 'customer' THEN
    -- Get order number
    SELECT order_number INTO v_order_number
    FROM orders WHERE id = NEW.order_id;

    -- Create provider notification with error handling
    BEGIN
      INSERT INTO provider_notifications (
        provider_id,
        type,
        title_ar,
        title_en,
        body_ar,
        body_en,
        related_order_id,
        related_customer_id
      ) VALUES (
        NEW.provider_id,
        'new_refund_request',
        'طلب استرداد جديد',
        'New Refund Request',
        'لديك طلب استرداد جديد للطلب #' || COALESCE(v_order_number, NEW.order_id::TEXT) || ' بقيمة ' || NEW.amount || ' ج.م',
        'You have a new refund request for order #' || COALESCE(v_order_number, NEW.order_id::TEXT) || ' worth ' || NEW.amount || ' EGP',
        NEW.order_id,
        NEW.customer_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create provider notification: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_provider_new_refund
  AFTER INSERT ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_new_refund();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. CREATE ADMIN NOTIFICATION TRIGGER FOR NEW REFUNDS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_admin_new_refund()
RETURNS TRIGGER AS $$
DECLARE
  v_order_number TEXT;
  v_customer_name TEXT;
  v_provider_name TEXT;
BEGIN
  -- Get order and related info
  SELECT o.order_number, p.full_name, pr.name_ar
  INTO v_order_number, v_customer_name, v_provider_name
  FROM orders o
  LEFT JOIN profiles p ON p.id = o.customer_id
  LEFT JOIN providers pr ON pr.id = o.provider_id
  WHERE o.id = NEW.order_id;

  -- Create admin notification for all active admins (super_admin and support roles)
  INSERT INTO admin_notifications (
    admin_id,
    type,
    title,
    body,
    related_refund_id
  )
  SELECT
    au.id,
    'new_refund_request',
    'طلب استرداد جديد - #' || COALESCE(v_order_number, NEW.order_id::TEXT),
    'العميل: ' || COALESCE(v_customer_name, 'غير معروف') ||
    ' | المتجر: ' || COALESCE(v_provider_name, 'غير معروف') ||
    ' | المبلغ: ' || NEW.amount || ' ج.م' ||
    ' | السبب: ' || COALESCE(NEW.reason_ar, NEW.reason, 'غير محدد'),
    NEW.id
  FROM admin_users au
  WHERE au.is_active = true
  AND (au.role = 'super_admin' OR au.role = 'support' OR au.role = 'admin');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create admin notification for refund: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_admin_new_refund ON refunds;

-- Create trigger
CREATE TRIGGER trigger_notify_admin_new_refund
  AFTER INSERT ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_refund();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. UPDATE ESCALATION TRIGGER TO USE related_refund_id
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_refund_status_change()
RETURNS TRIGGER AS $$
DECLARE
  order_number TEXT;
  customer_name TEXT;
  provider_name TEXT;
  status_text_ar TEXT;
  status_text_en TEXT;
  notification_type TEXT;
BEGIN
  -- Get order and related info
  SELECT o.order_number, p.full_name, pr.name_ar
  INTO order_number, customer_name, provider_name
  FROM orders o
  LEFT JOIN profiles p ON p.id = o.customer_id
  LEFT JOIN providers pr ON pr.id = o.provider_id
  WHERE o.id = NEW.order_id;

  -- Notify on provider action change
  IF NEW.provider_action != COALESCE(OLD.provider_action, 'pending') THEN
    CASE NEW.provider_action
      WHEN 'cash_refund' THEN
        status_text_ar := 'أكد التاجر رد المبلغ كاش مع المندوب';
        status_text_en := 'Merchant confirmed cash refund via delivery';
        notification_type := 'refund_cash_confirmed';
      WHEN 'item_resend' THEN
        status_text_ar := 'سيتم إعادة إرسال الصنف الناقص';
        status_text_en := 'Missing item will be resent';
        notification_type := 'refund_item_resend';
      WHEN 'rejected' THEN
        status_text_ar := 'رفض التاجر طلب الاسترداد';
        status_text_en := 'Merchant rejected refund request';
        notification_type := 'refund_rejected';
      WHEN 'escalated' THEN
        status_text_ar := 'تم تصعيد الطلب للإدارة';
        status_text_en := 'Request escalated to admin';
        notification_type := 'refund_escalated';
      ELSE
        RETURN NEW;
    END CASE;

    -- Create customer notification
    BEGIN
      INSERT INTO customer_notifications (
        customer_id,
        title_ar,
        title_en,
        message_ar,
        message_en,
        type,
        data
      ) VALUES (
        NEW.customer_id,
        'تحديث طلب الاسترداد',
        'Refund Update',
        status_text_ar || ' - الطلب #' || order_number,
        status_text_en || ' - Order #' || order_number,
        'order_update',
        jsonb_build_object(
          'refund_id', NEW.id,
          'order_id', NEW.order_id,
          'provider_action', NEW.provider_action,
          'amount', NEW.amount,
          'notification_type', notification_type,
          'requires_confirmation', NEW.provider_action = 'cash_refund',
          'confirmation_deadline', NEW.confirmation_deadline
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create customer notification: %', SQLERRM;
    END;
  END IF;

  -- Notify on customer confirmation
  IF NEW.customer_confirmed = true AND (OLD.customer_confirmed = false OR OLD.customer_confirmed IS NULL) THEN
    -- Notify provider that customer confirmed
    BEGIN
      INSERT INTO provider_notifications (
        provider_id,
        type,
        title_ar,
        title_en,
        body_ar,
        body_en,
        related_order_id,
        related_customer_id
      ) VALUES (
        NEW.provider_id,
        'refund_confirmed',
        'تم تأكيد الاسترداد',
        'Refund Confirmed',
        'أكد العميل استلام المبلغ المسترد للطلب #' || order_number || ' بقيمة ' || NEW.amount || ' ج.م',
        'Customer confirmed refund receipt for order #' || order_number || ' worth ' || NEW.amount || ' EGP',
        NEW.order_id,
        NEW.customer_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create provider confirmation notification: %', SQLERRM;
    END;
  END IF;

  -- Notify on escalation
  IF NEW.escalated_to_admin = true AND (OLD.escalated_to_admin = false OR OLD.escalated_to_admin IS NULL) THEN
    NEW.escalated_at = NOW();

    -- Create admin notification for escalation
    BEGIN
      INSERT INTO admin_notifications (
        admin_id,
        type,
        title,
        body,
        related_refund_id
      )
      SELECT
        au.id,
        'refund_escalated',
        'تصعيد طلب استرداد - #' || order_number,
        'سبب التصعيد: ' || COALESCE(NEW.escalation_reason, 'غير محدد') ||
        ' | المبلغ: ' || NEW.amount || ' ج.م',
        NEW.id
      FROM admin_users au
      WHERE au.is_active = true
      AND (au.role = 'super_admin' OR au.role = 'support' OR au.role = 'admin');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create admin escalation notification: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_notify_refund_status ON refunds;
CREATE TRIGGER trigger_notify_refund_status
  AFTER UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION notify_refund_status_change();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT INSERT ON admin_notifications TO authenticated;
GRANT INSERT ON provider_notifications TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. MANUALLY CREATE NOTIFICATIONS FOR EXISTING PENDING REFUNDS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create admin notifications for existing pending refunds that don't have notifications
INSERT INTO admin_notifications (admin_id, type, title, body, related_refund_id)
SELECT
  au.id,
  'new_refund_request',
  'طلب استرداد جديد - #' || COALESCE(o.order_number, r.order_id::TEXT),
  'العميل: ' || COALESCE(p.full_name, 'غير معروف') ||
  ' | المتجر: ' || COALESCE(pr.name_ar, 'غير معروف') ||
  ' | المبلغ: ' || r.amount || ' ج.م',
  r.id
FROM refunds r
CROSS JOIN admin_users au
LEFT JOIN orders o ON o.id = r.order_id
LEFT JOIN profiles p ON p.id = r.customer_id
LEFT JOIN providers pr ON pr.id = r.provider_id
WHERE r.status = 'pending'
AND au.is_active = true
AND (au.role = 'super_admin' OR au.role = 'support' OR au.role = 'admin')
AND NOT EXISTS (
  SELECT 1 FROM admin_notifications an
  WHERE an.related_refund_id = r.id
);

-- Create provider notifications for existing pending refunds that don't have notifications
INSERT INTO provider_notifications (provider_id, type, title_ar, title_en, body_ar, body_en, related_order_id, related_customer_id)
SELECT
  r.provider_id,
  'new_refund_request',
  'طلب استرداد جديد',
  'New Refund Request',
  'لديك طلب استرداد جديد للطلب #' || COALESCE(o.order_number, r.order_id::TEXT) || ' بقيمة ' || r.amount || ' ج.م',
  'You have a new refund request for order #' || COALESCE(o.order_number, r.order_id::TEXT) || ' worth ' || r.amount || ' EGP',
  r.order_id,
  r.customer_id
FROM refunds r
LEFT JOIN orders o ON o.id = r.order_id
WHERE r.status = 'pending'
AND r.request_source = 'customer'
AND NOT EXISTS (
  SELECT 1 FROM provider_notifications pn
  WHERE pn.related_order_id = r.order_id
  AND pn.type = 'new_refund_request'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. LOG SUCCESS
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Refund notifications fix completed:';
  RAISE NOTICE '   - Added related_refund_id to admin_notifications';
  RAISE NOTICE '   - Created trigger for admin notifications on new refunds';
  RAISE NOTICE '   - Fixed provider notification trigger';
  RAISE NOTICE '   - Created notifications for existing pending refunds';
END $$;
