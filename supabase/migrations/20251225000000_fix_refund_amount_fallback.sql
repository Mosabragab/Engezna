-- ============================================================================
-- Migration: Fix Refund Amount Fallback in Commission Trigger
-- إصلاح استخدام amount بدلاً من processed_amount عندما يكون صفراً
-- ============================================================================
-- Date: 2025-12-25
-- Problem: COALESCE(processed_amount, amount) returns 0 when processed_amount = 0.00
-- Fix: Use CASE WHEN to check if processed_amount > 0, else use amount
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. FIX THE REFUND SETTLEMENT TRIGGER
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
  v_refund_amount DECIMAL(10,2);  -- NEW: Actual refund amount to use
BEGIN
  -- ========================================================================
  -- TRIGGER CONDITION: ONLY when customer confirms receiving the refund
  -- العمولة تُحدّث فقط عند تأكيد العميل استلام المرتجع
  -- Business Flow:
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

      -- ====================================================================
      -- FIX: Use amount when processed_amount is 0 or NULL
      -- إصلاح: استخدم amount عندما يكون processed_amount = 0 أو NULL
      -- ====================================================================
      v_refund_amount := CASE
        WHEN COALESCE(NEW.processed_amount, 0) > 0 THEN NEW.processed_amount
        ELSE NEW.amount
      END;

      -- Calculate refund percentage using the correct amount
      IF v_order.total > 0 THEN
        v_refund_percentage := ROUND((v_refund_amount / v_order.total) * 100, 2);
      ELSE
        v_refund_percentage := 100;
      END IF;

      -- Store original commission before reduction (if not already stored)
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
          ' - مبلغ المرتجع: ' || v_refund_amount ||
          ' - تخفيض العمولة من ' || COALESCE(v_order.original_commission, v_order.platform_commission) ||
          ' إلى ' || v_new_commission ||
          ' (تخفيض: ' || v_commission_reduction || ') - رقم الاسترداد: ' || NEW.id::TEXT
      WHERE id = NEW.order_id;

      -- Also update processed_amount if it was 0 (fix data issue)
      IF COALESCE(NEW.processed_amount, 0) = 0 AND NEW.amount > 0 THEN
        NEW.processed_amount := NEW.amount;
      END IF;

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
          v_refund_amount,  -- Use actual refund amount
          v_order.total,
          v_refund_percentage,
          'تعديل تلقائي عند تأكيد العميل - مبلغ المرتجع: ' || v_refund_amount
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
            ' - مبلغ: ' || v_refund_amount ||
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
-- 2. FIX THE ORDER COMMISSION TRIGGER (calculate_order_commission)
-- Respect settlement_adjusted flag
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_rate DECIMAL(5,2);
  v_base_amount DECIMAL(10,2);
  v_commission DECIMAL(10,2);
  v_provider_status TEXT;
  v_grace_end DATE;
BEGIN
  -- ========================================================================
  -- SAFETY RULE: If settlement_adjusted = true, DO NOT recalculate
  -- قاعدة التنحي: إذا كان settlement_adjusted = true، لا تعيد الحساب
  -- Exception: cancelled/rejected orders should zero commission
  -- ========================================================================
  IF NEW.settlement_adjusted = true AND OLD.settlement_adjusted = true THEN
    -- Exception: If status changed to cancelled or rejected, zero commission
    IF NEW.status IN ('cancelled', 'rejected') AND OLD.status NOT IN ('cancelled', 'rejected') THEN
      NEW.platform_commission := 0;
      NEW.original_commission := 0;
      NEW.settlement_notes := COALESCE(NEW.settlement_notes, '') ||
        E'\n[' || NOW()::TEXT || '] تصفير العمولة - الطلب ' || NEW.status;
    END IF;
    -- Otherwise, leave commission as is (refund system handled it)
    RETURN NEW;
  END IF;

  -- ========================================================================
  -- CALCULATE COMMISSION FOR NEW ORDERS OR NON-ADJUSTED UPDATES
  -- ========================================================================

  -- Get provider commission rate and status
  SELECT
    COALESCE(p.custom_commission_rate, p.commission_rate, 7),
    p.commission_status,
    p.grace_period_end
  INTO v_commission_rate, v_provider_status, v_grace_end
  FROM providers p
  WHERE p.id = NEW.provider_id;

  -- Default rate if not found
  IF v_commission_rate IS NULL THEN
    v_commission_rate := 7;
  END IF;

  -- Calculate base amount (subtotal - discount, excluding delivery)
  -- قاعدة العمل: العمولة تُحسب على صافي الطلب بدون التوصيل
  v_base_amount := COALESCE(NEW.subtotal, NEW.total - COALESCE(NEW.delivery_fee, 0)) - COALESCE(NEW.discount, 0);
  v_base_amount := GREATEST(v_base_amount, 0);

  -- Calculate commission
  v_commission := ROUND(v_base_amount * (v_commission_rate / 100), 2);

  -- ========================================================================
  -- HANDLE GRACE PERIOD
  -- فترة السماح: platform_commission = 0, original_commission = theoretical
  -- ========================================================================
  IF v_provider_status = 'in_grace_period' AND v_grace_end >= CURRENT_DATE THEN
    NEW.platform_commission := 0;  -- Waived during grace period
    NEW.original_commission := v_commission;  -- Store theoretical for display
  ELSE
    NEW.platform_commission := v_commission;
    NEW.original_commission := v_commission;
  END IF;

  -- ========================================================================
  -- HANDLE CANCELLED/REJECTED ORDERS
  -- ========================================================================
  IF NEW.status IN ('cancelled', 'rejected') THEN
    NEW.platform_commission := 0;
    NEW.original_commission := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RECREATE TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing triggers to avoid duplicates
DROP TRIGGER IF EXISTS trigger_refund_settlement_update ON refunds;
DROP TRIGGER IF EXISTS trigger_refund_settlement ON refunds;

-- Create single trigger for refund updates
CREATE TRIGGER trigger_refund_settlement_update
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION handle_refund_settlement_update();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. FIX EXISTING DATA: Update processed_amount where it's 0
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE refunds
SET processed_amount = amount
WHERE (processed_amount = 0 OR processed_amount IS NULL)
  AND amount > 0
  AND status IN ('approved', 'processed');

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION handle_refund_settlement_update() IS
'Refund Settlement Update Trigger - v3

FIX: Uses amount when processed_amount = 0

BUSINESS FLOW:
1. Customer requests refund → no change
2. Provider approves → no change
3. Provider pays customer → no change
4. Customer confirms receiving refund → NOW update commission/settlement

TRIGGERS ON:
- customer_confirmed becomes true (ONLY)

SAFETY:
- Uses v_refund_amount = CASE WHEN processed_amount > 0 THEN processed_amount ELSE amount END
- Also fixes processed_amount if it was 0';

COMMENT ON FUNCTION calculate_order_commission() IS
'Order Commission Calculation Trigger - v2

RULES:
1. INSERT: Calculate commission at 100% from server (ignore client input)
2. UPDATE with settlement_adjusted = true: DO NOT recalculate (refund system handled it)
3. Exception: cancelled/rejected orders always get commission zeroed

FORMULA:
- Base = subtotal - discount (excludes delivery_fee)
- Commission = Base × rate%

GRACE PERIOD:
- platform_commission = 0 (waived)
- original_commission = theoretical (for display)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. AUTO-CONFIRM EXPIRED REFUNDS FUNCTION
-- تأكيد تلقائي للمرتجعات التي انتهت مهلتها (48 ساعة)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_confirm_expired_refunds()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_refund RECORD;
BEGIN
  -- Find all refunds where:
  -- 1. Provider has paid (provider_action = 'cash_refund')
  -- 2. Customer hasn't confirmed yet
  -- 3. Deadline has passed (48 hours)
  -- 4. Affects settlement
  FOR v_refund IN
    SELECT id, order_id, amount
    FROM refunds
    WHERE provider_action = 'cash_refund'
      AND (customer_confirmed = false OR customer_confirmed IS NULL)
      AND confirmation_deadline IS NOT NULL
      AND confirmation_deadline < NOW()
      AND affects_settlement = true
      AND status IN ('approved', 'processed')
  LOOP
    -- Auto-confirm this refund
    UPDATE refunds
    SET
      customer_confirmed = true,
      customer_confirmed_at = NOW(),
      notes = COALESCE(notes, '') || E'\n[AUTO] تأكيد تلقائي بعد انتهاء مهلة 48 ساعة - ' || NOW()::TEXT
    WHERE id = v_refund.id;

    v_count := v_count + 1;

    RAISE NOTICE 'Auto-confirmed refund % for order %', v_refund.id, v_refund.order_id;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_confirm_expired_refunds() IS
'Auto-confirm refunds after 48 hours deadline
تأكيد تلقائي للمرتجعات بعد انتهاء مهلة 48 ساعة

Call this function via:
1. Supabase pg_cron (recommended)
2. External cron job
3. Supabase Edge Function with schedule

Example pg_cron setup:
SELECT cron.schedule(
  ''auto-confirm-refunds'',
  ''0 * * * *'',  -- Every hour
  $$SELECT auto_confirm_expired_refunds()$$
);';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. SET DEFAULT confirmation_deadline ON PROVIDER CASH REFUND
-- ضبط مهلة التأكيد تلقائياً عند موافقة التاجر
-- ═══════════════════════════════════════════════════════════════════════════

-- This is already handled in handle_refund_settlement_update trigger
-- When provider_action = 'cash_refund', confirmation_deadline is set to NOW() + 48 hours

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. CREATE pg_cron JOB (if pg_cron extension exists)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule auto-confirm to run every hour
    PERFORM cron.schedule(
      'auto-confirm-expired-refunds',
      '0 * * * *',  -- Every hour at minute 0
      'SELECT auto_confirm_expired_refunds()'
    );
    RAISE NOTICE 'pg_cron job scheduled: auto-confirm-expired-refunds (hourly)';
  ELSE
    RAISE NOTICE 'pg_cron extension not found. Please call auto_confirm_expired_refunds() manually or via external cron.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule pg_cron job: %. Please set up external cron.', SQLERRM;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
