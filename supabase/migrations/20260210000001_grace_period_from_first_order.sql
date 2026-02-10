-- ============================================================================
-- Migration: Grace Period Starts from First Order
-- فترة السماح تبدأ من تاريخ أول طلب وليس من تاريخ الانضمام
-- ============================================================================
-- Date: 2026-02-10
-- Purpose: Change grace period to start from the date of the provider's first
--          delivered order instead of from provider creation/registration date.
--          Grace period duration: 90 days (read from commission_settings table).
-- ============================================================================
-- TABLES USED:
--   commission_settings (EXISTS) - stores default_grace_period_days
--   providers (EXISTS) - grace_period_start, grace_period_end, commission_status
--   orders (EXISTS) - trigger fires on status change
--   settlement_audit_log (EXISTS) - audit trail
-- ============================================================================

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 1: Ensure commission_settings has 90 days (should already be set)    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

UPDATE commission_settings
SET default_grace_period_days = 90
WHERE default_grace_period_days != 90;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 2: Clear grace_period_start/end for providers who haven't had any    ║
-- ║ delivered orders yet (so the new trigger can set them correctly)           ║
-- ║ تصفير تواريخ فترة السماح للتجار الذين لم يحصلوا على أي طلب مسلّم بعد     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Only reset providers who:
--   1. Are still in grace period
--   2. Have NO delivered orders at all
UPDATE providers p
SET
    grace_period_start = NULL,
    grace_period_end = NULL
WHERE p.commission_status = 'in_grace_period'
  AND NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.provider_id = p.id
      AND o.status = 'delivered'
  );

-- For providers who ARE in grace period AND HAVE delivered orders,
-- reset their grace period to start from their first delivered order
UPDATE providers p
SET
    grace_period_start = first_order.first_delivered_at,
    grace_period_end = first_order.first_delivered_at + (
        COALESCE(
            (SELECT default_grace_period_days FROM commission_settings LIMIT 1),
            90
        ) || ' days'
    )::INTERVAL
FROM (
    SELECT
        o.provider_id,
        MIN(COALESCE(o.delivered_at, o.updated_at, o.created_at)) AS first_delivered_at
    FROM orders o
    WHERE o.status = 'delivered'
    GROUP BY o.provider_id
) first_order
WHERE p.id = first_order.provider_id
  AND p.commission_status = 'in_grace_period';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 3: Create trigger to start grace period on first delivered order     ║
-- ║ تريجر لبدء فترة السماح عند أول طلب مسلّم                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION start_grace_period_on_first_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_provider RECORD;
    v_grace_days INTEGER;
    v_first_order_date TIMESTAMPTZ;
BEGIN
    -- Only trigger when order status changes to 'delivered'
    IF NEW.status != 'delivered' THEN
        RETURN NEW;
    END IF;

    -- Only trigger if this is a status change (not already delivered)
    IF TG_OP = 'UPDATE' AND OLD.status = 'delivered' THEN
        RETURN NEW;
    END IF;

    -- Get provider details
    SELECT
        commission_status,
        grace_period_start,
        grace_period_end
    INTO v_provider
    FROM providers
    WHERE id = NEW.provider_id;

    -- Only proceed if provider is in grace period and hasn't started yet
    IF v_provider.commission_status != 'in_grace_period' THEN
        RETURN NEW;
    END IF;

    -- If grace_period_start is already set, the period has already been activated
    IF v_provider.grace_period_start IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- This is the first delivered order! Start the grace period now.
    -- Get grace period duration from commission_settings table
    SELECT COALESCE(default_grace_period_days, 90)
    INTO v_grace_days
    FROM commission_settings
    LIMIT 1;

    -- Fallback if no settings row exists
    IF v_grace_days IS NULL THEN
        v_grace_days := 90;
    END IF;

    -- Use the delivery date (now) as the start of grace period
    v_first_order_date := COALESCE(NEW.delivered_at, NOW());

    -- Update provider with grace period dates
    UPDATE providers
    SET
        grace_period_start = v_first_order_date,
        grace_period_end = v_first_order_date + (v_grace_days || ' days')::INTERVAL
    WHERE id = NEW.provider_id;

    -- Log this event
    INSERT INTO settlement_audit_log (
        order_id, action, admin_name,
        reason, new_value
    ) VALUES (
        NEW.id,
        'update_status',
        'System',
        'Grace period started on first delivered order',
        jsonb_build_object(
            'provider_id', NEW.provider_id,
            'grace_period_start', v_first_order_date,
            'grace_period_days', v_grace_days,
            'grace_period_end', v_first_order_date + (v_grace_days || ' days')::INTERVAL,
            'trigger', 'first_order'
        )
    );

    RETURN NEW;
END;
$$;

-- Create the trigger on orders table
DROP TRIGGER IF EXISTS trg_start_grace_period_on_first_order ON orders;
CREATE TRIGGER trg_start_grace_period_on_first_order
    AFTER INSERT OR UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION start_grace_period_on_first_order();

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 4: Update calculate_order_commission to handle NULL grace_period_end ║
-- ║ التعامل مع التجار الذين لم يبدأوا فترة السماح بعد                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5,2);
    v_theoretical_rate DECIMAL(5,2);
    v_provider_record RECORD;
    v_order_date TIMESTAMPTZ;
    v_default_rate CONSTANT DECIMAL(5,2) := 7.00;
    v_base_amount DECIMAL(10,2);
    v_theoretical_commission DECIMAL(10,2);
    v_is_grace_period BOOLEAN := FALSE;
    v_is_exempt BOOLEAN := FALSE;
BEGIN
    -- ========================================================================
    -- RULE 1: Cancelled/Rejected orders have zero commission
    -- ========================================================================
    IF NEW.status IN ('cancelled', 'rejected') THEN
        NEW.platform_commission := 0;
        NEW.original_commission := 0;
        NEW.grace_period_discount := 0;
        RETURN NEW;
    END IF;

    -- ========================================================================
    -- RULE 2: Skip if adjusted by refund system
    -- ========================================================================
    IF TG_OP != 'INSERT' AND COALESCE(NEW.settlement_adjusted, false) THEN
        RETURN NEW;
    END IF;

    v_order_date := COALESCE(NEW.created_at, NOW());

    -- ========================================================================
    -- STEP 3: Get provider settings
    -- ========================================================================
    SELECT
        commission_status,
        grace_period_start,
        grace_period_end,
        custom_commission_rate,
        commission_rate
    INTO v_provider_record
    FROM providers
    WHERE id = NEW.provider_id;

    -- ========================================================================
    -- STEP 4: Determine theoretical commission rate (ignoring grace period)
    -- ========================================================================
    IF NOT FOUND THEN
        v_theoretical_rate := v_default_rate;
    ELSIF v_provider_record.custom_commission_rate IS NOT NULL THEN
        v_theoretical_rate := LEAST(v_provider_record.custom_commission_rate, v_default_rate);
    ELSIF v_provider_record.commission_rate IS NOT NULL THEN
        v_theoretical_rate := LEAST(v_provider_record.commission_rate, v_default_rate);
    ELSE
        v_theoretical_rate := v_default_rate;
    END IF;

    -- ========================================================================
    -- STEP 5: Check if in grace period or exempt
    -- Grace period is active if:
    --   a) commission_status = 'in_grace_period' AND grace_period_end > order_date
    --      (grace period has started and not yet expired)
    --   b) commission_status = 'in_grace_period' AND grace_period_start IS NULL
    --      (grace period not yet started - provider hasn't had first order yet)
    -- ========================================================================
    v_is_grace_period := (
        v_provider_record.commission_status = 'in_grace_period'
        AND (
            -- Case A: Grace period started but not expired
            (v_provider_record.grace_period_end IS NOT NULL AND v_order_date < v_provider_record.grace_period_end)
            OR
            -- Case B: Grace period not yet started (first order hasn't been delivered)
            (v_provider_record.grace_period_start IS NULL)
        )
    );

    v_is_exempt := (v_provider_record.commission_status = 'exempt');

    -- ========================================================================
    -- STEP 6: Calculate base amount and theoretical commission
    -- ========================================================================
    v_base_amount := COALESCE(NEW.subtotal, NEW.total, 0) - COALESCE(NEW.discount, 0);

    -- Theoretical commission (always calculated for visibility)
    v_theoretical_commission := ROUND((v_base_amount * v_theoretical_rate) / 100, 2);
    v_theoretical_commission := GREATEST(v_theoretical_commission, 0);

    -- Store theoretical commission in original_commission
    NEW.original_commission := v_theoretical_commission;

    -- ========================================================================
    -- STEP 7: Calculate actual commission (respecting grace period)
    -- ========================================================================
    IF v_is_grace_period THEN
        -- Grace period: no actual commission, but track the discount
        NEW.platform_commission := 0;
        NEW.grace_period_discount := v_theoretical_commission;
    ELSIF v_is_exempt THEN
        -- Exempt: no commission
        NEW.platform_commission := 0;
        NEW.grace_period_discount := 0;
    ELSE
        -- Normal: actual commission = theoretical
        NEW.platform_commission := v_theoretical_commission;
        NEW.grace_period_discount := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_calculate_order_commission ON orders;
CREATE TRIGGER trigger_calculate_order_commission
    BEFORE INSERT OR UPDATE OF status, subtotal, discount, provider_id, settlement_adjusted
    ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 5: Documentation                                                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

COMMENT ON FUNCTION start_grace_period_on_first_order() IS
'Starts the grace period when a provider receives their first delivered order.
Grace period duration is read from commission_settings.default_grace_period_days (default: 90).
This ensures providers are not penalized during the time before they receive orders.

FLOW:
1. Provider is created → commission_status = in_grace_period, grace_period_start = NULL
2. First order is delivered → grace_period_start = NOW(), grace_period_end = NOW() + 90 days
3. After 90 days → commission_status changes to active via update_expired_grace_periods()';

COMMENT ON FUNCTION calculate_order_commission() IS
'HYBRID TRIGGER v4: Grace Period Commission Visibility (First Order Based)

PURPOSE:
- Calculate commission server-side (security)
- Store BOTH theoretical and actual commission
- Allow grace period merchants to see what commission would be
- Track grace period discount separately
- Handle providers who have not had their first order yet

GRACE PERIOD LOGIC:
- If commission_status = in_grace_period AND grace_period_start IS NULL:
  Provider has not had first order yet, still in grace period (commission = 0)
- If commission_status = in_grace_period AND order_date < grace_period_end:
  Within grace period window (commission = 0)
- Otherwise: normal commission applies

COLUMNS SET:
1. original_commission: Theoretical commission (always calculated)
2. platform_commission: Actual commission (0 during grace period)
3. grace_period_discount: The discount amount (= original during grace period)';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ END OF MIGRATION                                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
