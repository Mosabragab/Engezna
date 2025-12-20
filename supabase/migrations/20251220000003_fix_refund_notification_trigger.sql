-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Refund Notification Trigger
-- Date: 2025-12-20
-- Description: Fix column names in notify_refund_status_change trigger
--              provider_notifications uses body_ar/body_en, not message_ar/message_en
--              Also uses related_order_id instead of data JSONB
-- ═══════════════════════════════════════════════════════════════════════════════

-- Fix the notification trigger to use correct column names
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
  END IF;

  -- Notify on customer confirmation
  IF NEW.customer_confirmed = true AND (OLD.customer_confirmed = false OR OLD.customer_confirmed IS NULL) THEN
    -- Notify provider that customer confirmed
    -- Using correct column names: body_ar, body_en, related_order_id
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
  END IF;

  -- Notify on escalation
  IF NEW.escalated_to_admin = true AND (OLD.escalated_to_admin = false OR OLD.escalated_to_admin IS NULL) THEN
    NEW.escalated_at = NOW();

    -- Create admin notification
    INSERT INTO admin_notifications (
      admin_id,
      type,
      title,
      body,
      related_ticket_id
    )
    SELECT
      au.id,
      'escalation',
      'تصعيد طلب استرداد - #' || order_number,
      'سبب التصعيد: ' || COALESCE(NEW.escalation_reason, 'غير محدد'),
      NULL
    FROM admin_users au
    WHERE au.is_active = true
    AND (au.role = 'super_admin' OR au.role = 'support');
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
-- Ensure provider can view refunds
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop conflicting policies and recreate clean ones
DROP POLICY IF EXISTS "Customers can view their own refunds" ON refunds;
DROP POLICY IF EXISTS "Customers can view their refunds" ON refunds;
DROP POLICY IF EXISTS "Providers can view their refunds" ON refunds;

-- Combined policy for customers and providers to view refunds
CREATE POLICY "Users can view their refunds"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (
    -- Customers can see their own refunds
    customer_id = auth.uid()
    OR
    -- Providers can see refunds for their store
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = refunds.provider_id
      AND providers.owner_id = auth.uid()
    )
    OR
    -- Admins can see all refunds
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- Create trigger to notify provider on new refund request
-- ═══════════════════════════════════════════════════════════════════════════════

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

    -- Create provider notification
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_provider_new_refund ON refunds;
CREATE TRIGGER trigger_notify_provider_new_refund
  AFTER INSERT ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_new_refund();

-- ═══════════════════════════════════════════════════════════════════════════════
-- Grant necessary permissions
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT INSERT ON provider_notifications TO authenticated;
GRANT SELECT, UPDATE, DELETE ON provider_notifications TO authenticated;
