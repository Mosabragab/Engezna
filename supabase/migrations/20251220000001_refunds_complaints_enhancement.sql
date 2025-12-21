-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Enhanced Refunds & Complaints System
-- Date: 2025-12-20
-- Description: Add cash refund via pilot workflow, customer confirmation,
--              settlement adjustments, and enhanced support ticket integration
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create refund type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_type') THEN
    CREATE TYPE refund_type AS ENUM ('full', 'partial', 'item_resend');
  END IF;
END $$;

-- Create provider action enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_refund_action') THEN
    CREATE TYPE provider_refund_action AS ENUM ('pending', 'cash_refund', 'item_resend', 'rejected', 'escalated');
  END IF;
END $$;

-- Create confirmation type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'confirmation_type') THEN
    CREATE TYPE confirmation_type AS ENUM ('received', 'not_received', 'partial');
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. UPDATE REFUNDS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add new columns to refunds table
ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS refund_type VARCHAR(20) DEFAULT 'full'
    CHECK (refund_type IN ('full', 'partial', 'item_resend'));

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS provider_action VARCHAR(20) DEFAULT 'pending'
    CHECK (provider_action IN ('pending', 'cash_refund', 'item_resend', 'rejected', 'escalated'));

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS affects_settlement BOOLEAN DEFAULT true;

-- Customer confirmation columns
ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS customer_confirmed BOOLEAN DEFAULT false;

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS customer_confirmed_at TIMESTAMPTZ;

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMPTZ;

-- Evidence and escalation
ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS evidence_images TEXT[];

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS escalated_to_admin BOOLEAN DEFAULT false;

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

-- Provider response
ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS provider_responded_at TIMESTAMPTZ;

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS provider_notes TEXT;

-- Issue type for categorization
ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS issue_type VARCHAR(50);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. UPDATE SUPPORT TICKETS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS related_refund_id UUID REFERENCES refunds(id) ON DELETE SET NULL;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS whatsapp_thread_id TEXT;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS auto_closed_at TIMESTAMPTZ;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5);

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS customer_feedback TEXT;

-- Index for related refund
CREATE INDEX IF NOT EXISTS idx_support_tickets_refund ON support_tickets(related_refund_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. UPDATE ORDERS TABLE FOR SETTLEMENT ADJUSTMENT
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS settlement_adjusted BOOLEAN DEFAULT false;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS settlement_notes TEXT;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS original_commission DECIMAL(10,2);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. REFUND CONFIRMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS refund_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,

  -- Confirmation details
  confirmation_type VARCHAR(20) NOT NULL
    CHECK (confirmation_type IN ('received', 'not_received', 'partial')),

  -- Customer notes
  customer_notes TEXT,

  -- Confirmed by (customer)
  confirmed_by UUID REFERENCES profiles(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refund_confirmations_refund ON refund_confirmations(refund_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. RLS POLICIES FOR REFUND CONFIRMATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE refund_confirmations ENABLE ROW LEVEL SECURITY;

-- Customers can view their own confirmations
CREATE POLICY "Customers can view own confirmations"
  ON refund_confirmations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM refunds r
      WHERE r.id = refund_id AND r.customer_id = auth.uid()
    )
  );

-- Customers can create confirmations for their refunds
CREATE POLICY "Customers can create confirmations"
  ON refund_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    confirmed_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM refunds r
      WHERE r.id = refund_id AND r.customer_id = auth.uid()
    )
  );

-- Admins can view all confirmations
CREATE POLICY "Admins can view all confirmations"
  ON refund_confirmations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Service role full access
GRANT ALL ON refund_confirmations TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. UPDATE RLS POLICIES FOR REFUNDS (Provider Update)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Allow providers to update refunds (for cash_refund action)
DROP POLICY IF EXISTS "Providers can update their refunds" ON refunds;

CREATE POLICY "Providers can update their refunds"
  ON refunds
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = refunds.provider_id
      AND providers.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = refunds.provider_id
      AND providers.owner_id = auth.uid()
    )
  );

-- Allow customers to update their refunds (for confirmation)
DROP POLICY IF EXISTS "Customers can update own refunds" ON refunds;

CREATE POLICY "Customers can update own refunds"
  ON refunds
  FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. TRIGGER: SETTLEMENT UPDATE ON REFUND CONFIRMATION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_refund_settlement_update()
RETURNS TRIGGER AS $$
BEGIN
  -- When customer confirms receiving the refund
  IF NEW.customer_confirmed = true AND (OLD.customer_confirmed = false OR OLD.customer_confirmed IS NULL) THEN
    -- Set confirmation timestamp
    NEW.customer_confirmed_at = NOW();

    -- Update order to zero out commission if affects_settlement is true
    IF NEW.affects_settlement = true THEN
      -- Store original commission before zeroing
      UPDATE orders
      SET
        original_commission = COALESCE(original_commission, platform_commission),
        platform_commission = 0,
        settlement_adjusted = true,
        settlement_notes = COALESCE(settlement_notes, '') ||
          E'\n[' || NOW()::TEXT || '] تم تصفير العمولة بسبب استرداد #' || NEW.id::TEXT
      WHERE id = NEW.order_id
      AND settlement_adjusted = false; -- Only if not already adjusted
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refund_settlement ON refunds;
CREATE TRIGGER trigger_refund_settlement
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION handle_refund_settlement_update();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. FUNCTION: AUTO-CONFIRM REFUNDS AFTER DEADLINE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_confirm_expired_refunds()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE refunds
    SET
      customer_confirmed = true,
      customer_confirmed_at = NOW()
    WHERE
      provider_action = 'cash_refund'
      AND customer_confirmed = false
      AND confirmation_deadline IS NOT NULL
      AND confirmation_deadline < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO affected_count FROM updated;

  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. ENHANCED NOTIFICATION TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_refund_status_change()
RETURNS TRIGGER AS $$
DECLARE
  order_number TEXT;
  customer_name TEXT;
  provider_name TEXT;
  status_text_ar TEXT;
  status_text_en TEXT;
  notification_type TEXT;
BEGIN
  -- Get order and related info
  SELECT o.order_number, p.full_name, pr.name_ar
  INTO order_number, customer_name, provider_name
  FROM orders o
  LEFT JOIN profiles p ON p.id = o.customer_id
  LEFT JOIN providers pr ON pr.id = o.provider_id
  WHERE o.id = NEW.order_id;

  -- Notify on provider action change
  IF NEW.provider_action != COALESCE(OLD.provider_action, 'pending') THEN
    CASE NEW.provider_action
      WHEN 'cash_refund' THEN
        status_text_ar := 'أكد التاجر رد المبلغ كاش مع المندوب';
        status_text_en := 'Merchant confirmed cash refund via delivery';
        notification_type := 'refund_cash_confirmed';
      WHEN 'item_resend' THEN
        status_text_ar := 'سيتم إعادة إرسال الصنف الناقص';
        status_text_en := 'Missing item will be resent';
        notification_type := 'refund_item_resend';
      WHEN 'rejected' THEN
        status_text_ar := 'رفض التاجر طلب الاسترداد';
        status_text_en := 'Merchant rejected refund request';
        notification_type := 'refund_rejected';
      WHEN 'escalated' THEN
        status_text_ar := 'تم تصعيد الطلب للإدارة';
        status_text_en := 'Request escalated to admin';
        notification_type := 'refund_escalated';
      ELSE
        RETURN NEW;
    END CASE;

    -- Create customer notification
    INSERT INTO customer_notifications (
      customer_id,
      title_ar,
      title_en,
      message_ar,
      message_en,
      type,
      data
    ) VALUES (
      NEW.customer_id,
      'تحديث طلب الاسترداد',
      'Refund Update',
      status_text_ar || ' - الطلب #' || order_number,
      status_text_en || ' - Order #' || order_number,
      'order_update',
      jsonb_build_object(
        'refund_id', NEW.id,
        'order_id', NEW.order_id,
        'provider_action', NEW.provider_action,
        'amount', NEW.amount,
        'notification_type', notification_type,
        'requires_confirmation', NEW.provider_action = 'cash_refund',
        'confirmation_deadline', NEW.confirmation_deadline
      )
    );
  END IF;

  -- Notify on customer confirmation
  IF NEW.customer_confirmed = true AND (OLD.customer_confirmed = false OR OLD.customer_confirmed IS NULL) THEN
    -- Notify provider that customer confirmed
    INSERT INTO provider_notifications (
      provider_id,
      type,
      title_ar,
      title_en,
      message_ar,
      message_en,
      data
    ) VALUES (
      NEW.provider_id,
      'refund_confirmed',
      'تم تأكيد الاسترداد',
      'Refund Confirmed',
      'أكد العميل استلام المبلغ المسترد للطلب #' || order_number,
      'Customer confirmed refund receipt for order #' || order_number,
      jsonb_build_object(
        'refund_id', NEW.id,
        'order_id', NEW.order_id,
        'amount', NEW.amount
      )
    );
  END IF;

  -- Notify on escalation
  IF NEW.escalated_to_admin = true AND (OLD.escalated_to_admin = false OR OLD.escalated_to_admin IS NULL) THEN
    NEW.escalated_at = NOW();

    -- Create admin notification
    INSERT INTO admin_notifications (
      admin_id,
      type,
      title,
      body,
      related_ticket_id
    )
    SELECT
      au.id,
      'escalation',
      'تصعيد طلب استرداد - #' || order_number,
      'سبب التصعيد: ' || COALESCE(NEW.escalation_reason, 'غير محدد'),
      NULL
    FROM admin_users au
    WHERE au.is_active = true
    AND (au.role = 'super_admin' OR au.role = 'support');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_refund_status ON refunds;
CREATE TRIGGER trigger_notify_refund_status
  AFTER UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION notify_refund_status_change();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function to create refund request from customer
CREATE OR REPLACE FUNCTION create_customer_refund_request(
  p_order_id UUID,
  p_amount DECIMAL,
  p_reason TEXT,
  p_issue_type VARCHAR,
  p_evidence_images TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_refund_id UUID;
  v_order RECORD;
BEGIN
  -- Get order details
  SELECT id, customer_id, provider_id, total, status
  INTO v_order
  FROM orders
  WHERE id = p_order_id AND customer_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not owned by user';
  END IF;

  -- Validate order status (can only request refund for delivered or cancelled orders)
  IF v_order.status NOT IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot request refund for order with status: %', v_order.status;
  END IF;

  -- Validate amount
  IF p_amount > v_order.total THEN
    RAISE EXCEPTION 'Refund amount cannot exceed order total';
  END IF;

  -- Create refund request
  INSERT INTO refunds (
    order_id,
    customer_id,
    provider_id,
    amount,
    reason,
    reason_ar,
    issue_type,
    evidence_images,
    status,
    request_source,
    requested_by,
    refund_type,
    provider_action,
    confirmation_deadline
  ) VALUES (
    p_order_id,
    v_order.customer_id,
    v_order.provider_id,
    p_amount,
    p_reason,
    p_reason,
    p_issue_type,
    p_evidence_images,
    'pending',
    'customer',
    auth.uid(),
    CASE WHEN p_amount = v_order.total THEN 'full' ELSE 'partial' END,
    'pending',
    NOW() + INTERVAL '48 hours'
  )
  RETURNING id INTO v_refund_id;

  RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for provider to respond to refund
CREATE OR REPLACE FUNCTION provider_respond_to_refund(
  p_refund_id UUID,
  p_action VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_refund RECORD;
BEGIN
  -- Get refund and verify provider ownership
  SELECT r.*, p.owner_id
  INTO v_refund
  FROM refunds r
  JOIN providers p ON p.id = r.provider_id
  WHERE r.id = p_refund_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund not found';
  END IF;

  IF v_refund.owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to respond to this refund';
  END IF;

  IF v_refund.status != 'pending' THEN
    RAISE EXCEPTION 'Refund is no longer pending';
  END IF;

  -- Update refund
  UPDATE refunds
  SET
    provider_action = p_action,
    provider_notes = p_notes,
    provider_responded_at = NOW(),
    status = CASE
      WHEN p_action = 'cash_refund' THEN 'approved'
      WHEN p_action = 'item_resend' THEN 'approved'
      WHEN p_action = 'rejected' THEN 'rejected'
      WHEN p_action = 'escalated' THEN 'pending'
      ELSE status
    END,
    escalated_to_admin = (p_action = 'escalated'),
    escalation_reason = CASE WHEN p_action = 'escalated' THEN p_notes ELSE escalation_reason END,
    confirmation_deadline = CASE
      WHEN p_action = 'cash_refund' THEN NOW() + INTERVAL '48 hours'
      ELSE confirmation_deadline
    END
  WHERE id = p_refund_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for customer to confirm refund receipt
CREATE OR REPLACE FUNCTION customer_confirm_refund(
  p_refund_id UUID,
  p_received BOOLEAN,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_refund RECORD;
BEGIN
  -- Get refund and verify customer ownership
  SELECT *
  INTO v_refund
  FROM refunds
  WHERE id = p_refund_id AND customer_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Refund not found or not owned by user';
  END IF;

  IF v_refund.provider_action != 'cash_refund' THEN
    RAISE EXCEPTION 'This refund is not marked for cash refund confirmation';
  END IF;

  IF v_refund.customer_confirmed = true THEN
    RAISE EXCEPTION 'Refund already confirmed';
  END IF;

  -- Create confirmation record
  INSERT INTO refund_confirmations (
    refund_id,
    confirmation_type,
    customer_notes,
    confirmed_by
  ) VALUES (
    p_refund_id,
    CASE WHEN p_received THEN 'received' ELSE 'not_received' END,
    p_notes,
    auth.uid()
  );

  -- Update refund
  IF p_received THEN
    UPDATE refunds
    SET
      customer_confirmed = true,
      customer_confirmed_at = NOW(),
      status = 'processed'
    WHERE id = p_refund_id;
  ELSE
    -- Escalate to admin if customer says they didn't receive
    UPDATE refunds
    SET
      escalated_to_admin = true,
      escalation_reason = 'customer_denied_receipt: ' || COALESCE(p_notes, 'No notes provided')
    WHERE id = p_refund_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_refunds_provider_action ON refunds(provider_action);
CREATE INDEX IF NOT EXISTS idx_refunds_customer_confirmed ON refunds(customer_confirmed);
CREATE INDEX IF NOT EXISTS idx_refunds_confirmation_deadline ON refunds(confirmation_deadline);
CREATE INDEX IF NOT EXISTS idx_refunds_escalated ON refunds(escalated_to_admin);
CREATE INDEX IF NOT EXISTS idx_orders_settlement_adjusted ON orders(settlement_adjusted);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN refunds.refund_type IS 'Type of refund: full, partial, or item_resend';
COMMENT ON COLUMN refunds.provider_action IS 'Provider response: pending, cash_refund, item_resend, rejected, escalated';
COMMENT ON COLUMN refunds.affects_settlement IS 'Whether this refund should zero out commission in settlements';
COMMENT ON COLUMN refunds.customer_confirmed IS 'Whether customer confirmed receiving the refund';
COMMENT ON COLUMN refunds.confirmation_deadline IS 'Deadline for customer to confirm (auto-confirms after)';
COMMENT ON COLUMN refunds.evidence_images IS 'Array of image URLs uploaded as evidence';
COMMENT ON COLUMN refunds.escalated_to_admin IS 'Whether this refund has been escalated to admin';
COMMENT ON TABLE refund_confirmations IS 'Tracks customer confirmations for cash refunds';
COMMENT ON COLUMN orders.settlement_adjusted IS 'Whether commission was adjusted due to refund';
COMMENT ON COLUMN orders.original_commission IS 'Original commission before adjustment';
