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

-- Policy: Admins can view all settlement items
DROP POLICY IF EXISTS "Admins can view all settlement items" ON settlement_items;
CREATE POLICY "Admins can view all settlement items"
    ON settlement_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Providers can view their own settlement items
DROP POLICY IF EXISTS "Providers can view own settlement items" ON settlement_items;
CREATE POLICY "Providers can view own settlement items"
    ON settlement_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM settlements s
            JOIN providers p ON s.provider_id = p.id
            WHERE s.id = settlement_items.settlement_id
            AND p.user_id = auth.uid()
        )
    );

COMMENT ON TABLE settlement_items IS 'Individual order details within a settlement';

-- =====================================================
-- STEP 3: Update function to generate settlement with COD/Online breakdown
-- =====================================================

CREATE OR REPLACE FUNCTION generate_provider_settlement_v2(
    p_provider_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_settlement_id UUID;
    v_commission_rate DECIMAL(5,2) := 6.00; -- Default 6%

    -- COD totals
    v_cod_orders_count INTEGER;
    v_cod_gross_revenue DECIMAL(10,2);
    v_cod_commission_owed DECIMAL(10,2);

    -- Online totals
    v_online_orders_count INTEGER;
    v_online_gross_revenue DECIMAL(10,2);
    v_online_platform_commission DECIMAL(10,2);
    v_online_payout_owed DECIMAL(10,2);

    -- Combined
    v_total_orders INTEGER;
    v_gross_revenue DECIMAL(10,2);
    v_net_balance DECIMAL(10,2);
    v_settlement_direction TEXT;
    v_due_date DATE;
    v_order RECORD;
BEGIN
    -- Calculate COD orders (provider collected cash, owes commission)
    SELECT
        COUNT(*),
        COALESCE(SUM(total), 0)
    INTO v_cod_orders_count, v_cod_gross_revenue
    FROM orders
    WHERE provider_id = p_provider_id
    AND status = 'delivered'
    AND payment_status = 'completed'
    AND payment_method = 'cash'
    AND created_at >= p_period_start
    AND created_at < p_period_end + INTERVAL '1 day';

    v_cod_commission_owed := ROUND(v_cod_gross_revenue * v_commission_rate / 100, 2);

    -- Calculate Online orders (platform collected, owes provider)
    SELECT
        COUNT(*),
        COALESCE(SUM(total), 0)
    INTO v_online_orders_count, v_online_gross_revenue
    FROM orders
    WHERE provider_id = p_provider_id
    AND status = 'delivered'
    AND payment_status = 'completed'
    AND payment_method != 'cash'
    AND created_at >= p_period_start
    AND created_at < p_period_end + INTERVAL '1 day';

    v_online_platform_commission := ROUND(v_online_gross_revenue * v_commission_rate / 100, 2);
    v_online_payout_owed := v_online_gross_revenue - v_online_platform_commission;

    -- Combined totals
    v_total_orders := v_cod_orders_count + v_online_orders_count;
    v_gross_revenue := v_cod_gross_revenue + v_online_gross_revenue;

    -- If no orders, don't create settlement
    IF v_total_orders = 0 THEN
        RETURN NULL;
    END IF;

    -- Calculate net balance
    -- Positive = Platform pays provider (online payout > COD commission)
    -- Negative = Provider pays platform (COD commission > online payout)
    v_net_balance := v_online_payout_owed - v_cod_commission_owed;

    -- Determine direction
    IF v_net_balance > 0 THEN
        v_settlement_direction := 'platform_pays_provider';
    ELSIF v_net_balance < 0 THEN
        v_settlement_direction := 'provider_pays_platform';
    ELSE
        v_settlement_direction := 'balanced';
    END IF;

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
        -- COD breakdown
        cod_orders_count,
        cod_gross_revenue,
        cod_commission_owed,
        -- Online breakdown
        online_orders_count,
        online_gross_revenue,
        online_platform_commission,
        online_payout_owed,
        -- Net calculation
        net_balance,
        settlement_direction,
        net_amount_due,
        due_date,
        created_by
    ) VALUES (
        p_provider_id,
        p_period_start,
        p_period_end,
        v_total_orders,
        v_gross_revenue,
        v_cod_commission_owed + v_online_platform_commission,
        -- COD breakdown
        v_cod_orders_count,
        v_cod_gross_revenue,
        v_cod_commission_owed,
        -- Online breakdown
        v_online_orders_count,
        v_online_gross_revenue,
        v_online_platform_commission,
        v_online_payout_owed,
        -- Net calculation
        v_net_balance,
        v_settlement_direction,
        CASE WHEN v_net_balance < 0 THEN ABS(v_net_balance) ELSE 0 END,
        v_due_date,
        p_created_by
    ) RETURNING id INTO v_settlement_id;

    -- Add settlement items (individual orders)
    FOR v_order IN
        SELECT id, total, delivery_fee, payment_method
        FROM orders
        WHERE provider_id = p_provider_id
        AND status = 'delivered'
        AND payment_status = 'completed'
        AND created_at >= p_period_start
        AND created_at < p_period_end + INTERVAL '1 day'
    LOOP
        INSERT INTO settlement_items (
            settlement_id,
            order_id,
            order_total,
            commission_rate,
            commission_amount,
            delivery_fee,
            payment_method
        ) VALUES (
            v_settlement_id,
            v_order.id,
            v_order.total,
            v_commission_rate,
            ROUND(v_order.total * v_commission_rate / 100, 2),
            COALESCE(v_order.delivery_fee, 0),
            v_order.payment_method
        );
    END LOOP;

    RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Update weekly settlements function
-- =====================================================

CREATE OR REPLACE FUNCTION generate_weekly_settlements_v2(
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_provider RECORD;
    v_period_start DATE;
    v_period_end DATE;
    v_settlement_id UUID;
BEGIN
    -- Calculate last week's period
    v_period_end := CURRENT_DATE - 1; -- Yesterday
    v_period_start := v_period_end - 6; -- 7 days ago

    -- Generate settlement for each active provider
    FOR v_provider IN
        SELECT id FROM providers
        WHERE status IN ('open', 'temporarily_paused')
    LOOP
        -- Check if settlement already exists for this period
        IF NOT EXISTS (
            SELECT 1 FROM settlements
            WHERE provider_id = v_provider.id
            AND period_start = v_period_start
            AND period_end = v_period_end
        ) THEN
            v_settlement_id := generate_provider_settlement_v2(
                v_provider.id,
                v_period_start,
                v_period_end,
                p_created_by
            );

            IF v_settlement_id IS NOT NULL THEN
                v_count := v_count + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
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
