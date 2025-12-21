-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Provider Notifications RLS Policies
-- إصلاح سياسات الوصول لإشعارات مقدمي الخدمة
-- Date: 2025-12-21
-- Description:
--   Create a SECURITY DEFINER helper function to check provider ownership
--   and update RLS policies to use it for more reliable access control
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Create helper function to check if user owns a provider
-- إنشاء دالة مساعدة للتحقق من ملكية المتجر
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION is_provider_owner(p_provider_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM providers
    WHERE id = p_provider_id
    AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to get provider IDs owned by a user
CREATE OR REPLACE FUNCTION get_owned_provider_ids(p_user_id UUID)
RETURNS TABLE(provider_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT id FROM providers WHERE owner_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Recreate provider_notifications RLS policies with helper functions
-- إعادة إنشاء سياسات الوصول باستخدام الدوال المساعدة
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing policies
DROP POLICY IF EXISTS "Providers can view own notifications" ON provider_notifications;
DROP POLICY IF EXISTS "Providers can update own notifications" ON provider_notifications;
DROP POLICY IF EXISTS "Providers can delete own notifications" ON provider_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON provider_notifications;

-- SELECT: Providers can view their own notifications (using helper function)
CREATE POLICY "Providers can view own notifications"
  ON provider_notifications FOR SELECT
  USING (is_provider_owner(provider_id, auth.uid()));

-- UPDATE: Providers can update their own notifications (mark as read)
CREATE POLICY "Providers can update own notifications"
  ON provider_notifications FOR UPDATE
  USING (is_provider_owner(provider_id, auth.uid()))
  WITH CHECK (is_provider_owner(provider_id, auth.uid()));

-- DELETE: Providers can delete their own notifications
CREATE POLICY "Providers can delete own notifications"
  ON provider_notifications FOR DELETE
  USING (is_provider_owner(provider_id, auth.uid()));

-- INSERT: System/triggers can insert notifications
CREATE POLICY "System can insert notifications"
  ON provider_notifications FOR INSERT
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Grant execute permissions on helper functions
-- منح صلاحيات تنفيذ الدوال المساعدة
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION is_provider_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_owned_provider_ids(UUID) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- التحقق
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE 'Migration successful: Provider notifications RLS policies updated with SECURITY DEFINER functions';
END $$;
