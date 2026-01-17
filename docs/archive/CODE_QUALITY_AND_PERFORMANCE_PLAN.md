# 📐 خطة الهيكلة والجودة البرمجية والأداء

**التاريخ:** 17 يناير 2026
**الأولوية:** عالية

---

## 📊 ملخص التحليل

| الفئة | الحالة | التفاصيل |
|-------|--------|----------|
| **N+1 Queries** | ❌ 5 حرجة | Loop with await في users.ts |
| **Select *** | ⚠️ 120+ | يجب استبدالها بأعمدة محددة |
| **Repository Pattern** | ⚠️ جزئي | 51 استدعاء مباشر في hooks |
| **img Tags** | ✅ 4 فقط | في banner/page.tsx |
| **Loading States** | ❌ 2% | 2 من 101 صفحة |
| **ISR** | ❌ 0% | لا يوجد static generation |

---

## القسم 1: إصلاح N+1 Queries

### 1.1 المشكلة الحرجة في `src/lib/admin/users.ts`

**الكود الحالي (السطور 186-209):**
```typescript
// ❌ N+1 Query - O(n*2) database calls
for (const order of ordersToCancel) {
  await supabase
    .from('orders')
    .update({ status: 'cancelled', ... })
    .eq('id', order.id);

  await supabase.from('provider_notifications').insert({...});
}
```

**الحل: Batch Updates**
```typescript
// ✅ الحل - O(2) database calls only
async function batchCancelOrders(
  supabase: SupabaseClient,
  ordersToCancel: Order[],
  reason: string,
  timestamp: string
) {
  if (!ordersToCancel.length) return;

  const orderIds = ordersToCancel.map(o => o.id);

  // Batch 1: Update all orders in single query
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

  // Batch 2: Insert all notifications in single query
  const notifications = ordersToCancel.map(order => ({
    provider_id: order.provider_id,
    type: 'order_cancelled',
    title_ar: 'تم إلغاء طلب بسبب حظر العميل',
    title_en: 'Order Cancelled - Customer Banned',
    body_ar: `تم إلغاء الطلب #${order.order_number} بقيمة ${order.total} ج.م بسبب حظر العميل.`,
    body_en: `Order #${order.order_number} (${order.total} EGP) has been cancelled due to customer ban.`,
    related_order_id: order.id,
  }));

  await supabase.from('provider_notifications').insert(notifications);
}
```

### 1.2 إصلاح Product Variants Batch Update

**الملف:** `src/lib/supabase/product-variants.ts:278-303`

```typescript
// ❌ الكود الحالي - N queries
const updates = variantIds.map((id, index) =>
  supabase.from('product_variants').update({ display_order: index }).eq('id', id)
);
await Promise.all(updates);

// ✅ الحل - Single query with SQL function
// أولاً: إنشاء SQL function في Supabase
/*
CREATE OR REPLACE FUNCTION update_variant_orders(updates JSONB)
RETURNS void AS $$
BEGIN
  UPDATE product_variants pv
  SET display_order = (update_item->>'order')::int
  FROM jsonb_array_elements(updates) AS update_item
  WHERE pv.id = (update_item->>'id')::uuid;
END;
$$ LANGUAGE plpgsql;
*/

// ثانياً: استخدام الـ RPC
const { error } = await supabase.rpc('update_variant_orders', {
  updates: JSON.stringify(
    variantIds.map((id, index) => ({ id, order: index }))
  ),
});
```

### 1.3 إصلاح Provider Categories

**الملف:** `src/lib/supabase/provider-categories.ts:200-227`

نفس النمط - استخدام SQL function للـ batch update.

---

## القسم 2: Repository Pattern

### 2.1 الحالة الحالية

| الطبقة | الحالة | المشكلة |
|--------|--------|---------|
| **lib/admin/** | ⚠️ مختلط | 54 استدعاء Supabase مباشر |
| **hooks/** | ❌ سيء | 51 استدعاء مباشر |
| **contexts/** | ❌ سيء | 9 استدعاءات في AdminRegionContext |
| **services/** | ✅ جيد | FinancialService, BroadcastService |

### 2.2 الهيكل المقترح

```
src/lib/
├── repositories/              # NEW: Data Access Layer
│   ├── base-repository.ts
│   ├── providers-repository.ts
│   ├── orders-repository.ts
│   ├── users-repository.ts
│   └── index.ts
├── services/                  # Business Logic Layer
│   ├── providers-service.ts
│   ├── orders-service.ts
│   └── ...
├── hooks/                     # Presentation Layer (No DB calls!)
│   └── useProviders.ts        # Uses ProvidersService
└── contexts/                  # State Management Only
    └── LocationContext.tsx    # No DB calls!
```

### 2.3 مثال Repository

```typescript
// src/lib/repositories/base-repository.ts
import { SupabaseClient } from '@supabase/supabase-js';

export interface IRepository<T> {
  getAll(filters?: Record<string, unknown>): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export abstract class BaseRepository<T> implements IRepository<T> {
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

  // Abstract method - each repository defines its columns
  protected abstract getSelectColumns(): string;
}

// src/lib/repositories/providers-repository.ts
export class ProvidersRepository extends BaseRepository<Provider> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'providers');
  }

  protected getSelectColumns(): string {
    return `
      id, name_ar, name_en, logo_url, cover_url,
      category, status, rating, delivery_fee,
      governorate_id, city_id, commission_rate
    `;
  }

  async getByGovernorate(governorateId: string): Promise<Provider[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(this.getSelectColumns())
      .eq('governorate_id', governorateId)
      .in('status', ['open', 'closed', 'temporarily_paused']);

    if (error) throw error;
    return data as Provider[];
  }
}
```

---

## القسم 3: Technical Debt

### 3.1 تحليل الـ Dependencies

| الحزمة | الإصدار | الحجم | الاستخدام | التوصية |
|--------|---------|-------|----------|---------|
| **firebase** | 12.7.0 | ~100KB | 25 ملف | ✅ ضروري |
| **openai** | 6.9.1 | ~80KB | 1 ملف | 🟡 Lazy load |
| **jspdf** | 3.0.4 | ~150KB | 1 ملف | 🟡 Lazy load |
| **leaflet** | 1.9.4 | ~70KB | 1 ملف | 🟡 Lazy load |
| **framer-motion** | 12.23.26 | ~50KB | كثير | ✅ ضروري |
| **xlsx** | 0.18.5 | ~45KB | 1 ملف | 🟡 Lazy load |
| **anthropic** | 0.71.2 | ~30KB | محدود | 🟡 Lazy load |

### 3.2 حزم يجب تحميلها بـ Lazy Loading

```typescript
// ❌ الحالي - تحميل مع الـ bundle الرئيسي
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Map } from 'react-leaflet';

// ✅ المقترح - Dynamic imports
const generatePDF = async () => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  // ...
};

const ExcelImport = dynamic(() => import('@/components/ExcelImport'), {
  loading: () => <Spinner />,
  ssr: false,
});

const MapComponent = dynamic(() => import('@/components/Map'), {
  loading: () => <MapSkeleton />,
  ssr: false,
});
```

### 3.3 Bundle Size التقديري

| قبل الـ Lazy Loading | بعد الـ Lazy Loading |
|----------------------|----------------------|
| ~850KB (gzipped) | ~500KB (gzipped) |
| First Load JS: ~420KB | First Load JS: ~250KB |

---

## القسم 4: Loading States

### 4.1 الحالة الحالية

```
101 صفحة
├── 2 مع loading.tsx (2%)
│   ├── /auth/callback/loading.tsx
│   └── /admin/loading.tsx
└── 99 بدون loading states
```

### 4.2 الهيكل المطلوب

```
src/app/[locale]/
├── loading.tsx                    # Global loading
├── error.tsx                      # Global error
├── not-found.tsx                  # 404 ✅ موجود
├── (customer)/
│   ├── loading.tsx                # Customer loading skeleton
│   ├── error.tsx                  # Customer error boundary
│   ├── providers/
│   │   └── loading.tsx            # Providers list skeleton
│   └── orders/
│       └── loading.tsx            # Orders list skeleton
├── provider/
│   ├── loading.tsx                # Provider dashboard skeleton
│   ├── error.tsx                  # Provider error boundary
│   └── orders/
│       └── loading.tsx            # Provider orders skeleton
└── admin/
    ├── loading.tsx                # ✅ موجود
    ├── error.tsx                  # Admin error boundary
    └── [sections]/
        └── loading.tsx            # Per-section skeletons
```

### 4.3 نموذج loading.tsx

```typescript
// src/app/[locale]/(customer)/loading.tsx
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
        {/* Search Bar */}
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />

        {/* Categories */}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-20 h-20 bg-slate-200 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>

        {/* Provider Cards */}
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

### 4.4 نموذج error.tsx

```typescript
// src/app/[locale]/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error monitoring service (Sentry)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">
          حدث خطأ غير متوقع
        </h1>

        <p className="text-slate-600 mb-6">
          نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
        </p>

        {error.digest && (
          <p className="text-xs text-slate-400 mb-4">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-[#009DE0] text-white rounded-lg hover:bg-[#0088c2] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            حاول مرة أخرى
          </button>

          <Link
            href="/ar"
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
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

### 4.5 نموذج global-error.tsx

```typescript
// src/app/global-error.tsx
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

---

## القسم 5: استبدال img بـ next/image

### 5.1 الملفات المطلوب تعديلها

فقط **ملف واحد** يحتاج تعديل:
```
src/app/[locale]/provider/banner/page.tsx
└── 4 img tags (السطور: 601, 892, 1124, 1195)
```

### 5.2 التعديلات المطلوبة

```typescript
// قبل (سطر 601-605)
<img
  src={currentBanner.image_url}
  alt=""
  className="w-full h-full object-contain drop-shadow-xl"
/>

// بعد
<div className="relative w-full h-full">
  <Image
    src={currentBanner.image_url}
    alt={currentBanner.title_ar || 'Banner'}
    fill
    sizes="(max-width: 768px) 100vw, 80vw"
    className="object-contain drop-shadow-xl"
    priority={false}
  />
</div>

// قبل (سطر 892-895)
<img
  src={formData.image_url}
  alt="Preview"
  className="w-24 h-24 object-contain rounded-lg bg-slate-100"
/>

// بعد
<Image
  src={formData.image_url}
  alt="Preview"
  width={96}
  height={96}
  className="object-contain rounded-lg bg-slate-100"
/>
```

---

## القسم 6: استراتيجية ISR

### 6.1 الصفحات المرشحة للـ Static Generation

| الصفحة | نوع البيانات | TTL المقترح |
|--------|-------------|-------------|
| `/providers` | قائمة المتاجر | 5 دقائق |
| `/providers/[id]` | تفاصيل المتجر | 1 دقيقة |
| `/categories` | الأصناف | 1 ساعة |
| `/help` | مساعدة | 24 ساعة |
| `/privacy` | سياسة الخصوصية | 24 ساعة |
| `/terms` | الشروط | 24 ساعة |

### 6.2 تطبيق ISR للمتاجر

```typescript
// src/app/[locale]/providers/page.tsx
import { createServerClient } from '@/lib/supabase/server';

// Revalidate every 5 minutes
export const revalidate = 300;

// Generate static params for common governorates
export async function generateStaticParams() {
  return [
    { locale: 'ar' },
    { locale: 'en' },
  ];
}

export default async function ProvidersPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { governorate?: string };
}) {
  const supabase = createServerClient();

  const { data: providers } = await supabase
    .from('providers')
    .select(`
      id, name_ar, name_en, logo_url, category,
      status, rating, delivery_fee, governorate_id
    `)
    .in('status', ['open', 'closed', 'temporarily_paused'])
    .order('rating', { ascending: false })
    .limit(50);

  return <ProvidersList providers={providers} />;
}
```

### 6.3 تطبيق ISR لتفاصيل المتجر

```typescript
// src/app/[locale]/providers/[id]/page.tsx
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

// Revalidate every minute
export const revalidate = 60;

// Generate static paths for popular providers
export async function generateStaticParams() {
  const supabase = createServerClient();

  const { data: providers } = await supabase
    .from('providers')
    .select('id')
    .in('status', ['open', 'closed'])
    .order('rating', { ascending: false })
    .limit(100);

  return (providers || []).flatMap(provider => [
    { locale: 'ar', id: provider.id },
    { locale: 'en', id: provider.id },
  ]);
}

export default async function ProviderPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const supabase = createServerClient();

  const { data: provider } = await supabase
    .from('providers')
    .select(`
      *,
      menu_items(id, name_ar, name_en, price, image_url, is_available)
    `)
    .eq('id', params.id)
    .single();

  if (!provider) notFound();

  return <ProviderDetails provider={provider} />;
}
```

### 6.4 On-Demand Revalidation

```typescript
// src/app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { secret, path, tag } = await request.json();

  // Verify secret
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    if (path) {
      revalidatePath(path);
    }
    if (tag) {
      revalidateTag(tag);
    }
    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (error) {
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}
```

---

## 📋 قائمة المهام

### أولوية حرجة (قبل الإطلاق)

- [ ] **إصلاح N+1 في users.ts** - تحويل loop إلى batch operations
- [ ] **إنشاء global-error.tsx** و **error.tsx**
- [ ] **إضافة loading.tsx** للصفحات الرئيسية (5 ملفات)

### أولوية عالية (خلال أسبوع)

- [ ] **تحويل img إلى next/image** في banner/page.tsx (4 تعديلات)
- [ ] **تطبيق ISR** للمتاجر والأصناف
- [ ] **Lazy loading** للمكتبات الثقيلة (jspdf, xlsx, leaflet)

### أولوية متوسطة (خلال أسبوعين)

- [ ] إنشاء Repository layer
- [ ] نقل DB calls من hooks إلى repositories
- [ ] إصلاح batch updates في product-variants و categories

### أولوية منخفضة (مستقبلاً)

- [ ] استبدال Select * بأعمدة محددة (120 ملف)
- [ ] إنشاء DI container
- [ ] إضافة integration tests

---

## 📊 الوقت المقدر

| المهمة | الساعات |
|--------|---------|
| N+1 Fixes | 4-6 |
| Loading/Error States | 6-8 |
| img → next/image | 1-2 |
| ISR Implementation | 4-6 |
| Lazy Loading | 2-3 |
| Repository Layer | 12-16 |
| **الإجمالي** | **29-41 ساعة** |

---

_آخر تحديث: 17 يناير 2026_
