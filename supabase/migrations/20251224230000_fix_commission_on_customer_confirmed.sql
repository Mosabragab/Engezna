-- ============================================================================
-- Migration: Fix Commission Update When Customer Confirms Refund
-- إصلاح تحديث العمولة عند تأكيد العميل استلام المرتجع
-- ============================================================================
-- Date: 2025-12-24
-- Problem: original_commission not updated for grace period merchants
-- Business Logic: Commission/settlement updated ONLY when customer confirms
-- Fix: Update BOTH platform_commission AND original_commission properly
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. FIX THE REFUND TRIGGER TO PROPERLY UPDATE original_commission
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_refund_settlement_update()
RETURNS TRIGGER AS $$
DECLARE
  v_order RECORD;
  v_refund_percentage DECIMAL(5,2);
  v_commission_reduction DECIMAL(10,2);
  v_new_commission DECIMAL(10,2);
  v_settlement_id UUID;
  v_should_adjust BOOLEAN := FALSE;
BEGIN
  -- ========================================================================
  -- TRIGGER CONDITION: ONLY when customer confirms receiving the refund
  -- العمولة تُحدّث فقط عند تأكيد العميل استلام المرتجع
  -- This is the correct business logic:
  -- 1. Customer requests refund → no change
  -- 2. Provider approves → no change
  -- 3. Provider pays customer → no change
  -- 4. Customer confirms receiving refund → NOW update commission/settlement
  -- ========================================================================
  IF (NEW.customer_confirmed = true
      AND (OLD.customer_confirmed = false OR OLD.customer_confirmed IS NULL)
      AND NEW.affects_settlement = true) THEN
    NEW.customer_confirmed_at = NOW();
    v_should_adjust := TRUE;
  END IF;

  -- ========================================================================
  -- PROCESS ADJUSTMENT IF NEEDED
  -- ========================================================================
  IF v_should_adjust THEN
    -- Get order details
    SELECT id, total, subtotal, discount, delivery_fee, platform_commission, settlement_adjusted, original_commission
    INTO v_order
    FROM orders
    WHERE id = NEW.order_id;

    -- Only adjust if not already adjusted for this refund
    IF NOT COALESCE(v_order.settlement_adjusted, false) THEN
      -- Calculate refund percentage
      IF v_order.total > 0 THEN
        v_refund_percentage := ROUND((COALESCE(NEW.processed_amount, NEW.amount) / v_order.total) * 100, 2);
      ELSE
        v_refund_percentage := 100;
      END IF;

      -- Store original commission before reduction
      IF v_order.original_commission IS NULL OR v_order.original_commission = 0 THEN
        -- First time: store current commission as original
        UPDATE orders
        SET original_commission = platform_commission
        WHERE id = NEW.order_id;

        -- Re-fetch to get the value
        SELECT platform_commission INTO v_order.original_commission
        FROM orders WHERE id = NEW.order_id;
      END IF;

      -- Calculate proportional commission reduction
      IF NEW.refund_type = 'full' OR v_refund_percentage >= 100 THEN
        -- Full refund: zero out commission
        v_commission_reduction := COALESCE(v_order.original_commission, v_order.platform_commission);
        v_new_commission := 0;
      ELSE
        -- Partial refund: reduce commission proportionally
        v_commission_reduction := ROUND(COALESCE(v_order.original_commission, v_order.platform_commission) * (v_refund_percentage / 100), 2);
        v_new_commission := COALESCE(v_order.original_commission, v_order.platform_commission) - v_commission_reduction;
      END IF;

      -- Update order with new commission
      -- IMPORTANT: Update BOTH platform_commission AND original_commission
      -- For grace period merchants, platform_commission = 0 but original_commission shows theoretical
      UPDATE orders
      SET
        platform_commission = CASE
          WHEN platform_commission = 0 THEN 0  -- Keep 0 for grace period
          ELSE GREATEST(v_new_commission, 0)
        END,
        original_commission = GREATEST(v_new_commission, 0),  -- Always update theoretical
        settlement_adjusted = true,
        settlement_notes = COALESCE(settlement_notes, '') ||
          E'\n[' || NOW()::TEXT || '] ' ||
          CASE
            WHEN NEW.refund_type = 'full' THEN 'استرداد كامل'
            ELSE 'استرداد جزئي (' || v_refund_percentage || '%)'
          END ||
          ' - تخفيض العمولة من ' || COALESCE(v_order.original_commission, v_order.platform_commission) ||
          ' إلى ' || v_new_commission ||
          ' (تخفيض: ' || v_commission_reduction || ') - رقم الاسترداد: ' || NEW.id::TEXT
      WHERE id = NEW.order_id;

      -- Find if order is in any settlement (check orders_included array)
      SELECT id INTO v_settlement_id
      FROM settlements
      WHERE NEW.order_id = ANY(orders_included)
      LIMIT 1;

      -- Create audit record if settlement_adjustments table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settlement_adjustments') THEN
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
          COALESCE(v_order.original_commission, v_order.platform_commission),
          v_new_commission,
          v_commission_reduction,
          COALESCE(NEW.processed_amount, NEW.amount),
          v_order.total,
          v_refund_percentage,
          'تعديل تلقائي عند الموافقة على المرتجع - ' || NEW.status
        );
      END IF;

      -- Update settlement if exists
      IF v_settlement_id IS NOT NULL THEN
        UPDATE settlements
        SET
          platform_commission = GREATEST(platform_commission - v_commission_reduction, 0),
          net_payout = gross_revenue - GREATEST(platform_commission - v_commission_reduction, 0),
          cod_commission_owed = CASE
            WHEN cod_commission_owed IS NOT NULL
            THEN GREATEST(cod_commission_owed - v_commission_reduction, 0)
            ELSE cod_commission_owed
          END,
          notes = COALESCE(notes, '') ||
            E'\n[' || NOW()::TEXT || '] تعديل بسبب استرداد #' || NEW.id::TEXT ||
            ' - تخفيض العمولة: ' || v_commission_reduction,
          updated_at = NOW()
        WHERE id = v_settlement_id;
      END IF;
    END IF;
  END IF;

  -- ========================================================================
  -- PROVIDER CASH REFUND HANDLING (unchanged)
  -- ========================================================================
  IF NEW.provider_action = 'cash_refund' AND (OLD.provider_action != 'cash_refund' OR OLD.provider_action IS NULL) THEN
    NEW.provider_responded_at = NOW();
    IF NEW.confirmation_deadline IS NULL THEN
      NEW.confirmation_deadline = NOW() + INTERVAL '48 hours';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RECREATE THE TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_refund_settlement_update ON refunds;
CREATE TRIGGER trigger_refund_settlement_update
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION handle_refund_settlement_update();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RECALCULATE FOR EXISTING CUSTOMER-CONFIRMED REFUNDS
-- تحديث الطلبات والتسويات للمرتجعات المؤكدة من العميل فقط
-- ═══════════════════════════════════════════════════════════════════════════

-- Only process refunds where customer has confirmed receiving the refund
DO $$
DECLARE
  v_refund RECORD;
  v_order RECORD;
  v_refund_percentage DECIMAL(5,2);
  v_commission_reduction DECIMAL(10,2);
  v_new_commission DECIMAL(10,2);
  v_settlement_id UUID;
BEGIN
  FOR v_refund IN
    SELECT r.*
    FROM refunds r
    JOIN orders o ON o.id = r.order_id
    WHERE r.customer_confirmed = true  -- ONLY customer-confirmed refunds
      AND r.affects_settlement = true
      AND (o.settlement_adjusted = false OR o.settlement_adjusted IS NULL)
  LOOP
    -- Get order
    SELECT * INTO v_order FROM orders WHERE id = v_refund.order_id;

    -- Calculate percentage
    IF v_order.total > 0 THEN
      v_refund_percentage := ROUND((COALESCE(v_refund.processed_amount, v_refund.amount) / v_order.total) * 100, 2);
    ELSE
      v_refund_percentage := 100;
    END IF;

    -- Calculate reduction
    IF v_refund.refund_type = 'full' OR v_refund_percentage >= 100 THEN
      v_commission_reduction := COALESCE(v_order.original_commission, v_order.platform_commission);
      v_new_commission := 0;
    ELSE
      v_commission_reduction := ROUND(COALESCE(v_order.original_commission, v_order.platform_commission) * (v_refund_percentage / 100), 2);
      v_new_commission := COALESCE(v_order.original_commission, v_order.platform_commission) - v_commission_reduction;
    END IF;

    -- Update order
    -- IMPORTANT: Update original_commission to the NEW reduced value
    -- For grace period merchants, keep platform_commission = 0
    UPDATE orders
    SET
      original_commission = GREATEST(v_new_commission, 0),  -- New theoretical commission after refund
      platform_commission = CASE
        WHEN platform_commission = 0 THEN 0  -- Keep 0 for grace period
        ELSE GREATEST(v_new_commission, 0)
      END,
      settlement_adjusted = true,
      settlement_notes = COALESCE(settlement_notes, '') ||
        E'\n[MIGRATION ' || NOW()::TEXT || '] تصحيح عمولة بسبب مرتجع #' || v_refund.id::TEXT
    WHERE id = v_refund.order_id;

    -- Find settlement
    SELECT id INTO v_settlement_id
    FROM settlements
    WHERE v_refund.order_id = ANY(orders_included)
    LIMIT 1;

    -- Update settlement if found
    IF v_settlement_id IS NOT NULL THEN
      UPDATE settlements
      SET
        platform_commission = GREATEST(platform_commission - v_commission_reduction, 0),
        net_payout = gross_revenue - GREATEST(platform_commission - v_commission_reduction, 0),
        notes = COALESCE(notes, '') ||
          E'\n[MIGRATION ' || NOW()::TEXT || '] تصحيح عمولة - مرتجع #' || v_refund.id::TEXT,
        updated_at = NOW()
      WHERE id = v_settlement_id;
    END IF;

    RAISE NOTICE 'Fixed order % with refund %, commission reduced by %', v_refund.order_id, v_refund.id, v_commission_reduction;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION handle_refund_settlement_update() IS
'Refund Settlement Update Trigger - v2

BUSINESS FLOW:
1. Customer requests refund → no change
2. Provider approves → no change
3. Provider pays customer → no change
4. Customer confirms receiving refund → NOW update commission/settlement

TRIGGERS ON:
- customer_confirmed becomes true (ONLY)

ACTIONS:
1. Updates original_commission (theoretical after refund)
2. Updates platform_commission (0 for grace period, reduced for others)
3. Updates settlement totals
4. Creates audit trail

BUSINESS RULE:
- التاجر لا يدفع عمولة على المبالغ المرتجعة
- Merchant does not pay commission on refunded amounts';

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
