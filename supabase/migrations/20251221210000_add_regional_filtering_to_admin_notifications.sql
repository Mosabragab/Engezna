-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Add Regional Filtering to Admin Notifications
-- إضافة التصفية الإقليمية لإشعارات المشرفين
-- Date: 2025-12-21
-- Description:
--   1. Add related_provider_id, related_order_id, governorate_id columns
--   2. Update notification triggers to target regional admins
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Add new columns to admin_notifications
-- إضافة أعمدة جديدة لجدول الإشعارات
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add related_provider_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_notifications' AND column_name = 'related_provider_id'
  ) THEN
    ALTER TABLE admin_notifications ADD COLUMN related_provider_id UUID;

    -- Add foreign key constraint
    ALTER TABLE admin_notifications
    ADD CONSTRAINT admin_notifications_related_provider_id_fkey
    FOREIGN KEY (related_provider_id) REFERENCES providers(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added related_provider_id column to admin_notifications';
  END IF;
END $$;

-- Add related_order_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_notifications' AND column_name = 'related_order_id'
  ) THEN
    ALTER TABLE admin_notifications ADD COLUMN related_order_id UUID;

    -- Add foreign key constraint
    ALTER TABLE admin_notifications
    ADD CONSTRAINT admin_notifications_related_order_id_fkey
    FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added related_order_id column to admin_notifications';
  END IF;
END $$;

-- Add governorate_id column for direct regional filtering
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_notifications' AND column_name = 'governorate_id'
  ) THEN
    ALTER TABLE admin_notifications ADD COLUMN governorate_id UUID;

    -- Add foreign key constraint
    ALTER TABLE admin_notifications
    ADD CONSTRAINT admin_notifications_governorate_id_fkey
    FOREIGN KEY (governorate_id) REFERENCES governorates(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added governorate_id column to admin_notifications';
  END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_admin_notifications_provider ON admin_notifications(related_provider_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_order ON admin_notifications(related_order_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_governorate ON admin_notifications(governorate_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Create helper function to get admins for a region
-- إنشاء دالة مساعدة للحصول على المشرفين المسؤولين عن منطقة
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_admins_for_governorate(p_governorate_id UUID)
RETURNS TABLE(admin_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT au.id
  FROM admin_users au
  WHERE au.is_active = true
  AND (
    -- Super admins see all regions
    au.role = 'super_admin'
    OR
    -- Support staff see all regions
    au.role = 'support'
    OR
    -- Regional admins only see their assigned regions
    (
      au.assigned_regions IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(au.assigned_regions) AS region
        WHERE (region->>'governorate_id')::UUID = p_governorate_id
      )
    )
    OR
    -- Admins without assigned_regions see all regions
    (au.assigned_regions IS NULL OR jsonb_array_length(au.assigned_regions) = 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Create improved notification function with regional targeting
-- إنشاء دالة إشعار محسّنة مع استهداف إقليمي
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_regional_admin_notification(
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_body TEXT,
  p_provider_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_governorate_id UUID DEFAULT NULL,
  p_related_task_id UUID DEFAULT NULL,
  p_related_approval_id UUID DEFAULT NULL,
  p_related_ticket_id UUID DEFAULT NULL
)
RETURNS SETOF UUID AS $$
DECLARE
  v_governorate_id UUID;
  v_admin_id UUID;
  v_notification_id UUID;
BEGIN
  -- Determine governorate_id from provider if not provided
  IF p_governorate_id IS NULL AND p_provider_id IS NOT NULL THEN
    SELECT governorate_id INTO v_governorate_id
    FROM providers WHERE id = p_provider_id;
  ELSIF p_governorate_id IS NULL AND p_order_id IS NOT NULL THEN
    SELECT pr.governorate_id INTO v_governorate_id
    FROM orders o
    JOIN providers pr ON pr.id = o.provider_id
    WHERE o.id = p_order_id;
  ELSE
    v_governorate_id := p_governorate_id;
  END IF;

  -- If we have a governorate, notify only relevant admins
  IF v_governorate_id IS NOT NULL THEN
    FOR v_admin_id IN SELECT admin_id FROM get_admins_for_governorate(v_governorate_id) LOOP
      INSERT INTO admin_notifications (
        admin_id,
        type,
        title,
        body,
        related_provider_id,
        related_order_id,
        governorate_id,
        related_task_id,
        related_approval_id,
        related_ticket_id
      ) VALUES (
        v_admin_id,
        p_type,
        p_title,
        p_body,
        p_provider_id,
        p_order_id,
        v_governorate_id,
        p_related_task_id,
        p_related_approval_id,
        p_related_ticket_id
      )
      RETURNING id INTO v_notification_id;

      RETURN NEXT v_notification_id;
    END LOOP;
  ELSE
    -- No governorate - notify all active admins (super_admin and support)
    FOR v_admin_id IN
      SELECT au.id FROM admin_users au
      WHERE au.is_active = true
      AND (au.role = 'super_admin' OR au.role = 'support')
    LOOP
      INSERT INTO admin_notifications (
        admin_id,
        type,
        title,
        body,
        related_provider_id,
        related_order_id,
        governorate_id,
        related_task_id,
        related_approval_id,
        related_ticket_id
      ) VALUES (
        v_admin_id,
        p_type,
        p_title,
        p_body,
        p_provider_id,
        p_order_id,
        NULL,
        p_related_task_id,
        p_related_approval_id,
        p_related_ticket_id
      )
      RETURNING id INTO v_notification_id;

      RETURN NEXT v_notification_id;
    END LOOP;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: Update refund notification trigger to use regional targeting
-- تحديث trigger الاسترداد لاستخدام الاستهداف الإقليمي
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_refund_status_change()
RETURNS TRIGGER AS $$
DECLARE
  order_number TEXT;
  customer_name TEXT;
  provider_name TEXT;
  provider_governorate_id UUID;
  status_text_ar TEXT;
  status_text_en TEXT;
  notification_type TEXT;
BEGIN
  -- Get order and related info including provider's governorate
  SELECT o.order_number, p.full_name, pr.name_ar, pr.governorate_id
  INTO order_number, customer_name, provider_name, provider_governorate_id
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

  -- Notify on escalation - USE REGIONAL TARGETING
  IF NEW.escalated_to_admin = true AND (OLD.escalated_to_admin = false OR OLD.escalated_to_admin IS NULL) THEN
    NEW.escalated_at = NOW();

    -- Create admin notifications using regional targeting function
    PERFORM create_regional_admin_notification(
      'escalation',
      'تصعيد طلب استرداد - #' || order_number,
      'سبب التصعيد: ' || COALESCE(NEW.escalation_reason, 'غير محدد') || ' - المتجر: ' || provider_name,
      NEW.provider_id,
      NEW.order_id,
      provider_governorate_id
    );
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
-- STEP 5: Create trigger for new provider applications with regional targeting
-- إنشاء trigger لطلبات انضمام المتاجر الجديدة مع استهداف إقليمي
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_admin_new_provider()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify when a new provider is created with pending_approval status
  IF NEW.status = 'pending_approval' OR NEW.status = 'incomplete' THEN
    PERFORM create_regional_admin_notification(
      'new_provider',
      'طلب انضمام جديد - ' || NEW.name_ar,
      'متجر جديد يطلب الانضمام: ' || NEW.name_ar || ' (' || NEW.category || ')',
      NEW.id,
      NULL,
      NEW.governorate_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new providers
DROP TRIGGER IF EXISTS trigger_notify_admin_new_provider ON providers;
CREATE TRIGGER trigger_notify_admin_new_provider
  AFTER INSERT ON providers
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_provider();

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6: Create trigger for new orders with regional targeting
-- إنشاء trigger للطلبات الجديدة مع استهداف إقليمي
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_admin_new_order()
RETURNS TRIGGER AS $$
DECLARE
  v_provider_governorate_id UUID;
  v_provider_name TEXT;
BEGIN
  -- Get provider info
  SELECT governorate_id, name_ar INTO v_provider_governorate_id, v_provider_name
  FROM providers WHERE id = NEW.provider_id;

  -- Create notification for new orders (optional - can be disabled if too noisy)
  -- Uncomment below to enable notifications for all new orders
  /*
  PERFORM create_regional_admin_notification(
    'new_order',
    'طلب جديد - #' || NEW.order_number,
    'طلب جديد من ' || v_provider_name || ' بقيمة ' || NEW.total || ' ج.م',
    NEW.provider_id,
    NEW.id,
    v_provider_governorate_id
  );
  */

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new orders (disabled by default - uncomment to enable)
-- DROP TRIGGER IF EXISTS trigger_notify_admin_new_order ON orders;
-- CREATE TRIGGER trigger_notify_admin_new_order
--   AFTER INSERT ON orders
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_admin_new_order();

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- التحقق
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check if columns were added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_notifications'
    AND column_name IN ('related_provider_id', 'related_order_id', 'governorate_id')
  ) THEN
    RAISE NOTICE 'Migration successful: regional filtering columns added to admin_notifications';
  ELSE
    RAISE WARNING 'Migration may have issues: columns not found';
  END IF;
END $$;
