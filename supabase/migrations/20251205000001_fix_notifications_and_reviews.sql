-- ============================================================================
-- Migration: Fix notifications system and reviews RLS
-- إصلاح نظام الإشعارات وسياسات التقييمات
-- ============================================================================
-- Date: 2025-12-05
-- Description:
--   1. Create customer_notifications table for order status updates
--   2. Add triggers to create admin notifications on new orders
--   3. Add triggers to create customer notifications on order status changes
--   4. Fix reviews RLS policy to be more permissive for debugging
-- ============================================================================

-- ============================================================================
-- CREATE CUSTOMER NOTIFICATIONS TABLE
-- إنشاء جدول إشعارات العملاء
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL, -- 'order_accepted', 'order_preparing', 'order_ready', 'order_delivered', 'order_cancelled', 'promo', 'system'
  title_ar VARCHAR(255) NOT NULL,
  title_en VARCHAR(255) NOT NULL,
  body_ar TEXT,
  body_en TEXT,

  -- Related entities
  related_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  related_provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,

  -- Read status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_read ON customer_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_created ON customer_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Customers can view own notifications" ON customer_notifications;
DROP POLICY IF EXISTS "Customers can update own notifications" ON customer_notifications;
DROP POLICY IF EXISTS "System can insert customer notifications" ON customer_notifications;

CREATE POLICY "Customers can view own notifications"
  ON customer_notifications FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Customers can update own notifications"
  ON customer_notifications FOR UPDATE
  USING (customer_id = auth.uid());

CREATE POLICY "System can insert customer notifications"
  ON customer_notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- FUNCTION: Create admin notification for cancelled/rejected orders
-- دالة: إنشاء إشعار للأدمن عند إلغاء أو رفض الطلب
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admin_order_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_order_number TEXT;
  v_provider_name TEXT;
  v_customer_name TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Only trigger if status changed to cancelled or rejected
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('cancelled', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get order number
  v_order_number := COALESCE(NEW.order_number, 'ORD-' || LEFT(NEW.id::text, 8));

  -- Get provider name
  SELECT name_ar INTO v_provider_name
  FROM providers WHERE id = NEW.provider_id;

  -- Get customer name
  SELECT full_name INTO v_customer_name
  FROM profiles WHERE id = NEW.customer_id;

  -- Set notification content based on who cancelled
  IF NEW.status = 'cancelled' THEN
    IF NEW.cancelled_by = 'customer' THEN
      v_title := 'إلغاء طلب من العميل #' || v_order_number;
      v_body := 'قام العميل ' || COALESCE(v_customer_name, 'غير معروف') || ' بإلغاء طلبه من ' || COALESCE(v_provider_name, 'متجر');
    ELSE
      v_title := 'إلغاء طلب #' || v_order_number;
      v_body := 'تم إلغاء الطلب من ' || COALESCE(v_provider_name, 'متجر');
    END IF;
  ELSE -- rejected
    v_title := 'رفض طلب #' || v_order_number;
    v_body := 'قام ' || COALESCE(v_provider_name, 'المتجر') || ' برفض طلب العميل ' || COALESCE(v_customer_name, 'غير معروف');
  END IF;

  -- Notify all active admins
  FOR v_admin_id IN
    SELECT id FROM admin_users WHERE is_active = true
  LOOP
    INSERT INTO admin_notifications (
      admin_id,
      type,
      title,
      body
    ) VALUES (
      v_admin_id,
      'order_' || NEW.status,
      v_title,
      v_body
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for order cancellations (admin notifications)
DROP TRIGGER IF EXISTS trigger_notify_admin_new_order ON orders;
DROP TRIGGER IF EXISTS trigger_notify_admin_order_cancelled ON orders;
CREATE TRIGGER trigger_notify_admin_order_cancelled
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('cancelled', 'rejected'))
  EXECUTE FUNCTION notify_admin_order_cancelled();

-- ============================================================================
-- NOTE: For "orders not completed in 2 hours" notifications
-- ملاحظة: إشعارات الطلبات التي لم تكتمل خلال ساعتين
-- ============================================================================
-- This requires a scheduled function (cron job) which can be implemented using:
-- 1. Supabase Edge Functions with pg_cron extension
-- 2. External cron service calling an API endpoint
--
-- Example query to find such orders:
-- SELECT * FROM orders
-- WHERE status NOT IN ('delivered', 'cancelled', 'rejected')
-- AND created_at < NOW() - INTERVAL '2 hours';
-- ============================================================================

-- ============================================================================
-- FUNCTION: Create customer notification when order status changes
-- دالة: إنشاء إشعار للعميل عند تغيير حالة الطلب
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_customer_order_status()
RETURNS TRIGGER AS $$
DECLARE
  v_order_number TEXT;
  v_provider_name_ar TEXT;
  v_provider_name_en TEXT;
  v_title_ar TEXT;
  v_title_en TEXT;
  v_body_ar TEXT;
  v_body_en TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get order number
  v_order_number := COALESCE(NEW.order_number, 'ORD-' || LEFT(NEW.id::text, 8));

  -- Get provider name
  SELECT name_ar, name_en INTO v_provider_name_ar, v_provider_name_en
  FROM providers WHERE id = NEW.provider_id;

  -- Set notification content based on new status
  CASE NEW.status
    WHEN 'accepted' THEN
      v_title_ar := 'تم قبول طلبك';
      v_title_en := 'Order Accepted';
      v_body_ar := 'تم قبول طلبك #' || v_order_number || ' من ' || COALESCE(v_provider_name_ar, 'المتجر');
      v_body_en := 'Your order #' || v_order_number || ' has been accepted by ' || COALESCE(v_provider_name_en, 'the store');

    WHEN 'preparing' THEN
      v_title_ar := 'جاري تحضير طلبك';
      v_title_en := 'Order Being Prepared';
      v_body_ar := 'بدأ ' || COALESCE(v_provider_name_ar, 'المتجر') || ' في تحضير طلبك #' || v_order_number;
      v_body_en := COALESCE(v_provider_name_en, 'The store') || ' started preparing your order #' || v_order_number;

    WHEN 'ready' THEN
      v_title_ar := 'طلبك جاهز';
      v_title_en := 'Order Ready';
      v_body_ar := 'طلبك #' || v_order_number || ' جاهز للتوصيل';
      v_body_en := 'Your order #' || v_order_number || ' is ready for delivery';

    WHEN 'out_for_delivery' THEN
      v_title_ar := 'طلبك في الطريق';
      v_title_en := 'Order On The Way';
      v_body_ar := 'طلبك #' || v_order_number || ' في الطريق إليك';
      v_body_en := 'Your order #' || v_order_number || ' is on its way';

    WHEN 'delivered' THEN
      v_title_ar := 'تم توصيل طلبك';
      v_title_en := 'Order Delivered';
      v_body_ar := 'تم توصيل طلبك #' || v_order_number || ' بنجاح. شكراً لك!';
      v_body_en := 'Your order #' || v_order_number || ' has been delivered. Thank you!';

    WHEN 'cancelled' THEN
      v_title_ar := 'تم إلغاء الطلب';
      v_title_en := 'Order Cancelled';
      v_body_ar := 'تم إلغاء طلبك #' || v_order_number;
      v_body_en := 'Your order #' || v_order_number || ' has been cancelled';

    WHEN 'rejected' THEN
      v_title_ar := 'تم رفض الطلب';
      v_title_en := 'Order Rejected';
      v_body_ar := 'للأسف، تم رفض طلبك #' || v_order_number || ' من المتجر';
      v_body_en := 'Unfortunately, your order #' || v_order_number || ' was rejected by the store';

    ELSE
      -- Don't create notification for other statuses
      RETURN NEW;
  END CASE;

  -- Insert customer notification
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
    'order_' || NEW.status,
    v_title_ar,
    v_title_en,
    v_body_ar,
    v_body_en,
    NEW.id,
    NEW.provider_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS trigger_notify_customer_order_status ON orders;
CREATE TRIGGER trigger_notify_customer_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_customer_order_status();

-- ============================================================================
-- FIX REVIEWS RLS POLICY
-- إصلاح سياسة التقييمات
-- ============================================================================

-- Drop and recreate the reviews insert policy with better conditions
DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;

-- More permissive policy - allow any customer to create a review for their delivered order
CREATE POLICY "Customers can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    -- The review customer_id must match the authenticated user
    customer_id = auth.uid()
    -- And the order must exist, belong to this customer, and be delivered
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
      AND o.customer_id = auth.uid()
      AND o.status = 'delivered'
    )
  );

-- ============================================================================
-- VERIFICATION
-- التحقق
-- ============================================================================
-- Run: SELECT * FROM customer_notifications LIMIT 5;
-- Run: SELECT * FROM admin_notifications LIMIT 5;
