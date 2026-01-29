-- ═══════════════════════════════════════════════════════════════════════════════
-- SQL Verification Queries for Settings System
-- Run these queries in Supabase SQL Editor to verify system health
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. CHECK IF TABLES EXIST
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check if app_settings table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'app_settings'
) AS app_settings_exists;

-- Check if settings_changelog table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'settings_changelog'
) AS settings_changelog_exists;

-- Check if commission_settings table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'commission_settings'
) AS commission_settings_exists;

-- Check if commission_settings_changelog table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'commission_settings_changelog'
) AS commission_settings_changelog_exists;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. CHECK PROVIDERS TABLE COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════════

-- List all columns in providers table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'providers'
ORDER BY ordinal_position;

-- Check columns that DON'T exist (verify schema fixes)
-- is_verified: should NOT exist
SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'providers'
  AND column_name = 'is_verified'
) AS is_verified_exists_should_be_false;

-- address: should NOT exist (replaced by address_ar, address_en)
SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'providers'
  AND column_name = 'address'
) AS address_exists_should_be_false;

-- opening_time: should NOT exist (replaced by business_hours)
SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'providers'
  AND column_name = 'opening_time'
) AS opening_time_exists_should_be_false;

-- Check columns that SHOULD exist
SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'providers'
  AND column_name = 'address_ar'
) AS address_ar_exists_should_be_true;

SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'providers'
  AND column_name = 'business_hours'
) AS business_hours_exists_should_be_true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. CHECK APP_SETTINGS DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- View all app_settings
SELECT setting_key, category, setting_value, is_sensitive, created_at, updated_at
FROM app_settings
ORDER BY category, setting_key;

-- Check if maintenance_settings exists
SELECT * FROM app_settings WHERE setting_key = 'maintenance_settings';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. CHECK COMMISSION_SETTINGS DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- View commission settings
SELECT * FROM commission_settings LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. CHECK RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- List all policies on app_settings
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'app_settings';

-- List all policies on commission_settings
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'commission_settings';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. CHECK ADMIN USER ACCESS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check if current user is in admin_users
-- Replace 'YOUR_USER_ID' with actual auth.uid()
SELECT * FROM admin_users WHERE user_id = auth.uid();

-- List all admins
SELECT au.user_id, au.role, p.full_name, p.email
FROM admin_users au
LEFT JOIN profiles p ON au.user_id = p.id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. TEST COMMISSION UPDATE (Read-only verification)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check a specific provider's commission
SELECT id, name_ar, commission_rate, status, created_at, updated_at
FROM providers
WHERE id = 'ee85ee6d-6219-4816-8167-e5c20f704123';  -- Replace with actual provider ID

-- Check commission changelog for this provider
SELECT *
FROM commission_settings_changelog
ORDER BY created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. FIX: CREATE app_settings TABLE IF NOT EXISTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- If app_settings doesn't exist, run this:
/*
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  description_ar TEXT,
  description_en TEXT,
  is_sensitive BOOLEAN DEFAULT false,
  is_readonly BOOLEAN DEFAULT false,
  validation_schema JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read non-sensitive settings
CREATE POLICY "app_settings_select_policy" ON app_settings
  FOR SELECT
  USING (
    NOT is_sensitive
    OR EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can modify
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
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. INSERT DEFAULT MAINTENANCE SETTINGS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert default maintenance settings if not exists
INSERT INTO app_settings (setting_key, setting_value, category, description_ar, description_en, is_sensitive, is_readonly)
VALUES (
  'maintenance_settings',
  '{"providers_maintenance": false, "customers_maintenance": true, "maintenance_message_ar": "المنصة تحت الصيانة - نعود قريباً", "maintenance_message_en": "Platform under maintenance - Coming soon"}',
  'system',
  'إعدادات وضع الصيانة',
  'Maintenance mode settings',
  false,
  false
)
ON CONFLICT (setting_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. VERIFY PROVIDER UPDATE WORKS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check that commission_rate column exists and can be updated
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'providers' AND column_name = 'commission_rate';
