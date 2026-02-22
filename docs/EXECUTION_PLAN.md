# خطة العمل التنفيذية - استكمال خطة النشر

## Engezna - Execution Plan for Remaining Phases

**تاريخ الإنشاء:** 2026-02-22
**الأساس:** `docs/APP_STORES_RELEASE_ROADMAP.md` + `docs/PRE_RELEASE_REVIEW_REPORT.md`

---

## ملخص الحالة الحالية

| المرحلة                        | الحالة     | النسبة |
| ------------------------------ | ---------- | ------ |
| المرحلة 0: إصلاحات أمنية       | ✅ مكتمل   | 100%   |
| المرحلة 1: الإشعارات والأصوات  | ✅ مكتمل   | 100%   |
| المرحلة 1.5: إصلاحات حرجة      | ✅ مكتمل   | 100%   |
| المرحلة 2: تحسين الأداء        | 🔄 جاري    | ~85%   |
| المرحلة 3: Capacitor + Android | ⬜ لم يبدأ | 0%     |
| المرحلة 3B: iOS Build          | ⬜ لم يبدأ | 0%     |
| المرحلة 4+4B: Store Listings   | ⬜ لم يبدأ | 0%     |
| المرحلة 5: الاختبار النهائي    | ⬜ لم يبدأ | 0%     |
| المرحلة 6+6B: النشر            | ⬜ لم يبدأ | 0%     |

---

## خطة التنفيذ المقترحة

### المجموعة 1: إكمال المرحلة 2 + تنظيف الكود (يمكن تنفيذه فوراً بالكود)

#### 1.1 تنظيف console.log من client-side (70 مكان في 12 ملف)

| #   | الملف                                                    | المطلوب                              | عدد التغييرات |
| --- | -------------------------------------------------------- | ------------------------------------ | ------------- |
| 1   | `src/lib/ai/agentTools.ts`                               | حذف 24 debug log + تحويل 2 لـ logger | 26            |
| 2   | `src/lib/ai/agentHandler.ts`                             | حذف 10 debug logs                    | 10            |
| 3   | `src/lib/utils/excel-import.ts`                          | حذف 11 debug logs                    | 11            |
| 4   | `src/hooks/useBadge.ts`                                  | تحويل 4 لـ logger.info               | 4             |
| 5   | `src/app/sw.ts`                                          | تحويل 4 لـ logger.info               | 4             |
| 6   | `src/components/customer/support/RefundRequestModal.tsx` | حذف 1 + تحويل 3 لـ logger            | 4             |
| 7   | `src/hooks/useAIChat.ts`                                 | حذف 1                                | 1             |
| 8   | `src/components/custom-order/CustomOrderInterface.tsx`   | حذف 3                                | 3             |
| 9   | `src/components/custom-order/BroadcastComparison.tsx`    | حذف 1                                | 1             |
| 10  | `src/app/[locale]/orders/[id]/payment-result/page.tsx`   | تحويل 2 لـ logger                    | 2             |
| 11  | `src/lib/firebase/generate-sw.ts`                        | تقييم (build script)                 | 1             |
| 12  | `src/lib/logger/index.ts`                                | تقييم (logger ذاته)                  | 1             |

#### 1.2 تحويل `<img>` لـ `next/image` في الصفحات الرئيسية

33 ملف يستخدم `<img>` خام. الأولوية:

- **عالية (صفحات العميل):** cart, orders, search, custom-order (4 ملفات)
- **متوسطة (صفحات المزود):** products, refunds, complete-profile (4 ملفات)
- **منخفضة (صفحات الأدمن):** 13+ ملف - يمكن تأجيلها

#### 1.3 إكمال مهام الأداء المتبقية

| #   | المهمة                     | التفاصيل                                                        |
| --- | -------------------------- | --------------------------------------------------------------- |
| 1   | ضغط البانر الرئيسي         | البانرات تُخزن في Supabase Storage - الضغط يجب أن يتم عند الرفع |
| 2   | إضافة `.lighthouserc.json` | لتشغيل Lighthouse CI بشكل آلي                                   |
| 3   | ISR لصفحات إضافية          | حالياً فقط providers (2 صفحة) - يمكن إضافة categories, home     |
| 4   | تحسين Speed Index          | streaming SSR للأجزاء الثقيلة                                   |

---

### المجموعة 2: إعداد Capacitor + Android (المرحلة 3)

#### 2.1 تثبيت وإعداد Capacitor

| #   | الخطوة                       | الأمر/التفاصيل                                   |
| --- | ---------------------------- | ------------------------------------------------ |
| 1   | تثبيت Capacitor Core         | `npm install @capacitor/core @capacitor/cli`     |
| 2   | تهيئة Capacitor              | `npx cap init "إنجزنا" "com.engezna.app"`        |
| 3   | إنشاء `capacitor.config.ts`  | Hybrid App config مع `server.url` يشير لـ Vercel |
| 4   | إضافة `output: 'standalone'` | في `next.config.ts`                              |

#### 2.2 تثبيت Native Plugins

| #   | Plugin                          | السبب                    |
| --- | ------------------------------- | ------------------------ |
| 1   | `@capacitor/push-notifications` | إشعارات native           |
| 2   | `@capacitor/geolocation`        | الموقع الجغرافي          |
| 3   | `@capacitor/camera`             | تصوير المنتجات           |
| 4   | `@capacitor/share`              | المشاركة                 |
| 5   | `@capacitor/app`                | Deep linking + app state |
| 6   | `@capacitor/status-bar`         | تخصيص شريط الحالة        |
| 7   | `@capacitor/splash-screen`      | شاشة البداية             |
| 8   | `@capacitor/haptics`            | اهتزاز عند الإشعارات     |
| 9   | `@capacitor/keyboard`           | تحسين الكيبورد (iOS)     |

#### 2.3 إضافة Platform Detection

إنشاء `src/lib/platform/index.ts`:

- `isNativePlatform()` - هل التطبيق يعمل في Capacitor
- `isAndroid()` / `isIOS()` / `isWeb()`
- تحويل Push Notifications لتستخدم native plugin عند توفره
- تحويل Geolocation لتستخدم native plugin عند توفره

#### 2.4 إعداد Android Project

| #   | الخطوة                       | التفاصيل                                     |
| --- | ---------------------------- | -------------------------------------------- |
| 1   | `npx cap add android`        | إنشاء مشروع Android                          |
| 2   | إعداد `google-services.json` | **يحتاج: المالك يحمّله من Firebase Console** |
| 3   | إعداد `AndroidManifest.xml`  | أذونات + deep links + intent filters         |
| 4   | إعداد Notification Channel   | مع ملفات الصوت في `res/raw/`                 |
| 5   | إعداد Adaptive Icon          | من الأيقونات الموجودة (192x192, 512x512)     |
| 6   | إعداد Splash Screen          | بألوان العلامة التجارية                      |

---

### المجموعة 3: إعداد iOS (المرحلة 3B) - بالتوازي مع Android

> **ملاحظة:** هذه المجموعة تحتاج macOS + Xcode. بعض الخطوات يمكن تنفيذها في الكود الآن.

#### 3.1 متطلبات Apple الإلزامية (كود يمكن تنفيذه الآن)

| #   | المتطلب            | الحالة          | التفاصيل                                                                |
| --- | ------------------ | --------------- | ----------------------------------------------------------------------- |
| 1   | حذف الحساب         | ✅ **موجود**    | `src/app/api/auth/delete-account/route.ts` + UI في profile/account      |
| 2   | Sign in with Apple | ❌ **مطلوب**    | يوجد Google Sign In → Apple تُلزم بإضافة Apple Sign In                  |
| 3   | Facebook Login     | ⚠️ موجود كـ API | يوجد `/api/auth/facebook/callback` (150 سطر) لكن غير ظاهر في login page |
| 4   | Privacy Policy     | ✅ **موجود**    | `/ar/privacy`                                                           |
| 5   | HTTPS فقط          | ✅ **موجود**    | Vercel enforces HTTPS                                                   |

#### 3.2 Sign in with Apple - التنفيذ المطلوب

| #   | الخطوة                        | التفاصيل                                         |
| --- | ----------------------------- | ------------------------------------------------ |
| 1   | إعداد Supabase Apple Provider | في Supabase Dashboard → Auth → Providers → Apple |
| 2   | إنشاء Apple Service ID        | في Apple Developer Portal                        |
| 3   | إنشاء Sign in with Apple Key  | في Apple Developer Portal                        |
| 4   | إضافة زر "Sign in with Apple" | في `src/app/[locale]/auth/login/page.tsx`        |
| 5   | إنشاء Apple Auth API route    | `/api/auth/apple/route.ts`                       |
| 6   | اختبار التدفق الكامل          | Register → Login → Profile                       |

#### 3.3 خطوات تحتاج المالك (خارج الكود)

| #   | المتطلب                    | المطلوب من المالك                           |
| --- | -------------------------- | ------------------------------------------- |
| 1   | Apple Developer Account    | تسجيل ($99/سنة) + تحقق من الهوية (1-3 أيام) |
| 2   | `GoogleService-Info.plist` | تحميل من Firebase Console                   |
| 3   | APNs Authentication Key    | إنشاء من Apple Developer Portal             |
| 4   | رفع APNs Key لـ Firebase   | في Project Settings → Cloud Messaging       |
| 5   | macOS + Xcode 15+          | لبناء iOS واختباره                          |

---

### المجموعة 4: محتوى المتاجر (المرحلة 4 + 4B) - بالتوازي

#### 4.1 مهام كود

| #   | المهمة                          | التفاصيل                        |
| --- | ------------------------------- | ------------------------------- |
| 1   | تحويل Screenshots من SVG لـ PNG | 4 screenshots في `/public/`     |
| 2   | إنشاء Feature Graphic           | 1024x500px لـ Google Play       |
| 3   | تحضير Store Descriptions        | Short + Full بالعربي والإنجليزي |

#### 4.2 مهام تحتاج المالك

| #   | المهمة                      | التفاصيل                           |
| --- | --------------------------- | ---------------------------------- |
| 1   | تسجيل Google Play Developer | $25 (مرة واحدة)                    |
| 2   | أخذ Screenshots حقيقية      | من التطبيق الفعلي على أجهزة حقيقية |
| 3   | ملء Data Safety Form        | مطابقة لـ Privacy Policy           |
| 4   | ملء App Privacy Labels      | في App Store Connect               |
| 5   | إنشاء Demo Account          | لفريق مراجعة Apple                 |

---

### المجموعة 5: CI/CD Pipeline (إضافة جديدة - غير موجودة في الخطة الأصلية)

| #   | المهمة                        | التفاصيل                       |
| --- | ----------------------------- | ------------------------------ |
| 1   | GitHub Actions: Android Build | بناء AAB تلقائي عند push       |
| 2   | GitHub Actions: Lighthouse CI | قياس الأداء تلقائي             |
| 3   | iOS Build (اختياري)           | Codemagic أو Bitrise لبناء IPA |

---

### المجموعة 6: App Update Mechanism (إضافة جديدة)

| #   | المهمة                 | التفاصيل                           |
| --- | ---------------------- | ---------------------------------- |
| 1   | Version Check API      | `/api/app/version` يرجع أحدث إصدار |
| 2   | Force Update Dialog    | يظهر عند وجود تحديث إلزامي         |
| 3   | Graceful Update Prompt | يظهر عند وجود تحديث اختياري        |

---

## ترتيب التنفيذ المقترح

```
الأسبوع 1: المجموعة 1 (إكمال الأداء + تنظيف الكود)
├── 1.1 تنظيف console.log (70 مكان)
├── 1.2 تحويل <img> لـ next/image (أهم 8 ملفات)
├── 1.3 إعداد Lighthouse CI config
└── 1.3 ISR لصفحات إضافية

الأسبوع 2: المجموعة 2 (Capacitor + Android)
├── 2.1 تثبيت وإعداد Capacitor
├── 2.2 تثبيت Native Plugins
├── 2.3 Platform Detection code
└── 2.4 إعداد Android Project

الأسبوع 2 (بالتوازي): المجموعة 3.1 (كود iOS)
├── Sign in with Apple implementation
└── App Update Mechanism

الأسبوع 3: المجموعة 4 (Store Content) + المجموعة 5 (CI/CD)
├── تحضير محتوى المتجرين
├── GitHub Actions workflows
└── Screenshots تحويل وإعداد

الأسبوع 4+: المجموعة 3.2-3.3 (iOS Native) - يحتاج macOS
├── Apple Developer Account (المالك)
├── Xcode project setup
├── APNs configuration
└── TestFlight testing
```

---

## ما يمكن تنفيذه الآن (بدون تدخل المالك)

1. ✅ تنظيف console.log (70 مكان)
2. ✅ تحويل `<img>` لـ `next/image` (أهم الملفات)
3. ✅ إعداد `.lighthouserc.json`
4. ✅ تثبيت وإعداد Capacitor
5. ✅ تثبيت Native Plugins
6. ✅ إنشاء Platform Detection module
7. ✅ إعداد `capacitor.config.ts`
8. ✅ إضافة `output: 'standalone'`
9. ✅ إعداد Android project structure
10. ✅ إعداد Android Manifest + permissions
11. ✅ إنشاء Sign in with Apple API route + UI
12. ✅ إنشاء App Version Check API
13. ✅ إعداد GitHub Actions workflows
14. ✅ تحضير محتوى المتاجر (descriptions, keywords)

## ما يحتاج تدخل المالك

1. ⬜ `google-services.json` من Firebase Console
2. ⬜ تسجيل Google Play Developer Account ($25)
3. ⬜ تسجيل Apple Developer Account ($99/سنة)
4. ⬜ `GoogleService-Info.plist` من Firebase Console
5. ⬜ APNs Authentication Key من Apple Developer
6. ⬜ إعداد Apple Sign In في Supabase Dashboard
7. ⬜ macOS + Xcode للبناء والاختبار
8. ⬜ أخذ Screenshots حقيقية من الأجهزة
9. ⬜ إنشاء Demo Account لفريق Apple Review
10. ⬜ ملء Data Safety Form + App Privacy Labels
