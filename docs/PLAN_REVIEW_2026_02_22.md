# مراجعة خطة النشر وتقرير ما قبل النشر

## Plan & Pre-Release Review Report - Coherence Assessment

**تاريخ المراجعة:** 2026-02-22
**الملفات المراجعة:**

- `docs/APP_STORES_RELEASE_ROADMAP.md`
- `docs/PRE_RELEASE_REVIEW_REPORT.md`

**منهجية المراجعة:** تمت مقارنة ما هو مكتوب في الخطة والتقرير مع الكود الفعلي في المشروع للتأكد من تطابق الوثائق مع الواقع.

---

## التقييم العام: الخطة متماسكة

| الجانب            | التقييم  | ملاحظات                                                      |
| ----------------- | -------- | ------------------------------------------------------------ |
| ترتيب المراحل     | ممتاز    | أمان → إشعارات → أداء → native → نشر - ترتيب منطقي وصحيح     |
| تغطية المتطلبات   | ممتاز    | كل متطلبات Google Play و Apple مذكورة بالتفصيل مع أمثلة كود  |
| دقة التوثيق       | جيد جداً | المعلومات مطابقة للكود الفعلي مع استثناءات بسيطة موضحة أدناه |
| الواقعية          | جيد      | بعض المهام ستكون أصعب مما هو مُقدّر (خاصة iOS)               |
| المتابعة والتحديث | ممتاز    | كل مهمة موثقة بتاريخ الإنجاز والتفاصيل التقنية               |
| بروتوكول Supabase | ممتاز    | يمنع الافتراضات الخاطئة حول حالة قاعدة البيانات              |
| مقارنة المتجرين   | ممتاز    | جدول مفصل يوضح الفرق بين متطلبات Google Play و Apple         |

---

## التحقق من المراحل المكتملة (مطابقة الكود)

### المرحلة 0 + 1 + 1.5 (الأمان والإشعارات والإصلاحات الحرجة) ✅

تم التأكد من أن كل المهام المعلمة كمكتملة **موجودة فعلاً في الكود:**

| المهمة المعلمة كمكتملة                  | التحقق من الكود                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| CSRF middleware enforce                 | ✅ `src/middleware.ts:31` - `CSRF_ENFORCE !== 'false'` (enforce by default)            |
| CSP header                              | ✅ `next.config.ts:87` - `Content-Security-Policy` (enforce mode)                      |
| Kashier signature validation إلزامية    | ✅ `src/app/api/payment/kashier/webhook/route.ts:34` - يرفض بـ 403 بدون signature      |
| Idempotency check في webhook            | ✅ `src/app/api/payment/kashier/webhook/route.ts:60-72` - يتحقق من `payment_status`    |
| Refund API endpoint                     | ✅ `src/app/api/payment/kashier/refund/route.ts` (179 سطر)                             |
| Refund webhook handler                  | ✅ `src/app/api/payment/kashier/refund-webhook/route.ts` (173 سطر)                     |
| Cron تنظيف pending_payment              | ✅ `src/app/api/cron/expire-pending-payments/route.ts` (153 سطر)                       |
| console.log إزالة من API routes         | ✅ 0 matches في `src/app/api/` (تم التنظيف بالكامل)                                    |
| pending_payment flow                    | ✅ موجود في 8 ملفات تشمل checkout, payment-result, webhook, cron                       |
| Security lib (CSRF, XSS, rate limiting) | ✅ `src/lib/security/` يحتوي csrf.ts, csrf-client.ts, xss.ts, rate-limit-middleware.ts |
| Edge Functions                          | ✅ `supabase/functions/handle-notification-trigger/` + `send-notification/`            |
| Migrations                              | ✅ 20+ migration files آخرها `20260221000002`                                          |
| logger بدل console.log في API           | ✅ `src/lib/logger/` + استخدامه في كل API routes                                       |

**الخلاصة:** المراحل المكتملة مطابقة للكود. لا يوجد checkmarks وهمية.

---

## مشاكل وملاحظات مكتشفة أثناء المراجعة

### 1. `console.log` في client-side (76 مكان - 12 ملف)

التقرير يذكر "متبقي: بعض console.log في client-side" وهذا صحيح:

| الملف                                                    | عدد المرات | الأولوية |
| -------------------------------------------------------- | ---------- | -------- |
| `src/lib/ai/agentTools.ts`                               | 26         | منخفض    |
| `src/lib/utils/excel-import.ts`                          | 17         | منخفض    |
| `src/lib/ai/agentHandler.ts`                             | 12         | منخفض    |
| `src/hooks/useBadge.ts`                                  | 4          | منخفض    |
| `src/app/sw.ts`                                          | 4          | منخفض    |
| `src/components/customer/support/RefundRequestModal.tsx` | 4          | منخفض    |
| باقي الملفات (6 ملفات)                                   | 9          | منخفض    |

**التوصية:** تنظيف `agentTools.ts` و `agentHandler.ts` على الأقل (38 console.log مجتمعة). ليست حاجزة للنشر لكن تحسينية.

### 2. الملفات الكبيرة - حجم `provider/settings` زاد

| الملف                                         | المذكور في التقرير | الحجم الفعلي | الفرق  |
| --------------------------------------------- | ------------------ | ------------ | ------ |
| `src/lib/ai/agentTools.ts`                    | 3,265              | 3,265        | مطابق  |
| `src/app/[locale]/provider/settings/page.tsx` | 2,583              | 2,909        | +326 ↑ |
| `src/app/[locale]/checkout/page.tsx`          | 2,073              | 2,262        | +189 ↑ |
| `src/app/[locale]/admin/banners/page.tsx`     | 2,209              | 2,209        | مطابق  |
| `src/app/[locale]/provider/finance/page.tsx`  | 1,990              | 1,990        | مطابق  |

**التوصية:** تحديث الأرقام في التقرير. التقسيم ليس حاجزاً للنشر.

### 3. `node_modules` غير موجود

المشروع لا يحتوي على `node_modules/` - يجب تشغيل `npm install` قبل أي بناء أو اختبار.

### 4. `output: 'standalone'` غير مُضاف بعد

مذكور في الخطة كمتطلب للمرحلة 3 ولم يُنفذ. هذا متوقع لأن المرحلة 3 لم تبدأ.

### 5. Capacitor غير مثبت بالكامل

- لا يوجد `@capacitor` في `package.json`
- لا يوجد `capacitor.config.ts`
- لا يوجد مجلدات `android/` أو `ios/`

هذا أيضاً متوقع لأن المرحلة 3 لم تبدأ.

---

## تقييم الاستراتيجية المقترحة

### Hybrid App approach: قرار صحيح ✅

المشروع يعتمد على:

- **39 API route** تحتاج server
- **Middleware** للمصادقة وCSRF
- **ISR** في صفحات المزودين
- **Next.js Image Optimization** يحتاج server
- **Server Actions** في auth

**Static export مستحيل عملياً** بدون إعادة هيكلة كاملة. Hybrid App (Capacitor WebView → Vercel backend) هو الخيار الوحيد المعقول.

### ترتيب الأولويات: صحيح ✅

1. إكمال المرحلة 2 (أداء) → يؤثر على تجربة المستخدم في كلا المتجرين
2. المرحلة 3 (Android) أولاً → أسهل من iOS، يتيح النشر المبكر
3. المرحلة 3B (iOS) بالتوازي → تحتاج وقت أطول بسبب متطلبات Apple

---

## فجوات في الخطة (توصيات إضافية)

### 1. لا يوجد ذكر لـ CI/CD Pipeline

الخطة لا تتضمن إعداد بناء تلقائي للتطبيقات. يُوصى بإضافة:

- GitHub Actions لبناء AAB (Android)
- Codemagic أو Bitrise لبناء IPA (iOS) - يحتاج macOS
- أو على الأقل توثيق خطوات البناء اليدوي

### 2. خطة Rollback غير مذكورة

ماذا يحدث إذا تم اكتشاف مشكلة حرجة بعد النشر على المتجر؟ يُفضل إضافة:

- خطة rollback واضحة
- آلية feature flags للميزات الجديدة
- monitoring alerts بعد النشر

### 3. App Update Strategy

لا يوجد ذكر لكيفية إجبار المستخدمين على التحديث عند وجود تحديث حرج:

- Force Update dialog عند وجود تحديث إلزامي
- Graceful Update prompt عند وجود تحديث اختياري
- Version check endpoint على الـ backend

### 4. iOS: التحدي الأكبر لم يتم التأكيد عليه كفاية

Apple قد ترفض التطبيق لأسباب متعددة. يُوصى بـ:

- **البدء فوراً** بتسجيل Apple Developer Account (يأخذ وقت للتحقق من الهوية)
- تطبيق Sign in with Apple مبكراً (إلزامي لأن المشروع يدعم login اجتماعي)
- إضافة آلية حذف الحساب (إلزامي صارم من Apple §5.1.1)
- تجنب أن يكون التطبيق WebView فقط - إضافة native features كافية

---

## الخلاصة النهائية

**الخطة متماسكة ومبنية باحترافية عالية.** الوثائق دقيقة ومطابقة للكود الفعلي. المراحل المكتملة حقيقية وليست وهمية. الخطة تغطي كل المتطلبات التقنية والتنظيمية لكلا المتجرين.

**التوصية:** المضي قدماً في إكمال المرحلة 2 (الأداء) ثم البدء في المرحلة 3 (Capacitor) مع الأخذ بعين الاعتبار التوصيات الإضافية أعلاه (CI/CD, Rollback, App Update, iOS challenges).

---

## تحديث 2026-02-23: تقدم المرحلة 2 (Lighthouse CI + WCAG AA)

### ما تم تنفيذه

| المهمة                    | التفاصيل                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| إعداد Lighthouse CI       | إنشاء `lighthouserc.js` مع 6 صفحات + `lighthouse.yml` GitHub Actions workflow                                                             |
| إصلاح color-contrast      | WCAG AA compliance على جميع الصفحات (6/6): `/ar`, `/ar/providers`, `/ar/cart`, `/ar/auth/login`, `/ar/custom-order`, `/ar/provider/login` |
| تحسين SEO                 | إضافة metadata لـ auth layout و custom-order layout                                                                                       |
| تحسين Accessibility       | إضافة aria-labels لأزرار password toggle, loading spinners, back buttons                                                                  |
| إضافة `primary-dark`      | لون جديد `hsl(198 100% 34%)` يحقق 4.78:1 contrast ratio مع الأبيض                                                                         |
| WCAG contrast calculation | استبدال حساب luminance البسيط بحساب WCAG 2.1 الرسمي في OffersCarousel                                                                     |
| Dark overlay للبانرات     | إضافة `bg-black/25` overlay لضمان 4.5:1+ contrast للنص الأبيض على أي gradient                                                             |

### الملفات المعدلة (المرحلة 2 - جلسة 2/23)

- `lighthouserc.js` - إعداد Lighthouse CI
- `.github/workflows/lighthouse.yml` - GitHub Actions workflow
- `tailwind.config.ts` - إضافة `primary-dark` color
- `src/components/customer/home/OffersCarousel.tsx` - WCAG contrast + overlay + darker fallback gradients
- `src/components/customer/home/HeroSection.tsx` - contrast fixes
- `src/components/customer/home/CategoriesSection.tsx` - contrast fixes
- `src/components/customer/home/TopRatedSection.tsx` - contrast fixes
- `src/components/customer/home/NearbySection.tsx` - contrast fixes
- `src/components/customer/home/DeliveryModeSelector.tsx` - contrast fixes
- `src/components/customer/home/ReorderSection.tsx` - contrast fixes
- `src/components/customer/layout/BottomNavigation.tsx` - contrast fixes
- `src/components/customer/layout/CustomerHeader.tsx` - contrast fixes
- `src/app/[locale]/auth/login/page.tsx` - contrast + aria-labels + SEO
- `src/app/[locale]/auth/layout.tsx` - SEO metadata
- `src/app/[locale]/custom-order/page.tsx` - contrast + aria-labels
- `src/app/[locale]/custom-order/layout.tsx` - SEO metadata (ملف جديد)
- `src/app/[locale]/provider/login/page.tsx` - contrast + aria-labels

### حالة المرحلة 2 الحالية: ~90%

**مكتمل:** LCP/FCP/CLS optimizations, skeleton loaders, lazy loading, preconnect, image optimization, Lighthouse CI setup, WCAG AA color-contrast, SEO metadata, accessibility fixes

**متبقي:** Performance score target >80 (يحتاج اختبار نهائي), Speed Index optimization (SSR/ISR/streaming), gzip/brotli compression
