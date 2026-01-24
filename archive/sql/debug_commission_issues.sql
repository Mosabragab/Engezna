-- ============================================================================
-- 🔍 تشخيص مشاكل العمولات والتسويات
-- ============================================================================

-- ============================================================================
-- 1️⃣ الطلبات المعلقة التي لديها عمولة (يجب أن تكون 0)
-- ============================================================================
SELECT
    order_number,
    status,
    total,
    subtotal,
    discount,
    platform_commission,
    payment_method,
    created_at,
    '❌ طلب غير مكتمل بعمولة!' as issue
FROM orders
WHERE status NOT IN ('delivered', 'completed')
AND platform_commission > 0
ORDER BY created_at DESC;

-- ============================================================================
-- 2️⃣ تفاصيل جميع الطلبات مع حساب العمولة المتوقعة
-- ============================================================================
SELECT
    o.order_number,
    o.status,
    o.total,
    o.subtotal,
    o.discount,
    o.platform_commission as "العمولة_الحالية",
    p.commission_rate as "نسبة_المتجر",
    p.custom_commission_rate as "نسبة_مخصصة",
    ROUND(((COALESCE(o.subtotal, 0) - COALESCE(o.discount, 0)) * COALESCE(p.custom_commission_rate, p.commission_rate, 7)) / 100, 2) as "العمولة_المتوقعة",
    CASE
        WHEN o.status NOT IN ('delivered', 'completed') THEN '❌ يجب أن تكون 0'
        WHEN o.platform_commission != ROUND(((COALESCE(o.subtotal, 0) - COALESCE(o.discount, 0)) * COALESCE(p.custom_commission_rate, p.commission_rate, 7)) / 100, 2) THEN '⚠️ فرق في الحساب'
        ELSE '✅ صحيح'
    END as status_check,
    o.created_at
FROM orders o
LEFT JOIN providers p ON o.provider_id = p.id
ORDER BY o.created_at DESC
LIMIT 20;

-- ============================================================================
-- 3️⃣ التسويات وتفاصيل الدفع - من أكد الدفع؟
-- ============================================================================
SELECT
    s.id,
    s.status,
    s.total_orders,
    s.gross_revenue,
    s.platform_commission,
    s.amount_paid,
    s.payment_method,
    s.payment_date,
    s.payment_reference,
    s.paid_by,
    paid_by_profile.full_name as "تم_الدفع_بواسطة",
    s.created_at,
    s.updated_at
FROM settlements s
LEFT JOIN profiles paid_by_profile ON s.paid_by = paid_by_profile.id
ORDER BY s.created_at DESC;

-- ============================================================================
-- 4️⃣ هل هناك trigger يحدث التسويات تلقائياً؟
-- ============================================================================
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('orders', 'settlements', 'payments')
ORDER BY event_object_table;

-- ============================================================================
-- 5️⃣ الطلبات في هذه التسوية بالتحديد
-- ============================================================================
SELECT
    o.order_number,
    o.status,
    o.total,
    o.subtotal,
    o.platform_commission,
    o.payment_method,
    o.created_at,
    CASE
        WHEN o.status = 'delivered' THEN '✅ مكتمل'
        WHEN o.status = 'pending' THEN '❌ معلق - لا يجب احتسابه'
        ELSE '⚠️ ' || o.status
    END as order_status_check
FROM settlement_orders so
JOIN orders o ON so.order_id = o.id
WHERE so.settlement_id = 'fc5a161e-05e4-48e0-89f2-04e719fbd018'
ORDER BY o.created_at;

-- ============================================================================
-- 6️⃣ فحص إعدادات المتجر (مطعم الصفا)
-- ============================================================================
SELECT
    id,
    name_ar,
    commission_rate,
    custom_commission_rate,
    commission_status,
    grace_period_start,
    grace_period_end,
    is_active
FROM providers
WHERE name_ar LIKE '%الصفا%' OR name_en LIKE '%Safa%';

-- ============================================================================
-- 7️⃣ سجل التغييرات على التسويات (إذا كان موجود)
-- ============================================================================
SELECT * FROM settlement_payments
WHERE settlement_id = 'fc5a161e-05e4-48e0-89f2-04e719fbd018'
ORDER BY created_at DESC;

-- ============================================================================
-- 8️⃣ إصلاح فوري: تصفير العمولة للطلبات غير المكتملة
-- ============================================================================
-- UPDATE orders
-- SET platform_commission = 0
-- WHERE status NOT IN ('delivered', 'completed')
-- AND platform_commission > 0;

-- ============================================================================
-- 9️⃣ التحقق من وجود subtotal vs total
-- ============================================================================
SELECT
    order_number,
    status,
    total,
    subtotal,
    delivery_fee,
    discount,
    platform_commission,
    CASE
        WHEN subtotal IS NULL THEN '❌ subtotal فارغ - يستخدم total'
        WHEN subtotal = 0 THEN '❌ subtotal = 0'
        ELSE '✅ subtotal موجود: ' || subtotal::text
    END as subtotal_check
FROM orders
ORDER BY created_at DESC
LIMIT 20;
