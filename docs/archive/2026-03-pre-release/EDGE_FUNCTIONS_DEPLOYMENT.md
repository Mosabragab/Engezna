# Edge Functions Deployment Guide - إنجزنا

## المتطلبات (Prerequisites)

### 1. تثبيت Supabase CLI

```bash
npm install -g supabase
```

### 2. تسجيل الدخول

```bash
supabase login
```

### 3. ربط المشروع

```bash
supabase link --project-ref cmxpvzqrmptfnuymhxmr
```

---

## الخطوات (Deployment Steps)

### الخطوة 1: إعداد Environment Variables

قبل النشر، يجب إعداد المتغيرات البيئية في Supabase:

```bash
# Firebase Service Account (مطلوب لإرسال FCM)
supabase secrets set FIREBASE_SERVICE_ACCOUNT='{ "type": "service_account", "project_id": "engezna-6edd0", ... }'

# التأكد من المتغيرات المتاحة تلقائياً
# SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY متاحة تلقائياً
```

**كيفية الحصول على Firebase Service Account:**

1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Service Accounts
3. Generate New Private Key
4. انسخ محتوى الملف JSON كاملاً

### الخطوة 2: نشر Edge Functions

```bash
# نشر دالة معالجة الإشعارات (handle-notification-trigger)
supabase functions deploy handle-notification-trigger --no-verify-jwt

# نشر دالة إرسال الإشعارات (send-notification)
supabase functions deploy send-notification --no-verify-jwt
```

> **ملاحظة:** نستخدم `--no-verify-jwt` لأن الدوال تتحقق من الـ Authorization header يدوياً.

### الخطوة 3: تطبيق Migration الجديد

```bash
# تطبيق migration الـ webhook triggers
supabase db push
```

هذا سينشئ:

- Trigger على `customer_notifications` → يرسل FCM push عند إنشاء إشعار جديد
- Trigger على `provider_notifications` → يرسل FCM push عند إنشاء إشعار جديد

### الخطوة 4: التحقق

```bash
# التحقق من نشر الدوال
supabase functions list

# اختبار يدوي
supabase functions invoke send-notification --body '{
  "user_id": "TEST_USER_ID",
  "title": "Test",
  "title_ar": "اختبار",
  "body": "Test notification",
  "body_ar": "إشعار تجريبي",
  "data": { "type": "test" }
}'
```

---

## التحقق من عمل النظام الكامل

### الدورة الكاملة لتغيير حالة الطلب:

```
1. مزود يغير حالة الطلب (preparing/ready/out_for_delivery/delivered)
   ↓
2. DB Trigger: notify_customer_order_status()
   → INSERT into customer_notifications
   ↓
3. DB Trigger: on_customer_notification_fcm_sync
   → call_notification_webhook()
   → HTTP POST to handle-notification-trigger Edge Function
   ↓
4. Edge Function: handle-notification-trigger
   → يقرأ الإشعار من الـ payload
   → يستدعي send-notification Edge Function
   ↓
5. Edge Function: send-notification
   → يجلب FCM tokens للعميل
   → يرسل FCM message
   ↓
6. الجهاز يستقبل الإشعار:
   - إذا التطبيق مفتوح → Realtime subscription + صوت order-update
   - إذا التطبيق مغلق → Service Worker يعرض إشعار النظام
```

### التحقق من الـ Triggers في قاعدة البيانات:

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%notification%'
ORDER BY event_object_table;
```

---

## استكشاف الأخطاء (Troubleshooting)

### الإشعارات لا تصل:

1. تأكد من نشر Edge Functions: `supabase functions list`
2. تأكد من إعداد `FIREBASE_SERVICE_ACCOUNT`: `supabase secrets list`
3. تحقق من logs: `supabase functions logs handle-notification-trigger`
4. تحقق من وجود FCM tokens نشطة: `SELECT * FROM fcm_tokens WHERE is_active = true`

### الصوت لا يعمل:

1. تأكد من أن المستخدم ضغط على الشاشة مرة واحدة (browser autoplay policy)
2. تأكد من أن الصوت مفعل في إعدادات الإشعارات
3. افتح DevTools → Console وابحث عن أخطاء audio
4. استخدم SoundTestDebug component (development mode فقط)
