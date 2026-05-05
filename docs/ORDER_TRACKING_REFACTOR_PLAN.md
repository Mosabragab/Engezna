# خطة إعادة هيكلة نظام تتبع الطلبات (Order Tracking Refactor)

> فرع التنفيذ: `claude/fix-mobile-login-issue-8913j`
> آخر تحديث: 2026-05-05

## ١. الهدف

تبسيط شريط حالة الطلب لتقليل الخطوات المعروضة للعميل وتوحيد إجراءات التاجر النقدية في زر واحد، **بدون أي تغيير في الـ DB enum** (توافق عكسي كامل مع الطلبات القديمة).

## ٢. التعديلات المطلوبة

| #   | التغيير                                                       | الجهة المتأثرة |
| --- | ------------------------------------------------------------- | -------------- |
| ١   | دمج "تم القبول" + "جاري التحضير" في خطوة واحدة                | عميل + تاجر    |
| ٢   | إخفاء "في الطريق" لطلبات الاستلام (pickup)                    | عميل + تاجر    |
| ٣   | دمج "تم التوصيل" + "استلام المبلغ" في زر واحد للطلبات النقدية | تاجر           |

## ٣. مبادئ التنفيذ

- **DB enum يبقى كما هو** — `accepted`, `out_for_delivery` تظل قيماً صالحة، الطلبات القديمة تُعرض في الخطوة المدموجة.
- **تحديثات atomic** — أي زر يحدّث حقلين أو أكثر يستخدم `.update({...})` واحد بدلاً من نداءين.
- **completion-hook غير متأثر** — يظل يعتمد على `status='delivered' AND payment_status='completed'`.
- **Settlements weekly cron غير متأثر** — يقرأ نفس الشرط أعلاه.
- **النوتيفيكاشن**: إشعار `accepted` يُحذف، يبقى إشعار واحد على بدء التحضير.
- **Prettier + ESLint + TypeScript** يجب أن تمرّ قبل كل commit.

## ٤. المراحل

### Phase A — Shared transitions helper ✅

- ملف جديد: `src/lib/orders/transitions.ts`
- الـ API الفعلي المُصدَّر:
  - `getNextProviderAction(currentStatus, orderType, paymentMethod, paymentStatus)` — يرجع `ProviderOrderAction | null` وصف الخطوة التالية للتاجر (kind, nextStatus, collectsCash, buttonLabelKey)
  - `applyProviderAction(supabase, orderId, currentStatus, action)` — تنفّذ الـ atomic UPDATE: تكتب `status` + الـ timestamp المناسب + `payment_status='completed'` للنقدي عند التسليم. تحرس بـ `.eq('status', currentStatus)` ضد الـ race conditions وترجع stale error عند 0 rows.
  - `getProviderActionLabel(action, locale)` — يرجع نص الزر بالعربية/الإنجليزية
  - `getCustomerTrackerSteps(orderType)` — يرجع مصفوفة خطوات شريط العميل (يحذف `out_for_delivery` لـ pickup)
  - `getCustomerStepIndex(status, steps)` — index الخطوة الحالية (يفلتر non-trackable statuses صراحة)
- لا تكرّر منطق الـ Supabase calls داخل الـ pages — كلها تستهلك `applyProviderAction`.

### Phase B — Provider order page rewire ✅

- `src/app/[locale]/provider/orders/[id]/page.tsx`
- استبدال `NEXT_STATUS` map بالنداء على `getNextProviderAction`.
- إخفاء زر `out_for_delivery` لطلبات pickup.
- استبدال زر "تأكيد استلام المبلغ" المنفصل بدمج ضمن زر "تم التوصيل" للنقدي.
- نفس التعديلات على `/provider/orders/custom/[id]/page.tsx` لو اللوجيك مكرر.

### Phase C — Customer tracking page ✅

- `src/app/[locale]/orders/[id]/page.tsx`
- تحويل `ORDER_STATUSES` لـ function تأخذ `orderType` وترجع المصفوفة المناسبة.
- خطوة `accepted+preparing` تكتمل لما `status ∈ {accepted, preparing}`.
- إخفاء `out_for_delivery` لطلبات pickup.
- `getStatusIndex` يتعامل مع الطلبات القديمة في `accepted`.

### Phase D — Notifications dedup ✅

- البحث عن أي insert في `customer_notifications` على `accepted`.
- حذفه (الإبقاء على إشعار `preparing` فقط).

### Phase E — i18n labels ✅

- إضافة المفاتيح المدموجة في `src/i18n/messages/{ar,en}.json`.

### Phase F — Quality gates ✅

- `npx prettier --check` على الملفات المعدّلة.
- `npx eslint` بدون warnings.
- `npx tsc --noEmit -p tsconfig.build.json` نظيف.

### Phase G — Commit & push ✅

- commit واحد منظّم بشرح كل تغيير.
- push على `claude/fix-mobile-login-issue-8913j`.

## ٥. أماكن مرجعية لا تتعدّل

- `supabase/migrations/*` — لا migration جديدة.
- `src/lib/orders/completion-hook.ts` — لا تغيير.
- `src/app/api/cron/process-completed-orders/route.ts` — لا تغيير.
- `src/lib/admin/orders.ts` filters — تظل تشمل كل القيم القديمة.

## ٦. اختبارات يدوية حرجة بعد النشر

1. طلب `delivery + cash` كامل من إنشاء حتى إيميل التوصيل وفعالية اللويلتي.
2. طلب `pickup + cash` — التأكد من اختفاء "في الطريق" والزر يقول "تسليم للعميل".
3. طلب `delivery + online prepaid` — الزر النهائي "تم التوصيل" بدون استلام مبلغ.
4. طلب قديم في حالة `accepted` — يُعرض في الخطوة المدموجة بدون كسر.
5. الأدمن يفلتر بـ `accepted` ويرجع نتائج الطلبات القديمة.
6. Realtime: تغيير الحالة على جهاز التاجر يظهر فوراً عند العميل.

## ٧. متابعات معروفة (Follow-ups)

- **الـ DB trigger** `notify_order_status_change` (في `20251205000001_fix_notifications_and_reviews.sql`) يستخدم نفس نص "تم توصيل طلبك" على الحالة `delivered` بصرف النظر عن `order_type`. لطلبات الاستلام يفضّل لاحقاً تحديث الـ trigger ليفرّق بين delivered (delivery) و picked-up (pickup). يستلزم migration جديدة فلم يُنفّذ في هذه المرحلة.
- إشعارات `out_for_delivery` لطلبات الاستلام **لن تُنطلق** بطبيعة الحال لأن الحالة لا تظهر في الـ flow الجديد للـ pickup — وهذا السلوك المطلوب.
- **Error handling في handlers صفحة التاجر** (`handleRejectOrder`, `handleAdvanceOrder`, `handleConfirmLegacyPayment`) لا تظهر رسائل خطأ للمستخدم عند فشل عملية Supabase. ده النمط السائد في الملف قبل الـ refactor، وإصلاحه يستلزم اختيار toast pattern وتطبيقه على كل الـ handlers بشكل متّسق — تحسين عام خارج نطاق هذه المرحلة.

## ٨. سجل التنفيذ

| التاريخ    | المرحلة                 | الحالة | الـ commit |
| ---------- | ----------------------- | ------ | ---------- |
| 2026-05-05 | A — transitions helper  | ✅     | —          |
| 2026-05-05 | B — provider page       | ✅     | —          |
| 2026-05-05 | C — customer page       | ✅     | —          |
| 2026-05-05 | D — notifications dedup | ✅     | —          |
| 2026-05-05 | E — i18n                | ✅     | —          |
| 2026-05-05 | F — quality gates       | ✅     | —          |
| 2026-05-05 | G — push                | ✅     | —          |
