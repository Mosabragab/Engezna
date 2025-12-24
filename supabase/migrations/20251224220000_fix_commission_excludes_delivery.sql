-- ============================================================================
-- Migration: Fix Commission Calculation to Exclude Delivery Fees
-- إصلاح حساب العمولة لاستبعاد رسوم التوصيل
-- ============================================================================
-- Date: 2025-12-24
-- Problem: Commission formula fallback could include delivery_fee if subtotal is NULL
-- Solution: Explicitly exclude delivery_fee from commission base calculation
-- Business Rule: نسبة المنصة تحسب على صافي الطلب بدون خدمة التوصيل
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_calculate_order_commission ON orders;
DROP FUNCTION IF EXISTS calculate_order_commission();

-- ═══════════════════════════════════════════════════════════════════════════
-- Recreate function with proper delivery fee exclusion
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5,2);
    v_theoretical_rate DECIMAL(5,2);
    v_provider_record RECORD;
    v_order_date TIMESTAMPTZ;
    v_default_rate CONSTANT DECIMAL(5,2) := 7.00;
    v_base_amount DECIMAL(10,2);
    v_theoretical_commission DECIMAL(10,2);
    v_is_grace_period BOOLEAN := FALSE;
    v_is_exempt BOOLEAN := FALSE;
BEGIN
    -- ========================================================================
    -- RULE 1: Cancelled/Rejected orders have zero commission
    -- ========================================================================
    IF NEW.status IN ('cancelled', 'rejected') THEN
        NEW.platform_commission := 0;
        NEW.original_commission := 0;
        NEW.grace_period_discount := 0;
        RETURN NEW;
    END IF;

    -- ========================================================================
    -- RULE 2: Skip if adjusted by refund system
    -- ========================================================================
    IF TG_OP != 'INSERT' AND COALESCE(NEW.settlement_adjusted, false) THEN
        RETURN NEW;
    END IF;

    v_order_date := COALESCE(NEW.created_at, NOW());

    -- ========================================================================
    -- STEP 3: Get provider settings
    -- ========================================================================
    SELECT
        commission_status,
        grace_period_start,
        grace_period_end,
        custom_commission_rate,
        commission_rate
    INTO v_provider_record
    FROM providers
    WHERE id = NEW.provider_id;

    -- ========================================================================
    -- STEP 4: Determine theoretical commission rate (ignoring grace period)
    -- ========================================================================
    IF NOT FOUND THEN
        v_theoretical_rate := v_default_rate;
    ELSIF v_provider_record.custom_commission_rate IS NOT NULL THEN
        v_theoretical_rate := LEAST(v_provider_record.custom_commission_rate, v_default_rate);
    ELSIF v_provider_record.commission_rate IS NOT NULL THEN
        v_theoretical_rate := LEAST(v_provider_record.commission_rate, v_default_rate);
    ELSE
        v_theoretical_rate := v_default_rate;
    END IF;

    -- ========================================================================
    -- STEP 5: Check if in grace period or exempt
    -- ========================================================================
    v_is_grace_period := (
        v_provider_record.commission_status = 'in_grace_period'
        AND v_provider_record.grace_period_end IS NOT NULL
        AND v_order_date < v_provider_record.grace_period_end
    );

    v_is_exempt := (v_provider_record.commission_status = 'exempt');

    -- ========================================================================
    -- STEP 6: Calculate base amount EXCLUDING delivery fee
    -- IMPORTANT: نسبة المنصة تحسب على صافي الطلب بدون خدمة التوصيل
    -- Formula: base = subtotal - discount (delivery_fee is NOT included)
    -- If subtotal is NULL, use: total - delivery_fee - discount
    -- ========================================================================
    IF NEW.subtotal IS NOT NULL THEN
        -- Prefer subtotal (item total without delivery)
        v_base_amount := NEW.subtotal - COALESCE(NEW.discount, 0);
    ELSE
        -- Fallback: total - delivery_fee - discount
        v_base_amount := COALESCE(NEW.total, 0)
                       - COALESCE(NEW.delivery_fee, 0)
                       - COALESCE(NEW.discount, 0);
    END IF;

    -- Ensure base amount is not negative
    v_base_amount := GREATEST(v_base_amount, 0);

    -- ========================================================================
    -- STEP 7: Calculate theoretical commission
    -- ========================================================================
    v_theoretical_commission := ROUND((v_base_amount * v_theoretical_rate) / 100, 2);
    v_theoretical_commission := GREATEST(v_theoretical_commission, 0);

    -- Store theoretical commission in original_commission
    NEW.original_commission := v_theoretical_commission;

    -- ========================================================================
    -- STEP 8: Calculate actual commission (respecting grace period)
    -- ========================================================================
    IF v_is_grace_period THEN
        -- Grace period: no actual commission, but track the discount
        NEW.platform_commission := 0;
        NEW.grace_period_discount := v_theoretical_commission;
    ELSIF v_is_exempt THEN
        -- Exempt: no commission
        NEW.platform_commission := 0;
        NEW.grace_period_discount := 0;
    ELSE
        -- Normal: actual commission = theoretical
        NEW.platform_commission := v_theoretical_commission;
        NEW.grace_period_discount := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- Create trigger
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TRIGGER trigger_calculate_order_commission
    BEFORE INSERT OR UPDATE OF status, subtotal, total, discount, delivery_fee, provider_id, settlement_adjusted
    ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();

-- ═══════════════════════════════════════════════════════════════════════════
-- Update documentation
-- ═══════════════════════════════════════════════════════════════════════════
COMMENT ON FUNCTION calculate_order_commission() IS
'Commission Trigger v4: Delivery Fee Exclusion Fix

PURPOSE:
- Calculate commission server-side (security)
- EXCLUDE delivery fees from commission base
- Store BOTH theoretical and actual commission
- Support grace period visibility

BUSINESS RULE:
نسبة المنصة تحسب على صافي الطلب بدون خدمة التوصيل
Platform commission is calculated on net order WITHOUT delivery fee

FORMULA:
base_amount = subtotal - discount  (if subtotal exists)
base_amount = total - delivery_fee - discount  (fallback)
commission = base_amount * rate / 100

COLUMNS SET:
1. original_commission: Theoretical commission (always calculated)
2. platform_commission: Actual commission (0 during grace period)
3. grace_period_discount: The discount amount (= original during grace period)

PRIORITY:
1. Cancellation → all zeros
2. Refund system adjustment → skip
3. Grace Period → actual=0, track discount
4. Exempt → actual=0, no discount
5. Normal → actual=theoretical';

-- ═══════════════════════════════════════════════════════════════════════════
-- Recalculate commission for existing orders where subtotal is NULL
-- but total and delivery_fee exist
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE orders o
SET platform_commission = ROUND(
    (COALESCE(o.total, 0) - COALESCE(o.delivery_fee, 0) - COALESCE(o.discount, 0)) *
    COALESCE(p.custom_commission_rate, p.commission_rate, 7) / 100,
    2
),
original_commission = ROUND(
    (COALESCE(o.total, 0) - COALESCE(o.delivery_fee, 0) - COALESCE(o.discount, 0)) *
    COALESCE(p.custom_commission_rate, p.commission_rate, 7) / 100,
    2
)
FROM providers p
WHERE o.provider_id = p.id
  AND o.subtotal IS NULL
  AND o.delivery_fee IS NOT NULL
  AND o.status = 'delivered'
  AND p.commission_status NOT IN ('in_grace_period', 'exempt');

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
