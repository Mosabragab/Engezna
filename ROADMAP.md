# Roadmap - Engezna Platform

## آخر تحديث: 2026-02-13

## حالة المشروع: MVP مكتمل 100% - جاري التجهيز لـ Google Play

---

## ملخص المراحل

| المرحلة                                    | الحالة     | التقدم |
| ------------------------------------------ | ---------- | ------ |
| المرحلة 0: إصلاحات أمنية عاجلة             | ✅ مكتمل   | 100%   |
| المرحلة 1: نظام الإشعارات والأصوات         | ✅ مكتمل   | 100%   |
| المرحلة 1.5: إصلاحات حرجة من المراجعة      | 🔄 جاري    | 85%    |
| المرحلة 2: تحسين الأداء (Lighthouse)       | ⬜ لم يبدأ | 0%     |
| المرحلة 3: إعداد Capacitor + Android Build | ⬜ لم يبدأ | 0%     |
| المرحلة 4: تجهيز Google Play Store Listing | ⬜ لم يبدأ | 0%     |
| المرحلة 5: الاختبار والمراجعة النهائية     | ⬜ لم يبدأ | 0%     |
| المرحلة 6: النشر على Google Play           | ⬜ لم يبدأ | 0%     |

---

## 🔴 المطلوب الآن: إكمال المرحلة 1.5 (متبقي 7 مهام)

### مهام تحتاج تنفيذ المالك (Supabase Dashboard + Vercel):

| #   | المهمة                                                           | النوع         |
| --- | ---------------------------------------------------------------- | ------------- |
| 1   | عمل Rotate للـ Service Role Key من Supabase Dashboard            | Supabase      |
| 2   | تحديث المفتاح الجديد في Vercel + GitHub Secrets + كل البيئات     | Vercel/GitHub |
| 3   | التأكد أن triggers الآمنة (`on_*`) تغطي كل الحالات               | Supabase SQL  |
| 4   | حذف Database Webhooks القديمة من Supabase Dashboard لمنع التكرار | Supabase      |

### مهام تحتاج تنفيذ كود:

| #   | المهمة                                                  | الأولوية |
| --- | ------------------------------------------------------- | -------- |
| 5   | إضافة webhook handler لتأكيد الاسترجاع من Kashier       | متوسط    |
| 6   | تحويل CSRF من log-only لـ enforce (`CSRF_ENFORCE=true`) | متوسط    |
| 7   | تحويل CSP من report-only لـ enforce بعد اختبار التوافق  | متوسط    |

---

## الخطوات الجاية بالترتيب

### الخطوة 1: إكمال المرحلة 1.5 (يوم واحد)

- تنفيذ الـ 4 مهام اللي محتاجة المالك (rotate key, update envs, verify triggers, delete webhooks)
- تحويل CSRF و CSP لـ enforce mode

### الخطوة 2: المرحلة 2 - تحسين الأداء (2-3 أيام)

- تحسين LCP من 7.9s لأقل من 2.5s
- ضغط البانر الرئيسي (938KB → < 200KB)
- إصلاح CLS و FCP
- تحويل الصور لـ WebP/AVIF
- إضافة Skeleton Loaders
- الهدف: Lighthouse Performance > 80

### الخطوة 3: المرحلة 3 - Capacitor + Android (2-3 أيام)

- تثبيت وإعداد Capacitor
- إعداد Android project + native plugins
- إعداد `google-services.json` من Firebase
- اختبار على emulator وجهاز حقيقي
- بناء Release AAB

### الخطوة 4: المرحلة 4 - Google Play Store Listing (1-2 يوم)

- تسجيل حساب Google Play Developer ($25)
- تصميم Feature Graphic + Screenshots (PNG)
- كتابة وصف المتجر (عربي/إنجليزي)
- ملء Content Rating + Data Safety Form

### الخطوة 5: المرحلة 5 - الاختبار النهائي (2-3 أيام)

- تشغيل جميع Tests (Unit + Security + E2E)
- اختبار يدوي لكل flow
- Lighthouse audit نهائي
- مراجعة أمنية نهائية

### الخطوة 6: المرحلة 6 - النشر (1-3 أيام)

- Internal Testing → Closed Testing → Production
- Staged Rollout: 10% → 25% → 50% → 100%

---

## ما تم إنجازه حديثاً (فبراير 2026)

### المرحلة 0: إصلاحات أمنية ✅ (2/8)

- [x] نقل Firebase credentials لـ dynamic injection
- [x] تحديث jspdf v4.1.0 (ثغرة حرجة)
- [x] تعطيل test account auto-confirmation في production
- [x] التأكد من RBAC middleware على كل المسارات

### المرحلة 1: نظام الإشعارات ✅ (2/8 - 2/9)

- [x] Audio Manager مركزي (singleton) مع vibration fallback
- [x] إشعارات مقدمي الخدمات (طلب جديد، رسالة، تقييم، استرجاع، شكوى)
- [x] إشعارات العملاء (حالة الطلب، رسالة، تسعير مخصص، تذكرة دعم)
- [x] صفحة إعدادات الإشعارات (عميل + مزود + أدمن)
- [x] صفحة إشعارات الأدمن `/admin/notifications`
- [x] إصلاح صوت إشعارات حالة الطلب للعميل
- [x] إصلاح نظام الطلبات الخاصة (auto-archive, RLS, أصناف, إشعارات)
- [x] تناسق تصميم كروت الطلبات الخاصة مع العادية

### المرحلة 1.5: إصلاحات حرجة 🔄 (2/12 - 2/13)

- [x] حذف 7 triggers تحتوي Service Role JWT مكشوف (2/13)
- [x] إصلاح Phantom Orders - إنشاء الطلب قبل التوجيه لـ Kashier (2/13)
- [x] إنشاء Kashier Refund API endpoint (2/13)
- [x] إضافة webhook idempotency + unique constraint (2/13)
- [x] تفعيل CSRF protection في middleware (log-only) (2/13)
- [x] إزالة console.log واستبداله بـ structured logger (36 ملف) (2/13)
- [x] إلزام Kashier webhook signature (2/13)
- [x] إصلاح promo validation identity spoofing (2/13)
- [x] إضافة CSP header (report-only) (2/13)
- [x] تضييق RLS policies على profiles, promo_codes, provider_invitations (2/13)
- [x] cron job لتنظيف الطلبات المعلقة بالدفع (pg_cron) (2/13)
- [x] إصلاح Kashier credentials validation (throw بدل fallback) (2/13)
- [x] نقل cron من Vercel لـ Supabase pg_cron (2/13)
- [ ] عمل Rotate للـ Service Role Key ← **محتاج المالك**
- [ ] تحديث المفتاح في كل البيئات ← **محتاج المالك**
- [ ] حذف Database Webhooks القديمة ← **محتاج المالك**
- [ ] تحويل CSRF و CSP لـ enforce mode

### إصلاحات إضافية (2/10 - 2/11)

- [x] نظام البانرات والعروض الترويجية (11 تحسين)
- [x] إصلاح فلترة المتاجر حسب الموقع الجغرافي
- [x] تحميل فئات الأكواد الترويجية ديناميكياً
- [x] صفحة إدارة منتجات المتاجر للأدمن
- [x] إضافة بيانات بنكية للمنصة والمزودين
- [x] إصلاح 9 مشاكل في إدارة المزودين (P0-P2)
- [x] إصلاح toggle switches في إعدادات الإشعارات RTL

---

## High Priority (Before Launch)

### 1. Payment Integration (Kashier) ✅

- [x] Kashier account setup and API credentials
- [x] Integrate Kashier Egyptian payment gateway
- [x] Online payment support for customers
- [x] Payment status webhooks
- [x] Payment result page
- [x] Webhook signature enforcement
- [x] Webhook idempotency (duplicate protection)
- [x] Phantom Orders fix (create before redirect)
- [x] Refund API endpoint
- [x] Pending payment timeout (pg_cron)
- [ ] Account activation (pending Kashier approval)

### 2. App Store Preparation ⬜

- [ ] Generate app screenshots (PNG format - Arabic/English)
- [ ] Write app store descriptions
- [ ] Complete Data Safety Form
- [x] Privacy Policy URL in manifest
- [ ] Test PWA installation on Android/iOS
- [ ] Design Feature Graphic (1024x500 px)
- [ ] Capacitor setup + Android build

### 3. Testing & QA ⬜

- [ ] Run existing E2E tests (Playwright)
- [ ] End-to-end user journey testing
- [ ] Payment flow testing
- [ ] Performance testing (Lighthouse > 80)
- [ ] Security tests

---

## Medium Priority

### 4. Push Notifications (Firebase) 🔄

- [x] Firebase Cloud Messaging setup
- [x] Service worker integration (dynamic)
- [x] Notification preferences UI
- [x] Audio Manager with fallback
- [x] Database triggers for all events
- [ ] نشر Edge Functions على Supabase
- [ ] إعداد `FIREBASE_SERVICE_ACCOUNT` كـ Supabase Secret
- [ ] اختبار FCM الدورة الكاملة: trigger → Edge Function → FCM → device

### 5. Admin Promo Code UI ✅

- [x] Promo code creation form
- [x] Manage existing promo codes
- [x] Track usage statistics
- [x] Expiration and usage limits
- [x] Dynamic category loading

### 6. Refund Handling ✅

- [x] Refund request workflow
- [x] Admin approval process
- [x] Kashier Refund API endpoint
- [x] Refund notifications
- [ ] Kashier refund webhook handler (تأكيد الاسترجاع)

### 7. SMS Notifications ⬜

- [ ] Twilio or local provider setup
- [ ] Order status SMS notifications
- [ ] OTP verification via SMS

---

## Low Priority (Post-Launch)

### 8. Advanced Analytics

- [ ] Time-series revenue/orders charts
- [ ] Performance metrics and trends
- [ ] Customer retention analytics

### 9. Banner System Enhancements ✅ (أساسي)

- [x] Banner management (CRUD)
- [x] Banner analytics (impressions, clicks)
- [x] Geo-targeted banners
- [ ] Video banner support
- [ ] A/B testing for banners

### 10. AI Assistant Improvements

- [ ] Claude 4.5 Haiku migration
- [ ] Improved product context tracking
- [ ] Multi-store support
- [ ] ملاحظة: المساعد معطل مؤقتاً (`NEXT_PUBLIC_AI_ASSISTANT_ENABLED=false`)

### 11. Code Quality (Post-Launch)

- [ ] تقسيم الملفات الكبيرة (8 ملفات > 2000 سطر)
- [ ] إكمال Repository Pattern migration
- [ ] Supabase client singleton pattern

---

## Non-Technical Tasks (Before Launch)

- [ ] Restaurant onboarding (10 partners minimum)
- [ ] Marketing materials preparation
- [ ] Customer support training
- [x] Security audit (مراجعة عميقة 2/12 + إصلاحات 2/13)
- [x] Legal review (Terms & Privacy done)
- [ ] Google Play Developer account ($25)

---

## Completed Features

### Customer Side

- [x] Registration & authentication (Email + Google Native OAuth)
- [x] Provider browsing and search
- [x] Shopping cart and checkout
- [x] Order tracking and history
- [x] Favorites system
- [x] Real-time notifications (Realtime + polling fallback)
- [x] In-app chat with provider (read receipts ✓/✓✓)
- [x] Product variants (size/weight)
- [x] Guest browsing (localStorage location)
- [x] Welcome/Landing page
- [x] PWA support (100/100 score)
- [x] Legal pages (Privacy, Terms)
- [x] Custom orders (triple broadcast)
- [x] Notification preferences
- [x] Refund requests

### Provider Side

- [x] Registration & approval flow
- [x] Dashboard with statistics
- [x] Order management (accept/reject/status updates)
- [x] Product management (CRUD)
- [x] Excel menu import
- [x] 4 pricing types (fixed, per_unit, variants, weight_variants)
- [x] Product variants
- [x] Provider categories
- [x] Finance page (COD/Online)
- [x] Real-time notifications
- [x] In-app chat
- [x] Delete account functionality
- [x] Notification preferences
- [x] Custom order cards (consistent design)
- [x] Bank details

### Admin Side

- [x] Dashboard and analytics
- [x] Provider approval system
- [x] Settlements management (COD/Online + auto-settlements)
- [x] Customer management (ban/unban)
- [x] Order management
- [x] Sidebar state persistence
- [x] Admin notifications page
- [x] Promo code management
- [x] Banner & promotions system
- [x] Products management page
- [x] Locations management (geo-targeting)
- [x] Refund management
- [x] Bank details for platform

### Security & Infrastructure

- [x] Upstash Redis rate limiting
- [x] XSS protection in exports
- [x] Zod validation on API routes
- [x] Error boundaries (global + locale + admin + provider)
- [x] SEO (robots.ts, sitemap.ts, generateMetadata)
- [x] Sentry error monitoring
- [x] Vercel Analytics + Speed Insights
- [x] Structured logger (replaced console.log)
- [x] CSP header (report-only)
- [x] CSRF protection (log-only)
- [x] RLS policy tightening
- [x] Kashier webhook signature enforcement
- [x] Payment idempotency
- [x] Pending payment timeout (pg_cron)

---

## Test Accounts

| Email              | Password | Role              |
| ------------------ | -------- | ----------------- |
| provider@test.com  | Test123! | سوبر ماركت النجاح |
| provider2@test.com | Test123! | سلطان بيتزا       |
| provider3@test.com | Test123! | لافندر كافيه      |
| provider4@test.com | Test123! | مطعم الصفا        |
| customer@test.com  | Test123! | Customer          |
| admin@test.com     | Test123! | Admin             |

---

## Architecture Reference

### Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **State**: Zustand (cart)
- **UI**: shadcn/ui
- **i18n**: next-intl (Arabic/English)
- **Testing**: Playwright (E2E), 270+ unit tests, 76 security tests
- **Monitoring**: Sentry (errors), Vercel Analytics (performance)
- **Security**: Upstash Redis (rate limiting), CSRF, CSP
- **Payment**: Kashier (Egyptian gateway)
- **Notifications**: Firebase Cloud Messaging

### Key Files

- `src/app/[locale]/` - Locale-aware pages
- `src/components/` - Reusable components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utilities and API functions
- `src/lib/repositories/` - Data access layer
- `supabase/migrations/` - Database migrations
- `docs/APP_STORES_RELEASE_ROADMAP.md` - خطة تفصيلية للنشر على Google Play و App Store

### Key Documents

| الملف                                | المحتوى                                                      |
| ------------------------------------ | ------------------------------------------------------------ |
| `docs/APP_STORES_RELEASE_ROADMAP.md` | خطة النشر التفصيلية (المراحل 0-6B) - Google Play + App Store |
| `docs/PRE_RELEASE_REVIEW_REPORT.md`  | تقرير مراجعة ما قبل النشر                                    |
| `docs/MASTER_IMPLEMENTATION_PLAN.md` | خطة التنفيذ الشاملة (المراحل 1-4)                            |
| `docs/QUALITY_LAYERS_ROADMAP.md`     | خريطة طبقات الجودة                                           |

### Pricing Types

| Type              | Description          | Example            |
| ----------------- | -------------------- | ------------------ |
| `fixed`           | Single price         | Coffee - 25 EGP    |
| `per_unit`        | Price per unit       | Meat - 250 EGP/kg  |
| `variants`        | Size/option variants | Pizza S/M/L        |
| `weight_variants` | Weight variants      | Lamb 250g/500g/1kg |
