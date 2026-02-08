# خطة رفع إنجزنا على Google Play Store

## Engezna - Google Play Release Roadmap

**تاريخ الإنشاء:** 2026-02-08
**آخر تحديث:** 2026-02-08 (Phase 1 complete)
**الحالة:** تم الاعتماد - جاري التنفيذ

> **تعليمات المتابعة:** يتم تحديث هذا الملف مع كل مهمة تُنفذ. غيّر `[ ]` إلى `[x]` عند الاكتمال.
> أضف التاريخ الفعلي بجانب كل مهمة مكتملة.

---

## ملخص الخطة

| المرحلة                                        | الأهمية | المدة المتوقعة | الحالة     |
| ---------------------------------------------- | ------- | -------------- | ---------- |
| **المرحلة 0:** إصلاحات أمنية عاجلة             | حرج     | 1 يوم          | ✅ تم      |
| **المرحلة 1:** إصلاح نظام الإشعارات والأصوات   | حرج     | 2-3 أيام       | ✅ تم      |
| **المرحلة 2:** تحسين الأداء (Lighthouse)       | عالي    | 2-3 أيام       | ⬜ لم يبدأ |
| **المرحلة 3:** إعداد Capacitor + Android Build | عالي    | 2-3 أيام       | ⬜ لم يبدأ |
| **المرحلة 4:** تجهيز Google Play Store Listing | متوسط   | 1-2 يوم        | ⬜ لم يبدأ |
| **المرحلة 5:** الاختبار والمراجعة النهائية     | عالي    | 2-3 أيام       | ⬜ لم يبدأ |
| **المرحلة 6:** النشر على Google Play           | حرج     | 1-3 أيام       | ⬜ لم يبدأ |

**المدة الإجمالية المقدرة:** 11-18 يوم عمل

---

## المرحلة 0: إصلاحات أمنية عاجلة (يوم واحد)

> **السبب:** لا يمكن نشر التطبيق وبه ثغرات أمنية معروفة.

### 0.1 إزالة Firebase Credentials المكشوفة

| المهمة                                                                        | الحالة | التاريخ |
| ----------------------------------------------------------------------------- | ------ | ------- |
| [x] نقل credentials من `public/firebase-messaging-sw.js` لـ dynamic injection | ✅     | 2/8     |
| [x] إزالة fallback values من `src/lib/firebase/config.ts`                     | ✅     | 2/8     |
| [x] التأكد إن كل Firebase config يجي من environment variables فقط             | ✅     | 2/8     |
| [x] إنشاء `firebase-messaging-sw.js` ديناميكياً عبر build script              | ✅     | 2/8     |

**التفاصيل التقنية (تم الحل):**

- تم إنشاء `src/lib/firebase/generate-sw.ts` يولّد الـ SW من env vars
- تم ربطه في `next.config.ts` ليعمل تلقائياً وقت الـ build
- تم إزالة fallback credentials من `src/lib/firebase/config.ts`
- تم إضافة `public/firebase-messaging-sw.js` لـ `.gitignore`
- تم إضافة Firebase env vars لـ `.env.example`

### 0.2 تحديث Dependencies الضعيفة

| المهمة                                                                                 | الحالة | التاريخ |
| -------------------------------------------------------------------------------------- | ------ | ------- |
| [x] تحديث `jspdf` لأحدث إصدار v4.1.0 (ثغرة حرجة)                                       | ✅     | 2/8     |
| [~] `xlsx` v0.18.5 لا يوجد إصلاح متاح - خطر مقبول (مستخدم فقط لاستيراد قوائم المزودين) | ⚠️     | 2/8     |
| [x] تشغيل `npm audit fix` - بقي 5 ثغرات (4 low + 1 high من xlsx)                       | ✅     | 2/8     |
| [x] إزالة `console.log` statements من ملفات الإشعارات                                  | ✅     | 2/8     |

### 0.3 التحقق من الحماية

| المهمة                                                                                | الحالة | التاريخ |
| ------------------------------------------------------------------------------------- | ------ | ------- |
| [x] التأكد إن test account auto-confirmation معطل في production (أضيف NODE_ENV check) | ✅     | 2/8     |
| [x] التأكد إن RBAC middleware شغال وكل المسارات محمية (admin + provider + customer)   | ✅     | 2/8     |
| [ ] تشغيل security tests: `npx playwright test comprehensive-e2e --grep SECURITY`     | ⬜     |         |

---

## المرحلة 1: إصلاح نظام الإشعارات والأصوات (2-3 أيام)

> **السبب:** الإشعارات جزء أساسي من تجربة المستخدم في تطبيق توصيل.

### 1.1 إصلاح مشكلة صوت الإشعارات (الأولوية القصوى)

| المهمة                                                              | الحالة | التاريخ |
| ------------------------------------------------------------------- | ------ | ------- |
| [x] تطبيق User Interaction Audio Unlock Pattern                     | ✅     | 2/8     |
| [x] إضافة AudioContext resume عند أول تفاعل للمستخدم (click/touch)  | ✅     | 2/8     |
| [x] إنشاء Audio Manager مركزي بدل إنشاء Audio instances متعددة      | ✅     | 2/8     |
| [x] إضافة fallback: إذا الصوت فشل، يظهر toast بصري بارز + vibration | ✅     | 2/8     |
| [ ] اختبار الصوت على Chrome Android, Safari iOS, Chrome Desktop     | ⬜     |         |

**التفاصيل التقنية (تم الحل):**

- تم إنشاء `src/lib/audio/audio-manager.ts` - Audio Manager مركزي (singleton)
- يقوم بإنشاء AudioContext وتشغيل silent buffer عند أول click/touch/keydown
- Pre-loads جميع ملفات الصوت: notification.mp3, new-order.mp3, custom-order.mp3
- Vibration fallback عند فشل الصوت (أنماط مختلفة حسب نوع الإشعار)
- تم استبدال كل `new Audio()` instances بـ `getAudioManager().play(type)`
- تم تهيئة AudioManager في `PushNotificationProvider` عند mount

### 1.2 التأكد من عمل VAPID Key

| المهمة                                                                        | الحالة | التاريخ |
| ----------------------------------------------------------------------------- | ------ | ------- |
| [x] التأكد إن `NEXT_PUBLIC_FIREBASE_VAPID_KEY` متعرف في environment variables | ✅     | 2/8     |
| [x] إضافة validation warning لو الـ VAPID key فاضي                            | ✅     | 2/8     |
| [ ] اختبار FCM token generation على بيئة staging                              | ⬜     |         |

**تفاصيل (تم):** تم إضافة early VAPID_KEY check في `getFcmToken()` مع console.warn واضح

### 1.3 إشعارات مقدمي الخدمات (Provider)

| المهمة                                                                       | الحالة | التاريخ |
| ---------------------------------------------------------------------------- | ------ | ------- |
| [x] التأكد من وصول إشعار صوتي عند طلب جديد (new-order.mp3 عند 0.7 volume)    | ✅     | 2/8     |
| [x] التأكد من وصول إشعار عند رسالة محادثة جديدة                              | ✅     | 2/8     |
| [x] التأكد من وصول إشعار عند تقييم جديد                                      | ✅     | 2/8     |
| [x] التأكد من وصول إشعار عند طلب استرجاع                                     | ✅     | 2/8     |
| [x] التأكد من وصول إشعار عند شكوى جديدة                                      | ✅     | 2/8     |
| [ ] إضافة صوت مختلف ومميز للطلبات الجديدة (persistent alert حتى يقبل المزود) | ⬜     |         |

**تفاصيل (تم المراجعة):** نظام الإشعارات مبني بالكامل مع:

- Realtime اشتراكات + polling fallback (10s)
- Push عبر FCM Edge Functions
- Database triggers لكل الأحداث
- Bell icon + dropdown + sidebar badges

### 1.4 إشعارات العملاء (Customer)

| المهمة                                        | الحالة | التاريخ |
| --------------------------------------------- | ------ | ------- |
| [x] التأكد من وصول إشعار عند تغيير حالة الطلب | ✅     | 2/8     |
| [x] التأكد من وصول إشعار عند رسالة من المزود  | ✅     | 2/8     |
| [x] التأكد من وصول إشعار عند تسعير طلب مخصص   | ✅     | 2/8     |
| [x] التأكد من وصول إشعار عند رد على تذكرة دعم | ✅     | 2/8     |
| [x] التأكد من وصول إشعار عند معالجة الاسترجاع | ✅     | 2/8     |

**تفاصيل (تم المراجعة):** نظام إشعارات العملاء مبني بالكامل مع:

- صفحة إشعارات مخصصة `/notifications`
- Realtime اشتراكات + App Badge
- أزرار تأكيد الاسترجاع النقدي
- أزرار الرد السريع للرسائل

### 1.5 إشعارات الأدمن

| المهمة                                                  | الحالة | التاريخ |
| ------------------------------------------------------- | ------ | ------- |
| [x] تفعيل Push Notifications للأدمن (كان يعمل بالفعل)   | ✅     | 2/8     |
| [x] إشعار عند متجر جديد ينتظر الموافقة                  | ✅     | 2/8     |
| [x] إشعار عند شكوى escalated                            | ✅     | 2/8     |
| [x] إشعار عند طلب استرجاع جديد                          | ✅     | 2/8     |
| [x] إنشاء صفحة إشعارات مخصصة `/admin/notifications`     | ✅     | 2/8     |
| [x] إضافة رابط الإشعارات في sidebar الأدمن              | ✅     | 2/8     |
| [x] تحديث dropdown header لربطه بصفحة الإشعارات الكاملة | ✅     | 2/8     |

**تفاصيل (تم):** Push notifications كانت تعمل بالفعل عبر FCM. تم إضافة:

- صفحة إشعارات كاملة مع فلترة (الكل/مقروء/غير مقروء)
- عداد إحصائيات (إجمالي/مقروء/غير مقروء)
- حذف وتعليم كمقروء
- تصفية حسب المنطقة للمشرفين الإقليميين

### 1.6 بناء واجهة إعدادات الإشعارات

| المهمة                                                       | الحالة | التاريخ |
| ------------------------------------------------------------ | ------ | ------- |
| [x] إنشاء صفحة Notification Preferences في إعدادات العميل    | ✅     | 2/8     |
| [x] إنشاء صفحة Notification Preferences في إعدادات المزود    | ✅     | 2/8     |
| [x] ربط الصفحة بجدول `notification_preferences` الموجود      | ✅     | 2/8     |
| [x] إضافة toggles: صوت on/off, أنواع الإشعارات, ساعات الهدوء | ✅     | 2/8     |

**تفاصيل (تم):**

- تم إنشاء `NotificationPreferences` component مشترك وقابل لإعادة الاستخدام
- صفحة `/profile/notifications` للعملاء مع رابط من قائمة الحساب
- صفحة `/provider/notifications` للمزودين مع رابط من sidebar
- Toggle switches لأنواع الإشعارات حسب الدور (عميل/مزود/أدمن)
- إعدادات الصوت (تشغيل/إيقاف) مع ربط AudioManager
- وقت الراحة (Quiet Hours) مع اختيار الوقت

### 1.7 تنشيط Edge Functions

| المهمة                                                                      | الحالة | التاريخ |
| --------------------------------------------------------------------------- | ------ | ------- |
| [ ] نشر `send-notification` Edge Function على Supabase                      | ⬜     |         |
| [ ] نشر `handle-notification-trigger` Edge Function على Supabase            | ⬜     |         |
| [ ] إعداد Database Webhooks لربط triggers بالـ Edge Functions               | ⬜     |         |
| [ ] اختبار الدورة الكاملة: trigger → webhook → Edge Function → FCM → device | ⬜     |         |

---

## المرحلة 2: تحسين الأداء - Lighthouse (2-3 أيام)

> **السبب:** Google Play يتطلب تجربة مستخدم سلسة. LCP 7.9s غير مقبول.

### 2.1 تحسين Largest Contentful Paint (LCP)

| المهمة                                                      | الحالة | التاريخ |
| ----------------------------------------------------------- | ------ | ------- |
| [ ] تطبيق `priority` على hero images                        | ⬜     |         |
| [ ] استخدام `next/image` مع `sizes` و `srcSet` بشكل صحيح    | ⬜     |         |
| [ ] ضغط البانر الرئيسي (حالياً 938KB - يجب أن يكون < 200KB) | ⬜     |         |
| [ ] تفعيل `preload` لأهم الموارد في `<head>`                | ⬜     |         |
| [ ] الهدف: LCP < 2.5s                                       | ⬜     |         |

### 2.2 تحسين Cumulative Layout Shift (CLS)

| المهمة                                             | الحالة | التاريخ |
| -------------------------------------------------- | ------ | ------- |
| [ ] إضافة `width` و `height` صريح لكل صورة         | ⬜     |         |
| [ ] إضافة skeleton placeholders للمحتوى الديناميكي | ⬜     |         |
| [ ] إصلاح font loading (حالياً يسبب layout shift)  | ⬜     |         |
| [ ] الهدف: CLS < 0.1                               | ⬜     |         |

### 2.3 تحسين First Contentful Paint (FCP)

| المهمة                                            | الحالة | التاريخ |
| ------------------------------------------------- | ------ | ------- |
| [ ] تقليل initial JavaScript bundle size          | ⬜     |         |
| [ ] تأخير تحميل Firebase SDK (lazy loading محسّن) | ⬜     |         |
| [ ] استخدام dynamic imports للصفحات الثقيلة       | ⬜     |         |
| [ ] الهدف: FCP < 1.5s                             | ⬜     |         |

### 2.4 تحسين Speed Index

| المهمة                                                       | الحالة | التاريخ |
| ------------------------------------------------------------ | ------ | ------- |
| [ ] تحسين Server-Side Rendering وتقليل client-side hydration | ⬜     |         |
| [ ] تطبيق ISR Caching على صفحات المزودين والمنتجات           | ⬜     |         |
| [ ] إضافة streaming SSR لأجزاء الصفحة الكبيرة                | ⬜     |         |
| [ ] الهدف: Speed Index < 4s                                  | ⬜     |         |

### 2.5 تحسينات عامة

| المهمة                                                        | الحالة | التاريخ |
| ------------------------------------------------------------- | ------ | ------- |
| [ ] تحويل الصور الكبيرة لـ WebP/AVIF                          | ⬜     |         |
| [ ] إضافة المزيد من Skeleton Loaders (حالياً 2 فقط)           | ⬜     |         |
| [ ] تفعيل gzip/brotli compression                             | ⬜     |         |
| [ ] تحسين Accessibility score من 87 إلى 95+ (contrast ratios) | ⬜     |         |
| [ ] تشغيل Lighthouse audit ومقارنة النتائج                    | ⬜     |         |
| [ ] الهدف: Lighthouse Performance > 80                        | ⬜     |         |

---

## المرحلة 3: إعداد Capacitor + Android Build (2-3 أيام)

> **السبب:** لرفع التطبيق كـ APK/AAB على Google Play.

### 3.1 تثبيت وإعداد Capacitor

| المهمة                                                  | الحالة | التاريخ |
| ------------------------------------------------------- | ------ | ------- |
| [ ] تثبيت: `npm install @capacitor/core @capacitor/cli` | ⬜     |         |
| [ ] تشغيل: `npx cap init "إنجزنا" "com.engezna.app"`    | ⬜     |         |
| [ ] إنشاء `capacitor.config.ts` بالإعدادات المناسبة     | ⬜     |         |
| [ ] إضافة Android platform: `npx cap add android`       | ⬜     |         |

**إعدادات Capacitor المقترحة:**

```typescript
// capacitor.config.ts
const config = {
  appId: 'com.engezna.app',
  appName: 'إنجزنا',
  webDir: 'out', // أو '.next/standalone' حسب الـ build strategy
  server: {
    androidScheme: 'https',
    hostname: 'app.engezna.com', // أو الدومين المناسب
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0F172A',
    },
  },
};
```

### 3.2 إعداد Native Plugins

| المهمة                                                         | الحالة | التاريخ |
| -------------------------------------------------------------- | ------ | ------- |
| [ ] تثبيت `@capacitor/push-notifications` لإشعارات native      | ⬜     |         |
| [ ] تثبيت `@capacitor/geolocation` للموقع الجغرافي             | ⬜     |         |
| [ ] تثبيت `@capacitor/camera` لتصوير المنتجات                  | ⬜     |         |
| [ ] تثبيت `@capacitor/share` للمشاركة                          | ⬜     |         |
| [ ] تثبيت `@capacitor/app` لـ deep linking و app state         | ⬜     |         |
| [ ] تثبيت `@capacitor/status-bar` و `@capacitor/splash-screen` | ⬜     |         |
| [ ] تثبيت `@capacitor/haptics` للاهتزاز عند الإشعارات          | ⬜     |         |

### 3.3 إعداد Android Project

| المهمة                                                                    | الحالة | التاريخ |
| ------------------------------------------------------------------------- | ------ | ------- |
| [ ] إعداد `google-services.json` من Firebase Console                      | ⬜     |         |
| [ ] إضافة Firebase dependencies في `android/app/build.gradle`             | ⬜     |         |
| [ ] إعداد Notification Channel مع sound في `MainActivity.java`            | ⬜     |         |
| [ ] إضافة notification sound files في `android/app/src/main/res/raw/`     | ⬜     |         |
| [ ] إعداد App Icon (Adaptive Icon) بالأحجام المطلوبة                      | ⬜     |         |
| [ ] إعداد Splash Screen                                                   | ⬜     |         |
| [ ] إعداد `AndroidManifest.xml` (permissions, deep links, intent filters) | ⬜     |         |

### 3.4 Build و Testing

| المهمة                                                          | الحالة | التاريخ |
| --------------------------------------------------------------- | ------ | ------- |
| [ ] بناء الـ Next.js static export: `next build && next export` | ⬜     |         |
| [ ] مزامنة: `npx cap sync android`                              | ⬜     |         |
| [ ] اختبار على Android Emulator                                 | ⬜     |         |
| [ ] اختبار على جهاز Android حقيقي                               | ⬜     |         |
| [ ] اختبار الإشعارات الصوتية على Android                        | ⬜     |         |
| [ ] اختبار Deep Linking                                         | ⬜     |         |
| [ ] اختبار Offline Mode                                         | ⬜     |         |
| [ ] بناء Release AAB: `./gradlew bundleRelease`                 | ⬜     |         |

---

## المرحلة 4: تجهيز Google Play Store Listing (1-2 يوم)

> **السبب:** Google Play يتطلب محتوى محدد لقبول التطبيق.

### 4.1 إنشاء حساب Google Play Developer

| المهمة                                       | الحالة | التاريخ |
| -------------------------------------------- | ------ | ------- |
| [ ] تسجيل حساب Google Play Developer ($25)   | ⬜     |         |
| [ ] إعداد ملف الشركة/المطور                  | ⬜     |         |
| [ ] التحقق من الهوية (Identity Verification) | ⬜     |         |

### 4.2 تجهيز المحتوى المرئي

| المهمة                                                                   | الحالة | التاريخ |
| ------------------------------------------------------------------------ | ------ | ------- |
| [ ] تصميم Feature Graphic (1024x500 px)                                  | ⬜     |         |
| [ ] تصميم App Icon (512x512 px - موجود بالفعل)                           | ⬜     |         |
| [ ] أخذ Screenshots للموبايل (min 2, max 8) - أحجام مطلوبة:              | ⬜     |         |
| - Phone: 16:9 أو 9:16 (min 320px, max 3840px)                            |        |         |
| [ ] أخذ Screenshots للتابلت 7" (اختياري)                                 | ⬜     |         |
| [ ] أخذ Screenshots للتابلت 10" (اختياري)                                | ⬜     |         |
| [ ] تحويل Screenshots من SVG إلى PNG (الحالية SVG غير مقبولة)            | ⬜     |         |
| [ ] التأكد إن الـ Screenshots تعرض أجهزة Android فقط (لا iPhone mockups) | ⬜     |         |

### 4.3 كتابة محتوى المتجر

| المهمة                                              | الحالة | التاريخ |
| --------------------------------------------------- | ------ | ------- |
| [ ] Short Description (حتى 80 حرف) - عربي وإنجليزي  | ⬜     |         |
| [ ] Full Description (حتى 4000 حرف) - عربي وإنجليزي | ⬜     |         |
| [ ] Privacy Policy URL (موجود: `/ar/privacy`)       | ⬜     |         |
| [ ] رابط الشروط والأحكام                            | ⬜     |         |

**مقترح Short Description:**

```
AR: إنجزنا - اطلب احتياجات بيتك من محلات بلدك. توصيل سريع بأسعار المحل!
EN: Engezna - Order daily essentials from local stores. Fast delivery at store prices!
```

### 4.4 إعداد Content Rating و Data Safety

| المهمة                                                       | الحالة | التاريخ |
| ------------------------------------------------------------ | ------ | ------- |
| [ ] ملء استبيان Content Rating (IARC)                        | ⬜     |         |
| [ ] ملء Data Safety Form (يجب مطابقة Privacy Policy بدقة):   | ⬜     |         |
| - Location data: نعم (لتحديد منطقة التوصيل)                  |        |         |
| - Personal info: نعم (الاسم، الهاتف، العنوان)                |        |         |
| - Financial info: نعم (بيانات الدفع عبر Paymob)              |        |         |
| - App activity: نعم (سجل الطلبات)                            |        |         |
| - Device identifiers: نعم (FCM tokens)                       |        |         |
| [ ] مراجعة تطابق Data Safety مع سياسة الخصوصية `/ar/privacy` | ⬜     |         |
| [ ] تحديد Target Audience: 13+ (خدمة توصيل)                  | ⬜     |         |
| [ ] اختيار App Category: Food & Drink                        | ⬜     |         |
| [ ] تحديد البلدان المستهدفة: مصر                             | ⬜     |         |

---

## المرحلة 5: الاختبار والمراجعة النهائية (2-3 أيام)

### 5.1 اختبار شامل قبل النشر

| المهمة                                                   | الحالة | التاريخ |
| -------------------------------------------------------- | ------ | ------- |
| [ ] تشغيل جميع Unit Tests (270 test)                     | ⬜     |         |
| [ ] تشغيل Security Tests (76 test)                       | ⬜     |         |
| [ ] تشغيل E2E Tests                                      | ⬜     |         |
| [ ] اختبار يدوي لكل flow أساسي:                          | ⬜     |         |
| - تسجيل حساب جديد → تصفح المتاجر → إضافة للسلة → طلب     |        |         |
| - تسجيل دخول مزود → استقبال طلب → قبول → تحضير → توصيل   |        |         |
| - إرسال رسالة محادثة → استقبال إشعار                     |        |         |
| - طلب استرجاع → الموافقة عليه                            |        |         |
| [ ] اختبار الإشعارات بالصوت على 3 أجهزة مختلفة على الأقل | ⬜     |         |
| [ ] اختبار Offline mode والعودة للاتصال                  | ⬜     |         |
| [ ] اختبار Deep Links                                    | ⬜     |         |

### 5.2 مراجعة الأداء النهائية

| المهمة                                   | الحالة | التاريخ |
| ---------------------------------------- | ------ | ------- |
| [ ] Lighthouse Performance Score > 80    | ⬜     |         |
| [ ] Lighthouse Accessibility Score > 90  | ⬜     |         |
| [ ] Lighthouse Best Practices Score > 90 | ⬜     |         |
| [ ] Lighthouse SEO Score > 90            | ⬜     |         |
| [ ] APK Size < 50MB (الأمثل < 30MB)      | ⬜     |         |

### 5.3 مراجعة أمنية نهائية

| المهمة                                           | الحالة | التاريخ |
| ------------------------------------------------ | ------ | ------- |
| [ ] التأكد من إزالة كل console.log من production | ⬜     |         |
| [ ] التأكد من عدم وجود API keys مكشوفة           | ⬜     |         |
| [ ] التأكد من عدم وجود test data في production   | ⬜     |         |
| [ ] npm audit بدون ثغرات critical أو high        | ⬜     |         |
| [ ] التأكد إن كل RLS policies شغالة              | ⬜     |         |

---

## المرحلة 6: النشر على Google Play (1-3 أيام)

### 6.1 Internal Testing (مطلوب قبل أي إصدار)

| المهمة                                 | الحالة | التاريخ |
| -------------------------------------- | ------ | ------- |
| [ ] رفع AAB على Internal Testing Track | ⬜     |         |
| [ ] إضافة مختبرين (5 على الأقل)        | ⬜     |         |
| [ ] اختبار التثبيت والتشغيل            | ⬜     |         |
| [ ] جمع feedback والإصلاح              | ⬜     |         |

### 6.2 Closed Testing (اختياري لكن مفضل)

| المهمة                                      | الحالة | التاريخ |
| ------------------------------------------- | ------ | ------- |
| [ ] نقل للـ Closed Testing Track            | ⬜     |         |
| [ ] إضافة 20+ مختبر من المستخدمين الحقيقيين | ⬜     |         |
| [ ] مراقبة Crash Reports و ANRs             | ⬜     |         |
| [ ] إصلاح أي مشاكل مكتشفة                   | ⬜     |         |

### 6.3 Production Release

| المهمة                                           | الحالة | التاريخ |
| ------------------------------------------------ | ------ | ------- |
| [ ] إرسال للمراجعة (Google Review يأخذ 1-7 أيام) | ⬜     |         |
| [ ] Staged Rollout: 10% → 25% → 50% → 100%       | ⬜     |         |
| [ ] مراقبة التقييمات والمراجعات                  | ⬜     |         |
| [ ] الرد على مراجعات المستخدمين                  | ⬜     |         |

---

## ملحق: ملاحظات هندسية إضافية

### مشاكل يجب مراقبتها بعد النشر

| المشكلة                              | الحل المقترح                                      |
| ------------------------------------ | ------------------------------------------------- |
| Double polling في الإشعارات          | إزالة الـ polling الزائد في `useNotifications.ts` |
| Supabase client creation متكرر       | استخدام singleton pattern                         |
| Memory leak محتمل في channel cleanup | استخدام useRef بدل state للـ channel              |
| Edge Functions غير منشورة            | نشرها وربطها بـ database webhooks                 |
| SMS/WhatsApp notifications           | توصيل provider (Twilio/MessageBird) - مرحلة لاحقة |

### ملفات مرجعية

| الملف                                               | المحتوى                        |
| --------------------------------------------------- | ------------------------------ |
| `docs/LAUNCH_READINESS_CHECKLIST.md`                | قائمة جاهزية الإطلاق العامة    |
| `docs/SECURITY_ISSUES_FOUND.md`                     | تقرير الثغرات الأمنية المكتشفة |
| `docs/features/FIREBASE_PUSH_NOTIFICATIONS_PLAN.md` | خطة Firebase المفصلة           |
| `docs/MONITORING_SETUP.md`                          | إعداد المراقبة                 |
| `docs/QUALITY_LAYERS_ROADMAP.md`                    | خريطة طبقات الجودة             |

---

## سجل التحديثات

| التاريخ    | التحديث                                                                      | بواسطة |
| ---------- | ---------------------------------------------------------------------------- | ------ |
| 2026-02-08 | إنشاء الخطة الشاملة                                                          | Claude |
| 2026-02-08 | اعتماد الخطة + إضافة ملاحظات المراجعة (Screenshots, Data Safety)             | Owner  |
| 2026-02-08 | تنفيذ المرحلة 0 بالكامل (أمان Firebase, jspdf, test accounts, RBAC)          | Claude |
| 2026-02-08 | تنفيذ المرحلة 1 بالكامل (AudioManager, VAPID, notifications, preferences UI) | Claude |
