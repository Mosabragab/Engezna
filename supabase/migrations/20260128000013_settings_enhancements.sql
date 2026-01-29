-- ============================================================================
-- SETTINGS ENHANCEMENTS MIGRATION
-- ============================================================================
-- Description: Enhances existing settings infrastructure without duplication
--
-- IMPORTANT: This migration is SAFE for existing data:
--   - All ALTER TABLE commands use ADD COLUMN IF NOT EXISTS
--   - All new columns have DEFAULT values
--   - No data is deleted or modified
--
-- What this migration does:
--   1. Adds preferred_language to profiles table
--   2. Adds notification channels to notification_preferences table
--   3. Creates audit trail for commission_settings (commission_settings_changelog)
--   4. Creates app_settings for non-commission settings (security, general, payment, delivery)
--   5. Creates settings_changelog for app_settings audit trail
-- ============================================================================

-- ============================================================================
-- SECTION 1: ADD preferred_language TO profiles
-- ============================================================================
-- Safe: ADD COLUMN IF NOT EXISTS + DEFAULT value
-- Existing rows will get 'ar' as default

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ar';

COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language (ar, en)';

-- ============================================================================
-- SECTION 2: ADD NOTIFICATION CHANNELS TO notification_preferences
-- ============================================================================
-- Safe: ADD COLUMN IF NOT EXISTS + DEFAULT true
-- Existing rows will have all channels enabled by default

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN notification_preferences.push_enabled IS 'Enable push notifications';
COMMENT ON COLUMN notification_preferences.email_enabled IS 'Enable email notifications';
COMMENT ON COLUMN notification_preferences.sms_enabled IS 'Enable SMS notifications';
COMMENT ON COLUMN notification_preferences.whatsapp_enabled IS 'Enable WhatsApp notifications';

-- ============================================================================
-- SECTION 3: AUDIT TRAIL FOR commission_settings
-- ============================================================================
-- Creates a changelog table specifically for commission_settings

CREATE TABLE IF NOT EXISTS commission_settings_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Change details
  old_value JSONB,
  new_value JSONB NOT NULL,

  -- Who made the change (user_id from auth.uid() / profiles.id)
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_email TEXT,

  -- When and why
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT,

  -- Additional context
  ip_address INET,
  user_agent TEXT
);

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_commission_changelog_changed_at
ON commission_settings_changelog(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_commission_changelog_changed_by
ON commission_settings_changelog(changed_by);

-- Trigger function to auto-log commission_settings changes
CREATE OR REPLACE FUNCTION log_commission_settings_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT;
BEGIN
  -- Get admin email from profiles via admin_users.user_id
  -- Note: NEW.updated_by should be profiles.id (auth.uid())
  -- Will return NULL if user not found or updated_by is NULL
  IF NEW.updated_by IS NOT NULL THEN
    SELECT p.email INTO admin_email
    FROM profiles p
    JOIN admin_users a ON a.user_id = p.id
    WHERE a.user_id = NEW.updated_by;
  END IF;

  -- Insert changelog entry (changed_by and changed_by_email may be NULL)
  INSERT INTO commission_settings_changelog (
    old_value,
    new_value,
    changed_by,
    changed_by_email
  ) VALUES (
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    row_to_json(NEW)::jsonb,
    NEW.updated_by,
    admin_email
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS trigger_log_commission_change ON commission_settings;
CREATE TRIGGER trigger_log_commission_change
  AFTER INSERT OR UPDATE ON commission_settings
  FOR EACH ROW
  EXECUTE FUNCTION log_commission_settings_change();

-- RLS for commission_settings_changelog
ALTER TABLE commission_settings_changelog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commission_changelog_select_policy" ON commission_settings_changelog;
CREATE POLICY "commission_changelog_select_policy" ON commission_settings_changelog
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "commission_changelog_insert_policy" ON commission_settings_changelog;
CREATE POLICY "commission_changelog_insert_policy" ON commission_settings_changelog
  FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- SECTION 4: APP_SETTINGS FOR NON-COMMISSION SETTINGS
-- ============================================================================
-- Note: Commission settings are in commission_settings table (NOT duplicated here)

-- Create settings category enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settings_category') THEN
    CREATE TYPE settings_category AS ENUM (
      'security',
      'general',
      'payment',
      'delivery',
      'notifications'
    );
  END IF;
END$$;

-- Main settings table (for non-commission settings)
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

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);

-- ============================================================================
-- SECTION 5: SETTINGS CHANGELOG (AUDIT TABLE FOR app_settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to setting
  setting_key TEXT NOT NULL,

  -- Change details
  old_value JSONB,
  new_value JSONB NOT NULL,

  -- Who made the change (user_id from auth.uid() / profiles.id)
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
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
-- SECTION 6: AUTO-UPDATE TIMESTAMP TRIGGER FOR app_settings
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
-- SECTION 7: AUTO-LOG CHANGES TO settings_changelog
-- ============================================================================

CREATE OR REPLACE FUNCTION log_app_settings_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_email TEXT;
  current_user_id UUID;
BEGIN
  -- Get current user ID (may be NULL if using service role)
  current_user_id := auth.uid();

  -- Get admin email from profiles via admin_users.user_id
  -- Note: auth.uid() = admin_users.user_id = profiles.id
  -- Will return NULL if user not found or auth.uid() is NULL
  IF current_user_id IS NOT NULL THEN
    SELECT p.email INTO admin_email
    FROM profiles p
    JOIN admin_users a ON a.user_id = p.id
    WHERE a.user_id = current_user_id;
  END IF;

  -- Insert changelog entry (changed_by and changed_by_email may be NULL)
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
    current_user_id,
    admin_email,
    current_setting('app.change_reason', true)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_app_settings_change ON app_settings;
CREATE TRIGGER trigger_log_app_settings_change
  AFTER INSERT OR UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION log_app_settings_change();

-- ============================================================================
-- SECTION 8: RLS POLICIES
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
      WHERE user_id = auth.uid()
    )
  );

-- app_settings: Only admins can modify
DROP POLICY IF EXISTS "app_settings_modify_policy" ON app_settings;
CREATE POLICY "app_settings_modify_policy" ON app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'operations_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
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
      WHERE user_id = auth.uid()
    )
  );

-- settings_changelog: System inserts only (via trigger)
DROP POLICY IF EXISTS "settings_changelog_insert_policy" ON settings_changelog;
CREATE POLICY "settings_changelog_insert_policy" ON settings_changelog
  FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- SECTION 9: HELPER FUNCTIONS
-- ============================================================================

-- Get setting value with fallback
CREATE OR REPLACE FUNCTION get_app_setting(
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
CREATE OR REPLACE FUNCTION update_app_setting(
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
-- SECTION 10: SEED INITIAL SETTINGS (NON-COMMISSION ONLY)
-- ============================================================================
-- Note: Commission settings are managed in commission_settings table

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
) ON CONFLICT (setting_key) DO NOTHING;

-- General Platform Settings
INSERT INTO app_settings (
  setting_key,
  category,
  setting_value,
  description,
  description_ar,
  is_sensitive
) VALUES (
  'platform_info',
  'general',
  jsonb_build_object(
    'app_name_ar', 'إنجزنا',
    'app_name_en', 'Engezna',
    'support_email', 'support@engezna.com',
    'support_phone', '+201000000000',
    'support_whatsapp', '+201000000000',
    'default_currency', 'EGP',
    'default_language', 'ar',
    'timezone', 'Africa/Cairo'
  ),
  'General platform information and contact details',
  'معلومات المنصة العامة وبيانات الاتصال',
  FALSE
) ON CONFLICT (setting_key) DO NOTHING;

-- Payment Settings
INSERT INTO app_settings (
  setting_key,
  category,
  setting_value,
  description,
  description_ar,
  is_sensitive
) VALUES (
  'payment_methods',
  'payment',
  jsonb_build_object(
    'cod_enabled', true,
    'cod_label_ar', 'الدفع عند الاستلام',
    'cod_label_en', 'Cash on Delivery',
    'online_payment_enabled', false,
    'wallet_payment_enabled', true,
    'min_order_for_online_payment', 0
  ),
  'Payment methods configuration',
  'إعدادات طرق الدفع',
  FALSE
) ON CONFLICT (setting_key) DO NOTHING;

-- Delivery Settings (Platform-wide defaults)
INSERT INTO app_settings (
  setting_key,
  category,
  setting_value,
  description,
  description_ar,
  is_sensitive
) VALUES (
  'delivery_defaults',
  'delivery',
  jsonb_build_object(
    'default_delivery_fee', 15,
    'default_delivery_time_min', 30,
    'default_delivery_radius_km', 5,
    'free_delivery_threshold', 200,
    'max_delivery_radius_km', 50
  ),
  'Default delivery settings for new providers',
  'إعدادات التوصيل الافتراضية للتجار الجدد',
  FALSE
) ON CONFLICT (setting_key) DO NOTHING;

-- Notification Settings (Platform-wide)
INSERT INTO app_settings (
  setting_key,
  category,
  setting_value,
  description,
  description_ar,
  is_sensitive
) VALUES (
  'notification_defaults',
  'notifications',
  jsonb_build_object(
    'order_reminder_minutes', 15,
    'review_request_delay_hours', 24,
    'abandoned_cart_reminder_hours', 2,
    'promotion_frequency_days', 7
  ),
  'Default notification timing settings',
  'إعدادات توقيت الإشعارات الافتراضية',
  FALSE
) ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- SECTION 11: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON app_settings TO authenticated;
GRANT SELECT ON settings_changelog TO authenticated;
GRANT SELECT ON commission_settings_changelog TO authenticated;
GRANT EXECUTE ON FUNCTION get_app_setting(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_settings_by_category(settings_category) TO authenticated;
GRANT EXECUTE ON FUNCTION get_setting_changelog(TEXT, INT) TO authenticated;

-- ============================================================================
-- SECTION 12: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE app_settings IS 'Central configuration table for non-commission application settings';
COMMENT ON TABLE settings_changelog IS 'Audit trail for all app_settings changes';
COMMENT ON TABLE commission_settings_changelog IS 'Audit trail for commission_settings changes';

COMMENT ON COLUMN app_settings.setting_key IS 'Unique identifier for the setting (e.g., security_deposit, platform_info)';
COMMENT ON COLUMN app_settings.setting_value IS 'JSONB value containing the actual setting configuration';
COMMENT ON COLUMN app_settings.is_sensitive IS 'If true, only admins can view this setting';
COMMENT ON COLUMN app_settings.is_readonly IS 'If true, setting cannot be modified via UI';
COMMENT ON COLUMN app_settings.validation_schema IS 'JSON Schema for frontend validation reference';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of changes:
--   1. profiles.preferred_language added (default: 'ar')
--   2. notification_preferences: push_enabled, email_enabled, sms_enabled, whatsapp_enabled added
--   3. commission_settings_changelog table created with trigger
--   4. app_settings table created (for non-commission settings)
--   5. settings_changelog table created for app_settings audit
--   6. Initial settings seeded: security_deposit, platform_info, payment_methods, delivery_defaults, notification_defaults
--
-- Note: Commission settings remain in commission_settings table (not duplicated)
-- ============================================================================
