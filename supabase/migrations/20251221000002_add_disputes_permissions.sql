-- ============================================================================
-- Add Disputes Resource Permissions
-- إضافة صلاحيات مركز النزاعات
-- ============================================================================
-- Version: 1.0
-- Created: 2025-12-21
-- Description: Adds disputes/resolution center permissions for handling
--              returns, refunds, and customer complaints
-- ============================================================================

-- ============================================================================
-- 1. ADD DISPUTES PERMISSIONS
-- ============================================================================

-- Disputes permissions (مركز النزاعات)
INSERT INTO permissions (code, resource_code, action_code, name_ar, name_en, description_ar, description_en, severity) VALUES
  ('disputes.view', 'disputes', 'view', 'عرض النزاعات', 'View Disputes', 'عرض الشكاوى والمرتجعات وطلبات الاسترداد', 'View complaints, returns and refund requests', 'low'),
  ('disputes.update', 'disputes', 'update', 'تحديث النزاعات', 'Update Disputes', 'تحديث حالة النزاعات وإضافة ملاحظات', 'Update dispute status and add notes', 'medium'),
  ('disputes.resolve', 'disputes', 'resolve', 'حل النزاعات', 'Resolve Disputes', 'الموافقة أو رفض طلبات الاسترداد', 'Approve or reject refund requests', 'high'),
  ('disputes.assign', 'disputes', 'assign', 'تعيين النزاعات', 'Assign Disputes', 'تعيين النزاعات للمشرفين', 'Assign disputes to supervisors', 'medium')
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  severity = EXCLUDED.severity;

-- ============================================================================
-- 2. ASSIGN DISPUTES PERMISSIONS TO SUPER ADMIN
-- ============================================================================

-- Super Admin gets all disputes permissions automatically
DO $$
DECLARE
  v_role_id UUID;
  v_permission RECORD;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE code = 'super_admin';

  IF v_role_id IS NOT NULL THEN
    FOR v_permission IN SELECT id FROM permissions WHERE resource_code = 'disputes' LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_permission.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- ============================================================================
-- 3. ASSIGN DISPUTES PERMISSIONS TO OTHER ROLES
-- ============================================================================

-- Finance Manager - Full disputes access (handles refunds)
SELECT assign_permission_to_role('finance', 'disputes.view');
SELECT assign_permission_to_role('finance', 'disputes.update');
SELECT assign_permission_to_role('finance', 'disputes.resolve');
SELECT assign_permission_to_role('finance', 'disputes.assign');

-- Support Agent - View and update disputes
SELECT assign_permission_to_role('support', 'disputes.view');
SELECT assign_permission_to_role('support', 'disputes.update');
SELECT assign_permission_to_role('support', 'disputes.assign');

-- General Moderator - View and update disputes
SELECT assign_permission_to_role('general_moderator', 'disputes.view');
SELECT assign_permission_to_role('general_moderator', 'disputes.update');

-- Store Supervisor - View only
SELECT assign_permission_to_role('store_supervisor', 'disputes.view');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
