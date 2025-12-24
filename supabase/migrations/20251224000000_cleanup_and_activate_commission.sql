-- ============================================================================
-- تنظيف وتفعيل نظام العمولات للاختبار
-- Cleanup and Activate Commission System for Testing
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 1: مسح جميع التسويات القديمة                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- عرض عدد التسويات قبل المسح
SELECT 'Before cleanup:' as step, COUNT(*) as settlements_count FROM settlements;

-- مسح جميع التسويات
DELETE FROM settlements;

-- تأكيد المسح
SELECT 'After cleanup:' as step, COUNT(*) as settlements_count FROM settlements;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 2: تصفير عمولة الطلبات الملغاة                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

UPDATE orders
SET platform_commission = 0
WHERE status IN ('cancelled', 'rejected')
AND platform_commission > 0;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 3: تفعيل الـ Trigger الجديد (بدون platform_settings)                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_calculate_order_commission ON orders;
DROP FUNCTION IF EXISTS calculate_order_commission();

-- Create the hybrid commission calculator function
-- نسخة مبسطة لا تعتمد على جدول platform_settings
CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate DECIMAL(5,2);
    v_provider_record RECORD;
    v_is_insert BOOLEAN;
    v_is_cancellation BOOLEAN;
    v_was_adjusted BOOLEAN;
    v_order_date TIMESTAMPTZ;
    -- القيم الافتراضية (7% عمولة)
    v_default_rate CONSTANT DECIMAL(5,2) := 7.00;
    v_max_rate CONSTANT DECIMAL(5,2) := 7.00;
BEGIN
    v_is_insert := (TG_OP = 'INSERT');
    v_is_cancellation := (NEW.status IN ('cancelled', 'rejected'));
    v_was_adjusted := COALESCE(NEW.settlement_adjusted, false);
    v_order_date := COALESCE(NEW.created_at, NOW());

    -- ════════════════════════════════════════════════════════════════════════
    -- RULE 1: CANCELLATION → commission = 0
    -- ════════════════════════════════════════════════════════════════════════
    IF v_is_cancellation THEN
        NEW.platform_commission := 0;
        RETURN NEW;
    END IF;

    -- ════════════════════════════════════════════════════════════════════════
    -- RULE 2: BYPASS if refund system adjusted it
    -- ════════════════════════════════════════════════════════════════════════
    IF NOT v_is_insert AND v_was_adjusted THEN
        RETURN NEW;
    END IF;

    -- ════════════════════════════════════════════════════════════════════════
    -- Get provider details
    -- ════════════════════════════════════════════════════════════════════════
    SELECT p.commission_status, p.grace_period_start, p.grace_period_end,
           p.custom_commission_rate, p.commission_rate
    INTO v_provider_record
    FROM providers p WHERE p.id = NEW.provider_id;

    -- ════════════════════════════════════════════════════════════════════════
    -- Determine commission rate (PROVIDER-BASED)
    -- أولوية: فترة السماح ← الإعفاء ← المخصصة ← العادية ← 7%
    -- ════════════════════════════════════════════════════════════════════════
    IF NOT FOUND THEN
        v_commission_rate := v_default_rate;
    ELSE
        -- Priority 1: Grace period (at order creation time)
        IF v_provider_record.commission_status = 'in_grace_period'
           AND v_provider_record.grace_period_end IS NOT NULL
           AND v_order_date < v_provider_record.grace_period_end THEN
            v_commission_rate := 0;

        -- Priority 2: Exempt
        ELSIF v_provider_record.commission_status = 'exempt' THEN
            v_commission_rate := 0;

        -- Priority 3: Custom rate (capped at max)
        ELSIF v_provider_record.custom_commission_rate IS NOT NULL THEN
            v_commission_rate := LEAST(v_provider_record.custom_commission_rate, v_max_rate);

        -- Priority 4: Standard rate (capped at max)
        ELSIF v_provider_record.commission_rate IS NOT NULL THEN
            v_commission_rate := LEAST(v_provider_record.commission_rate, v_max_rate);

        -- Priority 5: Default (7%)
        ELSE
            v_commission_rate := v_default_rate;
        END IF;
    END IF;

    -- ════════════════════════════════════════════════════════════════════════
    -- Calculate commission: (subtotal - discount) × rate / 100
    -- ════════════════════════════════════════════════════════════════════════
    NEW.platform_commission := ROUND(
        ((COALESCE(NEW.subtotal, NEW.total, 0) - COALESCE(NEW.discount, 0)) * COALESCE(v_commission_rate, 0)) / 100,
        2
    );

    -- Ensure non-negative
    IF NEW.platform_commission < 0 OR NEW.platform_commission IS NULL THEN
        NEW.platform_commission := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (watches: status, subtotal, discount, provider_id, settlement_adjusted)
CREATE TRIGGER trigger_calculate_order_commission
    BEFORE INSERT OR UPDATE OF status, subtotal, discount, provider_id, settlement_adjusted ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 4: إعادة حساب العمولات للطلبات الموجودة                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Trigger recalculation by touching 'status' column
UPDATE orders
SET status = status
WHERE settlement_adjusted IS NOT TRUE;

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ STEP 5: تقرير الحالة النهائية                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT
    '📊 Orders Summary' as report,
    status,
    COUNT(*) as count,
    SUM(total) as total_revenue,
    SUM(COALESCE(platform_commission, 0)) as total_commission,
    ROUND(AVG(COALESCE(platform_commission, 0)), 2) as avg_commission
FROM orders
GROUP BY status
ORDER BY count DESC;

-- عرض الطلبات المسلّمة مع العمولة
SELECT
    '✅ Delivered Orders with Commission' as report,
    COUNT(*) as count,
    SUM(total) as total_revenue,
    SUM(platform_commission) as total_commission,
    ROUND((SUM(platform_commission) / NULLIF(SUM(total), 0)) * 100, 2) as commission_percent
FROM orders
WHERE status = 'delivered';

-- عرض المزودين وحالة العمولة
SELECT
    '👤 Providers Commission Status' as report,
    p.name_ar,
    p.commission_status,
    p.grace_period_end,
    p.custom_commission_rate,
    p.commission_rate,
    COUNT(o.id) as orders_count,
    SUM(COALESCE(o.platform_commission, 0)) as total_commission
FROM providers p
LEFT JOIN orders o ON o.provider_id = p.id AND o.status = 'delivered'
GROUP BY p.id, p.name_ar, p.commission_status, p.grace_period_end, p.custom_commission_rate, p.commission_rate
ORDER BY orders_count DESC;

-- ============================================================================
-- ✅ DONE! النظام جاهز للاختبار
-- ============================================================================
