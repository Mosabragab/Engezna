-- ============================================================================
-- Migration: Grace Period Commission Visibility Enhancement
-- تحسين عرض العمولة خلال فترة السماح
-- ============================================================================
-- Date: 2025-12-24
-- Purpose: Allow merchants in grace period to see theoretical commission
--          while actual commission remains zero in settlements
-- ============================================================================

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 1: Ensure original_commission column exists                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Column should already exist from 20251224100000_add_original_commission.sql
-- But ensure it's there
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'original_commission'
    ) THEN
        ALTER TABLE orders ADD COLUMN original_commission DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Add grace_period_discount column to track the discount given
ALTER TABLE orders ADD COLUMN IF NOT EXISTS grace_period_discount DECIMAL(10,2) DEFAULT 0;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 2: Update commission trigger for grace period visibility             ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

DROP TRIGGER IF EXISTS trigger_calculate_order_commission ON orders;
DROP FUNCTION IF EXISTS calculate_order_commission();

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
    -- STEP 6: Calculate base amount and theoretical commission
    -- ========================================================================
    v_base_amount := COALESCE(NEW.subtotal, NEW.total, 0) - COALESCE(NEW.discount, 0);

    -- Theoretical commission (always calculated for visibility)
    v_theoretical_commission := ROUND((v_base_amount * v_theoretical_rate) / 100, 2);
    v_theoretical_commission := GREATEST(v_theoretical_commission, 0);

    -- Store theoretical commission in original_commission
    NEW.original_commission := v_theoretical_commission;

    -- ========================================================================
    -- STEP 7: Calculate actual commission (respecting grace period)
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

-- Create trigger
CREATE TRIGGER trigger_calculate_order_commission
    BEFORE INSERT OR UPDATE OF status, subtotal, discount, provider_id, settlement_adjusted
    ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 3: Create view for provider finance with grace period visibility     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE VIEW provider_finance_summary AS
SELECT
    p.id AS provider_id,
    p.name_ar,
    p.name_en,
    p.commission_status,
    p.grace_period_end,
    COALESCE(p.custom_commission_rate, p.commission_rate, 7) AS commission_rate,

    -- Order counts
    COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) AS total_orders,
    COUNT(CASE WHEN o.status = 'delivered' AND o.payment_status = 'completed' THEN 1 END) AS confirmed_orders,

    -- Revenue
    COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total END), 0) AS total_revenue,
    COALESCE(SUM(CASE WHEN o.status = 'delivered' AND o.payment_status = 'completed' THEN o.total END), 0) AS confirmed_revenue,

    -- Theoretical commission (what would be charged without grace period)
    COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN COALESCE(o.original_commission, o.platform_commission, 0) END), 0) AS theoretical_commission,

    -- Actual commission (what is actually charged)
    COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.platform_commission END), 0) AS actual_commission,

    -- Grace period discount (the difference)
    COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN COALESCE(o.grace_period_discount, 0) END), 0) AS grace_period_discount,

    -- Net earnings
    COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total - o.platform_commission END), 0) AS net_earnings,

    -- Is currently in grace period?
    CASE
        WHEN p.commission_status = 'in_grace_period' AND p.grace_period_end > NOW()
        THEN TRUE ELSE FALSE
    END AS is_in_grace_period,

    -- Days remaining in grace period
    CASE
        WHEN p.commission_status = 'in_grace_period' AND p.grace_period_end > NOW()
        THEN (p.grace_period_end::date - CURRENT_DATE)
        ELSE 0
    END AS grace_period_days_remaining

FROM providers p
LEFT JOIN orders o ON o.provider_id = p.id
GROUP BY p.id, p.name_ar, p.name_en, p.commission_status, p.grace_period_end,
         p.custom_commission_rate, p.commission_rate;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 4: Update existing orders to populate original_commission            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- For orders where original_commission is NULL or 0 but platform_commission exists
UPDATE orders
SET original_commission = platform_commission
WHERE original_commission IS NULL OR original_commission = 0
  AND platform_commission > 0
  AND status = 'delivered';

-- For grace period orders, calculate theoretical commission
UPDATE orders o
SET
    original_commission = ROUND(
        (COALESCE(o.subtotal, o.total, 0) - COALESCE(o.discount, 0)) *
        COALESCE(p.custom_commission_rate, p.commission_rate, 7) / 100,
        2
    ),
    grace_period_discount = ROUND(
        (COALESCE(o.subtotal, o.total, 0) - COALESCE(o.discount, 0)) *
        COALESCE(p.custom_commission_rate, p.commission_rate, 7) / 100,
        2
    )
FROM providers p
WHERE o.provider_id = p.id
  AND o.status = 'delivered'
  AND o.platform_commission = 0
  AND (o.original_commission IS NULL OR o.original_commission = 0)
  AND p.commission_status = 'in_grace_period';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 5: Grant permissions                                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

GRANT SELECT ON provider_finance_summary TO authenticated;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ DOCUMENTATION                                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

COMMENT ON COLUMN orders.original_commission IS
'Theoretical commission that would be charged without grace period.
Always calculated based on provider rate, regardless of grace period status.
Used to show merchant what commission would be so they get used to seeing it.';

COMMENT ON COLUMN orders.grace_period_discount IS
'The commission discount given during grace period.
= original_commission when in grace period, 0 otherwise.
Allows showing "Commission: X EGP, Grace Period Discount: -X EGP, Net: 0 EGP"';

COMMENT ON VIEW provider_finance_summary IS
'Summary view for provider finance dashboard.
Shows both theoretical and actual commission for grace period visibility.
Merchants in grace period see what commission would be, but net remains 0.';

COMMENT ON FUNCTION calculate_order_commission() IS
'HYBRID TRIGGER v3: Grace Period Commission Visibility

PURPOSE:
- Calculate commission server-side (security)
- Store BOTH theoretical and actual commission
- Allow grace period merchants to see what commission would be
- Track grace period discount separately

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

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ END OF MIGRATION                                                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
