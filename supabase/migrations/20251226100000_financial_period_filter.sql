-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Financial Period Filter Function
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2025-12-26
-- Purpose: Add function to filter financial data by date range
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Function: get_provider_financial_data                                          ║
-- ║ Returns financial summary for a provider filtered by date range                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION get_provider_financial_data(
  p_provider_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  provider_id UUID,
  provider_name_ar TEXT,
  provider_name_en TEXT,
  governorate_id UUID,
  city_id UUID,
  commission_rate DECIMAL(5,2),
  commission_status TEXT,
  grace_period_end TIMESTAMPTZ,
  delivery_responsibility TEXT,

  -- Counts
  total_orders BIGINT,
  cod_orders_count BIGINT,
  online_orders_count BIGINT,
  eligible_orders_count BIGINT,
  held_orders_count BIGINT,
  settled_orders_count BIGINT,

  -- Gross Revenue
  gross_revenue DECIMAL(12,2),
  cod_gross_revenue DECIMAL(12,2),
  online_gross_revenue DECIMAL(12,2),

  -- Subtotals
  total_subtotal DECIMAL(12,2),
  cod_subtotal DECIMAL(12,2),
  online_subtotal DECIMAL(12,2),

  -- Delivery Fees
  total_delivery_fees DECIMAL(12,2),
  cod_delivery_fees DECIMAL(12,2),
  online_delivery_fees DECIMAL(12,2),

  -- Discounts
  total_discounts DECIMAL(12,2),

  -- Commission (Theoretical)
  theoretical_commission DECIMAL(12,2),
  cod_theoretical_commission DECIMAL(12,2),
  online_theoretical_commission DECIMAL(12,2),

  -- Commission (Actual)
  actual_commission DECIMAL(12,2),
  cod_actual_commission DECIMAL(12,2),
  online_actual_commission DECIMAL(12,2),

  -- Grace Period
  total_grace_period_discount DECIMAL(12,2),

  -- Refunds
  total_refunds DECIMAL(12,2),
  total_refund_commission_reduction DECIMAL(12,2),
  refund_percentage DECIMAL(5,4),

  -- Calculated Fields
  net_commission DECIMAL(12,2),
  cod_commission_owed DECIMAL(12,2),
  online_payout_owed DECIMAL(12,2),
  net_balance DECIMAL(12,2),
  settlement_direction TEXT,
  is_in_grace_period BOOLEAN,
  grace_period_days_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH order_financials AS (
    SELECT
      o.id AS order_id,
      o.provider_id,
      o.created_at AS order_date,
      o.status AS order_status,
      o.payment_method,
      o.payment_status,
      o.settlement_status,

      -- Base amounts
      COALESCE(o.subtotal, 0)::DECIMAL(12,2) AS subtotal,
      COALESCE(o.delivery_fee, 0)::DECIMAL(12,2) AS delivery_fee,
      COALESCE(o.discount, 0)::DECIMAL(12,2) AS discount,
      COALESCE(o.total, 0)::DECIMAL(12,2) AS order_total,

      -- Commission
      COALESCE(o.original_commission, 0)::DECIMAL(12,2) AS theoretical_commission,
      COALESCE(o.platform_commission, 0)::DECIMAL(12,2) AS actual_commission,
      COALESCE(o.grace_period_discount, 0)::DECIMAL(12,2) AS grace_period_discount,

      -- Refunds
      COALESCE(
        (SELECT SUM(amount) FROM refunds r
         WHERE r.order_id = o.id AND r.status = 'processed'),
        0
      )::DECIMAL(12,2) AS refund_amount,
      COALESCE(
        (SELECT SUM(COALESCE(
          (r.metadata->>'commission_reduction')::DECIMAL(12,2),
          0
        )) FROM refunds r
         WHERE r.order_id = o.id AND r.status = 'processed'),
        0
      )::DECIMAL(12,2) AS refund_commission_reduction,

      -- Payment method flags
      CASE WHEN o.payment_method = 'cash' THEN TRUE ELSE FALSE END AS is_cod,
      CASE WHEN o.payment_method != 'cash' THEN TRUE ELSE FALSE END AS is_online

    FROM orders o
    WHERE o.provider_id = p_provider_id
      AND o.status = 'delivered'
      AND (p_start_date IS NULL OR o.created_at >= p_start_date)
      AND (p_end_date IS NULL OR o.created_at <= p_end_date)
  ),
  provider_info AS (
    SELECT
      p.id,
      p.name_ar,
      p.name_en,
      p.governorate_id,
      p.city_id,
      p.commission_status,
      p.grace_period_end,
      COALESCE(p.custom_commission_rate, p.commission_rate, 7.00) AS commission_rate,
      COALESCE(p.delivery_responsibility, 'merchant_delivery') AS delivery_responsibility
    FROM providers p
    WHERE p.id = p_provider_id
  ),
  aggregated AS (
    SELECT
      pi.id AS provider_id,
      pi.name_ar AS provider_name_ar,
      pi.name_en AS provider_name_en,
      pi.governorate_id,
      pi.city_id,
      pi.commission_rate,
      pi.commission_status,
      pi.grace_period_end,
      pi.delivery_responsibility,

      -- Counts
      COALESCE(COUNT(of.order_id), 0)::BIGINT AS total_orders,
      COALESCE(COUNT(of.order_id) FILTER (WHERE of.is_cod), 0)::BIGINT AS cod_orders_count,
      COALESCE(COUNT(of.order_id) FILTER (WHERE of.is_online), 0)::BIGINT AS online_orders_count,
      COALESCE(COUNT(of.order_id) FILTER (WHERE of.settlement_status = 'eligible'), 0)::BIGINT AS eligible_orders_count,
      COALESCE(COUNT(of.order_id) FILTER (WHERE of.settlement_status = 'on_hold'), 0)::BIGINT AS held_orders_count,
      COALESCE(COUNT(of.order_id) FILTER (WHERE of.settlement_status = 'settled'), 0)::BIGINT AS settled_orders_count,

      -- Gross Revenue
      COALESCE(SUM(of.order_total), 0)::DECIMAL(12,2) AS gross_revenue,
      COALESCE(SUM(of.order_total) FILTER (WHERE of.is_cod), 0)::DECIMAL(12,2) AS cod_gross_revenue,
      COALESCE(SUM(of.order_total) FILTER (WHERE of.is_online), 0)::DECIMAL(12,2) AS online_gross_revenue,

      -- Subtotals
      COALESCE(SUM(of.subtotal), 0)::DECIMAL(12,2) AS total_subtotal,
      COALESCE(SUM(of.subtotal) FILTER (WHERE of.is_cod), 0)::DECIMAL(12,2) AS cod_subtotal,
      COALESCE(SUM(of.subtotal) FILTER (WHERE of.is_online), 0)::DECIMAL(12,2) AS online_subtotal,

      -- Delivery Fees
      COALESCE(SUM(of.delivery_fee), 0)::DECIMAL(12,2) AS total_delivery_fees,
      COALESCE(SUM(of.delivery_fee) FILTER (WHERE of.is_cod), 0)::DECIMAL(12,2) AS cod_delivery_fees,
      COALESCE(SUM(of.delivery_fee) FILTER (WHERE of.is_online), 0)::DECIMAL(12,2) AS online_delivery_fees,

      -- Discounts
      COALESCE(SUM(of.discount), 0)::DECIMAL(12,2) AS total_discounts,

      -- Commission (Theoretical)
      COALESCE(SUM(of.theoretical_commission), 0)::DECIMAL(12,2) AS theoretical_commission,
      COALESCE(SUM(of.theoretical_commission) FILTER (WHERE of.is_cod), 0)::DECIMAL(12,2) AS cod_theoretical_commission,
      COALESCE(SUM(of.theoretical_commission) FILTER (WHERE of.is_online), 0)::DECIMAL(12,2) AS online_theoretical_commission,

      -- Commission (Actual)
      COALESCE(SUM(of.actual_commission), 0)::DECIMAL(12,2) AS actual_commission,
      COALESCE(SUM(of.actual_commission) FILTER (WHERE of.is_cod), 0)::DECIMAL(12,2) AS cod_actual_commission,
      COALESCE(SUM(of.actual_commission) FILTER (WHERE of.is_online), 0)::DECIMAL(12,2) AS online_actual_commission,

      -- Grace Period
      COALESCE(SUM(of.grace_period_discount), 0)::DECIMAL(12,2) AS total_grace_period_discount,

      -- Refunds
      COALESCE(SUM(of.refund_amount), 0)::DECIMAL(12,2) AS total_refunds,
      COALESCE(SUM(of.refund_commission_reduction), 0)::DECIMAL(12,2) AS total_refund_commission_reduction,

      -- Refund percentage
      CASE
        WHEN COALESCE(SUM(of.order_total - of.delivery_fee), 0) > 0
        THEN (COALESCE(SUM(of.refund_amount), 0) / COALESCE(SUM(of.order_total - of.delivery_fee), 1))
        ELSE 0
      END::DECIMAL(5,4) AS refund_percentage

    FROM provider_info pi
    LEFT JOIN order_financials of ON of.provider_id = pi.id
    GROUP BY pi.id, pi.name_ar, pi.name_en, pi.governorate_id, pi.city_id,
             pi.commission_rate, pi.commission_status, pi.grace_period_end, pi.delivery_responsibility
  )
  SELECT
    a.provider_id,
    a.provider_name_ar,
    a.provider_name_en,
    a.governorate_id,
    a.city_id,
    a.commission_rate,
    a.commission_status,
    a.grace_period_end,
    a.delivery_responsibility,

    a.total_orders,
    a.cod_orders_count,
    a.online_orders_count,
    a.eligible_orders_count,
    a.held_orders_count,
    a.settled_orders_count,

    a.gross_revenue,
    a.cod_gross_revenue,
    a.online_gross_revenue,

    a.total_subtotal,
    a.cod_subtotal,
    a.online_subtotal,

    a.total_delivery_fees,
    a.cod_delivery_fees,
    a.online_delivery_fees,

    a.total_discounts,

    a.theoretical_commission,
    a.cod_theoretical_commission,
    a.online_theoretical_commission,

    a.actual_commission,
    a.cod_actual_commission,
    a.online_actual_commission,

    a.total_grace_period_discount,

    a.total_refunds,
    a.total_refund_commission_reduction,
    a.refund_percentage,

    -- Net Commission
    GREATEST(a.actual_commission - a.total_refund_commission_reduction, 0)::DECIMAL(12,2) AS net_commission,

    -- COD Commission Owed
    a.cod_actual_commission AS cod_commission_owed,

    -- Online Payout Owed
    GREATEST(
      (a.online_subtotal - a.total_discounts) - a.online_actual_commission + a.online_delivery_fees,
      0
    )::DECIMAL(12,2) AS online_payout_owed,

    -- Net Balance
    (GREATEST(
      (a.online_subtotal - a.total_discounts) - a.online_actual_commission + a.online_delivery_fees,
      0
    ) - a.cod_actual_commission)::DECIMAL(12,2) AS net_balance,

    -- Settlement Direction
    CASE
      WHEN GREATEST((a.online_subtotal - a.total_discounts) - a.online_actual_commission + a.online_delivery_fees, 0) > a.cod_actual_commission
        THEN 'platform_pays_provider'
      WHEN a.cod_actual_commission > GREATEST((a.online_subtotal - a.total_discounts) - a.online_actual_commission + a.online_delivery_fees, 0)
        THEN 'provider_pays_platform'
      ELSE 'balanced'
    END AS settlement_direction,

    -- Grace Period Status
    (a.grace_period_end IS NOT NULL AND a.grace_period_end > NOW()) AS is_in_grace_period,

    -- Grace Period Days Remaining
    CASE
      WHEN a.grace_period_end IS NOT NULL AND a.grace_period_end > NOW()
      THEN GREATEST(EXTRACT(DAY FROM (a.grace_period_end - NOW()))::INTEGER, 0)
      ELSE 0
    END AS grace_period_days_remaining

  FROM aggregated a;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION get_provider_financial_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_financial_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION get_provider_financial_data IS
'Returns financial summary for a provider filtered by optional date range.
Parameters:
- p_provider_id: The provider UUID (required)
- p_start_date: Start of date range (optional, NULL for no lower bound)
- p_end_date: End of date range (optional, NULL for no upper bound)

Returns the same structure as financial_settlement_engine view but filtered by date.';
