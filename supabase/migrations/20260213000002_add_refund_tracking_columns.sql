-- Add refund tracking columns to orders table
-- Used by /api/payment/kashier/refund endpoint

-- Transaction ID from Kashier for the refund
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS refund_transaction_id TEXT;

-- When the refund was processed
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.refund_transaction_id IS 'Kashier refund transaction ID';
COMMENT ON COLUMN orders.refunded_at IS 'When the refund was processed through the payment gateway';
