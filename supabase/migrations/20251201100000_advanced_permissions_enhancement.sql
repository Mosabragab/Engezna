-- ============================================================================
-- Advanced Permission System Enhancement for Engezna (إنجزنا)
-- تحسينات نظام الصلاحيات المتقدم
-- ============================================================================
-- Version: 2.0
-- Created: 2025-12-01
-- Description: Adds resources table, actions table, escalation rules
-- ============================================================================

-- ============================================================================
-- 1. RESOURCES TABLE (الموارد)
-- ============================================================================

-- Drop and recreate if exists with old structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resources' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'category' AND table_schema = 'public') THEN
      -- Table exists but without category column, add it
      ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'main';
      ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS parent_resource_id UUID REFERENCES resources(id);
      ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Shield';
      ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS description_ar TEXT;
      ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS description_en TEXT;
      ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
      ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      RAISE NOTICE 'Updated existing resources table with new columns';
    END IF;
  ELSE
    -- Create the table
    CREATE TABLE public.resources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      name_ar VARCHAR(100) NOT NULL,
      name_en VARCHAR(100) NOT NULL,
      description_ar TEXT,
      description_en TEXT,
      icon VARCHAR(50) DEFAULT 'Shield',
      parent_resource_id UUID REFERENCES resources(id),
      category VARCHAR(20) DEFAULT 'main',
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    RAISE NOTICE 'Created new resources table';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_resources_code ON resources(code);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(is_active);

-- ============================================================================
-- 2. ACTIONS TABLE (الإجراءات)
-- ============================================================================

-- Handle existing actions table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'actions' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'actions' AND column_name = 'severity' AND table_schema = 'public') THEN
      ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'low';
      ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS requires_reason BOOLEAN DEFAULT false;
      ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS description_ar TEXT;
      ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS description_en TEXT;
      ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
      ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      RAISE NOTICE 'Updated existing actions table with new columns';
    END IF;
  ELSE
    CREATE TABLE public.actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      name_ar VARCHAR(100) NOT NULL,
      name_en VARCHAR(100) NOT NULL,
      description_ar TEXT,
      description_en TEXT,
      severity VARCHAR(20) DEFAULT 'low',
      requires_reason BOOLEAN DEFAULT false,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    RAISE NOTICE 'Created new actions table';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_actions_code ON actions(code);
CREATE INDEX IF NOT EXISTS idx_actions_severity ON actions(severity);
CREATE INDEX IF NOT EXISTS idx_actions_active ON actions(is_active);

-- ============================================================================
-- 3. ESCALATION RULES TABLE (قواعد التصعيد)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_ar TEXT,
  description_en TEXT,

  -- متى يتم التصعيد
  trigger_type VARCHAR(50) NOT NULL, -- 'threshold', 'count', 'time', 'pattern'
  trigger_conditions JSONB NOT NULL DEFAULT '{}'::JSONB,
  /*
    أمثلة على trigger_conditions:
    {
      "resource": "orders",
      "action": "refund",
      "condition": {
        "type": "amount_gt",
        "value": 500
      }
    }
    أو
    {
      "resource": "providers",
      "action": "reject",
      "condition": {
        "type": "count_per_day",
        "value": 3
      }
    }
  */

  -- إلى من يتم التصعيد
  escalate_to_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  escalate_to_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,

  -- الإجراء عند التصعيد
  action_type VARCHAR(50) DEFAULT 'require_approval', -- 'require_approval', 'notify', 'block'
  notification_message_ar TEXT,
  notification_message_en TEXT,

  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON escalation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_priority ON escalation_rules(priority);
CREATE INDEX IF NOT EXISTS idx_escalation_trigger ON escalation_rules(trigger_type);

-- ============================================================================
-- 4. PERMISSION AUDIT LOG (سجل تغييرات الصلاحيات)
-- ============================================================================

-- Handle existing permission_audit_log table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_log' AND table_schema = 'public') THEN
    -- Table exists, ensure all columns are present
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'permission_audit_log' AND column_name = 'target_type' AND table_schema = 'public') THEN
      ALTER TABLE public.permission_audit_log ADD COLUMN IF NOT EXISTS action_type VARCHAR(50);
      ALTER TABLE public.permission_audit_log ADD COLUMN IF NOT EXISTS target_type VARCHAR(50);
      ALTER TABLE public.permission_audit_log ADD COLUMN IF NOT EXISTS target_id UUID;
      ALTER TABLE public.permission_audit_log ADD COLUMN IF NOT EXISTS permission_code VARCHAR(100);
      ALTER TABLE public.permission_audit_log ADD COLUMN IF NOT EXISTS old_value JSONB;
      ALTER TABLE public.permission_audit_log ADD COLUMN IF NOT EXISTS new_value JSONB;
      ALTER TABLE public.permission_audit_log ADD COLUMN IF NOT EXISTS reason TEXT;
      ALTER TABLE public.permission_audit_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
      ALTER TABLE public.permission_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;
      RAISE NOTICE 'Updated existing permission_audit_log table with new columns';
    END IF;
  ELSE
    -- Create the table
    CREATE TABLE public.permission_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      -- من فعل
      admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,

      -- ماذا فعل
      action_type VARCHAR(50) NOT NULL, -- 'grant', 'deny', 'revoke', 'modify'
      target_type VARCHAR(50) NOT NULL, -- 'role', 'admin', 'role_permission', 'admin_permission'
      target_id UUID NOT NULL,

      -- التفاصيل
      permission_code VARCHAR(100),
      old_value JSONB,
      new_value JSONB,
      reason TEXT,

      -- معلومات إضافية
      ip_address VARCHAR(45),
      user_agent TEXT,

      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    RAISE NOTICE 'Created new permission_audit_log table';
  END IF;
END $$;

-- Ensure columns exist before creating indexes
ALTER TABLE permission_audit_log ADD COLUMN IF NOT EXISTS action_type VARCHAR(50);
ALTER TABLE permission_audit_log ADD COLUMN IF NOT EXISTS target_type VARCHAR(50);
ALTER TABLE permission_audit_log ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE permission_audit_log ADD COLUMN IF NOT EXISTS permission_code VARCHAR(100);
ALTER TABLE permission_audit_log ADD COLUMN IF NOT EXISTS old_value JSONB;
ALTER TABLE permission_audit_log ADD COLUMN IF NOT EXISTS new_value JSONB;
ALTER TABLE permission_audit_log ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE permission_audit_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE permission_audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_perm_audit_admin ON permission_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_perm_audit_target ON permission_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_perm_audit_created ON permission_audit_log(created_at DESC);

-- ============================================================================
-- 5. ENABLE RLS
-- ============================================================================

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- Resources: All admins can view
DROP POLICY IF EXISTS "Admins can view resources" ON resources;
CREATE POLICY "Admins can view resources" ON resources FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Resources: Super admins can manage
DROP POLICY IF EXISTS "Super admins can manage resources" ON resources;
CREATE POLICY "Super admins can manage resources" ON resources FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true));

-- Actions: All admins can view
DROP POLICY IF EXISTS "Admins can view actions" ON actions;
CREATE POLICY "Admins can view actions" ON actions FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Actions: Super admins can manage
DROP POLICY IF EXISTS "Super admins can manage actions" ON actions;
CREATE POLICY "Super admins can manage actions" ON actions FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true));

-- Escalation Rules: All admins can view
DROP POLICY IF EXISTS "Admins can view escalation rules" ON escalation_rules;
CREATE POLICY "Admins can view escalation rules" ON escalation_rules FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Escalation Rules: Super admins can manage
DROP POLICY IF EXISTS "Super admins can manage escalation rules" ON escalation_rules;
CREATE POLICY "Super admins can manage escalation rules" ON escalation_rules FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true));

-- Permission Audit Log: All admins can view
DROP POLICY IF EXISTS "Admins can view permission audit log" ON permission_audit_log;
CREATE POLICY "Admins can view permission audit log" ON permission_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- Permission Audit Log: System can insert
DROP POLICY IF EXISTS "System can insert audit log" ON permission_audit_log;
CREATE POLICY "System can insert audit log" ON permission_audit_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================================
-- 7. SEED RESOURCES (with safe column handling)
-- ============================================================================

-- First ensure the category column exists
ALTER TABLE resources ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'main';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Shield';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

INSERT INTO resources (code, name_ar, name_en, description_ar, description_en, icon, category, sort_order)
VALUES
  ('dashboard', 'الرئيسية', 'Dashboard', 'لوحة التحكم الرئيسية', 'Main dashboard', 'LayoutDashboard', 'main', 1),
  ('providers', 'المتاجر', 'Providers', 'إدارة المتاجر والموردين', 'Manage stores and providers', 'Store', 'main', 2),
  ('orders', 'الطلبات', 'Orders', 'إدارة الطلبات', 'Manage orders', 'ShoppingBag', 'main', 3),
  ('customers', 'العملاء', 'Customers', 'إدارة العملاء', 'Manage customers', 'Users', 'main', 4),
  ('finance', 'المالية', 'Finance', 'التقارير والتسويات المالية', 'Financial reports and settlements', 'Wallet', 'main', 5),
  ('analytics', 'التحليلات', 'Analytics', 'تحليلات وإحصائيات', 'Analytics and statistics', 'BarChart3', 'main', 6),
  ('support', 'الدعم', 'Support', 'تذاكر الدعم الفني', 'Support tickets', 'Headphones', 'main', 7),
  ('locations', 'المواقع', 'Locations', 'إدارة المناطق الجغرافية', 'Manage geographic areas', 'MapPin', 'main', 8),
  ('promotions', 'العروض', 'Promotions', 'إدارة العروض والخصومات', 'Manage promotions and discounts', 'Tag', 'main', 9),
  ('team', 'المشرفين', 'Team', 'إدارة فريق المشرفين', 'Manage supervisors team', 'UserCog', 'team', 10),
  ('tasks', 'المهام', 'Tasks', 'إدارة المهام والأعمال', 'Manage tasks', 'ListTodo', 'team', 11),
  ('approvals', 'الموافقات', 'Approvals', 'طلبات الموافقة', 'Approval requests', 'CheckSquare', 'team', 12),
  ('messages', 'المراسلات الداخلية', 'Internal Messages', 'المراسلات بين المشرفين', 'Internal messaging', 'MessageSquare', 'team', 13),
  ('announcements', 'الإعلانات', 'Announcements', 'إعلانات النظام', 'System announcements', 'Megaphone', 'team', 14),
  ('settings', 'الإعدادات', 'Settings', 'إعدادات النظام', 'System settings', 'Settings', 'system', 15),
  ('activity_log', 'سجل النشاط', 'Activity Log', 'سجل نشاط المشرفين', 'Supervisors activity log', 'History', 'system', 16)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 8. SEED ACTIONS (with safe column handling)
-- ============================================================================

-- First ensure the columns exist
ALTER TABLE actions ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'low';
ALTER TABLE actions ADD COLUMN IF NOT EXISTS requires_reason BOOLEAN DEFAULT false;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

INSERT INTO actions (code, name_ar, name_en, description_ar, description_en, severity, requires_reason, sort_order)
VALUES
  ('view', 'عرض', 'View', 'عرض البيانات', 'View data', 'low', false, 1),
  ('create', 'إنشاء', 'Create', 'إنشاء عناصر جديدة', 'Create new items', 'medium', false, 2),
  ('update', 'تعديل', 'Update', 'تعديل العناصر الموجودة', 'Update existing items', 'medium', false, 3),
  ('delete', 'حذف', 'Delete', 'حذف العناصر', 'Delete items', 'high', true, 4),
  ('approve', 'موافقة', 'Approve', 'الموافقة على الطلبات', 'Approve requests', 'high', false, 5),
  ('reject', 'رفض', 'Reject', 'رفض الطلبات', 'Reject requests', 'high', true, 6),
  ('export', 'تصدير', 'Export', 'تصدير البيانات', 'Export data', 'medium', false, 7),
  ('assign', 'تعيين', 'Assign', 'تعيين لمشرف آخر', 'Assign to another supervisor', 'medium', false, 8),
  ('escalate', 'تصعيد', 'Escalate', 'تصعيد للمدير', 'Escalate to manager', 'medium', false, 9),
  ('refund', 'استرداد', 'Refund', 'استرداد مالي', 'Financial refund', 'critical', true, 10),
  ('ban', 'حظر', 'Ban', 'حظر مستخدم', 'Ban user', 'critical', true, 11),
  ('settle', 'تسوية', 'Settle', 'تسوية مالية', 'Financial settlement', 'critical', true, 12)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  severity = EXCLUDED.severity,
  requires_reason = EXCLUDED.requires_reason,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- 9. SEED DEFAULT ESCALATION RULES
-- ============================================================================

-- قاعدة: استرداد مبلغ كبير
INSERT INTO escalation_rules (
  name_ar, name_en,
  description_ar, description_en,
  trigger_type,
  trigger_conditions,
  action_type,
  notification_message_ar, notification_message_en,
  priority
) VALUES (
  'استرداد مبلغ كبير',
  'Large Refund',
  'تصعيد طلبات الاسترداد الكبيرة للمدير',
  'Escalate large refund requests to manager',
  'threshold',
  '{
    "resource": "orders",
    "action": "refund",
    "condition": {
      "type": "amount_gt",
      "value": 500,
      "currency": "EGP"
    }
  }'::JSONB,
  'require_approval',
  'طلب استرداد بمبلغ كبير يحتاج موافقة المدير',
  'Large refund request requires manager approval',
  1
) ON CONFLICT DO NOTHING;

-- قاعدة: رفض متاجر متعددة
INSERT INTO escalation_rules (
  name_ar, name_en,
  description_ar, description_en,
  trigger_type,
  trigger_conditions,
  action_type,
  notification_message_ar, notification_message_en,
  priority
) VALUES (
  'رفض متاجر متعددة',
  'Multiple Store Rejections',
  'إشعار عند رفض أكثر من 3 متاجر في اليوم',
  'Notify when more than 3 stores rejected in a day',
  'count',
  '{
    "resource": "providers",
    "action": "reject",
    "condition": {
      "type": "count_per_day",
      "value": 3
    }
  }'::JSONB,
  'notify',
  'تم رفض أكثر من 3 متاجر اليوم، يرجى المراجعة',
  'More than 3 stores rejected today, please review',
  2
) ON CONFLICT DO NOTHING;

-- قاعدة: تسوية مالية كبيرة
INSERT INTO escalation_rules (
  name_ar, name_en,
  description_ar, description_en,
  trigger_type,
  trigger_conditions,
  action_type,
  notification_message_ar, notification_message_en,
  priority
) VALUES (
  'تسوية مالية كبيرة',
  'Large Financial Settlement',
  'طلب موافقة للتسويات المالية الكبيرة',
  'Require approval for large financial settlements',
  'threshold',
  '{
    "resource": "finance",
    "action": "settle",
    "condition": {
      "type": "amount_gt",
      "value": 5000,
      "currency": "EGP"
    }
  }'::JSONB,
  'require_approval',
  'تسوية مالية كبيرة تحتاج موافقة المدير التنفيذي',
  'Large settlement requires executive approval',
  1
) ON CONFLICT DO NOTHING;

-- قاعدة: حظر عميل
INSERT INTO escalation_rules (
  name_ar, name_en,
  description_ar, description_en,
  trigger_type,
  trigger_conditions,
  action_type,
  notification_message_ar, notification_message_en,
  priority
) VALUES (
  'حظر عميل',
  'Customer Ban',
  'طلب موافقة قبل حظر أي عميل',
  'Require approval before banning any customer',
  'pattern',
  '{
    "resource": "customers",
    "action": "ban",
    "condition": {
      "type": "always"
    }
  }'::JSONB,
  'require_approval',
  'حظر العميل يحتاج موافقة المدير',
  'Customer ban requires manager approval',
  1
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. TRIGGER FOR UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS escalation_rules_updated_at ON escalation_rules;
CREATE TRIGGER escalation_rules_updated_at BEFORE UPDATE ON escalation_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 11. UPDATE PERMISSIONS TABLE - Add foreign keys to resources and actions
-- ============================================================================

-- Add resource_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'permissions' AND column_name = 'resource_id') THEN
    ALTER TABLE permissions ADD COLUMN resource_id UUID REFERENCES resources(id);
  END IF;
END $$;

-- Add action_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'permissions' AND column_name = 'action_id') THEN
    ALTER TABLE permissions ADD COLUMN action_id UUID REFERENCES actions(id);
  END IF;
END $$;

-- Update permissions with resource_id and action_id
UPDATE permissions p
SET resource_id = r.id
FROM resources r
WHERE p.resource_code = r.code AND p.resource_id IS NULL;

UPDATE permissions p
SET action_id = a.id
FROM actions a
WHERE p.action_code = a.code AND p.action_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_permissions_resource_id ON permissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_permissions_action_id ON permissions(action_id);

-- ============================================================================
-- 12. FUNCTION TO LOG PERMISSION CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION log_permission_change(
  p_admin_id UUID,
  p_action_type VARCHAR(50),
  p_target_type VARCHAR(50),
  p_target_id UUID,
  p_permission_code VARCHAR(100),
  p_old_value JSONB,
  p_new_value JSONB,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO permission_audit_log (
    admin_id,
    action_type,
    target_type,
    target_id,
    permission_code,
    old_value,
    new_value,
    reason
  ) VALUES (
    p_admin_id,
    p_action_type,
    p_target_type,
    p_target_id,
    p_permission_code,
    p_old_value,
    p_new_value,
    p_reason
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 13. FUNCTION TO CHECK ESCALATION RULES
-- ============================================================================

CREATE OR REPLACE FUNCTION check_escalation_rules(
  p_resource VARCHAR(50),
  p_action VARCHAR(50),
  p_amount NUMERIC DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE (
  rule_id UUID,
  rule_name_ar VARCHAR(200),
  rule_name_en VARCHAR(200),
  action_type VARCHAR(50),
  notification_message_ar TEXT,
  notification_message_en TEXT,
  escalate_to_role_id UUID,
  escalate_to_admin_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    er.id,
    er.name_ar,
    er.name_en,
    er.action_type,
    er.notification_message_ar,
    er.notification_message_en,
    er.escalate_to_role_id,
    er.escalate_to_admin_id
  FROM escalation_rules er
  WHERE er.is_active = true
    AND (er.trigger_conditions->>'resource')::VARCHAR = p_resource
    AND (er.trigger_conditions->>'action')::VARCHAR = p_action
    AND (
      -- Check threshold conditions
      (er.trigger_type = 'threshold'
       AND (er.trigger_conditions->'condition'->>'type') = 'amount_gt'
       AND p_amount > (er.trigger_conditions->'condition'->>'value')::NUMERIC)
      OR
      -- Check pattern conditions (always match)
      (er.trigger_type = 'pattern'
       AND (er.trigger_conditions->'condition'->>'type') = 'always')
      OR
      -- Other conditions can be added here
      (er.trigger_type = 'count' AND p_admin_id IS NOT NULL)
    )
  ORDER BY er.priority ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
