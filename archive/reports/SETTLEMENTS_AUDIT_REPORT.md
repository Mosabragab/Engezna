# تقرير المراجعة الشاملة لنظام التسويات - منصة إنجزنا

## Comprehensive Settlement System Audit Report

**تاريخ التقرير:** 26 ديسمبر 2025 (محدّث)
**المُعِد:** مراجعة تقنية شاملة

---

## 📋 الملخص التنفيذي

تم إجراء مراجعة شاملة لنظام التسويات المالية بين منصة "إنجزنا" والتجار. النظام الحالي **سليم من الناحية المعمارية** وتم تطبيق إصلاحات مهمة في جلسة 26 ديسمبر 2025.

### الحالة العامة: ✅ سليم - تم تطبيق الإصلاحات

---

## 🆕 التحديثات الأخيرة (26 ديسمبر 2025)

### ✅ الإصلاحات المُنفذة

#### 1. إصلاح تعارض الـ Triggers

**المشكلة**: العمولة تظهر 22 بدلاً من 17.5 بعد المرتجع
**السبب**: دالة `calculate_order_commission` كانت تعيد حساب العمولة وتتجاهل قيمة `settlement_adjusted`
**الحل**:

```sql
-- قبل الإصلاح (خاطئ)
IF NEW.settlement_adjusted = true AND OLD.settlement_adjusted = true THEN

-- بعد الإصلاح (صحيح)
IF NEW.settlement_adjusted = true THEN
```

#### 2. توحيد مصدر الحقيقة

**المبدأ**: قاعدة البيانات هي المصدر الوحيد للحسابات المالية
**التغييرات**:

- إزالة جميع حسابات العمولة من الواجهة الأمامية
- عرض القيم من قاعدة البيانات مباشرة:
  - `platform_commission` - العمولة الفعلية
  - `original_commission` - العمولة النظرية (لفترة السماح)
  - `cod_commission_owed`, `online_platform_commission` - من جدول التسويات

#### 3. تصميم موحد لكروت COD/Online

**الملفات المحدثة**:

- `src/app/[locale]/admin/settlements/[id]/page.tsx`
- `src/app/[locale]/provider/finance/page.tsx`

**التصميم الجديد**:

- خلفية بيضاء مع حدود ملونة (amber لـ COD, blue لـ Online)
- أيقونة في مربع ملون بالهيدر
- عدد الطلبات تحت العنوان
- مؤشر فترة السماح عند العمولة = 0 والإيرادات > 0
- مربع النتيجة النهائية مع أيقونات الاتجاه

---

---

## 1️⃣ مراجعة منطق السيرفر (Server-Side Reconciliation)

### ✅ نقاط القوة الحالية

#### أ) الـ Trigger الهجين (`calculate_order_commission`)

**الموقع:** `supabase/migrations/20251224220000_fix_commission_excludes_delivery.sql`

```
المعادلة المستخدمة (بعد الإصلاح):
قاعدة العمولة = subtotal - discount  (بدون رسوم التوصيل)
العمولة = قاعدة العمولة × commission_rate / 100

ملاحظة هامة: نسبة المنصة تحسب على صافي الطلب بدون خدمة التوصيل
```

**إصلاح 24 ديسمبر 2025:**

- ✅ تم تصحيح المعادلة لاستبعاد `delivery_fee` من حساب العمولة
- ✅ إذا كان `subtotal` غير موجود، يُحسب: `total - delivery_fee - discount`

**الإيجابيات:**

- ✅ يحسب العمولة على مستوى السيرفر (أمان ضد التلاعب)
- ✅ يتعامل مع الطلبات الملغاة/المرفوضة (يصفّر العمولة)
- ✅ يحترم فترة السماح (Grace Period) بتاريخ الطلب وليس الوقت الحالي
- ✅ يحترم نظام `settlement_adjusted` للمرتجعات
- ✅ يتابع تغيير `provider_id` لإعادة الحساب

#### ب) دالة توليد التسوية (`generate_provider_settlement`)

**الموقع:** `supabase/migrations/20251221000004_fix_refunds_settlements_integration.sql`

**الإيجابيات:**

- ✅ تستبعد الطلبات المعدّلة (`settlement_adjusted = true`)
- ✅ تستخدم `platform_commission` المحسوبة من الطلب مباشرة
- ✅ تمنع تكرار نفس الفترة للمزود الواحد

### ⚠️ نقاط تحتاج تحقق

#### 1. تعارض في حساب `gross_revenue`

**في الـ Admin Dashboard** (`src/app/[locale]/admin/settlements/page.tsx:349-350`):

```typescript
// يحسب من orders.total
const grossRevenue = codGrossRevenue + onlineGrossRevenue;
```

**في الـ Trigger** (`migrations/20251223100000_secure_commission_calculation.sql:132`):

```sql
-- يحسب من subtotal - discount
NEW.platform_commission := ROUND(
    ((COALESCE(NEW.subtotal, NEW.total, 0) - COALESCE(NEW.discount, 0)) * v_commission_rate) / 100
, 2);
```

**⚠️ التوصية:** يجب توحيد الأساس:

- إذا كانت العمولة على `subtotal - discount` → يجب أن يكون `gross_revenue` = `subtotal`
- حالياً Admin يستخدم `total` بينما الـ trigger يستخدم `subtotal - discount`

---

## 2️⃣ معالجة المرتجعات (Refunds)

### ✅ النظام الحالي

**الموقع:** `supabase/migrations/20251221000004_fix_refunds_settlements_integration.sql`

**آلية العمل:**

1. عند تأكيد العميل استلام المبلغ المسترد (`customer_confirmed = true`)
2. يحسب نسبة الاسترداد: `refund_percentage = (refund_amount / order_total) × 100`
3. يخصم العمولة بنفس النسبة:
   - **استرداد كامل:** العمولة = 0
   - **استرداد جزئي:** العمولة الجديدة = العمولة القديمة × (1 - نسبة الاسترداد)

4. يُحفظ في `original_commission` العمولة الأصلية قبل التعديل
5. يُرفع علم `settlement_adjusted = true` لمنع إعادة الحساب

### ✅ نقاط القوة

- تخفيض نسبي للعمولة (ليس تصفيرها بالكامل)
- سجل تدقيق في جدول `settlement_adjustments`
- تحديث التسوية تلقائياً إذا كانت موجودة

### ⚠️ ملاحظة هامة

الطلبات المعدّلة (`settlement_adjusted = true`) تُستبعد من التسويات الجديدة، مما قد يسبب:

- طلبات مرتجعة جزئياً لا تُحسب في التسويات اللاحقة

**التوصية:** إضافة منطق لإدراج الطلبات المعدّلة بقيمتها المعدّلة في التسويات.

---

## 3️⃣ فترة السماح (Grace Period)

### ✅ الوضع الحالي

**الآلية في الـ Trigger:**

```sql
IF v_provider_record.commission_status = 'in_grace_period'
   AND v_provider_record.grace_period_end IS NOT NULL
   AND v_order_date < v_provider_record.grace_period_end THEN
    v_commission_rate := 0;
```

**الإيجابيات:**

- ✅ يقيّم بتاريخ الطلب (`created_at`) وليس الوقت الحالي
- ✅ يحفظ العمولة = 0 في الطلب

### 🔴 المشكلة المُثارة: رؤية العمولة مع تصفيرها

**المتطلب:** التاجر يرى العمولة النظرية ولكن صافي التسوية = كامل الإيرادات

### ✅ الحل المُقترح (موجود جزئياً)

**العمود `original_commission`** موجود بالفعل في `migrations/20251224100000_add_original_commission.sql`

لكنه يُستخدم فقط للمرتجعات. **التوصية:** توسيع استخدامه لفترة السماح.

---

## 4️⃣ تناسق البيانات (Admin vs Provider)

### 📊 مقارنة المعادلات

| البند            | Admin Dashboard                         | Provider Dashboard                      | الحالة    |
| ---------------- | --------------------------------------- | --------------------------------------- | --------- |
| إجمالي الإيرادات | `SUM(orders.total)`                     | `SUM(orders.total)`                     | ✅ متطابق |
| العمولة          | `SUM(orders.platform_commission)`       | `order.platform_commission`             | ✅ متطابق |
| صافي التسوية     | `gross - commission`                    | `net_payout` من settlements             | ⚠️ مختلف  |
| المستحق للمنصة   | `net_amount_due ?? platform_commission` | `net_amount_due ?? platform_commission` | ✅ متطابق |

### ⚠️ تعارضات مكتشفة

1. **Admin** يحسب `codCommissionOwed` من الطلبات مباشرة
2. **Provider Finance** يستخدم `platform_commission` من كل طلب
3. **Settlements Table** تخزّن `cod_commission_owed` مستقلاً

**التوصية:** استخدام مصدر واحد للحقيقة → جدول `settlements` أو حساب موحد.

---

## 5️⃣ استعلامات التدقيق المالي (Audit Queries)

### 📌 استعلام أ: مقارنة العمولات المحسوبة vs المحصّلة

```sql
-- ============================================================================
-- Audit Query A: Commission Comparison - Calculated vs Collected
-- مقارنة العمولات: المحسوبة مقابل المحصّلة
-- ============================================================================

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
        -- الحساب النظري بنسبة 7%
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
    cc.name_ar AS provider_name,
    cc.commission_status,
    cc.total_orders,
    cc.total_revenue,
    cc.stored_commission AS "العمولة المخزنة في الطلبات",
    cc.theoretical_commission_7pct AS "العمولة النظرية (7%)",
    COALESCE(col.settlement_commission, 0) AS "العمولة في التسويات",
    COALESCE(col.total_paid, 0) AS "المحصّل فعلياً",

    -- التباينات
    cc.stored_commission - COALESCE(col.settlement_commission, 0) AS "فرق (طلبات - تسويات)",
    COALESCE(col.settlement_commission, 0) - COALESCE(col.total_paid, 0) AS "فرق (تسويات - محصّل)",

    -- الحالة
    CASE
        WHEN cc.commission_status = 'in_grace_period' AND cc.grace_period_end > NOW()
            THEN 'فترة سماح نشطة'
        WHEN cc.commission_status = 'exempt'
            THEN 'معفى'
        WHEN cc.stored_commission = 0 AND cc.total_orders > 0
            THEN '⚠️ عمولة صفرية مشبوهة'
        WHEN ABS(cc.stored_commission - COALESCE(col.settlement_commission, 0)) > 1
            THEN '⚠️ تباين يحتاج مراجعة'
        ELSE '✅ سليم'
    END AS audit_status

FROM calculated_commissions cc
LEFT JOIN collected_commissions col ON col.provider_id = cc.provider_id
ORDER BY cc.total_revenue DESC;
```

### 📌 استعلام ب: الطلبات المرتجعة غير المحدّثة

```sql
-- ============================================================================
-- Audit Query B: Refunded Orders Not Updated in Settlements
-- طلبات مرتجعة لم تُحدّث قيمة تسويتها
-- ============================================================================

SELECT
    r.id AS refund_id,
    r.order_id,
    o.order_number,
    r.amount AS refund_amount,
    r.refund_type,
    r.status AS refund_status,
    r.customer_confirmed,
    r.customer_confirmed_at,

    -- معلومات الطلب
    o.total AS order_total,
    o.platform_commission AS current_commission,
    o.original_commission,
    o.settlement_adjusted,

    -- معلومات التسوية
    sa.settlement_id,
    s.status AS settlement_status,
    s.period_start,
    s.period_end,

    -- فحص الخلل
    CASE
        WHEN r.status = 'processed' AND r.customer_confirmed = true
             AND o.settlement_adjusted IS NOT TRUE
            THEN '🔴 خلل: مرتجع مؤكد لكن الطلب غير معدّل'
        WHEN r.status = 'processed' AND r.customer_confirmed = true
             AND sa.settlement_id IS NULL
            THEN '🟡 تحذير: لا يوجد سجل تعديل تسوية'
        WHEN r.status = 'processed' AND r.customer_confirmed IS NOT TRUE
            THEN '⏳ بانتظار تأكيد العميل'
        ELSE '✅ سليم'
    END AS issue_status,

    -- المزود
    p.name_ar AS provider_name

FROM refunds r
JOIN orders o ON o.id = r.order_id
JOIN providers p ON p.id = r.provider_id
LEFT JOIN settlement_adjustments sa ON sa.refund_id = r.id
LEFT JOIN settlements s ON s.id = sa.settlement_id
WHERE r.status IN ('approved', 'processed')
ORDER BY
    CASE
        WHEN r.status = 'processed' AND r.customer_confirmed = true
             AND o.settlement_adjusted IS NOT TRUE THEN 1
        ELSE 2
    END,
    r.created_at DESC;
```

### 📌 استعلام ج: كشف حساب لكل تاجر

```sql
-- ============================================================================
-- Audit Query C: Provider Financial Statement
-- كشف حساب شامل لكل تاجر
-- ============================================================================

WITH provider_summary AS (
    SELECT
        p.id AS provider_id,
        p.name_ar,
        p.name_en,
        p.commission_status,
        p.grace_period_end,
        COALESCE(p.custom_commission_rate, p.commission_rate, 7) AS commission_rate,

        -- إجمالي المبيعات (طلبات مُسلّمة)
        (
            SELECT COALESCE(SUM(total), 0)
            FROM orders
            WHERE provider_id = p.id AND status = 'delivered'
        ) AS total_sales,

        -- إجمالي المرتجعات
        (
            SELECT COALESCE(SUM(r.amount), 0)
            FROM refunds r
            JOIN orders o ON o.id = r.order_id
            WHERE o.provider_id = p.id
              AND r.status = 'processed'
              AND r.affects_settlement = true
        ) AS total_refunds,

        -- إجمالي العمولات (من الطلبات)
        (
            SELECT COALESCE(SUM(platform_commission), 0)
            FROM orders
            WHERE provider_id = p.id AND status = 'delivered'
        ) AS total_commission,

        -- عمولة المرتجعات المخصومة
        (
            SELECT COALESCE(SUM(commission_reduction), 0)
            FROM settlement_adjustments sa
            JOIN orders o ON o.id = sa.order_id
            WHERE o.provider_id = p.id
        ) AS refund_commission_reduction,

        -- المدفوع فعلياً
        (
            SELECT COALESCE(SUM(amount_paid), 0)
            FROM settlements
            WHERE provider_id = p.id AND status = 'paid'
        ) AS total_paid,

        -- المعلّق
        (
            SELECT COALESCE(SUM(net_amount_due - COALESCE(amount_paid, 0)), 0)
            FROM settlements
            WHERE provider_id = p.id AND status IN ('pending', 'partially_paid')
        ) AS pending_amount

    FROM providers p
    WHERE p.is_approved = true
)
SELECT
    provider_id,
    name_ar AS "اسم المتجر",
    commission_status AS "حالة العمولة",
    commission_rate || '%' AS "نسبة العمولة",

    -- الأرقام الرئيسية
    total_sales AS "إجمالي المبيعات",
    total_refunds AS "إجمالي المرتجعات",
    (total_sales - total_refunds) AS "صافي المبيعات",

    total_commission AS "إجمالي العمولات",
    refund_commission_reduction AS "عمولة مردودة",
    (total_commission - refund_commission_reduction) AS "صافي العمولات",

    -- الصافي للتاجر
    (total_sales - total_refunds) - (total_commission - refund_commission_reduction) AS "صافي أرباح التاجر",

    -- حالة السداد
    total_paid AS "المدفوع للمنصة",
    pending_amount AS "المستحق المعلّق",

    -- التحقق
    CASE
        WHEN commission_status = 'in_grace_period' AND grace_period_end > NOW()
            THEN '🎁 فترة مجانية'
        WHEN pending_amount > total_commission
            THEN '⚠️ المعلّق أكبر من العمولات!'
        WHEN total_commission = 0 AND total_sales > 0 AND commission_status = 'active'
            THEN '🔴 خلل: لا عمولات رغم المبيعات'
        ELSE '✅ سليم'
    END AS "حالة التدقيق"

FROM provider_summary
WHERE total_sales > 0
ORDER BY total_sales DESC;
```

### 📌 استعلام د: تفصيل COD vs Online

```sql
-- ============================================================================
-- Audit Query D: COD vs Online Payment Breakdown
-- تفصيل الدفع النقدي vs الإلكتروني
-- ============================================================================

SELECT
    p.id AS provider_id,
    p.name_ar,

    -- COD (الدفع عند الاستلام)
    COUNT(CASE WHEN o.payment_method = 'cash' THEN 1 END) AS cod_orders,
    COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total END), 0) AS cod_revenue,
    COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission END), 0) AS cod_commission,
    -- التاجر يدين المنصة بهذا المبلغ
    COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission END), 0) AS "التاجر يدين المنصة (COD)",

    -- Online (الدفع الإلكتروني)
    COUNT(CASE WHEN o.payment_method != 'cash' THEN 1 END) AS online_orders,
    COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.total END), 0) AS online_revenue,
    COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.platform_commission END), 0) AS online_commission,
    -- المنصة تدين التاجر بهذا المبلغ
    COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.total - o.platform_commission END), 0) AS "المنصة تدين التاجر (Online)",

    -- صافي التسوية
    COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.total - o.platform_commission END), 0)
    - COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission END), 0) AS "صافي التسوية",

    -- اتجاه التسوية
    CASE
        WHEN (SUM(CASE WHEN o.payment_method != 'cash' THEN o.total - o.platform_commission ELSE 0 END)
            - SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission ELSE 0 END)) > 0
        THEN '← المنصة تدفع للتاجر'
        WHEN (SUM(CASE WHEN o.payment_method != 'cash' THEN o.total - o.platform_commission ELSE 0 END)
            - SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission ELSE 0 END)) < 0
        THEN '→ التاجر يدفع للمنصة'
        ELSE '= متعادل'
    END AS settlement_direction

FROM providers p
JOIN orders o ON o.provider_id = p.id AND o.status = 'delivered'
GROUP BY p.id, p.name_ar
ORDER BY ABS(
    COALESCE(SUM(CASE WHEN o.payment_method != 'cash' THEN o.total - o.platform_commission END), 0)
    - COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.platform_commission END), 0)
) DESC;
```

---

## 6️⃣ الحل المقترح: إظهار العمولة مع تصفيرها في فترة السماح

### الخيار المُوصى به: استخدام `original_commission`

#### Migration الجديد المقترح:

```sql
-- ============================================================================
-- Migration: Grace Period Commission Visibility
-- إظهار العمولة النظرية مع تصفيرها في التسوية
-- ============================================================================

-- 1. تحديث الـ Trigger لتخزين العمولة النظرية
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
BEGIN
    -- للطلبات الملغاة
    IF NEW.status IN ('cancelled', 'rejected') THEN
        NEW.platform_commission := 0;
        NEW.original_commission := 0;
        RETURN NEW;
    END IF;

    -- تجاوز إذا تم التعديل بواسطة نظام المرتجعات
    IF TG_OP != 'INSERT' AND COALESCE(NEW.settlement_adjusted, false) THEN
        RETURN NEW;
    END IF;

    v_order_date := COALESCE(NEW.created_at, NOW());

    -- جلب بيانات المزود
    SELECT commission_status, grace_period_end, custom_commission_rate, commission_rate
    INTO v_provider_record FROM providers WHERE id = NEW.provider_id;

    -- تحديد النسبة النظرية (بدون فترة السماح)
    IF NOT FOUND THEN
        v_theoretical_rate := v_default_rate;
    ELSIF v_provider_record.custom_commission_rate IS NOT NULL THEN
        v_theoretical_rate := LEAST(v_provider_record.custom_commission_rate, v_default_rate);
    ELSIF v_provider_record.commission_rate IS NOT NULL THEN
        v_theoretical_rate := LEAST(v_provider_record.commission_rate, v_default_rate);
    ELSE
        v_theoretical_rate := v_default_rate;
    END IF;

    -- حساب القاعدة
    v_base_amount := COALESCE(NEW.subtotal, NEW.total, 0) - COALESCE(NEW.discount, 0);

    -- العمولة النظرية (دائماً تُحسب)
    v_theoretical_commission := ROUND((v_base_amount * v_theoretical_rate) / 100, 2);
    NEW.original_commission := GREATEST(v_theoretical_commission, 0);

    -- العمولة الفعلية (مع اعتبار فترة السماح)
    IF v_provider_record.commission_status = 'in_grace_period'
       AND v_provider_record.grace_period_end IS NOT NULL
       AND v_order_date < v_provider_record.grace_period_end THEN
        -- فترة السماح: لا عمولة فعلية
        NEW.platform_commission := 0;
    ELSIF v_provider_record.commission_status = 'exempt' THEN
        -- معفى: لا عمولة فعلية
        NEW.platform_commission := 0;
    ELSE
        -- عادي: العمولة الفعلية = النظرية
        NEW.platform_commission := NEW.original_commission;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### تحديث واجهة التاجر:

في `src/app/[locale]/provider/finance/page.tsx`:

```typescript
// عرض العمولة النظرية للتاجر في فترة السماح
const getDisplayCommission = (order: Order) => {
  // دائماً نعرض original_commission للتاجر
  return order.original_commission ?? order.platform_commission ?? 0;
};

const getActualCommission = (order: Order) => {
  // العمولة الفعلية المخصومة
  return order.platform_commission ?? 0;
};

// في العرض:
<div className="flex justify-between">
  <span>العمولة النظرية:</span>
  <span className="text-slate-500">{formatCurrency(getDisplayCommission(order))}</span>
</div>
{isInGracePeriod && (
  <div className="flex justify-between text-green-600">
    <span>خصم فترة السماح:</span>
    <span>-{formatCurrency(getDisplayCommission(order))}</span>
  </div>
)}
<div className="flex justify-between font-bold">
  <span>العمولة المخصومة فعلياً:</span>
  <span>{formatCurrency(getActualCommission(order))}</span>
</div>
```

---

## 7️⃣ ملخص التوصيات

### 🔴 أولوية عالية (Critical)

1. **توحيد مصدر الحقيقة:** استخدام `orders.platform_commission` كمصدر وحيد
2. **إصلاح الطلبات المعدّلة:** إدراج الطلبات المرتجعة جزئياً في التسويات بقيمتها المعدّلة
3. **تحديث استعلام التسوية:** استخدام `SUM(platform_commission)` بدلاً من الحساب الديناميكي

### 🟡 أولوية متوسطة (High)

4. **تفعيل `original_commission`:** لإظهار العمولة النظرية في فترة السماح
5. **إضافة عمود `grace_period_discount`:** لتوضيح الخصم بشكل صريح
6. **توحيد تسمية الحقول:** `net_amount_due` vs `net_payout`

### 🟢 أولوية منخفضة (Normal)

7. **إضافة View موحد:** لكشف الحساب المتسق بين Admin و Provider
8. **إضافة Scheduled Job:** لتحديث `is_overdue` تلقائياً
9. **توثيق المعادلات:** إضافة comments في الكود

---

## 8️⃣ الخلاصة

النظام الحالي **سليم معمارياً** مع حاجة لـ:

1. توحيد مصادر البيانات
2. تحسين عرض فترة السماح
3. إصلاح التعامل مع المرتجعات الجزئية

---

**تم إعداد هذا التقرير بتاريخ:** 24 ديسمبر 2025
