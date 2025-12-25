-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Financial Settlement Engine - محرك التسوية المالية الموحد
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2025-12-25
-- Version: 1.0
-- Purpose: Create unified financial settlement engine as Single Source of Truth
--          إنشاء محرك التسوية الموحد كمصدر وحيد للحقيقة
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- CONTENTS:
-- ────────────────────────────────────────────────────────────────────────────────
-- 1. Add delivery_responsibility to providers (merchant_delivery/platform_delivery)
-- 2. Add settlement_status to orders (eligible/on_hold/settled/excluded)
-- 3. Create settlement_audit_log table for audit trail
-- 4. Create financial_settlement_engine SQL View
-- 5. Create helper functions and triggers
-- 6. RLS policies for new tables
--
-- FORMULAS (from FINANCIAL_SYSTEM_REBUILD_PLAN.md):
-- ────────────────────────────────────────────────────────────────────────────────
-- COD Flow (Cash on Delivery):
--   - Merchant collects cash from customer
--   - Merchant OWES platform: commission
--   - net_balance < 0 → provider_pays_platform
--
-- Online Flow:
--   - Platform collects payment from customer
--   - Platform OWES merchant: (order_total - commission)
--   - net_balance > 0 → platform_pays_provider
--
-- Refund Formula (CORRECT - from v2.2):
--   final_payout = ((net_sales - commission) * (1 - refund_percentage)) + delivery_fee
--   Note: Delivery fees are NOT refunded (service was rendered)
--
-- Base Amount for Commission (excludes delivery):
--   base_amount = subtotal - discount
--   commission = base_amount * rate / 100
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 1: Add delivery_responsibility to providers                               ║
-- ║ إضافة مسؤولية التوصيل للمزودين                                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Add delivery_responsibility column if not exists
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS delivery_responsibility TEXT
DEFAULT 'merchant_delivery'
CHECK (delivery_responsibility IN ('merchant_delivery', 'platform_delivery'));

COMMENT ON COLUMN providers.delivery_responsibility IS
'Who handles delivery for this provider:
- merchant_delivery: Provider handles their own delivery (default, current behavior)
- platform_delivery: Platform handles delivery (future expansion)';

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 2: Add settlement_status to orders                                        ║
-- ║ إضافة حالة التسوية للطلبات                                                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Add settlement_status column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  settlement_status TEXT DEFAULT 'eligible'
  CHECK (settlement_status IN ('eligible', 'on_hold', 'settled', 'excluded'));

-- Add hold_reason column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  hold_reason TEXT;

-- Add hold_until column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  hold_until TIMESTAMPTZ;

-- Add settled_at column to track when order was settled
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  settled_at TIMESTAMPTZ;

-- Add settlement_id reference
ALTER TABLE orders ADD COLUMN IF NOT EXISTS
  settlement_id UUID REFERENCES settlements(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_settlement_status
  ON orders(settlement_status);

CREATE INDEX IF NOT EXISTS idx_orders_settlement_id
  ON orders(settlement_id);

CREATE INDEX IF NOT EXISTS idx_orders_hold_until
  ON orders(hold_until) WHERE settlement_status = 'on_hold';

COMMENT ON COLUMN orders.settlement_status IS
'Settlement eligibility status:
- eligible: Ready to be included in next settlement (default)
- on_hold: Temporarily excluded (dispute, pending refund, investigation)
- settled: Already included in a settlement
- excluded: Permanently excluded (cancelled, rejected after processing)';

COMMENT ON COLUMN orders.hold_reason IS
'Reason why order is on hold (if settlement_status = on_hold)';

COMMENT ON COLUMN orders.hold_until IS
'Date until which order should remain on hold (optional auto-release)';

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 3: Create settlement_audit_log table                                      ║
-- ║ إنشاء جدول سجل التدقيق للتسويات                                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS settlement_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What changed?
  settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'create',
    'update_status',
    'record_payment',
    'record_partial_payment',
    'void_payment',
    'dispute_opened',
    'dispute_resolved',
    'add_order',
    'remove_order',
    'hold_order',
    'release_order',
    'adjust_commission',
    'waive',
    'delete'
  )),

  -- Who made the change?
  admin_id UUID REFERENCES profiles(id),
  admin_name TEXT,
  admin_role TEXT,

  -- When and where?
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Change details
  old_value JSONB,
  new_value JSONB,

  -- Payment details (if applicable)
  payment_reference TEXT,
  payment_method TEXT,
  amount DECIMAL(12,2),

  -- Additional context
  reason TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_settlement ON settlement_audit_log(settlement_id);
CREATE INDEX IF NOT EXISTS idx_audit_order ON settlement_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON settlement_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON settlement_audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON settlement_audit_log(action);

-- Enable RLS
ALTER TABLE settlement_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can view audit logs
CREATE POLICY "Admins can view audit logs"
ON settlement_audit_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Service role full access
GRANT ALL ON settlement_audit_log TO service_role;

COMMENT ON TABLE settlement_audit_log IS
'Immutable audit trail for all settlement-related actions.
Tracks who, when, what, and why for compliance and security.
Cannot be modified or deleted by application code.';

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 4: Trigger for automatic settlement audit logging                         ║
-- ║ تريجر لتسجيل التغييرات تلقائياً                                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION log_settlement_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_admin_name TEXT;
  v_action TEXT;
BEGIN
  -- Get admin info from session if available
  BEGIN
    v_admin_id := current_setting('app.current_admin_id', true)::UUID;
    SELECT COALESCE(full_name, 'Unknown') INTO v_admin_name
    FROM profiles WHERE id = v_admin_id;
  EXCEPTION WHEN OTHERS THEN
    v_admin_id := NULL;
    v_admin_name := 'System';
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO settlement_audit_log (
      settlement_id, action, admin_id, admin_name,
      new_value
    ) VALUES (
      NEW.id, 'create', v_admin_id, v_admin_name,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Determine action type
    IF OLD.status != NEW.status THEN
      IF NEW.status = 'paid' THEN
        v_action := 'record_payment';
      ELSIF NEW.status = 'partially_paid' THEN
        v_action := 'record_partial_payment';
      ELSIF NEW.status = 'disputed' THEN
        v_action := 'dispute_opened';
      ELSIF NEW.status = 'waived' THEN
        v_action := 'waive';
      ELSE
        v_action := 'update_status';
      END IF;
    ELSE
      v_action := 'update_status';
    END IF;

    INSERT INTO settlement_audit_log (
      settlement_id, action, admin_id, admin_name,
      old_value, new_value,
      payment_reference, payment_method, amount
    ) VALUES (
      NEW.id,
      v_action,
      v_admin_id, v_admin_name,
      to_jsonb(OLD), to_jsonb(NEW),
      NEW.payment_reference, NEW.payment_method, NEW.amount_paid - OLD.amount_paid
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO settlement_audit_log (
      settlement_id, action, admin_id, admin_name,
      old_value
    ) VALUES (
      OLD.id, 'delete', v_admin_id, v_admin_name,
      to_jsonb(OLD)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trg_settlement_audit ON settlements;
CREATE TRIGGER trg_settlement_audit
  AFTER INSERT OR UPDATE OR DELETE ON settlements
  FOR EACH ROW EXECUTE FUNCTION log_settlement_changes();

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 5: Trigger for order hold on refund request                               ║
-- ║ تريجر لتعليق الطلب عند طلب استرداد                                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION hold_order_on_refund_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act on new pending refund requests
  IF NEW.status = 'pending' THEN
    -- Put order on hold
    UPDATE orders
    SET
      settlement_status = 'on_hold',
      hold_reason = 'طلب استرداد قيد المراجعة #' || NEW.id::text
    WHERE id = NEW.order_id
      AND settlement_status = 'eligible';

    -- Log the hold action
    INSERT INTO settlement_audit_log (
      order_id, action, admin_name,
      reason, new_value
    ) VALUES (
      NEW.order_id,
      'hold_order',
      'System',
      'Refund request created',
      jsonb_build_object('refund_id', NEW.id, 'refund_amount', NEW.amount)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_hold_order_on_refund ON refunds;
CREATE TRIGGER trg_hold_order_on_refund
  AFTER INSERT ON refunds
  FOR EACH ROW EXECUTE FUNCTION hold_order_on_refund_request();

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 6: Trigger for order release on refund resolution                         ║
-- ║ تريجر لتحرير الطلب عند حل الاسترداد                                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION release_order_on_refund_resolution()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when status changes to resolved states
  IF OLD.status = 'pending' AND NEW.status IN ('processed', 'rejected') THEN
    -- Release the hold
    UPDATE orders
    SET
      settlement_status = CASE
        WHEN NEW.status = 'rejected' THEN 'eligible'  -- Rejected refund, order eligible again
        WHEN NEW.status = 'processed' THEN 'eligible' -- Processed refund, order eligible (with adjusted amounts)
        ELSE settlement_status
      END,
      hold_reason = NULL
    WHERE id = NEW.order_id
      AND settlement_status = 'on_hold'
      AND hold_reason LIKE '%' || NEW.id::text || '%';

    -- Log the release action
    INSERT INTO settlement_audit_log (
      order_id, action, admin_name,
      reason, old_value, new_value
    ) VALUES (
      NEW.order_id,
      'release_order',
      'System',
      'Refund ' || NEW.status,
      jsonb_build_object('refund_status', OLD.status),
      jsonb_build_object('refund_status', NEW.status, 'refund_amount', NEW.amount)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_release_order_on_refund ON refunds;
CREATE TRIGGER trg_release_order_on_refund
  AFTER UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION release_order_on_refund_resolution();

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 7: Financial Settlement Engine - محرك التسوية المالية                     ║
-- ║ THE SINGLE SOURCE OF TRUTH - المصدر الوحيد للحقيقة                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Drop if exists (we're recreating)
DROP VIEW IF EXISTS financial_settlement_engine CASCADE;

CREATE OR REPLACE VIEW financial_settlement_engine AS
WITH order_financials AS (
  SELECT
    o.id AS order_id,
    o.provider_id,
    o.created_at AS order_date,
    o.status AS order_status,
    o.payment_method,
    o.payment_status,
    o.settlement_status,
    o.settlement_id,

    -- ════════════════════════════════════════════════════════════════════════
    -- BASE AMOUNTS (stored in piasters conceptually, displayed as pounds)
    -- المبالغ الأساسية
    -- ════════════════════════════════════════════════════════════════════════

    -- Subtotal (items without delivery)
    COALESCE(o.subtotal, 0)::DECIMAL(12,2) AS subtotal,

    -- Delivery fee (provider's right - not touched by commission)
    COALESCE(o.delivery_fee, 0)::DECIMAL(12,2) AS delivery_fee,

    -- Discount applied
    COALESCE(o.discount, 0)::DECIMAL(12,2) AS discount,

    -- Total order amount
    COALESCE(o.total, 0)::DECIMAL(12,2) AS order_total,

    -- ════════════════════════════════════════════════════════════════════════
    -- COMMISSION CALCULATION
    -- حساب العمولة (على صافي الطلب بدون التوصيل)
    -- ════════════════════════════════════════════════════════════════════════

    -- Base for commission = subtotal - discount (NO delivery)
    GREATEST(
      COALESCE(o.subtotal, o.total - COALESCE(o.delivery_fee, 0), 0)
      - COALESCE(o.discount, 0),
      0
    )::DECIMAL(12,2) AS commission_base,

    -- Theoretical commission (what would be charged without grace period)
    COALESCE(o.original_commission, 0)::DECIMAL(12,2) AS theoretical_commission,

    -- Actual commission (0 during grace period)
    COALESCE(o.platform_commission, 0)::DECIMAL(12,2) AS actual_commission,

    -- Grace period discount
    COALESCE(o.grace_period_discount, 0)::DECIMAL(12,2) AS grace_period_discount,

    -- ════════════════════════════════════════════════════════════════════════
    -- REFUND TRACKING
    -- تتبع المرتجعات
    -- ════════════════════════════════════════════════════════════════════════

    -- Get total refunded amount for this order
    COALESCE(
      (SELECT SUM(amount) FROM refunds r
       WHERE r.order_id = o.id AND r.status = 'processed'),
      0
    )::DECIMAL(12,2) AS refund_amount,

    -- Commission adjustment from refunds
    COALESCE(
      (SELECT SUM(COALESCE(
        (r.metadata->>'commission_reduction')::DECIMAL(12,2),
        0
      )) FROM refunds r
       WHERE r.order_id = o.id AND r.status = 'processed'),
      0
    )::DECIMAL(12,2) AS refund_commission_reduction,

    -- ════════════════════════════════════════════════════════════════════════
    -- PAYMENT METHOD FLAGS
    -- تصنيف طريقة الدفع
    -- ════════════════════════════════════════════════════════════════════════

    CASE WHEN o.payment_method = 'cash' THEN TRUE ELSE FALSE END AS is_cod,
    CASE WHEN o.payment_method != 'cash' THEN TRUE ELSE FALSE END AS is_online

  FROM orders o
  WHERE o.status IN ('delivered', 'completed', 'customer_confirmed')
),
provider_summary AS (
  SELECT
    of.provider_id,

    -- Provider info
    p.name_ar AS provider_name_ar,
    p.name_en AS provider_name_en,
    p.governorate_id,
    p.city_id,
    p.commission_status,
    p.grace_period_end,
    COALESCE(p.custom_commission_rate, p.commission_rate, 7.00) AS commission_rate,
    COALESCE(p.delivery_responsibility, 'merchant_delivery') AS delivery_responsibility,

    -- ════════════════════════════════════════════════════════════════════════
    -- TOTAL COUNTS
    -- ════════════════════════════════════════════════════════════════════════

    COUNT(*) AS total_orders,
    COUNT(*) FILTER (WHERE of.is_cod) AS cod_orders_count,
    COUNT(*) FILTER (WHERE of.is_online) AS online_orders_count,
    COUNT(*) FILTER (WHERE of.settlement_status = 'eligible') AS eligible_orders_count,
    COUNT(*) FILTER (WHERE of.settlement_status = 'on_hold') AS held_orders_count,
    COUNT(*) FILTER (WHERE of.settlement_status = 'settled') AS settled_orders_count,

    -- ════════════════════════════════════════════════════════════════════════
    -- GROSS REVENUE
    -- إجمالي الإيرادات
    -- ════════════════════════════════════════════════════════════════════════

    COALESCE(SUM(of.order_total), 0)::DECIMAL(12,2) AS gross_revenue,
    COALESCE(SUM(of.order_total) FILTER (WHERE of.is_cod), 0)::DECIMAL(12,2) AS cod_gross_revenue,
    COALESCE(SUM(of.order_total) FILTER (WHERE of.is_online), 0)::DECIMAL(12,2) AS online_gross_revenue,

    -- ════════════════════════════════════════════════════════════════════════
    -- SUBTOTALS (Without Delivery)
    -- ════════════════════════════════════════════════════════════════════════

    COALESCE(SUM(of.subtotal), 0)::DECIMAL(12,2) AS total_subtotal,
    COALESCE(SUM(of.subtotal) FILTER (WHERE of.is_cod), 0)::DECIMAL(12,2) AS cod_subtotal,
    COALESCE(SUM(of.subtotal) FILTER (WHERE of.is_online), 0)::DECIMAL(12,2) AS online_subtotal,

    -- ════════════════════════════════════════════════════════════════════════
    -- DELIVERY FEES (Provider's right - NEVER touched by commission/refund)
    -- رسوم التوصيل (حق التاجر الثابت)
    -- ════════════════════════════════════════════════════════════════════════

    COALESCE(SUM(of.delivery_fee), 0)::DECIMAL(12,2) AS total_delivery_fees,
    COALESCE(SUM(of.delivery_fee) FILTER (WHERE of.is_cod), 0)::DECIMAL(12,2) AS cod_delivery_fees,
    COALESCE(SUM(of.delivery_fee) FILTER (WHERE of.is_online), 0)::DECIMAL(12,2) AS online_delivery_fees,

    -- ════════════════════════════════════════════════════════════════════════
    -- DISCOUNTS
    -- ════════════════════════════════════════════════════════════════════════

    COALESCE(SUM(of.discount), 0)::DECIMAL(12,2) AS total_discounts,

    -- ════════════════════════════════════════════════════════════════════════
    -- COMMISSION (Theoretical - what would be without grace period)
    -- العمولة النظرية
    -- ════════════════════════════════════════════════════════════════════════

    COALESCE(SUM(of.theoretical_commission), 0)::DECIMAL(12,2) AS theoretical_commission,
    COALESCE(SUM(of.theoretical_commission) FILTER (WHERE of.is_cod), 0)::DECIMAL(12,2) AS cod_theoretical_commission,
    COALESCE(SUM(of.theoretical_commission) FILTER (WHERE of.is_online), 0)::DECIMAL(12,2) AS online_theoretical_commission,

    -- ════════════════════════════════════════════════════════════════════════
    -- COMMISSION (Actual - respects grace period)
    -- العمولة الفعلية
    -- ════════════════════════════════════════════════════════════════════════

    COALESCE(SUM(of.actual_commission), 0)::DECIMAL(12,2) AS actual_commission,
    COALESCE(SUM(of.actual_commission) FILTER (WHERE of.is_cod), 0)::DECIMAL(12,2) AS cod_actual_commission,
    COALESCE(SUM(of.actual_commission) FILTER (WHERE of.is_online), 0)::DECIMAL(12,2) AS online_actual_commission,

    -- ════════════════════════════════════════════════════════════════════════
    -- GRACE PERIOD DISCOUNT
    -- خصم فترة السماح
    -- ════════════════════════════════════════════════════════════════════════

    COALESCE(SUM(of.grace_period_discount), 0)::DECIMAL(12,2) AS total_grace_period_discount,

    -- ════════════════════════════════════════════════════════════════════════
    -- REFUNDS
    -- المرتجعات
    -- ════════════════════════════════════════════════════════════════════════

    COALESCE(SUM(of.refund_amount), 0)::DECIMAL(12,2) AS total_refunds,
    COALESCE(SUM(of.refund_commission_reduction), 0)::DECIMAL(12,2) AS total_refund_commission_reduction,

    -- Refund percentage for the formula
    CASE
      WHEN COALESCE(SUM(of.order_total - of.delivery_fee), 0) > 0
      THEN (COALESCE(SUM(of.refund_amount), 0) / COALESCE(SUM(of.order_total - of.delivery_fee), 1))
      ELSE 0
    END::DECIMAL(5,4) AS refund_percentage

  FROM order_financials of
  JOIN providers p ON p.id = of.provider_id
  GROUP BY
    of.provider_id,
    p.name_ar, p.name_en, p.governorate_id, p.city_id,
    p.commission_status, p.grace_period_end,
    p.custom_commission_rate, p.commission_rate, p.delivery_responsibility
)
SELECT
  ps.*,

  -- ════════════════════════════════════════════════════════════════════════════
  -- CALCULATED FIELDS
  -- الحقول المحسوبة
  -- ════════════════════════════════════════════════════════════════════════════

  -- Net commission after refund adjustments
  GREATEST(
    ps.actual_commission - ps.total_refund_commission_reduction,
    0
  )::DECIMAL(12,2) AS net_commission,

  -- ════════════════════════════════════════════════════════════════════════════
  -- COD CALCULATIONS
  -- حسابات الدفع النقدي
  -- ════════════════════════════════════════════════════════════════════════════

  -- COD: Merchant collected cash, OWES platform the commission
  -- المنصة لا تلمس المال، التاجر يدين بالعمولة فقط
  ps.cod_actual_commission::DECIMAL(12,2) AS cod_commission_owed,

  -- ════════════════════════════════════════════════════════════════════════════
  -- ONLINE CALCULATIONS
  -- حسابات الدفع الإلكتروني
  -- ════════════════════════════════════════════════════════════════════════════

  -- Online: Platform collected payment, OWES merchant (subtotal - commission + delivery)
  -- المنصة جمعت المال، تدين للتاجر بصافي الطلب + التوصيل
  GREATEST(
    (ps.online_subtotal - ps.total_discounts)  -- Net sales
    - ps.online_actual_commission               -- Minus commission
    + ps.online_delivery_fees,                  -- Plus delivery (provider's right)
    0
  )::DECIMAL(12,2) AS online_payout_owed,

  -- ════════════════════════════════════════════════════════════════════════════
  -- NET BALANCE (The magic number that determines who pays whom)
  -- الرصيد الصافي (الرقم السحري الذي يحدد من يدفع لمن)
  -- ════════════════════════════════════════════════════════════════════════════

  -- Formula: online_payout_owed - cod_commission_owed
  -- Positive = Platform pays Provider
  -- Negative = Provider pays Platform
  (
    GREATEST(
      (ps.online_subtotal - ps.total_discounts) - ps.online_actual_commission + ps.online_delivery_fees,
      0
    )
    - ps.cod_actual_commission
  )::DECIMAL(12,2) AS net_balance,

  -- Settlement Direction
  CASE
    WHEN (
      GREATEST(
        (ps.online_subtotal - ps.total_discounts) - ps.online_actual_commission + ps.online_delivery_fees,
        0
      )
      - ps.cod_actual_commission
    ) > 0.50 THEN 'platform_pays_provider'
    WHEN (
      GREATEST(
        (ps.online_subtotal - ps.total_discounts) - ps.online_actual_commission + ps.online_delivery_fees,
        0
      )
      - ps.cod_actual_commission
    ) < -0.50 THEN 'provider_pays_platform'
    ELSE 'balanced'
  END AS settlement_direction,

  -- ════════════════════════════════════════════════════════════════════════════
  -- GRACE PERIOD STATUS
  -- حالة فترة السماح
  -- ════════════════════════════════════════════════════════════════════════════

  CASE
    WHEN ps.commission_status = 'in_grace_period' AND ps.grace_period_end > NOW()
    THEN TRUE ELSE FALSE
  END AS is_in_grace_period,

  CASE
    WHEN ps.commission_status = 'in_grace_period' AND ps.grace_period_end > NOW()
    THEN (ps.grace_period_end::date - CURRENT_DATE)
    ELSE 0
  END AS grace_period_days_remaining

FROM provider_summary ps;

-- Grant access
GRANT SELECT ON financial_settlement_engine TO authenticated;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 8: Aggregated view for admin dashboard                                    ║
-- ║ عرض مجمّع للوحة تحكم الأدمن                                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP VIEW IF EXISTS admin_financial_summary CASCADE;

CREATE OR REPLACE VIEW admin_financial_summary AS
SELECT
  -- ════════════════════════════════════════════════════════════════════════════
  -- PLATFORM-WIDE TOTALS
  -- ════════════════════════════════════════════════════════════════════════════

  COUNT(DISTINCT provider_id) AS total_providers,
  SUM(total_orders)::INTEGER AS total_orders,
  SUM(gross_revenue)::DECIMAL(14,2) AS total_revenue,
  SUM(total_delivery_fees)::DECIMAL(14,2) AS total_delivery_fees,

  -- Commission
  SUM(theoretical_commission)::DECIMAL(14,2) AS total_theoretical_commission,
  SUM(actual_commission)::DECIMAL(14,2) AS total_actual_commission,
  SUM(total_grace_period_discount)::DECIMAL(14,2) AS total_grace_period_discount,

  -- Refunds
  SUM(total_refunds)::DECIMAL(14,2) AS total_refunds,

  -- ════════════════════════════════════════════════════════════════════════════
  -- COD/ONLINE BREAKDOWN
  -- ════════════════════════════════════════════════════════════════════════════

  SUM(cod_orders_count)::INTEGER AS total_cod_orders,
  SUM(cod_gross_revenue)::DECIMAL(14,2) AS total_cod_revenue,
  SUM(cod_commission_owed)::DECIMAL(14,2) AS total_cod_commission_owed,

  SUM(online_orders_count)::INTEGER AS total_online_orders,
  SUM(online_gross_revenue)::DECIMAL(14,2) AS total_online_revenue,
  SUM(online_payout_owed)::DECIMAL(14,2) AS total_online_payout_owed,

  -- ════════════════════════════════════════════════════════════════════════════
  -- NET BALANCE
  -- ════════════════════════════════════════════════════════════════════════════

  SUM(net_balance)::DECIMAL(14,2) AS total_net_balance,

  -- Count by direction
  COUNT(*) FILTER (WHERE settlement_direction = 'platform_pays_provider') AS providers_to_pay,
  COUNT(*) FILTER (WHERE settlement_direction = 'provider_pays_platform') AS providers_to_collect,
  COUNT(*) FILTER (WHERE settlement_direction = 'balanced') AS providers_balanced,

  -- ════════════════════════════════════════════════════════════════════════════
  -- ORDER STATUS
  -- ════════════════════════════════════════════════════════════════════════════

  SUM(eligible_orders_count)::INTEGER AS total_eligible_orders,
  SUM(held_orders_count)::INTEGER AS total_held_orders,
  SUM(settled_orders_count)::INTEGER AS total_settled_orders

FROM financial_settlement_engine;

GRANT SELECT ON admin_financial_summary TO authenticated;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 9: Geographic-filtered view for regional admins                           ║
-- ║ عرض مفلتر جغرافياً للمديرين الإقليميين                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP VIEW IF EXISTS financial_settlement_by_region CASCADE;

CREATE OR REPLACE VIEW financial_settlement_by_region AS
SELECT
  g.id AS governorate_id,
  g.name_ar AS governorate_name_ar,
  g.name_en AS governorate_name_en,

  -- Provider counts
  COUNT(DISTINCT fse.provider_id) AS providers_count,

  -- Order counts
  SUM(fse.total_orders)::INTEGER AS total_orders,
  SUM(fse.cod_orders_count)::INTEGER AS cod_orders,
  SUM(fse.online_orders_count)::INTEGER AS online_orders,

  -- Revenue
  SUM(fse.gross_revenue)::DECIMAL(14,2) AS gross_revenue,

  -- Commission
  SUM(fse.actual_commission)::DECIMAL(14,2) AS total_commission,

  -- Net balance
  SUM(fse.net_balance)::DECIMAL(14,2) AS net_balance,

  -- Direction summary
  COUNT(*) FILTER (WHERE fse.settlement_direction = 'platform_pays_provider') AS providers_to_pay,
  COUNT(*) FILTER (WHERE fse.settlement_direction = 'provider_pays_platform') AS providers_to_collect

FROM financial_settlement_engine fse
JOIN governorates g ON g.id = fse.governorate_id
GROUP BY g.id, g.name_ar, g.name_en;

GRANT SELECT ON financial_settlement_by_region TO authenticated;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 10: Documentation                                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

COMMENT ON VIEW financial_settlement_engine IS
'🔒 SINGLE SOURCE OF TRUTH - المصدر الوحيد للحقيقة

PURPOSE:
Calculate all financial metrics in one place for both Admin and Provider dashboards.
Ensures consistent calculations across the platform.

KEY CONCEPTS:
═══════════════════════════════════════════════════════════════════════════════════

1. COMMISSION BASE (excludes delivery):
   base = subtotal - discount
   commission = base × rate / 100
   نسبة المنصة تحسب على صافي الطلب بدون خدمة التوصيل

2. COD FLOW (Cash on Delivery):
   - Merchant collects cash from customer
   - Merchant OWES platform: commission only
   - التاجر يجمع النقد ويدين للمنصة بالعمولة فقط

3. ONLINE FLOW:
   - Platform collects payment from customer
   - Platform OWES merchant: (subtotal - commission + delivery)
   - المنصة تجمع الدفع وتدين للتاجر بصافي المبلغ + التوصيل

4. NET BALANCE:
   net_balance = online_payout_owed - cod_commission_owed
   - Positive → Platform pays provider (platform_pays_provider)
   - Negative → Provider pays platform (provider_pays_platform)
   - Near zero → Balanced (balanced)

5. DELIVERY FEES:
   - Always belong to provider (merchant_delivery)
   - NEVER reduced by commission
   - NEVER refunded (service was rendered)

6. REFUND FORMULA:
   final = ((net_sales - commission) × (1 - refund_percentage)) + delivery_fee
   Delivery is NOT affected by refunds!

USAGE:
═══════════════════════════════════════════════════════════════════════════════════

-- For Provider Dashboard:
SELECT * FROM financial_settlement_engine WHERE provider_id = ''YOUR_ID'';

-- For Admin Dashboard (all providers):
SELECT * FROM financial_settlement_engine;

-- For Regional Admin (specific governorate):
SELECT * FROM financial_settlement_engine WHERE governorate_id = ''GOV_ID'';

-- For Platform Summary:
SELECT * FROM admin_financial_summary;
';

COMMENT ON VIEW admin_financial_summary IS
'Platform-wide financial summary aggregated from financial_settlement_engine.
Use this view for admin dashboard totals.';

COMMENT ON VIEW financial_settlement_by_region IS
'Financial summary grouped by governorate.
Use this for regional admin dashboards and geographic filtering.';

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 11: Update existing orders to have default settlement_status              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Set delivered/completed orders as eligible (if not already settled)
UPDATE orders
SET settlement_status = 'eligible'
WHERE status IN ('delivered', 'completed', 'customer_confirmed')
  AND settlement_status IS NULL;

-- Set cancelled/rejected orders as excluded
UPDATE orders
SET settlement_status = 'excluded'
WHERE status IN ('cancelled', 'rejected')
  AND settlement_status IS NULL;

-- Set pending orders as eligible (they'll be evaluated when delivered)
UPDATE orders
SET settlement_status = 'eligible'
WHERE status NOT IN ('delivered', 'completed', 'customer_confirmed', 'cancelled', 'rejected')
  AND settlement_status IS NULL;

-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ END OF MIGRATION                                                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
