-- Migration: Complete Settlements System
-- Date: December 7, 2025
-- Purpose: Create a proper settlement system for tracking platform fees

-- =====================================================
-- STEP 1: Create settlements table
-- =====================================================

CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

    -- Period information
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Financial breakdown
    total_orders INTEGER NOT NULL DEFAULT 0,
    gross_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    platform_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_fees_collected DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_amount_due DECIMAL(10,2) NOT NULL DEFAULT 0, -- Amount provider owes platform

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'disputed', 'waived')),

    -- Payment tracking
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_date TIMESTAMPTZ,
    payment_method TEXT,
    payment_reference TEXT,

    -- Due date and overdue tracking
    due_date DATE NOT NULL,
    is_overdue BOOLEAN DEFAULT FALSE,
    overdue_days INTEGER DEFAULT 0,

    -- Notes
    notes TEXT,
    admin_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    processed_by UUID REFERENCES profiles(id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_settlements_provider ON settlements(provider_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_due_date ON settlements(due_date);
CREATE INDEX IF NOT EXISTS idx_settlements_period ON settlements(period_start, period_end);

-- =====================================================
-- STEP 2: Create settlement_items table (order details)
-- =====================================================

CREATE TABLE IF NOT EXISTS settlement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

    order_total DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL, -- e.g., 6.00 for 6%
    commission_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement ON settlement_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_order ON settlement_items(order_id);

-- =====================================================
-- STEP 3: Create view for settlement summary
-- =====================================================

CREATE OR REPLACE VIEW settlement_summary AS
SELECT
    p.id as provider_id,
    p.store_name_ar,
    p.store_name_en,
    p.commission_rate,

    -- Total pending settlements
    COALESCE(SUM(CASE WHEN s.status = 'pending' THEN s.net_amount_due ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(CASE WHEN s.status = 'overdue' THEN s.net_amount_due - s.amount_paid ELSE 0 END), 0) as overdue_amount,
    COALESCE(SUM(CASE WHEN s.status = 'paid' THEN s.amount_paid ELSE 0 END), 0) as total_paid,

    -- Counts
    COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN s.status = 'overdue' THEN 1 END) as overdue_count,

    -- Last settlement info
    MAX(s.period_end) as last_settlement_period,
    MAX(s.payment_date) as last_payment_date

FROM providers p
LEFT JOIN settlements s ON s.provider_id = p.id
WHERE p.status IN ('active', 'open', 'closed', 'temporarily_paused')
GROUP BY p.id, p.store_name_ar, p.store_name_en, p.commission_rate;

-- =====================================================
-- STEP 4: Function to generate settlement for a provider
-- =====================================================

CREATE OR REPLACE FUNCTION generate_provider_settlement(
    p_provider_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_settlement_id UUID;
    v_commission_rate DECIMAL(5,2);
    v_total_orders INTEGER;
    v_gross_revenue DECIMAL(10,2);
    v_platform_commission DECIMAL(10,2);
    v_delivery_fees DECIMAL(10,2);
    v_net_due DECIMAL(10,2);
    v_due_date DATE;
    v_order RECORD;
BEGIN
    -- Get provider commission rate
    SELECT COALESCE(commission_rate, 6.00) INTO v_commission_rate
    FROM providers WHERE id = p_provider_id;

    -- Calculate totals from completed orders in the period
    SELECT
        COUNT(*),
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(delivery_fee), 0)
    INTO v_total_orders, v_gross_revenue, v_delivery_fees
    FROM orders
    WHERE provider_id = p_provider_id
    AND status IN ('completed', 'delivered')
    AND created_at >= p_period_start
    AND created_at < p_period_end + INTERVAL '1 day';

    -- If no orders, don't create settlement
    IF v_total_orders = 0 THEN
        RETURN NULL;
    END IF;

    -- Calculate commission
    v_platform_commission := ROUND(v_gross_revenue * v_commission_rate / 100, 2);

    -- Net due = commission only (provider keeps delivery fees)
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
    FOR v_order IN
        SELECT id, total_amount, delivery_fee
        FROM orders
        WHERE provider_id = p_provider_id
        AND status IN ('completed', 'delivered')
        AND created_at >= p_period_start
        AND created_at < p_period_end + INTERVAL '1 day'
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
            ROUND(v_order.total_amount * v_commission_rate / 100, 2),
            COALESCE(v_order.delivery_fee, 0)
        );
    END LOOP;

    RETURN v_settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: Function to generate settlements for all providers (weekly)
-- =====================================================

CREATE OR REPLACE FUNCTION generate_weekly_settlements(
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
    -- Calculate last week's period (Saturday to Friday)
    v_period_end := CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER; -- Last Saturday
    v_period_start := v_period_end - 6; -- Previous Sunday

    -- Generate settlement for each active provider
    FOR v_provider IN
        SELECT id FROM providers
        WHERE status IN ('active', 'open', 'closed', 'temporarily_paused')
    LOOP
        -- Check if settlement already exists for this period
        IF NOT EXISTS (
            SELECT 1 FROM settlements
            WHERE provider_id = v_provider.id
            AND period_start = v_period_start
            AND period_end = v_period_end
        ) THEN
            v_settlement_id := generate_provider_settlement(
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
-- STEP 6: Function to mark overdue settlements
-- =====================================================

CREATE OR REPLACE FUNCTION update_overdue_settlements()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE settlements
    SET
        is_overdue = TRUE,
        overdue_days = CURRENT_DATE - due_date,
        status = 'overdue',
        updated_at = NOW()
    WHERE status = 'pending'
    AND due_date < CURRENT_DATE;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 7: Function to record payment
-- =====================================================

CREATE OR REPLACE FUNCTION record_settlement_payment(
    p_settlement_id UUID,
    p_amount DECIMAL(10,2),
    p_payment_method TEXT,
    p_payment_reference TEXT DEFAULT NULL,
    p_processed_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_net_due DECIMAL(10,2);
    v_amount_paid DECIMAL(10,2);
    v_new_total DECIMAL(10,2);
BEGIN
    -- Get current settlement info
    SELECT net_amount_due, amount_paid
    INTO v_net_due, v_amount_paid
    FROM settlements WHERE id = p_settlement_id;

    v_new_total := v_amount_paid + p_amount;

    -- Update settlement
    UPDATE settlements
    SET
        amount_paid = v_new_total,
        payment_date = NOW(),
        payment_method = p_payment_method,
        payment_reference = p_payment_reference,
        processed_by = p_processed_by,
        status = CASE
            WHEN v_new_total >= v_net_due THEN 'paid'
            ELSE 'partially_paid'
        END,
        is_overdue = FALSE,
        updated_at = NOW()
    WHERE id = p_settlement_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 8: RLS Policies
-- =====================================================

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Admins can view all settlements"
ON settlements FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Providers can see their own
CREATE POLICY "Providers can view own settlements"
ON settlements FOR SELECT
TO authenticated
USING (
    provider_id IN (
        SELECT id FROM providers WHERE user_id = auth.uid()
    )
);

-- Admin can insert/update
CREATE POLICY "Admins can manage settlements"
ON settlements FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Settlement items policies
CREATE POLICY "View settlement items"
ON settlement_items FOR SELECT
TO authenticated
USING (
    settlement_id IN (
        SELECT id FROM settlements
        WHERE provider_id IN (
            SELECT id FROM providers WHERE user_id = auth.uid()
        )
    )
    OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- =====================================================
-- STEP 9: Generate initial settlements for existing orders
-- =====================================================

-- This will generate settlements for last month's orders
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Generate settlements for the current month
    SELECT generate_weekly_settlements() INTO v_count;
    RAISE NOTICE 'Generated % settlements', v_count;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE settlements IS 'Tracks platform fee settlements that providers owe to Engezna';
COMMENT ON TABLE settlement_items IS 'Individual orders included in each settlement';
COMMENT ON FUNCTION generate_provider_settlement IS 'Generates a settlement for a specific provider and period';
COMMENT ON FUNCTION generate_weekly_settlements IS 'Generates weekly settlements for all active providers';
COMMENT ON FUNCTION record_settlement_payment IS 'Records a payment against a settlement';
