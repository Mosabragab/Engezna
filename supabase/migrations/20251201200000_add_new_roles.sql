-- ============================================================================
-- إضافة الأدوار الجديدة - New Roles Addition
-- ============================================================================
-- Version: 1.0
-- Created: 2025-12-01
-- Description: Adds 5 new roles: regional_manager, orders_moderator,
--              support_agent, analyst, viewer
-- ============================================================================

-- ============================================================================
-- 1. ADD NEW ROLES
-- ============================================================================

INSERT INTO roles (code, name_ar, name_en, description_ar, description_en, color, icon, is_system, sort_order)
VALUES
  -- مدير منطقة - Regional Manager
  ('regional_manager', 'مدير منطقة', 'Regional Manager',
   'مسؤول عن منطقة جغرافية محددة مع صلاحيات واسعة ضمن نطاقه',
   'Responsible for a specific geographic region with broad permissions within scope',
   '#0891B2', 'MapPin', false, 6),

  -- مشرف الطلبات - Orders Moderator
  ('orders_moderator', 'مشرف الطلبات', 'Orders Moderator',
   'متخصص في إدارة الطلبات والمتابعة مع العملاء',
   'Specialized in managing orders and customer follow-up',
   '#EA580C', 'ShoppingCart', false, 7),

  -- موظف دعم - Support Agent
  ('support_agent', 'موظف دعم', 'Support Agent',
   'موظف دعم فني للرد على التذاكر والمساعدة',
   'Technical support staff for ticket responses and assistance',
   '#9333EA', 'MessageCircle', false, 8),

  -- محلل بيانات - Analyst
  ('analyst', 'محلل بيانات', 'Analyst',
   'للتحليلات والتقارير فقط - قراءة بدون تعديل',
   'For analytics and reports only - read without modification',
   '#0D9488', 'TrendingUp', false, 9),

  -- مراقب/متدرب - Viewer
  ('viewer', 'مراقب', 'Viewer',
   'عرض فقط للمراقبة والتدريب - بدون تعديل',
   'View only for monitoring and training - no modifications',
   '#6B7280', 'Eye', false, 10)

ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 2. ASSIGN PERMISSIONS TO REGIONAL_MANAGER
-- مدير منطقة - صلاحيات واسعة ضمن نطاقه الجغرافي
-- ============================================================================

DO $$
DECLARE
  v_role_id UUID;
  v_perm_id UUID;
BEGIN
  -- Get role ID
  SELECT id INTO v_role_id FROM roles WHERE code = 'regional_manager';

  IF v_role_id IS NOT NULL THEN
    -- Dashboard
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'dashboard.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Providers - Full access
    FOR v_perm_id IN SELECT id FROM permissions WHERE resource_code = 'providers' LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Orders - Full access with constraints
    FOR v_perm_id IN SELECT id FROM permissions WHERE resource_code = 'orders' LOOP
      INSERT INTO role_permissions (role_id, permission_id, constraints)
      VALUES (v_role_id, v_perm_id, '{"amount_limit": 500, "requires_approval": true}'::jsonb)
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- Customers - View and Update
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'customers.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'customers.update';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Finance - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'finance.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Analytics - View and Export
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'analytics.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'analytics.export';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Support - Full access
    FOR v_perm_id IN SELECT id FROM permissions WHERE resource_code = 'support' LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Locations - View and Update
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'locations.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'locations.update';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Team - View only (their team)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'team.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id, constraints)
      VALUES (v_role_id, v_perm_id, '{"assigned_only": true}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Tasks - Full access
    FOR v_perm_id IN SELECT id FROM permissions WHERE resource_code = 'tasks' LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Approvals - View, Create, Approve (within scope)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'approvals.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'approvals.create';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'approvals.approve';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Messages
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'messages.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'messages.create';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Announcements - View and Create
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'announcements.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'announcements.create';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'Assigned permissions to regional_manager';
  END IF;
END $$;

-- ============================================================================
-- 3. ASSIGN PERMISSIONS TO ORDERS_MODERATOR
-- مشرف الطلبات - متخصص في الطلبات
-- ============================================================================

DO $$
DECLARE
  v_role_id UUID;
  v_perm_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE code = 'orders_moderator';

  IF v_role_id IS NOT NULL THEN
    -- Dashboard
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'dashboard.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Orders - Full access with refund limit
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'orders.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'orders.update';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'orders.refund';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id, constraints)
      VALUES (v_role_id, v_perm_id, '{"amount_limit": 100, "requires_approval": true}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Providers - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'providers.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Customers - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'customers.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Support - View, Create, Update (for order issues)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'support.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'support.create';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'support.update';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Locations - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'locations.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Tasks - View and Update (assigned only)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'tasks.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id, constraints)
      VALUES (v_role_id, v_perm_id, '{"assigned_only": true}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'tasks.update';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id, constraints)
      VALUES (v_role_id, v_perm_id, '{"assigned_only": true}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Approvals - View and Create
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'approvals.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'approvals.create';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Messages
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'messages.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'messages.create';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Announcements - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'announcements.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'Assigned permissions to orders_moderator';
  END IF;
END $$;

-- ============================================================================
-- 4. ASSIGN PERMISSIONS TO SUPPORT_AGENT
-- موظف دعم - صلاحيات محدودة للتذاكر المعينة له
-- ============================================================================

DO $$
DECLARE
  v_role_id UUID;
  v_perm_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE code = 'support_agent';

  IF v_role_id IS NOT NULL THEN
    -- Dashboard
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'dashboard.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Support - Full access (assigned only)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'support.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id, constraints)
      VALUES (v_role_id, v_perm_id, '{"assigned_only": true}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'support.create';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'support.update';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id, constraints)
      VALUES (v_role_id, v_perm_id, '{"assigned_only": true}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Orders - View only (for reference)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'orders.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Customers - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'customers.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Providers - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'providers.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Tasks - View and Update (assigned only)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'tasks.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id, constraints)
      VALUES (v_role_id, v_perm_id, '{"assigned_only": true}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'tasks.update';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id, constraints)
      VALUES (v_role_id, v_perm_id, '{"assigned_only": true}'::jsonb)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Messages
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'messages.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'messages.create';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Announcements - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'announcements.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'Assigned permissions to support_agent';
  END IF;
END $$;

-- ============================================================================
-- 5. ASSIGN PERMISSIONS TO ANALYST
-- محلل بيانات - قراءة وتصدير فقط
-- ============================================================================

DO $$
DECLARE
  v_role_id UUID;
  v_perm_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE code = 'analyst';

  IF v_role_id IS NOT NULL THEN
    -- Dashboard
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'dashboard.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Analytics - Full access
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'analytics.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'analytics.export';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Orders - View only (aggregated/anonymized)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'orders.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Providers - View only (statistics)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'providers.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Customers - View only (aggregated)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'customers.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Finance - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'finance.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'finance.export';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Locations - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'locations.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Activity Log - View and Export
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'activity_log.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'activity_log.export';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Messages - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'messages.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Announcements - View only
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'announcements.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'Assigned permissions to analyst';
  END IF;
END $$;

-- ============================================================================
-- 6. ASSIGN PERMISSIONS TO VIEWER
-- مراقب - عرض فقط بدون أي تعديل
-- ============================================================================

DO $$
DECLARE
  v_role_id UUID;
  v_perm_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE code = 'viewer';

  IF v_role_id IS NOT NULL THEN
    -- Dashboard
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'dashboard.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- All view permissions (no sensitive data)
    SELECT id INTO v_perm_id FROM permissions WHERE code = 'providers.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO v_perm_id FROM permissions WHERE code = 'orders.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO v_perm_id FROM permissions WHERE code = 'customers.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO v_perm_id FROM permissions WHERE code = 'support.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO v_perm_id FROM permissions WHERE code = 'locations.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO v_perm_id FROM permissions WHERE code = 'tasks.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO v_perm_id FROM permissions WHERE code = 'approvals.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO v_perm_id FROM permissions WHERE code = 'messages.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    SELECT id INTO v_perm_id FROM permissions WHERE code = 'announcements.view';
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id) VALUES (v_role_id, v_perm_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Note: No finance.view, analytics.view, team.view, settings.view, activity_log.view
    -- These contain sensitive information not suitable for viewers

    RAISE NOTICE 'Assigned permissions to viewer';
  END IF;
END $$;

-- ============================================================================
-- 7. VERIFY NEW ROLES AND PERMISSIONS
-- ============================================================================

-- Show all roles with permission counts
SELECT
  r.code,
  r.name_ar,
  r.name_en,
  r.color,
  r.icon,
  r.sort_order,
  COUNT(rp.id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.code, r.name_ar, r.name_en, r.color, r.icon, r.sort_order
ORDER BY r.sort_order;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
