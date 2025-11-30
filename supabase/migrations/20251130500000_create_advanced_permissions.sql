-- ============================================================================
-- Advanced Permission System for Engezna (إنجزنا)
-- نظام الصلاحيات المتقدم
-- ============================================================================
-- Version: 1.0
-- Created: 2025-11-30
-- Description: Creates roles, permissions, and their mappings tables
--              Adds messages.view permission to all roles
-- ============================================================================

-- ============================================================================
-- 1. ROLES TABLE (الأدوار)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  color VARCHAR(20) DEFAULT '#6B7280',
  icon VARCHAR(50) DEFAULT 'Shield',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);

-- ============================================================================
-- 2. PERMISSIONS TABLE (الصلاحيات)
-- ============================================================================

-- Drop old permissions table if it has different structure
DO $$
BEGIN
  -- Check if permissions table exists but without resource_code column
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permissions' AND column_name = 'resource_code' AND table_schema = 'public') THEN
      -- Table exists but with old structure, drop and recreate
      DROP TABLE IF EXISTS public.permissions CASCADE;
      RAISE NOTICE 'Dropped old permissions table to recreate with new structure';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'providers.view', 'messages.create'
  resource_code VARCHAR(50) NOT NULL,
  action_code VARCHAR(50) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  severity VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
  requires_reason BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource_code);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active);

-- ============================================================================
-- 3. ADMIN_ROLES TABLE (أدوار المشرفين)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  custom_constraints JSONB DEFAULT '{}'::JSONB,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(admin_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_admin ON admin_roles(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON admin_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_primary ON admin_roles(is_primary);

-- ============================================================================
-- 4. ROLE_PERMISSIONS TABLE (صلاحيات الأدوار)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  constraints JSONB DEFAULT '{}'::JSONB,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================================
-- 5. ADMIN_PERMISSIONS TABLE (صلاحيات مخصصة للمشرفين)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  grant_type VARCHAR(10) NOT NULL DEFAULT 'grant', -- 'grant' or 'deny'
  constraints JSONB DEFAULT '{}'::JSONB,
  reason TEXT,
  granted_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(admin_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_admin ON admin_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_permission ON admin_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_grant_type ON admin_permissions(grant_type);

-- ============================================================================
-- 6. ENABLE RLS
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- Roles: All admins can view
CREATE POLICY "Admins can view roles" ON roles FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Roles: Super admins can manage
CREATE POLICY "Super admins can manage roles" ON roles FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true));

-- Permissions: All admins can view
CREATE POLICY "Admins can view permissions" ON permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Admin Roles: Admins can view their own roles
CREATE POLICY "Admins can view own roles" ON admin_roles FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND id = admin_roles.admin_id AND is_active = true));

-- Admin Roles: Super admins can manage
CREATE POLICY "Super admins can manage admin roles" ON admin_roles FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true));

-- Role Permissions: All admins can view
CREATE POLICY "Admins can view role permissions" ON role_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Role Permissions: Super admins can manage
CREATE POLICY "Super admins can manage role permissions" ON role_permissions FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true));

-- Admin Permissions: Admins can view their own
CREATE POLICY "Admins can view own permissions" ON admin_permissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND id = admin_permissions.admin_id AND is_active = true));

-- Admin Permissions: Super admins can manage
CREATE POLICY "Super admins can manage admin permissions" ON admin_permissions FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true));

-- ============================================================================
-- 8. SEED ROLES
-- ============================================================================

INSERT INTO roles (code, name_ar, name_en, description_ar, description_en, color, icon, is_system, sort_order)
VALUES
  ('super_admin', 'المدير التنفيذي', 'Super Admin', 'صلاحيات كاملة على النظام', 'Full system access', '#DC2626', 'Shield', true, 1),
  ('general_moderator', 'مشرف عام', 'General Moderator', 'إدارة المتاجر والطلبات', 'Manage stores and orders', '#2563EB', 'UserCog', true, 2),
  ('store_supervisor', 'مشرف المتاجر', 'Store Supervisor', 'إدارة ومراجعة المتاجر', 'Manage and review stores', '#059669', 'Store', true, 3),
  ('support', 'مشرف الدعم', 'Support Agent', 'إدارة التذاكر والدعم الفني', 'Manage tickets and support', '#7C3AED', 'Headphones', true, 4),
  ('finance', 'مشرف مالي', 'Finance Manager', 'إدارة التسويات والتقارير المالية', 'Manage settlements and financial reports', '#D97706', 'Wallet', true, 5)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon;

-- ============================================================================
-- 9. SEED PERMISSIONS
-- ============================================================================

-- Dashboard permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity)
VALUES ('dashboard.view', 'dashboard', 'view', 'عرض لوحة التحكم', 'View Dashboard', 'low')
ON CONFLICT (code) DO NOTHING;

-- Providers permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('providers.view', 'providers', 'view', 'عرض المتاجر', 'View Providers', 'low'),
  ('providers.create', 'providers', 'create', 'إنشاء متجر', 'Create Provider', 'medium'),
  ('providers.update', 'providers', 'update', 'تعديل المتاجر', 'Update Provider', 'medium'),
  ('providers.delete', 'providers', 'delete', 'حذف المتاجر', 'Delete Provider', 'high'),
  ('providers.approve', 'providers', 'approve', 'الموافقة على المتاجر', 'Approve Provider', 'high')
ON CONFLICT (code) DO NOTHING;

-- Orders permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('orders.view', 'orders', 'view', 'عرض الطلبات', 'View Orders', 'low'),
  ('orders.update', 'orders', 'update', 'تعديل الطلبات', 'Update Orders', 'medium'),
  ('orders.refund', 'orders', 'refund', 'استرداد الطلبات', 'Refund Orders', 'critical')
ON CONFLICT (code) DO NOTHING;

-- Customers permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('customers.view', 'customers', 'view', 'عرض العملاء', 'View Customers', 'low'),
  ('customers.update', 'customers', 'update', 'تعديل العملاء', 'Update Customers', 'medium'),
  ('customers.ban', 'customers', 'ban', 'حظر العملاء', 'Ban Customers', 'critical')
ON CONFLICT (code) DO NOTHING;

-- Finance permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('finance.view', 'finance', 'view', 'عرض المالية', 'View Finance', 'low'),
  ('finance.settle', 'finance', 'settle', 'التسويات المالية', 'Financial Settlements', 'critical'),
  ('finance.export', 'finance', 'export', 'تصدير التقارير المالية', 'Export Financial Reports', 'medium')
ON CONFLICT (code) DO NOTHING;

-- Analytics permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('analytics.view', 'analytics', 'view', 'عرض التحليلات', 'View Analytics', 'low'),
  ('analytics.export', 'analytics', 'export', 'تصدير التحليلات', 'Export Analytics', 'medium')
ON CONFLICT (code) DO NOTHING;

-- Support permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('support.view', 'support', 'view', 'عرض تذاكر الدعم', 'View Support Tickets', 'low'),
  ('support.create', 'support', 'create', 'إنشاء تذكرة', 'Create Ticket', 'low'),
  ('support.update', 'support', 'update', 'تحديث التذاكر', 'Update Tickets', 'medium'),
  ('support.assign', 'support', 'assign', 'تعيين التذاكر', 'Assign Tickets', 'medium')
ON CONFLICT (code) DO NOTHING;

-- Locations permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('locations.view', 'locations', 'view', 'عرض المواقع', 'View Locations', 'low'),
  ('locations.create', 'locations', 'create', 'إنشاء مواقع', 'Create Locations', 'medium'),
  ('locations.update', 'locations', 'update', 'تعديل المواقع', 'Update Locations', 'medium')
ON CONFLICT (code) DO NOTHING;

-- Team permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('team.view', 'team', 'view', 'عرض الفريق', 'View Team', 'low'),
  ('team.create', 'team', 'create', 'إضافة مشرفين', 'Add Supervisors', 'high'),
  ('team.update', 'team', 'update', 'تعديل المشرفين', 'Update Supervisors', 'high'),
  ('team.delete', 'team', 'delete', 'حذف المشرفين', 'Delete Supervisors', 'critical')
ON CONFLICT (code) DO NOTHING;

-- Tasks permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('tasks.view', 'tasks', 'view', 'عرض المهام', 'View Tasks', 'low'),
  ('tasks.create', 'tasks', 'create', 'إنشاء مهام', 'Create Tasks', 'medium'),
  ('tasks.update', 'tasks', 'update', 'تحديث المهام', 'Update Tasks', 'medium'),
  ('tasks.assign', 'tasks', 'assign', 'تعيين المهام', 'Assign Tasks', 'medium')
ON CONFLICT (code) DO NOTHING;

-- Approvals permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('approvals.view', 'approvals', 'view', 'عرض الموافقات', 'View Approvals', 'low'),
  ('approvals.create', 'approvals', 'create', 'إنشاء طلب موافقة', 'Create Approval Request', 'medium'),
  ('approvals.approve', 'approvals', 'approve', 'الموافقة على الطلبات', 'Approve Requests', 'high'),
  ('approvals.reject', 'approvals', 'reject', 'رفض الطلبات', 'Reject Requests', 'high')
ON CONFLICT (code) DO NOTHING;

-- MESSAGES PERMISSIONS (المراسلات الداخلية)
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('messages.view', 'messages', 'view', 'عرض الرسائل الداخلية', 'View Internal Messages', 'low'),
  ('messages.create', 'messages', 'create', 'إرسال رسائل', 'Send Messages', 'low'),
  ('messages.update', 'messages', 'update', 'تعديل الرسائل', 'Update Messages', 'low'),
  ('messages.delete', 'messages', 'delete', 'حذف الرسائل', 'Delete Messages', 'medium')
ON CONFLICT (code) DO NOTHING;

-- Announcements permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('announcements.view', 'announcements', 'view', 'عرض الإعلانات', 'View Announcements', 'low'),
  ('announcements.create', 'announcements', 'create', 'إنشاء إعلانات', 'Create Announcements', 'medium'),
  ('announcements.update', 'announcements', 'update', 'تعديل الإعلانات', 'Update Announcements', 'medium'),
  ('announcements.delete', 'announcements', 'delete', 'حذف الإعلانات', 'Delete Announcements', 'high')
ON CONFLICT (code) DO NOTHING;

-- Promotions permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('promotions.view', 'promotions', 'view', 'عرض العروض', 'View Promotions', 'low'),
  ('promotions.create', 'promotions', 'create', 'إنشاء عروض', 'Create Promotions', 'medium'),
  ('promotions.update', 'promotions', 'update', 'تعديل العروض', 'Update Promotions', 'medium'),
  ('promotions.delete', 'promotions', 'delete', 'حذف العروض', 'Delete Promotions', 'high')
ON CONFLICT (code) DO NOTHING;

-- Settings permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('settings.view', 'settings', 'view', 'عرض الإعدادات', 'View Settings', 'low'),
  ('settings.update', 'settings', 'update', 'تعديل الإعدادات', 'Update Settings', 'critical')
ON CONFLICT (code) DO NOTHING;

-- Activity log permissions
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, severity) VALUES
  ('activity_log.view', 'activity_log', 'view', 'عرض سجل النشاط', 'View Activity Log', 'low'),
  ('activity_log.export', 'activity_log', 'export', 'تصدير سجل النشاط', 'Export Activity Log', 'medium')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 10. ASSIGN PERMISSIONS TO ROLES
-- ============================================================================

-- Helper function to assign permission to role
CREATE OR REPLACE FUNCTION assign_permission_to_role(p_role_code VARCHAR, p_permission_code VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_role_id UUID;
  v_permission_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE code = p_role_code;
  SELECT id INTO v_permission_id FROM permissions WHERE code = p_permission_code;

  IF v_role_id IS NOT NULL AND v_permission_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (v_role_id, v_permission_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SUPER ADMIN - All permissions
-- ============================================================================
DO $$
DECLARE
  v_role_id UUID;
  v_permission RECORD;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE code = 'super_admin';

  FOR v_permission IN SELECT id FROM permissions LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (v_role_id, v_permission.id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- GENERAL MODERATOR permissions
-- ============================================================================
SELECT assign_permission_to_role('general_moderator', 'dashboard.view');
SELECT assign_permission_to_role('general_moderator', 'providers.view');
SELECT assign_permission_to_role('general_moderator', 'providers.update');
SELECT assign_permission_to_role('general_moderator', 'providers.approve');
SELECT assign_permission_to_role('general_moderator', 'orders.view');
SELECT assign_permission_to_role('general_moderator', 'orders.update');
SELECT assign_permission_to_role('general_moderator', 'customers.view');
SELECT assign_permission_to_role('general_moderator', 'customers.update');
SELECT assign_permission_to_role('general_moderator', 'analytics.view');
SELECT assign_permission_to_role('general_moderator', 'support.view');
SELECT assign_permission_to_role('general_moderator', 'locations.view');
SELECT assign_permission_to_role('general_moderator', 'tasks.view');
SELECT assign_permission_to_role('general_moderator', 'tasks.create');
SELECT assign_permission_to_role('general_moderator', 'tasks.update');
SELECT assign_permission_to_role('general_moderator', 'approvals.view');
SELECT assign_permission_to_role('general_moderator', 'approvals.create');
SELECT assign_permission_to_role('general_moderator', 'messages.view');
SELECT assign_permission_to_role('general_moderator', 'messages.create');
SELECT assign_permission_to_role('general_moderator', 'announcements.view');

-- ============================================================================
-- STORE SUPERVISOR permissions
-- ============================================================================
SELECT assign_permission_to_role('store_supervisor', 'dashboard.view');
SELECT assign_permission_to_role('store_supervisor', 'providers.view');
SELECT assign_permission_to_role('store_supervisor', 'providers.update');
SELECT assign_permission_to_role('store_supervisor', 'providers.approve');
SELECT assign_permission_to_role('store_supervisor', 'orders.view');
SELECT assign_permission_to_role('store_supervisor', 'customers.view');
SELECT assign_permission_to_role('store_supervisor', 'analytics.view');
SELECT assign_permission_to_role('store_supervisor', 'locations.view');
SELECT assign_permission_to_role('store_supervisor', 'tasks.view');
SELECT assign_permission_to_role('store_supervisor', 'tasks.update');
SELECT assign_permission_to_role('store_supervisor', 'approvals.view');
SELECT assign_permission_to_role('store_supervisor', 'approvals.create');
SELECT assign_permission_to_role('store_supervisor', 'messages.view');
SELECT assign_permission_to_role('store_supervisor', 'messages.create');
SELECT assign_permission_to_role('store_supervisor', 'announcements.view');

-- ============================================================================
-- SUPPORT AGENT permissions
-- ============================================================================
SELECT assign_permission_to_role('support', 'dashboard.view');
SELECT assign_permission_to_role('support', 'providers.view');
SELECT assign_permission_to_role('support', 'orders.view');
SELECT assign_permission_to_role('support', 'customers.view');
SELECT assign_permission_to_role('support', 'support.view');
SELECT assign_permission_to_role('support', 'support.create');
SELECT assign_permission_to_role('support', 'support.update');
SELECT assign_permission_to_role('support', 'support.assign');
SELECT assign_permission_to_role('support', 'tasks.view');
SELECT assign_permission_to_role('support', 'tasks.update');
SELECT assign_permission_to_role('support', 'approvals.view');
SELECT assign_permission_to_role('support', 'messages.view');
SELECT assign_permission_to_role('support', 'messages.create');
SELECT assign_permission_to_role('support', 'announcements.view');

-- ============================================================================
-- FINANCE MANAGER permissions
-- ============================================================================
SELECT assign_permission_to_role('finance', 'dashboard.view');
SELECT assign_permission_to_role('finance', 'providers.view');
SELECT assign_permission_to_role('finance', 'orders.view');
SELECT assign_permission_to_role('finance', 'orders.refund');
SELECT assign_permission_to_role('finance', 'customers.view');
SELECT assign_permission_to_role('finance', 'finance.view');
SELECT assign_permission_to_role('finance', 'finance.settle');
SELECT assign_permission_to_role('finance', 'finance.export');
SELECT assign_permission_to_role('finance', 'analytics.view');
SELECT assign_permission_to_role('finance', 'analytics.export');
SELECT assign_permission_to_role('finance', 'tasks.view');
SELECT assign_permission_to_role('finance', 'tasks.update');
SELECT assign_permission_to_role('finance', 'approvals.view');
SELECT assign_permission_to_role('finance', 'approvals.create');
SELECT assign_permission_to_role('finance', 'messages.view');
SELECT assign_permission_to_role('finance', 'messages.create');
SELECT assign_permission_to_role('finance', 'announcements.view');

-- ============================================================================
-- 11. SYNC EXISTING ADMIN_USERS WITH NEW ROLE SYSTEM
-- ============================================================================

-- Function to sync admin_users with admin_roles
CREATE OR REPLACE FUNCTION sync_admin_users_to_roles()
RETURNS void AS $$
DECLARE
  v_admin RECORD;
  v_role_id UUID;
  v_role_code VARCHAR;
BEGIN
  FOR v_admin IN SELECT id, role FROM admin_users WHERE is_active = true LOOP
    -- Map old role enum to new role code
    v_role_code := v_admin.role::text;

    -- Get the role_id
    SELECT id INTO v_role_id FROM roles WHERE code = v_role_code;

    -- If role not found, try general_moderator as default
    IF v_role_id IS NULL THEN
      SELECT id INTO v_role_id FROM roles WHERE code = 'general_moderator';
    END IF;

    -- Insert into admin_roles if not exists
    IF v_role_id IS NOT NULL THEN
      INSERT INTO admin_roles (admin_id, role_id, is_primary)
      VALUES (v_admin.id, v_role_id, true)
      ON CONFLICT (admin_id, role_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the sync
SELECT sync_admin_users_to_roles();

-- ============================================================================
-- 12. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
