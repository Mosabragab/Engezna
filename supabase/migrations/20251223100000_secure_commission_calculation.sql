-- ============================================================================
-- SECURITY FIX: Server-Side Commission Calculation
-- ============================================================================
-- This migration creates a trigger to calculate platform_commission
-- on the database server, preventing client-side manipulation.
--
-- CRITICAL: Commission must NEVER be trusted from client input!
-- ============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_calculate_order_commission ON orders;
DROP FUNCTION IF EXISTS calculate_order_commission();

-- ============================================================================
-- Function: Calculate order commission securely on server
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5,2);
    v_commission_source TEXT;
    v_provider_record RECORD;
    v_settings JSONB;
BEGIN
    -- Get platform commission settings
    SELECT value INTO v_settings
    FROM platform_settings
    WHERE key = 'commission';

    -- Default settings if not configured
    IF v_settings IS NULL THEN
        v_settings := '{"enabled": true, "default_rate": 7.00, "max_rate": 7.00}'::jsonb;
    END IF;

    -- If commission system is disabled, set to 0
    IF NOT COALESCE((v_settings->>'enabled')::boolean, true) THEN
        NEW.platform_commission := 0;
        RETURN NEW;
    END IF;

    -- Get provider details
    SELECT
        p.commission_status,
        p.grace_period_start,
        p.grace_period_end,
        p.custom_commission_rate,
        p.commission_rate,
        p.governorate_id
    INTO v_provider_record
    FROM providers p
    WHERE p.id = NEW.provider_id;

    -- If provider not found, use default rate
    IF NOT FOUND THEN
        v_commission_rate := COALESCE((v_settings->>'default_rate')::DECIMAL(5,2), 7.00);
    ELSE
        -- Check grace period first
        IF v_provider_record.commission_status = 'in_grace_period'
           AND v_provider_record.grace_period_end IS NOT NULL
           AND NOW() < v_provider_record.grace_period_end THEN
            v_commission_rate := 0;
            v_commission_source := 'grace_period';

        -- Check if exempt
        ELSIF v_provider_record.commission_status = 'exempt' THEN
            v_commission_rate := 0;
            v_commission_source := 'exempt';

        -- Use custom commission rate if set
        ELSIF v_provider_record.custom_commission_rate IS NOT NULL THEN
            v_commission_rate := LEAST(
                v_provider_record.custom_commission_rate,
                COALESCE((v_settings->>'max_rate')::DECIMAL(5,2), 7.00)
            );
            v_commission_source := 'provider_custom';

        -- Use provider's commission_rate column
        ELSIF v_provider_record.commission_rate IS NOT NULL THEN
            v_commission_rate := LEAST(
                v_provider_record.commission_rate,
                COALESCE((v_settings->>'max_rate')::DECIMAL(5,2), 7.00)
            );
            v_commission_source := 'provider_rate';

        -- Check governorate override
        ELSIF v_provider_record.governorate_id IS NOT NULL THEN
            SELECT g.commission_override INTO v_commission_rate
            FROM governorates g
            WHERE g.id = v_provider_record.governorate_id
            AND g.commission_override IS NOT NULL;

            IF FOUND AND v_commission_rate IS NOT NULL THEN
                v_commission_rate := LEAST(
                    v_commission_rate,
                    COALESCE((v_settings->>'max_rate')::DECIMAL(5,2), 7.00)
                );
                v_commission_source := 'governorate';
            ELSE
                v_commission_rate := COALESCE((v_settings->>'default_rate')::DECIMAL(5,2), 7.00);
                v_commission_source := 'platform_default';
            END IF;

        -- Use platform default
        ELSE
            v_commission_rate := COALESCE((v_settings->>'default_rate')::DECIMAL(5,2), 7.00);
            v_commission_source := 'platform_default';
        END IF;
    END IF;

    -- Calculate commission on actual revenue (subtotal - discount, excluding delivery)
    -- SECURITY: This calculation happens on the server, client input is IGNORED
    NEW.platform_commission := ROUND(
        ((COALESCE(NEW.subtotal, 0) - COALESCE(NEW.discount, 0)) * v_commission_rate) / 100,
        2
    );

    -- Ensure commission is never negative
    IF NEW.platform_commission < 0 THEN
        NEW.platform_commission := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger: Auto-calculate commission on INSERT and UPDATE
-- ============================================================================
CREATE TRIGGER trigger_calculate_order_commission
    BEFORE INSERT OR UPDATE OF subtotal, discount, provider_id ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON FUNCTION calculate_order_commission() IS
'SECURITY: Calculates platform commission server-side.
Client-provided commission values are IGNORED and overwritten.
Commission is based on provider rate, grace period, exemptions, or platform default.';

COMMENT ON TRIGGER trigger_calculate_order_commission ON orders IS
'SECURITY TRIGGER: Ensures commission is always calculated server-side,
preventing any client-side manipulation of platform fees.';

-- ============================================================================
-- Recalculate existing orders with incorrect commission (optional - run manually)
-- ============================================================================
-- Uncomment the following to fix any existing orders with manipulated commissions:
/*
UPDATE orders o
SET platform_commission = ROUND(
    ((COALESCE(o.subtotal, 0) - COALESCE(o.discount, 0)) *
     COALESCE(p.commission_rate, 7.0)) / 100,
    2
)
FROM providers p
WHERE o.provider_id = p.id
AND o.created_at > NOW() - INTERVAL '30 days';
*/
