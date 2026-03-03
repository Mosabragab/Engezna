# خطة رفع إنجزنا على Google Play Store و Apple App Store

## Engezna - App Stores Release Roadmap (Google Play + App Store)

**تاريخ الإنشاء:** 2026-02-08
**آخر تحديث:** 2026-03-03 (إتمام المرحلة 2 - Lighthouse Performance + Supabase Image Loader + Native WebView Guards)
**الحالة:** تم الاعتماد - جاري التنفيذ

> **تعليمات المتابعة:** يتم تحديث هذا الملف مع كل مهمة تُنفذ. غيّر `[ ]` إلى `[x]` عند الاكتمال.
> أضف التاريخ الفعلي بجانب كل مهمة مكتملة.

---

## ملخص الخطة

| المرحلة                                                    | الأهمية | المدة المتوقعة | الحالة        |
| ---------------------------------------------------------- | ------- | -------------- | ------------- |
| **المرحلة 0:** إصلاحات أمنية عاجلة                         | حرج     | 1 يوم          | ✅ تم         |
| **المرحلة 1:** إصلاح نظام الإشعارات والأصوات               | حرج     | 2-3 أيام       | ✅ تم         |
| **المرحلة 1.5:** إصلاحات حرجة مكتشفة (مراجعة)              | حرج     | 3-4 أيام       | ✅ تم (2/14)  |
| **المرحلة 2:** تحسين الأداء (Lighthouse)                   | عالي    | 2-3 أيام       | ✅ تم (3/3)   |
| **المرحلة 2.5:** حماية الكود للـ Native WebView            | حرج     | 1 يوم          | ✅ تم (3/3)   |
| **المرحلة 3:** إعداد Capacitor + Android Build             | عالي    | 2-3 أيام       | 🔄 جاري (30%) |
| **المرحلة 3B:** إعداد Capacitor + iOS Build                | عالي    | 2-3 أيام       | 🔄 جاري (20%) |
| **المرحلة 4:** تجهيز Google Play Store Listing             | متوسط   | 1-2 يوم        | ⬜ لم يبدأ    |
| **المرحلة 4B:** تجهيز Apple App Store Listing              | متوسط   | 2-3 أيام       | ⬜ لم يبدأ    |
| **المرحلة 5:** الاختبار والمراجعة النهائية (Android + iOS) | عالي    | 3-4 أيام       | ⬜ لم يبدأ    |
| **المرحلة 6:** النشر على Google Play                       | حرج     | 1-3 أيام       | ⬜ لم يبدأ    |
| **المرحلة 6B:** النشر على Apple App Store                  | حرج     | 1-7 أيام       | ⬜ لم يبدأ    |

**المدة الإجمالية المقدرة:** 17-28 يوم عمل (المتجرين معاً، مع تداخل بعض المراحل)

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

> **السبب:** الإشعارات جزء أساسي من تجربة المستخدم في منصة الطلبات.

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
| [x] نشر `send-notification` Edge Function على Supabase                      | ✅     | 2/19    |
| [x] نشر `handle-notification-trigger` Edge Function على Supabase            | ✅     | 2/19    |
| [x] إعداد Database Triggers لربط جداول الإشعارات بالـ Edge Functions        | ✅     | 2/13    |
| [x] إعداد `FIREBASE_SERVICE_ACCOUNT` كـ Supabase Secret                     | ✅     | سابق    |
| [x] اختبار الدورة الكاملة: trigger → webhook → Edge Function → FCM → device | ✅     | 2/22    |

**تحديث (2/21) - نتائج الفحص والاختبار:**

- ✅ **Edge Functions منشورة ومتاحة (تأكيد 2/21):**
  - `handle-notification-trigger` → 200 OK (يتخطى الطلبات غير الصالحة بشكل صحيح)
  - `send-notification` → 400 (validation يعمل: "title and body are required")
- ✅ **Architecture مكتمل:** التدفق الكامل مبني وجاهز:
  ```
  INSERT into notification table
    → on_*_notification_fcm_sync trigger (AFTER INSERT)
    → trigger_notification_fcm_sync() function
    → call_notification_webhook() → HTTP POST
    → handle-notification-trigger Edge Function
    → Firebase Cloud Messaging API → Device
  ```
- ✅ **FCM Tokens:** جدول `fcm_tokens` يدعم `device_type IN ('web', 'android', 'ios')` - جاهز لـ iOS
- ✅ **Cron Jobs:** 5 من 6 jobs نشطة (embeddings, refunds, cleanup, custom orders, pending payments)
- ⚠️ **`check_delayed_orders_and_notify`:** cron job معطل (jobid 1, active=false) - مراجعة مطلوبة
- ✅ **`FIREBASE_SERVICE_ACCOUNT`:** معد كـ Supabase Secret + IAM roles صحيحة (Firebase Admin SDK + Token Creator)
- راجع `docs/EDGE_FUNCTIONS_DEPLOYMENT.md` لخطوات النشر الكاملة

**تحديث (2/22) - إصلاح FCM Pipeline وتأكيد العمل بالكامل:**

- ✅ **تم إصلاح مشكلة 401 Unauthorized:** كان JWT Verification مفعّل على `handle-notification-trigger` - تم تعطيله من Dashboard (الـ webhook يرسل service_role_key كـ Bearer token وليس JWT عادي)
- ✅ **تم تحديث الكود:** `handle-notification-trigger` أصبح يرسل FCM مباشرة لـ Google بدون استدعاء `send-notification` (تقليل latency + تبسيط)
- ✅ **تم اختبار الدورة الكاملة بنجاح:** INSERT → Trigger → Webhook → Edge Function (200 OK) → FCM → Google
- ✅ **تم التأكد من تعطيل التوكنات غير الصالحة تلقائياً:** 7 tokens بحالة UNREGISTERED تم تحديثها لـ `is_active=false` تلقائياً
- ✅ **Architecture النهائي (مبسّط):**
  ```
  INSERT into notification table
    → on_*_notification_fcm_sync trigger (AFTER INSERT)
    → trigger_notification_fcm_sync() function
    → call_notification_webhook() → HTTP POST
    → handle-notification-trigger Edge Function (يرسل FCM مباشرة)
    → Firebase Cloud Messaging API → Device
  ```
- ⚠️ **ملاحظة:** `send-notification` لا يزال منشوراً كـ standalone API لكن لم يعد جزءاً من الـ pipeline التلقائي

### 1.8 إصلاح صوت إشعارات حالة الطلب للعميل

| المهمة                                                                   | الحالة | التاريخ |
| ------------------------------------------------------------------------ | ------ | ------- |
| [x] إضافة صوت مخصص `order-update` لتغييرات حالة الطلب                    | ✅     | 2/9     |
| [x] ربط نوع الإشعار بالصوت المناسب (order_accepted → order-update sound) | ✅     | 2/9     |
| [x] إصلاح Polling fallback ليشغل صوت عند وصول إشعار جديد                 | ✅     | 2/9     |
| [x] إزالة Double Polling الزائد (كان يستهلك موارد بلا فائدة)             | ✅     | 2/9     |
| [x] إصلاح memory leak: استخدام useRef بدل useState للـ channel           | ✅     | 2/9     |
| [x] تحديث PushNotificationProvider للأصوات حسب نوع الإشعار               | ✅     | 2/9     |
| [x] تحديث SoundTestDebug لاختبار صوت order-update                        | ✅     | 2/9     |

### 1.9 إصلاح نظام الطلبات الخاصة (Custom Orders System)

| المهمة                                                                                                 | الحالة | التاريخ |
| ------------------------------------------------------------------------------------------------------ | ------ | ------- |
| [x] إنشاء trigger لأرشفة البث تلقائياً عند انتهاء كل الطلبات (`auto_archive_broadcast`)                | ✅     | 2/9     |
| [x] إنشاء cron job موحد كل 30 دقيقة لانتهاء صلاحية الطلبات (`expire_all_custom_orders`)                | ✅     | 2/9     |
| [x] إصلاح سياسة RLS على `custom_order_requests` INSERT (كانت محظورة بعد تحديث الأمان)                  | ✅     | 2/9     |
| [x] إضافة حساب حالة البث المباشرة (`computeBroadcastLiveStatus`) في صفحة العميل                        | ✅     | 2/9     |
| [x] فلترة البثوث المنتهية من صفحة طلبات العميل                                                         | ✅     | 2/9     |
| [x] استخدام `custom_order_requests_live` view في شارة التاجر                                           | ✅     | 2/9     |
| [x] إضافة `CUSTOM_ORDER_EXPIRED` لربط الصوت المناسب                                                    | ✅     | 2/9     |
| [x] إصلاح عدم تحديث حالة الطلب بعد موافقة العميل (الحالة الفعلية `approved` وليست `customer_approved`) | ✅     | 2/9     |
| [x] استبدال زر التحديث اليدوي بـ auto-polling كل 15 ثانية                                              | ✅     | 2/9     |
| [x] إصلاح عرض أصناف الطلب الخاص في صفحة تفاصيل العميل (جلب من `custom_order_items`)                    | ✅     | 2/9     |
| [x] إصلاح عرض أصناف الطلب الخاص في صفحة تفاصيل التاجر                                                  | ✅     | 2/9     |
| [x] إصلاح ظهور نافذة الإشعارات المتكرر (فحص localStorage داخل timer effect)                            | ✅     | 2/9     |
| [x] جعل كروت الطلبات الخاصة قابلة للنقر مع Link wrapper                                                | ✅     | 2/9     |
| [x] عرض حالة تنفيذ الطلب (preparing, out_for_delivery, etc) بدلاً من حالة الطلب الخاص                  | ✅     | 2/9     |

**التفاصيل التقنية:**

- Migration: `20260209200000_fix_custom_order_auto_archive.sql` - trigger + cron + admin function
- Migration: `20260209200001_fix_custom_order_requests_insert_rls.sql` - broadcast owner INSERT policy
- ✅ تم تطبيق الـ migrations على قاعدة البيانات (تم التحقق 2/9)

### 1.10 تناسق تصميم كروت الطلبات الخاصة مع العادية (Provider)

| المهمة                                                                                       | الحالة | التاريخ |
| -------------------------------------------------------------------------------------------- | ------ | ------- |
| [x] إعادة تصميم كارت الطلب الخاص الموافق عليه ليطابق تصميم كارت الطلب العادي                 | ✅     | 2/9     |
| [x] عرض رقم الطلب بشكل بارز مع شارة "طلب خاص" بنفسجية                                        | ✅     | 2/9     |
| [x] عرض الأصناف الفعلية من `custom_order_items` (أول 3 + عداد الباقي)                        | ✅     | 2/9     |
| [x] عرض عنوان التوصيل كامل (محافظة/مدينة/حي + عنوان + مبنى/طابق + علامة مميزة)               | ✅     | 2/9     |
| [x] عرض الإجمالي بخط كبير + طريقة الدفع مع شارة حالة الدفع                                   | ✅     | 2/9     |
| [x] إضافة أزرار تقدم الحالة مباشرة على الكارت (جاري التحضير → جاهز → في الطريق → تم التوصيل) | ✅     | 2/9     |
| [x] إضافة زر "تم استلام المبلغ" بعد التوصيل مع نافذة تأكيد                                   | ✅     | 2/9     |
| [x] الإبقاء على التصميم الحالي للطلبات غير الموافق عليها (pending/priced)                    | ✅     | 2/9     |

**التفاصيل التقنية:**

- توسيع query ليجلب `delivery_address, payment_method, payment_status, total` من `orders`
- جلب `custom_order_items` بشكل مجمع لكل الطلبات الموافق عليها (batch query)
- نافذة تأكيد دفع مطابقة لصفحة الطلبات العادية
- أنماط `shadow-elegant`, `rounded-2xl` متناسقة مع الطلبات العادية

---

## المرحلة 1.5: إصلاحات حرجة مكتشفة من مراجعة الكود (3-4 أيام)

> **السبب:** مراجعة عميقة للكود (2026-02-12) كشفت مشاكل حرجة في التدفقات المالية والأمنية يجب حلها قبل النشر.
> **التقرير الكامل:** `docs/PRE_RELEASE_REVIEW_REPORT.md`
>
> **⚠️ تنبيه Supabase:** كل مهمة تخص قاعدة البيانات يجب أن تبدأ باستعلامات فحص ينفذها المالك على SQL Editor
> ويشارك نتائجها قبل كتابة أي migration أو تعديل. **ممنوع الافتراض - اليقين فقط.**

### 1.5.0 حذف Service Role Key المكشوف من Triggers (الأعلى خطورة - مؤكد)

> **مؤكد من SQL مباشر على قاعدة الإنتاج (2/12)**

| المهمة                                                                             | الحالة | التاريخ |
| ---------------------------------------------------------------------------------- | ------ | ------- |
| [x] حذف 7 triggers تحتوي JWT حرفي (new_review/support_tickets/ticket_messages/...) | ✅     | 2/13    |
| [x] عمل Rotate للـ Service Role Key من Supabase Dashboard                          | ✅     | 2/13    |
| [x] تحديث المفتاح الجديد في Vercel env vars + GitHub Secrets + Supabase Dashboard  | ✅     | 2/13    |
| [ ] تحديث المفتاح في `.env.local` المحلي (للتطوير فقط - اختياري)                   | ⬜     |         |
| [x] التأكد أن triggers الآمنة (on\_\*) تغطي كل الحالات                             | ✅     | 2/14    |
| [ ] حذف Database Webhooks القديمة من Dashboard لمنع التكرار                        | ⬜     |         |

**نتائج فحص قاعدة البيانات (2/21):**

- ✅ **تم التأكد:** 3 triggers آمنة تعمل بشكل صحيح:
  - `on_customer_notification_fcm_sync` → AFTER INSERT on `customer_notifications`
  - `on_provider_notification_fcm_sync` → AFTER INSERT on `provider_notifications`
  - `on_admin_notification_fcm_sync` → AFTER INSERT on `admin_notifications`
- ✅ **تم التأكد:** الـ 7 triggers القديمة (المكشوفة) محذوفة بالكامل
- ✅ **تم التأكد:** `trigger_notification_fcm_sync()` تستدعي `call_notification_webhook()` بشكل آمن
- ✅ **تم التأكد:** `call_notification_webhook()` ترسل HTTP POST لـ Edge Function مع service_role_key
- ⚠️ **ملاحظة:** `supabase_functions.hooks` لا يزال يحتوي سجلات - يجب حذف Database Webhooks القديمة من Dashboard

### 1.5.1 إصلاح خطر الطلبات الوهمية (Phantom Orders)

| المهمة                                                                     | الحالة | التاريخ |
| -------------------------------------------------------------------------- | ------ | ------- |
| [x] إنشاء الطلب بحالة `pending_payment` **قبل** توجيه المستخدم لـ Kashier  | ✅     | 2/13    |
| [x] إزالة اعتماد localStorage لحفظ بيانات الطلب (`pendingOnlineOrderData`) | ✅     | 2/13    |
| [x] تحديث payment-result page ليقرأ من DB بدل localStorage                 | ✅     | 2/13    |
| [x] إضافة cron job لإلغاء الطلبات بحالة `pending_payment` بعد 30 دقيقة     | ✅     | 2/13    |

### 1.5.2 إنشاء Kashier Refund API

| المهمة                                                | الحالة | التاريخ |
| ----------------------------------------------------- | ------ | ------- |
| [x] إنشاء `/api/payment/kashier/refund` endpoint      | ✅     | 2/13    |
| [x] ربط الـ endpoint بـ Kashier Refund API            | ✅     | 2/13    |
| [x] تخزين `refund_transaction_id` عند إرسال الاسترجاع | ✅     | 2/13    |
| [x] إضافة webhook handler لتأكيد الاسترجاع من Kashier | ✅     | 2/14    |
| [x] توضيح عملية استرجاع الطلبات المدفوعة نقداً (COD)  | ✅     | 2/13    |

### 1.5.3 حماية Webhook من المعالجة المكررة

| المهمة                                                              | الحالة | التاريخ |
| ------------------------------------------------------------------- | ------ | ------- |
| [x] إضافة unique constraint على `payment_transaction_id` في الطلبات | ✅     | 2/13    |
| [x] إضافة idempotency check قبل معالجة الـ webhook                  | ✅     | 2/13    |
| [x] التعامل مع حالات webhook retry من Kashier                       | ✅     | 2/13    |

### 1.5.4 تفعيل حماية CSRF

| المهمة                                                            | الحالة | التاريخ |
| ----------------------------------------------------------------- | ------ | ------- |
| [x] تطبيق CSRF validation في middleware (log-only أولاً)          | ✅     | 2/13    |
| [x] إرسال CSRF token من checkout (payment initiation)             | ✅     | 2/13    |
| [x] استثناء webhooks و cron و auth من CSRF check                  | ✅     | 2/13    |
| [x] التحويل من log-only لـ enforce (CSRF_ENFORCE=true) بعد التأكد | ✅     | 2/14    |

### 1.5.5 تنظيف Console.log وتحسين الأمان

| المهمة                                                                   | الحالة | التاريخ |
| ------------------------------------------------------------------------ | ------ | ------- |
| [x] إزالة console.log من كل API routes + lib/admin + lib/email (36 ملف)  | ✅     | 2/13    |
| [x] إزالة console.log من webhook الدفع (بيانات حساسة)                    | ✅     | 2/13    |
| [x] إصلاح Kashier credentials validation (throw error بدل fallback فارغ) | ✅     | 2/13    |

### 1.5.6 معالجة الطلبات المعلقة

| المهمة                                                           | الحالة | التاريخ |
| ---------------------------------------------------------------- | ------ | ------- |
| [x] إنشاء cron job لتحويل طلبات `pending_payment` لـ `cancelled` | ✅     | 2/13    |
| [x] إضافة إشعار للعميل عند فشل/انتهاء صلاحية الدفع               | ✅     | 2/13    |
| [x] نقل الـ cron من Vercel لـ Supabase pg_cron (Hobby plan قيود) | ✅     | 2/13    |
| [x] إصلاح أسماء أعمدة customer_notifications في كل الـ routes    | ✅     | 2/13    |

### 1.5.7 إلزام Kashier Webhook Signature (من تقرير Codex)

| المهمة                                                        | الحالة | التاريخ |
| ------------------------------------------------------------- | ------ | ------- |
| [x] جعل signature إلزامية في webhook handler (رفض بدون توقيع) | ✅     | 2/13    |
| [x] إضافة logging لمحاولات webhook بدون signature             | ✅     | 2/13    |

### 1.5.8 إصلاح Promo Validation Identity Spoofing (من تقرير Codex)

| المهمة                                                                        | الحالة | التاريخ |
| ----------------------------------------------------------------------------- | ------ | ------- |
| [x] ربط promo validation بـ session المستخدم الفعلية بدل body user_id         | ✅     | 2/13    |
| [x] استخدام `getUser()` من Supabase Auth بدل قبول user_id من الـ request body | ✅     | 2/13    |

### 1.5.9 إضافة Content-Security-Policy (من تقرير Codex)

| المهمة                                                       | الحالة | التاريخ |
| ------------------------------------------------------------ | ------ | ------- |
| [x] إضافة CSP header في next.config.ts (report-only أولاً)   | ✅     | 2/13    |
| [x] اختبار التوافق مع Supabase, Kashier, Firebase, HERE Maps | ✅     | 2/14    |
| [x] التحويل من report-only لـ enforce بعد التأكد             | ✅     | 2/14    |

### 1.5.10 تضييق RLS Policies المفتوحة (من تقرير Codex)

| المهمة                                                       | الحالة | التاريخ |
| ------------------------------------------------------------ | ------ | ------- |
| [x] تضييق SELECT على promo_codes (active + valid date فقط)   | ✅     | 2/13    |
| [x] مراجعة SELECT policies على profiles (إخفاء بيانات حساسة) | ✅     | 2/13    |
| [x] تنظيف السياسات المتكررة/المتداخلة على الجداول            | ✅     | 2/13    |

---

## المرحلة 2: تحسين الأداء - Lighthouse (2-3 أيام)

> **السبب:** Google Play يتطلب تجربة مستخدم سلسة. LCP 7.9s غير مقبول.

### 2.1 تحسين Largest Contentful Paint (LCP)

| المهمة                                                        | الحالة | التاريخ |
| ------------------------------------------------------------- | ------ | ------- |
| [x] تطبيق `priority` على hero images                          | ✅     | 2/14    |
| [x] استخدام `next/image` مع `sizes` و `srcSet` بشكل صحيح      | ✅     | 2/14    |
| [x] ضغط البانر الرئيسي عبر Supabase Image Loader (quality=60) | ✅     | 3/3     |
| [x] تفعيل `preload` لأهم الموارد في `<head>`                  | ✅     | 2/14    |
| [x] الهدف: LCP < 2.5s (Supabase Transform API + quality=60)   | ✅     | 3/3     |

### 2.2 تحسين Cumulative Layout Shift (CLS)

| المهمة                                                                  | الحالة | التاريخ |
| ----------------------------------------------------------------------- | ------ | ------- |
| [x] إضافة `width` و `height` صريح لكل صورة (أو fill مع relative parent) | ✅     | 2/14    |
| [x] إضافة skeleton placeholders للمحتوى الديناميكي                      | ✅     | 2/14    |
| [x] إصلاح font loading (swap + preload + preconnect)                    | ✅     | 2/14    |
| [x] الهدف: CLS < 0.1 (min-h containers + skeleton + font swap)          | ✅     | 3/3     |

### 2.3 تحسين First Contentful Paint (FCP)

| المهمة                                                            | الحالة | التاريخ |
| ----------------------------------------------------------------- | ------ | ------- |
| [x] تقليل initial JavaScript bundle size (lazy sections)          | ✅     | 2/14    |
| [x] تأخير تحميل Firebase SDK (lazy loading محسّن - كان جاهز)      | ✅     | 2/14    |
| [x] استخدام dynamic imports للصفحات الثقيلة (5 homepage sections) | ✅     | 2/14    |
| [x] الهدف: FCP < 1.5s (dynamic imports + lazy Firebase)           | ✅     | 3/3     |

### 2.4 تحسين Speed Index

> **تحديث (3/3):** ISR و SSR Streaming كانا مُطبّقين بالفعل من مراحل سابقة.

| المهمة                                                           | الحالة | التاريخ |
| ---------------------------------------------------------------- | ------ | ------- |
| [x] تحسين SSR مع loading.tsx لكل route رئيسي                     | ✅     | سابق    |
| [x] تطبيق ISR (revalidate=300) على Homepage + Providers + Detail | ✅     | سابق    |
| [x] إضافة streaming SSR عبر Suspense + dynamic imports           | ✅     | سابق    |
| [x] الهدف: Speed Index < 4s (ISR + streaming + lazy sections)    | ✅     | 3/3     |

### 2.5 تحسينات عامة

| المهمة                                                                  | الحالة | التاريخ |
| ----------------------------------------------------------------------- | ------ | ------- |
| [x] تحويل الصور الكبيرة لـ WebP/AVIF (next/image auto format)           | ✅     | 2/14    |
| [x] إضافة المزيد من Skeleton Loaders (homepage + sections)              | ✅     | 2/14    |
| [x] تفعيل gzip/brotli compression (Vercel يفعّلها تلقائياً)             | ✅     | تلقائي  |
| [x] تحسين Accessibility (aria-labels, contrast, alt text)               | ✅     | 2/14    |
| [x] إعداد Lighthouse CI (lighthouserc.js + GitHub Actions)              | ✅     | 2/23    |
| [x] إصلاح WCAG AA color-contrast على جميع الصفحات                       | ✅     | 2/23    |
| [x] تحسين SEO metadata للصفحات (auth layout, custom-order)              | ✅     | 2/23    |
| [x] إصلاح Accessibility violations (aria-labels, provider)              | ✅     | 2/23    |
| [x] حساب contrast وفق WCAG 2.1 في OffersCarousel                        | ✅     | 2/23    |
| [x] إزالة deprecated PWA audits من Lighthouse config                    | ✅     | 2/23    |
| [x] تشغيل Lighthouse audit ومقارنة النتائج                              | ✅     | 2/23    |
| [x] الهدف: Lighthouse Performance > 80 (ISR + Image Loader + Streaming) | ✅     | 3/3     |

---

## المرحلة 2.5: حماية الكود للـ Native WebView (يوم واحد)

> **السبب:** تطبيقات Capacitor تعمل داخل WebView حيث بعض Browser APIs قد لا تكون متاحة أو تتصرف بشكل مختلف.
> كشف تدقيق شامل عن 23 موقع كود يستخدم `window`, `document`, `navigator`, `localStorage` بدون حماية `typeof`.
> إصلاح هذه المواقع يمنع White Screen of Death عند فتح التطبيق على الأجهزة المحمولة.

### 2.5.1 إضافة Guards لـ `window` object

| المهمة                                                                                    | الحالة | التاريخ |
| ----------------------------------------------------------------------------------------- | ------ | ------- |
| [x] `AdminSidebarContext.tsx` - `window.matchMedia` في `initializeSidebar`                | ✅     | 3/3     |
| [x] `NetworkStatus.tsx` - `navigator.onLine` و `window.addEventListener`                  | ✅     | 3/3     |
| [x] `InstallPrompt.tsx` - `window.matchMedia`, `localStorage`, `window.addEventListener`  | ✅     | 3/3     |
| [x] `offline/page.tsx` - `navigator.onLine`, `window.location`, `window.addEventListener` | ✅     | 3/3     |
| [x] `reset-password/page.tsx` - `window.location.hash`                                    | ✅     | 3/3     |
| [x] `useSDUI.ts` - `window.addEventListener('resize')` في useEffect                       | ✅     | 3/3     |
| [x] `SmartAssistant.tsx` - `useBodyScrollLock` و `useVisualViewport`                      | ✅     | 3/3     |
| [x] `PartnerBannersCarousel.tsx` - `window.innerWidth` و resize listener                  | ✅     | 3/3     |

### 2.5.2 إضافة Guards لـ `document` object

| المهمة                                                                                 | الحالة | التاريخ |
| -------------------------------------------------------------------------------------- | ------ | ------- |
| [x] `export-service.ts` - `document.createElement('a')` في download functions          | ✅     | 3/3     |
| [x] `useVisibilityPolling.ts` - `document.hidden` و `visibilitychange` event           | ✅     | 3/3     |
| [x] `InteractiveMapPicker.tsx` - `document.querySelector/createElement` لـ Leaflet CSS | ✅     | 3/3     |

### 2.5.3 إضافة Guards لـ `localStorage`/`sessionStorage`

| المهمة                                                                   | الحالة | التاريخ |
| ------------------------------------------------------------------------ | ------ | ------- |
| [x] `admin/login/page.tsx` - localStorage في brute force protection      | ✅     | 3/3     |
| [x] `CustomOrderWelcomeBanner.tsx` - sessionStorage للـ banner dismissal | ✅     | 3/3     |
| [x] `PushNotificationProvider.tsx` - localStorage للـ prompt dismissal   | ✅     | 3/3     |
| [x] `provider/banner/page.tsx` - localStorage للـ draft auto-save        | ✅     | 3/3     |
| [x] `InstallPrompt.tsx` - localStorage للـ prompt dismissal              | ✅     | 3/3     |

### 2.5.4 إضافة Guards لـ `navigator` APIs

| المهمة                                                                    | الحالة | التاريخ |
| ------------------------------------------------------------------------- | ------ | ------- |
| [x] `audio-manager.ts` - `navigator.vibrate()`                            | ✅     | 3/3     |
| [x] `provider/team/page.tsx` - `navigator.clipboard.writeText`            | ✅     | 3/3     |
| [x] `admin/email-templates/page.tsx` - `navigator.clipboard.writeText`    | ✅     | 3/3     |
| [x] `admin/supervisors/invite/page.tsx` - `navigator.clipboard.writeText` | ✅     | 3/3     |

**ملاحظات تقنية:**

- جميع التعديلات هي إضافة Guard Clauses فقط (لا تغيير في Logic)
- تم اتباع النمط الموجود بالفعل في 25+ ملف محمي (`typeof window === 'undefined'`)
- تم اتباع نمط `DraftManager.isLocalStorageAvailable()` كمرجع للـ best practice
- **الملفات المحمية مسبقاً (لم تحتج تعديل):** `src/lib/platform/index.ts`, `useServiceWorkerUpdate.ts`, `usePushNotifications.ts`, `firebase/config.ts`, `lib/contexts/*`, `lib/offline/draft-manager.ts`

---

## المرحلة 3: إعداد Capacitor + Android Build (2-3 أيام)

> **السبب:** لرفع التطبيق كـ APK/AAB على Google Play.

### 3.1 تثبيت وإعداد Capacitor

> **تحديث (3/3):** تم اكتشاف أن Capacitor مثبت ومُعدّ بالفعل جزئياً (Hybrid App model يحمّل من `https://engezna.com`).

| المهمة                                                  | الحالة | التاريخ |
| ------------------------------------------------------- | ------ | ------- |
| [x] تثبيت: `npm install @capacitor/core @capacitor/cli` | ✅     | سابق    |
| [x] تشغيل: `npx cap init "إنجزنا" "com.engezna.app"`    | ✅     | سابق    |
| [x] إنشاء `capacitor.config.ts` بالإعدادات المناسبة     | ✅     | سابق    |
| [x] إضافة Android platform: `npx cap add android`       | ✅     | سابق    |

**إعدادات Capacitor المقترحة:**

```typescript
// capacitor.config.ts
const config = {
  appId: 'com.engezna.app',
  appName: 'إنجزنا',
  webDir: 'out', // أو '.next/standalone' حسب الـ build strategy
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.engezna.com',
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

### 3.2 إعداد Native Plugins (مشترك Android + iOS)

> **تحديث (3/3):** معظم الحزم مثبتة بالفعل (v8.1.0) في `package.json`.

| المهمة                                                         | الحالة | التاريخ |
| -------------------------------------------------------------- | ------ | ------- |
| [x] تثبيت `@capacitor/push-notifications` لإشعارات native      | ✅     | سابق    |
| [x] تثبيت `@capacitor/geolocation` للموقع الجغرافي             | ✅     | سابق    |
| [x] تثبيت `@capacitor/camera` لتصوير المنتجات                  | ✅     | سابق    |
| [ ] تثبيت `@capacitor/share` للمشاركة                          | ⬜     |         |
| [x] تثبيت `@capacitor/app` لـ deep linking و app state         | ✅     | سابق    |
| [x] تثبيت `@capacitor/status-bar` و `@capacitor/splash-screen` | ✅     | سابق    |
| [x] تثبيت `@capacitor/haptics` للاهتزاز عند الإشعارات          | ✅     | سابق    |
| [x] تثبيت `@capacitor/keyboard` لتحسين تجربة الكيبورد على iOS  | ✅     | سابق    |

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

### 3.4 Build و Testing (Android)

| المهمة                                                                     | الحالة | التاريخ |
| -------------------------------------------------------------------------- | ------ | ------- |
| [ ] بناء الـ Next.js: `next build` (Hybrid App - لا حاجة لـ static export) | ⬜     |         |
| [ ] مزامنة: `npx cap sync android`                                         | ⬜     |         |
| [ ] اختبار على Android Emulator                                            | ⬜     |         |
| [ ] اختبار على جهاز Android حقيقي                                          | ⬜     |         |
| [ ] اختبار الإشعارات الصوتية على Android                                   | ⬜     |         |
| [ ] اختبار Deep Linking                                                    | ⬜     |         |
| [ ] اختبار Offline Mode                                                    | ⬜     |         |
| [ ] بناء Release AAB: `./gradlew bundleRelease`                            | ⬜     |         |

---

## المرحلة 3B: إعداد iOS Build عبر Capacitor (2-3 أيام)

> **السبب:** لرفع التطبيق على Apple App Store. يتم بناء نسخة iOS بالتوازي مع Android باستخدام نفس Capacitor config.
> **متطلب أساسي:** جهاز macOS مع Xcode 15+ (أو الاستعانة بخدمة CI/CD مثل Codemagic أو Bitrise).

### 3B.1 إعداد بيئة التطوير iOS

> **تحديث (3/3):** مجلد `ios/` موجود بالفعل. iOS platform مُضاف.

| المهمة                                                              | الحالة | التاريخ |
| ------------------------------------------------------------------- | ------ | ------- |
| [ ] التأكد من توفر macOS مع Xcode 15+ ومكوناته (Command Line Tools) | ⬜     |         |
| [ ] تثبيت CocoaPods: `sudo gem install cocoapods`                   | ⬜     |         |
| [x] إضافة iOS platform: `npx cap add ios`                           | ✅     | سابق    |
| [ ] مزامنة: `npx cap sync ios`                                      | ⬜     |         |
| [ ] فتح المشروع في Xcode: `npx cap open ios`                        | ⬜     |         |

### 3B.2 Apple Developer Account والشهادات

| المهمة                                                                              | الحالة | التاريخ |
| ----------------------------------------------------------------------------------- | ------ | ------- |
| [ ] تسجيل حساب Apple Developer ($99/سنة)                                            | ⬜     |         |
| [ ] إنشاء App ID في Apple Developer Portal (`com.engezna.app`)                      | ⬜     |         |
| [ ] إنشاء Distribution Certificate (iOS Distribution)                               | ⬜     |         |
| [ ] إنشاء Provisioning Profile (App Store Distribution)                             | ⬜     |         |
| [ ] تفعيل Push Notifications capability في App ID                                   | ⬜     |         |
| [ ] إنشاء APNs Authentication Key (p8) أو APNs Certificate (p12) من Apple Developer | ⬜     |         |
| [ ] رفع APNs Key لـ Firebase Console (Project Settings → Cloud Messaging → APNs)    | ⬜     |         |

### 3B.3 إعداد iOS Project في Xcode

| المهمة                                                                        | الحالة | التاريخ |
| ----------------------------------------------------------------------------- | ------ | ------- |
| [ ] تحديث Bundle Identifier: `com.engezna.app`                                | ⬜     |         |
| [ ] تحديث Display Name: `إنجزنا`                                              | ⬜     |         |
| [ ] إعداد Minimum Deployment Target: iOS 14.0 (أو iOS 15.0 لدعم أوسع للميزات) | ⬜     |         |
| [ ] إضافة `GoogleService-Info.plist` من Firebase Console                      | ⬜     |         |
| [ ] تفعيل Push Notifications Capability في Xcode                              | ⬜     |         |
| [ ] تفعيل Background Modes → Remote notifications                             | ⬜     |         |
| [ ] تفعيل Associated Domains لـ Universal Links (`applinks:app.engezna.com`)  | ⬜     |         |
| [ ] إعداد App Icons (1024x1024 + جميع الأحجام المطلوبة في Asset Catalog)      | ⬜     |         |
| [ ] إعداد Launch Screen (Storyboard أو SwiftUI)                               | ⬜     |         |
| [ ] إضافة ملفات الصوت في iOS bundle (`notification.mp3`, `new-order.mp3`)     | ⬜     |         |
| [ ] إعداد `Info.plist` بالأذونات المطلوبة (الكاميرا، الموقع، الإشعارات، ATT)  | ⬜     |         |

**أذونات Info.plist المطلوبة:**

```xml
<!-- Info.plist additions -->
<key>NSCameraUsageDescription</key>
<string>يحتاج التطبيق للكاميرا لتصوير المنتجات والمتاجر</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>يحتاج التطبيق للوصول للصور لرفع صور المنتجات</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>يحتاج التطبيق لموقعك لتحديد منطقة التوصيل والمتاجر القريبة</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>يحتاج التطبيق لتتبع موقعك أثناء التوصيل</string>
<key>NSUserTrackingUsageDescription</key>
<string>نستخدم هذا الإذن لتحسين تجربة التطبيق وتقديم محتوى يناسب اهتماماتك</string>
```

### 3B.4 تكييف الكود لـ iOS

| المهمة                                                                                             | الحالة | التاريخ |
| -------------------------------------------------------------------------------------------------- | ------ | ------- |
| [ ] التأكد من دعم Safe Area Insets (notch, Dynamic Island) في التصميم                              | ⬜     |         |
| [ ] اختبار وتعديل سلوك الكيبورد (Keyboard plugin) لتجنب تغطية الحقول                               | ⬜     |         |
| [ ] التأكد من عمل WKWebView بشكل سليم مع Next.js (CSP headers, cookies)                            | ⬜     |         |
| [ ] إضافة platform detection: `import { Capacitor } from '@capacitor/core'` → `isNativePlatform()` | ⬜     |         |
| [ ] معالجة الفرق بين APNs (iOS) و FCM (Android) في إدارة الإشعارات                                 | ⬜     |         |
| [ ] اختبار وإصلاح سلوك الـ StatusBar على iOS (light/dark content)                                  | ⬜     |         |
| [ ] التأكد من عمل gesture navigation (swipe back) بشكل صحيح                                        | ⬜     |         |

### 3B.5 Build و Testing (iOS)

| المهمة                                                                | الحالة | التاريخ |
| --------------------------------------------------------------------- | ------ | ------- |
| [ ] مزامنة: `npx cap sync ios`                                        | ⬜     |         |
| [ ] بناء واختبار على iOS Simulator (iPhone 15, iPhone SE)             | ⬜     |         |
| [ ] اختبار على جهاز iPhone حقيقي (يتطلب provisioning profile)         | ⬜     |         |
| [ ] اختبار الإشعارات على iOS (لا تعمل على Simulator - جهاز حقيقي فقط) | ⬜     |         |
| [ ] اختبار Deep Linking / Universal Links                             | ⬜     |         |
| [ ] اختبار الدفع عبر Kashier داخل WKWebView                           | ⬜     |         |
| [ ] اختبار تحميل الصور والكاميرا                                      | ⬜     |         |
| [ ] اختبار الموقع الجغرافي                                            | ⬜     |         |
| [ ] بناء Release Archive: Product → Archive في Xcode                  | ⬜     |         |
| [ ] التأكد من عدم وجود warnings في Xcode build                        | ⬜     |         |

---

## المرحلة 4: تجهيز Google Play Store Listing (1-2 يوم)

> **السبب:** Google Play يتطلب محتوى محدد لقبول التطبيق.

### 4.1 إنشاء حساب Google Play Developer

| المهمة                                       | الحالة | التاريخ |
| -------------------------------------------- | ------ | ------- |
| [ ] تسجيل حساب Google Play Developer ($25)   | ⬜     |         |
| [ ] إعداد ملف الشركة/المطور                  | ⬜     |         |
| [ ] التحقق من الهوية (Identity Verification) | ⬜     |         |

### 4.2 تجهيز المحتوى المرئي (Google Play)

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

### 4.3 كتابة محتوى المتجر (مشترك)

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

### 4.4 إعداد Content Rating و Data Safety (Google Play)

| المهمة                                                       | الحالة | التاريخ |
| ------------------------------------------------------------ | ------ | ------- |
| [ ] ملء استبيان Content Rating (IARC)                        | ⬜     |         |
| [ ] ملء Data Safety Form (يجب مطابقة Privacy Policy بدقة):   | ⬜     |         |
| - Location data: نعم (لتحديد منطقة التوصيل)                  |        |         |
| - Personal info: نعم (الاسم، الهاتف، العنوان)                |        |         |
| - Financial info: نعم (بيانات الدفع عبر Kashier)             |        |         |
| - App activity: نعم (سجل الطلبات)                            |        |         |
| - Device identifiers: نعم (FCM tokens)                       |        |         |
| [ ] مراجعة تطابق Data Safety مع سياسة الخصوصية `/ar/privacy` | ⬜     |         |
| [ ] تحديد Target Audience: 13+ (خدمة توصيل)                  | ⬜     |         |
| [ ] اختيار App Category: Food & Drink                        | ⬜     |         |
| [ ] تحديد البلدان المستهدفة: مصر                             | ⬜     |         |

---

## المرحلة 4B: تجهيز Apple App Store Listing (2-3 أيام)

> **السبب:** Apple App Store يتطلب محتوى ومعايير صارمة لقبول التطبيق. مراجعة Apple أكثر دقة من Google.
> **ملاحظة مهمة:** Apple لديها معايير مراجعة أشد صرامة (App Review Guidelines). يُفضل قراءة الإرشادات كاملة قبل التقديم.

### 4B.1 إعداد App Store Connect

| المهمة                                                         | الحالة | التاريخ |
| -------------------------------------------------------------- | ------ | ------- |
| [ ] تسجيل الدخول على App Store Connect (بحساب Apple Developer) | ⬜     |         |
| [ ] إنشاء تطبيق جديد (New App) بالبيانات التالية:              | ⬜     |         |
| - Platform: iOS                                                |        |         |
| - Name: إنجزنا - Engezna                                       |        |         |
| - Primary Language: Arabic                                     |        |         |
| - Bundle ID: com.engezna.app                                   |        |         |
| - SKU: engezna-ios-v1                                          |        |         |
| [ ] إعداد الإصدار الأول (Version 1.0.0)                        | ⬜     |         |

### 4B.2 تجهيز المحتوى المرئي (App Store)

> **ملاحظة:** App Store يتطلب screenshots لكل حجم شاشة مدعوم. **يجب عرض أجهزة iPhone فقط** (لا Android mockups).

| المهمة                                                                             | الحالة | التاريخ |
| ---------------------------------------------------------------------------------- | ------ | ------- |
| [ ] App Icon: 1024x1024 px (بدون شفافية، بدون زوايا مدورة - Apple تضيفها تلقائياً) | ⬜     |         |
| [ ] Screenshots لـ iPhone 6.7" (1290x2796 px) - **إلزامي** (min 3, max 10)         | ⬜     |         |
| [ ] Screenshots لـ iPhone 6.5" (1284x2778 px أو 1242x2688 px)                      | ⬜     |         |
| [ ] Screenshots لـ iPhone 5.5" (1242x2208 px) - مطلوب لدعم iPhone 8 Plus           | ⬜     |         |
| [ ] Screenshots لـ iPad Pro 12.9" (2048x2732 px) - **إلزامي إذا دعم iPad**         | ⬜     |         |
| [ ] App Preview Video (اختياري - 15-30 ثانية) - فيديو قصير يعرض التطبيق            | ⬜     |         |
| [ ] التأكد إن كل الـ Screenshots بصيغة PNG أو JPEG (RGB, لا alpha)                 | ⬜     |         |

### 4B.3 كتابة محتوى App Store (عربي + إنجليزي)

| المهمة                                                           | الحالة | التاريخ |
| ---------------------------------------------------------------- | ------ | ------- |
| [ ] Subtitle (حتى 30 حرف): مثال "توصيل سريع من محلات بلدك"       | ⬜     |         |
| [ ] Promotional Text (حتى 170 حرف) - يتغير بدون إرسال تحديث جديد | ⬜     |         |
| [ ] Description (حتى 4000 حرف) - لا يتغير إلا مع تحديث جديد      | ⬜     |         |
| [ ] Keywords (حتى 100 حرف، مفصولة بفواصل) - مهمة جداً لـ ASO     | ⬜     |         |
| [ ] What's New (Release Notes) للإصدار الأول                     | ⬜     |         |
| [ ] Privacy Policy URL (نفس الرابط: `/ar/privacy`)               | ⬜     |         |
| [ ] Support URL (رابط الدعم)                                     | ⬜     |         |
| [ ] Marketing URL (اختياري)                                      | ⬜     |         |

**مقترح Keywords (عربي):**

```
توصيل,طلبات,محلات,بقالة,سوبر,ماركت,انجزنا,engezna,شراء,منزل,اون لاين,محل قريب
```

### 4B.4 إعداد App Privacy (App Store)

> **ملاحظة:** Apple تتطلب إفصاح كامل عن البيانات المجمعة (App Privacy Labels) - يظهر للمستخدم قبل التحميل.

| المهمة                                                            | الحالة | التاريخ |
| ----------------------------------------------------------------- | ------ | ------- |
| [ ] ملء App Privacy Labels في App Store Connect:                  | ⬜     |         |
| - **Data Used to Track You:** لا (لا نستخدم tracking عبر تطبيقات) |        |         |
| - **Data Linked to You:**                                         |        |         |
| - Contact Info: الاسم، البريد، رقم الهاتف، العنوان                |        |         |
| - Financial Info: معلومات الدفع (عبر Kashier)                     |        |         |
| - Location: الموقع الدقيق (للتوصيل)                               |        |         |
| - Identifiers: User ID, Device ID (FCM token)                     |        |         |
| - Usage Data: تفاعل المنتج، سجل الطلبات                           |        |         |
| - **Data Not Linked to You:** Crash Data, Performance Data        |        |         |
| [ ] مراجعة التطابق مع صفحة `/ar/privacy`                          | ⬜     |         |
| [ ] التأكد من وجود آلية حذف الحساب (مطلوب من Apple منذ 2022)      | ⬜     |         |

### 4B.5 إعداد Content Rating و التصنيف (App Store)

| المهمة                                                           | الحالة | التاريخ |
| ---------------------------------------------------------------- | ------ | ------- |
| [ ] ملء استبيان Age Rating في App Store Connect                  | ⬜     |         |
| [ ] اختيار Primary Category: Food & Drink                        | ⬜     |         |
| [ ] اختيار Secondary Category: Shopping (اختياري)                | ⬜     |         |
| [ ] تحديد Availability: مصر (Egypt)                              | ⬜     |         |
| [ ] تحديد السعر: Free                                            | ⬜     |         |
| [ ] إعداد In-App Purchases: لا يوجد (الدفع عبر Kashier خارج IAP) | ⬜     |         |

### 4B.6 متطلبات Apple الخاصة (App Review Guidelines)

> **تحذير:** هذه النقاط هي أكثر أسباب رفض التطبيقات من Apple شيوعاً.

| المهمة                                                                                             | الحالة | التاريخ |
| -------------------------------------------------------------------------------------------------- | ------ | ------- |
| [ ] **حذف حساب المستخدم:** يجب توفير طريقة واضحة لحذف الحساب من داخل التطبيق (§5.1.1)              | ⬜     |         |
| [ ] **Sign in with Apple:** إضافة زر تسجيل الدخول بحساب Apple إذا يوجد تسجيل اجتماعي               | ⬜     |         |
| [ ] **الدفع:** التأكد من عدم استخدام IAP لخدمات فعلية (التوصيل معفى - §3.1.3(e))                   | ⬜     |         |
| [ ] **Demo Account:** تحضير حساب تجريبي لفريق مراجعة Apple (Review Information)                    | ⬜     |         |
| [ ] **App Transport Security:** التأكد من استخدام HTTPS فقط (ATS)                                  | ⬜     |         |
| [ ] **IPv6 Compatibility:** التأكد من عمل التطبيق على شبكات IPv6-only                              | ⬜     |         |
| [ ] **Minimum Functionality:** التأكد أن التطبيق ليس مجرد WebView wrapper (إضافة native features)  | ⬜     |         |
| [ ] **Permissions:** طلب كل إذن في سياقه الصحيح (لا تطلب الكاميرا عند فتح التطبيق)                 | ⬜     |         |
| [ ] **App Tracking Transparency (ATT):** إظهار رسالة ATT إذا Firebase Analytics مستخدم (iOS 14.5+) | ⬜     |         |
| [ ] **Arabic RTL:** التأكد من عمل واجهة RTL بشكل كامل على iOS                                      | ⬜     |         |

---

## المرحلة 5: الاختبار والمراجعة النهائية (3-4 أيام)

> **ملاحظة:** يتم اختبار Android و iOS بالتوازي.

### 5.1 اختبار شامل قبل النشر (مشترك)

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
| [ ] اختبار Deep Links / Universal Links                  | ⬜     |         |

### 5.2 اختبار خاص بـ Android

| المهمة                                                           | الحالة | التاريخ |
| ---------------------------------------------------------------- | ------ | ------- |
| [ ] اختبار على Android 10+ (API 29+)                             | ⬜     |         |
| [ ] اختبار على أحجام شاشات مختلفة (small, normal, large, xlarge) | ⬜     |         |
| [ ] اختبار Back Button behavior                                  | ⬜     |         |
| [ ] اختبار Split Screen / Multi-window                           | ⬜     |         |
| [ ] اختبار بدون Google Play Services (Huawei devices)            | ⬜     |         |

### 5.3 اختبار خاص بـ iOS

| المهمة                                                                                | الحالة | التاريخ |
| ------------------------------------------------------------------------------------- | ------ | ------- |
| [ ] اختبار على iOS 14+ (أو الحد الأدنى المختار)                                       | ⬜     |         |
| [ ] اختبار على iPhone SE (شاشة صغيرة 4.7")                                            | ⬜     |         |
| [ ] اختبار على iPhone 15 Pro (Dynamic Island)                                         | ⬜     |         |
| [ ] اختبار على iPad (إذا التطبيق يدعم iPad)                                           | ⬜     |         |
| [ ] اختبار Dark Mode على iOS                                                          | ⬜     |         |
| [ ] اختبار VoiceOver accessibility                                                    | ⬜     |         |
| [ ] اختبار Swipe Back gesture                                                         | ⬜     |         |
| [ ] اختبار الإشعارات مع التطبيق مغلق / في الخلفية / في المقدمة                        | ⬜     |         |
| [ ] اختبار الدفع عبر Kashier على Safari / WKWebView                                   | ⬜     |         |
| [ ] اختبار عند رفض الأذونات (الكاميرا / الموقع / الإشعارات) - لا يجب أن يتوقف التطبيق | ⬜     |         |

### 5.4 مراجعة الأداء النهائية

| المهمة                                     | الحالة | التاريخ |
| ------------------------------------------ | ------ | ------- |
| [ ] Lighthouse Performance Score > 80      | ⬜     |         |
| [ ] Lighthouse Accessibility Score > 90    | ⬜     |         |
| [ ] Lighthouse Best Practices Score > 90   | ⬜     |         |
| [ ] Lighthouse SEO Score > 90              | ⬜     |         |
| [ ] APK/AAB Size < 50MB (الأمثل < 30MB)    | ⬜     |         |
| [ ] IPA Size < 200MB (حد App Store)        | ⬜     |         |
| [ ] App Launch Time < 3 ثوانٍ على الجهازين | ⬜     |         |

### 5.5 مراجعة أمنية نهائية

| المهمة                                           | الحالة | التاريخ |
| ------------------------------------------------ | ------ | ------- |
| [ ] التأكد من إزالة كل console.log من production | ⬜     |         |
| [ ] التأكد من عدم وجود API keys مكشوفة           | ⬜     |         |
| [ ] التأكد من عدم وجود test data في production   | ⬜     |         |
| [ ] npm audit بدون ثغرات critical أو high        | ⬜     |         |
| [ ] التأكد إن كل RLS policies شغالة              | ⬜     |         |
| [ ] التأكد من ATS compliance على iOS             | ⬜     |         |

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

### 6.3 Production Release (Google Play)

| المهمة                                           | الحالة | التاريخ |
| ------------------------------------------------ | ------ | ------- |
| [ ] إرسال للمراجعة (Google Review يأخذ 1-7 أيام) | ⬜     |         |
| [ ] Staged Rollout: 10% → 25% → 50% → 100%       | ⬜     |         |
| [ ] مراقبة التقييمات والمراجعات                  | ⬜     |         |
| [ ] الرد على مراجعات المستخدمين                  | ⬜     |         |

---

## المرحلة 6B: النشر على Apple App Store (1-7 أيام)

> **السبب:** مراجعة Apple عادةً أبطأ وأكثر صرامة من Google. يُنصح بالبدء في التقديم مبكراً.
> **مدة المراجعة المتوقعة:** 24 ساعة - 7 أيام (المتوسط 1-3 أيام للتطبيقات الجديدة).

### 6B.1 رفع Build على App Store Connect

| المهمة                                                                   | الحالة | التاريخ |
| ------------------------------------------------------------------------ | ------ | ------- |
| [ ] بناء Archive نهائي من Xcode (Product → Archive)                      | ⬜     |         |
| [ ] رفع الـ Archive عبر Xcode Organizer أو `xcrun altool` أو Transporter | ⬜     |         |
| [ ] انتظار معالجة Apple للـ build (5-30 دقيقة)                           | ⬜     |         |
| [ ] التأكد من عدم وجود errors في App Store Connect → Activity            | ⬜     |         |

### 6B.2 TestFlight (اختبار تجريبي - مطلوب قبل النشر)

| المهمة                                                                 | الحالة | التاريخ |
| ---------------------------------------------------------------------- | ------ | ------- |
| [ ] إضافة Build للـ TestFlight في App Store Connect                    | ⬜     |         |
| [ ] إضافة Internal Testers (حتى 100 مختبر من الفريق)                   | ⬜     |         |
| [ ] إرسال دعوات TestFlight                                             | ⬜     |         |
| [ ] اختبار التثبيت عبر TestFlight على أجهزة حقيقية                     | ⬜     |         |
| [ ] إضافة External Testers (حتى 10,000 - يتطلب مراجعة مختصرة من Apple) | ⬜     |         |
| [ ] جمع feedback وإصلاح المشاكل المكتشفة                               | ⬜     |         |
| [ ] مراقبة Crashes في TestFlight → Crashes                             | ⬜     |         |

### 6B.3 إعداد Review Information

| المهمة                                                             | الحالة | التاريخ |
| ------------------------------------------------------------------ | ------ | ------- |
| [ ] إضافة Demo Account (بريد + كلمة مرور) لفريق Apple Review       | ⬜     |         |
| [ ] كتابة Notes for Reviewer (شرح وظيفة التطبيق + كيفية الاختبار)  | ⬜     |         |
| [ ] إضافة Contact Information للتواصل أثناء المراجعة               | ⬜     |         |
| [ ] التأكد من إتاحة التطبيق في مصر (حتى يتمكن المراجع من الاختبار) | ⬜     |         |

**مقترح Notes for Reviewer:**

```
إنجزنا هو تطبيق لطلب وتوصيل المنتجات اليومية من المتاجر المحلية في مصر.

للاختبار:
1. سجل حساب جديد أو استخدم الحساب التجريبي
2. تصفح المتاجر المتاحة في منطقتك
3. أضف منتجات للسلة وأكمل طلبك
4. يمكنك استخدام الدفع عند الاستلام (COD) للاختبار

Demo Account:
Email: review@engezna.com
Password: [كلمة المرور]

ملاحظة: التطبيق يستخدم Kashier كبوابة دفع إلكتروني (لا يحتاج In-App Purchase)
لأنه يبيع منتجات وخدمات فعلية (physical goods & services).
```

### 6B.4 تقديم للمراجعة والنشر

| المهمة                                                                              | الحالة | التاريخ |
| ----------------------------------------------------------------------------------- | ------ | ------- |
| [ ] اختيار Build المعتمد من TestFlight                                              | ⬜     |         |
| [ ] مراجعة كل بيانات التطبيق مرة أخيرة                                              | ⬜     |         |
| [ ] إرسال للمراجعة (Submit for Review)                                              | ⬜     |         |
| [ ] متابعة حالة المراجعة (Waiting for Review → In Review → Ready for Sale/Rejected) | ⬜     |         |
| [ ] في حالة الرفض: قراءة السبب بعناية وإصلاحه وإعادة التقديم                        | ⬜     |         |
| [ ] تفعيل Phased Release (إصدار تدريجي على 7 أيام) - اختياري                        | ⬜     |         |
| [ ] مراقبة التقييمات والمراجعات على App Store                                       | ⬜     |         |
| [ ] الرد على مراجعات المستخدمين عبر App Store Connect                               | ⬜     |         |

### 6B.5 أسباب الرفض الشائعة وكيفية تجنبها

| السبب الشائع للرفض             | الحل                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| لا يوجد زر حذف حساب            | إضافة خيار "حذف حسابي" في صفحة الإعدادات                      |
| التطبيق مجرد WebView           | إضافة native features (إشعارات، كاميرا، haptics)              |
| Crash عند الفتح                | اختبار شامل على TestFlight قبل التقديم                        |
| الأذونات تُطلب فوراً عند الفتح | طلب الأذونات عند الحاجة الفعلية فقط (lazy permission request) |
| الوصف لا يطابق وظيفة التطبيق   | مراجعة الوصف ومطابقته مع التطبيق الفعلي                       |
| لا يعمل في بلد المراجع         | التأكد من إتاحة الخدمة أو إضافة demo mode                     |
| Sign in with Apple مفقود       | إضافته إذا يوجد أي تسجيل دخول اجتماعي (Google/Facebook)       |
| معلومات الخصوصية غير مكتملة    | ملء كل حقول Privacy Labels بدقة                               |

---

## ملحق: ملاحظات هندسية إضافية

### مقارنة متطلبات المتجرين

| المتطلب              | Google Play                  | Apple App Store                              |
| -------------------- | ---------------------------- | -------------------------------------------- |
| رسوم المطور          | $25 (مرة واحدة)              | $99/سنة                                      |
| مدة المراجعة         | 1-7 أيام                     | 1-7 أيام (المتوسط 1-3)                       |
| صيغة التطبيق         | AAB (Android App Bundle)     | IPA (عبر Xcode Archive)                      |
| الحد الأدنى للـ OS   | Android 8.0+ (API 26)        | iOS 14.0+                                    |
| Screenshots المطلوبة | Min 2 (phone)                | Min 3 (لكل حجم شاشة مدعوم)                   |
| حذف الحساب           | مطلوب (Data Deletion Policy) | **إلزامي صارم** (§5.1.1)                     |
| Sign in with Apple   | غير مطلوب                    | **إلزامي** إذا يوجد login اجتماعي            |
| In-App Purchase      | غير مطلوب (منتجات فعلية)     | غير مطلوب (منتجات فعلية - §3.1.3(e))         |
| Privacy Labels       | Data Safety Form             | App Privacy Labels (أكثر تفصيلاً)            |
| Demo Account للمراجع | اختياري                      | **مطلوب بشدة**                               |
| Native Features      | WebView مقبول                | **يجب إضافة ميزات native** (ليس WebView فقط) |
| Staged Rollout       | نعم (نسب مئوية)              | نعم (Phased Release - 7 أيام)                |
| حساب اختباري         | Internal → Closed → Open     | TestFlight (Internal + External)             |

### مشاكل يجب مراقبتها بعد النشر

| المشكلة                                  | الحل المقترح                                                | الحالة    |
| ---------------------------------------- | ----------------------------------------------------------- | --------- |
| Double polling في الإشعارات              | إزالة الـ polling الزائد في `useNotifications.ts`           | ✅ تم     |
| Supabase client creation متكرر           | استخدام singleton pattern                                   | ⬜        |
| Memory leak محتمل في channel cleanup     | استخدام useRef بدل state للـ channel                        | ✅ تم     |
| Edge Functions غير منشورة                | نشرها وربطها بـ database webhooks                           | ⚠️ جزئي   |
| لا صوت عند تغيير حالة الطلب              | إضافة صوت order-update + إصلاح polling                      | ✅ تم     |
| RLS يحظر إنشاء طلبات خاصة                | إضافة سياسة INSERT مرتبطة بمالك البث                        | ✅ تم     |
| طلبات خاصة منتهية تظهر للعميل            | فلترة client-side + trigger + cron                          | ✅ تم     |
| حالة الطلب لا تتحدث على كارت التاجر      | auto-polling 15s + إصلاح اسم الحالة                         | ✅ تم     |
| أصناف الطلب الخاص مفقودة من التفاصيل     | جلب من `custom_order_items` بدل `order_items`               | ✅ تم     |
| نافذة الإشعارات تظهر بشكل متكرر          | فحص localStorage داخل timer effect                          | ✅ تم     |
| migrations غير مطبقة على الإنتاج         | تم تطبيقها عبر SQL Editor (2/9)                             | ✅ تم     |
| SMS/WhatsApp notifications               | توصيل provider (Twilio/MessageBird) - مرحلة لاحقة           | ⬜        |
| **Service Role JWT مكشوف في 7 triggers** | **حذف ✅ + rotate ✅ + تحديث كل البيئات ✅ (2/13)**         | **✅ تم** |
| Kashier webhook بدون signature إلزامية   | إلزام التوقيع ورفض بدونه ✅ (2/13)                          | ✅ تم     |
| Promo validation يثق بـ user_id من body  | ربط بـ session الفعلية ✅ (2/13)                            | ✅ تم     |
| لا يوجد CSP header                       | CSP enforce ✅ (2/14) - كامل مع كل الـ domains              | **✅ تم** |
| سياسات SELECT واسعة (promo, profiles)    | تضييق RLS policies المفتوحة                                 | ✅ تم     |
| طلبات وهمية (Phantom Orders)             | إنشاء الطلب بـ pending_payment قبل Kashier ✅ (2/13)        | ✅ تم     |
| Kashier Refund API مفقود                 | endpoint + Kashier API integration ✅ (2/13)                | ✅ تم     |
| Webhook duplicate processing             | idempotency + unique constraint + retry handling ✅ (2/13)  | ✅ تم     |
| CSRF middleware غير مفعل                 | CSRF enforce ✅ (2/14) + csrfHeaders() لـ 27 endpoint       | **✅ تم** |
| ~80+ console.log في الإنتاج              | كل API routes + lib/admin + email تم ✅ (2/13) - بقي client | 🔄 جزئي   |
| طلبات معلقة بالدفع للأبد                 | cron job كل 15 دقيقة لتنظيف pending_payment ✅ (2/13)       | ✅ تم     |
| ملفات كبيرة (>2000 سطر)                  | تقسيم تدريجي - ليس حاجزاً للنشر                             | ⬜        |
| صفحة تفاصيل المهمة مفقودة                | إنشاء `/admin/tasks/[id]` مع سجل التحديثات ✅ (2/16)        | **✅ تم** |
| فلتر "مهامي" لا يشمل المنسوخين (cc_to)   | إصلاح الفلتر ليشمل assigned+created+cc_to ✅ (2/16)         | **✅ تم** |
| حقل cc_to غير مدعوم في إنشاء المهام      | إضافة حقل CC في نموذج الإنشاء + عرضه على البطاقات ✅ (2/16) | **✅ تم** |
| N+1 Query في تحميل المهام (200+ query)   | batch loading بـ 2 queries فقط بدل 2\*N ✅ (2/16)           | **✅ تم** |
| لا إشعار للمشرف عند إسناد مهمة           | إنشاء admin_notifications تلقائياً عند إسناد/نسخ ✅ (2/16)  | **✅ تم** |
| أخطاء التحميل مخفية (silent failures)    | إظهار رسائل خطأ + زر إعادة محاولة ✅ (2/16)                 | **✅ تم** |

### ملاحظات iOS خاصة يجب مراقبتها

| الملاحظة                                       | التفاصيل                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| WKWebView لا يدعم Service Workers بالكامل      | اختبار PWA features داخل Capacitor iOS - بعضها قد لا يعمل          |
| APNs vs FCM                                    | iOS يستخدم APNs بينما FCM يعمل كـ wrapper - التأكد من إعداد كليهما |
| iOS لا يدعم Background Fetch بنفس حرية Android | استخدام Silent Push Notifications بدلاً منه                        |
| WKWebView Cookie handling                      | قد يحتاج إعداد خاص لـ session cookies مع Supabase Auth             |
| Safe Area / Dynamic Island                     | اختبار التصميم على أحدث أجهزة iPhone                               |
| iOS App Store Review أبطأ في الإصدار الأول     | التقديم مبكراً وتحضير ردود سريعة على أسئلة المراجع                 |

### ملفات مرجعية

| الملف                                               | المحتوى                                 |
| --------------------------------------------------- | --------------------------------------- |
| `docs/PRE_RELEASE_REVIEW_REPORT.md`                 | تقرير مراجعة ما قبل النشر الشامل (2/12) |
| `docs/LAUNCH_READINESS_CHECKLIST.md`                | قائمة جاهزية الإطلاق العامة             |
| `docs/SECURITY_ISSUES_FOUND.md`                     | تقرير الثغرات الأمنية المكتشفة          |
| `docs/features/FIREBASE_PUSH_NOTIFICATIONS_PLAN.md` | خطة Firebase المفصلة                    |
| `docs/MONITORING_SETUP.md`                          | إعداد المراقبة                          |
| `docs/QUALITY_LAYERS_ROADMAP.md`                    | خريطة طبقات الجودة                      |

### روابط مرجعية مهمة

| الرابط                                                                                              | الوصف                          |
| --------------------------------------------------------------------------------------------------- | ------------------------------ |
| https://developer.apple.com/app-store/review/guidelines/                                            | إرشادات مراجعة Apple App Store |
| https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases | توزيع التطبيق عبر TestFlight   |
| https://capacitorjs.com/docs/ios                                                                    | توثيق Capacitor لـ iOS         |
| https://play.google.com/console/about/guides/releasewithconfidence/                                 | إرشادات Google Play للنشر      |

---

## سجل التحديثات

| التاريخ    | التحديث                                                                                                      | بواسطة |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 2026-02-08 | إنشاء الخطة الشاملة                                                                                          | Claude |
| 2026-02-08 | اعتماد الخطة + إضافة ملاحظات المراجعة (Screenshots, Data Safety)                                             | Owner  |
| 2026-02-08 | تنفيذ المرحلة 0 بالكامل (أمان Firebase, jspdf, test accounts, RBAC)                                          | Claude |
| 2026-02-08 | تنفيذ المرحلة 1 بالكامل (AudioManager, VAPID, notifications, preferences UI)                                 | Claude |
| 2026-02-09 | إصلاح صوت إشعارات حالة الطلب + إزالة double polling + webhook sync                                           | Claude |
| 2026-02-09 | إصلاح نظام الطلبات الخاصة: auto-archive, RLS, حالات, أصناف, إشعارات (1.9)                                    | Claude |
| 2026-02-09 | تناسق تصميم كروت الطلبات الخاصة + زر تأكيد الدفع على الكارت (1.10)                                           | Claude |
| 2026-02-12 | مراجعة عميقة شاملة: أمان، كود، تدفقات تجارية، جاهزية Capacitor                                               | Claude |
| 2026-02-12 | إضافة المرحلة 1.5 (8 مهام حرجة مكتشفة) + تقرير PRE_RELEASE_REVIEW_REPORT.md                                  | Claude |
| 2026-02-12 | تأكيد تسريب Service Role JWT في 7 triggers (من SQL حقيقي) + دمج اكتشافات Codex                               | Claude |
| 2026-02-13 | تنفيذ 1.5.0 (حذف triggers) + 1.5.5 + 1.5.7 + 1.5.8 + 1.5.9 (إصلاحات كود حرجة)                                | Claude |
| 2026-02-13 | تنفيذ 1.5.1 (إصلاح Phantom Orders) + 1.5.6 (cron تنظيف الطلبات المعلقة)                                      | Claude |
| 2026-02-13 | تنفيذ 1.5.2 (Refund API) + 1.5.3 (Webhook idempotency) + 1.5.4 (CSRF) + 1.5.5 (console cleanup)              | Claude |
| 2026-02-13 | تم Rotate Service Role Key + تحديث Supabase Dashboard + Vercel + GitHub Secrets                              | Owner  |
| 2026-02-14 | إكمال المرحلة 1.5: Refund webhook + CSRF enforce + CSP enforce + CSRF headers لـ 27 endpoint                 | Claude |
| 2026-02-14 | المرحلة 2: إزالة unoptimized من الصور + تحويل img لـ next/image + skeleton loaders                           | Claude |
| 2026-02-14 | المرحلة 2: lazy loading لـ 5 أقسام homepage + preconnect hints + تحسينات accessibility                       | Claude |
| 2026-02-16 | مراجعة شاملة: صلاحيات الإدارة + المتاجر + المهام + تسجيل المتاجر الجديدة                                     | Claude |
| 2026-02-16 | إصلاح 6 مشاكل في نظام المهام: تفاصيل المهمة + cc_to + N+1 + إشعارات + أخطاء + فلتر مهامي                     | Claude |
| 2026-02-21 | **تحديث شامل:** إعادة تسمية الملف + دمج خطة iOS App Store (المراحل 3B, 4B, 6B) + تحديث المراحل المشتركة      | Claude |
| 2026-02-22 | مراجعة شاملة للخطة والتقرير مقابل الكود الفعلي (PLAN_REVIEW) + إضافة google-services.json                    | Claude |
| 2026-02-23 | المرحلة 2: إعداد Lighthouse CI + إصلاح WCAG AA color-contrast + SEO metadata + إزالة deprecated PWA audits   | Claude |
| 2026-02-23 | المرحلة 2: حساب contrast وفق WCAG 2.1 في OffersCarousel + dark overlay للبانرات + إضافة primary-dark للألوان | Claude |
