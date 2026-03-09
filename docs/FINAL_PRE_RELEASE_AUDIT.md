# تقرير التدقيق النهائي قبل الإطلاق — إنجزنا

## Engezna — Final Pre-Release Audit Report

**تاريخ التدقيق:** 2026-03-09
**النسخة:** 0.1.0
**المنصة:** Next.js + Capacitor (Android/iOS)
**المدقق:** Multi-Agent System (Architect + Security + UX Auditor + Code Hygiene)
**الحالة:** يتطلب إصلاحات حرجة قبل الإطلاق

---

## ملخص تنفيذي

| المحور | التقييم | حرج | متوسط | تحسين |
|--------|---------|-----|--------|--------|
| 1. توافق المتاجر | ⚠️ يحتاج إصلاح | 1 | 0 | 3 |
| 2. استقرار العمليات | ⚠️ يحتاج إصلاح | 3 | 6 | 0 |
| 3. البصريات والأداء | ✅ جيد | 1 | 4 | 4 |
| 4. الأمان | ⚠️ يحتاج إصلاح | 3 | 2 | 0 |
| 5. جودة الكود | ✅ جيد | 0 | 5 | 5 |
| **الإجمالي** | | **8** | **17** | **12** |

---

## المحور 1: التوافق مع المتاجر (App Stores Policy)

### حرج

| # | المشكلة | التفاصيل | الملف |
|---|---------|---------|-------|
| S-1 | صلاحيات Android متناقضة مع سياسة الخصوصية | `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION` + `CAMERA` موجودة في AndroidManifest لكن سياسة الخصوصية تنص على: "إنجزنا لا تستخدم تتبع GPS". هذا التناقض سيتسبب في رفض التطبيق | `android/app/src/main/AndroidManifest.xml` |

**الحل المطلوب:** إزالة صلاحيات LOCATION و CAMERA من AndroidManifest إذا لم تكن مستخدمة فعلياً، أو تحديث سياسة الخصوصية لتوضيح الاستخدام.

### تحسين

| # | المشكلة | التفاصيل |
|---|---------|---------|
| S-2 | سياسة الخصوصية مسماة "DRAFT" | الملف في `docs/legal/PRIVACY_POLICY_DRAFT.md` يجب إعادة تسميته بدون DRAFT |
| S-3 | Screenshots غير جاهزة | يجب تحضير لقطات الشاشة لـ iPhone 6.7" و iPad قبل التقديم |
| S-4 | مدة احتفاظ بيانات Sentry غير موثقة | يجب إضافة مدة الاحتفاظ في سياسة الخصوصية |

### ما يعمل بشكل ممتاز ✅

- سياسة خصوصية شاملة ثنائية اللغة مع صفحة مخصصة
- زر "حذف الحساب" مُنفذ بالكامل مع تأكيد وحذف شامل للبيانات
- نظام الدفع (Kashier) متوافق — سلع مادية معفاة من عمولة 30%
- تقييم العمر 4+ مناسب — محتوى نظيف
- بيانات المتجر (Metadata) جاهزة للتقديم لـ Google Play و App Store
- شريط موافقة الكوكيز مع تصنيف 4 أنواع

---

## المحور 2: استقرار العمليات (Order → Payment → Delivery)

### حرج

| # | المشكلة | التفاصيل | الملف |
|---|---------|---------|-------|
| O-1 | زر "إعادة المحاولة" بعد فشل الدفع لا يعمل | يوجه المستخدم لصفحة تفاصيل الطلب بدلاً من إعادته للدفع. الطلب يبقى عالقاً بحالة `cancelled` | `src/app/[locale]/orders/[id]/payment-result/page.tsx:248` |
| O-2 | لا يوجد تحقق من توفر المنتجات عند الدفع | السلة تخزن `is_available` لكن صفحة الدفع لا تعيد التحقق. يمكن إنشاء طلب بمنتجات غير متوفرة | `src/app/[locale]/checkout/page.tsx` |
| O-3 | خطأ غير معالج في تهيئة الدفع | `fetch('/api/payment/kashier/initiate')` — تحليل JSON غير محاط بـ try/catch. فشل صامت عند مشاكل الشبكة | `src/app/[locale]/checkout/page.tsx:1283-1304` |

### متوسط

| # | المشكلة | التفاصيل |
|---|---------|---------|
| O-4 | حالة الدفع غامضة | `PENDING` من Kashier تُخزن كـ `pending` — نفس حالة الطلبات المقبولة. يحتاج حالة `processing` منفصلة |
| O-5 | سباق بين الاستقصاء والـ Webhook | صفحة نتيجة الدفع تستقصي كل 3 ثوانٍ بالتوازي مع الـ Webhook |
| O-6 | السلة قابلة للتعديل أثناء إنشاء الطلب | لا يوجد قفل أثناء عملية الإرسال |
| O-7 | أخطاء التحقق غير مرئية أثناء الـ Hydration | `src/app/[locale]/checkout/page.tsx:1365-1380` |
| O-8 | لا يوجد منع لتكرار العناوين | يمكن حفظ نفس العنوان أكثر من مرة |
| O-9 | الحد الأدنى للطلب بدون حماية سيرفر مستقلة | محمي فقط عبر الـ UI (مقبول مع وجود فحص في الـ checkout) |

### ما يعمل بشكل ممتاز ✅

- إنشاء الطلب ذري عبر `create_order_atomic` RPC مع مفتاح تكرار
- التحقق من توقيع Kashier webhook بـ HMAC-SHA256
- انتهاء صلاحية الدفعات المعلقة بعد 30 دقيقة (Cron Job)
- تتبع الطلبات بالوقت الفعلي مع Supabase Realtime + استقصاء احتياطي
- منع خلط منتجات من متاجر مختلفة في السلة
- حفظ السلة في localStorage عبر Zustand
- تحقق من رقم الهاتف المصري + الاستهداف الجغرافي للأكواد الترويجية
- Error Boundaries عالمية + على مستوى كل مسار مع تكامل Sentry

---

## المحور 3: البصريات والأداء (Visual & Performance)

### حرج

| # | المشكلة | التفاصيل | الملف |
|---|---------|---------|-------|
| V-1 | تسلسل العناوين غير موجود في صفحات رئيسية | صفحة السلة والطلبات بدون `<h1>` — يؤثر على قارئي الشاشة | `src/app/[locale]/cart/page.tsx`, `src/app/[locale]/orders/page.tsx` |

### متوسط

| # | المشكلة | التفاصيل |
|---|---------|---------|
| V-2 | قائمة الإشعارات قد تتجاوز الشاشة | `w-80` (320px) ثابتة — قد تتجاوز الشاشات بعرض 360px |
| V-3 | موضع الإشعارات في الوضع الأفقي | لا يراعي Safe Area الجانبية |
| V-4 | محدد الموقع بدون aria-label | عنصر تفاعلي بدون وصف لقارئ الشاشة |
| V-5 | صفحة السلة بدون loading skeleton | لا يوجد ملف `loading.tsx` — احتمال CLS على الشبكات البطيئة |

### تحسين

| # | المشكلة |
|---|---------|
| V-6 | استخدام CSS logical properties بدلاً من left/right الشرطية |
| V-7 | إضافة aspect-ratio صريح لـ OffersCarousel |
| V-8 | تحسين FCP عبر preload الخطوط + تخزين الصور |
| V-9 | مراجعة اكتمال loading skeleton لصفحة تفاصيل المتجر |

### ما يعمل بشكل ممتاز ✅

- **Safe Areas**: ممتاز — `viewport-fit=cover` مُعد، المتغيرات CSS مُعينة، Header/Footer يحترمان المناطق الآمنة
- **RTL**: ممتاز — `dir="rtl"` على مستوى الجذر، Tailwind logical classes مستخدمة
- **Loading States**: ممتاز — Skeletons موجودة لمعظم الصفحات الرئيسية
- **Image Optimization**: ممتاز — Next.js `<Image>` مستخدم في كل مكان
- **Font Loading**: ممتاز — `next/font` مع `display: swap`
- **Responsive Design**: ممتاز — Tailwind responsive breakpoints
- **Capacitor Integration**: ممتاز — StatusBar و SafeArea و Haptics مدمجة

---

## المحور 4: الأمان (Security Scan)

### حرج

| # | المشكلة | التفاصيل | الملف |
|---|---------|---------|-------|
| X-1 | RLS غير مُفعل على 3 جداول | `approval_requests`, `activity_log`, `support_tickets` — المستخدمون يمكنهم قراءة بيانات الآخرين | `supabase/migrations/20260121000003_phase3_rls_policies.sql` (غير مُطبق) |
| X-2 | ثغرة حرجة في npm | `basic-ftp`: Path traversal (CVSS 9.1) + 6 HIGH severity | تشغيل `npm audit fix` |
| X-3 | التحقق من توقيع Webhook غير آمن | مقارنة نصية بسيطة بدلاً من timing-safe + يرجع `true` إذا لم يُعيَّن `SUPABASE_WEBHOOK_SECRET` | `src/app/api/webhooks/menu-item/route.ts:68` |

### متوسط

| # | المشكلة | التفاصيل |
|---|---------|---------|
| X-4 | مفتاح HERE Maps API عام | `NEXT_PUBLIC_` — يحتاج rate limiting |
| X-5 | CSP يسمح بـ `unsafe-inline` | مطلوب لـ Tailwind CSS — خطر XSS محدود |

### ما يعمل بشكل ممتاز ✅

- إدارة الأسرار: جميع المفاتيح الخاصة محمية ولا تُكشف
- المصادقة: RBAC سليم مع middleware ومزامنة الأدوار
- CSRF: نمط Double Submit Cookie مع مقارنة آمنة زمنياً
- التحقق من المدخلات: مخططات Zod شاملة لجميع مسارات API
- تحديد المعدل: مُنفذ مع Upstash Redis + منع استنزاف البريد الإلكتروني
- أمان الدفع: HMAC-SHA256 للتحقق من توقيع Kashier
- رؤوس الأمان: HSTS, X-Frame-Options, CSP

---

## المحور 5: جودة الكود (Code Hygiene)

### متوسط

| # | المشكلة | التفاصيل |
|---|---------|---------|
| C-1 | 369 عبارة console عبر 118 ملف | معظمها `console.warn`/`console.error` (مقبول)، لكن يحتاج مراجعة لإزالة الـ debug logging |
| C-2 | 137 استخدام لنوع `any` عبر 42 ملف | الأسباب: Capacitor APIs، React Leaflet، أنماط `catch (error: any)` |
| C-3 | 6 تعليقات TODO/FIXME في 4 ملفات | تشمل: ترحيل جدول الإشعارات، بيانات الطلبات في الإحصائيات، استبدال API محاكى |
| C-4 | كود معلق (commented out) | في `PriceHistoryTooltip.tsx` و `quota-check/route.ts` |
| C-5 | ملفات كبيرة تحتاج تقسيم | `agentTools.ts` (3,131 سطر)، `provider/settings/page.tsx` (2,909)، `checkout/page.tsx` (2,443) |

### تحسين

| # | المشكلة |
|---|---------|
| C-6 | تقسيم `agentTools.ts` إلى ملفات أدوات منفصلة |
| C-7 | استخراج `agentPrompt.ts` (1,464 سطر) إلى مجلد config |
| C-8 | إكمال أو إزالة الـ TODOs الستة |
| C-9 | تنظيف الكود المعلق |
| C-10 | مراجعة استخدام `any` في المسارات الحرجة |

### ما يعمل بشكل ممتاز ✅

- 0 عبارات `debugger`
- 0 تعليقات `@ts-ignore` أو `@ts-nocheck`
- 0 ملفات فارغة
- 0 بيانات اختبار في كود الإنتاج
- 0 مفاتيح API مكتوبة في الكود
- TypeScript `strict: true` مُفعل
- Prettier + ESLint + Husky pre-commit hooks مُعدة
- اختبارات أمان موجودة (RBAC, CSRF, XSS)

---

## خطة العمل المُوصى بها

### المرحلة 1: إصلاحات حرجة (قبل الإطلاق) — تقدير: 8-12 ساعة

| الأولوية | # | المهمة | التقدير |
|----------|---|--------|---------|
| P0 | S-1 | إزالة صلاحيات LOCATION/CAMERA من AndroidManifest أو تحديث سياسة الخصوصية | 1 ساعة |
| P0 | O-1 | إصلاح زر "إعادة المحاولة" في صفحة نتيجة الدفع | 1-2 ساعة |
| P0 | O-2 | إضافة تحقق من توفر المنتجات عند الـ Checkout | 2-3 ساعات |
| P0 | O-3 | تغليف تهيئة الدفع بـ try/catch | 30 دقيقة |
| P0 | X-1 | تطبيق migration الـ RLS على 3 جداول | 1 ساعة |
| P0 | X-2 | تشغيل `npm audit fix` | 30 دقيقة |
| P0 | X-3 | إصلاح التحقق من توقيع Webhook (timing-safe + فرض وجود Secret) | 1 ساعة |
| P0 | V-1 | إضافة `<h1>` لصفحات السلة والطلبات | 30 دقيقة |

### المرحلة 2: إصلاحات متوسطة (أول أسبوع بعد الإطلاق)

- إضافة حالة `processing` منفصلة للدفع
- إصلاح عرض قائمة الإشعارات على الشاشات الصغيرة
- إضافة aria-labels للعناصر التفاعلية
- إضافة loading skeleton لصفحة السلة
- مراجعة وإزالة console.log الزائدة
- إكمال أو إزالة TODOs

### المرحلة 3: تحسينات (خلال الشهر الأول)

- تقسيم الملفات الكبيرة (agentTools, settings, checkout)
- ترحيل إلى CSS logical properties
- تحسين FCP وتخزين الصور
- تقليل استخدام نوع `any`

---

## استعلامات Supabase المُقترحة للفحص

> **ملاحظة:** هذه الاستعلامات تحتاج تشغيلها على قاعدة بيانات الإنتاج للتأكد من سلامة البيانات.

### 1. فحص RLS على الجداول الحرجة

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('orders', 'addresses', 'profiles', 'providers',
                  'approval_requests', 'activity_log', 'support_tickets')
ORDER BY tablename;
```

### 2. فحص الطلبات المعلقة بدون دفع

```sql
SELECT id, order_number, status, payment_status, payment_method, created_at
FROM orders
WHERE payment_status = 'pending'
AND payment_method = 'online'
AND created_at < NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 20;
```

### 3. فحص العناوين المكررة

```sql
SELECT user_id, address_line1, governorate_id, city_id, COUNT(*)
FROM addresses
GROUP BY user_id, address_line1, governorate_id, city_id
HAVING COUNT(*) > 1;
```

### 4. فحص الطلبات بدون عنوان توصيل

```sql
SELECT id, order_number, status, order_type, delivery_address
FROM orders
WHERE order_type = 'delivery'
AND (delivery_address IS NULL OR delivery_address = '{}')
LIMIT 20;
```

### 5. فحص سياسات RLS المفقودة

```sql
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       COALESCE(p.polname, 'NO POLICY') AS policy_name
FROM pg_class c
LEFT JOIN pg_policy p ON c.oid = p.polrelid
WHERE c.relnamespace = 'public'::regnamespace
AND c.relkind = 'r'
AND c.relname IN ('approval_requests', 'activity_log', 'support_tickets')
ORDER BY c.relname;
```

---

## الملفات المؤرشفة

تم نقل 15 ملف توثيق قديم إلى `docs/archive/2026-03-pre-release/`.
راجع `docs/archive/2026-03-pre-release/README.md` للقائمة الكاملة.

---

## الخلاصة

المشروع في حالة جيدة بشكل عام مع بنية تحتية قوية (Atomic RPC، RBAC، CSRF، Rate Limiting). هناك **8 مشاكل حرجة** تحتاج إصلاحاً قبل الإطلاق، معظمها إصلاحات سريعة (تقدير إجمالي: 8-12 ساعة). بعد إصلاحها، التطبيق جاهز للنشر على المتاجر.

**لا تبدأ أي إصلاحات إلا بعد مراجعة واعتماد هذا التقرير.**

---

*تم إعداده بواسطة: Multi-Agent System (5 وكلاء متخصصين)*
*التاريخ: 2026-03-09*
