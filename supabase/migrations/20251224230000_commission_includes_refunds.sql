-- ============================================================================
-- Migration: Commission Calculation Includes Refunds
-- إصلاح حساب العمولة لتشمل خصم المرتجعات
-- ============================================================================
-- Date: 2025-12-24
-- Problem: Commission is calculated without deducting refunds
-- Solution: Deduct refund amounts from base before calculating commission
-- Business Rule: التاجر لا يدفع عمولة على المبالغ المرتجعة للعميل
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_calculate_order_commission ON orders;
DROP FUNCTION IF EXISTS calculate_order_commission();

-- ═══════════════════════════════════════════════════════════════════════════
-- Recreate function with refund deduction
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
    v_refund_total DECIMAL(10,2);
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
    -- STEP 6: Calculate refund total for this order
    -- التاجر لا يدفع عمولة على المبالغ المرتجعة
    -- ========================================================================
    SELECT COALESCE(SUM(COALESCE(processed_amount, amount)), 0)
    INTO v_refund_total
    FROM refunds
    WHERE order_id = NEW.id
      AND status IN ('approved', 'processed');

    -- ========================================================================
    -- STEP 7: Calculate base amount EXCLUDING delivery fee AND refunds
    -- Formula: base = subtotal - discount - refunds (delivery_fee NOT included)
    -- If subtotal is NULL, use: total - delivery_fee - discount - refunds
    -- ========================================================================
    IF NEW.subtotal IS NOT NULL THEN
        -- Prefer subtotal (item total without delivery)
        v_base_amount := NEW.subtotal - COALESCE(NEW.discount, 0) - v_refund_total;
    ELSE
        -- Fallback: total - delivery_fee - discount - refunds
        v_base_amount := COALESCE(NEW.total, 0)
                       - COALESCE(NEW.delivery_fee, 0)
                       - COALESCE(NEW.discount, 0)
                       - v_refund_total;
    END IF;

    -- Ensure base amount is not negative
    v_base_amount := GREATEST(v_base_amount, 0);

    -- ========================================================================
    -- STEP 8: Calculate theoretical commission
    -- ========================================================================
    v_theoretical_commission := ROUND((v_base_amount * v_theoretical_rate) / 100, 2);
    v_theoretical_commission := GREATEST(v_theoretical_commission, 0);

    -- Store theoretical commission in original_commission
    NEW.original_commission := v_theoretical_commission;

    -- ========================================================================
    -- STEP 9: Calculate actual commission (respecting grace period)
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
-- Create trigger on orders
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TRIGGER trigger_calculate_order_commission
    BEFORE INSERT OR UPDATE OF status, subtotal, total, discount, delivery_fee, provider_id, settlement_adjusted
    ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();

-- ═══════════════════════════════════════════════════════════════════════════
-- Create trigger to recalculate commission when refund status changes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION recalculate_order_commission_on_refund()
RETURNS TRIGGER AS $$
BEGIN
    -- When a refund is approved/processed, trigger recalculation of order commission
    IF (TG_OP = 'INSERT' AND NEW.status IN ('approved', 'processed'))
       OR (TG_OP = 'UPDATE' AND NEW.status IN ('approved', 'processed') AND OLD.status NOT IN ('approved', 'processed'))
    THEN
        -- Reset settlement_adjusted to allow recalculation
        UPDATE orders
        SET settlement_adjusted = false
        WHERE id = NEW.order_id;

        -- Trigger recalculation by touching the order
        UPDATE orders
        SET updated_at = NOW()
        WHERE id = NEW.order_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on refunds table
DROP TRIGGER IF EXISTS trigger_recalculate_commission_on_refund ON refunds;
CREATE TRIGGER trigger_recalculate_commission_on_refund
    AFTER INSERT OR UPDATE OF status
    ON refunds
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_order_commission_on_refund();

-- ═══════════════════════════════════════════════════════════════════════════
-- Recalculate commission for orders with approved/processed refunds
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE orders o
SET settlement_adjusted = false
WHERE id IN (
    SELECT DISTINCT order_id
    FROM refunds
    WHERE status IN ('approved', 'processed')
);

-- Touch those orders to trigger recalculation
UPDATE orders o
SET updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT order_id
    FROM refunds
    WHERE status IN ('approved', 'processed')
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Update documentation
-- ═══════════════════════════════════════════════════════════════════════════
COMMENT ON FUNCTION calculate_order_commission() IS
'Commission Trigger v5: Refund Deduction
PURPOSE:
- Calculate commission server-side (security)
- EXCLUDE delivery fees from commission base
- DEDUCT refunds from commission base
- Store BOTH theoretical and actual commission

BUSINESS RULE:
- نسبة المنصة تحسب على صافي الطلب بدون خدمة التوصيل
- التاجر لا يدفع عمولة على المبالغ المرتجعة للعميل

FORMULA:
base_amount = subtotal - discount - refunds  (if subtotal exists)
base_amount = total - delivery_fee - discount - refunds  (fallback)
commission = base_amount * rate / 100

COLUMNS SET:
1. original_commission: Commission after refunds (theoretical)
2. platform_commission: Actual commission (0 during grace period)
3. grace_period_discount: The discount amount (= original during grace period)';

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
