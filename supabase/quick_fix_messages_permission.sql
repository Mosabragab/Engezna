-- ============================================================================
-- Quick Fix: Add Messages Permission to All Roles
-- إصلاح سريع: إضافة صلاحية الرسائل لجميع الأدوار
-- ============================================================================
-- Run this script directly in Supabase SQL Editor if messages are not showing
-- قم بتشغيل هذا السكريبت مباشرة في محرر SQL إذا لم تظهر الرسائل
-- ============================================================================

-- 1. First check if permission tables exist
DO $$
BEGIN
  -- Check if roles table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roles') THEN
    RAISE NOTICE 'Tables do not exist. Please run the full migration: 20251130500000_create_advanced_permissions.sql';
    RETURN;
  END IF;

  RAISE NOTICE 'Permission tables exist. Proceeding with messages permission fix...';
END $$;

-- 2. Ensure messages permissions exist
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('messages.view', 'messages', 'view', 'عرض الرسائل الداخلية', 'View Internal Messages', 'low'),
  ('messages.create', 'messages', 'create', 'إرسال رسائل', 'Send Messages', 'low'),
  ('messages.update', 'messages', 'update', 'تعديل الرسائل', 'Update Messages', 'low'),
  ('messages.delete', 'messages', 'delete', 'حذف الرسائل', 'Delete Messages', 'medium')
ON CONFLICT (code) DO NOTHING;

-- 3. Add messages.view to ALL roles (all admins should see messages)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.code = 'messages.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Add messages.create to ALL roles (all admins should send messages)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.code = 'messages.create'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Verify the fix
SELECT
  r.name_ar as "الدور",
  r.code as "Role Code",
  p.code as "Permission",
  'OK' as "Status"
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE p.code LIKE 'messages.%'
ORDER BY r.sort_order, p.code;

-- 6. Re-sync admin_users to ensure they have roles assigned
DO $$
DECLARE
  v_admin RECORD;
  v_role_id UUID;
  v_role_code VARCHAR;
BEGIN
  FOR v_admin IN SELECT id, role FROM admin_users WHERE is_active = true LOOP
    v_role_code := v_admin.role::text;
    SELECT id INTO v_role_id FROM roles WHERE code = v_role_code;

    IF v_role_id IS NULL THEN
      SELECT id INTO v_role_id FROM roles WHERE code = 'general_moderator';
    END IF;

    IF v_role_id IS NOT NULL THEN
      INSERT INTO admin_roles (admin_id, role_id, is_primary)
      VALUES (v_admin.id, v_role_id, true)
      ON CONFLICT (admin_id, role_id) DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE 'Admin users synced with roles successfully!';
END $$;

-- 7. Show current admin assignments
SELECT
  p.full_name as "الاسم",
  au.role as "الدور القديم",
  r.name_ar as "الدور الجديد",
  CASE WHEN ar.id IS NOT NULL THEN 'مرتبط' ELSE 'غير مرتبط' END as "الحالة"
FROM admin_users au
JOIN profiles p ON p.id = au.user_id
LEFT JOIN admin_roles ar ON ar.admin_id = au.id
LEFT JOIN roles r ON r.id = ar.role_id
WHERE au.is_active = true;

RAISE NOTICE 'Messages permission fix completed! الرسائل يجب أن تظهر الآن في القائمة الجانبية.';
