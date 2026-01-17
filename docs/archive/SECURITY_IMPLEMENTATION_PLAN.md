# 🔒 خطة الأمان السيبراني - Engezna Security Implementation Plan

**التاريخ:** 17 يناير 2026
**الأولوية:** حرجة - يجب التنفيذ قبل الإطلاق

---

## 📊 ملخص نتائج التدقيق الأمني

| الفئة                 | الحالة         | المشاكل              |
| --------------------- | -------------- | -------------------- |
| **Hardcoded Secrets** | ⚠️ تحتاج إصلاح | 1 حرجة (Firebase SW) |
| **Zod Validation**    | ❌ غير موجود   | 0% من الـ Routes     |
| **Rate Limiting**     | ⚠️ جزئي        | In-Memory فقط        |
| **XSS Protection**    | ⚠️ تحتاج إصلاح | 1 حرجة (Export)      |

---

## 🔴 المشاكل الحرجة

### 1. Firebase Secrets Hardcoded

**الملف:** `public/firebase-messaging-sw.js`

```javascript
// ❌ المشكلة الحالية
const firebaseConfig = {
  apiKey: 'AIzaSyAMUPCzi2GacDUFIwFLZA11vpFI-bhAAmg', // HARDCODED!
  authDomain: 'engezna-6edd0.firebaseapp.com',
  projectId: 'engezna-6edd0',
  // ...
};
```

**الحل:** نقل الإعدادات للـ environment variables أو استخدام build-time injection.

---

### 2. XSS في Export Service

**الملف:** `src/lib/finance/export-service.ts:546`

```typescript
// ❌ المشكلة الحالية
printWindow.document.write(html);
// html contains unescaped: providerName, orderNumber, adminName, notes
```

**الحل:**

```typescript
import { escapeHtml } from '@/lib/security/xss';

// ✅ الحل
const safeProviderName = escapeHtml(providerName?.[locale] || '-');
const safeOrderNumber = escapeHtml(order.orderNumber);
const safeAdminName = escapeHtml(entry.adminName || '-');
const safeNotes = escapeHtml(entry.notes || '-');
```

---

### 3. عدم وجود Zod Validation

**25 API Route بدون Zod validation!**

---

### 4. Rate Limiting In-Memory فقط

**المشكلة:** لا يعمل عبر serverless instances متعددة.

---

## 🛠️ خطة التنفيذ

### المرحلة 1: Upstash Redis Rate Limiting (4-6 ساعات)

#### الخطوة 1: تثبيت الـ Packages

```bash
npm install @upstash/ratelimit @upstash/redis
```

#### الخطوة 2: إضافة Environment Variables

```env
# .env.local
UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

#### الخطوة 3: إنشاء Rate Limiter الجديد

**إنشاء ملف:** `src/lib/utils/upstash-rate-limit.ts`

```typescript
/**
 * Distributed Rate Limiting with Upstash Redis
 * Works across all serverless instances
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// Pre-configured Rate Limiters
// ============================================

/**
 * OTP Send: 5 requests per 10 minutes
 */
export const otpSendLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'ratelimit:otp:send',
  analytics: true,
});

/**
 * OTP Verify: 5 requests per 5 minutes
 */
export const otpVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '5 m'),
  prefix: 'ratelimit:otp:verify',
  analytics: true,
});

/**
 * Login: 10 requests per 15 minutes
 */
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'),
  prefix: 'ratelimit:auth:login',
  analytics: true,
});

/**
 * Password Reset: 3 requests per hour
 */
export const passwordResetLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'ratelimit:auth:reset',
  analytics: true,
});

/**
 * API Chat: 30 requests per minute (prevent token exhaustion)
 */
export const chatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'ratelimit:api:chat',
  analytics: true,
});

/**
 * Voice Order: 10 requests per minute
 */
export const voiceOrderLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:api:voice',
  analytics: true,
});

/**
 * Order Creation: 20 requests per 5 minutes
 */
export const orderCreationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '5 m'),
  prefix: 'ratelimit:order:create',
  analytics: true,
});

/**
 * Search: 60 requests per minute
 */
export const searchLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'ratelimit:api:search',
  analytics: true,
});

// ============================================
// Helper Functions
// ============================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit and return standardized result
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitResult> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    success,
    limit,
    remaining,
    reset,
  };
}

/**
 * Get client identifier from request
 * Uses IP + optional user identifier for better accuracy
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] || 'unknown';

  if (userId) {
    return `${ip}:${userId}`;
  }

  return ip;
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  return headers;
}

/**
 * Rate limit error response
 */
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

#### الخطوة 4: استخدام Rate Limiter في API Routes

**مثال: `src/app/api/chat/route.ts`**

```typescript
import {
  chatLimiter,
  getClientIdentifier,
  checkRateLimit,
  rateLimitErrorResponse,
} from '@/lib/utils/upstash-rate-limit';

export async function POST(request: Request) {
  // Rate limiting
  const identifier = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(chatLimiter, identifier);

  if (!rateLimit.success) {
    return rateLimitErrorResponse(rateLimit);
  }

  // ... rest of the handler
}
```

**مثال: `src/app/api/voice-order/process/route.ts`**

```typescript
import {
  voiceOrderLimiter,
  getClientIdentifier,
  checkRateLimit,
  rateLimitErrorResponse,
} from '@/lib/utils/upstash-rate-limit';

export async function POST(request: Request) {
  // Rate limiting
  const identifier = getClientIdentifier(request);
  const rateLimit = await checkRateLimit(voiceOrderLimiter, identifier);

  if (!rateLimit.success) {
    return rateLimitErrorResponse(rateLimit);
  }

  // ... rest of the handler
}
```

---

### المرحلة 2: Zod Validation (8-12 ساعة)

#### الخطوة 1: إنشاء Schemas مشتركة

**إنشاء ملف:** `src/lib/validation/schemas.ts`

```typescript
import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const uuidSchema = z.string().uuid();

export const egyptianPhoneSchema = z
  .string()
  .regex(/^01[0-2,5]{1}[0-9]{8}$/, 'رقم هاتف مصري غير صحيح');

export const emailSchema = z.string().email('بريد إلكتروني غير صحيح').max(255);

export const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .max(128);

// ============================================
// Auth Schemas
// ============================================

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

// ============================================
// Chat Schemas
// ============================================

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(10000),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(100),
  providerId: uuidSchema.optional(),
  mode: z.enum(['customer', 'provider']).optional(),
});

// ============================================
// Order Schemas
// ============================================

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

// ============================================
// Admin Schemas
// ============================================

export const adminActionSchema = z.object({
  action: z.enum(['list', 'get', 'update', 'ban', 'unban', 'changeRole']),
  params: z.record(z.unknown()).optional(),
});

export const banUserSchema = z.object({
  userId: uuidSchema,
  reason: z.string().min(10).max(500),
});

// ============================================
// Payment Schemas
// ============================================

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

#### الخطوة 2: إنشاء Middleware للـ Validation

**إنشاء ملف:** `src/lib/validation/middleware.ts`

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

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (searchParams: URLSearchParams): { data: T } | { error: NextResponse } => {
    try {
      const params = Object.fromEntries(searchParams.entries());
      const data = schema.parse(params);
      return { data };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          error: NextResponse.json(
            {
              error: 'Validation Error',
              details: error.errors,
            },
            { status: 400 }
          ),
        };
      }
      return {
        error: NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 }),
      };
    }
  };
}
```

---

### المرحلة 3: إصلاح XSS (2-3 ساعات)

#### إصلاح Export Service

**الملف:** `src/lib/finance/export-service.ts`

```typescript
// Add import at top
import { escapeHtml } from '@/lib/security/xss';

// Update generateSettlementHTML function (around line 346)
// Replace:
${providerName?.[locale] || '-'}

// With:
${escapeHtml(providerName?.[locale] || '-')}

// Apply same to all user-provided data:
// - order.orderNumber
// - entry.adminName
// - entry.notes
// - any customer names
// - any provider names
```

---

### المرحلة 4: إصلاح Firebase Config (1-2 ساعة)

#### الحل المقترح: Build-time Injection

**تحديث ملف:** `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    // ... other Firebase config
  },
  // ... rest of config
};
```

**ملاحظة:** Service Workers لا يمكنها الوصول لـ process.env مباشرة. الحل:

1. استخدام Workbox مع injection
2. أو إنشاء endpoint يوفر الـ config
3. أو قبول أن Firebase API keys عامة (لكن مع Domain Restrictions في Firebase Console)

---

## 📋 قائمة المهام

### حرجة (يجب قبل الإطلاق)

- [ ] **تثبيت Upstash Redis** وإنشاء `upstash-rate-limit.ts`
- [ ] **إضافة rate limiting** لـ `/api/chat`, `/api/voice-order/*`
- [ ] **إصلاح XSS** في `export-service.ts`
- [ ] **إنشاء Zod schemas** للـ routes الحرجة

### عالية (خلال أسبوع)

- [ ] تطبيق Zod على جميع API routes
- [ ] إضافة error boundaries
- [ ] تكوين Sentry للـ error monitoring

### متوسطة (خلال أسبوعين)

- [ ] تحسين Firebase config handling
- [ ] إضافة audit logging للـ security events
- [ ] تنفيذ CSP headers

---

## 📊 الوقت المقدر

| المهمة                           | الساعات        |
| -------------------------------- | -------------- |
| Upstash Rate Limiting            | 4-6            |
| Zod Validation (critical routes) | 8-12           |
| XSS Fix                          | 2-3            |
| Firebase Config                  | 1-2            |
| Testing & Verification           | 4-6            |
| **الإجمالي**                     | **19-29 ساعة** |

---

## 🔗 الموارد

- [Upstash Redis](https://upstash.com/)
- [Upstash Ratelimit](https://github.com/upstash/ratelimit)
- [Zod Documentation](https://zod.dev/)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

_آخر تحديث: 17 يناير 2026_
