# 📋 خطة التنفيذ الشاملة - Engezna Master Implementation Plan

**التاريخ:** 17 يناير 2026
**الإصدار:** 1.0
**الحالة:** جاهز للتنفيذ

---

## ⚠️ تنبيه مهم: Prettier Formatting

**قبل كل commit، يجب تشغيل:**

```bash
npx prettier --write "**/*.{ts,tsx,js,jsx,md,json}"
```

أو استخدام الأمر المختصر:

```bash
npm run format
```

**السبب:** المشروع يستخدم CI/CD يفحص Prettier formatting. أي ملف غير منسق سيؤدي لفشل الـ Pipeline.

**البديل الأفضل:** تفعيل Prettier on Save في VS Code:

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

## 📊 الملخص التنفيذي

| الفئة                 | الدرجة الحالية | الهدف      |
| --------------------- | -------------- | ---------- |
| **الأمان السيبراني**  | 70/100         | 95/100     |
| **البنية التحتية**    | 72/100         | 90/100     |
| **جودة الكود**        | 60/100         | 85/100     |
| **أداء الـ Frontend** | 45/100         | 85/100     |
| **المتوسط العام**     | **62/100**     | **89/100** |

### جاهزية 100,000+ مستخدم: ❌ **غير جاهز** (يحتاج إصلاحات حرجة)

---

## 🔴 المرحلة 1: الإصلاحات الحرجة (قبل الإطلاق)

### الوقت المقدر: 25-35 ساعة

---

### 1.1 🔒 Upstash Redis Rate Limiting

**المشكلة:** Rate limiting حالياً in-memory فقط - لا يعمل عبر serverless instances

**الخطوة 1: التثبيت**

```bash
npm install @upstash/ratelimit @upstash/redis
```

**الخطوة 2: Environment Variables**

```env
# .env.local
UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**الخطوة 3: إنشاء `src/lib/utils/upstash-rate-limit.ts`**

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// OTP Send: 5 requests per 10 minutes
export const otpSendLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'ratelimit:otp:send',
  analytics: true,
});

// OTP Verify: 5 requests per 5 minutes
export const otpVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '5 m'),
  prefix: 'ratelimit:otp:verify',
  analytics: true,
});

// Login: 10 requests per 15 minutes
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'ratelimit:auth:login',
  analytics: true,
});

// Password Reset: 3 requests per hour
export const passwordResetLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'ratelimit:auth:reset',
  analytics: true,
});

// Chat API: 30 requests per minute
export const chatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'ratelimit:api:chat',
  analytics: true,
});

// Voice Order: 10 requests per minute
export const voiceOrderLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:api:voice',
  analytics: true,
});

// Order Creation: 20 requests per 5 minutes
export const orderCreationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '5 m'),
  prefix: 'ratelimit:order:create',
  analytics: true,
});

// Search: 60 requests per minute
export const searchLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'ratelimit:api:search',
  analytics: true,
});

// Helper Functions
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitResult> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}

export function getClientIdentifier(request: Request, userId?: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || 'unknown';
  return userId ? `${ip}:${userId}` : ip;
}

export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  return headers;
}

export function rateLimitErrorResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        ...Object.fromEntries(rateLimitHeaders(result)),
      },
    }
  );
}
```

**الخطوة 4: تطبيق على API Routes**

| الملف                              | الـ Limiter            |
| ---------------------------------- | ---------------------- |
| `api/chat/route.ts`                | `chatLimiter`          |
| `api/voice-order/process/route.ts` | `voiceOrderLimiter`    |
| `api/voice-order/confirm/route.ts` | `orderCreationLimiter` |

---

### 1.2 🛡️ إصلاح XSS في Export Service

**الملف:** `src/lib/finance/export-service.ts:546`

**المشكلة:**

```typescript
// ❌ الحالي - XSS vulnerability
printWindow.document.write(html);
// html contains unescaped: providerName, orderNumber, adminName, notes
```

**الحل:**

```typescript
import { escapeHtml } from '@/lib/security/xss';

// في generateSettlementHTML function
const safeProviderName = escapeHtml(providerName?.[locale] || '-');
const safeOrderNumber = escapeHtml(order.orderNumber);
const safeAdminName = escapeHtml(entry.adminName || '-');
const safeNotes = escapeHtml(entry.notes || '-');
```

---

### 1.3 ✅ Zod Validation للـ API Routes

**المشكلة:** 0% من الـ 25 API routes تستخدم Zod validation

**إنشاء `src/lib/validation/schemas.ts`:**

```typescript
import { z } from 'zod';

// Common Schemas
export const uuidSchema = z.string().uuid();

export const egyptianPhoneSchema = z
  .string()
  .regex(/^01[0-2,5]{1}[0-9]{8}$/, 'رقم هاتف مصري غير صحيح');

export const emailSchema = z.string().email().max(255);

export const passwordSchema = z.string().min(8).max(128);

// Auth Schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().min(2).max(100),
  phone: egyptianPhoneSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

// Chat Schemas
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(10000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  providerId: uuidSchema.optional(),
  mode: z.enum(['customer', 'provider']).optional(),
});

// Order Schemas
export const orderItemSchema = z.object({
  productId: uuidSchema,
  providerId: uuidSchema,
  quantity: z.number().int().min(1).max(100),
  price: z.number().positive().max(100000),
  notes: z.string().max(500).optional(),
});

export const voiceOrderConfirmSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(50),
  customerId: uuidSchema.optional(),
});

// Payment Schemas
export const paymentInitiateSchema = z.object({
  orderData: z.object({
    provider_id: uuidSchema,
    total: z.number().positive().max(1000000),
    cart_items: z
      .array(
        z.object({
          id: uuidSchema,
          quantity: z.number().int().positive(),
          price: z.number().positive(),
        })
      )
      .min(1),
  }),
});
```

**إنشاء `src/lib/validation/middleware.ts`:**

```typescript
import { NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (request: Request): Promise<{ data: T } | { error: NextResponse }> => {
    try {
      const body = await request.json();
      const data = schema.parse(body);
      return { data };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          error: NextResponse.json(
            {
              error: 'Validation Error',
              details: error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
              })),
            },
            { status: 400 }
          ),
        };
      }
      return {
        error: NextResponse.json({ error: 'Invalid request body' }, { status: 400 }),
      };
    }
  };
}
```

---

### 1.4 🗄️ إصلاح N+1 Queries

**الملف الحرج:** `src/lib/admin/users.ts:186-209`

**المشكلة:**

```typescript
// ❌ N+1 Query - O(n*2) database calls
for (const order of ordersToCancel) {
  await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
  await supabase.from('provider_notifications').insert({...});
}
```

**الحل: Batch Updates**

```typescript
// ✅ O(2) database calls only
async function batchCancelOrders(
  supabase: SupabaseClient,
  ordersToCancel: Order[],
  reason: string,
  timestamp: string
) {
  if (!ordersToCancel.length) return;

  const orderIds = ordersToCancel.map((o) => o.id);

  // Batch 1: Update all orders
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: timestamp,
      cancellation_reason: `تم إلغاء الطلب بسبب حظر العميل - السبب: ${reason.trim()}`,
      updated_at: timestamp,
    })
    .in('id', orderIds);

  if (updateError) throw updateError;

  // Batch 2: Insert all notifications
  const notifications = ordersToCancel.map((order) => ({
    provider_id: order.provider_id,
    type: 'order_cancelled',
    title_ar: 'تم إلغاء طلب بسبب حظر العميل',
    title_en: 'Order Cancelled - Customer Banned',
    body_ar: `تم إلغاء الطلب #${order.order_number} بقيمة ${order.total} ج.م`,
    body_en: `Order #${order.order_number} (${order.total} EGP) cancelled`,
    related_order_id: order.id,
  }));

  await supabase.from('provider_notifications').insert(notifications);
}
```

**ملفات N+1 إضافية:**
| الملف | السطور | الحل |
|-------|--------|------|
| `product-variants.ts` | 278-303 | SQL function + RPC |
| `provider-categories.ts` | 200-227 | SQL function + RPC |
| `financial-service.ts` | 196-198 | Join query |

---

### 1.5 🚨 Error Boundaries

**إنشاء `src/app/global-error.tsx`:**

```typescript
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              حدث خطأ في التطبيق
            </h2>
            <p className="text-slate-600 mb-6">
              نعتذر عن هذا الخلل. فريقنا تم إبلاغه.
            </p>
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-[#009DE0] text-white rounded-lg font-medium"
            >
              حاول مرة أخرى
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

**إنشاء `src/app/[locale]/error.tsx`:**

```typescript
'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
    // TODO: Send to Sentry
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">حدث خطأ غير متوقع</h1>
        <p className="text-slate-600 mb-6">نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.</p>
        {error.digest && (
          <p className="text-xs text-slate-400 mb-4">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-[#009DE0] text-white rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            حاول مرة أخرى
          </button>
          <Link
            href="/ar"
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg"
          >
            <Home className="w-4 h-4" />
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

### 1.6 🔍 SEO Critical Files

**إنشاء `src/app/robots.ts`:**

```typescript
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://engezna.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/provider/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

**إنشاء `src/app/sitemap.ts`:**

```typescript
import { MetadataRoute } from 'next';
import { createServerClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://engezna.com';
  const supabase = createServerClient();

  // Get all active providers
  const { data: providers } = await supabase
    .from('providers')
    .select('id, updated_at')
    .in('status', ['open', 'closed', 'temporarily_paused']);

  const staticPages = [
    { url: `${baseUrl}/ar`, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/en`, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/ar/providers`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/en/providers`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/ar/offers`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/en/offers`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/ar/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${baseUrl}/ar/terms`, lastModified: new Date(), priority: 0.3 },
  ];

  const providerPages = (providers || []).flatMap((provider) => [
    {
      url: `${baseUrl}/ar/providers/${provider.id}`,
      lastModified: new Date(provider.updated_at),
      priority: 0.7,
    },
    {
      url: `${baseUrl}/en/providers/${provider.id}`,
      lastModified: new Date(provider.updated_at),
      priority: 0.7,
    },
  ]);

  return [...staticPages, ...providerPages];
}
```

---

## 🟡 المرحلة 2: تحسينات الأداء (الأسبوع الأول)

### الوقت المقدر: 20-30 ساعة

---

### 2.1 🔄 Zustand Selectors

**المشكلة:** Re-renders كثيرة بسبب الاشتراك في كل الـ Store

**الملفات المطلوب تعديلها:**

| الملف                      | السطر   | الحالي                               | المطلوب                                             |
| -------------------------- | ------- | ------------------------------------ | --------------------------------------------------- |
| `BottomNavigation.tsx`     | 22      | `const { cart } = useCart()`         | `const count = useCart(s => s.cart.reduce(...))`    |
| `SmartAssistant.tsx`       | 176     | `const { getItemCount } = useCart()` | `const getItemCount = useCart(s => s.getItemCount)` |
| `CustomOrderInterface.tsx` | 109     | `const cart = useCart()`             | Individual selectors                                |
| `useAIChat.ts`             | 104-117 | Destructure all                      | Individual selectors                                |

**مثال التعديل:**

```typescript
// ❌ قبل - يشترك في كل الـ Store
const { cart } = useCart();
const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

// ✅ بعد - يشترك في القيمة المحسوبة فقط
const cartItemsCount = useCart((state) => state.cart.reduce((sum, item) => sum + item.quantity, 0));
```

**التأثير المتوقع:** تقليل 30-40% من Re-renders

---

### 2.2 🧠 Memoize Context Values

**الملف:** `src/lib/contexts/LocationContext.tsx`

**المشكلة (lines 350-368):**

```typescript
// ❌ كائن جديد في كل render
const value: LocationContextValue = {
  governorates, cities, districts, userLocation, ...
};
return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
```

**الحل:**

```typescript
// ✅ Memoized value
const value = useMemo(() => ({
  governorates,
  cities,
  districts,
  userLocation,
  isDataLoading,
  isDataLoaded,
  isUserLocationLoading,
  getCitiesByGovernorate,
  getDistrictsByCity,
  getGovernorateById,
  getCityById,
  setUserLocation,
  refreshLocationData: () => loadLocationData(true),
  refreshUserLocation: loadUserLocation,
}), [
  governorates, cities, districts, userLocation,
  isDataLoading, isDataLoaded, isUserLocationLoading,
  getCitiesByGovernorate, getDistrictsByCity,
  getGovernorateById, getCityById, setUserLocation,
  loadLocationData, loadUserLocation
]);

return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
```

**نفس التعديل لـ:** `AdminRegionContext.tsx`

**التأثير المتوقع:** تقليل 50-60% من Re-renders

---

### 2.3 📱 Loading States

**الحالة الحالية:** 2 من 101 صفحة (2%)

**الملفات المطلوب إنشاؤها:**

```
src/app/[locale]/
├── loading.tsx                    # ✅ إنشاء
├── error.tsx                      # ✅ إنشاء (تم في المرحلة 1)
├── (customer)/
│   └── loading.tsx                # ✅ إنشاء
├── provider/
│   ├── loading.tsx                # ✅ إنشاء
│   └── error.tsx                  # ✅ إنشاء
└── admin/
    ├── loading.tsx                # ✅ موجود
    └── error.tsx                  # ✅ إنشاء
```

**نموذج `src/app/[locale]/(customer)/loading.tsx`:**

```typescript
export default function CustomerLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Skeleton */}
      <div className="h-16 bg-white border-b animate-pulse">
        <div className="container mx-auto px-4 flex items-center justify-between h-full">
          <div className="w-24 h-8 bg-slate-200 rounded" />
          <div className="w-8 h-8 bg-slate-200 rounded-full" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="container mx-auto px-4 py-6 space-y-4">
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-20 h-20 bg-slate-200 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 2.4 🖼️ استبدال img بـ next/image

**الملف الوحيد:** `src/app/[locale]/provider/banner/page.tsx`

**التعديلات (4 مواقع):**

| السطر | قبل                                     | بعد                                          |
| ----- | --------------------------------------- | -------------------------------------------- |
| 601   | `<img src={currentBanner.image_url} />` | `<Image src={...} fill sizes="..." />`       |
| 892   | `<img src={formData.image_url} />`      | `<Image src={...} width={96} height={96} />` |
| 1124  | `<img ... />`                           | `<Image ... />`                              |
| 1195  | `<img ... />`                           | `<Image ... />`                              |

---

### 2.5 ⚡ ISR للصفحات الثابتة

**صفحات المتاجر `src/app/[locale]/providers/page.tsx`:**

```typescript
// Revalidate every 5 minutes
export const revalidate = 300;

export async function generateStaticParams() {
  return [{ locale: 'ar' }, { locale: 'en' }];
}

export default async function ProvidersPage({ params }: { params: { locale: string } }) {
  const supabase = createServerClient();

  const { data: providers } = await supabase
    .from('providers')
    .select('id, name_ar, name_en, logo_url, category, status, rating, delivery_fee')
    .in('status', ['open', 'closed', 'temporarily_paused'])
    .order('rating', { ascending: false })
    .limit(50);

  return <ProvidersList providers={providers} />;
}
```

**صفحة تفاصيل المتجر `src/app/[locale]/providers/[id]/page.tsx`:**

```typescript
// Revalidate every minute
export const revalidate = 60;

export async function generateStaticParams() {
  const supabase = createServerClient();
  const { data: providers } = await supabase
    .from('providers')
    .select('id')
    .in('status', ['open', 'closed'])
    .order('rating', { ascending: false })
    .limit(100);

  return (providers || []).flatMap((p) => [
    { locale: 'ar', id: p.id },
    { locale: 'en', id: p.id },
  ]);
}

export async function generateMetadata({ params }: { params: { locale: string; id: string } }) {
  const supabase = createServerClient();
  const { data: provider } = await supabase
    .from('providers')
    .select('name_ar, name_en, description_ar, description_en, cover_image_url, rating')
    .eq('id', params.id)
    .single();

  if (!provider) return { title: 'Provider Not Found' };

  const name = params.locale === 'ar' ? provider.name_ar : provider.name_en;
  const description = params.locale === 'ar' ? provider.description_ar : provider.description_en;

  return {
    title: `${name} - ${provider.rating}⭐ | إنجزنا`,
    description,
    openGraph: {
      title: name,
      description,
      images: [{ url: provider.cover_image_url }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      images: [provider.cover_image_url],
    },
  };
}
```

---

### 2.6 📦 Dynamic Imports للمكتبات الثقيلة

| المكتبة | الحجم  | الملف         | التعديل            |
| ------- | ------ | ------------- | ------------------ |
| jsPDF   | ~150KB | Admin exports | `dynamic import()` |
| xlsx    | ~45KB  | Admin imports | `dynamic import()` |
| Leaflet | ~70KB  | Maps          | Already dynamic ✅ |
| OpenAI  | ~80KB  | Chat          | `dynamic import()` |

**مثال:**

```typescript
// ❌ قبل
import jsPDF from 'jspdf';

// ✅ بعد
const generatePDF = async () => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  // ...
};
```

---

## 🟠 المرحلة 3: تحسينات هيكلية (الأسبوع الثاني)

### الوقت المقدر: 15-25 ساعة

---

### 3.1 📂 تقسيم LocationContext

**تحويل من context واحد ضخم إلى 3 contexts متخصصة:**

```typescript
// Context 1: بيانات ثابتة (نادراً ما تتغير)
export const LocationDataContext = createContext<{
  governorates: Governorate[];
  cities: City[];
  districts: District[];
  isDataLoading: boolean;
  isDataLoaded: boolean;
}>(null!);

// Context 2: موقع المستخدم (يتغير بشكل متكرر)
export const UserLocationContext = createContext<{
  userLocation: UserLocation;
  isUserLocationLoading: boolean;
  setUserLocation: (location: UserLocation) => Promise<void>;
}>(null!);

// Context 3: Helper functions (ثابتة)
export const LocationHelpersContext = createContext<{
  getCitiesByGovernorate: (id: string) => City[];
  getDistrictsByCity: (id: string) => District[];
  getGovernorateById: (id: string) => Governorate | undefined;
  getCityById: (id: string) => City | undefined;
}>(null!);
```

**التأثير المتوقع:** تقليل 70% من Re-renders

---

### 3.2 🏗️ Repository Pattern

**الهيكل المقترح:**

```
src/lib/
├── repositories/              # Data Access Layer
│   ├── base-repository.ts
│   ├── providers-repository.ts
│   ├── orders-repository.ts
│   └── users-repository.ts
├── services/                  # Business Logic Layer
│   ├── providers-service.ts
│   └── orders-service.ts
└── hooks/                     # Presentation Layer (NO DB calls!)
    └── useProviders.ts
```

**مثال `base-repository.ts`:**

```typescript
export abstract class BaseRepository<T> {
  constructor(
    protected supabase: SupabaseClient,
    protected tableName: string
  ) {}

  async getAll(filters?: Record<string, unknown>): Promise<T[]> {
    let query = this.supabase.from(this.tableName).select(this.getSelectColumns());
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as T[];
  }

  protected abstract getSelectColumns(): string;
}
```

---

### 3.3 🔔 Error Handling في Realtime

**المشكلة:** 28 من 31 subscription بدون error handling

**الحل:**

```typescript
// ❌ قبل
const channel = supabase.channel('orders').on('postgres_changes', {...}).subscribe();

// ✅ بعد
const channel = supabase
  .channel('orders')
  .on('postgres_changes', {...}, (payload) => {
    // handle update
  })
  .subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      console.log('Connected to orders channel');
    }
    if (status === 'CHANNEL_ERROR') {
      console.error('Orders channel error:', err);
      // Implement polling fallback
      startPollingFallback();
    }
    if (status === 'TIMED_OUT') {
      console.warn('Orders channel timed out, retrying...');
      channel.subscribe();
    }
  });
```

---

### 3.4 🧩 React.memo للمكونات الثابتة

| المكون             | الملف              | السبب             |
| ------------------ | ------------------ | ----------------- |
| `BottomNavigation` | layout components  | يعاد رندره كثيراً |
| `CustomerHeader`   | layout components  | يعاد رندره كثيراً |
| `MessageBubble`    | chat components    | قوائم طويلة       |
| `ProductCard`      | product components | قوائم طويلة       |

**مثال:**

```typescript
export const BottomNavigation = React.memo(function BottomNavigation() {
  // component code
});
```

---

## 🟢 المرحلة 4: تحسينات مستقبلية (اختياري)

### الوقت المقدر: 30-50 ساعة

---

### 4.1 استبدال Select \* بأعمدة محددة

**الحالة:** 120+ instances

**الأولوية:** منخفضة (لا يؤثر على الوظائف)

---

### 4.2 Sentry Error Monitoring

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

---

### 4.3 Vercel Analytics & Cron Jobs

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/settlements",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

### 4.4 Bundle Size Optimization

**الهدف:**
| الحالة | الحالي | الهدف |
|--------|--------|-------|
| First Load JS | ~420KB | ~250KB |
| Total Bundle | ~850KB | ~500KB |

---

## 📊 ملخص الأولويات

### 🔴 حرجة (يجب قبل الإطلاق) - 25-35 ساعة

- [x] Upstash Redis Rate Limiting (2026-01-17) ✅
- [x] إصلاح XSS في export-service.ts (2026-01-17) ✅
- [x] Zod Validation للـ critical routes (2026-01-18) ✅
- [x] إصلاح N+1 في users.ts (2026-01-18) ✅
- [x] إنشاء Error Boundaries (2026-01-18) ✅
- [ ] إنشاء robots.txt و sitemap.ts

### 🟡 عالية (الأسبوع الأول) - 20-30 ساعة

- [ ] Zustand Selectors
- [ ] Memoize Context Values
- [ ] Loading States (5 ملفات)
- [ ] img → next/image (4 تعديلات)
- [ ] ISR للمتاجر
- [ ] Dynamic Imports

### 🟠 متوسطة (الأسبوع الثاني) - 15-25 ساعة

- [ ] تقسيم LocationContext
- [ ] Repository Pattern
- [ ] Error Handling في Realtime
- [ ] React.memo

### 🟢 منخفضة (مستقبلاً) - 30-50 ساعة

- [ ] Select \* → specific columns
- [ ] Sentry integration
- [ ] Vercel cron jobs
- [ ] Bundle optimization

---

## 📈 الجدول الزمني المقترح

| الأسبوع | المرحلة               | الساعات | الهدف               |
| ------- | --------------------- | ------- | ------------------- |
| 1       | المرحلة 1 (الحرجة)    | 25-35   | جاهز للإطلاق الأولي |
| 2       | المرحلة 2 (الأداء)    | 20-30   | أداء محسّن          |
| 3       | المرحلة 3 (الهيكلة)   | 15-25   | كود نظيف            |
| 4+      | المرحلة 4 (التحسينات) | 30-50   | تحسينات مستمرة      |

**الإجمالي:** 90-140 ساعة

---

## ✅ قائمة التحقق النهائية

### قبل الإطلاق (Checklist)

- [x] Rate limiting يعمل على Upstash Redis (2026-01-17) ✅
- [x] XSS محمي في كل exports (2026-01-17) ✅
- [x] Zod validation على `/api/chat`, `/api/voice-order/*` (2026-01-18) ✅
- [x] N+1 queries محلولة (2026-01-18) ✅
- [x] Error boundaries موجودة (2026-01-18) ✅
- [ ] robots.txt و sitemap.ts يعملان
- [ ] SEO metadata للمتاجر

### بعد الإطلاق (Monitoring)

- [ ] Sentry يراقب الأخطاء
- [ ] Vercel Analytics يتتبع الأداء
- [ ] Upstash Analytics يراقب Rate Limits

---

## 📚 المراجع

- [Upstash Redis](https://upstash.com/)
- [Zod Documentation](https://zod.dev/)
- [Next.js ISR](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/auto-generating-selectors)
- [React Performance](https://react.dev/learn/render-and-commit)

---

_آخر تحديث: 17 يناير 2026_
_تم دمج: SECURITY_IMPLEMENTATION_PLAN.md + INFRASTRUCTURE_AUDIT_REPORT.md + CODE_QUALITY_AND_PERFORMANCE_PLAN.md + FRONTEND_PERFORMANCE_AUDIT.md_
