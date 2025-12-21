-- ============================================================================
-- Migration: Fix Refunds & Settlements Integration
-- إصلاح تكامل الاستردادات مع التسويات
-- ============================================================================
-- Date: 2025-12-21
-- Fixes:
--   1. CRITICAL: Partial refund now reduces commission proportionally (not zero)
--   2. CRITICAL: Settlement generation excludes adjusted orders
--   3. HIGH: Update settlement when refund is confirmed (retroactive)
--   4. MEDIUM: Add settlement adjustment audit trail
-- ============================================================================

-- ============================================================================
-- 1. CREATE SETTLEMENT ADJUSTMENTS AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlement_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL,

  -- Adjustment details
  adjustment_type VARCHAR(30) NOT NULL CHECK (adjustment_type IN ('refund_full', 'refund_partial', 'manual', 'correction')),

  -- Financial impact
  original_commission DECIMAL(10,2) NOT NULL,
  new_commission DECIMAL(10,2) NOT NULL,
  commission_reduction DECIMAL(10,2) NOT NULL, -- Positive = reduction

  -- Refund details
  refund_amount DECIMAL(10,2),
  order_total DECIMAL(10,2),
  refund_percentage DECIMAL(5,2), -- For partial refunds

  -- Audit
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_settlement_adjustments_settlement ON settlement_adjustments(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_adjustments_order ON settlement_adjustments(order_id);
CREATE INDEX IF NOT EXISTS idx_settlement_adjustments_refund ON settlement_adjustments(refund_id);
CREATE INDEX IF NOT EXISTS idx_settlement_adjustments_created ON settlement_adjustments(created_at);

-- RLS
ALTER TABLE settlement_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settlement adjustments"
  ON settlement_adjustments FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage settlement adjustments"
  ON settlement_adjustments FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE settlement_adjustments IS 'Audit trail for settlement adjustments due to refunds';

-- ============================================================================
-- 2. FIX: PROPORTIONAL COMMISSION REDUCTION FOR PARTIAL REFUNDS
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_refund_settlement_update()
RETURNS TRIGGER AS $$
DECLARE
  v_order RECORD;
  v_refund_percentage DECIMAL(5,2);
  v_commission_reduction DECIMAL(10,2);
  v_new_commission DECIMAL(10,2);
  v_settlement_id UUID;
BEGIN
  -- When customer confirms receiving the refund
  IF NEW.customer_confirmed = true AND (OLD.customer_confirmed = false OR OLD.customer_confirmed IS NULL) THEN
    -- Set confirmation timestamp
    NEW.customer_confirmed_at = NOW();

    -- Update order to reduce commission if affects_settlement is true
    IF NEW.affects_settlement = true THEN
      -- Get order details
      SELECT id, total, platform_commission, settlement_adjusted, original_commission
      INTO v_order
      FROM orders
      WHERE id = NEW.order_id;

      -- Only adjust if not already adjusted
      IF NOT v_order.settlement_adjusted THEN
        -- Calculate refund percentage
        IF v_order.total > 0 THEN
          v_refund_percentage := ROUND((NEW.amount / v_order.total) * 100, 2);
        ELSE
          v_refund_percentage := 100;
        END IF;

        -- Calculate proportional commission reduction
        IF NEW.refund_type = 'full' OR v_refund_percentage >= 100 THEN
          -- Full refund: zero out commission
          v_commission_reduction := v_order.platform_commission;
          v_new_commission := 0;
        ELSE
          -- Partial refund: reduce commission proportionally
          v_commission_reduction := ROUND(v_order.platform_commission * (v_refund_percentage / 100), 2);
          v_new_commission := v_order.platform_commission - v_commission_reduction;
        END IF;

        -- Update order with new commission
        UPDATE orders
        SET
          original_commission = COALESCE(original_commission, platform_commission),
          platform_commission = v_new_commission,
          settlement_adjusted = true,
          settlement_notes = COALESCE(settlement_notes, '') ||
            E'\n[' || NOW()::TEXT || '] ' ||
            CASE
              WHEN NEW.refund_type = 'full' THEN 'استرداد كامل'
              ELSE 'استرداد جزئي (' || v_refund_percentage || '%)'
            END ||
            ' - تخفيض العمولة من ' || v_order.platform_commission || ' إلى ' || v_new_commission ||
            ' (تخفيض: ' || v_commission_reduction || ') - رقم الاسترداد: ' || NEW.id::TEXT
        WHERE id = NEW.order_id;

        -- Find if order is in any settlement
        SELECT si.settlement_id INTO v_settlement_id
        FROM settlement_items si
        WHERE si.order_id = NEW.order_id
        LIMIT 1;

        -- Create audit record
        INSERT INTO settlement_adjustments (
          settlement_id,
          order_id,
          refund_id,
          adjustment_type,
          original_commission,
          new_commission,
          commission_reduction,
          refund_amount,
          order_total,
          refund_percentage,
          reason
        ) VALUES (
          v_settlement_id,
          NEW.order_id,
          NEW.id,
          CASE WHEN NEW.refund_type = 'full' THEN 'refund_full' ELSE 'refund_partial' END,
          v_order.platform_commission,
          v_new_commission,
          v_commission_reduction,
          NEW.amount,
          v_order.total,
          v_refund_percentage,
          CASE
            WHEN NEW.refund_type = 'full' THEN 'استرداد كامل - تأكيد العميل'
            ELSE 'استرداد جزئي (' || NEW.amount || ' من ' || v_order.total || ') - تأكيد العميل'
          END
        );

        -- Update settlement if exists
        IF v_settlement_id IS NOT NULL THEN
          PERFORM update_settlement_after_refund(v_settlement_id, NEW.order_id, v_commission_reduction);
        END IF;
      END IF;
    END IF;
  END IF;

  -- When provider confirms cash refund
  IF NEW.provider_action = 'cash_refund' AND (OLD.provider_action != 'cash_refund' OR OLD.provider_action IS NULL) THEN
    NEW.provider_responded_at = NOW();
    -- Set confirmation deadline to 48 hours from now
    IF NEW.confirmation_deadline IS NULL THEN
      NEW.confirmation_deadline = NOW() + INTERVAL '48 hours';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. FUNCTION: UPDATE SETTLEMENT AFTER REFUND CONFIRMATION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_settlement_after_refund(
  p_settlement_id UUID,
  p_order_id UUID,
  p_commission_reduction DECIMAL(10,2)
)
RETURNS VOID AS $$
DECLARE
  v_settlement RECORD;
BEGIN
  -- Get current settlement
  SELECT * INTO v_settlement
  FROM settlements
  WHERE id = p_settlement_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Update settlement totals
  UPDATE settlements
  SET
    platform_commission = GREATEST(platform_commission - p_commission_reduction, 0),
    net_amount_due = GREATEST(net_amount_due - p_commission_reduction, 0),
    -- Update COD commission if applicable
    cod_commission_owed = CASE
      WHEN cod_commission_owed IS NOT NULL
      THEN GREATEST(cod_commission_owed - p_commission_reduction, 0)
      ELSE cod_commission_owed
    END,
    notes = COALESCE(notes, '') ||
      E'\n[' || NOW()::TEXT || '] تعديل بسبب استرداد - تخفيض العمولة: ' || p_commission_reduction,
    updated_at = NOW()
  WHERE id = p_settlement_id;

  -- Update settlement_items for this order
  UPDATE settlement_items
  SET commission_amount = GREATEST(commission_amount - p_commission_reduction, 0)
  WHERE settlement_id = p_settlement_id AND order_id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. FIX: EXCLUDE ADJUSTED ORDERS FROM SETTLEMENT GENERATION
-- ============================================================================

-- Fix generate_provider_settlement
CREATE OR REPLACE FUNCTION generate_provider_settlement(
    p_provider_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_settlement_id UUID;
    v_commission_rate DECIMAL(5,2) := 6.00;
    v_total_orders INTEGER;
    v_gross_revenue DECIMAL(10,2);
    v_platform_commission DECIMAL(10,2);
    v_delivery_fees DECIMAL(10,2);
    v_net_due DECIMAL(10,2);
    v_due_date DATE;
    v_order RECORD;
BEGIN
    -- Calculate totals from completed orders in the period
    -- FIXED: Exclude orders that have been adjusted due to refunds
    SELECT
        COUNT(*),
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(platform_commission), 0), -- Use current commission (may be reduced)
        COALESCE(SUM(delivery_fee), 0)
    INTO v_total_orders, v_gross_revenue, v_platform_commission, v_delivery_fees
    FROM orders
    WHERE provider_id = p_provider_id
    AND status IN ('completed', 'delivered')
    AND created_at >= p_period_start
    AND created_at < p_period_end + INTERVAL '1 day'
    AND (settlement_adjusted = false OR settlement_adjusted IS NULL); -- FIXED: Exclude adjusted

    -- If no orders, don't create settlement
    IF v_total_orders = 0 THEN
        RETURN NULL;
    END IF;

    -- Net due = commission (already calculated from orders)
    v_net_due := v_platform_commission;

    -- Due date is 7 days after period end
    v_due_date := p_period_end + INTERVAL '7 days';

    -- Create settlement record
    INSERT INTO settlements (
        provider_id,
        period_start,
        period_end,
        total_orders,
        gross_revenue,
        platform_commission,
        delivery_fees_collected,
        net_amount_due,
        due_date,
        created_by
    ) VALUES (
        p_provider_id,
        p_period_start,
        p_period_end,
        v_total_orders,
        v_gross_revenue,
        v_platform_commission,
        v_delivery_fees,
        v_net_due,
        v_due_date,
        p_created_by
    ) RETURNING id INTO v_settlement_id;

    -- Add settlement items (individual orders)
    -- FIXED: Use current platform_commission (may be reduced by refund)
    FOR v_order IN
        SELECT id, total_amount, platform_commission, delivery_fee
        FROM orders
        WHERE provider_id = p_provider_id
        AND status IN ('completed', 'delivered')
        AND created_at >= p_period_start
        AND created_at < p_period_end + INTERVAL '1 day'
        AND (settlement_adjusted = false OR settlement_adjusted IS NULL)
    LOOP
        INSERT INTO settlement_items (
            settlement_id,
            order_id,
            order_total,
            commission_rate,
            commission_amount,
            delivery_fee
        ) VALUES (
            v_settlement_id,
            v_order.id,
            v_order.total_amount,
            v_commission_rate,
            v_order.platform_commission, -- FIXED: Use actual commission from order
            COALESCE(v_order.delivery_fee, 0)
        );
    END LOOP;

    RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. FIX: UPDATE generate_auto_settlements TO EXCLUDE ADJUSTED ORDERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_auto_settlements(
  p_frequency TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group RECORD;
  v_provider RECORD;
  v_order_stats RECORD;
  v_settlement_id UUID;
  v_period_start TIMESTAMP WITH TIME ZONE;
  v_period_end TIMESTAMP WITH TIME ZONE;
  v_settlements_created INTEGER := 0;
  v_total_amount NUMERIC := 0;
  v_day_of_week INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM NOW());

  FOR v_group IN
    SELECT * FROM settlement_groups
    WHERE is_active = true
    AND (p_frequency IS NULL OR frequency = p_frequency)
  LOOP
    CASE v_group.frequency
      WHEN 'daily' THEN
        v_period_start := DATE_TRUNC('day', NOW() - INTERVAL '1 day');
        v_period_end := DATE_TRUNC('day', NOW()) - INTERVAL '1 second';

      WHEN '3_days' THEN
        IF EXTRACT(DOY FROM NOW())::INTEGER % 3 != 0 THEN
          CONTINUE;
        END IF;
        v_period_start := DATE_TRUNC('day', NOW() - INTERVAL '3 days');
        v_period_end := DATE_TRUNC('day', NOW()) - INTERVAL '1 second';

      WHEN 'weekly' THEN
        IF v_day_of_week != 6 THEN
          CONTINUE;
        END IF;
        v_period_start := DATE_TRUNC('day', NOW() - INTERVAL '7 days');
        v_period_end := DATE_TRUNC('day', NOW()) - INTERVAL '1 second';

      ELSE
        CONTINUE;
    END CASE;

    FOR v_provider IN
      SELECT p.*
      FROM providers p
      WHERE p.settlement_group_id = v_group.id
      AND p.is_approved = true
    LOOP
      IF EXISTS (
        SELECT 1 FROM settlements
        WHERE provider_id = v_provider.id
        AND period_start = v_period_start
        AND period_end = v_period_end
      ) THEN
        CONTINUE;
      END IF;

      -- FIXED: Calculate stats excluding adjusted orders
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as gross_revenue,
        COALESCE(SUM(platform_commission), 0) as total_commission,
        COUNT(*) FILTER (WHERE payment_method = 'cash') as cod_orders,
        COALESCE(SUM(total) FILTER (WHERE payment_method = 'cash'), 0) as cod_revenue,
        COALESCE(SUM(platform_commission) FILTER (WHERE payment_method = 'cash'), 0) as cod_commission,
        COUNT(*) FILTER (WHERE payment_method = 'online') as online_orders,
        COALESCE(SUM(total) FILTER (WHERE payment_method = 'online'), 0) as online_revenue,
        COALESCE(SUM(platform_commission) FILTER (WHERE payment_method = 'online'), 0) as online_commission
      INTO v_order_stats
      FROM orders
      WHERE provider_id = v_provider.id
      AND status = 'delivered'
      AND created_at >= v_period_start
      AND created_at <= v_period_end
      AND (settlement_adjusted = false OR settlement_adjusted IS NULL); -- FIXED

      IF v_order_stats.total_orders > 0 THEN
        INSERT INTO settlements (
          provider_id,
          period_start,
          period_end,
          total_orders,
          gross_revenue,
          platform_commission,
          net_payout,
          status,
          cod_orders_count,
          cod_gross_revenue,
          cod_commission_owed,
          online_orders_count,
          online_gross_revenue,
          online_platform_commission,
          online_payout_owed,
          notes
        ) VALUES (
          v_provider.id,
          v_period_start,
          v_period_end,
          v_order_stats.total_orders,
          v_order_stats.gross_revenue,
          v_order_stats.total_commission,
          v_order_stats.gross_revenue - v_order_stats.total_commission,
          'pending',
          v_order_stats.cod_orders,
          v_order_stats.cod_revenue,
          v_order_stats.cod_commission,
          v_order_stats.online_orders,
          v_order_stats.online_revenue,
          v_order_stats.online_commission,
          v_order_stats.online_revenue - v_order_stats.online_commission,
          'تسوية تلقائية - ' || v_group.name_ar
        )
        RETURNING id INTO v_settlement_id;

        v_settlements_created := v_settlements_created + 1;
        v_total_amount := v_total_amount + (v_order_stats.gross_revenue - v_order_stats.total_commission);
      END IF;
    END LOOP;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'settlements_created', v_settlements_created,
    'total_amount', v_total_amount,
    'generated_at', NOW()
  );
END;
$$;

-- ============================================================================
-- 6. FUNCTION: RECALCULATE SETTLEMENT (For manual recalculation)
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_settlement(p_settlement_id UUID)
RETURNS JSON AS $$
DECLARE
  v_settlement RECORD;
  v_new_totals RECORD;
BEGIN
  -- Get settlement
  SELECT * INTO v_settlement FROM settlements WHERE id = p_settlement_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Settlement not found');
  END IF;

  -- Recalculate from settlement_items (which should reflect current order state)
  SELECT
    COUNT(*) as total_orders,
    COALESCE(SUM(order_total), 0) as gross_revenue,
    COALESCE(SUM(commission_amount), 0) as platform_commission
  INTO v_new_totals
  FROM settlement_items
  WHERE settlement_id = p_settlement_id;

  -- Update settlement
  UPDATE settlements
  SET
    total_orders = v_new_totals.total_orders,
    gross_revenue = v_new_totals.gross_revenue,
    platform_commission = v_new_totals.platform_commission,
    net_amount_due = v_new_totals.platform_commission,
    notes = COALESCE(notes, '') || E'\n[' || NOW()::TEXT || '] إعادة حساب التسوية يدوياً',
    updated_at = NOW()
  WHERE id = p_settlement_id;

  RETURN json_build_object(
    'success', true,
    'old_commission', v_settlement.platform_commission,
    'new_commission', v_new_totals.platform_commission,
    'difference', v_settlement.platform_commission - v_new_totals.platform_commission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. VIEW: REFUNDS WITH SETTLEMENT IMPACT
-- ============================================================================

CREATE OR REPLACE VIEW refunds_with_settlement_impact AS
SELECT
  r.*,
  o.order_number,
  o.total as order_total,
  o.platform_commission as current_commission,
  o.original_commission,
  o.settlement_adjusted,
  CASE
    WHEN r.refund_type = 'full' THEN o.original_commission
    WHEN o.total > 0 THEN ROUND(COALESCE(o.original_commission, o.platform_commission) * (r.amount / o.total), 2)
    ELSE 0
  END as commission_impact,
  sa.settlement_id,
  sa.created_at as adjustment_date,
  s.period_start as settlement_period_start,
  s.period_end as settlement_period_end,
  s.status as settlement_status
FROM refunds r
JOIN orders o ON o.id = r.order_id
LEFT JOIN settlement_adjustments sa ON sa.refund_id = r.id
LEFT JOIN settlements s ON s.id = sa.settlement_id;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON refunds_with_settlement_impact TO authenticated;
GRANT EXECUTE ON FUNCTION update_settlement_after_refund(UUID, UUID, DECIMAL) TO service_role;
GRANT EXECUTE ON FUNCTION recalculate_settlement(UUID) TO service_role;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
