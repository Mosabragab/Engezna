-- Add payment tracking fields to orders table for Kashier integration
-- Run this migration to enable online payment functionality

-- Add payment transaction ID from Kashier
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT;

-- Add payment initiation timestamp
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_initiated_at TIMESTAMPTZ;

-- Add payment completion timestamp
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMPTZ;

-- Add payment response JSON for debugging
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_response JSONB;

-- Add index for transaction ID lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_transaction_id
ON orders(payment_transaction_id)
WHERE payment_transaction_id IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN orders.payment_transaction_id IS 'Kashier transaction ID for tracking';
COMMENT ON COLUMN orders.payment_initiated_at IS 'When payment was initiated';
COMMENT ON COLUMN orders.payment_completed_at IS 'When payment was successfully completed';
COMMENT ON COLUMN orders.payment_response IS 'Full payment gateway response for debugging';
