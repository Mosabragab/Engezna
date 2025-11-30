-- ============================================================================
-- FIX SCRIPT: SYNC ADMIN_USERS TABLE WITH PROFILES
-- سكريبت إصلاح: مزامنة جدول admin_users مع profiles
-- ============================================================================
-- This ensures all users with role='admin' have a corresponding admin_users record
-- هذا يضمن أن جميع المستخدمين بدور 'admin' لديهم سجل مقابل في admin_users
-- ============================================================================

-- 1. First, identify admins in profiles without admin_users entry
-- أولاً، تحديد المشرفين في profiles بدون سجل في admin_users
DO $$
DECLARE
  missing_count INTEGER;
  inactive_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM profiles p
  WHERE p.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = p.id);

  SELECT COUNT(*) INTO inactive_count
  FROM admin_users au
  JOIN profiles p ON au.user_id = p.id
  WHERE p.role = 'admin' AND au.is_active = false;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'DIAGNOSIS:';
  RAISE NOTICE '- Admins without admin_users record: %', missing_count;
  RAISE NOTICE '- Inactive admin accounts: %', inactive_count;
  RAISE NOTICE '===========================================';
END $$;

-- 2. Insert missing admin_users records
-- إدخال سجلات admin_users المفقودة
INSERT INTO admin_users (user_id, role, is_active, created_at, updated_at)
SELECT
  p.id,
  'admin',  -- Default role
  true,     -- Set as active so they can see messages
  NOW(),
  NOW()
FROM profiles p
WHERE p.role = 'admin'
AND NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;

-- 3. ACTIVATE ALL EXISTING ADMIN_USERS
-- تفعيل جميع المشرفين الموجودين
UPDATE admin_users au
SET is_active = true, updated_at = NOW()
FROM profiles p
WHERE au.user_id = p.id
AND p.role = 'admin'
AND au.is_active = false;

-- 4. Verify the fix - Show all admin users with their status
-- التحقق من الإصلاح - عرض جميع المشرفين مع حالتهم
SELECT
  'AFTER FIX - Admin Status' as section,
  au.id as admin_id,
  p.full_name,
  p.email,
  au.role as admin_role,
  au.is_active,
  CASE WHEN au.is_active THEN '✅ Active - Can see messages' ELSE '❌ Inactive' END as status
FROM admin_users au
JOIN profiles p ON au.user_id = p.id
ORDER BY au.created_at;

-- 5. Show total count
-- عرض العدد الإجمالي
SELECT
  'SUMMARY' as section,
  COUNT(*) FILTER (WHERE is_active = true) as active_admins,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_admins,
  COUNT(*) as total_admins
FROM admin_users;

-- 6. Success message
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'FIX COMPLETED!';
  RAISE NOTICE 'All admin accounts have been activated.';
  RAISE NOTICE 'Users should now be able to see their messages.';
  RAISE NOTICE '===========================================';
END $$;
