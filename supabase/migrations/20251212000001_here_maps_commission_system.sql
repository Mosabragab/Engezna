-- Migration: HERE Maps Integration & Commission System Updates
-- Date: December 12, 2025
-- Purpose: Add platform settings for commission management, update addresses with GPS, add governorate commission overrides

-- ============================================================================
-- 1. Create platform_settings table for global configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Add comment for documentation
COMMENT ON TABLE platform_settings IS 'Global platform configuration settings including commission rates, grace periods, and feature flags';

-- Insert default commission settings
-- IMPORTANT: 6 months grace period (180 days), 7% max commission, 0% customer service fee
INSERT INTO platform_settings (key, value, description) VALUES
(
    'commission',
    '{
        "enabled": true,
        "default_rate": 7.00,
        "max_rate": 7.00,
        "grace_period_days": 180,
        "grace_period_enabled": true,
        "customer_service_fee": 0.00,
        "customer_service_fee_enabled": false
    }'::jsonb,
    'Commission configuration: 6 months (180 days) grace period with 0% commission, then max 7%. No customer service fees.'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- 2. Add commission_override to governorates table
-- ============================================================================

ALTER TABLE governorates
ADD COLUMN IF NOT EXISTS commission_override DECIMAL(5,2) DEFAULT NULL;

ALTER TABLE governorates
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

COMMENT ON COLUMN governorates.commission_override IS 'Optional commission rate override for this governorate. If NULL, uses platform default.';
COMMENT ON COLUMN governorates.display_order IS 'Display order for sorting governorates in UI';

-- Set display_order for Beni Suef (active governorate) to be first
UPDATE governorates
SET display_order = 1
WHERE name_en = 'Beni Suef';

-- ============================================================================
-- 3. Add latitude/longitude to addresses table (for GPS coordinates)
-- ============================================================================

ALTER TABLE addresses
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) DEFAULT NULL;

ALTER TABLE addresses
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) DEFAULT NULL;

COMMENT ON COLUMN addresses.latitude IS 'GPS latitude coordinate from HERE Maps';
COMMENT ON COLUMN addresses.longitude IS 'GPS longitude coordinate from HERE Maps';

-- ============================================================================
-- 4. Update providers commission defaults
-- ============================================================================

-- Ensure default commission rate is 7% for new providers
ALTER TABLE providers
ALTER COLUMN commission_rate SET DEFAULT 7.00;

-- Update commission_status enum type if not exists
DO $$
BEGIN
    -- Check if the type exists and has correct values
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'commission_status_enum'
    ) THEN
        CREATE TYPE commission_status_enum AS ENUM ('in_grace_period', 'active', 'exempt');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. Create function to calculate provider commission
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_provider_commission(provider_uuid UUID)
RETURNS TABLE (
    commission_rate DECIMAL(5,2),
    source TEXT,
    is_in_grace_period BOOLEAN,
    grace_period_days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings JSONB;
    v_provider RECORD;
    v_governorate_override DECIMAL(5,2);
    v_days_remaining INTEGER;
BEGIN
    -- Get platform commission settings
    SELECT value INTO v_settings
    FROM platform_settings
    WHERE key = 'commission';

    -- Default if no settings
    IF v_settings IS NULL THEN
        v_settings := '{"enabled": true, "default_rate": 7.00, "max_rate": 7.00}'::jsonb;
    END IF;

    -- If commission system is disabled
    IF NOT (v_settings->>'enabled')::boolean THEN
        RETURN QUERY SELECT 0.00::DECIMAL(5,2), 'disabled'::TEXT, FALSE, NULL::INTEGER;
        RETURN;
    END IF;

    -- Get provider details
    SELECT
        p.commission_status,
        p.grace_period_start,
        p.grace_period_end,
        p.custom_commission_rate,
        p.governorate_id
    INTO v_provider
    FROM providers p
    WHERE p.id = provider_uuid;

    -- Provider not found
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            (v_settings->>'default_rate')::DECIMAL(5,2),
            'platform_default'::TEXT,
            FALSE,
            NULL::INTEGER;
        RETURN;
    END IF;

    -- Check grace period
    IF v_provider.commission_status = 'in_grace_period' AND v_provider.grace_period_end IS NOT NULL THEN
        IF NOW() < v_provider.grace_period_end THEN
            v_days_remaining := EXTRACT(DAY FROM (v_provider.grace_period_end - NOW()))::INTEGER;
            RETURN QUERY SELECT 0.00::DECIMAL(5,2), 'grace_period'::TEXT, TRUE, v_days_remaining;
            RETURN;
        END IF;
    END IF;

    -- Check if exempt
    IF v_provider.commission_status = 'exempt' THEN
        RETURN QUERY SELECT 0.00::DECIMAL(5,2), 'exempt'::TEXT, FALSE, NULL::INTEGER;
        RETURN;
    END IF;

    -- Check provider custom rate
    IF v_provider.custom_commission_rate IS NOT NULL THEN
        RETURN QUERY SELECT
            LEAST(v_provider.custom_commission_rate, (v_settings->>'max_rate')::DECIMAL(5,2)),
            'provider_custom'::TEXT,
            FALSE,
            NULL::INTEGER;
        RETURN;
    END IF;

    -- Check governorate override
    IF v_provider.governorate_id IS NOT NULL THEN
        SELECT g.commission_override INTO v_governorate_override
        FROM governorates g
        WHERE g.id = v_provider.governorate_id;

        IF v_governorate_override IS NOT NULL THEN
            RETURN QUERY SELECT
                LEAST(v_governorate_override, (v_settings->>'max_rate')::DECIMAL(5,2)),
                'governorate'::TEXT,
                FALSE,
                NULL::INTEGER;
            RETURN;
        END IF;
    END IF;

    -- Use platform default
    RETURN QUERY SELECT
        (v_settings->>'default_rate')::DECIMAL(5,2),
        'platform_default'::TEXT,
        FALSE,
        NULL::INTEGER;
END;
$$;

-- ============================================================================
-- 6. Create function to initialize grace period for new providers
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_provider_grace_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings JSONB;
    v_grace_days INTEGER;
BEGIN
    -- Get platform settings
    SELECT value INTO v_settings
    FROM platform_settings
    WHERE key = 'commission';

    -- Default grace period
    v_grace_days := COALESCE((v_settings->>'grace_period_days')::INTEGER, 180);

    -- Only set if not already set and grace period is enabled
    IF NEW.grace_period_start IS NULL
       AND COALESCE((v_settings->>'grace_period_enabled')::boolean, true) THEN
        NEW.grace_period_start := NOW();
        NEW.grace_period_end := NOW() + (v_grace_days || ' days')::INTERVAL;
        NEW.commission_status := 'in_grace_period';
        NEW.commission_rate := 0.00; -- During grace period
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for new providers
DROP TRIGGER IF EXISTS trg_initialize_provider_grace_period ON providers;
CREATE TRIGGER trg_initialize_provider_grace_period
    BEFORE INSERT ON providers
    FOR EACH ROW
    EXECUTE FUNCTION initialize_provider_grace_period();

-- ============================================================================
-- 7. Create function to check and update expired grace periods
-- ============================================================================

CREATE OR REPLACE FUNCTION update_expired_grace_periods()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER;
    v_settings JSONB;
    v_default_rate DECIMAL(5,2);
BEGIN
    -- Get default rate from settings
    SELECT value INTO v_settings
    FROM platform_settings
    WHERE key = 'commission';

    v_default_rate := COALESCE((v_settings->>'default_rate')::DECIMAL(5,2), 7.00);

    -- Update providers with expired grace periods
    WITH updated AS (
        UPDATE providers
        SET
            commission_status = 'active',
            commission_rate = v_default_rate
        WHERE
            commission_status = 'in_grace_period'
            AND grace_period_end IS NOT NULL
            AND grace_period_end < NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO v_updated_count FROM updated;

    RETURN v_updated_count;
END;
$$;

-- ============================================================================
-- 8. RLS Policies for platform_settings
-- ============================================================================

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Admin can read/write all settings
CREATE POLICY "Admins can manage platform settings"
ON platform_settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Everyone can read certain settings (commission info for transparency)
CREATE POLICY "Public can read commission settings"
ON platform_settings
FOR SELECT
TO authenticated
USING (key IN ('commission'));

-- ============================================================================
-- 9. Create view for governorate stats (for admin expansion management)
-- ============================================================================

CREATE OR REPLACE VIEW governorate_stats AS
SELECT
    g.id,
    g.name_ar,
    g.name_en,
    g.is_active,
    g.commission_override,
    g.display_order,
    COUNT(DISTINCT c.id) as cities_count,
    COUNT(DISTINCT CASE WHEN c.is_active THEN c.id END) as active_cities_count,
    COUNT(DISTINCT p.id) as providers_count,
    COUNT(DISTINCT CASE WHEN p.status IN ('active', 'open', 'closed', 'temporarily_paused') THEN p.id END) as active_providers_count,
    COUNT(DISTINCT pr.id) as customers_count,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(o.total), 0) as total_revenue
FROM governorates g
LEFT JOIN cities c ON c.governorate_id = g.id
LEFT JOIN providers p ON p.governorate_id = g.id
LEFT JOIN profiles pr ON pr.governorate_id = g.id AND pr.role = 'customer'
LEFT JOIN orders o ON o.provider_id = p.id AND o.status IN ('delivered', 'completed')
GROUP BY g.id, g.name_ar, g.name_en, g.is_active, g.commission_override, g.display_order
ORDER BY g.display_order, g.name_ar;

-- Grant access to view
GRANT SELECT ON governorate_stats TO authenticated;

-- ============================================================================
-- 10. Add index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_providers_governorate_id ON providers(governorate_id);
CREATE INDEX IF NOT EXISTS idx_providers_city_id ON providers(city_id);
CREATE INDEX IF NOT EXISTS idx_providers_commission_status ON providers(commission_status);
CREATE INDEX IF NOT EXISTS idx_providers_grace_period_end ON providers(grace_period_end) WHERE commission_status = 'in_grace_period';
CREATE INDEX IF NOT EXISTS idx_addresses_governorate_id ON addresses(governorate_id);
CREATE INDEX IF NOT EXISTS idx_addresses_city_id ON addresses(city_id);
CREATE INDEX IF NOT EXISTS idx_addresses_lat_lng ON addresses(latitude, longitude) WHERE latitude IS NOT NULL;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON FUNCTION calculate_provider_commission IS 'Calculates the commission rate for a provider based on grace period, exemptions, custom rates, governorate overrides, and platform defaults';
COMMENT ON FUNCTION initialize_provider_grace_period IS 'Automatically sets up grace period (6 months / 180 days) for new providers';
COMMENT ON FUNCTION update_expired_grace_periods IS 'Updates providers with expired grace periods to active status with default commission rate';
