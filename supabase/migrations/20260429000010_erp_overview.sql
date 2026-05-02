-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Phase 14 — ERP overview RPCs
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- Server-side aggregations that drive /admin/erp. Each section is its own
-- SECURITY DEFINER function so the API can fetch in parallel + admins (via
-- service_role through the API layer) get a single round-trip per section.
--
-- Sections:
--   1. erp_marketing_budget  — gift bucket spend vs. monthly cap
--   2. erp_revenue            — commissions + processing fees + partner-gift deductions for a window
--   3. erp_kpis               — DAU/WAU/MAU + AOV + new customers + completed orders
--   4. erp_cash_flow          — last N months revenue vs. expenses (for chart)
--   5. erp_expenses_by_category — manual expenses summed by category for a window
--
-- All amounts return as BIGINT piasters (caller divides by 100 for EGP).
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 1. erp_marketing_budget                                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.erp_marketing_budget(DATE);

CREATE OR REPLACE FUNCTION public.erp_marketing_budget(p_month_start DATE)
RETURNS TABLE (
  bucket TEXT,
  spent_piasters BIGINT,
  allocated_piasters BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_budget BIGINT;
  v_settings public.retention_settings%ROWTYPE;
  v_month_end DATE := (p_month_start + INTERVAL '1 month')::DATE;
BEGIN
  SELECT * INTO v_settings FROM public.retention_settings WHERE id = 1;
  v_total_budget := COALESCE(v_settings.monthly_total_budget_piasters, 0);

  RETURN QUERY
  WITH spend AS (
    SELECT COALESCE(l.bucket, 'unknown') AS bucket,
           SUM(l.amount_piasters)::BIGINT AS spent
    FROM public.gift_financial_log l
    WHERE l.transaction_type = 'grant'
      AND l.created_at >= p_month_start
      AND l.created_at <  v_month_end
    GROUP BY l.bucket
  ),
  alloc AS (
    SELECT 'mystery'::TEXT AS bucket,
           ROUND(v_total_budget * COALESCE(v_settings.bucket_mystery_percent, 0) / 100.0)::BIGINT AS allocated
    UNION ALL SELECT 'stamp',     ROUND(v_total_budget * COALESCE(v_settings.bucket_stamp_percent, 0) / 100.0)::BIGINT
    UNION ALL SELECT 'referral',  ROUND(v_total_budget * COALESCE(v_settings.bucket_referral_percent, 0) / 100.0)::BIGINT
    UNION ALL SELECT 'win_back',  ROUND(v_total_budget * COALESCE(v_settings.bucket_winback_percent, 0) / 100.0)::BIGINT
    UNION ALL SELECT 'welcome',   ROUND(v_total_budget * COALESCE(v_settings.bucket_welcome_percent, 0) / 100.0)::BIGINT
  )
  SELECT a.bucket,
         COALESCE(s.spent, 0)::BIGINT,
         a.allocated::BIGINT
  FROM alloc a
  LEFT JOIN spend s ON s.bucket = a.bucket
  UNION ALL
  -- Buckets that received spend but aren't in the allocated set (campaigns, birthday, etc.)
  SELECT s.bucket, s.spent::BIGINT, 0::BIGINT
  FROM spend s
  WHERE s.bucket NOT IN ('mystery', 'stamp', 'referral', 'win_back', 'welcome')
  ORDER BY 2 DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.erp_marketing_budget(DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.erp_marketing_budget(DATE) FROM anon;
REVOKE ALL ON FUNCTION public.erp_marketing_budget(DATE) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.erp_marketing_budget(DATE) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 2. erp_revenue — platform_commission + processing_fee + partner-gift delta    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Revenue components (EGP cents):
--   commission_piasters    — settlements.platform_commission across the window
--                            (× 100 since settlements stores DECIMAL EGP, not piasters)
--   processing_fee_piasters — orders.processing_fee_piasters for delivered+paid orders
--   partner_gift_revenue   — gifts where funder_type='partner': counted as revenue since
--                            we deduct from partner settlements (not paid out by us)

DROP FUNCTION IF EXISTS public.erp_revenue(DATE, DATE);

CREATE OR REPLACE FUNCTION public.erp_revenue(p_start DATE, p_end DATE)
RETURNS TABLE (
  commission_piasters BIGINT,
  processing_fee_piasters BIGINT,
  partner_gift_revenue_piasters BIGINT,
  settled_orders_count INT,
  delivered_orders_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((
      SELECT ROUND(SUM(s.platform_commission) * 100)::BIGINT
      FROM public.settlements s
      WHERE s.period_start >= p_start AND s.period_start < p_end
    ), 0) AS commission_piasters,
    COALESCE((
      SELECT SUM(o.processing_fee_piasters)::BIGINT
      FROM public.orders o
      WHERE o.status = 'delivered'
        AND o.payment_status = 'completed'
        AND o.created_at >= p_start AND o.created_at < p_end
    ), 0) AS processing_fee_piasters,
    COALESCE((
      SELECT SUM(l.amount_piasters)::BIGINT
      FROM public.gift_financial_log l
      WHERE l.transaction_type = 'grant'
        AND l.funder_type = 'partner'
        AND l.created_at >= p_start AND l.created_at < p_end
    ), 0) AS partner_gift_revenue_piasters,
    (
      SELECT COUNT(*)::INT FROM public.settlements s
      WHERE s.period_start >= p_start AND s.period_start < p_end
    ) AS settled_orders_count,
    (
      SELECT COUNT(*)::INT FROM public.orders o
      WHERE o.status = 'delivered'
        AND o.created_at >= p_start AND o.created_at < p_end
    ) AS delivered_orders_count;
END;
$$;

REVOKE ALL ON FUNCTION public.erp_revenue(DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.erp_revenue(DATE, DATE) FROM anon;
REVOKE ALL ON FUNCTION public.erp_revenue(DATE, DATE) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.erp_revenue(DATE, DATE) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 3. erp_kpis                                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.erp_kpis(DATE, DATE);

CREATE OR REPLACE FUNCTION public.erp_kpis(p_start DATE, p_end DATE)
RETURNS TABLE (
  dau INT,
  wau INT,
  mau INT,
  total_completed_orders INT,
  avg_order_value_piasters BIGINT,
  new_customers INT,
  conversion_rate_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_d1 TIMESTAMPTZ := v_now - INTERVAL '1 day';
  v_d7 TIMESTAMPTZ := v_now - INTERVAL '7 days';
  v_d30 TIMESTAMPTZ := v_now - INTERVAL '30 days';
  v_dau INT;
  v_wau INT;
  v_mau INT;
  v_orders INT;
  v_aov BIGINT;
  v_new_customers INT;
  v_first_orders INT;
  v_conversion NUMERIC;
BEGIN
  SELECT COUNT(DISTINCT customer_id)::INT INTO v_dau
  FROM public.orders WHERE created_at >= v_d1 AND customer_id IS NOT NULL;

  SELECT COUNT(DISTINCT customer_id)::INT INTO v_wau
  FROM public.orders WHERE created_at >= v_d7 AND customer_id IS NOT NULL;

  SELECT COUNT(DISTINCT customer_id)::INT INTO v_mau
  FROM public.orders WHERE created_at >= v_d30 AND customer_id IS NOT NULL;

  -- AOV across delivered orders in the period (subtotal × 100 → piasters)
  SELECT COUNT(*)::INT,
         COALESCE(ROUND(AVG(subtotal) * 100)::BIGINT, 0)
    INTO v_orders, v_aov
  FROM public.orders
  WHERE status = 'delivered'
    AND created_at >= p_start AND created_at < p_end;

  -- New customers signed up in the window
  SELECT COUNT(*)::INT INTO v_new_customers
  FROM public.profiles
  WHERE role = 'customer'
    AND created_at >= p_start AND created_at < p_end;

  -- Conversion (window-bounded): of those who signed up in the window, how many
  -- placed at least one order in the same window. Avoids cross-window noise.
  SELECT COUNT(DISTINCT p.id)::INT INTO v_first_orders
  FROM public.profiles p
  JOIN public.orders o ON o.customer_id = p.id
  WHERE p.role = 'customer'
    AND p.created_at >= p_start AND p.created_at < p_end
    AND o.created_at >= p_start AND o.created_at < p_end;

  v_conversion := CASE WHEN v_new_customers > 0
    THEN ROUND((v_first_orders::NUMERIC / v_new_customers) * 100, 2)
    ELSE 0
  END;

  dau := v_dau;
  wau := v_wau;
  mau := v_mau;
  total_completed_orders := v_orders;
  avg_order_value_piasters := v_aov;
  new_customers := v_new_customers;
  conversion_rate_percent := v_conversion;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.erp_kpis(DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.erp_kpis(DATE, DATE) FROM anon;
REVOKE ALL ON FUNCTION public.erp_kpis(DATE, DATE) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.erp_kpis(DATE, DATE) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 4. erp_cash_flow — last N months revenue vs. expenses (chart data)            ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.erp_cash_flow(INT);

CREATE OR REPLACE FUNCTION public.erp_cash_flow(p_months INT DEFAULT 12)
RETURNS TABLE (
  month_start DATE,
  revenue_piasters BIGINT,
  expenses_piasters BIGINT,
  gift_spend_piasters BIGINT,
  net_piasters BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_months INT := GREATEST(1, LEAST(p_months, 24));
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT (DATE_TRUNC('month', NOW()) - (i || ' months')::INTERVAL)::DATE AS m_start,
           (DATE_TRUNC('month', NOW()) - (i || ' months')::INTERVAL + INTERVAL '1 month')::DATE AS m_end
    FROM generate_series(0, v_months - 1) AS i
  ),
  rev AS (
    SELECT m.m_start,
           COALESCE(ROUND(SUM(s.platform_commission) * 100)::BIGINT, 0) AS revenue
    FROM months m
    LEFT JOIN public.settlements s
      ON s.period_start >= m.m_start AND s.period_start < m.m_end
    GROUP BY m.m_start
  ),
  exp AS (
    SELECT m.m_start,
           COALESCE(SUM(e.amount_piasters)::BIGINT, 0) AS expenses
    FROM months m
    LEFT JOIN public.operational_expenses e
      ON e.incurred_date >= m.m_start AND e.incurred_date < m.m_end
    GROUP BY m.m_start
  ),
  gifts AS (
    SELECT m.m_start,
           COALESCE(SUM(l.amount_piasters)::BIGINT, 0) AS gift_spend
    FROM months m
    LEFT JOIN public.gift_financial_log l
      ON l.transaction_type = 'grant'
     AND l.funder_type = 'engezna'
     AND l.created_at >= m.m_start AND l.created_at < m.m_end
    GROUP BY m.m_start
  )
  SELECT r.m_start,
         r.revenue::BIGINT,
         e.expenses::BIGINT,
         g.gift_spend::BIGINT,
         (r.revenue - e.expenses - g.gift_spend)::BIGINT AS net
  FROM rev r
  JOIN exp e ON e.m_start = r.m_start
  JOIN gifts g ON g.m_start = r.m_start
  ORDER BY r.m_start ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.erp_cash_flow(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.erp_cash_flow(INT) FROM anon;
REVOKE ALL ON FUNCTION public.erp_cash_flow(INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.erp_cash_flow(INT) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ 5. erp_expenses_by_category                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.erp_expenses_by_category(DATE, DATE);

CREATE OR REPLACE FUNCTION public.erp_expenses_by_category(p_start DATE, p_end DATE)
RETURNS TABLE (
  category TEXT,
  total_piasters BIGINT,
  count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT e.category::TEXT,
         SUM(e.amount_piasters)::BIGINT,
         COUNT(*)::INT
  FROM public.operational_expenses e
  WHERE e.incurred_date >= p_start AND e.incurred_date < p_end
  GROUP BY e.category
  ORDER BY 2 DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.erp_expenses_by_category(DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.erp_expenses_by_category(DATE, DATE) FROM anon;
REVOKE ALL ON FUNCTION public.erp_expenses_by_category(DATE, DATE) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.erp_expenses_by_category(DATE, DATE) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Performance indexes for the windowed scans above                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_settlements_period_start
  ON public.settlements (period_start);

CREATE INDEX IF NOT EXISTS idx_gift_financial_log_created_funder
  ON public.gift_financial_log (created_at, funder_type)
  WHERE transaction_type = 'grant';

CREATE INDEX IF NOT EXISTS idx_orders_created_status_customer
  ON public.orders (created_at, status, customer_id);
