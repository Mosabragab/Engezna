# 🔔 خطة تنفيذ إشعارات Firebase لمنصة إنجزنا

## نظرة عامة

هذه الخطة توضح كيفية تنفيذ نظام إشعارات فوري شامل باستخدام Firebase Cloud Messaging (FCM) لجميع أطراف منصة إنجزنا.

---

## 📋 المراحل الرئيسية

| المرحلة | الوصف                         | المدة التقديرية |
| ------- | ----------------------------- | --------------- |
| 1       | إعداد Firebase Project        | -               |
| 2       | إنشاء جداول قاعدة البيانات    | -               |
| 3       | تثبيت Firebase SDK في Next.js | -               |
| 4       | إنشاء Service Worker للـ PWA  | -               |
| 5       | إنشاء Edge Functions          | -               |
| 6       | إعداد Database Webhooks       | -               |
| 7       | اختبار السيناريوهات           | -               |

---

## 🔥 المرحلة 1: إعداد Firebase Project

### الخطوات المطلوبة منك:

1. **إنشاء مشروع Firebase جديد:**
   - اذهب إلى [Firebase Console](https://console.firebase.google.com)
   - اضغط "Add Project" → اسم المشروع: `engezna-app`
   - فعّل Google Analytics (اختياري)

2. **إضافة تطبيق Web:**
   - في Project Settings → Add App → Web
   - اسم التطبيق: `Engezna Web`
   - ✅ فعّل "Firebase Hosting" (اختياري)
   - انسخ الـ Config

3. **الحصول على المفاتيح:**

   ```
   ستحتاج:
   - Firebase Config (للـ Frontend)
   - Service Account Key (للـ Backend/Edge Functions)
   ```

4. **تفعيل Cloud Messaging:**
   - Project Settings → Cloud Messaging
   - انسخ "Server Key" (Legacy) أو استخدم FCM v1 API

### المخرجات المطلوبة:

```env
# .env.local (Frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
NEXT_PUBLIC_FIREBASE_VAPID_KEY=xxx

# Supabase Secrets (Backend)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

---

## 🗄️ المرحلة 2: إنشاء جداول قاعدة البيانات

### جدول 1: `fcm_tokens` - تخزين رموز الأجهزة

```sql
-- جدول تخزين FCM Tokens
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- معلومات الـ Token
  token text NOT NULL,
  device_type text DEFAULT 'web', -- 'web', 'android', 'ios'
  device_name text, -- اسم الجهاز (اختياري)

  -- الحالة
  is_active boolean DEFAULT true,
  last_used_at timestamp with time zone DEFAULT now(),

  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- كل token فريد
  UNIQUE(token)
);

-- Indexes
CREATE INDEX idx_fcm_tokens_user ON public.fcm_tokens(user_id);
CREATE INDEX idx_fcm_tokens_active ON public.fcm_tokens(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can manage own tokens"
  ON public.fcm_tokens FOR ALL
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER fcm_tokens_updated_at
  BEFORE UPDATE ON public.fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### جدول 2: `notification_queue` - طابور الإشعارات (اختياري للتتبع)

```sql
-- جدول تتبع الإشعارات المرسلة
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- المستهدف
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_role text, -- 'customer', 'provider_owner', 'provider_staff', 'admin'

  -- المحتوى
  title_ar text NOT NULL,
  title_en text NOT NULL,
  body_ar text NOT NULL,
  body_en text NOT NULL,

  -- البيانات الإضافية
  data jsonb DEFAULT '{}', -- {order_id, provider_id, action_url, etc.}

  -- النوع
  notification_type text NOT NULL, -- 'order_new', 'order_status', 'chat', 'promo', 'system'

  -- الحالة
  status text DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
  sent_at timestamp with time zone,
  error_message text,

  -- المرجع
  reference_type text, -- 'order', 'chat', 'provider', etc.
  reference_id uuid,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX idx_notification_queue_user ON public.notification_queue(user_id);
CREATE INDEX idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX idx_notification_queue_type ON public.notification_queue(notification_type);
```

### جدول 3: `notification_preferences` - تفضيلات الإشعارات

```sql
-- تفضيلات الإشعارات لكل مستخدم
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- تفضيلات العميل
  order_updates boolean DEFAULT true,
  promotions boolean DEFAULT true,
  chat_messages boolean DEFAULT true,

  -- تفضيلات التاجر/المشرف
  new_orders boolean DEFAULT true,
  order_cancellations boolean DEFAULT true,
  low_stock_alerts boolean DEFAULT true,
  reviews boolean DEFAULT true,

  -- تفضيلات الأدمن
  new_providers boolean DEFAULT true,
  complaints boolean DEFAULT true,
  system_alerts boolean DEFAULT true,

  -- الصوت
  sound_enabled boolean DEFAULT true,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid());
```

---

## 📱 المرحلة 3: تثبيت Firebase SDK في Next.js

### 3.1 تثبيت الحزم

```bash
npm install firebase
```

### 3.2 إنشاء ملف التهيئة

```typescript
// src/lib/firebase/config.ts
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export { app };
```

### 3.3 إنشاء Hook لإدارة الإشعارات

```typescript
// src/hooks/usePushNotifications.ts
'use client';

import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '@/lib/firebase/config';
import { createClient } from '@/lib/supabase/client';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Request permission and get token
  const requestPermission = async () => {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        const messaging = getMessaging(app);
        const currentToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (currentToken) {
          setToken(currentToken);
          await saveTokenToDatabase(currentToken);
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save token to Supabase
  const saveTokenToDatabase = async (fcmToken: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('fcm_tokens').upsert(
        {
          user_id: user.id,
          token: fcmToken,
          device_type: 'web',
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'token',
        }
      );
    }
  };

  // Listen for foreground messages
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message:', payload);

      // Show notification manually in foreground
      if (payload.notification) {
        new Notification(payload.notification.title || 'إنجزنا', {
          body: payload.notification.body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    permission,
    token,
    loading,
    requestPermission,
  };
}
```

### 3.4 Service Worker للإشعارات في الخلفية

```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload);

  const notificationTitle = payload.notification?.title || 'إنجزنا';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: payload.data?.tag || 'default',
    data: payload.data,
    // Custom actions
    actions: payload.data?.actions ? JSON.parse(payload.data.actions) : [],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
```

---

## ⚡ المرحلة 4: إنشاء Supabase Edge Functions

### 4.1 دالة إرسال الإشعارات

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');
const FIREBASE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY') || '{}');

// Get Firebase access token
async function getAccessToken() {
  const jwt = await createJWT(FIREBASE_SERVICE_ACCOUNT);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

// Send notification via FCM v1 API
async function sendNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>
) {
  const accessToken = await getAccessToken();

  const message = {
    message: {
      token,
      notification: {
        title,
        body,
      },
      data,
      webpush: {
        notification: {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
        },
        fcm_options: {
          link: data.url || '/',
        },
      },
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    }
  );

  return response.json();
}

serve(async (req) => {
  try {
    const { user_ids, title_ar, title_en, body_ar, body_en, data } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get FCM tokens for users
    const { data: tokens, error } = await supabase
      .from('fcm_tokens')
      .select('token, user_id, profiles(preferred_language)')
      .in('user_id', user_ids)
      .eq('is_active', true);

    if (error) throw error;

    // Send to each token
    const results = await Promise.all(
      tokens.map(async (t) => {
        const lang = t.profiles?.preferred_language || 'ar';
        const title = lang === 'ar' ? title_ar : title_en;
        const body = lang === 'ar' ? body_ar : body_en;

        return sendNotification(t.token, title, body, data);
      })
    );

    return new Response(JSON.stringify({ success: true, sent: results.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### 4.2 دالة معالجة الطلبات الجديدة

```typescript
// supabase/functions/handle-new-order/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const payload = await req.json();
  const { record: order } = payload; // New order from webhook

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get provider staff with order management permission
  const { data: staff } = await supabase
    .from('provider_staff')
    .select('user_id')
    .eq('provider_id', order.provider_id)
    .eq('is_active', true)
    .eq('can_manage_orders', true);

  if (!staff?.length) return new Response('No staff to notify');

  const user_ids = staff.map((s) => s.user_id);

  // Call send-push-notification function
  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: {
      user_ids,
      title_ar: '🛒 طلب جديد!',
      title_en: '🛒 New Order!',
      body_ar: `طلب جديد #${order.order_number} - ${order.total} ج.م`,
      body_en: `New order #${order.order_number} - ${order.total} EGP`,
      data: {
        type: 'new_order',
        order_id: order.id,
        url: `/ar/provider/orders/${order.id}`,
      },
    },
  });

  return new Response(JSON.stringify({ success: true }));
});
```

---

## 🔗 المرحلة 5: إعداد Database Webhooks

### في Supabase Dashboard:

1. **Database → Webhooks → Create Webhook**

2. **إعداد الـ Webhooks:**

| الاسم                     | الجدول          | الحدث                       | Edge Function             |
| ------------------------- | --------------- | --------------------------- | ------------------------- |
| `on_new_order`            | `orders`        | `INSERT`                    | `handle-new-order`        |
| `on_order_status_change`  | `orders`        | `UPDATE` (status column)    | `handle-order-status`     |
| `on_new_chat_message`     | `chat_messages` | `INSERT`                    | `handle-new-message`      |
| `on_new_provider_request` | `providers`     | `INSERT` (status = pending) | `handle-provider-request` |
| `on_new_complaint`        | `complaints`    | `INSERT`                    | `handle-new-complaint`    |

---

## 🎯 المرحلة 6: سيناريوهات الإشعارات

### للعميل (Customer)

| السيناريو    | العنوان            | المحتوى                         | الإجراء          |
| ------------ | ------------------ | ------------------------------- | ---------------- |
| قبول الطلب   | ✅ تم قبول طلبك    | طلبك #123 قيد التحضير الآن      | فتح تفاصيل الطلب |
| جاري التحضير | 👨‍🍳 جاري تحضير طلبك | طلبك #123 يتم تحضيره حالياً     | فتح تفاصيل الطلب |
| في الطريق    | 🚗 الطلب في الطريق | المندوب في طريقه إليك           | فتح تتبع الطلب   |
| تم التوصيل   | 🎉 تم التوصيل      | نتمنى لك وجبة شهية! قيّم تجربتك | فتح صفحة التقييم |
| رسالة جديدة  | 💬 رسالة من المتجر | لديك رد جديد بخصوص طلبك         | فتح الدردشة      |
| عرض جديد     | 🎁 عرض خاص!        | خصم 20% على طلبك القادم         | فتح صفحة العروض  |

### للتاجر/المشرف (Provider/Staff)

| السيناريو     | العنوان          | المحتوى                  | الصوت        |
| ------------- | ---------------- | ------------------------ | ------------ |
| طلب جديد      | 🛒 طلب جديد!     | طلب #123 بقيمة 150 ج.م   | 🔊 رنة مميزة |
| إلغاء طلب     | ❌ تم إلغاء طلب  | العميل ألغى الطلب #123   | 🔊 تنبيه     |
| تقييم جديد    | ⭐ تقييم جديد    | حصلت على تقييم 5 نجوم    | 🔊 إيجابي    |
| رسالة عميل    | 💬 رسالة من عميل | استفسار بخصوص الطلب #123 | 🔊 رسالة     |
| تحديث من مشرف | 👤 تحديث الفريق  | [أحمد] حدّث حالة الطلب   | 🔔 عادي      |

### للأدمن (Admin)

| السيناريو  | العنوان       | المحتوى                      |
| ---------- | ------------- | ---------------------------- |
| طلب انضمام | 🏪 متجر جديد  | "مطعم الشام" تقدم للانضمام   |
| شكوى جديدة | ⚠️ شكوى جديدة | شكوى من [العميل] ضد [المتجر] |
| تنبيه أمني | 🚨 تنبيه أمني | محاولة دخول مشبوهة           |

---

## 🎨 المرحلة 7: اللمسة البراندية

### 7.1 أيقونات الإشعارات

```
public/
  icons/
    notification-icon.png      # 192x192 - أيقونة الإشعار الرئيسية
    badge-icon.png             # 72x72 - Badge للموبايل
    notification-order.png     # أيقونة الطلبات
    notification-chat.png      # أيقونة الرسائل
    notification-promo.png     # أيقونة العروض
```

### 7.2 أصوات الإشعارات (اختياري)

```
public/
  sounds/
    new-order.mp3      # صوت طلب جديد (رنة جرس)
    message.mp3        # صوت رسالة جديدة
    success.mp3        # صوت نجاح العملية
    alert.mp3          # صوت تنبيه
```

---

## 📝 ملخص الملفات المطلوب إنشاؤها

### في Next.js:

```
src/
  lib/
    firebase/
      config.ts           # تهيئة Firebase
      messaging.ts        # دوال FCM
  hooks/
    usePushNotifications.ts
  components/
    NotificationPrompt.tsx  # مكون طلب الإذن

public/
  firebase-messaging-sw.js  # Service Worker
```

### في Supabase:

```
supabase/
  functions/
    send-push-notification/
      index.ts
    handle-new-order/
      index.ts
    handle-order-status/
      index.ts
    handle-new-message/
      index.ts
  migrations/
    20251229_fcm_tables.sql
```

---

## ✅ قائمة المهام

- [ ] إنشاء مشروع Firebase
- [ ] الحصول على Firebase Config و Service Account
- [ ] إضافة المتغيرات البيئية
- [ ] تشغيل SQL لإنشاء الجداول
- [ ] تثبيت Firebase SDK
- [ ] إنشاء Service Worker
- [ ] إنشاء Edge Functions
- [ ] إعداد Database Webhooks
- [ ] اختبار الإشعارات

---

## 🚀 بعد الموافقة

بمجرد موافقتك على هذه الخطة، سأبدأ بـ:

1. إنشاء ملفات SQL للجداول
2. إنشاء ملفات Firebase في Next.js
3. إنشاء Edge Functions

**هل تريد تعديل أي جزء من الخطة؟**
