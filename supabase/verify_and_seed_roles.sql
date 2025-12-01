-- ============================================================================
-- Verify and Seed Roles for Advanced Permission System
-- التحقق من وإدخال الأدوار لنظام الصلاحيات المتقدم
-- ============================================================================

-- 1. First, let's check if roles table exists and has data
DO $$
BEGIN
  RAISE NOTICE 'Checking roles table...';
END $$;

-- 2. Insert/Update roles with proper icons
INSERT INTO roles (code, name_ar, name_en, description_ar, description_en, color, icon, is_system, is_active, sort_order)
VALUES
  ('super_admin', 'المدير التنفيذي', 'Super Admin', 'صلاحيات كاملة على النظام', 'Full system access', '#DC2626', 'Crown', true, true, 1),
  ('general_moderator', 'مشرف عام', 'General Moderator', 'إدارة المتاجر والطلبات', 'Manage stores and orders', '#2563EB', 'UserCog', true, true, 2),
  ('store_supervisor', 'مشرف المتاجر', 'Store Supervisor', 'إدارة ومراجعة المتاجر', 'Manage and review stores', '#059669', 'ShieldCheck', true, true, 3),
  ('support', 'مشرف الدعم', 'Support Agent', 'إدارة التذاكر والدعم الفني', 'Manage tickets and support', '#7C3AED', 'Headphones', true, true, 4),
  ('finance', 'مشرف مالي', 'Finance Manager', 'إدارة التسويات والتقارير المالية', 'Manage settlements and financial reports', '#D97706', 'Wallet', true, true, 5)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- 3. Verify roles were inserted
SELECT id, code, name_ar, name_en, icon, color, is_active FROM roles ORDER BY sort_order;

-- 4. Check RLS policies on roles table
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'roles' AND schemaname = 'public';

  RAISE NOTICE 'Number of RLS policies on roles table: %', policy_count;
END $$;

-- 5. Ensure proper RLS policies exist
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Admins can view roles" ON roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON roles;
DROP POLICY IF EXISTS "Anyone can view active roles" ON roles;

-- Create a permissive policy for reading active roles (for invite flow)
CREATE POLICY "Anyone can view active roles" ON roles FOR SELECT
  USING (is_active = true);

-- Super admins can manage all roles
CREATE POLICY "Super admins can manage roles" ON roles FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true));

-- 6. Verify permissions exist
SELECT COUNT(*) as permission_count FROM permissions;

-- 7. Verify role_permissions mappings
SELECT
  r.name_ar as role_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name_ar, r.sort_order
ORDER BY r.sort_order;
