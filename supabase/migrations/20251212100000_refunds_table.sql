-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Create Refunds Table
-- Date: 2025-12-12
-- Description: Create refunds table for tracking order refunds
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create refund status enum
CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'rejected', 'processed', 'failed');

-- Create refund method enum
CREATE TYPE refund_method AS ENUM ('wallet', 'original_payment', 'cash', 'bank_transfer');

-- ═══════════════════════════════════════════════════════════════════════════════
-- Refunds Table
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order reference
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  -- Refund details
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  reason_ar TEXT, -- Arabic reason for customer display
  status refund_status NOT NULL DEFAULT 'pending',

  -- Processing details
  refund_method refund_method,
  processed_amount DECIMAL(10,2) DEFAULT 0,
  processing_notes TEXT,

  -- Request source
  requested_by UUID REFERENCES profiles(id), -- Can be customer or admin
  request_source VARCHAR(20) DEFAULT 'admin', -- 'customer', 'admin', 'system'

  -- Approval workflow
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Processing
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_customer_id ON refunds(customer_id);
CREATE INDEX idx_refunds_provider_id ON refunds(provider_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Updated at trigger
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refunds_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_refunds_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all refunds"
  ON refunds
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Customers can view their own refunds
CREATE POLICY "Customers can view their own refunds"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Customers can request refunds for their orders
CREATE POLICY "Customers can create refund requests"
  ON refunds
  FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND request_source = 'customer'
    AND status = 'pending'
  );

-- Providers can view refunds for their orders
CREATE POLICY "Providers can view their refunds"
  ON refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = refunds.provider_id
      AND providers.owner_id = auth.uid()
    )
  );

-- Service role full access
GRANT ALL ON refunds TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Customer notification on refund status change
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_customer_refund_update()
RETURNS TRIGGER AS $$
DECLARE
  order_number TEXT;
  status_text_ar TEXT;
  status_text_en TEXT;
BEGIN
  -- Only notify on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get order number
  SELECT order_number INTO order_number
  FROM orders WHERE id = NEW.order_id;

  -- Set status text
  CASE NEW.status
    WHEN 'approved' THEN
      status_text_ar := 'تمت الموافقة على طلب الاسترداد';
      status_text_en := 'Refund request approved';
    WHEN 'rejected' THEN
      status_text_ar := 'تم رفض طلب الاسترداد';
      status_text_en := 'Refund request rejected';
    WHEN 'processed' THEN
      status_text_ar := 'تم تنفيذ الاسترداد بنجاح';
      status_text_en := 'Refund processed successfully';
    WHEN 'failed' THEN
      status_text_ar := 'فشل تنفيذ الاسترداد';
      status_text_en := 'Refund processing failed';
    ELSE
      RETURN NEW;
  END CASE;

  -- Create notification
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
    status_text_ar || ' للطلب #' || order_number,
    status_text_en || ' for order #' || order_number,
    'order_update',
    jsonb_build_object(
      'refund_id', NEW.id,
      'order_id', NEW.order_id,
      'status', NEW.status,
      'amount', NEW.amount
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_customer_refund_update
  AFTER UPDATE ON refunds
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_refund_update();

-- ═══════════════════════════════════════════════════════════════════════════════
-- Add refunded status to order_status enum if not exists
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Check if 'refunded' already exists in order_status
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'refunded'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'refunded';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Comments
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE refunds IS 'Stores refund requests and their processing status';
COMMENT ON COLUMN refunds.status IS 'pending: awaiting review, approved: ready to process, rejected: denied, processed: money returned, failed: processing error';
COMMENT ON COLUMN refunds.refund_method IS 'How the refund will be/was processed';
COMMENT ON COLUMN refunds.request_source IS 'Who initiated the refund: customer, admin, or system';
