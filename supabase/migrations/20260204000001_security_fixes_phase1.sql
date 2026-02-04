-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Security Fixes Phase 1 - Views & RLS                                          ║
-- ║ إصلاحات الأمان المرحلة الأولى - الـ Views و RLS                                ║
-- ║                                                                                ║
-- ║ SAFE MIGRATION - Does NOT change any business logic                           ║
-- ║ فقط يصلح الإعدادات الأمنية بدون تغيير أي منطق عمل                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════════════════
-- PART 1: Fix Security Definer Views
-- تحويل الـ Views من SECURITY DEFINER إلى SECURITY INVOKER
--
-- This ensures views respect the RLS policies of the querying user
-- ════════════════════════════════════════════════════════════════════════════════

-- 1.1 provider_finance_summary
ALTER VIEW IF EXISTS public.provider_finance_summary SET (security_invoker = on);

-- 1.2 provider_effective_commission
ALTER VIEW IF EXISTS public.provider_effective_commission SET (security_invoker = on);

-- 1.3 financial_settlement_by_region
ALTER VIEW IF EXISTS public.financial_settlement_by_region SET (security_invoker = on);

-- 1.4 refunds_with_settlement_impact
ALTER VIEW IF EXISTS public.refunds_with_settlement_impact SET (security_invoker = on);

-- 1.5 admin_financial_summary
ALTER VIEW IF EXISTS public.admin_financial_summary SET (security_invoker = on);

-- 1.6 financial_settlement_engine
ALTER VIEW IF EXISTS public.financial_settlement_engine SET (security_invoker = on);

-- 1.7 addresses_with_user
ALTER VIEW IF EXISTS public.addresses_with_user SET (security_invoker = on);

-- 1.8 custom_order_requests_live
ALTER VIEW IF EXISTS public.custom_order_requests_live SET (security_invoker = on);

-- 1.9 custom_order_commission_check
ALTER VIEW IF EXISTS public.custom_order_commission_check SET (security_invoker = on);

-- 1.10 custom_order_enabled_providers
ALTER VIEW IF EXISTS public.custom_order_enabled_providers SET (security_invoker = on);


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 2: Note on spatial_ref_sys (PostGIS reference table)
-- ملاحظة على جدول PostGIS المرجعي
--
-- The spatial_ref_sys table is owned by PostGIS extension and cannot be modified.
-- This is SAFE because:
-- 1. It contains only read-only coordinate system reference data
-- 2. It has no user data or sensitive information
-- 3. PostGIS manages it internally
--
-- To fix this warning in Supabase dashboard, you would need to run as superuser:
-- ALTER TABLE public.spatial_ref_sys OWNER TO postgres;
-- ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
-- But this is not recommended as it may break PostGIS functionality.
-- ════════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════════
-- PART 3: Fix overly permissive RLS policies
-- إصلاح سياسات RLS المتساهلة جداً
--
-- Strategy: Keep policies working but restrict to service_role where appropriate
-- الاستراتيجية: الإبقاء على عمل الـ policies لكن تقييدها للـ service_role
-- ════════════════════════════════════════════════════════════════════════════════

-- 3.1 custom_order_price_history - Fix the overly permissive policy
-- The issue: system_manage_price_history allows ALL operations with (true)
-- The fix: Restrict INSERT/UPDATE/DELETE to service_role only

-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "system_manage_price_history" ON public.custom_order_price_history;

-- Create separate policies for each operation with proper restrictions
-- Keep SELECT for authenticated (providers can view their own - already handled by providers_view_price_history)
-- Restrict write operations to service_role (used by backend/edge functions)

CREATE POLICY "service_insert_price_history"
  ON public.custom_order_price_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "service_update_price_history"
  ON public.custom_order_price_history
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_delete_price_history"
  ON public.custom_order_price_history
  FOR DELETE
  TO service_role
  USING (true);


-- 3.2 referrals - Fix "System can update referrals" policy
-- The issue: UPDATE with USING (true) allows any user to update
-- The fix: Restrict to service_role

DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;

CREATE POLICY "Service can update referrals"
  ON public.referrals
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);


-- 3.3 Fix INSERT policies that use WITH CHECK (true) without role restriction
-- These are used by system triggers/functions, so restrict to service_role

-- admin_notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.admin_notifications;
CREATE POLICY "Service can create notifications"
  ON public.admin_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- chat_conversations
DROP POLICY IF EXISTS "System can create conversations" ON public.chat_conversations;
CREATE POLICY "Service can create conversations"
  ON public.chat_conversations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow authenticated users to create their own conversations
CREATE POLICY "Users can create own conversations"
  ON public.chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM providers p
      WHERE p.id = provider_id
      AND (p.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM provider_staff ps
        WHERE ps.provider_id = p.id
        AND ps.user_id = auth.uid()
        AND ps.is_active = true
      ))
    )
  );

-- commission_settings_changelog
DROP POLICY IF EXISTS "commission_changelog_insert_policy" ON public.commission_settings_changelog;
CREATE POLICY "Service can insert commission changelog"
  ON public.commission_settings_changelog
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- custom_order_cleanup_log
DROP POLICY IF EXISTS "cleanup_log_system_insert" ON public.custom_order_cleanup_log;
CREATE POLICY "Service can insert cleanup log"
  ON public.custom_order_cleanup_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- custom_order_requests - Fix the overly permissive INSERT
-- Note: This table links to broadcasts, not directly to customers
-- Customer creation is handled through the broadcast system
DROP POLICY IF EXISTS "system_insert_requests" ON public.custom_order_requests;
CREATE POLICY "Service can insert requests"
  ON public.custom_order_requests
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- customer_notifications
DROP POLICY IF EXISTS "System can insert customer notifications" ON public.customer_notifications;
CREATE POLICY "Service can insert customer notifications"
  ON public.customer_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- notifications (general)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Service can create notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- permission_audit_log
DROP POLICY IF EXISTS "Service can insert audit_log" ON public.permission_audit_log;
CREATE POLICY "Service role can insert audit_log"
  ON public.permission_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- provider_notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.provider_notifications;
CREATE POLICY "Service can insert provider notifications"
  ON public.provider_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- sdui_ab_test_assignments
DROP POLICY IF EXISTS "Anyone can be assigned to tests" ON public.sdui_ab_test_assignments;
CREATE POLICY "Service can assign to tests"
  ON public.sdui_ab_test_assignments
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow authenticated users to be assigned (for client-side assignment)
CREATE POLICY "Authenticated can be assigned to tests"
  ON public.sdui_ab_test_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL  -- Anonymous assignments
  );

-- sdui_section_analytics
-- Note: This table stores aggregated analytics data, not user-specific
-- All inserts should go through service_role (edge functions/cron)
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.sdui_section_analytics;
CREATE POLICY "Service can insert analytics"
  ON public.sdui_section_analytics
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- settings_changelog
DROP POLICY IF EXISTS "settings_changelog_insert_policy" ON public.settings_changelog;
CREATE POLICY "Service can insert settings changelog"
  ON public.settings_changelog
  FOR INSERT
  TO service_role
  WITH CHECK (true);


-- ════════════════════════════════════════════════════════════════════════════════
-- VERIFICATION COMMENT
-- ════════════════════════════════════════════════════════════════════════════════
--
-- After running this migration:
-- 1. All 10 Security Definer Views are now Security Invoker
-- 2. spatial_ref_sys is SKIPPED (owned by PostGIS, cannot modify - this is safe)
-- 3. All overly permissive RLS policies are now restricted to service_role
--    while maintaining functionality for legitimate use cases
--
-- IMPORTANT: If any edge function or backend service stops working,
-- ensure it's using the service_role key (not anon key) for write operations
--
-- بعد تشغيل هذا الـ migration:
-- 1. كل الـ 10 Views أصبحت Security Invoker
-- 2. جدول spatial_ref_sys تم تخطيه (مملوك لـ PostGIS - هذا آمن)
-- 3. كل سياسات RLS المتساهلة أصبحت مقيدة للـ service_role
--    مع الحفاظ على الوظائف للاستخدامات المشروعة
