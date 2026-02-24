# خطة النشر الموحدة - إنجزنا

## Engezna - Consolidated Deployment Master Plan

**تاريخ الإنشاء:** 2026-02-24
**الأساس:** دمج وتصحيح 8 ملفات نشر + مراجعة مقابل ملفات البراندينج والماركتينج
**الحالة:** وثيقة مرجعية موحدة - جاري التنفيذ

> **هذا الملف يحل محل:**
>
> - `docs/APP_STORES_RELEASE_ROADMAP.md` (الخطة الرئيسية)
> - `docs/LAUNCH_READINESS_CHECKLIST.md` (قائمة الجاهزية)
> - `docs/PRE_RELEASE_REVIEW_REPORT.md` (تقرير المراجعة)
> - `docs/EXECUTION_PLAN.md` (خطة التنفيذ)
> - `docs/PLAN_REVIEW_2026_02_22.md` (مراجعة الخطة)
> - `docs/STORE_LISTINGS.md` (محتوى المتاجر - **كان يحتوي أخطاء**)
> - `docs/app-store/APP_STORE_METADATA.md` (metadata)
> - `docs/app-store/APPLE_REVIEW_NOTES.md` (ملاحظات Apple)
>
> **الملفات الأصلية محفوظة للسجل التاريخي ولا يجب تعديلها.**

---

## جدول المحتويات

1. [ملخص الخطة العام](#1-ملخص-الخطة-العام)
2. [حالة الجاهزية](#2-حالة-الجاهزية)
3. [المراحل المكتملة (0, 1, 1.5)](#3-المراحل-المكتملة)
4. [المرحلة الجارية (2 - الأداء)](#4-المرحلة-الجارية)
5. [المراحل القادمة (3-6B)](#5-المراحل-القادمة)
6. [محتوى المتاجر (مصحح)](#6-محتوى-المتاجر-المصحح)
7. [متطلبات Apple الخاصة وملاحظات المراجعة](#7-متطلبات-apple-الخاصة)
8. [مقارنة متطلبات المتجرين](#8-مقارنة-متطلبات-المتجرين)
9. [ما يحتاج تدخل المالك](#9-ما-يحتاج-تدخل-المالك)
10. [بروتوكول Supabase](#10-بروتوكول-supabase)
11. [سجل التحديثات](#11-سجل-التحديثات)

---

## 1. ملخص الخطة العام

| المرحلة | الأهمية | الحالة | النسبة |
| --- | --- | --- | --- |
| **المرحلة 0:** إصلاحات أمنية عاجلة | حرج | ✅ مكتمل | 100% |
| **المرحلة 1:** إصلاح الإشعارات والأصوات | حرج | ✅ مكتمل | 100% |
| **المرحلة 1.5:** إصلاحات حرجة مكتشفة | حرج | ✅ مكتمل | 100% |
| **المرحلة 2:** تحسين الأداء (Lighthouse) | عالي | 🔄 جاري (90%) | ~90% |
| **المرحلة 3:** إعداد Capacitor + Android Build | عالي | ⬜ لم يبدأ | 0% |
| **المرحلة 3B:** إعداد Capacitor + iOS Build | عالي | ⬜ لم يبدأ | 0% |
| **المرحلة 4:** تجهيز Google Play Store Listing | متوسط | ⬜ لم يبدأ | 0% |
| **المرحلة 4B:** تجهيز Apple App Store Listing | متوسط | ⬜ لم يبدأ | 0% |
| **المرحلة 5:** الاختبار والمراجعة النهائية | عالي | ⬜ لم يبدأ | 0% |
| **المرحلة 6:** النشر على Google Play | حرج | ⬜ لم يبدأ | 0% |
| **المرحلة 6B:** النشر على Apple App Store | حرج | ⬜ لم يبدأ | 0% |

---

## 2. حالة الجاهزية

| القسم | الأهمية | الحالة | التقييم |
| --- | --- | --- | --- |
| الأمان | حرج | 🟢 ممتاز | 88/100 |
| قاعدة البيانات | حرج | 🟢 جيد | 90/100 |
| الأداء | عالي | 🟢 جيد | 85/100 |
| الاختبارات | عالي | 🟢 جيد | 85/100 |
| الميزات | متوسط | 🟢 ممتاز | 100/100 |
| المتاجر | متوسط | 🟡 جزئي | 60/100 |
| القانوني والخصوصية | منخفض | 🟢 ممتاز | 95/100 |
| البنية التحتية | حرج | 🟢 ممتاز | 92/100 |
| Capacitor (Native) | متوسط | ⬜ لم يبدأ | 0/100 |

### النقاط الإيجابية المؤكدة من مراجعة الكود:

- ✅ لا يوجد API keys مكشوفة (كلها من env vars)
- ✅ لا يوجد SQL injection (Supabase SDK + parameterized queries)
- ✅ لا يوجد XSS (لا dangerouslySetInnerHTML أو eval)
- ✅ TypeScript strict mode بدون @ts-ignore
- ✅ Error handling ممتاز في 34+ API route
- ✅ CSRF enforce + CSP enforce + Webhook signature validation
- ✅ Rate limiting عبر Upstash Redis
- ✅ RLS مفعل على كل الجداول (74 جدول)
- ✅ 270+ unit tests, 76 security tests, 114+ E2E tests

---

## 3. المراحل المكتملة

### المرحلة 0: إصلاحات أمنية عاجلة ✅ (2/8)

- ✅ نقل Firebase credentials لـ dynamic injection
- ✅ إزالة fallback values من config
- ✅ إنشاء Service Worker ديناميكياً
- ✅ تحديث jspdf لإصلاح ثغرة حرجة
- ✅ تعطيل test account auto-confirmation في production
- ✅ RBAC middleware شغال على كل المسارات

### المرحلة 1: إصلاح نظام الإشعارات والأصوات ✅ (2/8-2/9)

- ✅ إنشاء Audio Manager مركزي (singleton) مع fallback
- ✅ VAPID Key validation
- ✅ إشعارات كاملة لكل الأدوار (عميل + مزود + أدمن)
- ✅ صفحات إشعارات مخصصة لكل دور
- ✅ إعدادات إشعارات مع toggles وساعات الهدوء
- ✅ Edge Functions منشورة ومختبرة (2/19-2/22)
- ✅ FCM Pipeline كامل: trigger → webhook → Edge Function → FCM → Device
- ✅ إصلاح نظام الطلبات الخاصة (auto-archive, RLS, أصناف)
- ✅ تناسق تصميم كروت الطلبات الخاصة مع العادية

### المرحلة 1.5: إصلاحات حرجة مكتشفة ✅ (2/13-2/14)

- ✅ **حذف 7 triggers تحتوي JWT مكشوف + Rotate للـ Service Role Key**
- ✅ إصلاح Phantom Orders (إنشاء الطلب بـ pending_payment قبل Kashier)
- ✅ إنشاء Kashier Refund API + Refund Webhook Handler
- ✅ Webhook idempotency + unique constraint على payment_transaction_id
- ✅ CSRF enforce + CSP enforce
- ✅ إلزام Kashier Webhook Signature
- ✅ إصلاح Promo Validation Identity Spoofing
- ✅ تضييق RLS Policies المفتوحة (promo_codes, profiles)
- ✅ تنظيف console.log من API routes (36 ملف)
- ✅ Cron job لتنظيف طلبات pending_payment كل 15 دقيقة

---

## 4. المرحلة الجارية

### المرحلة 2: تحسين الأداء - Lighthouse 🔄 (~90%)

**مكتمل:**

- ✅ تطبيق priority على hero images + استخدام next/image مع sizes
- ✅ إضافة width/height للصور + skeleton placeholders
- ✅ إصلاح font loading (swap + preload + preconnect)
- ✅ Lazy loading لـ 5 أقسام homepage + dynamic imports
- ✅ تحويل صور لـ WebP/AVIF (next/image auto)
- ✅ إعداد Lighthouse CI (lighthouserc.js + GitHub Actions)
- ✅ إصلاح WCAG AA color-contrast على 6 صفحات
- ✅ تحسين SEO metadata + Accessibility (aria-labels)
- ✅ حساب contrast وفق WCAG 2.1 في OffersCarousel
- ✅ إضافة primary-dark لون `hsl(198 100% 34%)` للـ contrast

**متبقي:**

| المهمة | الأولوية |
| --- | --- |
| [ ] ضغط البانر الرئيسي (حالياً 938KB → هدف < 200KB) | عالي |
| [ ] تحسين Speed Index (SSR/ISR/streaming) | متوسط |
| [ ] تفعيل gzip/brotli compression | متوسط |
| [ ] تحقيق Lighthouse Performance > 80 | عالي |
| [ ] تنظيف console.log من client-side (76 مكان في 12 ملف) | منخفض |
| [ ] تحويل `<img>` المتبقية لـ `next/image` (33 ملف) | منخفض |

---

## 5. المراحل القادمة

### المرحلة 3: إعداد Capacitor + Android Build ⬜

> **الاستراتيجية:** Hybrid App (Capacitor WebView → Vercel backend). Static export مستحيل عملياً بسبب 39 API route + middleware + ISR + Server Actions.

#### 3.1 تثبيت وإعداد Capacitor

| المهمة | الحالة |
| --- | --- |
| [ ] تثبيت `@capacitor/core` + `@capacitor/cli` | ⬜ |
| [ ] تشغيل `npx cap init "إنجزنا" "com.engezna.app"` | ⬜ |
| [ ] إنشاء `capacitor.config.ts` (Hybrid App + server.url → Vercel) | ⬜ |
| [ ] إضافة `output: 'standalone'` في `next.config.ts` | ⬜ |
| [ ] إضافة Android platform: `npx cap add android` | ⬜ |

#### 3.2 Native Plugins

| Plugin | السبب |
| --- | --- |
| [ ] `@capacitor/push-notifications` | إشعارات native |
| [ ] `@capacitor/geolocation` | الموقع الجغرافي |
| [ ] `@capacitor/camera` | تصوير المنتجات |
| [ ] `@capacitor/share` | المشاركة |
| [ ] `@capacitor/app` | Deep linking + app state |
| [ ] `@capacitor/status-bar` + `splash-screen` | تخصيص شريط الحالة + شاشة البداية |
| [ ] `@capacitor/haptics` | اهتزاز عند الإشعارات |
| [ ] `@capacitor/keyboard` | تحسين الكيبورد (iOS) |

#### 3.3 Platform Detection

- [ ] إنشاء `src/lib/platform/index.ts` مع `isNativePlatform()`, `isAndroid()`, `isIOS()`
- [ ] تحويل Push Notifications لتستخدم native plugin عند توفره
- [ ] تحويل Geolocation لتستخدم native plugin عند توفره

#### 3.4 إعداد Android Project

| المهمة | يحتاج المالك؟ |
| --- | --- |
| [ ] إعداد `google-services.json` من Firebase Console | ✅ نعم |
| [ ] إعداد Notification Channel مع ملفات صوت في `res/raw/` | لا |
| [ ] إعداد Adaptive Icon (192x192, 512x512) | لا |
| [ ] إعداد Splash Screen بألوان البراند | لا |
| [ ] إعداد `AndroidManifest.xml` (permissions, deep links) | لا |
| [ ] بناء واختبار على Emulator + جهاز حقيقي | لا |
| [ ] بناء Release AAB: `./gradlew bundleRelease` | لا |

---

### المرحلة 3B: إعداد iOS Build ⬜

> **متطلب أساسي:** macOS + Xcode 15+

#### 3B.1 بيئة التطوير

| المهمة | يحتاج المالك؟ |
| --- | --- |
| [ ] macOS + Xcode 15+ + Command Line Tools | ✅ نعم |
| [ ] تثبيت CocoaPods | لا |
| [ ] `npx cap add ios` + `npx cap sync ios` | لا |

#### 3B.2 Apple Developer Account والشهادات

| المهمة | يحتاج المالك؟ |
| --- | --- |
| [ ] تسجيل Apple Developer Account ($99/سنة) | ✅ نعم |
| [ ] إنشاء App ID (`com.engezna.app`) | ✅ نعم |
| [ ] إنشاء Distribution Certificate + Provisioning Profile | ✅ نعم |
| [ ] إنشاء APNs Authentication Key + رفعها لـ Firebase | ✅ نعم |
| [ ] `GoogleService-Info.plist` من Firebase Console | ✅ نعم |

#### 3B.3 إعداد iOS Project في Xcode

| المهمة | الحالة |
| --- | --- |
| [ ] Bundle Identifier: `com.engezna.app` | ⬜ |
| [ ] Display Name: `إنجزنا` | ⬜ |
| [ ] Minimum Deployment Target: iOS 14.0+ | ⬜ |
| [ ] تفعيل Push Notifications + Background Modes | ⬜ |
| [ ] تفعيل Associated Domains (`applinks:app.engezna.com`) | ⬜ |
| [ ] إعداد App Icons (1024x1024 + كل الأحجام) | ⬜ |
| [ ] إعداد Launch Screen | ⬜ |
| [ ] إعداد Info.plist بالأذونات (الكاميرا، الموقع، الإشعارات، ATT) | ⬜ |

#### 3B.4 متطلبات Apple الإلزامية (كود)

| المتطلب | الحالة | التفاصيل |
| --- | --- | --- |
| حذف الحساب | ✅ موجود | `/api/auth/delete-account` + UI في profile |
| Sign in with Apple | ❌ مطلوب | إلزامي لأن Google Sign In موجود |
| Privacy Policy | ✅ موجود | `/ar/privacy` |
| HTTPS فقط | ✅ موجود | Vercel enforces |
| Facebook Login | ⚠️ API فقط | موجود كـ API لكن غير ظاهر في login page |

#### 3B.5 Sign in with Apple - التنفيذ المطلوب

| الخطوة | يحتاج المالك؟ |
| --- | --- |
| [ ] إعداد Apple Provider في Supabase Dashboard | ✅ نعم |
| [ ] إنشاء Apple Service ID + Sign in with Apple Key | ✅ نعم |
| [ ] إضافة زر "Sign in with Apple" في login page | لا |
| [ ] إنشاء Apple Auth API route | لا |
| [ ] اختبار التدفق الكامل | لا |

---

### المرحلة 4: تجهيز Google Play Store Listing ⬜

#### 4.1 حساب Google Play Developer

| المهمة | يحتاج المالك؟ |
| --- | --- |
| [ ] تسجيل Google Play Developer ($25 مرة واحدة) | ✅ نعم |
| [ ] التحقق من الهوية (Identity Verification) | ✅ نعم |

#### 4.2 المحتوى المرئي

| المهمة | الحالة |
| --- | --- |
| [ ] Feature Graphic (1024x500 px) | ⬜ |
| [ ] App Icon (512x512 px - موجود) | ✅ |
| [ ] Screenshots للموبايل (min 2, max 8) - PNG فقط | ⬜ |
| [ ] تحويل Screenshots من SVG لـ PNG | ⬜ |
| [ ] **أجهزة Android فقط** في الـ mockups (لا iPhone) | ⬜ |

#### 4.3 المحتوى النصي

→ راجع [القسم 6: محتوى المتاجر المصحح](#6-محتوى-المتاجر-المصحح)

#### 4.4 Content Rating و Data Safety

| المهمة | يحتاج المالك؟ |
| --- | --- |
| [ ] ملء استبيان Content Rating (IARC) | ✅ نعم |
| [ ] ملء Data Safety Form (مطابقة Privacy Policy) | ✅ نعم |
| [ ] تحديد البلدان المستهدفة: مصر | ✅ نعم |

---

### المرحلة 4B: تجهيز Apple App Store Listing ⬜

#### 4B.1 App Store Connect

| المهمة | يحتاج المالك؟ |
| --- | --- |
| [ ] إنشاء تطبيق جديد (Name: إنجزنا، Bundle: com.engezna.app) | ✅ نعم |
| [ ] إعداد الإصدار الأول (Version 1.0.0) | ✅ نعم |

#### 4B.2 المحتوى المرئي

| المهمة | الحالة |
| --- | --- |
| [ ] App Icon: 1024x1024 px (بدون شفافية) | ⬜ |
| [ ] Screenshots لـ iPhone 6.7" (1290x2796) - **إلزامي** (min 3) | ⬜ |
| [ ] Screenshots لـ iPhone 6.5" (1284x2778) | ⬜ |
| [ ] Screenshots لـ iPhone 5.5" (1242x2208) | ⬜ |
| [ ] **أجهزة iPhone فقط** في الـ mockups (لا Android) | ⬜ |

#### 4B.3 المحتوى النصي

→ راجع [القسم 6: محتوى المتاجر المصحح](#6-محتوى-المتاجر-المصحح)

#### 4B.4 App Privacy Labels

| البيانات | النوع | مرتبطة بالمستخدم؟ |
| --- | --- | --- |
| Contact Info (الاسم، البريد، الهاتف، العنوان) | Data Linked to You | نعم |
| Financial Info (عبر Kashier) | Data Linked to You | نعم |
| Location (الموقع للتوصيل) | Data Linked to You | نعم |
| Identifiers (User ID, FCM token) | Data Linked to You | نعم |
| Usage Data (سجل الطلبات) | Data Linked to You | نعم |
| Crash + Performance Data | Data Not Linked to You | لا |
| Tracking عبر تطبيقات | **لا نستخدم** | - |

---

### المرحلة 5: الاختبار والمراجعة النهائية ⬜

#### 5.1 اختبارات آلية

| المهمة | الحالة |
| --- | --- |
| [ ] تشغيل 270 Unit Test | ⬜ |
| [ ] تشغيل 76 Security Test | ⬜ |
| [ ] تشغيل E2E Tests | ⬜ |
| [ ] npm audit بدون ثغرات critical/high | ⬜ |

#### 5.2 اختبار يدوي - تدفقات أساسية

| التدفق | Android | iOS |
| --- | --- | --- |
| تسجيل → تصفح → سلة → طلب (COD) | ⬜ | ⬜ |
| تسجيل → تصفح → سلة → طلب (Online) | ⬜ | ⬜ |
| مزود: استقبال → قبول → تحضير → توصيل | ⬜ | ⬜ |
| محادثة + إشعارات بالصوت | ⬜ | ⬜ |
| طلب استرجاع → موافقة | ⬜ | ⬜ |
| Deep Links / Universal Links | ⬜ | ⬜ |
| Offline mode والعودة للاتصال | ⬜ | ⬜ |

#### 5.3 اختبارات أداء نهائية

| المقياس | الهدف |
| --- | --- |
| Lighthouse Performance | > 80 |
| Lighthouse Accessibility | > 90 |
| APK/AAB Size | < 50MB (أمثل < 30MB) |
| IPA Size | < 200MB |
| App Launch Time | < 3 ثوانٍ |

---

### المرحلة 6: النشر على Google Play ⬜

| المهمة | الحالة |
| --- | --- |
| [ ] Internal Testing (5+ مختبرين) | ⬜ |
| [ ] Closed Testing (20+ مستخدم حقيقي) | ⬜ |
| [ ] إرسال للمراجعة (1-7 أيام) | ⬜ |
| [ ] Staged Rollout: 10% → 25% → 50% → 100% | ⬜ |
| [ ] مراقبة التقييمات والرد عليها | ⬜ |

### المرحلة 6B: النشر على Apple App Store ⬜

| المهمة | الحالة |
| --- | --- |
| [ ] رفع Archive عبر Xcode Organizer | ⬜ |
| [ ] TestFlight Internal (حتى 100 مختبر) | ⬜ |
| [ ] TestFlight External (حتى 10,000) | ⬜ |
| [ ] إضافة Demo Account + Notes for Reviewer | ⬜ |
| [ ] إرسال للمراجعة (Submit for Review) | ⬜ |
| [ ] Phased Release (7 أيام - اختياري) | ⬜ |

---

## 6. محتوى المتاجر (المصحح)

> **تنبيه:** هذا القسم يحل محل `STORE_LISTINGS.md` و `APP_STORE_METADATA.md` بعد تصحيحهما مقابل ملفات البراندينج الرسمية.
>
> **المصادر المرجعية:**
>
> - `project-management/marketing/branding/BRAND_IDENTITY_GUIDE.md`
> - `project-management/marketing/branding/BRAND_QUICK_REFERENCE.md`
> - `project-management/marketing/1_5_Value_Proposition_Brand_Voice.md`

### 6.1 الأخطاء المكتشفة والمصححة

| # | المشكلة | الخطأ (STORE_LISTINGS القديم) | الصحيح (من البراندينج) |
| --- | --- | --- | --- |
| 1 | اسم التطبيق | "إنجزنا - توصيل طلبات وأكل" | **"إنجزنا"** فقط |
| 2 | التوصيف | "تطبيق توصيل الطلبات الأول في مصر" | **"أول تطبيق بيخدم المحافظات"** |
| 3 | الأقسام | "متاجر ومطاعم" فقط | **5 أقسام:** المطاعم، الصيدليات، السوبر ماركت، الخضراوات والفاكهه، البن والحلويات |
| 4 | Brand Voice | فصحى رسمية | **عامية مصرية** بسيطة |
| 5 | المميزات | غير مذكورة | **Custom Pricing، Triple Broadcast، 0% عمولة عملاء، السائق بتاع التاجر** |
| 6 | نموذج العمل | غير موجود | **0 تسجيل، 0% أول 3 شهور، 7% حد أقصى** |
| 7 | الكلمات المفتاحية | غير محسنة للبحث المصري | **كلمات بالعامية المصرية** |
| 8 | Value Proposition | مختلفة تماماً عن البراند | **"عايز تطلب؟ إنجزنا!"** |
| 9 | Subtitle (EN) | "Food & Grocery Delivery" | **"Local delivery from your city stores"** |

---

### 6.2 Google Play Store - عربي (مصحح)

**App Name:** إنجزنا

**Short Description (80 حرف):**

```
اطلب احتياجات بيتك من محلات بلدك. مطاعم، صيدليات، سوبر ماركت، خضار وفاكهة!
```

**Full Description:**

```
عايز تطلب؟ إنجزنا! 💙

إنجزنا هو أول تطبيق توصيل مصري بيخدم المحافظات.
بدل ما تفضل على التليفون والخط مشغول، اطلب من موبايلك في ثانية.

محلات بلدك كلها في مكان واحد:
• المطاعم - كشري، مشويات، فاست فود، بيتزا
• الصيدليات - أدوية ومستلزمات طبية
• السوبر ماركت - بقالة ومنتجات يومية
• الخضراوات والفاكهه - طازجة من محلات بلدك
• البن والحلويات - كافيهات، حلواني، محمصات بن

ليه إنجزنا؟
✅ اطلب بضغطة - مفيش خط مشغول
✅ طلبك مكتوب ومؤكد - مش هيجي غلط
✅ قارن أسعار 3 محلات واختار الأرخص (Triple Broadcast)
✅ اطلب أي حاجة حتى لو مش في القائمة (طلبات مخصصة)
✅ تتبع طلبك لحظة بلحظة
✅ ادفع كاش عند الاستلام أو إلكتروني
✅ دعم فني متاح 24/7 بالذكاء الاصطناعي

للتجار:
• صفر رسوم تسجيل - مجاناً للأبد
• 0% عمولة أول 3 شهور، ثم 7% كحد أقصى
• 0% رسوم خدمة على العملاء
• بتستخدم سائقك - مش محتاج حد من عندنا
• داشبورد كاملة + تقارير + محادثات

محلات بلدك في إيدك - حمّل إنجزنا دلوقتي! 💙
```

**Keywords/Tags:**

```
توصيل طلبات, محلات قريبة, اطلب اكل, صيدلية اونلاين, سوبر ماركت, خضار, بقالة, توصيل سريع, مصر, محافظات, بني سويف, انجزنا, engezna, طلبات مخصصة, عروض
```

---

### 6.3 Google Play Store - English (مصحح)

**App Name:** Engezna

**Short Description (80 chars):**

```
Order from local stores in your city. Restaurants, pharmacies, supermarkets!
```

**Full Description:**

```
Want to order? Engezna! 💙

Engezna is Egypt's first delivery app serving the governorates.
No more busy phone lines - order from your phone in seconds.

All your local stores in one place:
• Restaurants - all types of food
• Pharmacies - medicines and medical supplies
• Supermarkets - groceries and daily essentials
• Vegetables & Fruits - fresh from local shops
• Coffee & Patisserie - cafés, bakeries, roasteries

Why Engezna?
✅ Order with one tap - no busy phone lines
✅ Your order is written and confirmed - no mistakes
✅ Compare prices from 3 stores (Triple Broadcast)
✅ Order anything, even if it's not on the menu (Custom Orders)
✅ Track your order in real-time
✅ Pay cash on delivery or online
✅ 24/7 AI-powered customer support

For Merchants:
• Zero registration fees - free forever
• 0% commission for first 3 months, then 7% max
• 0% service fees charged to customers
• Use your own delivery driver
• Full dashboard + reports + chat

Your local stores at your fingertips - download Engezna now! 💙
```

**Keywords/Tags:**

```
food delivery, local stores, pharmacy delivery, grocery, supermarket, Egypt, governorates, beni suef, engezna, custom orders, compare prices, fast delivery
```

---

### 6.4 Apple App Store - عربي (مصحح)

**App Name:** إنجزنا

**Subtitle (30 حرف):**

```
محلات بلدك في إيدك
```

**Promotional Text (170 حرف):**

```
اطلب من محلات بلدك في ثانية! مطاعم، صيدليات، سوبر ماركت، خضار. قارن أسعار 3 محلات واختار الأحسن. حمّل إنجزنا! 💙
```

**Description:**
(نفس النص العربي أعلاه في قسم Google Play مع تبديل - بـ •)

**Keywords (100 حرف):**

```
توصيل,طلبات,محلات,صيدلية,سوبر,خضار,مطاعم,بقالة,انجزنا,مصر,محافظات,اسعار
```

---

### 6.5 Apple App Store - English (مصحح)

**App Name:** Engezna

**Subtitle (30 chars):**

```
Local delivery from your city
```

**Promotional Text (170 chars):**

```
Order from local stores in seconds! Restaurants, pharmacies, supermarkets, groceries. Compare prices from 3 stores. Download Engezna now!
```

**Description:**
(Same English text as Google Play section above, replacing - with •)

**Keywords (100 chars):**

```
delivery,food,pharmacy,grocery,stores,Egypt,local,orders,compare,engezna,fast
```

---

### 6.6 معلومات مشتركة

| البند | القيمة |
| --- | --- |
| **App Category (Primary)** | Food & Drink |
| **App Category (Secondary)** | Shopping |
| **Content Rating (Google)** | Everyone |
| **Age Rating (Apple)** | 4+ |
| **Privacy Policy** | `https://engezna.com/ar/privacy` |
| **Support URL** | `https://engezna.com/ar/contact` |
| **Marketing URL** | `https://engezna.com` |
| **Copyright** | © 2025 Sweifcom for Trade and Export LLC |
| **Contact Email** | support@engezna.com |
| **Privacy Email** | privacy@engezna.com |

---

## 7. متطلبات Apple الخاصة

### 7.1 أسباب الرفض الشائعة وكيفية تجنبها

| السبب | الحل | الحالة |
| --- | --- | --- |
| لا يوجد زر حذف حساب (§5.1.1) | `/api/auth/delete-account` + UI في profile | ✅ موجود |
| التطبيق مجرد WebView | إضافة native features (إشعارات، كاميرا، haptics) | ⬜ مطلوب |
| Sign in with Apple مفقود | إضافته (إلزامي لأن Google Sign In موجود) | ⬜ مطلوب |
| الأذونات تُطلب فوراً | طلب lazy عند الحاجة فقط | ⬜ للتنفيذ |
| لا يعمل في بلد المراجع | إتاحة demo mode أو بيانات تجريبية | ⬜ للتنفيذ |
| Privacy Labels غير مكتملة | ملء كل الحقول في App Store Connect | ⬜ للتنفيذ |

### 7.2 Demo Account لفريق Apple Review

```
Thank you for reviewing Engezna!

Engezna is a local delivery platform connecting customers with
restaurants and grocery stores in Egypt.

DEMO ACCOUNT:
- Email: reviewer@engezna.com
- Password: AppleReview2026!

KEY FEATURES TO TEST:
1. Home Screen: Browse local stores by category
2. Store Details: View products and menus
3. Cart: Add items and proceed to checkout
4. Custom Orders: Request quotes from multiple stores
5. Order Tracking: View order status and history

LOCATION:
The app serves Egypt. Select "Beni Suef" governorate to see
available demo stores.

PAYMENT:
- Cash on Delivery available for testing
- Online payment requires real Egyptian card (optional)

PERMISSIONS:
- Push Notifications: For order updates (optional)
- No GPS/Location access required (manual selection)

NOTES:
- Arabic and English fully supported
- User location is based on manually selected governorate/city
- No real-time GPS tracking
- Payment processed by Kashier (PCI-DSS compliant) -
  no In-App Purchase needed (physical goods §3.1.3(e))

For any questions: support@engezna.com
```

### 7.3 Contact Information for Review

| Field | Value |
| --- | --- |
| First Name | Mosab |
| Last Name | Ragab |
| Phone | +20 [Phone Number] |
| Email | support@engezna.com |

### 7.4 تحديات iOS الخاصة

| التحدي | التأثير | الحل |
| --- | --- | --- |
| WKWebView لا يدعم كل SW APIs | ⚠️ متوسط | اختبار PWA features داخل Capacitor iOS |
| APNs vs FCM | ⚠️ متوسط | رفع APNs key لـ Firebase + إعداد entitlements |
| iOS لا يدعم Background Fetch بحرية | ⚠️ متوسط | استخدام Silent Push Notifications |
| WKWebView Cookie handling | ⚠️ متوسط | إعداد خاص لـ session cookies مع Supabase |
| مراجعة Apple أبطأ للإصدار الأول | ⚠️ متوسط | التقديم مبكراً + ردود سريعة |

---

## 8. مقارنة متطلبات المتجرين

| المتطلب | Google Play | Apple App Store |
| --- | --- | --- |
| رسوم المطور | $25 (مرة واحدة) | $99/سنة |
| مدة المراجعة | 1-7 أيام | 1-7 أيام (متوسط 1-3) |
| صيغة التطبيق | AAB | IPA (عبر Xcode Archive) |
| الحد الأدنى للـ OS | Android 8.0+ (API 26) | iOS 14.0+ |
| Screenshots المطلوبة | Min 2 (phone) | Min 3 (لكل حجم شاشة) |
| حذف الحساب | مطلوب | **إلزامي صارم** (§5.1.1) |
| Sign in with Apple | غير مطلوب | **إلزامي** مع login اجتماعي |
| In-App Purchase | غير مطلوب (منتجات فعلية) | غير مطلوب (§3.1.3(e)) |
| Privacy Labels | Data Safety Form | App Privacy Labels (أكثر تفصيلاً) |
| Demo Account | اختياري | **مطلوب بشدة** |
| Native Features | WebView مقبول | **يجب إضافة ميزات native** |
| Staged Rollout | نسب مئوية | Phased Release (7 أيام) |
| اختبار تجريبي | Internal → Closed → Open | TestFlight (Internal + External) |

---

## 9. ما يحتاج تدخل المالك

### مالي/إداري

| # | المهمة | التكلفة |
| --- | --- | --- |
| 1 | تسجيل Google Play Developer Account | $25 (مرة واحدة) |
| 2 | تسجيل Apple Developer Account | $99/سنة |

### تقني (يحتاج Dashboard/Console)

| # | المهمة | أين؟ |
| --- | --- | --- |
| 3 | تحميل `google-services.json` | Firebase Console |
| 4 | تحميل `GoogleService-Info.plist` | Firebase Console |
| 5 | إنشاء APNs Authentication Key | Apple Developer Portal |
| 6 | رفع APNs Key لـ Firebase | Firebase → Cloud Messaging |
| 7 | إعداد Apple Sign In في Supabase | Supabase Dashboard → Auth |
| 8 | حذف Database Webhooks القديمة | Supabase Dashboard |

### محتوى (يحتاج أجهزة/بيانات حقيقية)

| # | المهمة | ملاحظات |
| --- | --- | --- |
| 9 | أخذ Screenshots حقيقية | من أجهزة Android + iPhone |
| 10 | إنشاء Demo Account لـ Apple Review | حساب تجريبي يعمل |
| 11 | ملء Data Safety Form (Google) | مطابقة Privacy Policy |
| 12 | ملء App Privacy Labels (Apple) | أكثر تفصيلاً |
| 13 | macOS + Xcode للبناء والاختبار | لـ iOS فقط |

---

## 10. بروتوكول Supabase

> **قاعدة صارمة:** كل ما يخص قاعدة البيانات لا يمكن التأكد منه من الكود وحده.

**البروتوكول قبل أي مهمة تتعلق بقاعدة البيانات:**

1. Claude يكتب استعلامات SQL للفحص
2. المالك ينفذها على Supabase SQL Editor
3. المالك يشارك النتائج
4. Claude يبني قراراته على **بيانات حقيقية** وليس افتراضات

**أمثلة استعلامات فحص:**

```sql
-- فحص الجداول الموجودة
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- فحص سياسات RLS
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies WHERE schemaname = 'public';

-- فحص الـ triggers
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers WHERE trigger_schema = 'public';

-- فحص الـ cron jobs
SELECT * FROM cron.job;
```

---

## 11. سجل التحديثات

| التاريخ | التحديث |
| --- | --- |
| 2026-02-08 | إنشاء الخطة الأصلية + تنفيذ المراحل 0 و 1 |
| 2026-02-09 | إصلاح صوت الإشعارات + الطلبات الخاصة + تناسق التصميم |
| 2026-02-12 | مراجعة عميقة → إضافة المرحلة 1.5 (8 مهام حرجة) |
| 2026-02-13 | تنفيذ المرحلة 1.5: أمان + Phantom Orders + Refund + CSRF + console cleanup |
| 2026-02-14 | CSRF enforce + CSP enforce + Refund webhook + تحسينات أداء |
| 2026-02-16 | إصلاح نظام المهام (6 مشاكل) |
| 2026-02-19 | نشر Edge Functions على Supabase |
| 2026-02-21 | إعادة تسمية الملف + دمج خطة iOS (3B, 4B, 6B) |
| 2026-02-22 | إصلاح FCM Pipeline + مراجعة الخطة مقابل الكود |
| 2026-02-23 | Lighthouse CI + WCAG AA + SEO metadata + Accessibility fixes |
| **2026-02-24** | **دمج 8 ملفات في وثيقة موحدة + تصحيح محتوى المتاجر مقابل البراندينج** |

---

## ملحق: ترتيب التنفيذ المقترح

```
الأسبوع 1: إكمال المرحلة 2 (الأداء)
├── ضغط البانر الرئيسي
├── تحسين Speed Index
└── Lighthouse Performance > 80

الأسبوع 2: المرحلة 3 (Capacitor + Android)
├── تثبيت وإعداد Capacitor + Native Plugins
├── Platform Detection module
├── إعداد Android Project
└── يحتاج المالك: google-services.json

الأسبوع 2 بالتوازي: المرحلة 3B (كود iOS)
├── Sign in with Apple implementation
└── App Update Mechanism

الأسبوع 3: المرحلة 4 + 4B (محتوى المتاجر)
├── محتوى المتاجر المصحح (من هذا الملف)
├── Screenshots تحويل وإعداد
└── CI/CD Workflows

الأسبوع 4+: المرحلة 3B (iOS Native) - يحتاج macOS
├── يحتاج المالك: Apple Developer Account
├── Xcode project setup + APNs
└── TestFlight testing

الأسبوع 5+: المراحل 5 + 6 + 6B (اختبار + نشر)
├── اختبار شامل على أجهزة حقيقية
├── Internal/Closed Testing
└── Production Release + App Store Submission
```

---

**نهاية الوثيقة الموحدة**
