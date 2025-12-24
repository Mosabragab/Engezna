-- Migration: Add original_commission column and update trigger
-- This stores the commission that would be charged without grace period discount
-- Calculated after deducting refunds

-- 1. Add original_commission column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_commission DECIMAL(10,2) DEFAULT 0;

-- 2. Update the commission calculation trigger to include refunds and original commission
CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5,2);
    v_provider_record RECORD;
    v_order_date TIMESTAMPTZ;
    v_default_rate CONSTANT DECIMAL(5,2) := 7.00;
    v_base_amount DECIMAL(10,2);
    v_refund_total DECIMAL(10,2);
    v_original_commission DECIMAL(10,2);
BEGIN
    -- For cancelled/rejected orders, set both commissions to 0
    IF NEW.status IN ('cancelled', 'rejected') THEN
        NEW.platform_commission := 0;
        NEW.original_commission := 0;
        RETURN NEW;
    END IF;

    -- Skip if manually adjusted (for refund system)
    IF TG_OP != 'INSERT' AND COALESCE(NEW.settlement_adjusted, false) THEN
        RETURN NEW;
    END IF;

    v_order_date := COALESCE(NEW.created_at, NOW());

    -- Get provider commission settings
    SELECT commission_status, grace_period_end, custom_commission_rate, commission_rate
    INTO v_provider_record FROM providers WHERE id = NEW.provider_id;

    -- Determine commission rate (priority: custom > standard > default)
    IF NOT FOUND THEN
        v_commission_rate := v_default_rate;
    ELSIF v_provider_record.custom_commission_rate IS NOT NULL THEN
        v_commission_rate := LEAST(v_provider_record.custom_commission_rate, v_default_rate);
    ELSIF v_provider_record.commission_rate IS NOT NULL THEN
        v_commission_rate := LEAST(v_provider_record.commission_rate, v_default_rate);
    ELSE
        v_commission_rate := v_default_rate;
    END IF;

    -- Calculate total refunds for this order
    SELECT COALESCE(SUM(amount), 0) INTO v_refund_total
    FROM refunds
    WHERE order_id = NEW.id
      AND status = 'processed'
      AND affects_settlement = true;

    -- Base amount after refunds
    v_base_amount := (COALESCE(NEW.subtotal, NEW.total, 0) - COALESCE(NEW.discount, 0) - v_refund_total);

    -- Original commission (what would be charged without grace period)
    v_original_commission := ROUND((v_base_amount * v_commission_rate) / 100, 2);
    NEW.original_commission := GREATEST(v_original_commission, 0);

    -- Actual commission (with grace period consideration)
    IF v_provider_record.commission_status = 'in_grace_period'
       AND v_provider_record.grace_period_end IS NOT NULL
       AND v_order_date < v_provider_record.grace_period_end THEN
        -- Grace period: no commission charged
        NEW.platform_commission := 0;
    ELSIF v_provider_record.commission_status = 'exempt' THEN
        -- Exempt: no commission charged
        NEW.platform_commission := 0;
    ELSE
        -- Normal: charge the original commission
        NEW.platform_commission := NEW.original_commission;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recalculate commissions for all delivered orders
-- This will trigger the updated function and populate original_commission
UPDATE orders
SET settlement_adjusted = false
WHERE status = 'delivered';

UPDATE orders
SET status = status
WHERE status = 'delivered';

-- 4. Add comment for documentation
COMMENT ON COLUMN orders.original_commission IS 'Commission that would be charged without grace period discount, calculated after refunds';
