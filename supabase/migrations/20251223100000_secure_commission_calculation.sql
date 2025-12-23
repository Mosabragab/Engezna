-- ============================================================================
-- SECURITY FIX: Server-Side Commission Calculation
-- ============================================================================
-- This migration creates a trigger to calculate platform_commission
-- on the database server, preventing client-side manipulation.
--
-- CRITICAL: Commission must NEVER be trusted from client input!
--
-- COMMISSION RULES:
--   1. Commission is ONLY calculated for DELIVERED/COMPLETED orders
--   2. Pending, cancelled, rejected orders = 0 commission
--   3. Priority: custom_commission_rate → commission_rate → platform default
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
    -- ========================================================================
    -- RULE 1: Only DELIVERED/COMPLETED orders get commission
    -- All other statuses = 0 commission
    -- ========================================================================
    IF NEW.status NOT IN ('delivered', 'completed') THEN
        NEW.platform_commission := 0;
        RETURN NEW;
    END IF;

    -- ========================================================================
    -- STEP 2: Get platform commission settings
    -- ========================================================================
    SELECT value INTO v_settings
    FROM platform_settings
    WHERE key = 'commission';

    -- Default settings if not configured
    IF v_settings IS NULL THEN
        v_settings := '{"enabled": true, "default_rate": 7.00, "max_rate": 7.00}'::jsonb;
    END IF;

    -- If commission system is disabled globally, set to 0
    IF NOT COALESCE((v_settings->>'enabled')::boolean, true) THEN
        NEW.platform_commission := 0;
        RETURN NEW;
    END IF;

    -- ========================================================================
    -- STEP 3: Get provider details
    -- ========================================================================
    SELECT
        p.commission_status,
        p.grace_period_start,
        p.grace_period_end,
        p.custom_commission_rate,
        p.commission_rate
    INTO v_provider_record
    FROM providers p
    WHERE p.id = NEW.provider_id;

    -- ========================================================================
    -- STEP 4: Determine commission rate (PROVIDER-BASED ONLY)
    -- ========================================================================
    IF NOT FOUND THEN
        -- Provider not found, use default rate
        v_commission_rate := COALESCE((v_settings->>'default_rate')::DECIMAL(5,2), 7.00);
        v_commission_source := 'platform_default';
    ELSE
        -- PRIORITY 1: Check grace period
        IF v_provider_record.commission_status = 'in_grace_period'
           AND v_provider_record.grace_period_end IS NOT NULL
           AND NOW() < v_provider_record.grace_period_end THEN
            v_commission_rate := 0;
            v_commission_source := 'grace_period';

        -- PRIORITY 2: Check if exempt
        ELSIF v_provider_record.commission_status = 'exempt' THEN
            v_commission_rate := 0;
            v_commission_source := 'exempt';

        -- PRIORITY 3: Use custom_commission_rate if set (provider-specific)
        ELSIF v_provider_record.custom_commission_rate IS NOT NULL THEN
            v_commission_rate := LEAST(
                v_provider_record.custom_commission_rate,
                COALESCE((v_settings->>'max_rate')::DECIMAL(5,2), 7.00)
            );
            v_commission_source := 'provider_custom';

        -- PRIORITY 4: Use commission_rate (provider's standard rate)
        ELSIF v_provider_record.commission_rate IS NOT NULL THEN
            v_commission_rate := LEAST(
                v_provider_record.commission_rate,
                COALESCE((v_settings->>'max_rate')::DECIMAL(5,2), 7.00)
            );
            v_commission_source := 'provider_rate';

        -- PRIORITY 5: Use platform default
        ELSE
            v_commission_rate := COALESCE((v_settings->>'default_rate')::DECIMAL(5,2), 7.00);
            v_commission_source := 'platform_default';
        END IF;
    END IF;

    -- ========================================================================
    -- STEP 5: Calculate commission
    -- ========================================================================
    -- Commission is calculated on actual revenue (subtotal - discount, excluding delivery)
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
-- Triggers on:
--   - INSERT: New order created (commission = 0 since pending)
--   - UPDATE of status: When delivered → calculate real commission
--   - UPDATE of subtotal/discount: Recalculate if delivered
-- ============================================================================
CREATE TRIGGER trigger_calculate_order_commission
    BEFORE INSERT OR UPDATE OF subtotal, discount, provider_id, status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON FUNCTION calculate_order_commission() IS
'SECURITY: Calculates platform commission server-side.
Client-provided commission values are IGNORED and overwritten.

KEY RULE: Only DELIVERED/COMPLETED orders have commission > 0
All other statuses (pending, preparing, cancelled, etc.) = 0 commission

Commission Priority (Provider-based ONLY):
1. Grace Period → 0%
2. Exempt Status → 0%
3. custom_commission_rate (provider-specific)
4. commission_rate (provider standard)
5. Platform default';

COMMENT ON TRIGGER trigger_calculate_order_commission ON orders IS
'SECURITY TRIGGER: Ensures commission is always calculated server-side.
Commission is 0 until order is delivered/completed.';

-- ============================================================================
-- FIX EXISTING DATA: Set commission to 0 for non-delivered orders
-- ============================================================================
UPDATE orders
SET platform_commission = 0
WHERE status NOT IN ('delivered', 'completed')
AND (platform_commission IS NULL OR platform_commission != 0);

-- ============================================================================
-- FIX EXISTING DATA: Recalculate commission for delivered orders
-- This ensures all delivered orders have correct commission based on provider
-- ============================================================================
UPDATE orders o
SET platform_commission = ROUND(
    ((COALESCE(o.subtotal, o.total, 0) - COALESCE(o.discount, 0)) *
     COALESCE(
        (SELECT p.custom_commission_rate FROM providers p WHERE p.id = o.provider_id),
        (SELECT p.commission_rate FROM providers p WHERE p.id = o.provider_id),
        7.00
     )) / 100,
    2
)
WHERE o.status IN ('delivered', 'completed');

