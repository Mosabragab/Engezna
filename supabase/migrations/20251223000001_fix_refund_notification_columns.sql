-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Refund Notification Column Names
-- Date: 2025-12-23
-- Description:
--   Fix the trigger function that creates customer notifications for refund status
--   changes. The function was using wrong column names (message_ar/message_en)
--   instead of the correct ones (body_ar/body_en).
-- ═══════════════════════════════════════════════════════════════════════════════

-- Recreate the function with CORRECT column names
CREATE OR REPLACE FUNCTION notify_refund_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_order_number TEXT;
  v_customer_name TEXT;
  v_provider_name TEXT;
  v_provider_governorate_id UUID;
  v_status_text_ar TEXT;
  v_status_text_en TEXT;
  v_notification_type TEXT;
BEGIN
  -- Get order and related info including provider's governorate
  SELECT o.order_number, p.full_name, pr.name_ar, pr.governorate_id
  INTO v_order_number, v_customer_name, v_provider_name, v_provider_governorate_id
  FROM orders o
  LEFT JOIN profiles p ON p.id = o.customer_id
  LEFT JOIN providers pr ON pr.id = o.provider_id
  WHERE o.id = NEW.order_id;

  -- Notify on provider action change
  IF NEW.provider_action != COALESCE(OLD.provider_action, 'pending') THEN
    CASE NEW.provider_action
      WHEN 'cash_refund' THEN
        v_status_text_ar := 'أكد المتجر رد المبلغ كاش - يرجى تأكيد استلام المبلغ';
        v_status_text_en := 'Store confirmed cash refund - Please confirm receipt';
        v_notification_type := 'refund_cash_confirmed';
      WHEN 'item_resend' THEN
        v_status_text_ar := 'سيتم إعادة إرسال الصنف الناقص';
        v_status_text_en := 'Missing item will be resent';
        v_notification_type := 'refund_item_resend';
      WHEN 'rejected' THEN
        v_status_text_ar := 'رفض المتجر طلب الاسترداد';
        v_status_text_en := 'Store rejected refund request';
        v_notification_type := 'refund_rejected';
      WHEN 'escalated' THEN
        v_status_text_ar := 'تم تصعيد الطلب للإدارة';
        v_status_text_en := 'Request escalated to admin';
        v_notification_type := 'refund_escalated';
      ELSE
        RETURN NEW;
    END CASE;

    -- Create customer notification with CORRECT column names (body_ar, body_en)
    BEGIN
      INSERT INTO customer_notifications (
        customer_id,
        title_ar,
        title_en,
        body_ar,          -- FIXED: was message_ar
        body_en,          -- FIXED: was message_en
        type,
        related_order_id  -- FIXED: removed 'data' column (doesn't exist)
      ) VALUES (
        NEW.customer_id,
        'تحديث طلب الاسترداد',
        'Refund Update',
        v_status_text_ar || ' - الطلب #' || COALESCE(v_order_number, ''),
        v_status_text_en || ' - Order #' || COALESCE(v_order_number, ''),
        'order_update',
        NEW.order_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create customer notification: %', SQLERRM;
    END;
  END IF;

  -- Notify on customer confirmation (this part was already correct)
  IF NEW.customer_confirmed = true AND (OLD.customer_confirmed = false OR OLD.customer_confirmed IS NULL) THEN
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
        'أكد العميل استلام المبلغ المسترد للطلب #' || COALESCE(v_order_number, '') || ' بقيمة ' || NEW.amount || ' ج.م',
        'Customer confirmed refund receipt for order #' || COALESCE(v_order_number, '') || ' worth ' || NEW.amount || ' EGP',
        NEW.order_id,
        NEW.customer_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create provider notification: %', SQLERRM;
    END;
  END IF;

  -- Notify on escalation - USE REGIONAL TARGETING
  IF NEW.escalated_to_admin = true AND (OLD.escalated_to_admin = false OR OLD.escalated_to_admin IS NULL) THEN
    PERFORM create_regional_admin_notification(
      'escalation',
      'تصعيد طلب استرداد - #' || COALESCE(v_order_number, ''),
      'سبب التصعيد: ' || COALESCE(NEW.escalation_reason, 'غير محدد') || ' - المتجر: ' || COALESCE(v_provider_name, ''),
      NEW.provider_id,
      NEW.order_id,
      v_provider_governorate_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUCCESS LOG
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: Fixed refund notification column names';
  RAISE NOTICE '   - Changed message_ar → body_ar';
  RAISE NOTICE '   - Changed message_en → body_en';
  RAISE NOTICE '   - Removed data column (does not exist in table)';
  RAISE NOTICE '   - Added related_order_id for navigation';
END $$;
