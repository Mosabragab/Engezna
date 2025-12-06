-- Migration: Settlements COD vs Online Payment Breakdown
-- Date: December 7, 2025
-- Purpose: Add separate tracking for COD and Online payment settlements

-- =====================================================
-- STEP 1: Add new columns for COD/Online breakdown
-- =====================================================

-- COD (Cash on Delivery) - Provider collects, owes commission to platform
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS cod_orders_count INTEGER DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS cod_gross_revenue DECIMAL(10,2) DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS cod_commission_owed DECIMAL(10,2) DEFAULT 0;

-- Online Payments - Platform collects, owes payout to provider
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS online_orders_count INTEGER DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS online_gross_revenue DECIMAL(10,2) DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS online_platform_commission DECIMAL(10,2) DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS online_payout_owed DECIMAL(10,2) DEFAULT 0;

-- Net balance calculation
-- Positive = Platform pays provider
-- Negative = Provider pays platform
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS net_balance DECIMAL(10,2) DEFAULT 0;

-- Direction of settlement
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS settlement_direction TEXT
    CHECK (settlement_direction IN ('platform_pays_provider', 'provider_pays_platform', 'balanced'));

-- =====================================================
-- STEP 2: Create settlement_items table if not exists
-- =====================================================

CREATE TABLE IF NOT EXISTS settlement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_total DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 6.00,
    commission_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(settlement_id, order_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement_id ON settlement_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_order_id ON settlement_items(order_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_payment_method ON settlement_items(payment_method);

-- Add RLS policies
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all settlement items (using admin_users table)
DROP POLICY IF EXISTS "Admins can view all settlement items" ON settlement_items;
CREATE POLICY "Admins can view all settlement items"
    ON settlement_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
        )
    );

-- Policy: Providers can view their own settlement items (using owner_id)
DROP POLICY IF EXISTS "Providers can view own settlement items" ON settlement_items;
CREATE POLICY "Providers can view own settlement items"
    ON settlement_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM settlements s
            JOIN providers p ON s.provider_id = p.id
            WHERE s.id = settlement_items.settlement_id
            AND p.owner_id = auth.uid()
        )
    );

COMMENT ON TABLE settlement_items IS 'Individual order details within a settlement';

-- =====================================================
-- COMMENTS for new columns
-- =====================================================

COMMENT ON COLUMN settlements.cod_orders_count IS 'Number of Cash on Delivery orders';
COMMENT ON COLUMN settlements.cod_gross_revenue IS 'Total revenue from COD orders (provider collected)';
COMMENT ON COLUMN settlements.cod_commission_owed IS 'Commission provider owes platform from COD orders';
COMMENT ON COLUMN settlements.online_orders_count IS 'Number of online payment orders';
COMMENT ON COLUMN settlements.online_gross_revenue IS 'Total revenue from online orders (platform collected)';
COMMENT ON COLUMN settlements.online_platform_commission IS 'Platform commission from online orders';
COMMENT ON COLUMN settlements.online_payout_owed IS 'Amount platform owes provider from online orders';
COMMENT ON COLUMN settlements.net_balance IS 'Net balance: positive = platform pays provider, negative = provider pays platform';
COMMENT ON COLUMN settlements.settlement_direction IS 'Direction of payment flow';
