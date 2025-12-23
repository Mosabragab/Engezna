-- ============================================================================
-- 🚨 إصلاح فوري للمشاكل المكتشفة
-- قم بتشغيل هذه الأوامر على Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1️⃣ تشخيص: ما المشكلة بالضبط؟
-- ============================================================================

-- أ) الطلبات غير المكتملة التي لديها عمولة
SELECT
    order_number,
    status,
    total,
    platform_commission,
    created_at
FROM orders
WHERE status NOT IN ('delivered', 'completed')
AND platform_commission > 0;

-- ب) التسويات التي تم دفعها - من دفعها؟
SELECT
    s.id,
    p.name_ar as provider_name,
    s.status as settlement_status,
    s.platform_commission,
    s.payment_method,
    s.paid_at,
    s.payment_reference,
    s.notes
FROM settlements s
JOIN providers p ON s.provider_id = p.id
WHERE s.status = 'paid'
ORDER BY s.paid_at DESC;

-- ============================================================================
-- 2️⃣ إصلاح فوري: تصفير العمولة للطلبات غير المكتملة
-- ============================================================================
UPDATE orders
SET platform_commission = 0
WHERE status NOT IN ('delivered', 'completed')
AND platform_commission > 0;

-- ============================================================================
-- 3️⃣ إصلاح: إعادة حساب العمولة للطلبات المكتملة
-- ============================================================================

-- أولاً: ما هي نسبة العمولة للمتجر؟
SELECT
    id,
    name_ar,
    commission_rate,
    custom_commission_rate,
    COALESCE(custom_commission_rate, commission_rate, 7.00) as "النسبة_الفعلية"
FROM providers
WHERE name_ar LIKE '%الصفا%';

-- ثانياً: إعادة حساب العمولة الصحيحة
UPDATE orders o
SET platform_commission = ROUND(
    ((COALESCE(o.subtotal, o.total, 0) - COALESCE(o.discount, 0)) *
     COALESCE(
        (SELECT p.custom_commission_rate FROM providers p WHERE p.id = o.provider_id),
        (SELECT p.commission_rate FROM providers p WHERE p.id = o.provider_id),
        7.00
     )) / 100,
    2
)
WHERE o.status IN ('delivered', 'completed');

-- ============================================================================
-- 4️⃣ التحقق بعد الإصلاح
-- ============================================================================
SELECT
    o.order_number,
    o.status,
    o.total,
    o.subtotal,
    o.platform_commission as "العمولة_المحسوبة",
    p.name_ar as provider,
    COALESCE(p.custom_commission_rate, p.commission_rate, 7.00) as "نسبة_العمولة",
    ROUND(
        ((COALESCE(o.subtotal, o.total, 0) - COALESCE(o.discount, 0)) *
         COALESCE(p.custom_commission_rate, p.commission_rate, 7.00)) / 100,
        2
    ) as "العمولة_المتوقعة"
FROM orders o
LEFT JOIN providers p ON o.provider_id = p.id
ORDER BY o.created_at DESC
LIMIT 10;

-- ============================================================================
-- 5️⃣ إصلاح التسوية إذا كانت خاطئة
-- ============================================================================

-- إذا كنت تريد إعادة التسوية لحالة "pending" بدلاً من "paid"
-- UPDATE settlements
-- SET status = 'pending', paid_at = NULL, payment_method = NULL
-- WHERE id = 'fc5a161e-05e4-48e0-89f2-04e719fbd018';

-- إعادة حساب العمولة في التسوية بناءً على الطلبات
-- UPDATE settlements s
-- SET platform_commission = (
--     SELECT SUM(o.platform_commission)
--     FROM settlement_orders so
--     JOIN orders o ON so.order_id = o.id
--     WHERE so.settlement_id = s.id
-- )
-- WHERE s.id = 'fc5a161e-05e4-48e0-89f2-04e719fbd018';
