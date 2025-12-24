-- ============================================================================
-- SETTLEMENT AUDIT QUERIES - استعلامات التدقيق المالي
-- ============================================================================
-- Run these queries in Supabase SQL Editor to audit financial data
-- يمكن تشغيل هذه الاستعلامات في Supabase SQL Editor للتدقيق المالي
-- ============================================================================

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ QUERY A: Commission Comparison - Calculated vs Collected                   ║
-- ║ استعلام أ: مقارنة العمولات المحسوبة مقابل المحصّلة                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

WITH calculated_commissions AS (
    SELECT
        p.id AS provider_id,
        p.name_ar,
        p.commission_status,
        p.grace_period_end,
        COUNT(o.id) AS total_orders,
        SUM(o.total) AS total_revenue,
        SUM(o.subtotal - COALESCE(o.discount, 0)) AS commission_base,
        SUM(COALESCE(o.platform_commission, 0)) AS stored_commission,
        ROUND(SUM(o.subtotal - COALESCE(o.discount, 0)) * 0.07, 2) AS theoretical_commission_7pct
    FROM providers p
    LEFT JOIN orders o ON o.provider_id = p.id AND o.status = 'delivered'
    GROUP BY p.id, p.name_ar, p.commission_status, p.grace_period_end
),
collected_commissions AS (
    SELECT
        provider_id,
        SUM(platform_commission) AS settlement_commission,
        SUM(amount_paid) AS total_paid
    FROM settlements
    WHERE status = 'paid'
    GROUP BY provider_id
)
SELECT
    cc.provider_id,
    cc.name_ar AS "اسم المتجر",
    cc.commission_status AS "حالة العمولة",
    cc.total_orders AS "عدد الطلبات",
    cc.total_revenue AS "إجمالي الإيرادات",
    cc.stored_commission AS "العمولة المخزنة",
    cc.theoretical_commission_7pct AS "العمولة النظرية (7%)",
    COALESCE(col.settlement_commission, 0) AS "العمولة في التسويات",
    COALESCE(col.total_paid, 0) AS "المحصّل فعلياً",
    cc.stored_commission - COALESCE(col.settlement_commission, 0) AS "فرق (طلبات - تسويات)",
    CASE
        WHEN cc.commission_status = 'in_grace_period' AND cc.grace_period_end > NOW()
            THEN '🎁 فترة سماح'
        WHEN cc.commission_status = 'exempt'
            THEN '🔓 معفى'
        WHEN cc.stored_commission = 0 AND cc.total_orders > 0
            THEN '⚠️ عمولة صفرية'
        WHEN ABS(cc.stored_commission - COALESCE(col.settlement_commission, 0)) > 1
            THEN '⚠️ تباين'
        ELSE '✅ سليم'
    END AS "حالة التدقيق"
FROM calculated_commissions cc
LEFT JOIN collected_commissions col ON col.provider_id = cc.provider_id
WHERE cc.total_orders > 0
ORDER BY cc.total_revenue DESC;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ QUERY B: Refunded Orders Not Updated                                       ║
-- ║ استعلام ب: الطلبات المرتجعة التي لم تُحدّث تسويتها                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT
    r.id AS refund_id,
    o.order_number AS "رقم الطلب",
    r.amount AS "مبلغ الاسترداد",
    r.refund_type AS "نوع الاسترداد",
    r.status AS "حالة الاسترداد",
    r.customer_confirmed AS "تأكيد العميل",
    o.total AS "إجمالي الطلب",
    o.platform_commission AS "العمولة الحالية",
    o.original_commission AS "العمولة الأصلية",
    o.settlement_adjusted AS "تم تعديل التسوية",
    p.name_ar AS "المتجر",
    CASE
        WHEN r.status = 'processed' AND r.customer_confirmed = true
             AND o.settlement_adjusted IS NOT TRUE
            THEN '🔴 خلل: مرتجع مؤكد لكن الطلب غير معدّل'
        WHEN r.status = 'processed' AND r.customer_confirmed = true
             AND NOT EXISTS (SELECT 1 FROM settlement_adjustments WHERE refund_id = r.id)
            THEN '🟡 تحذير: لا يوجد سجل تعديل'
        WHEN r.status = 'processed' AND r.customer_confirmed IS NOT TRUE
            THEN '⏳ بانتظار تأكيد العميل'
        WHEN r.status = 'approved'
            THEN '📋 بانتظار المعالجة'
        ELSE '✅ سليم'
    END AS "حالة التدقيق"
FROM refunds r
JOIN orders o ON o.id = r.order_id
JOIN providers p ON p.id = r.provider_id
WHERE r.status IN ('approved', 'processed')
ORDER BY
    CASE
        WHEN r.status = 'processed' AND r.customer_confirmed = true
             AND o.settlement_adjusted IS NOT TRUE THEN 1
        WHEN r.status = 'processed' AND r.customer_confirmed = true THEN 2
        ELSE 3
    END,
    r.created_at DESC;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ QUERY C: Provider Financial Statement                                      ║
-- ║ استعلام ج: كشف حساب شامل لكل تاجر                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

WITH provider_summary AS (
    SELECT
        p.id AS provider_id,
        p.name_ar,
        p.name_en,
        p.commission_status,
        p.grace_period_end,
        COALESCE(p.custom_commission_rate, p.commission_rate, 7) AS commission_rate,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE provider_id = p.id AND status = 'delivered') AS total_sales,
        (SELECT COALESCE(SUM(r.amount), 0)
         FROM refunds r JOIN orders o ON o.id = r.order_id
         WHERE o.provider_id = p.id AND r.status = 'processed' AND r.affects_settlement = true) AS total_refunds,
        (SELECT COALESCE(SUM(platform_commission), 0) FROM orders WHERE provider_id = p.id AND status = 'delivered') AS total_commission,
        (SELECT COALESCE(SUM(commission_reduction), 0)
         FROM settlement_adjustments sa JOIN orders o ON o.id = sa.order_id
         WHERE o.provider_id = p.id) AS refund_commission_reduction,
        (SELECT COALESCE(SUM(amount_paid), 0) FROM settlements WHERE provider_id = p.id AND status = 'paid') AS total_paid,
        (SELECT COALESCE(SUM(net_amount_due - COALESCE(amount_paid, 0)), 0)
         FROM settlements WHERE provider_id = p.id AND status IN ('pending', 'partially_paid')) AS pending_amount
    FROM providers p
    WHERE p.is_approved = true
)
SELECT
    provider_id,
    name_ar AS "اسم المتجر",
    commission_status AS "حالة العمولة",
    commission_rate || '%' AS "نسبة العمولة",
    total_sales AS "إجمالي المبيعات",
    total_refunds AS "إجمالي المرتجعات",
    (total_sales - total_refunds) AS "صافي المبيعات",
    total_commission AS "إجمالي العمولات",
    refund_commission_reduction AS "عمولة مردودة",
    (total_commission - refund_commission_reduction) AS "صافي العمولات",
    (total_sales - total_refunds) - (total_commission - refund_commission_reduction) AS "صافي أرباح التاجر",
    total_paid AS "المدفوع للمنصة",
    pending_amount AS "المستحق المعلّق",
    CASE
        WHEN commission_status = 'in_grace_period' AND grace_period_end > NOW() THEN '🎁 فترة مجانية'
        WHEN pending_amount > total_commission THEN '⚠️ المعلّق أكبر من العمولات'
        WHEN total_commission = 0 AND total_sales > 0 AND commission_status = 'active' THEN '🔴 خلل'
        ELSE '✅ سليم'
    END AS "حالة التدقيق"
FROM provider_summary
WHERE total_sales > 0
ORDER BY total_sales DESC;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ QUERY D: COD vs Online Payment Breakdown                                   ║
-- ║ استعلام د: تفصيل الدفع النقدي vs الإلكتروني                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT
    p.id AS provider_id,
    p.name_ar AS "المتجر",

    -- COD
    COUNT(CASE WHEN o.payment_method = 'cash' THEN 1 END) AS "طلبات COD",
    COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total END), 0) AS "إيرادات COD",
    COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission END), 0) AS "عمولة COD",

    -- Online
    COUNT(CASE WHEN o.payment_method != 'cash' THEN 1 END) AS "طلبات Online",
    COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.total END), 0) AS "إيرادات Online",
    COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.platform_commission END), 0) AS "عمولة Online",

    -- Net Settlement
    COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.total - o.platform_commission END), 0)
    - COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission END), 0) AS "صافي التسوية",

    CASE
        WHEN (SUM(CASE WHEN o.payment_method != 'cash' THEN o.total - o.platform_commission ELSE 0 END)
            - SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission ELSE 0 END)) > 0
        THEN '← المنصة تدفع للتاجر'
        WHEN (SUM(CASE WHEN o.payment_method != 'cash' THEN o.total - o.platform_commission ELSE 0 END)
            - SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission ELSE 0 END)) < 0
        THEN '→ التاجر يدفع للمنصة'
        ELSE '= متعادل'
    END AS "اتجاه التسوية"

FROM providers p
JOIN orders o ON o.provider_id = p.id AND o.status = 'delivered'
GROUP BY p.id, p.name_ar
HAVING COUNT(o.id) > 0
ORDER BY ABS(
    COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.total - o.platform_commission END), 0)
    - COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission END), 0)
) DESC;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ QUERY E: Settlement Integrity Check                                        ║
-- ║ استعلام هـ: فحص سلامة التسويات                                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT
    s.id AS settlement_id,
    p.name_ar AS "المتجر",
    s.period_start AS "بداية الفترة",
    s.period_end AS "نهاية الفترة",
    s.total_orders AS "عدد الطلبات في التسوية",
    s.gross_revenue AS "إيرادات التسوية",
    s.platform_commission AS "عمولة التسوية",
    s.status AS "الحالة",

    -- الحساب من الطلبات الفعلية
    (SELECT COUNT(*) FROM orders
     WHERE provider_id = s.provider_id
       AND status = 'delivered'
       AND created_at >= s.period_start
       AND created_at <= s.period_end) AS "طلبات فعلية في الفترة",

    (SELECT COALESCE(SUM(total), 0) FROM orders
     WHERE provider_id = s.provider_id
       AND status = 'delivered'
       AND created_at >= s.period_start
       AND created_at <= s.period_end) AS "إيرادات فعلية",

    (SELECT COALESCE(SUM(platform_commission), 0) FROM orders
     WHERE provider_id = s.provider_id
       AND status = 'delivered'
       AND created_at >= s.period_start
       AND created_at <= s.period_end) AS "عمولة فعلية",

    -- فحص التباين
    CASE
        WHEN s.total_orders != (SELECT COUNT(*) FROM orders
             WHERE provider_id = s.provider_id AND status = 'delivered'
               AND created_at >= s.period_start AND created_at <= s.period_end)
            THEN '⚠️ تباين في عدد الطلبات'
        WHEN ABS(s.platform_commission - (SELECT COALESCE(SUM(platform_commission), 0) FROM orders
             WHERE provider_id = s.provider_id AND status = 'delivered'
               AND created_at >= s.period_start AND created_at <= s.period_end)) > 1
            THEN '⚠️ تباين في العمولة'
        ELSE '✅ متسق'
    END AS "حالة التسوية"

FROM settlements s
JOIN providers p ON p.id = s.provider_id
ORDER BY s.created_at DESC
LIMIT 50;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ QUERY F: Grace Period Providers                                            ║
-- ║ استعلام و: المزودين في فترة السماح                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT
    p.id,
    p.name_ar AS "المتجر",
    p.commission_status AS "الحالة",
    p.grace_period_start AS "بداية فترة السماح",
    p.grace_period_end AS "نهاية فترة السماح",
    CASE
        WHEN p.grace_period_end > NOW()
            THEN (p.grace_period_end::date - CURRENT_DATE) || ' يوم متبقي'
        ELSE 'انتهت'
    END AS "الأيام المتبقية",
    p.custom_commission_rate AS "نسبة مخصصة",
    p.commission_rate AS "نسبة عادية",

    -- الطلبات خلال فترة السماح
    (SELECT COUNT(*) FROM orders
     WHERE provider_id = p.id
       AND status = 'delivered'
       AND created_at BETWEEN p.grace_period_start AND p.grace_period_end) AS "طلبات في فترة السماح",

    -- العمولة المُعفاة (النظرية التي لم تُحصّل)
    (SELECT COALESCE(SUM(original_commission - platform_commission), 0) FROM orders
     WHERE provider_id = p.id
       AND status = 'delivered'
       AND created_at BETWEEN p.grace_period_start AND p.grace_period_end) AS "العمولة المُعفاة"

FROM providers p
WHERE p.commission_status = 'in_grace_period'
   OR p.grace_period_end > NOW() - INTERVAL '30 days'
ORDER BY p.grace_period_end DESC;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ QUERY G: Daily Commission Summary                                          ║
-- ║ استعلام ز: ملخص العمولات اليومية                                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT
    DATE(o.created_at) AS "التاريخ",
    COUNT(o.id) AS "عدد الطلبات",
    SUM(o.total) AS "إجمالي المبيعات",
    SUM(o.platform_commission) AS "إجمالي العمولات",
    ROUND(SUM(o.platform_commission) / NULLIF(SUM(o.total), 0) * 100, 2) || '%' AS "نسبة العمولة الفعلية",

    -- تفصيل طرق الدفع
    SUM(CASE WHEN o.payment_method = 'cash' THEN o.total ELSE 0 END) AS "مبيعات COD",
    SUM(CASE WHEN o.payment_method != 'cash' THEN o.total ELSE 0 END) AS "مبيعات Online"

FROM orders o
WHERE o.status = 'delivered'
  AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(o.created_at)
ORDER BY DATE(o.created_at) DESC;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ END OF AUDIT QUERIES                                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
