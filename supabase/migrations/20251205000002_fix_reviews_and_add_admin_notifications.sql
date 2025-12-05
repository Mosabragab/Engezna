-- ============================================================================
-- Migration: Fix reviews RLS and add comprehensive admin notifications
-- إصلاح سياسات التقييمات وإضافة إشعارات الأدمن الشاملة
-- ============================================================================
-- Date: 2025-12-05
-- Description:
--   1. Fix infinite recursion in reviews RLS policy
--   2. Add triggers for provider registration notifications
--   3. Add triggers for support ticket notifications
--   4. Add pg_cron for delayed orders notification
-- ============================================================================

-- ============================================================================
-- FIX REVIEWS RLS POLICY - Avoid infinite recursion
-- إصلاح سياسة التقييمات - تجنب التكرار اللانهائي
-- ============================================================================

-- Drop all existing reviews policies
DROP POLICY IF EXISTS "Customers can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Providers can respond to reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;

-- Simple policy: Anyone can view reviews (no complex joins)
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

-- Simple policy: Authenticated users can create reviews for their own orders
-- Using a simpler check without nested subqueries that might cause recursion
CREATE POLICY "Customers can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    -- Must be authenticated
    auth.uid() IS NOT NULL
    -- customer_id must match the authenticated user
    AND customer_id = auth.uid()
  );

-- Customers can update their own reviews (simple check)
CREATE POLICY "Customers can update own reviews"
  ON public.reviews FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Providers can update reviews (to add response) - simple check
CREATE POLICY "Providers can respond to reviews"
  ON public.reviews FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_id = auth.uid()
    )
  );

-- ============================================================================
-- ADMIN NOTIFICATION: New Provider Registration
-- إشعار الأدمن: طلب انضمام متجر جديد
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admin_new_provider()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_owner_name TEXT;
BEGIN
  -- Get owner name
  SELECT full_name INTO v_owner_name
  FROM profiles WHERE id = NEW.owner_id;

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
      'provider_registration',
      'طلب انضمام متجر جديد: ' || COALESCE(NEW.name_ar, NEW.name_en),
      'قدم ' || COALESCE(v_owner_name, 'مستخدم') || ' طلب انضمام لمتجر ' || COALESCE(NEW.name_ar, NEW.name_en) || ' - التصنيف: ' || NEW.category
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new provider registration
DROP TRIGGER IF EXISTS trigger_notify_admin_new_provider ON providers;
CREATE TRIGGER trigger_notify_admin_new_provider
  AFTER INSERT ON providers
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_provider();

-- ============================================================================
-- ADMIN NOTIFICATION: Support Ticket Created
-- إشعار الأدمن: تذكرة دعم جديدة
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admin_new_support_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_user_name TEXT;
BEGIN
  -- Get user name
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = NEW.user_id;

  -- Notify all active admins
  FOR v_admin_id IN
    SELECT id FROM admin_users WHERE is_active = true
  LOOP
    INSERT INTO admin_notifications (
      admin_id,
      type,
      title,
      body,
      related_ticket_id
    ) VALUES (
      v_admin_id,
      'support_ticket',
      'تذكرة دعم جديدة: ' || COALESCE(NEW.subject, 'بدون عنوان'),
      'أرسل ' || COALESCE(v_user_name, 'مستخدم') || ' تذكرة دعم جديدة - الأولوية: ' || COALESCE(NEW.priority, 'عادية'),
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new support ticket (only if support_tickets table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
    DROP TRIGGER IF EXISTS trigger_notify_admin_new_support_ticket ON support_tickets;
    CREATE TRIGGER trigger_notify_admin_new_support_ticket
      AFTER INSERT ON support_tickets
      FOR EACH ROW
      EXECUTE FUNCTION notify_admin_new_support_ticket();
  END IF;
END $$;

-- ============================================================================
-- ADMIN NOTIFICATION: Internal Message Received
-- إشعار الأدمن: رسالة داخلية جديدة
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admin_internal_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  -- Get sender name from admin_users
  SELECT
    COALESCE(
      (SELECT full_name FROM profiles WHERE id = au.user_id),
      'مشرف'
    ) INTO v_sender_name
  FROM admin_users au WHERE au.id = NEW.sender_id;

  -- Insert notification for recipient
  INSERT INTO admin_notifications (
    admin_id,
    type,
    title,
    body,
    related_message_id
  ) VALUES (
    NEW.recipient_id,
    'message',
    'رسالة جديدة من ' || COALESCE(v_sender_name, 'مشرف'),
    COALESCE(LEFT(NEW.content, 100), 'رسالة جديدة'),
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for internal messages (only if internal_messages table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'internal_messages') THEN
    DROP TRIGGER IF EXISTS trigger_notify_admin_internal_message ON internal_messages;
    CREATE TRIGGER trigger_notify_admin_internal_message
      AFTER INSERT ON internal_messages
      FOR EACH ROW
      EXECUTE FUNCTION notify_admin_internal_message();
  END IF;
END $$;

-- ============================================================================
-- ADMIN NOTIFICATION: Task Assigned
-- إشعار الأدمن: مهمة جديدة مُسندة
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admin_task_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_assigner_name TEXT;
BEGIN
  -- Only notify if task is being assigned (assignee changed or new task with assignee)
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  -- For updates, only notify if assignee changed
  IF TG_OP = 'UPDATE' AND OLD.assigned_to = NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  -- Get assigner name
  IF NEW.created_by IS NOT NULL THEN
    SELECT
      COALESCE(
        (SELECT full_name FROM profiles WHERE id = au.user_id),
        'مشرف'
      ) INTO v_assigner_name
    FROM admin_users au WHERE au.id = NEW.created_by;
  ELSE
    v_assigner_name := 'النظام';
  END IF;

  -- Insert notification for assignee
  INSERT INTO admin_notifications (
    admin_id,
    type,
    title,
    body,
    related_task_id
  ) VALUES (
    NEW.assigned_to,
    'task',
    'مهمة جديدة: ' || COALESCE(NEW.title, 'بدون عنوان'),
    'أسندت إليك مهمة جديدة من ' || v_assigner_name || ' - الأولوية: ' || COALESCE(NEW.priority, 'عادية'),
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for task assignment (only if admin_tasks table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_tasks') THEN
    DROP TRIGGER IF EXISTS trigger_notify_admin_task_assigned ON admin_tasks;
    CREATE TRIGGER trigger_notify_admin_task_assigned
      AFTER INSERT OR UPDATE ON admin_tasks
      FOR EACH ROW
      EXECUTE FUNCTION notify_admin_task_assigned();
  END IF;
END $$;

-- ============================================================================
-- ADMIN NOTIFICATION: Approval Request
-- إشعار الأدمن: طلب موافقة جديد
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_admin_approval_request()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_requester_name TEXT;
BEGIN
  -- Get requester name
  IF NEW.requested_by IS NOT NULL THEN
    SELECT
      COALESCE(
        (SELECT full_name FROM profiles WHERE id = au.user_id),
        'مشرف'
      ) INTO v_requester_name
    FROM admin_users au WHERE au.id = NEW.requested_by;
  ELSE
    v_requester_name := 'النظام';
  END IF;

  -- Notify specific approvers if set, otherwise notify all admins with approval permissions
  IF NEW.assigned_approver IS NOT NULL THEN
    INSERT INTO admin_notifications (
      admin_id,
      type,
      title,
      body,
      related_approval_id
    ) VALUES (
      NEW.assigned_approver,
      'approval',
      'طلب موافقة: ' || COALESCE(NEW.title, NEW.type),
      'طلب ' || v_requester_name || ' موافقتك على: ' || COALESCE(NEW.description, NEW.type),
      NEW.id
    );
  ELSE
    -- Notify all admins
    FOR v_admin_id IN
      SELECT id FROM admin_users WHERE is_active = true
    LOOP
      INSERT INTO admin_notifications (
        admin_id,
        type,
        title,
        body,
        related_approval_id
      ) VALUES (
        v_admin_id,
        'approval',
        'طلب موافقة: ' || COALESCE(NEW.title, NEW.type),
        'طلب ' || v_requester_name || ' موافقة على: ' || COALESCE(NEW.description, NEW.type),
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for approval requests (only if approval_requests table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_requests') THEN
    DROP TRIGGER IF EXISTS trigger_notify_admin_approval_request ON approval_requests;
    CREATE TRIGGER trigger_notify_admin_approval_request
      AFTER INSERT ON approval_requests
      FOR EACH ROW
      EXECUTE FUNCTION notify_admin_approval_request();
  END IF;
END $$;

-- ============================================================================
-- PG_CRON: Notify admins about delayed orders (> 2 hours)
-- إشعار الأدمن بالطلبات المتأخرة (أكثر من ساعتين)
-- ============================================================================

-- Function to check and notify about delayed orders
CREATE OR REPLACE FUNCTION check_delayed_orders_and_notify()
RETURNS void AS $$
DECLARE
  v_admin_id UUID;
  v_delayed_order RECORD;
  v_provider_name TEXT;
  v_customer_name TEXT;
BEGIN
  -- Find orders that are not completed and created more than 2 hours ago
  -- and haven't been notified yet (we'll use a marker in customer_notes or a separate tracking)
  FOR v_delayed_order IN
    SELECT o.*,
           EXTRACT(EPOCH FROM (NOW() - o.created_at))/3600 as hours_delayed
    FROM orders o
    WHERE o.status NOT IN ('delivered', 'cancelled', 'rejected')
    AND o.created_at < NOW() - INTERVAL '2 hours'
    AND NOT EXISTS (
      -- Check if we already sent a delay notification for this order
      SELECT 1 FROM admin_notifications an
      WHERE an.body LIKE '%' || o.order_number || '%'
      AND an.type = 'order_delayed'
      AND an.created_at > NOW() - INTERVAL '4 hours'
    )
  LOOP
    -- Get provider name
    SELECT name_ar INTO v_provider_name
    FROM providers WHERE id = v_delayed_order.provider_id;

    -- Get customer name
    SELECT full_name INTO v_customer_name
    FROM profiles WHERE id = v_delayed_order.customer_id;

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
        'order_delayed',
        '⚠️ طلب متأخر #' || COALESCE(v_delayed_order.order_number, LEFT(v_delayed_order.id::text, 8)),
        'الطلب من ' || COALESCE(v_provider_name, 'متجر') ||
        ' للعميل ' || COALESCE(v_customer_name, 'غير معروف') ||
        ' متأخر منذ ' || ROUND(v_delayed_order.hours_delayed::numeric, 1) || ' ساعة' ||
        ' - الحالة الحالية: ' || v_delayed_order.status
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PG_CRON SETUP INSTRUCTIONS
-- تعليمات إعداد pg_cron
-- ============================================================================
--
-- To enable pg_cron in Supabase:
-- 1. Go to Database > Extensions in Supabase Dashboard
-- 2. Enable the "pg_cron" extension
--
-- Then run this command in SQL Editor:
--
-- SELECT cron.schedule(
--   'check-delayed-orders',           -- Job name
--   '*/30 * * * *',                   -- Every 30 minutes
--   $$SELECT check_delayed_orders_and_notify()$$
-- );
--
-- To view scheduled jobs:
-- SELECT * FROM cron.job;
--
-- To remove a job:
-- SELECT cron.unschedule('check-delayed-orders');
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERIES
-- استعلامات التحقق
-- ============================================================================
--
-- Check all triggers:
-- SELECT trigger_name, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public';
--
-- Test delayed orders function manually:
-- SELECT check_delayed_orders_and_notify();
--
-- Check admin notifications:
-- SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 10;
-- ============================================================================
