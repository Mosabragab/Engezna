# 🏦 خطة إعادة بناء صفحات الأدمن المالية والتحليلات
## Admin Financial & Analytics Pages Synchronization Rebuild Plan

**التاريخ**: 25 ديسمبر 2025
**الإصدار**: 1.0
**الحالة**: في انتظار المراجعة

---

## 📋 ملخص تنفيذي

هذه الخطة تعالج **التزامن بين صفحات الأدمن والتاجر** في:
1. الإدارة المالية (Finance)
2. التسويات (Settlements)
3. التحليلات (Analytics)

مع مراعاة:
- صلاحيات الأدمن (Super Admin vs Regional Manager)
- فلترة المحافظات والمدن
- انتقال البيانات المتزامن بين الطرفين

---

## 🔴 المشاكل المكتشفة (Critical Issues)

### 1. عدم تناسق الحسابات المالية

| المشكلة | الموقع | الخطورة |
|---------|--------|---------|
| **net_payout مختلف** | Admin: `gross - commission` vs Provider: uses `net_amount_due` | 🔴 عالية |
| **حساب المرتجعات** | Admin لا يحسب تأثير المرتجعات على العمولة | 🔴 عالية |
| **رسوم التوصيل** | Admin يعرضها منفصلة، Provider لا يراها بوضوح | 🟡 متوسطة |
| **فترة السماح** | Admin يعرض النسبة، لكن لا يوضح أنها 0% | 🟡 متوسطة |

### 2. عدم تناسق البيانات المعروضة

| صفحة الأدمن | صفحة التاجر | الفرق |
|-------------|-------------|-------|
| `platform_commission` | `totalCommission` | نفس الحقل لكن المسميات مختلفة |
| `pending_settlements` (مبلغ) | `totalDue` (مبلغ) | نفس المفهوم |
| لا يوجد `cod_commission_owed` | يوجد | التاجر يرى تفاصيل أكثر! |
| لا يوجد `settlement_direction` | يوجد | التاجر يرى الاتجاه |

### 3. مشاكل الفلترة الجغرافية

```
المشكلة الحالية:
┌─────────────────────────────────────────────────────────────┐
│  صفحة Finance/page.tsx:                                     │
│  ❌ لا تستخدم applyProviderFilter من AdminRegionContext     │
│  ❌ تفلتر settlements محلياً بعد التحميل (غير فعال)         │
│  ❌ stats تحسب لكل الطلبات ثم تفلتر (أرقام غير دقيقة)      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  صفحة Settlements/page.tsx:                                 │
│  ❌ نفس المشكلة - فلترة محلية                               │
│  ❌ إنشاء التسويات لكل المزودين (لا يحترم الصلاحيات)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  صفحة Analytics/page.tsx:                                   │
│  ✅ تستخدم useAdminGeoFilter بشكل صحيح                      │
│  ✅ تفلتر من الـ query مباشرة                                │
└─────────────────────────────────────────────────────────────┘
```

### 4. مشاكل الصلاحيات

| المشكلة | التأثير |
|---------|---------|
| Regional Manager يرى كل التسويات | خطأ أمني |
| Finance Admin لا يستطيع رؤية تقارير منطقته فقط | مخالف للصلاحيات |
| Generate Settlements لكل المزودين | Regional Manager يولد لغير منطقته |

### 5. غياب ميزات مهمة

| الميزة | الأدمن | التاجر | الحالة |
|--------|--------|--------|--------|
| تصدير PDF | ❌ | ❌ | مطلوب للطرفين |
| تصدير Excel | ❌ | ✅ (في Analytics) | مطلوب للأدمن |
| Audit Trail | ❌ | ❌ | مطلوب |
| Notifications عند تغيير التسوية | ❌ | ❌ | مطلوب |
| Real-time updates | ❌ | ❌ | مطلوب |

---

## 🎯 الحل المقترح

### المبدأ الأساسي: Single Source of Truth

```
┌─────────────────────────────────────────────────────────────────┐
│                    financial_settlement_engine                   │
│                         (SQL View)                              │
│  ═══════════════════════════════════════════════════════════   │
│  • مصدر واحد للحقيقة لكل الحسابات                               │
│  • يستخدمه الأدمن والتاجر معاً                                  │
│  • يحترم قواعد العمل (رسوم التوصيل، المرتجعات، الضرائب)         │
└─────────────────────────────────────────────────────────────────┘
          ↓                                      ↓
┌──────────────────────┐              ┌──────────────────────┐
│   Admin Dashboard    │              │  Provider Dashboard  │
│  ═════════════════   │              │  ═════════════════   │
│  • كل المزودين       │              │  • مزود واحد فقط     │
│  • فلترة جغرافية     │              │  • بياناته الخاصة    │
│  • إجراءات إدارية    │              │  • للاطلاع فقط      │
└──────────────────────┘              └──────────────────────┘
```

---

## 📐 البنية المقترحة

### 1. Shared Financial Service

```typescript
// src/lib/finance/financial-service.ts

export class FinancialService {
  private supabase: SupabaseClient
  private geoFilter?: GeoFilterValue
  private providerId?: string

  constructor(options: {
    supabase: SupabaseClient
    geoFilter?: GeoFilterValue  // للأدمن
    providerId?: string          // للتاجر
  })

  // ═══════════════════════════════════════════════════════════════
  // Core Methods - تستخدم financial_settlement_engine
  // ═══════════════════════════════════════════════════════════════

  async getSettlementsSummary(dateRange: DateRange): Promise<SettlementSummary>
  async getSettlementDetails(settlementId: string): Promise<SettlementDetails>
  async getProviderFinancials(providerId: string): Promise<ProviderFinancials>
  async getRevenueBreakdown(dateRange: DateRange): Promise<RevenueBreakdown>

  // ═══════════════════════════════════════════════════════════════
  // Admin-only Methods
  // ═══════════════════════════════════════════════════════════════

  async generateSettlement(options: GenerateSettlementOptions): Promise<Settlement>
  async recordPayment(settlementId: string, payment: PaymentRecord): Promise<void>
  async exportReport(format: 'pdf' | 'excel', options: ExportOptions): Promise<Blob>

  // ═══════════════════════════════════════════════════════════════
  // Geographic Filtering - تطبق تلقائياً
  // ═══════════════════════════════════════════════════════════════

  private applyGeoFilter<T>(query: PostgrestFilterBuilder<T>): PostgrestFilterBuilder<T>
}
```

### 2. Shared Types

```typescript
// src/types/finance.ts

export interface SettlementSummary {
  // إجماليات
  totalRevenue: number
  totalCommission: number
  totalDeliveryFees: number
  totalRefunds: number

  // التسويات
  pendingSettlementsAmount: number
  pendingSettlementsCount: number
  overdueSettlementsAmount: number
  overdueSettlementsCount: number
  paidSettlementsAmount: number
  paidSettlementsCount: number

  // التقسيم حسب طريقة الدفع
  codBreakdown: PaymentMethodBreakdown
  onlineBreakdown: PaymentMethodBreakdown

  // الاتجاه الصافي
  netBalance: number
  settlementDirection: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced'
}

export interface PaymentMethodBreakdown {
  ordersCount: number
  grossRevenue: number
  commission: number
  netAmount: number
  refundsAmount: number
}

export interface SettlementDetails {
  id: string
  provider: ProviderInfo
  period: { start: string; end: string }

  // ═══════════════════════════════════════════════════════════
  // هذه الحقول يجب أن تتطابق بين Admin و Provider
  // ═══════════════════════════════════════════════════════════

  grossRevenue: number

  // COD
  cod: {
    ordersCount: number
    revenue: number
    commissionOwed: number  // ما يدين به التاجر للمنصة
  }

  // Online
  online: {
    ordersCount: number
    revenue: number
    platformCommission: number
    payoutOwed: number      // ما تدين به المنصة للتاجر
  }

  // Refunds - معادلة صحيحة
  refunds: {
    totalAmount: number
    percentage: number
    // رسوم التوصيل لا تتأثر!
  }

  // Delivery (حق التاجر الثابت)
  deliveryFees: number

  // Net Calculation
  netBalance: number
  direction: 'platform_pays_provider' | 'provider_pays_platform' | 'balanced'

  // Payment
  status: SettlementStatus
  amountPaid: number
  paymentMethod?: string
  paymentReference?: string
  paidAt?: string
}
```

### 3. Geographic Filter Integration

```typescript
// src/lib/finance/geo-filter.ts

export function buildFinancialQuery(
  supabase: SupabaseClient,
  table: 'settlements' | 'orders' | 'financial_settlement_engine',
  options: {
    geoFilter?: GeoFilterValue
    providerId?: string
    dateRange?: DateRange
    isRegionalAdmin?: boolean
    allowedGovernorateIds?: string[]
  }
) {
  let query = supabase.from(table).select('*')

  // ═══════════════════════════════════════════════════════════════
  // 1. Regional Admin Filter (أولوية قصوى)
  // ═══════════════════════════════════════════════════════════════
  if (options.isRegionalAdmin && options.allowedGovernorateIds?.length) {
    // الفلترة عن طريق provider_id من المزودين في المنطقة
    query = query.in('provider_id',
      await getProviderIdsInGovernorates(supabase, options.allowedGovernorateIds)
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. Geographic Filter (للأدمن العادي)
  // ═══════════════════════════════════════════════════════════════
  if (options.geoFilter?.governorate_id) {
    // فلترة عن طريق provider location
    const providerIds = await getProviderIdsInRegion(supabase, options.geoFilter)
    query = query.in('provider_id', providerIds)
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. Provider Filter (للتاجر)
  // ═══════════════════════════════════════════════════════════════
  if (options.providerId) {
    query = query.eq('provider_id', options.providerId)
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. Date Range
  // ═══════════════════════════════════════════════════════════════
  if (options.dateRange) {
    query = query
      .gte('created_at', options.dateRange.start)
      .lte('created_at', options.dateRange.end)
  }

  return query
}
```

---

## 📊 إعادة تصميم الصفحات

### 1. صفحة الإدارة المالية للأدمن (Finance)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏦 الإدارة المالية                           [تحديث] [تصدير PDF/Excel]│
├─────────────────────────────────────────────────────────────────────────┤
│  📍 فلترة: [المحافظة ▼] [المدينة ▼]    📅 الفترة: [اليوم|أسبوع|شهر|سنة] │
│  ⚠️ منطقتك: القاهرة، الجيزة (للمدير الإقليمي)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌────────┐│
│  │ 💰 إجمالي       │ │ 📊 عمولة       │ │ 🚚 توصيل       │ │ ⏳ معلق││
│  │ الإيرادات       │ │ المنصة         │ │ (حق التجار)     │ │        ││
│  │ ▲ +15%         │ │ ▲ +12%         │ │ ثابت           │ │ 5 تسويات││
│  │ 150,000 ج.م    │ │ 10,500 ج.م     │ │ 3,000 ج.م      │ │ 8,500   ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └────────┘│
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                         💳 تقسيم طرق الدفع                              │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌──────────────────┐  │
│  │ 💵 نقدي (COD)       │ │ 💳 إلكتروني         │ │ 📱 محفظة         │  │
│  │ 60,000 ج.م (40%)   │ │ 75,000 ج.م (50%)   │ │ 15,000 ج.م (10%)│  │
│  │ ══════════════     │ │ ═════════════════  │ │ ════             │  │
│  │ التاجر يدين:        │ │ المنصة تدين:        │ │                  │  │
│  │ 4,200 ج.م          │ │ 70,875 ج.م         │ │                  │  │
│  └─────────────────────┘ └─────────────────────┘ └──────────────────┘  │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│  🔄 اتجاه التسوية الصافي:                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  المنصة تدفع للتجار: 66,675 ج.م ◀────────────────────────▶      │   │
│  │  (70,875 - 4,200 = 66,675)                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ═══════════════════════════════════════════════════════════════════   │
│                        📋 التسويات الأخيرة                              │
│  ┌────────┬──────────┬─────────┬──────────┬──────────┬────────────┐   │
│  │ المتجر │ الفترة   │ الطلبات │ العمولة   │ الاتجاه   │ الحالة     │   │
│  ├────────┼──────────┼─────────┼──────────┼──────────┼────────────┤   │
│  │ كشري   │ 18-25 ديس│ 45      │ 1,050    │ ◀ للتاجر │ ✅ مدفوع   │   │
│  │ بيتزا  │ 18-25 ديس│ 32      │ 840      │ ▶ للمنصة │ ⏳ معلق   │   │
│  │ سوبر   │ 18-25 ديس│ 78      │ 1,890    │ ⚖️ متوازن│ 🔄 جزئي   │   │
│  └────────┴──────────┴─────────┴──────────┴──────────┴────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. صفحة التسويات للأدمن (Settlements)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📋 إدارة التسويات                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  [إنشاء تسويات ▼] [تسوية مخصصة] [مجموعات التسوية]         [تحديث]      │
│  └─ يومي/3 أيام/أسبوعي                                                  │
│  ⚠️ سيتم إنشاء التسويات فقط للمزودين في منطقتك                         │
├─────────────────────────────────────────────────────────────────────────┤
│  📍 [المحافظة ▼] [المدينة ▼]  🔍 [بحث...]  📊 [الحالة ▼]               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ╔═════════════════════════════════════════════════════════════════╗   │
│  ║  💚 مدفوع: 45,000 ج.م    🔴 متأخر: 5,000 ج.م    🟡 معلق: 12,000  ║   │
│  ╚═════════════════════════════════════════════════════════════════╝   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ المزود      │ الفترة    │ 📦 الطلبات     │ 💰 المستحق  │ الحالة │  │
│  │             │           │ COD │ Online   │             │        │  │
│  ├─────────────┼───────────┼─────┼──────────┼─────────────┼────────┤  │
│  │ 🏪 كشري    │ 18-25 ديس │ 20  │ 25       │ ◀ 2,100    │ ⏳     │  │
│  │ الحسين     │           │     │          │ للتاجر     │        │  │
│  │ 📍 القاهرة │           │     │          │             │ [تأكيد]│  │
│  ├─────────────┼───────────┼─────┼──────────┼─────────────┼────────┤  │
│  │ 🍕 بيتزا   │ 18-25 ديس │ 30  │ 2        │ ▶ 450      │ ⏳     │  │
│  │ هت         │           │     │          │ للمنصة     │        │  │
│  │ 📍 الجيزة  │           │     │          │             │ [تحصيل]│  │
│  └─────────────┴───────────┴─────┴──────────┴─────────────┴────────┘  │
│                                                                         │
│  📌 ملاحظة: الأزرار تتغير حسب اتجاه التسوية:                           │
│  • "تأكيد الدفع" ← عندما المنصة تدفع للتاجر                            │
│  • "تأكيد التحصيل" ← عندما التاجر يدفع للمنصة                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. صفحة التحليلات للأدمن (Analytics) - التحسينات

```
الصفحة الحالية جيدة ✅ - تحتاج تحسينات طفيفة:

1. إضافة تحليل مالي:
   ┌─────────────────────────────────────────┐
   │ 💰 التحليل المالي                        │
   ├─────────────────────────────────────────┤
   │ • معدل التحصيل: 95%                     │
   │ • متوسط وقت التسوية: 3 أيام             │
   │ • نسبة المرتجعات: 2.5%                  │
   │ • هامش الربح (العمولات): 7%             │
   └─────────────────────────────────────────┘

2. إضافة تقرير المناطق المالي:
   ┌─────────────────────────────────────────┐
   │ 📍 أداء المناطق                         │
   ├─────────────────────────────────────────┤
   │ القاهرة: 60% من الإيرادات               │
   │ الجيزة: 25% من الإيرادات                │
   │ الإسكندرية: 15% من الإيرادات            │
   └─────────────────────────────────────────┘

3. تصدير التقارير المالية
```

---

## 🔐 نظام الصلاحيات والفلترة

### مصفوفة الصلاحيات

| الدور | Finance | Settlements | Analytics | Generate | Record Payment |
|-------|---------|-------------|-----------|----------|----------------|
| **Super Admin** | ✅ الكل | ✅ الكل | ✅ الكل | ✅ الكل | ✅ الكل |
| **Regional Manager** | 📍 منطقته | 📍 منطقته | 📍 منطقته | 📍 منطقته | 📍 منطقته |
| **Finance Admin** | ✅ الكل | ✅ الكل | ✅ الكل | ✅ الكل | ✅ الكل |
| **Analyst** | 👁️ عرض | 👁️ عرض | ✅ الكل | ❌ | ❌ |
| **Viewer** | 👁️ عرض | 👁️ عرض | 👁️ عرض | ❌ | ❌ |

### تطبيق الفلترة

```typescript
// في كل صفحة أدمن مالية:

import { useRegionFilter } from '@/lib/contexts/AdminRegionContext'
import { usePermissions } from '@/lib/permissions/use-permissions'

function AdminFinancePage() {
  const {
    isSuperAdmin,
    isRegionalAdmin,
    allowedGovernorateIds,
    regionProviderIds,
    applyProviderFilter
  } = useRegionFilter()

  const { can, canSync } = usePermissions()

  // التحقق من الصلاحيات
  useEffect(() => {
    if (!canSync('finance', 'view')) {
      router.push('/admin/unauthorized')
    }
  }, [])

  // تحميل البيانات مع الفلترة
  const loadData = async () => {
    let query = supabase.from('settlements').select('*')

    // ⚠️ مهم: تطبيق الفلترة من الـ query وليس بعد التحميل
    if (isRegionalAdmin && regionProviderIds.length > 0) {
      query = query.in('provider_id', regionProviderIds)
    } else if (!isSuperAdmin && allowedGovernorateIds.length > 0) {
      // للأدمن المحدود الصلاحيات
      const providerIds = await getProvidersByGovernorates(allowedGovernorateIds)
      query = query.in('provider_id', providerIds)
    }

    // تطبيق الفلتر الجغرافي المختار
    if (geoFilter.governorate_id || geoFilter.city_id) {
      query = applyProviderFilter(query, 'provider_id')
    }

    const { data } = await query
    return data
  }
}
```

---

## 🔄 انسياب البيانات المتزامن

### Workflow: إنشاء تسوية

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Admin Action   │────▶│   Database       │────▶│  Provider View   │
│  إنشاء تسوية     │     │  Settlement      │     │  يرى التسوية     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Notification   │────▶│   Realtime Sub   │────▶│  Auto Refresh    │
│  إشعار للتاجر    │     │  postgres_changes│     │  تحديث تلقائي    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Realtime Subscription للتاجر

```typescript
// Provider Finance Page
useEffect(() => {
  if (!providerId) return

  const subscription = supabase
    .channel('provider-settlements')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'settlements',
      filter: `provider_id=eq.${providerId}`
    }, (payload) => {
      // تحديث البيانات تلقائياً
      if (payload.eventType === 'INSERT') {
        toast.info('تم إنشاء تسوية جديدة')
      } else if (payload.eventType === 'UPDATE') {
        toast.success('تم تحديث حالة التسوية')
      }
      loadFinanceData()
    })
    .subscribe()

  return () => subscription.unsubscribe()
}, [providerId])
```

---

## 📁 الملفات المتأثرة

### ملفات تحتاج تعديل

| الملف | التغييرات المطلوبة | الأولوية |
|-------|-------------------|----------|
| `src/app/[locale]/admin/finance/page.tsx` | إعادة بناء كاملة | 🔴 عالية |
| `src/app/[locale]/admin/settlements/page.tsx` | تصحيح الفلترة + الصلاحيات | 🔴 عالية |
| `src/app/[locale]/admin/settlements/[id]/page.tsx` | توحيد العرض مع التاجر | 🟡 متوسطة |
| `src/app/[locale]/provider/finance/page.tsx` | Realtime + توحيد | 🟡 متوسطة |
| `src/lib/contexts/AdminRegionContext.tsx` | تحسينات | 🟢 منخفضة |

### ملفات جديدة

| الملف | الغرض |
|-------|-------|
| `src/lib/finance/financial-service.ts` | خدمة مالية موحدة |
| `src/lib/finance/settlement-calculator.ts` | حسابات التسوية |
| `src/lib/finance/export-service.ts` | تصدير PDF/Excel |
| `src/types/finance.ts` | أنواع موحدة |
| `src/hooks/useFinancialData.ts` | Hook مشترك |
| `supabase/migrations/xxx_financial_settlement_engine.sql` | SQL View |

---

## 📋 خطة التنفيذ المرحلية

### المرحلة 1: الأساسيات (الأسبوع 1)

```
□ 1.1 إنشاء financial_settlement_engine SQL View
□ 1.2 إنشاء FinancialService class
□ 1.3 إنشاء الأنواع الموحدة (types/finance.ts)
□ 1.4 تحديث صفحة Admin Finance مع الفلترة الصحيحة
□ 1.5 تحديث صفحة Admin Settlements مع الصلاحيات
```

### المرحلة 2: التزامن (الأسبوع 2)

```
□ 2.1 توحيد حسابات التسوية بين Admin و Provider
□ 2.2 إضافة Realtime subscriptions للتاجر
□ 2.3 إضافة إشعارات تغيير التسوية
□ 2.4 تحديث صفحة تفاصيل التسوية (Admin + Provider)
```

### المرحلة 3: التصدير والتقارير (الأسبوع 3)

```
□ 3.1 إضافة تصدير PDF للتسويات
□ 3.2 إضافة تصدير Excel للتقارير المالية
□ 3.3 تحسين صفحة Analytics المالية
□ 3.4 إضافة Audit Trail للعمليات
```

### المرحلة 4: الاختبار والتوثيق (الأسبوع 4)

```
□ 4.1 كتابة اختبارات للحسابات المالية
□ 4.2 اختبار الصلاحيات والفلترة
□ 4.3 اختبار التزامن بين Admin و Provider
□ 4.4 توثيق API والتقارير
```

---

## ✅ معايير القبول

### 1. تناسق الأرقام
- [ ] `net_payout` متطابق في Admin و Provider
- [ ] حساب المرتجعات موحد
- [ ] رسوم التوصيل معروضة بوضوح كحق للتاجر

### 2. الصلاحيات
- [ ] Regional Manager يرى فقط منطقته
- [ ] Generate Settlements يحترم الصلاحيات
- [ ] Record Payment يتطلب صلاحية `finance.settle`

### 3. الفلترة
- [ ] الفلترة تطبق من الـ query
- [ ] الـ stats تحسب بعد الفلترة
- [ ] لا توجد بيانات مسربة

### 4. التزامن
- [ ] التاجر يرى التسوية فور إنشائها
- [ ] التاجر يتلقى إشعار عند تغيير الحالة
- [ ] الأرقام متطابقة في الوقت الحقيقي

### 5. التصدير
- [ ] PDF يحتوي كل التفاصيل
- [ ] Excel يحتوي البيانات الخام
- [ ] التنسيق احترافي

---

## 🔗 المراجع

- [FINANCIAL_SYSTEM_REBUILD_PLAN.md](./FINANCIAL_SYSTEM_REBUILD_PLAN.md) - خطة النظام المالي للتاجر
- [src/types/permissions.ts](../src/types/permissions.ts) - أنواع الصلاحيات
- [src/lib/contexts/AdminRegionContext.tsx](../src/lib/contexts/AdminRegionContext.tsx) - سياق المنطقة

---

**تم إعداد هذه الخطة بواسطة**: Claude Code Review Agent
**تاريخ آخر تحديث**: 25 ديسمبر 2025
