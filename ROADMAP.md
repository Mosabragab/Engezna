# Roadmap - Engezna Platform

## آخر تحديث: 2026-02-21

## حالة المشروع: MVP مكتمل 100% - جاري التجهيز لـ Google Play و App Store

---

## ملخص المراحل

| المرحلة                                    | الحالة     | التقدم |
| ------------------------------------------ | ---------- | ------ |
| المرحلة 0: إصلاحات أمنية عاجلة             | ✅ مكتمل   | 100%   |
| المرحلة 1: نظام الإشعارات والأصوات         | ✅ مكتمل   | 100%   |
| المرحلة 1.5: إصلاحات حرجة من المراجعة      | ✅ مكتمل   | 100%   |
| المرحلة 2: تحسين الأداء (Lighthouse)       | 🔄 جاري    | 75%    |
| المرحلة 3: إعداد Capacitor + Android Build | ⬜ لم يبدأ | 0%     |
| المرحلة 3B: إعداد Capacitor + iOS Build    | ⬜ لم يبدأ | 0%     |
| المرحلة 4: تجهيز Google Play Store Listing | ⬜ لم يبدأ | 0%     |
| المرحلة 4B: تجهيز Apple App Store Listing  | ⬜ لم يبدأ | 0%     |
| المرحلة 5: الاختبار والمراجعة النهائية     | ⬜ لم يبدأ | 0%     |
| المرحلة 6: النشر على Google Play           | ⬜ لم يبدأ | 0%     |
| المرحلة 6B: النشر على Apple App Store      | ⬜ لم يبدأ | 0%     |

---

## 🔴 المطلوب الآن: إكمال المرحلة 2 + تنشيط Edge Functions

### مهام Edge Functions (الأولوية القصوى - إشعارات الموبايل):

| #   | المهمة                                                               | النوع    | الحالة |
| --- | -------------------------------------------------------------------- | -------- | ------ |
| 1   | نشر `send-notification` و `handle-notification-trigger` على Supabase | Supabase | ⬜     |
| 2   | إعداد `FIREBASE_SERVICE_ACCOUNT` كـ Supabase Secret                  | Supabase | ⬜     |
| 3   | اختبار الدورة الكاملة: trigger → Edge Function → FCM → device        | اختبار   | ⬜     |
| 4   | حذف Database Webhooks القديمة من Supabase Dashboard                  | Supabase | ⬜     |

### مهام المرحلة 2 المتبقية (أداء):

| #   | المهمة                                 | الأولوية |
| --- | -------------------------------------- | -------- |
| 5   | ضغط البانر الرئيسي (938KB → < 200KB)   | عالي     |
| 6   | تحسين Speed Index (ISR, streaming SSR) | متوسط    |
| 7   | تفعيل gzip/brotli compression          | متوسط    |
| 8   | تشغيل Lighthouse audit ومقارنة النتائج | متوسط    |

### تم إنجازه من المرحلة 1.5 (2/13 - 2/14): ✅

- ✅ حذف 7 triggers مكشوفة + Rotate Service Role Key + تحديث كل البيئات
- ✅ triggers الآمنة (`on_*`) تغطي كل الحالات (تأكيد من فحص DB مباشر 2/21)
- ✅ إصلاح Phantom Orders + Kashier Refund API + webhook idempotency
- ✅ تفعيل CSRF (enforce) + CSP (enforce) + RLS tightening
- ✅ تنظيف console.log + Kashier webhook signature enforcement

---

## الخطوات الجاية بالترتيب

### الخطوة 1: إكمال المرحلة 2 + Edge Functions (2-3 أيام)

- **Edge Functions (أولوية قصوى):**
  - نشر `send-notification` + `handle-notification-trigger` على Supabase
  - إعداد `FIREBASE_SERVICE_ACCOUNT` كـ Supabase Secret
  - حذف Database Webhooks القديمة من Dashboard
  - اختبار الدورة الكاملة: trigger → Edge Function → FCM → device
- **أداء (متبقي):**
  - ضغط البانر الرئيسي (938KB → < 200KB)
  - تحسين Speed Index (ISR, streaming SSR)
  - الهدف: Lighthouse Performance > 80

### الخطوة 2: المرحلة 3 + 3B - Capacitor + Android + iOS (4-6 أيام)

- تثبيت وإعداد Capacitor (مشترك)
- إعداد Android project + native plugins + `google-services.json`
- إعداد iOS project + Xcode + `GoogleService-Info.plist`
- APNs key setup + Firebase integration
- اختبار على emulators وأجهزة حقيقية
- بناء Release AAB (Android) + Archive (iOS)

### الخطوة 3: المرحلة 4 + 4B - Store Listings (2-3 أيام)

- تسجيل حساب Google Play Developer ($25)
- تسجيل حساب Apple Developer ($99/سنة)
- تصميم Feature Graphic + Screenshots (PNG) لكلا المتجرين
- كتابة وصف المتجر (عربي/إنجليزي)
- ملء Content Rating + Data Safety + App Privacy Labels
- إعداد Sign in with Apple (إلزامي لـ App Store)

### الخطوة 4: المرحلة 5 - الاختبار النهائي (3-4 أيام)

- تشغيل جميع Tests (Unit + Security + E2E)
- اختبار يدوي لكل flow على Android و iOS
- Lighthouse audit نهائي
- مراجعة أمنية نهائية
- اختبار الإشعارات على كلا النظامين

### الخطوة 5: المرحلة 6 + 6B - النشر (1-7 أيام)

- **Android:** Internal Testing → Closed Testing → Production (Staged Rollout)
- **iOS:** TestFlight → App Store Review → Phased Release

---

## نتائج فحص قاعدة البيانات (2026-02-21)

> **الهدف:** التحقق من سلامة نظام الإشعارات والأمان قبل مرحلة Capacitor

### Triggers الآمنة ✅

| Trigger                             | Table                    | Event        | Status  |
| ----------------------------------- | ------------------------ | ------------ | ------- |
| `on_customer_notification_fcm_sync` | `customer_notifications` | AFTER INSERT | ✅ يعمل |
| `on_provider_notification_fcm_sync` | `provider_notifications` | AFTER INSERT | ✅ يعمل |
| `on_admin_notification_fcm_sync`    | `admin_notifications`    | AFTER INSERT | ✅ يعمل |

### FCM Architecture ✅

- `trigger_notification_fcm_sync()` → `call_notification_webhook()` → HTTP POST to Edge Function
- `fcm_tokens` table: يدعم `web`, `android`, `ios` device types
- آخر إشعار: 2026-02-19 (يعمل بشكل طبيعي)

### Cron Jobs (5/6 نشط)

| Job                                  | الجدول      | الحالة      |
| ------------------------------------ | ----------- | ----------- |
| `process_missing_embeddings`         | كل 5 دقائق  | ✅ نشط      |
| `auto_confirm_expired_refunds`       | كل ساعة     | ✅ نشط      |
| `trigger_cleanup_custom_order_files` | أسبوعياً    | ✅ نشط      |
| `expire_all_custom_orders`           | كل 30 دقيقة | ✅ نشط      |
| `expire_pending_payment_orders`      | كل 15 دقيقة | ✅ نشط      |
| `check_delayed_orders_and_notify`    | كل 30 دقيقة | ⚠️ **معطل** |

### متبقي

- [ ] نشر Edge Functions
- [ ] إعداد FIREBASE_SERVICE_ACCOUNT
- [ ] حذف Database Webhooks القديمة
- [ ] تفعيل cron job الطلبات المتأخرة (اختياري)

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
- [x] عمل Rotate للـ Service Role Key (2/13)
- [x] تحديث المفتاح في كل البيئات (2/13)
- [ ] حذف Database Webhooks القديمة ← **محتاج المالك**
- [x] تحويل CSRF لـ enforce mode (2/14)
- [x] تحويل CSP لـ enforce mode (2/14)
- [x] إضافة webhook handler لتأكيد الاسترجاع من Kashier (2/14)
- [x] تأكيد triggers الآمنة تغطي كل الحالات (فحص DB مباشر 2/21)

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
- [x] Write app store descriptions (docs/app-store/APP_STORE_METADATA.md)
- [ ] Complete Data Safety Form (Google) + App Privacy Labels (Apple)
- [x] Privacy Policy URL in manifest
- [ ] Test PWA installation on Android/iOS
- [ ] Design Feature Graphic (1024x500 px)
- [ ] Capacitor setup + Android + iOS build
- [x] Apple Review Notes prepared (docs/app-store/APPLE_REVIEW_NOTES.md)
- [ ] Sign in with Apple (إلزامي لـ App Store)

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
- [x] Database triggers for all events (3 آمنة: customer/provider/admin)
- [x] `call_notification_webhook()` function (HTTP POST to Edge Function)
- [x] FCM tokens table with device_type support (web/android/ios)
- [ ] نشر Edge Functions على Supabase (`send-notification` + `handle-notification-trigger`)
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
- [x] Kashier refund webhook handler (تأكيد الاسترجاع) (2/14)

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
