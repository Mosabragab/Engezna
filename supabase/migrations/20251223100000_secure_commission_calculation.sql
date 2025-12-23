-- ============================================================================
-- HYBRID TRIGGER: Server-Side Commission Calculation with Refund Bypass
-- ============================================================================
-- تريجر هجين: حساب العمولة من السيرفر مع تنحي لنظام المرتجعات
-- ============================================================================
--
-- RULES:
--   1. INSERT: Calculate commission server-side (ignore client input)
--   2. UPDATE + settlement_adjusted=true: BYPASS - let refund system handle it
--   3. UPDATE + cancelled/rejected: Set commission to 0 (override bypass)
--   4. UPDATE subtotal/discount: Recalculate if not adjusted by refund
--
-- COMMISSION PRIORITY:
--   1. Grace Period → 0%
--   2. Exempt Status → 0%
--   3. custom_commission_rate (provider-specific)
--   4. commission_rate (provider standard)
--   5. Platform default (7%)
-- ============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_calculate_order_commission ON orders;
DROP FUNCTION IF EXISTS calculate_order_commission();

-- ============================================================================
-- Function: Hybrid Commission Calculator
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5,2);
    v_provider_record RECORD;
    v_settings JSONB;
    v_is_insert BOOLEAN;
    v_is_cancellation BOOLEAN;
    v_was_adjusted BOOLEAN;
BEGIN
    -- ========================================================================
    -- STEP 0: Determine operation type
    -- ========================================================================
    v_is_insert := (TG_OP = 'INSERT');
    v_is_cancellation := (NEW.status IN ('cancelled', 'rejected'));
    v_was_adjusted := COALESCE(NEW.settlement_adjusted, false);

    -- ========================================================================
    -- RULE 1: CANCELLATION OVERRIDE (highest priority)
    -- إذا تم إلغاء الطلب → صفّر العمولة فوراً (حتى لو تم تعديل التسوية)
    -- ========================================================================
    IF v_is_cancellation THEN
        NEW.platform_commission := 0;
        RETURN NEW;
    END IF;

    -- ========================================================================
    -- RULE 2: BYPASS RULE (for refund system)
    -- إذا تم تعديل التسوية بواسطة نظام المرتجعات → لا تلمس العمولة
    -- ========================================================================
    IF NOT v_is_insert AND v_was_adjusted THEN
        -- Don't modify commission - refund system is handling it
        RETURN NEW;
    END IF;

    -- ========================================================================
    -- RULE 3: NON-DELIVERED STATUS (for INSERT or non-adjusted UPDATE)
    -- الطلبات غير المسلّمة → عمولة 0 (مؤقتاً حتى التسليم)
    -- ========================================================================
    IF NEW.status != 'delivered' THEN
        -- For INSERT: Set to 0, will be calculated when delivered
        -- For UPDATE: Only if not already adjusted by refund
        IF v_is_insert OR NOT v_was_adjusted THEN
            NEW.platform_commission := 0;
        END IF;
        RETURN NEW;
    END IF;

    -- ========================================================================
    -- STEP 4: Get platform commission settings
    -- ========================================================================
    SELECT value INTO v_settings
    FROM platform_settings
    WHERE key = 'commission';

    IF v_settings IS NULL THEN
        v_settings := '{"enabled": true, "default_rate": 7.00, "max_rate": 7.00}'::jsonb;
    END IF;

    -- If commission system is disabled globally
    IF NOT COALESCE((v_settings->>'enabled')::boolean, true) THEN
        NEW.platform_commission := 0;
        RETURN NEW;
    END IF;

    -- ========================================================================
    -- STEP 5: Get provider details
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
    -- STEP 6: Determine commission rate (PROVIDER-BASED)
    -- أولوية النسبة: فترة السماح ← الإعفاء ← المخصصة ← العادية ← الافتراضية
    -- ========================================================================
    IF NOT FOUND THEN
        v_commission_rate := COALESCE((v_settings->>'default_rate')::DECIMAL(5,2), 7.00);
    ELSE
        -- Priority 1: Grace period
        IF v_provider_record.commission_status = 'in_grace_period'
           AND v_provider_record.grace_period_end IS NOT NULL
           AND NOW() < v_provider_record.grace_period_end THEN
            v_commission_rate := 0;

        -- Priority 2: Exempt status
        ELSIF v_provider_record.commission_status = 'exempt' THEN
            v_commission_rate := 0;

        -- Priority 3: Custom commission rate
        ELSIF v_provider_record.custom_commission_rate IS NOT NULL THEN
            v_commission_rate := LEAST(
                v_provider_record.custom_commission_rate,
                COALESCE((v_settings->>'max_rate')::DECIMAL(5,2), 7.00)
            );

        -- Priority 4: Provider's standard rate
        ELSIF v_provider_record.commission_rate IS NOT NULL THEN
            v_commission_rate := LEAST(
                v_provider_record.commission_rate,
                COALESCE((v_settings->>'max_rate')::DECIMAL(5,2), 7.00)
            );

        -- Priority 5: Platform default
        ELSE
            v_commission_rate := COALESCE((v_settings->>'default_rate')::DECIMAL(5,2), 7.00);
        END IF;
    END IF;

    -- ========================================================================
    -- STEP 7: Calculate commission
    -- العمولة = (subtotal - discount) × النسبة ÷ 100
    -- ========================================================================
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
-- Trigger: Watch INSERT and specific UPDATE columns
-- ============================================================================
CREATE TRIGGER trigger_calculate_order_commission
    BEFORE INSERT OR UPDATE OF status, subtotal, discount, settlement_adjusted ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON FUNCTION calculate_order_commission() IS
'HYBRID TRIGGER: Server-side commission calculation with refund bypass.

RULES:
1. INSERT: Calculate commission server-side (security)
2. UPDATE + settlement_adjusted=true: BYPASS (refund system handles it)
3. UPDATE + cancelled/rejected: Set to 0 (override bypass)
4. UPDATE subtotal/discount: Recalculate if not adjusted

PRIORITY:
1. Grace Period → 0%
2. Exempt Status → 0%
3. custom_commission_rate
4. commission_rate
5. Platform default (7%)';

COMMENT ON TRIGGER trigger_calculate_order_commission ON orders IS
'Hybrid trigger for commission calculation.
- Protects checkout from client manipulation
- Respects refund system adjustments via settlement_adjusted flag
- Cancellations always zero out commission';

-- ============================================================================
-- NOTE: Existing data is NOT modified to preserve test data
-- ============================================================================
