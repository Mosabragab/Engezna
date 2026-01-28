-- ============================================================================
-- DATABASE-DRIVEN SETTINGS SYSTEM
-- ============================================================================
-- Description: Central settings management with audit trail
-- Features:
--   - app_settings: Main settings table with JSONB values
--   - settings_changelog: Audit trail for all changes
--   - Commission and Security Deposit initial settings
-- ============================================================================

-- ============================================================================
-- SECTION 1: SETTINGS CATEGORY ENUM
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settings_category') THEN
    CREATE TYPE settings_category AS ENUM (
      'commission',
      'security',
      'general',
      'payment',
      'delivery',
      'notifications'
    );
  END IF;
END$$;

-- ============================================================================
-- SECTION 2: MAIN SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Setting identification
  setting_key TEXT NOT NULL UNIQUE,
  category settings_category NOT NULL DEFAULT 'general',

  -- Setting value (JSONB for flexibility)
  setting_value JSONB NOT NULL,

  -- Metadata
  description TEXT,
  description_ar TEXT,
  is_sensitive BOOLEAN DEFAULT FALSE,
  is_readonly BOOLEAN DEFAULT FALSE,

  -- Validation schema (for frontend reference)
  validation_schema JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);

-- ============================================================================
-- SECTION 3: SETTINGS CHANGELOG (AUDIT TABLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to setting
  setting_key TEXT NOT NULL,

  -- Change details
  old_value JSONB,
  new_value JSONB NOT NULL,

  -- Who made the change
  changed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  changed_by_email TEXT,

  -- When and why
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT,

  -- Additional context
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_settings_changelog_key ON settings_changelog(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_changelog_changed_at ON settings_changelog(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_settings_changelog_changed_by ON settings_changelog(changed_by);

-- ============================================================================
-- SECTION 4: AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_app_settings_updated_at ON app_settings;
CREATE TRIGGER trigger_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_timestamp();

-- ============================================================================
-- SECTION 5: AUTO-LOG CHANGES TO CHANGELOG
-- ============================================================================

CREATE OR REPLACE FUNCTION log_settings_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT;
BEGIN
  -- Get admin email if available
  SELECT email INTO admin_email
  FROM admin_users
  WHERE id = auth.uid();

  -- Insert changelog entry
  INSERT INTO settings_changelog (
    setting_key,
    old_value,
    new_value,
    changed_by,
    changed_by_email,
    change_reason
  ) VALUES (
    NEW.setting_key,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.setting_value ELSE NULL END,
    NEW.setting_value,
    auth.uid(),
    admin_email,
    current_setting('app.change_reason', true)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_settings_change ON app_settings;
CREATE TRIGGER trigger_log_settings_change
  AFTER INSERT OR UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION log_settings_change();

-- ============================================================================
-- SECTION 6: RLS POLICIES
-- ============================================================================

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_changelog ENABLE ROW LEVEL SECURITY;

-- app_settings: Everyone can read non-sensitive settings
DROP POLICY IF EXISTS "app_settings_select_policy" ON app_settings;
CREATE POLICY "app_settings_select_policy" ON app_settings
  FOR SELECT
  USING (
    is_sensitive = FALSE
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- app_settings: Only admins can modify
DROP POLICY IF EXISTS "app_settings_modify_policy" ON app_settings;
CREATE POLICY "app_settings_modify_policy" ON app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'operations_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'operations_manager')
    )
  );

-- settings_changelog: Only admins can view
DROP POLICY IF EXISTS "settings_changelog_select_policy" ON settings_changelog;
CREATE POLICY "settings_changelog_select_policy" ON settings_changelog
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- settings_changelog: System inserts only (via trigger)
DROP POLICY IF EXISTS "settings_changelog_insert_policy" ON settings_changelog;
CREATE POLICY "settings_changelog_insert_policy" ON settings_changelog
  FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- SECTION 7: HELPER FUNCTIONS
-- ============================================================================

-- Get setting value with fallback
CREATE OR REPLACE FUNCTION get_setting(
  p_key TEXT,
  p_fallback JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT setting_value INTO v_value
  FROM app_settings
  WHERE setting_key = p_key;

  RETURN COALESCE(v_value, p_fallback);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update setting with reason
CREATE OR REPLACE FUNCTION update_setting(
  p_key TEXT,
  p_value JSONB,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Set the reason for the trigger to pick up
  IF p_reason IS NOT NULL THEN
    PERFORM set_config('app.change_reason', p_reason, true);
  END IF;

  UPDATE app_settings
  SET setting_value = p_value
  WHERE setting_key = p_key;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all settings by category
CREATE OR REPLACE FUNCTION get_settings_by_category(
  p_category settings_category
)
RETURNS TABLE (
  setting_key TEXT,
  setting_value JSONB,
  description TEXT,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.setting_key,
    s.setting_value,
    s.description,
    s.updated_at
  FROM app_settings s
  WHERE s.category = p_category
  ORDER BY s.setting_key;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get changelog for a setting
CREATE OR REPLACE FUNCTION get_setting_changelog(
  p_key TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  old_value JSONB,
  new_value JSONB,
  changed_by_email TEXT,
  changed_at TIMESTAMPTZ,
  change_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.old_value,
    c.new_value,
    c.changed_by_email,
    c.changed_at,
    c.change_reason
  FROM settings_changelog c
  WHERE c.setting_key = p_key
  ORDER BY c.changed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- SECTION 8: SEED INITIAL SETTINGS
-- ============================================================================

-- Commission Settings
INSERT INTO app_settings (
  setting_key,
  category,
  setting_value,
  description,
  description_ar,
  is_sensitive,
  validation_schema
) VALUES (
  'commission',
  'commission',
  jsonb_build_object(
    'enabled', true,
    'grace_period_days', 90,
    'default_rate', 7.0,
    'max_rate', 7.0,
    'min_rate', 0.0,
    'customer_fee_enabled', false,
    'customer_fee_rate', 0.0
  ),
  'Commission settings for providers including grace period and rates',
  'إعدادات العمولة للتجار بما في ذلك فترة السماح والنسب',
  FALSE,
  jsonb_build_object(
    'type', 'object',
    'properties', jsonb_build_object(
      'enabled', jsonb_build_object('type', 'boolean'),
      'grace_period_days', jsonb_build_object('type', 'integer', 'min', 0, 'max', 365),
      'default_rate', jsonb_build_object('type', 'number', 'min', 0, 'max', 100),
      'max_rate', jsonb_build_object('type', 'number', 'min', 0, 'max', 100),
      'min_rate', jsonb_build_object('type', 'number', 'min', 0, 'max', 100),
      'customer_fee_enabled', jsonb_build_object('type', 'boolean'),
      'customer_fee_rate', jsonb_build_object('type', 'number', 'min', 0, 'max', 100)
    )
  )
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- Security Deposit Settings
INSERT INTO app_settings (
  setting_key,
  category,
  setting_value,
  description,
  description_ar,
  is_sensitive,
  validation_schema
) VALUES (
  'security_deposit',
  'security',
  jsonb_build_object(
    'enabled', false,
    'amount', 0,
    'currency', 'EGP',
    'is_required_for_new_providers', false,
    'refund_rules', jsonb_build_object(
      'full_refund_after_days', 180,
      'partial_refund_percentage', 50,
      'conditions', ARRAY['no_outstanding_debt', 'no_active_disputes']
    ),
    'terms_ar', 'يتم استرداد مبلغ التأمين بالكامل بعد 180 يوماً من إنهاء الخدمة في حال عدم وجود مستحقات',
    'terms_en', 'Security deposit is fully refundable after 180 days of service termination with no outstanding dues'
  ),
  'Security deposit settings for provider registration',
  'إعدادات مبلغ التأمين لتسجيل التجار',
  FALSE,
  jsonb_build_object(
    'type', 'object',
    'properties', jsonb_build_object(
      'enabled', jsonb_build_object('type', 'boolean'),
      'amount', jsonb_build_object('type', 'number', 'min', 0),
      'currency', jsonb_build_object('type', 'string', 'enum', ARRAY['EGP', 'USD']),
      'is_required_for_new_providers', jsonb_build_object('type', 'boolean')
    )
  )
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- Tiered Commission Settings (for custom orders)
INSERT INTO app_settings (
  setting_key,
  category,
  setting_value,
  description,
  description_ar,
  is_sensitive,
  validation_schema
) VALUES (
  'commission_tiers',
  'commission',
  jsonb_build_array(
    jsonb_build_object('min_amount', 0, 'max_amount', 500, 'rate', 7.0),
    jsonb_build_object('min_amount', 500, 'max_amount', 1000, 'rate', 6.0),
    jsonb_build_object('min_amount', 1000, 'max_amount', 2000, 'rate', 5.0),
    jsonb_build_object('min_amount', 2000, 'max_amount', 5000, 'rate', 4.0),
    jsonb_build_object('min_amount', 5000, 'max_amount', null, 'rate', 3.0)
  ),
  'Tiered commission rates based on order amount',
  'نسب العمولة المتدرجة بناءً على قيمة الطلب',
  FALSE,
  jsonb_build_object(
    'type', 'array',
    'items', jsonb_build_object(
      'type', 'object',
      'properties', jsonb_build_object(
        'min_amount', jsonb_build_object('type', 'number', 'min', 0),
        'max_amount', jsonb_build_object('type', 'number', 'nullable', true),
        'rate', jsonb_build_object('type', 'number', 'min', 0, 'max', 100)
      )
    )
  )
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- ============================================================================
-- SECTION 9: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON app_settings TO authenticated;
GRANT SELECT ON settings_changelog TO authenticated;
GRANT EXECUTE ON FUNCTION get_setting(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_settings_by_category(settings_category) TO authenticated;
GRANT EXECUTE ON FUNCTION get_setting_changelog(TEXT, INT) TO authenticated;

-- ============================================================================
-- SECTION 10: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE app_settings IS 'Central configuration table for all application settings';
COMMENT ON TABLE settings_changelog IS 'Audit trail for all settings changes';

COMMENT ON COLUMN app_settings.setting_key IS 'Unique identifier for the setting (e.g., commission, security_deposit)';
COMMENT ON COLUMN app_settings.setting_value IS 'JSONB value containing the actual setting configuration';
COMMENT ON COLUMN app_settings.is_sensitive IS 'If true, only admins can view this setting';
COMMENT ON COLUMN app_settings.is_readonly IS 'If true, setting cannot be modified via UI';
COMMENT ON COLUMN app_settings.validation_schema IS 'JSON Schema for frontend validation reference';

COMMENT ON COLUMN settings_changelog.old_value IS 'Previous value before change (NULL for new settings)';
COMMENT ON COLUMN settings_changelog.new_value IS 'New value after change';
COMMENT ON COLUMN settings_changelog.changed_by IS 'Admin user who made the change';
COMMENT ON COLUMN settings_changelog.change_reason IS 'Optional reason for the change';
