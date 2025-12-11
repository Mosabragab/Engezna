# 📊 دليل تحسين الأداء - Engezna
# Performance Optimization Guide

**الإصدار:** 1.0
**تاريخ الإنشاء:** December 11, 2025
**آخر تحديث:** December 11, 2025
**الحالة:** للاستخدام بعد الإطلاق (Post-Launch Reference)

---

## 📋 جدول المحتويات

1. [مقدمة ومتى نستخدم هذا الدليل](#-مقدمة-ومتى-نستخدم-هذا-الدليل)
2. [أدوات القياس والمراقبة](#-أدوات-القياس-والمراقبة)
3. [الخطوة 1: تحديد المشاكل](#-الخطوة-1-تحديد-المشاكل)
4. [الخطوة 2: حل مشكلة N+1 Queries](#-الخطوة-2-حل-مشكلة-n1-queries)
5. [الخطوة 3: تحسين قاعدة البيانات](#-الخطوة-3-تحسين-قاعدة-البيانات)
6. [الخطوة 4: التخزين المؤقت (Caching)](#-الخطوة-4-التخزين-المؤقت-caching)
7. [الخطوة 5: تحسين الواجهة الأمامية](#-الخطوة-5-تحسين-الواجهة-الأمامية)
8. [الخطوة 6: تحسين الصور والملفات](#-الخطوة-6-تحسين-الصور-والملفات)
9. [قوائم التحقق السريعة](#-قوائم-التحقق-السريعة)
10. [مؤشرات الأداء المستهدفة](#-مؤشرات-الأداء-المستهدفة)
11. [خطة التصعيد](#-خطة-التصعيد)

---

## 🎯 مقدمة ومتى نستخدم هذا الدليل

### متى نبدأ بتحسين الأداء؟

| المؤشر | القيمة الحرجة | الإجراء |
|--------|---------------|---------|
| زمن تحميل الصفحة | > 3 ثواني | ابدأ التحسين |
| زمن استجابة API | > 500ms | راجع الاستعلامات |
| معدل الخطأ | > 1% | تحقق من السجلات |
| استخدام الذاكرة | > 80% | راجع التسريبات |
| شكاوى المستخدمين | > 5 يومياً | أولوية قصوى |

### ⚠️ قاعدة ذهبية

```
لا تحسّن ما لم تقس أولاً!
"Premature optimization is the root of all evil" - Donald Knuth
```

### مراحل التحسين

```
1. القياس (Measure) → 2. التحديد (Identify) → 3. التحسين (Optimize) → 4. التحقق (Verify)
                                    ↑                                            |
                                    └────────────────────────────────────────────┘
```

---

## 🔧 أدوات القياس والمراقبة

### 1. Supabase Dashboard

```
الموقع: https://supabase.com/dashboard/project/[PROJECT_ID]
```

#### أ. Query Performance (أهم أداة)

```
المسار: Database → Query Performance
```

**ما نبحث عنه:**
- ✅ الاستعلامات الأبطأ (Sort by: Mean Time DESC)
- ✅ الاستعلامات الأكثر تكراراً (Sort by: Calls DESC)
- ✅ الاستعلامات التي تستهلك وقتاً إجمالياً (Sort by: Total Time DESC)

**مثال على استعلام مشكل:**
```sql
-- ❌ استعلام بطيء (> 100ms)
SELECT * FROM orders WHERE customer_id = $1
-- Calls: 50,000 | Mean Time: 250ms | Total Time: 12,500s

-- السبب المحتمل: لا يوجد Index على customer_id
```

#### ب. Database Health

```
المسار: Database → Database Health
```

**المؤشرات المهمة:**
| المؤشر | القيمة الصحية | القيمة الخطرة |
|--------|---------------|---------------|
| Active Connections | < 50 | > 80 |
| Database Size | < 500MB | > 1GB |
| Cache Hit Ratio | > 99% | < 95% |

### 2. Vercel Analytics

```
الموقع: https://vercel.com/[TEAM]/engezna/analytics
```

**ما نراقبه:**
- ✅ Core Web Vitals (LCP, FID, CLS)
- ✅ Page Load Time per Route
- ✅ Error Rate by Endpoint

### 3. أدوات المتصفح

#### Chrome DevTools - Network Tab

```javascript
// في Console للتحقق من عدد الطلبات
performance.getEntriesByType('resource').length
```

#### Lighthouse Audit

```
المسار: DevTools → Lighthouse → Generate Report
الهدف: Performance Score > 90
```

### 4. سجلات التطبيق (Application Logs)

```typescript
// إضافة قياس الوقت للاستعلامات الحرجة
const startTime = performance.now();

const { data, error } = await supabase
  .from('providers')
  .select('*');

const endTime = performance.now();
console.log(`Query took ${endTime - startTime}ms`);

// ⚠️ تنبيه إذا تجاوز 200ms
if (endTime - startTime > 200) {
  console.warn('Slow query detected:', { duration: endTime - startTime });
}
```

---

## 🔍 الخطوة 1: تحديد المشاكل

### 1.1 إنشاء Performance Baseline

قبل أي تحسين، سجّل الأداء الحالي:

```markdown
## Performance Baseline - [التاريخ]

### API Response Times
| Endpoint | Current | Target |
|----------|---------|--------|
| GET /api/providers | ___ms | <200ms |
| GET /api/orders | ___ms | <300ms |
| POST /api/orders | ___ms | <500ms |

### Page Load Times
| Page | Current | Target |
|------|---------|--------|
| / (Home) | ___s | <2s |
| /providers | ___s | <2s |
| /providers/[id] | ___s | <2.5s |
| /checkout | ___s | <2s |

### Database Metrics
| Metric | Current | Target |
|--------|---------|--------|
| Avg Query Time | ___ms | <50ms |
| Cache Hit Ratio | ___% | >99% |
| Active Connections | ___ | <50 |
```

### 1.2 تحديد الاستعلامات البطيئة

```sql
-- تشغيل في Supabase SQL Editor
-- جلب أبطأ 20 استعلام
SELECT 
  query,
  calls,
  mean_time,
  total_time,
  rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

### 1.3 تحديد الصفحات البطيئة

```typescript
// إضافة مؤقتة في _app.tsx أو layout.tsx
useEffect(() => {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (navigation) {
    const pageLoadTime = navigation.loadEventEnd - navigation.startTime;
    
    // إرسال للـ Analytics أو Console
    console.log('Page Load Metrics:', {
      page: window.location.pathname,
      loadTime: pageLoadTime,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      firstPaint: performance.getEntriesByType('paint')[0]?.startTime
    });
  }
}, []);
```

---

## 🔄 الخطوة 2: حل مشكلة N+1 Queries

### 2.1 فهم المشكلة

```typescript
// ❌ مشكلة N+1 - 11 استعلام لـ 10 متاجر
const providers = await supabase.from('providers').select('*'); // 1 استعلام

for (const provider of providers.data) {
  const products = await supabase
    .from('menu_items')
    .select('*')
    .eq('provider_id', provider.id); // N استعلام (10 استعلامات)
}

// ✅ الحل - استعلامين فقط
const providers = await supabase.from('providers').select('*');
const products = await supabase
  .from('menu_items')
  .select('*')
  .in('provider_id', providers.data.map(p => p.id));
```

### 2.2 أنماط الحل في Supabase

#### النمط 1: Eager Loading (التحميل المسبق)

```typescript
// ✅ جلب المتجر مع المنتجات في استعلام واحد
const { data: provider } = await supabase
  .from('providers')
  .select(`
    *,
    menu_items (
      id,
      name_ar,
      name_en,
      price,
      product_variants (*)
    ),
    reviews (
      id,
      rating,
      comment,
      profiles (full_name)
    )
  `)
  .eq('id', providerId)
  .single();
```

#### النمط 2: Batch Loading (التحميل المجمّع)

```typescript
// عندما لا يعمل Eager Loading (مثل nullable foreign keys)

// ✅ الحل: استعلامات متوازية
const [providersResult, productsResult, categoriesResult] = await Promise.all([
  supabase.from('providers').select('*').eq('status', 'approved'),
  supabase.from('menu_items').select('*'),
  supabase.from('provider_categories').select('*')
]);

// ربط البيانات يدوياً
const providersWithProducts = providersResult.data.map(provider => ({
  ...provider,
  products: productsResult.data.filter(p => p.provider_id === provider.id),
  categories: categoriesResult.data.filter(c => c.provider_id === provider.id)
}));
```

#### النمط 3: Database View (عرض قاعدة البيانات)

```sql
-- إنشاء View يجمع البيانات المتكررة
CREATE OR REPLACE VIEW provider_with_stats AS
SELECT 
  p.*,
  COUNT(DISTINCT m.id) as products_count,
  COUNT(DISTINCT o.id) as orders_count,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(DISTINCT r.id) as reviews_count
FROM providers p
LEFT JOIN menu_items m ON m.provider_id = p.id
LEFT JOIN orders o ON o.provider_id = p.id
LEFT JOIN reviews r ON r.provider_id = p.id
GROUP BY p.id;

-- الاستخدام
const { data } = await supabase
  .from('provider_with_stats')
  .select('*');
```

### 2.3 العلاقات الحرجة في Engezna

| العلاقة | السيناريو | الحل المقترح |
|---------|----------|--------------|
| `providers → menu_items` | صفحة المتجر | Eager Loading |
| `menu_items → product_variants` | عرض المنتج | Eager Loading |
| `orders → order_items` | تفاصيل الطلب | Eager Loading |
| `providers → reviews` | تقييمات المتجر | Eager Loading + Pagination |
| `settlements → orders` | تفاصيل التسوية | Batch Loading |
| `admin → providers (stats)` | لوحة الإدارة | Database View |

### 2.4 إنشاء Data Access Layer (DAL)

```typescript
// src/lib/dal/providers.ts

import { createClient } from '@/lib/supabase/client';

interface GetProvidersOptions {
  include?: ('products' | 'reviews' | 'categories' | 'stats')[];
  filters?: {
    status?: string;
    category?: string;
    cityId?: string;
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export async function getProviders(options: GetProvidersOptions = {}) {
  const supabase = createClient();
  const { include = [], filters = {}, pagination } = options;
  
  // بناء الـ Select بناءً على ما نحتاجه
  let selectQuery = '*';
  
  if (include.includes('products')) {
    selectQuery += ', menu_items(id, name_ar, name_en, price, image_url)';
  }
  
  if (include.includes('reviews')) {
    selectQuery += ', reviews(id, rating, comment, created_at)';
  }
  
  if (include.includes('categories')) {
    selectQuery += ', provider_categories(id, name_ar, name_en)';
  }
  
  let query = supabase
    .from('providers')
    .select(selectQuery, { count: 'exact' });
  
  // تطبيق الفلاتر
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  
  if (filters.cityId) {
    query = query.eq('city_id', filters.cityId);
  }
  
  // تطبيق الـ Pagination
  if (pagination) {
    const { page, limit } = pagination;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
  }
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  return { data, count };
}

// مثال الاستخدام
const { data: providers } = await getProviders({
  include: ['products', 'reviews'],
  filters: { status: 'approved', cityId: 'city-123' },
  pagination: { page: 1, limit: 10 }
});
```

### 2.5 أنماط للصفحات الشائعة

#### صفحة قائمة المتاجر (`/providers`)

```typescript
// قبل التحسين - N+1
const providers = await supabase.from('providers').select('*');
// ثم لكل متجر نجلب التقييمات...

// بعد التحسين - استعلام واحد
const { data: providers } = await supabase
  .from('providers')
  .select(`
    id, name_ar, name_en, logo_url, category, status,
    delivery_fee, delivery_time, minimum_order,
    reviews (rating)
  `)
  .eq('status', 'approved')
  .eq('city_id', userCityId);

// حساب متوسط التقييم في الـ Frontend
const providersWithRating = providers.map(p => ({
  ...p,
  avgRating: p.reviews.length > 0 
    ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length 
    : 0
}));
```

#### صفحة تفاصيل المتجر (`/providers/[id]`)

```typescript
// استعلام واحد شامل
const { data: provider } = await supabase
  .from('providers')
  .select(`
    *,
    menu_items (
      *,
      product_variants (*)
    ),
    provider_categories (*),
    reviews (
      *,
      profiles (full_name, avatar_url)
    )
  `)
  .eq('id', providerId)
  .single();
```

#### صفحة الطلبات (`/provider/orders`)

```typescript
// استعلام واحد مع العناصر
const { data: orders } = await supabase
  .from('orders')
  .select(`
    *,
    order_items (
      *,
      menu_items (name_ar, name_en, image_url)
    ),
    profiles (full_name, phone)
  `)
  .eq('provider_id', providerId)
  .order('created_at', { ascending: false });
```

---

## 🗄️ الخطوة 3: تحسين قاعدة البيانات

### 3.1 إضافة Indexes

```sql
-- تشخيص: الاستعلامات التي تحتاج Index
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 'xxx';

-- إذا رأيت "Seq Scan" بدلاً من "Index Scan"، أضف Index:

-- Indexes الأساسية لـ Engezna
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider_id ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_menu_items_provider_id ON menu_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available);

CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);

CREATE INDEX IF NOT EXISTS idx_providers_status ON providers(status);
CREATE INDEX IF NOT EXISTS idx_providers_city_id ON providers(city_id);
CREATE INDEX IF NOT EXISTS idx_providers_category ON providers(category);

CREATE INDEX IF NOT EXISTS idx_settlements_provider_id ON settlements(provider_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);

-- Composite Indexes للاستعلامات المتكررة
CREATE INDEX IF NOT EXISTS idx_orders_provider_status 
  ON orders(provider_id, status);
  
CREATE INDEX IF NOT EXISTS idx_providers_city_status 
  ON providers(city_id, status);
```

### 3.2 تحسين الاستعلامات البطيئة

```sql
-- قبل: استعلام بطيء لإحصائيات المتجر
SELECT 
  COUNT(*) as total_orders,
  SUM(total) as total_revenue
FROM orders 
WHERE provider_id = $1 
  AND created_at >= $2 
  AND created_at <= $3;

-- بعد: استخدام Partial Index
CREATE INDEX idx_orders_provider_date 
  ON orders(provider_id, created_at) 
  WHERE status = 'delivered';

-- أو إنشاء Materialized View للإحصائيات
CREATE MATERIALIZED VIEW provider_daily_stats AS
SELECT 
  provider_id,
  DATE(created_at) as date,
  COUNT(*) as orders_count,
  SUM(total) as revenue,
  AVG(total) as avg_order_value
FROM orders
WHERE status = 'delivered'
GROUP BY provider_id, DATE(created_at);

-- تحديث الـ View يومياً
REFRESH MATERIALIZED VIEW provider_daily_stats;
```

### 3.3 Connection Pooling

```typescript
// في vercel.json أو environment variables
{
  "env": {
    "SUPABASE_DB_POOL_SIZE": "10",
    "SUPABASE_DB_POOL_TIMEOUT": "20"
  }
}
```

### 3.4 تنظيف البيانات القديمة

```sql
-- حذف الإشعارات القديمة (أكثر من 30 يوم)
DELETE FROM customer_notifications 
WHERE created_at < NOW() - INTERVAL '30 days' 
  AND is_read = true;

-- حذف سجلات النشاط القديمة (أكثر من 90 يوم)
DELETE FROM activity_log 
WHERE created_at < NOW() - INTERVAL '90 days';

-- جدولة التنظيف التلقائي
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *', -- كل يوم الساعة 3 صباحاً
  $$DELETE FROM customer_notifications WHERE created_at < NOW() - INTERVAL '30 days' AND is_read = true$$
);
```

---

## 💾 الخطوة 4: التخزين المؤقت (Caching)

### 4.1 مستويات التخزين المؤقت

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Cache                             │
│                    (Static Assets)                           │
├─────────────────────────────────────────────────────────────┤
│                    CDN Cache (Vercel Edge)                   │
│                    (API Responses, Images)                   │
├─────────────────────────────────────────────────────────────┤
│                    Application Cache                         │
│                    (React Query / SWR)                       │
├─────────────────────────────────────────────────────────────┤
│                    Database Cache                            │
│                    (Supabase / PostgreSQL)                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 React Query / SWR للـ Frontend

```typescript
// تثبيت
npm install @tanstack/react-query

// src/lib/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 دقائق
      cacheTime: 30 * 60 * 1000, // 30 دقيقة
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// استخدام في الصفحات
// src/hooks/useProviders.ts
import { useQuery } from '@tanstack/react-query';

export function useProviders(cityId: string) {
  return useQuery({
    queryKey: ['providers', cityId],
    queryFn: () => fetchProviders(cityId),
    staleTime: 5 * 60 * 1000, // البيانات صالحة 5 دقائق
  });
}

// src/hooks/useProviderDetails.ts
export function useProviderDetails(providerId: string) {
  return useQuery({
    queryKey: ['provider', providerId],
    queryFn: () => fetchProviderDetails(providerId),
    staleTime: 2 * 60 * 1000, // البيانات صالحة 2 دقيقة
  });
}
```

### 4.3 API Route Caching (Vercel Edge)

```typescript
// src/app/api/providers/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cityId = searchParams.get('cityId');
  
  // جلب البيانات
  const providers = await getProviders({ cityId });
  
  // إضافة Cache Headers
  return NextResponse.json(providers, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      // s-maxage=300: Cache على الـ Edge لمدة 5 دقائق
      // stale-while-revalidate=600: يمكن تقديم cache قديم لمدة 10 دقائق أثناء التحديث
    },
  });
}

// للبيانات الثابتة (المحافظات، المدن)
export async function GET_STATIC(request: Request) {
  const governorates = await getGovernorates();
  
  return NextResponse.json(governorates, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      // يوم واحد cache، أسبوع stale
    },
  });
}
```

### 4.4 Static Data Caching

```typescript
// src/lib/cache/staticData.ts

// Cache للبيانات الثابتة في الذاكرة
const cache = new Map<string, { data: any; expiry: number }>();

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMinutes: number = 60
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);
  
  if (cached && cached.expiry > now) {
    return cached.data as T;
  }
  
  const data = await fetcher();
  cache.set(key, {
    data,
    expiry: now + ttlMinutes * 60 * 1000,
  });
  
  return data;
}

// الاستخدام
const governorates = await getCachedData(
  'governorates',
  () => supabase.from('governorates').select('*'),
  60 * 24 // 24 ساعة
);
```

### 4.5 Redis للـ Caching المتقدم (اختياري)

```typescript
// عند الحاجة لـ Caching موزع
// تثبيت: npm install ioredis

// src/lib/cache/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getFromCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setInCache(
  key: string, 
  data: any, 
  ttlSeconds: number = 300
): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
}

export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// الاستخدام
const cacheKey = `provider:${providerId}`;
let provider = await getFromCache(cacheKey);

if (!provider) {
  provider = await fetchProviderFromDB(providerId);
  await setInCache(cacheKey, provider, 300); // 5 دقائق
}

// عند تحديث المتجر
await invalidateCache(`provider:${providerId}*`);
```

---

## ⚡ الخطوة 5: تحسين الواجهة الأمامية

### 5.1 Code Splitting و Dynamic Imports

```typescript
// قبل: تحميل كل شيء
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ProviderDashboard } from '@/components/provider/ProviderDashboard';
import { CustomerHome } from '@/components/customer/CustomerHome';

// بعد: تحميل حسب الحاجة
import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(
  () => import('@/components/admin/AdminDashboard'),
  { 
    loading: () => <DashboardSkeleton />,
    ssr: false // إذا لم نحتاج SSR
  }
);

const ProviderDashboard = dynamic(
  () => import('@/components/provider/ProviderDashboard'),
  { loading: () => <DashboardSkeleton /> }
);

// للمكونات الثقيلة
const ChartComponent = dynamic(
  () => import('@/components/charts/RevenueChart'),
  { ssr: false }
);

const MapComponent = dynamic(
  () => import('@/components/maps/DeliveryMap'),
  { ssr: false }
);
```

### 5.2 تحسين إعادة الرسم (Re-renders)

```typescript
// استخدام React.memo للمكونات الثابتة
import { memo } from 'react';

export const ProductCard = memo(function ProductCard({ 
  product, 
  onAddToCart 
}: ProductCardProps) {
  return (
    // ...
  );
});

// استخدام useMemo للحسابات المكلفة
const filteredProducts = useMemo(() => {
  return products
    .filter(p => p.category === selectedCategory)
    .sort((a, b) => b.rating - a.rating);
}, [products, selectedCategory]);

// استخدام useCallback للـ Functions
const handleAddToCart = useCallback((productId: string) => {
  addToCart(productId);
}, [addToCart]);
```

### 5.3 Virtualization للقوائم الطويلة

```typescript
// تثبيت: npm install @tanstack/react-virtual

import { useVirtualizer } from '@tanstack/react-virtual';

function ProductList({ products }: { products: Product[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // ارتفاع كل عنصر
    overscan: 5, // عدد العناصر الإضافية للتحميل
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ProductCard product={products[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 5.4 Skeleton Loading

```typescript
// src/components/ui/Skeleton.tsx
export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-200 h-40 rounded-lg" />
      <div className="mt-2 space-y-2">
        <div className="bg-gray-200 h-4 rounded w-3/4" />
        <div className="bg-gray-200 h-4 rounded w-1/2" />
        <div className="bg-gray-200 h-6 rounded w-1/4" />
      </div>
    </div>
  );
}

export function ProductListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

---

## 🖼️ الخطوة 6: تحسين الصور والملفات

### 6.1 Next.js Image Optimization

```typescript
// استخدام next/image دائماً
import Image from 'next/image';

// ❌ قبل
<img src={product.image_url} alt={product.name} />

// ✅ بعد
<Image
  src={product.image_url}
  alt={product.name}
  width={300}
  height={200}
  placeholder="blur"
  blurDataURL="/placeholder.png"
  loading="lazy"
  quality={75}
/>

// للصور الحرجة (فوق الطي)
<Image
  src={hero.image_url}
  alt="Hero"
  priority // تحميل فوري
  quality={85}
/>
```

### 6.2 تكوين Supabase Storage

```typescript
// src/lib/utils/image.ts

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function getOptimizedImageUrl(
  path: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): string {
  const { width = 400, height, quality = 75 } = options;
  
  // Supabase Image Transformation
  const params = new URLSearchParams({
    width: width.toString(),
    quality: quality.toString(),
  });
  
  if (height) {
    params.set('height', height.toString());
  }
  
  return `${SUPABASE_URL}/storage/v1/render/image/public/${path}?${params}`;
}

// الاستخدام
const imageUrl = getOptimizedImageUrl('products/image.jpg', {
  width: 300,
  quality: 70
});
```

### 6.3 Lazy Loading للمكونات الثقيلة

```typescript
// تأخير تحميل الصور خارج الشاشة
import { useInView } from 'react-intersection-observer';

function LazyImage({ src, alt, ...props }: ImageProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px', // تحميل قبل الوصول بـ 200px
  });
  
  return (
    <div ref={ref}>
      {inView ? (
        <Image src={src} alt={alt} {...props} />
      ) : (
        <div className="bg-gray-200 animate-pulse" style={{ aspectRatio: '4/3' }} />
      )}
    </div>
  );
}
```

---

## ✅ قوائم التحقق السريعة

### قائمة التحقق اليومية (بعد الإطلاق)

```markdown
- [ ] فحص Supabase Dashboard للاستعلامات البطيئة
- [ ] مراجعة Error Rate في Vercel
- [ ] فحص شكاوى المستخدمين
- [ ] التحقق من استخدام الذاكرة
```

### قائمة التحقق الأسبوعية

```markdown
- [ ] تحليل Performance Baseline
- [ ] مراجعة أبطأ 10 استعلامات
- [ ] فحص Cache Hit Ratio
- [ ] مراجعة Lighthouse Scores
- [ ] تحليل Core Web Vitals
```

### قائمة التحقق الشهرية

```markdown
- [ ] مراجعة وتنظيف البيانات القديمة
- [ ] تحديث Indexes حسب الحاجة
- [ ] مراجعة استراتيجية Caching
- [ ] تحليل نمو قاعدة البيانات
- [ ] تحديث Performance Baseline
```

### قائمة تحقق قبل الـ Release

```markdown
- [ ] Build بدون أخطاء
- [ ] Lighthouse Score > 80
- [ ] لا توجد استعلامات > 500ms
- [ ] Cache Headers صحيحة
- [ ] الصور محسّنة
- [ ] Code Splitting مفعّل
```

---

## 📊 مؤشرات الأداء المستهدفة (KPIs)

### Core Web Vitals

| المؤشر | الهدف | الحد الأقصى المقبول |
|--------|-------|---------------------|
| LCP (Largest Contentful Paint) | < 2.5s | < 4s |
| FID (First Input Delay) | < 100ms | < 300ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.25 |
| TTFB (Time to First Byte) | < 200ms | < 600ms |

### API Performance

| نوع الـ Endpoint | الهدف | الحد الأقصى |
|------------------|-------|-------------|
| GET (قائمة) | < 200ms | < 500ms |
| GET (تفاصيل) | < 100ms | < 300ms |
| POST (إنشاء) | < 300ms | < 700ms |
| PUT (تحديث) | < 200ms | < 500ms |

### Database Performance

| المؤشر | الهدف | الحد الأقصى |
|--------|-------|-------------|
| Average Query Time | < 50ms | < 100ms |
| Cache Hit Ratio | > 99% | > 95% |
| Connection Pool Usage | < 50% | < 80% |
| Database Size Growth | < 10%/month | < 25%/month |

---

## 🚨 خطة التصعيد

### المستوى 1: مشكلة بسيطة

```
الأعراض: بطء طفيف (< 500ms إضافية)
الإجراء: 
1. تحديد الاستعلام البطيء
2. إضافة Index أو تحسين Query
3. إضافة Caching إذا لزم
المدة: < 2 ساعة
```

### المستوى 2: مشكلة متوسطة

```
الأعراض: بطء ملحوظ (500ms - 2s إضافية)
الإجراء:
1. تحليل شامل للـ Endpoint
2. تطبيق Eager Loading / Batch Loading
3. إضافة Database View إذا لزم
4. تفعيل Caching متقدم
المدة: 2-8 ساعات
```

### المستوى 3: مشكلة حرجة

```
الأعراض: التطبيق بطيء جداً (> 2s) أو يتوقف
الإجراء:
1. تفعيل Maintenance Mode
2. تحليل Database Locks
3. زيادة موارد قاعدة البيانات مؤقتاً
4. تطبيق إصلاحات طارئة
5. خطة تحسين شاملة
المدة: فوري + خطة 24-48 ساعة
```

### جهات الاتصال للتصعيد

```markdown
| المستوى | المسؤول | التواصل |
|---------|---------|---------|
| 1 | المطور | [Slack/Email] |
| 2 | قائد الفريق | [Slack/Phone] |
| 3 | CTO | [Phone - طوارئ] |
```

---

## 📚 مراجع ومصادر

### وثائق رسمية

- [Supabase Performance Guide](https://supabase.com/docs/guides/platform/performance)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Vercel Edge Caching](https://vercel.com/docs/concepts/edge-network/caching)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)

### أدوات مفيدة

- [Supabase Query Performance](https://supabase.com/dashboard/project/_/database/query-performance)
- [Vercel Analytics](https://vercel.com/analytics)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [WebPageTest](https://www.webpagetest.org/)

---

## 📝 سجل التحسينات

```markdown
| التاريخ | المشكلة | الحل | النتيجة |
|---------|---------|------|---------|
| [التاريخ] | [وصف المشكلة] | [الحل المطبق] | [قبل → بعد] |
```

---

**تم إعداد هذا الدليل بواسطة:** Claude AI
**لمشروع:** Engezna (إنجزنا)
**تاريخ الإنشاء:** December 11, 2025

---

> 💡 **ملاحظة:** هذا الدليل مرجع للاستخدام عند الحاجة. لا تبدأ بالتحسين إلا بعد:
> 1. إطلاق المنتج
> 2. جمع بيانات استخدام حقيقية
> 3. تحديد مشاكل أداء فعلية ومُقاسة
