-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Refund Notification Column Names
-- Date: 2025-12-23
-- Description:
--   Fix the trigger function that creates customer notifications for refund status
--   changes. The function was using wrong column names (message_ar/message_en)
--   instead of the correct ones (body_ar/body_en).
--   Also adds missing 'data' column for JSONB metadata.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ADD MISSING 'data' COLUMN TO customer_notifications
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE customer_notifications
  ADD COLUMN IF NOT EXISTS data JSONB;

ALTER TABLE customer_notifications
  ADD COLUMN IF NOT EXISTS related_refund_id UUID REFERENCES refunds(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. FIX THE TRIGGER FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_notify_refund_status ON refunds;

-- Recreate the function with CORRECT column names
CREATE OR REPLACE FUNCTION notify_refund_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_order_number TEXT;
  v_customer_name TEXT;
  v_provider_name TEXT;
  v_status_text_ar TEXT;
  v_status_text_en TEXT;
  v_notification_type TEXT;
BEGIN
  -- Get order and related info
  SELECT o.order_number, p.full_name, pr.name_ar
  INTO v_order_number, v_customer_name, v_provider_name
  FROM orders o
  LEFT JOIN profiles p ON p.id = o.customer_id
  LEFT JOIN providers pr ON pr.id = o.provider_id
  WHERE o.id = NEW.order_id;

  -- Notify on provider action change
  IF NEW.provider_action IS DISTINCT FROM OLD.provider_action THEN
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
        body_ar,  -- FIXED: was message_ar
        body_en,  -- FIXED: was message_en
        type,
        data
      ) VALUES (
        NEW.customer_id,
        'تحديث طلب الاسترداد',
        'Refund Update',
        v_status_text_ar || ' - الطلب #' || COALESCE(v_order_number, NEW.order_id::TEXT),
        v_status_text_en || ' - Order #' || COALESCE(v_order_number, NEW.order_id::TEXT),
        'order_update',
        jsonb_build_object(
          'refund_id', NEW.id,
          'order_id', NEW.order_id,
          'provider_action', NEW.provider_action,
          'amount', NEW.amount,
          'notification_type', v_notification_type,
          'requires_confirmation', NEW.provider_action = 'cash_refund',
          'confirmation_deadline', NEW.confirmation_deadline
        )
      );
      RAISE NOTICE 'Created customer notification for refund % with action %', NEW.id, NEW.provider_action;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create customer notification for refund %: %', NEW.id, SQLERRM;
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
        'أكد العميل استلام المبلغ المسترد للطلب #' || COALESCE(v_order_number, NEW.order_id::TEXT) || ' بقيمة ' || NEW.amount || ' ج.م',
        'Customer confirmed refund receipt for order #' || COALESCE(v_order_number, NEW.order_id::TEXT) || ' worth ' || NEW.amount || ' EGP',
        NEW.order_id,
        NEW.customer_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create provider confirmation notification: %', SQLERRM;
    END;
  END IF;

  -- Notify on escalation
  IF NEW.escalated_to_admin = true AND (OLD.escalated_to_admin = false OR OLD.escalated_to_admin IS NULL) THEN
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
        'تصعيد طلب استرداد - #' || COALESCE(v_order_number, NEW.order_id::TEXT),
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
CREATE TRIGGER trigger_notify_refund_status
  AFTER UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION notify_refund_status_change();

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFY: Check if customer_notifications has the correct columns
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  has_body_ar BOOLEAN;
  has_body_en BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_notifications' AND column_name = 'body_ar'
  ) INTO has_body_ar;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_notifications' AND column_name = 'body_en'
  ) INTO has_body_en;

  IF has_body_ar AND has_body_en THEN
    RAISE NOTICE '✅ Column verification passed: body_ar and body_en exist';
  ELSE
    RAISE WARNING '❌ Column verification failed! body_ar=%s, body_en=%s', has_body_ar, has_body_en;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUCCESS LOG
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: Fixed refund notification column names';
  RAISE NOTICE '   - Changed message_ar → body_ar';
  RAISE NOTICE '   - Changed message_en → body_en';
  RAISE NOTICE '   - Trigger recreated successfully';
END $$;
