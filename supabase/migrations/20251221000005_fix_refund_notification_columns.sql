-- ============================================================================
-- Fix: Customer Notification Column Names in Refund Trigger
-- إصلاح: أسماء الأعمدة في إشعارات الاسترداد
-- ============================================================================
-- Date: 2025-12-21
-- Issue: notify_refund_status_change uses wrong column names
--        (message_ar/message_en instead of body_ar/body_en)
-- ============================================================================

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
        status_text_ar := 'أكد التاجر ' || COALESCE(provider_name, 'المتجر') || ' رد المبلغ (' || NEW.amount || ' ج.م) كاش مع المندوب. يرجى تأكيد الاستلام خلال 48 ساعة.';
        status_text_en := COALESCE(provider_name, 'Merchant') || ' confirmed cash refund (' || NEW.amount || ' EGP) via delivery. Please confirm receipt within 48 hours.';
        notification_type := 'refund_cash_confirmed';
      WHEN 'item_resend' THEN
        status_text_ar := 'سيتم إعادة إرسال الصنف الناقص - الطلب #' || order_number;
        status_text_en := 'Missing item will be resent - Order #' || order_number;
        notification_type := 'refund_item_resend';
      WHEN 'rejected' THEN
        status_text_ar := 'رفض التاجر طلب الاسترداد - الطلب #' || order_number;
        status_text_en := 'Merchant rejected refund request - Order #' || order_number;
        notification_type := 'refund_rejected';
      WHEN 'escalated' THEN
        status_text_ar := 'تم تصعيد الطلب للإدارة - سيتم التواصل معك قريباً';
        status_text_en := 'Request escalated to admin - We will contact you soon';
        notification_type := 'refund_escalated';
      ELSE
        RETURN NEW;
    END CASE;

    -- Create customer notification with CORRECT column names
    BEGIN
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
        'refund_update',
        CASE NEW.provider_action
          WHEN 'cash_refund' THEN 'تأكيد استلام المبلغ المسترد'
          WHEN 'item_resend' THEN 'إعادة إرسال الصنف'
          WHEN 'rejected' THEN 'رفض طلب الاسترداد'
          WHEN 'escalated' THEN 'تصعيد للإدارة'
          ELSE 'تحديث طلب الاسترداد'
        END,
        CASE NEW.provider_action
          WHEN 'cash_refund' THEN 'Confirm Refund Receipt'
          WHEN 'item_resend' THEN 'Item Resend'
          WHEN 'rejected' THEN 'Refund Rejected'
          WHEN 'escalated' THEN 'Escalated to Admin'
          ELSE 'Refund Update'
        END,
        status_text_ar,
        status_text_en,
        NEW.order_id,
        NEW.provider_id
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
      AND (au.role = 'super_admin' OR au.role = 'support');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create admin escalation notification: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Also add related_refund_id column to admin_notifications if not exists
-- ============================================================================
ALTER TABLE admin_notifications
  ADD COLUMN IF NOT EXISTS related_refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_refund ON admin_notifications(related_refund_id);

-- ============================================================================
-- END OF FIX
-- ============================================================================
