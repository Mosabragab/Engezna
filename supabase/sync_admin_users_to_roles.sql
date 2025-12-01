-- ============================================================================
-- Sync Admin Users to New Role System
-- مزامنة المشرفين مع نظام الأدوار الجديد
-- ============================================================================
-- This script:
-- 1. Creates missing tables if needed
-- 2. Syncs all admin_users to admin_roles
-- 3. Ensures all roles have proper permissions
-- ============================================================================

-- Step 1: Check if required tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'جدول الأدوار غير موجود. يرجى تشغيل الـ migration أولاً: 20251130500000_create_advanced_permissions.sql';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_roles' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'جدول admin_roles غير موجود. يرجى تشغيل الـ migration أولاً';
  END IF;

  RAISE NOTICE '✓ الجداول المطلوبة موجودة';
END $$;

-- Step 2: Ensure all base roles exist
INSERT INTO roles (code, name_ar, name_en, description_ar, description_en, color, icon, is_system, sort_order)
VALUES
  ('super_admin', 'المدير التنفيذي', 'Super Admin', 'صلاحيات كاملة على النظام', 'Full system access', '#DC2626', 'Shield', true, 1),
  ('general_moderator', 'مشرف عام', 'General Moderator', 'إدارة المتاجر والطلبات', 'Manage stores and orders', '#2563EB', 'UserCog', true, 2),
  ('store_supervisor', 'مشرف المتاجر', 'Store Supervisor', 'إدارة ومراجعة المتاجر', 'Manage and review stores', '#059669', 'Store', true, 3),
  ('support', 'مشرف الدعم', 'Support Agent', 'إدارة التذاكر والدعم الفني', 'Manage tickets and support', '#7C3AED', 'Headphones', true, 4),
  ('finance', 'مشرف مالي', 'Finance Manager', 'إدارة التسويات والتقارير المالية', 'Manage settlements and financial reports', '#D97706', 'Wallet', true, 5)
ON CONFLICT (code) DO NOTHING;

-- Step 3: Sync all admin_users to admin_roles
DO $$
DECLARE
  v_admin RECORD;
  v_role_id UUID;
  v_role_code VARCHAR;
  v_count INTEGER := 0;
  v_new_count INTEGER := 0;
BEGIN
  -- Loop through all active admins
  FOR v_admin IN SELECT id, role, user_id FROM admin_users WHERE is_active = true LOOP
    v_role_code := v_admin.role::text;

    -- Get the role_id
    SELECT id INTO v_role_id FROM roles WHERE code = v_role_code;

    -- If role not found, use general_moderator as default
    IF v_role_id IS NULL THEN
      SELECT id INTO v_role_id FROM roles WHERE code = 'general_moderator';
      RAISE NOTICE 'Admin % has unknown role %, using general_moderator', v_admin.id, v_role_code;
    END IF;

    -- Check if already synced
    IF v_role_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM admin_roles WHERE admin_id = v_admin.id AND role_id = v_role_id) THEN
        INSERT INTO admin_roles (admin_id, role_id, is_primary)
        VALUES (v_admin.id, v_role_id, true);
        v_new_count := v_new_count + 1;
      END IF;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '✓ تمت مزامنة % مشرف (% جديد)', v_count, v_new_count;
END $$;

-- Step 4: Ensure all basic permissions exist
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('dashboard.view', 'dashboard', 'view', 'عرض لوحة التحكم', 'View Dashboard', 'low'),
  ('providers.view', 'providers', 'view', 'عرض المتاجر', 'View Providers', 'low'),
  ('orders.view', 'orders', 'view', 'عرض الطلبات', 'View Orders', 'low'),
  ('customers.view', 'customers', 'view', 'عرض العملاء', 'View Customers', 'low'),
  ('finance.view', 'finance', 'view', 'عرض المالية', 'View Finance', 'low'),
  ('analytics.view', 'analytics', 'view', 'عرض التحليلات', 'View Analytics', 'low'),
  ('support.view', 'support', 'view', 'عرض تذاكر الدعم', 'View Support Tickets', 'low'),
  ('locations.view', 'locations', 'view', 'عرض المواقع', 'View Locations', 'low'),
  ('team.view', 'team', 'view', 'عرض الفريق', 'View Team', 'low'),
  ('tasks.view', 'tasks', 'view', 'عرض المهام', 'View Tasks', 'low'),
  ('approvals.view', 'approvals', 'view', 'عرض الموافقات', 'View Approvals', 'low'),
  ('messages.view', 'messages', 'view', 'عرض الرسائل الداخلية', 'View Internal Messages', 'low'),
  ('messages.create', 'messages', 'create', 'إرسال رسائل', 'Send Messages', 'low'),
  ('announcements.view', 'announcements', 'view', 'عرض الإعلانات', 'View Announcements', 'low'),
  ('promotions.view', 'promotions', 'view', 'عرض العروض', 'View Promotions', 'low'),
  ('settings.view', 'settings', 'view', 'عرض الإعدادات', 'View Settings', 'low'),
  ('activity_log.view', 'activity_log', 'view', 'عرض سجل النشاط', 'View Activity Log', 'low')
ON CONFLICT (code) DO NOTHING;

-- Step 5: Give super_admin ALL permissions
DO $$
DECLARE
  v_role_id UUID;
  v_perm RECORD;
  v_count INTEGER := 0;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE code = 'super_admin';

  IF v_role_id IS NOT NULL THEN
    FOR v_perm IN SELECT id FROM permissions LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
    RAISE NOTICE '✓ تم إعطاء super_admin % صلاحية', v_count;
  END IF;
END $$;

-- Step 6: Give basic view permissions to all roles
DO $$
DECLARE
  v_role RECORD;
  v_perm_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Essential view permissions for all roles
  FOR v_role IN SELECT id, code FROM roles WHERE code != 'super_admin' LOOP
    -- Dashboard
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'dashboard.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role.id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Messages
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'messages.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role.id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO v_perm_id FROM permissions WHERE code = 'messages.create';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role.id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Announcements
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'announcements.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role.id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Tasks
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'tasks.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role.id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Approvals
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'approvals.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role.id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE '✓ تم إعطاء الصلاحيات الأساسية لـ % دور', v_count;
END $$;

-- Step 7: Verify sync results
SELECT
  '=== نتيجة المزامنة ===' as title;

SELECT
  p.full_name as "الاسم",
  au.role as "الدور في النظام",
  r.name_ar as "الدور الجديد",
  CASE WHEN ar.id IS NOT NULL THEN '✓ مرتبط' ELSE '✗ غير مرتبط' END as "الحالة"
FROM admin_users au
LEFT JOIN profiles p ON p.id = au.user_id
LEFT JOIN admin_roles ar ON ar.admin_id = au.id
LEFT JOIN roles r ON r.id = ar.role_id
WHERE au.is_active = true
ORDER BY au.role;

-- Show permission count per role
SELECT
  r.name_ar as "الدور",
  r.code as "الكود",
  COUNT(rp.id) as "عدد الصلاحيات"
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
GROUP BY r.id, r.name_ar, r.code
ORDER BY r.sort_order;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ تمت المزامنة بنجاح!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'إذا كانت القائمة الجانبية لا تزال فارغة:';
  RAISE NOTICE '1. قم بتحديث الصفحة (Ctrl+F5)';
  RAISE NOTICE '2. تأكد أن المشرف له دور (role) صحيح في admin_users';
  RAISE NOTICE '============================================';
END $$;
