-- ============================================================================
-- Migration: Fix Settlement Function to Match Actual Table Schema
-- إصلاح دالة التسوية لتتوافق مع بنية الجدول الفعلية
-- ============================================================================
-- Date: 2025-12-24
-- Problem: generate_provider_settlement uses wrong column names
-- Solution: Update function to use correct column names from orders/settlements
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS generate_provider_settlement(UUID, DATE, DATE, UUID);

-- Create corrected function
CREATE OR REPLACE FUNCTION generate_provider_settlement(
    p_provider_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settlement_id UUID;
    v_total_orders INTEGER;
    v_gross_revenue DECIMAL(10,2);
    v_platform_commission DECIMAL(10,2);
    v_net_payout DECIMAL(10,2);
    v_cod_orders_count INTEGER;
    v_cod_gross_revenue DECIMAL(10,2);
    v_cod_commission DECIMAL(10,2);
    v_online_orders_count INTEGER;
    v_online_gross_revenue DECIMAL(10,2);
    v_online_commission DECIMAL(10,2);
    v_online_payout DECIMAL(10,2);
    v_net_balance DECIMAL(10,2);
    v_settlement_direction TEXT;
BEGIN
    -- ═══════════════════════════════════════════════════════════════════
    -- Calculate totals from delivered orders in the period
    -- IMPORTANT: Use platform_commission from orders (calculated by trigger)
    -- Exclude orders already adjusted by refunds (settlement_adjusted = true)
    -- ═══════════════════════════════════════════════════════════════════

    SELECT
        COUNT(*),
        COALESCE(SUM(total), 0),
        COALESCE(SUM(platform_commission), 0)
    INTO v_total_orders, v_gross_revenue, v_platform_commission
    FROM orders
    WHERE provider_id = p_provider_id
      AND status IN ('completed', 'delivered')
      AND created_at >= p_period_start
      AND created_at < p_period_end + INTERVAL '1 day'
      AND (settlement_adjusted = false OR settlement_adjusted IS NULL);

    -- If no orders, don't create settlement
    IF v_total_orders = 0 THEN
        RETURN NULL;
    END IF;

    -- ═══════════════════════════════════════════════════════════════════
    -- Calculate COD breakdown
    -- ═══════════════════════════════════════════════════════════════════
    SELECT
        COUNT(*),
        COALESCE(SUM(total), 0),
        COALESCE(SUM(platform_commission), 0)
    INTO v_cod_orders_count, v_cod_gross_revenue, v_cod_commission
    FROM orders
    WHERE provider_id = p_provider_id
      AND status IN ('completed', 'delivered')
      AND payment_method = 'cash'
      AND created_at >= p_period_start
      AND created_at < p_period_end + INTERVAL '1 day'
      AND (settlement_adjusted = false OR settlement_adjusted IS NULL);

    -- ═══════════════════════════════════════════════════════════════════
    -- Calculate Online breakdown
    -- ═══════════════════════════════════════════════════════════════════
    SELECT
        COUNT(*),
        COALESCE(SUM(total), 0),
        COALESCE(SUM(platform_commission), 0)
    INTO v_online_orders_count, v_online_gross_revenue, v_online_commission
    FROM orders
    WHERE provider_id = p_provider_id
      AND status IN ('completed', 'delivered')
      AND payment_method != 'cash'
      AND created_at >= p_period_start
      AND created_at < p_period_end + INTERVAL '1 day'
      AND (settlement_adjusted = false OR settlement_adjusted IS NULL);

    -- Online payout = what platform owes provider for online orders
    v_online_payout := v_online_gross_revenue - v_online_commission;

    -- ═══════════════════════════════════════════════════════════════════
    -- FIXED: net_payout = gross_revenue - platform_commission
    -- This is what the merchant keeps after platform takes commission
    -- ═══════════════════════════════════════════════════════════════════
    v_net_payout := v_gross_revenue - v_platform_commission;

    -- Net balance: Online payout - COD commission owed
    -- Positive = Platform pays provider, Negative = Provider pays platform
    v_net_balance := v_online_payout - v_cod_commission;

    -- Determine settlement direction
    IF v_net_balance > 0.01 THEN
        v_settlement_direction := 'platform_pays_provider';
    ELSIF v_net_balance < -0.01 THEN
        v_settlement_direction := 'provider_pays_platform';
    ELSE
        v_settlement_direction := 'balanced';
    END IF;

    -- ═══════════════════════════════════════════════════════════════════
    -- Create settlement record
    -- ═══════════════════════════════════════════════════════════════════
    INSERT INTO settlements (
        provider_id,
        period_start,
        period_end,
        total_orders,
        gross_revenue,
        platform_commission,
        net_payout,
        -- COD breakdown
        cod_orders_count,
        cod_gross_revenue,
        cod_commission_owed,
        -- Online breakdown
        online_orders_count,
        online_gross_revenue,
        online_platform_commission,
        online_payout_owed,
        -- Net calculation
        net_balance,
        settlement_direction,
        status,
        processed_by
    ) VALUES (
        p_provider_id,
        p_period_start,
        p_period_end,
        v_total_orders,
        v_gross_revenue,
        v_platform_commission,
        v_net_payout,
        -- COD breakdown
        v_cod_orders_count,
        v_cod_gross_revenue,
        v_cod_commission,
        -- Online breakdown
        v_online_orders_count,
        v_online_gross_revenue,
        v_online_commission,
        v_online_payout,
        -- Net calculation
        v_net_balance,
        v_settlement_direction,
        'pending',
        p_created_by
    ) RETURNING id INTO v_settlement_id;

    RETURN v_settlement_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- Add comment for documentation
-- ═══════════════════════════════════════════════════════════════════
COMMENT ON FUNCTION generate_provider_settlement(UUID, DATE, DATE, UUID) IS
'Generate settlement for a provider for a specific period.

FIXED (2025-12-24):
- Uses correct column names (total, platform_commission instead of total_amount)
- Calculates net_payout = gross_revenue - platform_commission
- Uses platform_commission from orders (calculated by DB trigger)
- Respects grace period, refund adjustments, and custom rates

Returns:
- settlement_id if created successfully
- NULL if no orders found in period';

-- ═══════════════════════════════════════════════════════════════════
-- Grant execute permission
-- ═══════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION generate_provider_settlement(UUID, DATE, DATE, UUID) TO authenticated;
