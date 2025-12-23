-- ============================================================================
-- HYBRID TRIGGER v2: Server-Side Commission with Refund Bypass (QA Fixed)
-- ============================================================================
-- تريجر هجين محسّن: حساب العمولة من السيرفر مع تنحي لنظام المرتجعات
-- ============================================================================
--
-- QA FIXES APPLIED:
--   1. Added provider_id to UPDATE watch list (provider swap fix)
--   2. Grace period uses created_at instead of NOW() (timing fairness)
--   3. Commission calculated for ALL orders (visibility in dashboard)
--   4. Settlements filter by status, not trigger
--
-- RULES:
--   1. INSERT: Calculate commission server-side (security)
--   2. UPDATE + settlement_adjusted=true: BYPASS (refund system handles it)
--   3. UPDATE + cancelled/rejected: Set commission to 0 (override bypass)
--   4. UPDATE provider_id: Recalculate with new provider's rate
--
-- COMMISSION PRIORITY:
--   1. Grace Period (at order creation time) → 0%
--   2. Exempt Status → 0%
--   3. custom_commission_rate (provider-specific)
--   4. commission_rate (provider standard)
--   5. Platform default (7%)
-- ============================================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_calculate_order_commission ON orders;
DROP FUNCTION IF EXISTS calculate_order_commission();

-- ============================================================================
-- Function: Hybrid Commission Calculator v2
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
    v_order_date TIMESTAMPTZ;
BEGIN
    -- ========================================================================
    -- STEP 0: Determine operation type and get order date
    -- ========================================================================
    v_is_insert := (TG_OP = 'INSERT');
    v_is_cancellation := (NEW.status IN ('cancelled', 'rejected'));
    v_was_adjusted := COALESCE(NEW.settlement_adjusted, false);

    -- Use order creation date for grace period check (not NOW())
    -- This ensures fairness: the rate at order time is what applies
    v_order_date := COALESCE(NEW.created_at, NOW());

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
    -- NOTE: RULE 3 REMOVED (QA Fix #3)
    -- العمولة تُحسب لجميع الطلبات (لرؤيتها في لوحة التحكم)
    -- نظام التسويات هو المسؤول عن تصفية الطلبات غير المسلّمة
    -- ========================================================================

    -- ========================================================================
    -- STEP 3: Get platform commission settings
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
    -- STEP 4: Get provider details
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
    -- STEP 5: Determine commission rate (PROVIDER-BASED)
    -- أولوية النسبة: فترة السماح ← الإعفاء ← المخصصة ← العادية ← الافتراضية
    -- ========================================================================
    IF NOT FOUND THEN
        v_commission_rate := COALESCE((v_settings->>'default_rate')::DECIMAL(5,2), 7.00);
    ELSE
        -- Priority 1: Grace period (QA Fix #2: use order date, not NOW())
        -- فترة السماح تُقيّم بتاريخ الطلب وليس الوقت الحالي
        IF v_provider_record.commission_status = 'in_grace_period'
           AND v_provider_record.grace_period_end IS NOT NULL
           AND v_order_date < v_provider_record.grace_period_end THEN
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
    -- STEP 6: Calculate commission (QA Fix #4: defensive COALESCE)
    -- العمولة = (subtotal - discount) × النسبة ÷ 100
    -- ========================================================================
    NEW.platform_commission := ROUND(
        ((COALESCE(NEW.subtotal, NEW.total, 0) - COALESCE(NEW.discount, 0)) * COALESCE(v_commission_rate, 0)) / 100,
        2
    );

    -- Ensure commission is never negative
    IF NEW.platform_commission < 0 OR NEW.platform_commission IS NULL THEN
        NEW.platform_commission := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger: Watch INSERT and specific UPDATE columns
-- QA Fix #1: Added provider_id to watch list for provider swap scenarios
-- ============================================================================
CREATE TRIGGER trigger_calculate_order_commission
    BEFORE INSERT OR UPDATE OF status, subtotal, discount, provider_id, settlement_adjusted ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON FUNCTION calculate_order_commission() IS
'HYBRID TRIGGER v2: Server-side commission with refund bypass (QA Fixed).

QA FIXES:
1. provider_id in UPDATE watch list (provider swap)
2. Grace period uses created_at (timing fairness)
3. Commission calculated for ALL orders (dashboard visibility)
4. Defensive COALESCE for null safety

RULES:
1. INSERT: Calculate commission server-side (security)
2. UPDATE + settlement_adjusted=true: BYPASS (refund system)
3. UPDATE + cancelled/rejected: Set to 0 (override)
4. UPDATE provider_id: Recalculate with new rate

PRIORITY:
1. Grace Period (at order creation) → 0%
2. Exempt Status → 0%
3. custom_commission_rate
4. commission_rate
5. Platform default (7%)';

COMMENT ON TRIGGER trigger_calculate_order_commission ON orders IS
'Hybrid trigger v2 for commission calculation.
- Protects checkout from client manipulation
- Respects refund system via settlement_adjusted flag
- Recalculates on provider change
- Cancellations zero out commission
- Grace period evaluated at order creation time';

-- ============================================================================
-- NOTE: Existing data is NOT modified to preserve test data
-- ============================================================================
