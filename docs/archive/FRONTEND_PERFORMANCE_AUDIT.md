# 🎨 تقرير أداء الـ Frontend - Engezna Frontend Performance Audit

**التاريخ:** 17 يناير 2026
**الأولوية:** حرجة للموبايلات المصرية المتوسطة

---

## 📊 ملخص التقييم

| الفئة                | الدرجة     | الحالة                                 |
| -------------------- | ---------- | -------------------------------------- |
| **Bundle Size**      | 75/100     | ✅ جيد (Tree-shaking يعمل)             |
| **State Management** | 40/100     | ❌ حرج (Re-renders كثيرة)              |
| **SEO & Metadata**   | 20/100     | ❌ حرج جداً (لا يوجد Dynamic Metadata) |
| **المتوسط**          | **45/100** | ⚠️ يحتاج تحسين عاجل                    |

---

## 📦 Section 1: Bundle Analysis

### 1.1 تحليل Firebase

**الحالة:** ✅ ممتاز - يستخدم Modular Imports

| الملف                               | طريقة الاستيراد                                              | التأثير                |
| ----------------------------------- | ------------------------------------------------------------ | ---------------------- |
| `src/lib/firebase/config.ts`        | `import { initializeApp, getMessaging } from 'firebase/app'` | منخفض (~40KB)          |
| `src/hooks/usePushNotifications.ts` | `import { getToken, onMessage } from 'firebase/messaging'`   | منخفض                  |
| `public/firebase-messaging-sw.js`   | CDN compat v10.7.1                                           | منفصل (Service Worker) |

**ملاحظة:** فقط Firebase Messaging مستخدم - لا يوجد Firestore أو Auth

### 1.2 تحليل Framer Motion

**الحالة:** ✅ جيد - يستخدم Named Imports

| الإحصائية                     | القيمة           |
| ----------------------------- | ---------------- |
| ملفات تستخدم Framer Motion    | 29 من 385 (7.5%) |
| حجم المكتبة (مع Tree-shaking) | ~60-80KB         |

**الاستخدامات الرئيسية:**

- `motion, AnimatePresence` - 20 ملف
- `motion` فقط - 7 ملفات
- `Reorder` - 2 ملفات (Admin + NotepadOrderInput)

### 1.3 Dynamic Imports

**الحالة:** ❌ ضعيف جداً - فقط 1 dynamic import!

```typescript
// الملف الوحيد: src/components/maps/LocationPicker.tsx
const InteractiveMapPicker = dynamic(() => import('./InteractiveMapPicker'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-96" />,
});
```

**المشكلة:** صفحات كثيرة تحمّل مكتبات ثقيلة دون تقسيم:

- Admin pages تحمّل jsPDF (~150KB) حتى لو المستخدم لم يحتاجها
- Chat components تحمّل OpenAI SDK (~80KB) مباشرة
- Leaflet maps (~70KB) تحمّل synchronously

### 1.4 حجم الـ Bundle المُقدّر

| الحالة              | الحجم (gzipped) |
| ------------------- | --------------- |
| **الحالي**          | 250-350 KB      |
| **بعد التحسين**     | 150-220 KB      |
| **التوفير المتوقع** | 30-40%          |

### 1.5 التأثير على الموبايلات المصرية المتوسطة

| نوع الجهاز      | RAM | الأداء المتوقع                    |
| --------------- | --- | --------------------------------- |
| Samsung A14/A24 | 4GB | ⚠️ بطيء في الصفحات الثقيلة        |
| Xiaomi Redmi 12 | 4GB | ⚠️ قد يتجمد مع Animations كثيرة   |
| Oppo A57/A77    | 4GB | ⚠️ First Load قد يستغرق 5-8 ثواني |
| iPhone SE 2020  | 3GB | ✅ جيد                            |

**توصية:** تقليل Framer Motion animations على الأجهزة الضعيفة

---

## 🔄 Section 2: State Management Audit

### 2.1 مخازن Zustand

#### Store 1: `useCart` (320 سطر)

**الملف:** `src/lib/store/cart.ts`

```typescript
// البنية الحالية
{
  cart: CartItem[]           // مصفوفة المنتجات
  provider: Provider | null  // المزود الحالي
  _hasHydrated: boolean
  pendingItem: {...}
  pendingOnlineOrder: {...}
  // + 11 method
}
```

**المشاكل:**

| المكون               | الملف    | المشكلة                                                      |
| -------------------- | -------- | ------------------------------------------------------------ |
| BottomNavigation     | line 22  | `const { cart } = useCart()` - يشترك في كل الـ Store         |
| SmartAssistant       | line 176 | `const { getItemCount } = useCart()` - يشترك في كل الـ Store |
| CustomOrderInterface | line 109 | `const cart = useCart()` - كل الـ Store                      |

**النتيجة:** أي تغيير في السلة (إضافة، تعديل، حذف) = إعادة رندر لكل المكونات المشتركة!

#### Store 2: `useChatStore` (272 سطر)

**الملف:** `src/lib/store/chat.ts`

```typescript
{
  messages: StoredChatMessage[]
  selectedProviderId: string | undefined
  selectedProviderCategory: string | undefined
  memory: ChatMemory
  // + 8 methods
}
```

**المشكلة في useAIChat.ts (lines 104-117):**

```typescript
// ❌ الحالي - يشترك في كل شيء
const { messages, addMessage, setMessages, clearMessages,
        selectedProviderId, selectedProviderCategory, ... } = useChatStore();

// ✅ المطلوب - selectors محددة
const messages = useChatStore((state) => state.messages);
const addMessage = useChatStore((state) => state.addMessage);
```

### 2.2 React Context Providers

#### Context 1: LocationContext (388 سطر) - **الأخطر**

**الموقع:** يلف التطبيق بالكامل في `/app/[locale]/layout.tsx`

```typescript
// البنية الحالية
{
  governorates: Governorate[]    // 27 محافظة
  cities: City[]                 // 100+ مدينة
  districts: District[]          // 1000+ منطقة
  userLocation: UserLocation
  isDataLoading: boolean
  // + 7 helper functions
}
```

**المشكلة الحرجة (lines 350-368):**

```typescript
// ❌ الحالي - كائن جديد في كل render
const value: LocationContextValue = {
  governorates, cities, districts, userLocation, ...
};
return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
// ⚠️ كل render = كائن جديد = كل المستهلكين يعيدون الرندر!
```

**التأثير:**

- الصفحة الرئيسية تعيد الرندر عند تحميل المحافظات
- صفحة Checkout تعيد الرندر عند أي تغيير
- صفحة Profile تعيد الرندر بدون سبب

#### Context 2: AdminRegionContext (348 سطر)

**المشاكل:**

- نفس مشكلة عدم استخدام `useMemo` للـ value
- `hasRegionFilter` يُحسب في كل render بدون memoization

### 2.3 إحصائيات Memoization

| الإحصائية                              | القيمة               |
| -------------------------------------- | -------------------- |
| إجمالي المكونات                        | 100 ملف              |
| مكونات تستخدم memo/useMemo/useCallback | 31 (31%)             |
| **الفجوة**                             | 69% بدون memoization |

### 2.4 خريطة Re-renders

```
LocationProvider (يلف كل شيء)
  │
  ├─► HomePage ← يعيد الرندر عند تحميل locations
  │     └─► OffersCarousel ← يعيد الرندر بالتبعية
  │
  ├─► BottomNavigation ← يعيد الرندر عند أي تغيير في Cart
  │
  ├─► CustomerHeader ← يعيد الرندر عند Cart + Notifications
  │
  └─► CheckoutPage ← يعيد الرندر عند أي location change
        └─► AddressForm ← يعيد الرندر بالتبعية
```

### 2.5 الحلول المقترحة

#### الحل 1: Zustand Selectors (Quick Win - ساعة واحدة)

```typescript
// ❌ قبل
const { cart } = useCart();
const count = cart.reduce((sum, item) => sum + item.quantity, 0);

// ✅ بعد
const count = useCart((state) => state.cart.reduce((sum, item) => sum + item.quantity, 0));
```

**التأثير المتوقع:** تقليل 30-40% من Re-renders

#### الحل 2: Memoize Context Values (30 دقيقة)

```typescript
// ✅ LocationContext.tsx
const value = useMemo(() => ({
  governorates, cities, districts, userLocation,
  isDataLoading, isDataLoaded, isUserLocationLoading,
  getCitiesByGovernorate, getDistrictsByCity, ...
}), [governorates, cities, districts, userLocation, ...]);
```

**التأثير المتوقع:** تقليل 50-60% من Re-renders

#### الحل 3: تقسيم LocationContext (3-4 ساعات)

```typescript
// Context 1: بيانات ثابتة
export const LocationDataContext = createContext<{
  governorates: Governorate[];
  cities: City[];
  districts: District[];
}>(/* ... */);

// Context 2: موقع المستخدم (يتغير)
export const UserLocationContext = createContext<{
  userLocation: UserLocation;
  setUserLocation: () => Promise<void>;
}>(/* ... */);
```

**التأثير المتوقع:** تقليل 70% من Re-renders

---

## 🔍 Section 3: SEO & Metadata Audit

### 3.1 الحالة الحالية - **حرجة جداً**

| العنصر                       | الحالة               |
| ---------------------------- | -------------------- |
| `generateMetadata` functions | ❌ 1 فقط (في layout) |
| Dynamic Metadata للمنتجات    | ❌ غير موجود         |
| OpenGraph Images             | ❌ غير موجود         |
| Structured Data (JSON-LD)    | ❌ غير موجود         |
| Sitemap                      | ❌ غير موجود         |
| robots.txt                   | ❌ غير موجود         |

### 3.2 المشكلة الهيكلية

**كل صفحات العملاء هي Client Components:**

```typescript
// src/app/[locale]/page.tsx
'use client'; // ⚠️ يمنع generateMetadata!

// src/app/[locale]/providers/[id]/page.tsx
'use client'; // ⚠️ يمنع generateMetadata!
```

**المشكلة:** `generateMetadata()` لا يعمل مع Client Components

### 3.3 صفحات بدون Metadata ديناميكي

| الصفحة                     | النوع         | التأثير SEO                     |
| -------------------------- | ------------- | ------------------------------- |
| `/[locale]/providers`      | قائمة المتاجر | **عالي** - يجب أن يظهر في البحث |
| `/[locale]/providers/[id]` | تفاصيل المتجر | **حرج** - صفحة المنتج الرئيسية  |
| `/[locale]/offers`         | العروض        | **عالي** - محتوى تسويقي         |
| `/[locale]/privacy`        | الخصوصية      | متوسط                           |
| `/[locale]/terms`          | الشروط        | متوسط                           |

### 3.4 ما ينقص صفحة المتجر `/providers/[id]`

```typescript
// ❌ الحالي: لا شيء

// ✅ المطلوب:
export async function generateMetadata({ params }) {
  const provider = await fetchProvider(params.id);
  const locale = params.locale;

  return {
    title:
      locale === 'ar'
        ? `${provider.name_ar} - ${provider.rating}⭐ | إنجزنا`
        : `${provider.name_en} - ${provider.rating}⭐ | Engezna`,
    description: provider.description?.[locale],
    openGraph: {
      title: provider.name?.[locale],
      description: provider.description?.[locale],
      images: [{ url: provider.cover_image_url }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: provider.name?.[locale],
      description: provider.description?.[locale],
      images: [provider.cover_image_url],
    },
  };
}
```

### 3.5 ما ينقص: Structured Data

```json
// JSON-LD للمتاجر - غير موجود حالياً
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "اسم المتجر",
  "image": "صورة الغلاف",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "القاهرة",
    "addressRegion": "مصر"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.8,
    "reviewCount": 150
  }
}
```

### 3.6 ما ينقص: Sitemap

```typescript
// src/app/sitemap.ts - غير موجود!
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const providers = await fetchAllProviders();

  return [
    { url: 'https://engezna.com/ar', lastModified: new Date() },
    { url: 'https://engezna.com/en', lastModified: new Date() },
    ...providers.map((p) => ({
      url: `https://engezna.com/ar/providers/${p.id}`,
      lastModified: p.updated_at,
    })),
  ];
}
```

### 3.7 تأثير عدم وجود SEO

| المشكلة          | التأثير                            |
| ---------------- | ---------------------------------- |
| لا Sitemap       | Google لا يكتشف صفحات المتاجر      |
| لا OpenGraph     | مشاركة WhatsApp/Facebook بدون صورة |
| لا Dynamic Title | كل الصفحات بنفس العنوان في البحث   |
| لا JSON-LD       | لا يظهر Rating في نتائج Google     |

---

## 📋 خطة التنفيذ

### المرحلة 1: Quick Wins (4-6 ساعات)

| المهمة                  | الملف               | الوقت    |
| ----------------------- | ------------------- | -------- |
| إضافة Zustand selectors | cart.ts, chat.ts    | 2 ساعات  |
| Memoize Context values  | LocationContext.tsx | 1 ساعة   |
| إنشاء robots.txt        | app/robots.ts       | 30 دقيقة |
| إنشاء sitemap.ts        | app/sitemap.ts      | 2 ساعات  |

### المرحلة 2: SEO Critical (8-12 ساعة)

| المهمة                                  | الملف                   | الوقت   |
| --------------------------------------- | ----------------------- | ------- |
| تحويل Provider page لـ Server Component | providers/[id]/page.tsx | 4 ساعات |
| إضافة generateMetadata                  | providers/[id]/page.tsx | 2 ساعات |
| إضافة JSON-LD                           | providers/[id]/page.tsx | 2 ساعات |
| إضافة OpenGraph images                  | public/og-\*            | 2 ساعات |

### المرحلة 3: Performance (6-8 ساعات)

| المهمة                      | الملف               | الوقت   |
| --------------------------- | ------------------- | ------- |
| تقسيم LocationContext       | LocationContext.tsx | 4 ساعات |
| إضافة dynamic imports       | Admin pages, Chat   | 3 ساعات |
| React.memo للمكونات الثابتة | Header, Nav, etc.   | 2 ساعات |

---

## 📊 ملخص التوصيات

### أولوية حرجة (قبل الإطلاق)

1. ✅ **إضافة Zustand Selectors** - يقلل Re-renders بـ 30-40%
2. ✅ **إنشاء robots.txt + sitemap.ts** - ضروري للـ SEO
3. ✅ **إضافة Dynamic Metadata للمتاجر** - ضروري للمشاركة والبحث

### أولوية عالية (الأسبوع الأول)

4. **Memoize Context Values** - يقلل Re-renders بـ 50%
5. **إضافة JSON-LD للمتاجر** - يحسن ظهور Google
6. **تقسيم LocationContext** - يقلل Re-renders بـ 70%

### أولوية متوسطة (الأسبوع الثاني)

7. **Dynamic imports للمكتبات الثقيلة** - يقلل Bundle بـ 30%
8. **React.memo للمكونات الثابتة** - يحسن الأداء العام
9. **تقليل Framer Motion على الأجهزة الضعيفة** - يحسن UX

---

## 🎯 الهدف النهائي

| المقياس                  | الحالي        | الهدف          |
| ------------------------ | ------------- | -------------- |
| Bundle Size              | 250-350KB     | <200KB         |
| Re-renders (Cart action) | 5+ components | 1-2 components |
| SEO Score                | 20/100        | 80/100         |
| First Load (3G)          | 5-8 ثواني     | <3 ثواني       |
| Lighthouse Performance   | ~60           | >85            |

---

_آخر تحديث: 17 يناير 2026_
