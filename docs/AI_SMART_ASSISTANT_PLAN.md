# 🤖 مساعد إنجزنا الذكي - خطة التطوير الشاملة
# Engezna AI Smart Assistant - Development Plan

**الإصدار:** 1.1
**تاريخ الإنشاء:** December 11, 2025
**آخر تحديث:** December 11, 2025 (إضافة Claude Code Prompt)
**الحالة:** مرحلة التخطيط
**الأولوية:** عالية (ميزة تنافسية رئيسية)

---

## 📋 جدول المحتويات

1. [نظرة عامة](#-نظرة-عامة)
2. [أهداف المشروع](#-أهداف-المشروع)
3. [قدرات المساعد الذكي](#-قدرات-المساعد-الذكي)
4. [البنية التقنية](#-البنية-التقنية)
5. [تدفق المحادثة](#-تدفق-المحادثة)
6. [قاعدة البيانات والـ Context](#-قاعدة-البيانات-والـ-context)
7. [الـ Prompts والشخصية](#-الـ-prompts-والشخصية)
8. [واجهة المستخدم](#-واجهة-المستخدم)
9. [خطة التنفيذ](#-خطة-التنفيذ)
10. [معايير النجاح](#-معايير-النجاح)
11. [المخاطر والحلول](#-المخاطر-والحلول)
12. [التكلفة والموارد](#-التكلفة-والموارد)
13. [🤖 Claude Code Implementation Prompt](#-claude-code-implementation-prompt) ⭐ **جديد**

---

## 🎯 نظرة عامة

### ما هو مساعد إنجزنا الذكي؟

مساعد محادثة ذكي يعمل بالذكاء الاصطناعي، مصمم خصيصاً لمساعدة عملاء إنجزنا في:
- فهم احتياجاتهم الغذائية
- اقتراح المطاعم والمنتجات المناسبة
- مقارنة الخيارات المتاحة
- إتمام الطلبات بسلاسة

### لماذا نحتاجه؟

| المشكلة الحالية | الحل بالمساعد الذكي |
|-----------------|---------------------|
| العميل لا يعرف ماذا يأكل | اقتراحات ذكية بناءً على تفضيلاته |
| صعوبة المقارنة بين المطاعم | مقارنة فورية مع الأسباب |
| نسيان الطلبات المفضلة | استحضار تلقائي للطلبات السابقة |
| تجربة بحث مملة | محادثة طبيعية بالعامية المصرية |
| عدم اكتشاف منتجات جديدة | اقتراحات متناسقة ومكملة |

### الميزة التنافسية

```
┌─────────────────────────────────────────────────────────────┐
│  طلبات ≠ لديها مساعد ذكي بهذه القدرات                      │
│  نون فود ≠ لديها مساعد ذكي بهذه القدرات                    │
│  إنجزنا ✓ أول منصة في صعيد مصر بمساعد ذكي متكامل           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 أهداف المشروع

### الأهداف الرئيسية

| الهدف | المقياس | المستهدف |
|-------|---------|----------|
| زيادة معدل التحويل | Orders via Assistant / Total Orders | > 15% |
| زيادة متوسط قيمة الطلب | AOV with Assistant vs Without | +20% |
| تحسين تجربة المستخدم | NPS Score | > 8/10 |
| تقليل وقت الطلب | Time to Order | -40% |
| زيادة الطلبات المتكررة | Repeat Orders | +25% |

### الأهداف الثانوية

- ✅ بناء قاعدة بيانات لتفضيلات العملاء
- ✅ فهم أنماط الطلب في بني سويف
- ✅ تحسين توصيات المنتجات
- ✅ تقليل الحاجة للدعم الفني

---

## 🧠 قدرات المساعد الذكي

### 1. فهم اللغة الطبيعية (NLU)

```
المدخلات التي يفهمها المساعد:
├── العامية المصرية: "عايز 2 شاورما فراخ"
├── العربية الفصحى: "أريد طلب وجبة غداء"
├── المختلط: "عايز delivery لبيتي"
├── الغامض: "جعان" → يسأل عن التفضيلات
└── المحدد: "بيتزا مارجريتا كبيرة من سلطان"
```

#### أمثلة على الفهم:

| إدخال العميل | فهم المساعد |
|--------------|-------------|
| "عايز أكل حاجة حلوة" | Intent: طلب حلويات/مشروبات |
| "جوعان ومش عارف آكل إيه" | Intent: طلب اقتراحات |
| "زي اللي طلبته المرة اللي فاتت" | Intent: إعادة طلب سابق |
| "عندكم كفتة؟" | Intent: بحث عن منتج محدد |
| "أرخص مطعم عنده برجر" | Intent: بحث مع مقارنة سعرية |
| "أسرع حد يوصلني" | Intent: بحث مع أولوية السرعة |

### 2. المقارنة الذكية بين المطاعم

```typescript
// قدرات المقارنة
interface ComparisonCapabilities {
  // مقارنة الأسعار
  priceComparison: {
    sameProduct: "برجر في مطعم أ = 50 ج.م vs مطعم ب = 45 ج.م";
    valueForMoney: "مطعم ب أرخص 10% مع نفس التقييم";
  };
  
  // مقارنة الجودة
  qualityComparison: {
    ratings: "مطعم أ: 4.8★ (150 تقييم) vs مطعم ب: 4.5★ (80 تقييم)";
    reviews: "العملاء يمدحون طعم الصوص في مطعم أ";
  };
  
  // مقارنة التوصيل
  deliveryComparison: {
    time: "مطعم أ: 25 دقيقة vs مطعم ب: 40 دقيقة";
    fee: "مطعم أ: 10 ج.م vs مطعم ب: 15 ج.م";
    minimum: "مطعم أ: حد أدنى 50 ج.م vs مطعم ب: بدون حد أدنى";
  };
}
```

#### مثال على محادثة المقارنة:

```
👤 العميل: عايز برجر كويس

🤖 المساعد: لقيتلك 3 خيارات للبرجر في بني سويف:

🥇 سلطان بيتزا
   • برجر لحمة: 55 ج.م
   • التقييم: 4.8★ (130 تقييم)
   • التوصيل: 15 دقيقة | 8 ج.م
   • ✨ الأعلى تقييماً

🥈 مطعم الأمير  
   • برجر لحمة: 45 ج.م
   • التقييم: 4.5★ (90 تقييم)
   • التوصيل: 25 دقيقة | 10 ج.م
   • 💰 الأرخص

🥉 كافيه لافندر
   • برجر فراخ: 40 ج.م
   • التقييم: 4.3★ (60 تقييم)
   • التوصيل: 20 دقيقة | 5 ج.م
   • 🚀 أقل رسوم توصيل

أنصحك بـ "سلطان بيتزا" لو الجودة أهم، أو "الأمير" لو عايز توفر.
تحب تختار أي واحد؟
```

### 3. استحضار الطلبات السابقة

```typescript
// تحليل سلوك العميل
interface CustomerBehaviorAnalysis {
  // الطلبات السابقة
  orderHistory: {
    totalOrders: number;
    favoriteProviders: Provider[];
    favoriteProducts: Product[];
    averageOrderValue: number;
    preferredPaymentMethod: string;
    usualOrderTime: string; // "مساءً" | "ظهراً"
    usualOrderDays: string[]; // ["الجمعة", "السبت"]
  };
  
  // التفضيلات المستنتجة
  inferredPreferences: {
    cuisineTypes: string[]; // ["مصري", "إيطالي"]
    priceRange: "budget" | "mid" | "premium";
    dietaryRestrictions: string[]; // ["نباتي", "بدون لحم خنزير"]
    spiceLevel: "mild" | "medium" | "spicy";
  };
  
  // أنماط الطلب
  patterns: {
    reorderRate: number; // نسبة إعادة الطلب
    explorationRate: number; // نسبة تجربة الجديد
    averageItemsPerOrder: number;
  };
}
```

#### مثال على المحادثة مع سياق:

```
👤 العميل: عايز أطلب أكل

🤖 المساعد: أهلاً أحمد! 👋

لاحظت إنك بتحب البيتزا من سلطان بيتزا 🍕
آخر 3 طلبات كانت:
• بيتزا مارجريتا كبيرة (3 مرات)
• مشروم برجر (مرتين)

تحب تكرر طلبك المفضل؟
أو عايز تجرب حاجة جديدة النهارده؟

[🔄 إعادة آخر طلب] [🆕 اقتراحات جديدة] [🔍 بحث]
```

### 4. اقتراحات المنتجات المتناسقة

```typescript
// منطق الاقتراحات
interface ProductSuggestionLogic {
  // اقتراحات مكملة
  complementary: {
    // إذا طلب بيتزا
    pizza: ["مشروب غازي", "سلطة", "حلويات"];
    // إذا طلب برجر
    burger: ["بطاطس", "كولا", "آيس كريم"];
    // إذا طلب شاورما
    shawarma: ["بطاطس", "عيش", "طحينة"];
  };
  
  // اقتراحات بناءً على السلوك
  behaviorBased: {
    // العميل دائماً يطلب مشروب
    alwaysOrdersDrink: true;
    // العميل يحب الحلويات
    likesDesserts: true;
    // العميل يفضل الوجبات
    prefersMeals: true;
  };
  
  // اقتراحات بناءً على الوقت
  timeBased: {
    breakfast: ["فول", "فلافل", "بيض"];
    lunch: ["أرز", "مشويات", "طواجن"];
    dinner: ["بيتزا", "برجر", "شاورما"];
    lateNight: ["سناكس", "حلويات", "مشروبات"];
  };
  
  // اقتراحات بناءً على العروض
  promotionBased: {
    // المنتجات اللي عليها خصم
    discountedItems: Product[];
    // الكومبو والعروض
    combos: Combo[];
  };
}
```

### 5. مراجعة الطلب والإضافة للسلة

```
تدفق إتمام الطلب:

┌─────────────────────────────────────────────────────────────┐
│  1. جمع عناصر الطلب خلال المحادثة                          │
│     └── تخزين مؤقت في orderDraft                           │
├─────────────────────────────────────────────────────────────┤
│  2. عرض ملخص الطلب للمراجعة                                │
│     ├── المنتجات والكميات                                  │
│     ├── الأسعار والخصومات                                  │
│     ├── رسوم التوصيل                                       │
│     └── الإجمالي                                           │
├─────────────────────────────────────────────────────────────┤
│  3. طلب تأكيد العميل                                       │
│     ├── ✅ موافق → إضافة للسلة                             │
│     ├── ✏️ تعديل → تعديل الكميات/الحذف                     │
│     └── ❌ إلغاء → إنهاء بدون إضافة                        │
├─────────────────────────────────────────────────────────────┤
│  4. إضافة للسلة                                            │
│     ├── استدعاء addToCart لكل منتج                         │
│     ├── عرض رسالة نجاح                                     │
│     └── اقتراح إتمام الطلب أو متابعة التسوق                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ البنية التقنية

### 1. نظرة عامة على المعمارية

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  ChatFAB    │  │  TextChat   │  │  OrderSummaryModal      │ │
│  │  (الزر)     │  │  (المحادثة) │  │  (ملخص الطلب)           │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘ │
│         │                │                       │              │
│         └────────────────┼───────────────────────┘              │
│                          │                                       │
│                   ┌──────▼──────┐                                │
│                   │ useAIChat   │ (React Hook)                   │
│                   │ Hook        │                                │
│                   └──────┬──────┘                                │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  API Route  │ /api/chat
                    │             │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
│  OpenAI API   │  │  Supabase     │  │  Cart Store   │
│  (GPT-4)      │  │  (Database)   │  │  (Zustand)    │
│               │  │               │  │               │
│  • NLU        │  │  • Products   │  │  • Add Items  │
│  • Response   │  │  • Providers  │  │  • Update     │
│  • Suggestions│  │  • Orders     │  │  • Clear      │
└───────────────┘  │  • Customers  │  └───────────────┘
                   └───────────────┘
```

### 2. المكونات الرئيسية

#### أ. API Route (`/api/chat/route.ts`)

```typescript
// src/app/api/chat/route.ts

import { OpenAI } from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildContext } from '@/lib/ai/context-builder';
import { parseIntent } from '@/lib/ai/intent-parser';
import { generateResponse } from '@/lib/ai/response-generator';

export async function POST(request: Request) {
  const { message, conversationHistory, userId } = await request.json();
  
  // 1. بناء السياق
  const context = await buildContext(userId);
  
  // 2. تحليل النية
  const intent = await parseIntent(message, conversationHistory);
  
  // 3. جلب البيانات المطلوبة
  const relevantData = await fetchRelevantData(intent, context);
  
  // 4. توليد الرد
  const response = await generateResponse({
    message,
    intent,
    context,
    relevantData,
    conversationHistory,
  });
  
  // 5. إرجاع الرد مع الإجراءات
  return Response.json({
    message: response.text,
    actions: response.actions, // ["add_to_cart", "show_products", etc.]
    products: response.products,
    orderDraft: response.orderDraft,
  });
}
```

#### ب. Context Builder (`/lib/ai/context-builder.ts`)

```typescript
// src/lib/ai/context-builder.ts

import { createClient } from '@/lib/supabase/server';

export interface AIContext {
  // معلومات العميل
  customer: {
    id: string;
    name: string;
    city: string;
    governorate: string;
  };
  
  // الطلبات السابقة
  orderHistory: {
    recentOrders: Order[];
    favoriteProducts: Product[];
    favoriteProviders: Provider[];
    totalOrders: number;
    averageOrderValue: number;
  };
  
  // التفضيلات المستنتجة
  preferences: {
    cuisineTypes: string[];
    priceRange: string;
    usualOrderTime: string;
  };
  
  // السياق الحالي
  currentContext: {
    time: string; // "صباح" | "ظهر" | "مساء" | "ليل"
    dayOfWeek: string;
    activePromotions: Promotion[];
    nearbyProviders: Provider[];
  };
}

export async function buildContext(userId: string): Promise<AIContext> {
  const supabase = createClient();
  
  // جلب معلومات العميل
  const { data: customer } = await supabase
    .from('profiles')
    .select(`
      *,
      governorates (name_ar),
      cities (name_ar)
    `)
    .eq('id', userId)
    .single();
  
  // جلب الطلبات السابقة
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        menu_items (*)
      ),
      providers (name_ar, category)
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  
  // تحليل التفضيلات
  const preferences = analyzePreferences(orders);
  
  // جلب المتاجر القريبة
  const { data: providers } = await supabase
    .from('providers')
    .select('*')
    .eq('city_id', customer?.city_id)
    .eq('status', 'approved');
  
  // جلب العروض النشطة
  const { data: promotions } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .gte('end_date', new Date().toISOString());
  
  return {
    customer: {
      id: userId,
      name: customer?.full_name?.split(' ')[0] || 'عميل',
      city: customer?.cities?.name_ar || 'بني سويف',
      governorate: customer?.governorates?.name_ar || 'بني سويف',
    },
    orderHistory: {
      recentOrders: orders?.slice(0, 5) || [],
      favoriteProducts: extractFavoriteProducts(orders),
      favoriteProviders: extractFavoriteProviders(orders),
      totalOrders: orders?.length || 0,
      averageOrderValue: calculateAverageOrderValue(orders),
    },
    preferences,
    currentContext: {
      time: getCurrentTimeOfDay(),
      dayOfWeek: getCurrentDayArabic(),
      activePromotions: promotions || [],
      nearbyProviders: providers || [],
    },
  };
}

// دوال مساعدة
function analyzePreferences(orders: any[]): AIContext['preferences'] {
  // تحليل أنواع الطعام المفضلة
  const cuisineCount: Record<string, number> = {};
  const prices: number[] = [];
  const orderTimes: number[] = [];
  
  orders?.forEach(order => {
    // تحليل نوع المطعم
    const category = order.providers?.category;
    if (category) {
      cuisineCount[category] = (cuisineCount[category] || 0) + 1;
    }
    
    // تحليل الأسعار
    prices.push(order.total);
    
    // تحليل أوقات الطلب
    const hour = new Date(order.created_at).getHours();
    orderTimes.push(hour);
  });
  
  // أكثر أنواع الطعام طلباً
  const cuisineTypes = Object.entries(cuisineCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);
  
  // متوسط السعر
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length || 0;
  const priceRange = avgPrice < 50 ? 'budget' : avgPrice < 100 ? 'mid' : 'premium';
  
  // وقت الطلب المعتاد
  const avgHour = Math.round(orderTimes.reduce((a, b) => a + b, 0) / orderTimes.length) || 12;
  const usualOrderTime = avgHour < 12 ? 'صباحاً' : avgHour < 17 ? 'ظهراً' : 'مساءً';
  
  return { cuisineTypes, priceRange, usualOrderTime };
}

function getCurrentTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'صباح';
  if (hour >= 12 && hour < 17) return 'ظهر';
  if (hour >= 17 && hour < 22) return 'مساء';
  return 'ليل';
}

function getCurrentDayArabic(): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[new Date().getDay()];
}
```

#### ج. Intent Parser (`/lib/ai/intent-parser.ts`)

```typescript
// src/lib/ai/intent-parser.ts

import { OpenAI } from 'openai';

export type IntentType = 
  | 'search_product'      // بحث عن منتج محدد
  | 'search_provider'     // بحث عن مطعم محدد
  | 'browse_category'     // تصفح فئة
  | 'compare'             // مقارنة
  | 'reorder'             // إعادة طلب سابق
  | 'get_recommendations' // طلب اقتراحات
  | 'add_to_order'        // إضافة للطلب الحالي
  | 'modify_order'        // تعديل الطلب
  | 'confirm_order'       // تأكيد الطلب
  | 'cancel_order'        // إلغاء الطلب
  | 'ask_question'        // سؤال عام
  | 'greeting'            // تحية
  | 'unclear';            // غير واضح

export interface ParsedIntent {
  type: IntentType;
  confidence: number;
  entities: {
    products?: string[];
    providers?: string[];
    quantities?: number[];
    categories?: string[];
    priceRange?: { min?: number; max?: number };
    attributes?: string[]; // ["حار", "نباتي", "بدون بصل"]
    sortBy?: 'price' | 'rating' | 'delivery_time' | 'distance';
  };
}

const openai = new OpenAI();

export async function parseIntent(
  message: string,
  conversationHistory: Message[]
): Promise<ParsedIntent> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `أنت محلل نوايا لتطبيق توصيل طعام في مصر.
        
        حلل رسالة المستخدم وأرجع JSON بهذا الشكل:
        {
          "type": "نوع النية",
          "confidence": 0.0-1.0,
          "entities": {
            "products": ["اسماء المنتجات"],
            "providers": ["اسماء المطاعم"],
            "quantities": [الكميات],
            "categories": ["الفئات"],
            "priceRange": {"min": رقم, "max": رقم},
            "attributes": ["صفات مثل حار، نباتي"],
            "sortBy": "price|rating|delivery_time"
          }
        }
        
        أنواع النوايا المتاحة:
        - search_product: بحث عن منتج (مثال: "عايز بيتزا")
        - search_provider: بحث عن مطعم (مثال: "فين سلطان بيتزا")
        - browse_category: تصفح فئة (مثال: "عايز أشوف المطاعم")
        - compare: مقارنة (مثال: "مين أحسن في البرجر")
        - reorder: إعادة طلب (مثال: "زي المرة اللي فاتت")
        - get_recommendations: اقتراحات (مثال: "اقترح عليا حاجة")
        - add_to_order: إضافة للطلب (مثال: "ضيف كمان 2 كولا")
        - modify_order: تعديل (مثال: "غير الكمية لـ 3")
        - confirm_order: تأكيد (مثال: "تمام كده")
        - cancel_order: إلغاء (مثال: "مش عايز")
        - ask_question: سؤال (مثال: "إيه ساعات العمل")
        - greeting: تحية (مثال: "السلام عليكم")
        - unclear: غير واضح`
      },
      ...conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      {
        role: 'user',
        content: message
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  
  return JSON.parse(response.choices[0].message.content || '{}');
}
```

#### د. Response Generator (`/lib/ai/response-generator.ts`)

```typescript
// src/lib/ai/response-generator.ts

import { OpenAI } from 'openai';
import { AIContext } from './context-builder';
import { ParsedIntent } from './intent-parser';

export interface AIResponse {
  text: string;
  actions: string[];
  products?: Product[];
  providers?: Provider[];
  orderDraft?: OrderDraft;
  suggestions?: string[];
}

export interface OrderDraft {
  items: {
    productId: string;
    productName: string;
    providerId: string;
    providerName: string;
    quantity: number;
    price: number;
    variants?: { name: string; price: number }[];
  }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

const openai = new OpenAI();

export async function generateResponse(params: {
  message: string;
  intent: ParsedIntent;
  context: AIContext;
  relevantData: any;
  conversationHistory: Message[];
}): Promise<AIResponse> {
  const { message, intent, context, relevantData, conversationHistory } = params;
  
  const systemPrompt = buildSystemPrompt(context);
  const dataPrompt = buildDataPrompt(intent, relevantData);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: dataPrompt },
      ...conversationHistory.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user', content: message }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });
  
  return JSON.parse(response.choices[0].message.content || '{}');
}

function buildSystemPrompt(context: AIContext): string {
  return `أنت "مساعد إنجزنا الذكي" 🤖، مساعد ودود لتطبيق توصيل الطعام في بني سويف، مصر.

## شخصيتك:
- تتكلم بالعامية المصرية بطريقة ودودة ومرحة
- تستخدم الإيموجي بشكل معتدل 😊🍕🔥
- تعرف اسم العميل وتستخدمه: "${context.customer.name}"
- تفهم السياق المحلي (بني سويف، صعيد مصر)

## معلومات العميل:
- الاسم: ${context.customer.name}
- المدينة: ${context.customer.city}
- عدد الطلبات السابقة: ${context.orderHistory.totalOrders}
- متوسط قيمة الطلب: ${context.orderHistory.averageOrderValue} ج.م
- المطاعم المفضلة: ${context.orderHistory.favoriteProviders.map(p => p.name_ar).join(', ') || 'لا يوجد بعد'}
- الأكلات المفضلة: ${context.orderHistory.favoriteProducts.map(p => p.name_ar).join(', ') || 'لا يوجد بعد'}
- يفضل الطلب: ${context.preferences.usualOrderTime}

## السياق الحالي:
- الوقت: ${context.currentContext.time}
- اليوم: ${context.currentContext.dayOfWeek}
- العروض النشطة: ${context.currentContext.activePromotions.length} عرض

## قواعد الرد:
1. أرجع JSON بهذا الشكل دائماً:
{
  "text": "نص الرد بالعامية المصرية",
  "actions": ["الإجراءات المطلوبة"],
  "products": [المنتجات إذا وجدت],
  "providers": [المطاعم إذا وجدت],
  "orderDraft": {الطلب المؤقت إذا وجد},
  "suggestions": ["اقتراحات للردود السريعة"]
}

2. الإجراءات المتاحة:
- "show_products": عرض منتجات
- "show_providers": عرض مطاعم
- "add_to_cart": إضافة للسلة
- "show_comparison": عرض مقارنة
- "confirm_order": تأكيد الطلب
- "ask_clarification": طلب توضيح

3. عند عرض منتجات أو مطاعم، قدم مقارنة مفيدة
4. اقترح دائماً منتجات مكملة
5. استخدم معلومات العميل لتخصيص التجربة
6. إذا لم تجد ما يطلبه، اقترح بدائل`;
}

function buildDataPrompt(intent: ParsedIntent, data: any): string {
  return `## البيانات المتاحة للرد:

### المنتجات المطابقة:
${JSON.stringify(data.products || [], null, 2)}

### المطاعم المتاحة:
${JSON.stringify(data.providers || [], null, 2)}

### العروض النشطة:
${JSON.stringify(data.promotions || [], null, 2)}

### نية المستخدم المكتشفة:
- النوع: ${intent.type}
- الثقة: ${intent.confidence}
- الكيانات: ${JSON.stringify(intent.entities)}

استخدم هذه البيانات لتقديم رد مفيد ومخصص.`;
}
```

### 3. React Hook (`useAIChat`)

```typescript
// src/hooks/useAIChat.ts

import { useState, useCallback, useRef } from 'react';
import { useCart } from '@/lib/store/cart';
import { useAuth } from '@/lib/auth/hooks';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: string[];
  products?: Product[];
  providers?: Provider[];
  orderDraft?: OrderDraft;
  suggestions?: string[];
}

export interface UseAIChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  orderDraft: OrderDraft | null;
  sendMessage: (message: string) => Promise<void>;
  confirmOrder: () => void;
  modifyOrder: (modifications: Partial<OrderDraft>) => void;
  cancelOrder: () => void;
  clearChat: () => void;
}

export function useAIChat(): UseAIChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  
  const { addToCart, clearCart } = useCart();
  const { user } = useAuth();
  const conversationIdRef = useRef(generateId());
  
  // إرسال رسالة
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    // إضافة رسالة المستخدم
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationHistory: messages.slice(-10),
          userId: user?.id,
          conversationId: conversationIdRef.current,
        }),
      });
      
      if (!response.ok) throw new Error('فشل في الاتصال');
      
      const data = await response.json();
      
      // إضافة رد المساعد
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.text,
        timestamp: new Date(),
        actions: data.actions,
        products: data.products,
        providers: data.providers,
        orderDraft: data.orderDraft,
        suggestions: data.suggestions,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // تحديث مسودة الطلب
      if (data.orderDraft) {
        setOrderDraft(data.orderDraft);
      }
      
    } catch (err) {
      setError('حصل مشكلة، جرب تاني');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, user?.id]);
  
  // تأكيد الطلب وإضافته للسلة
  const confirmOrder = useCallback(() => {
    if (!orderDraft) return;
    
    // إضافة كل عنصر للسلة
    orderDraft.items.forEach(item => {
      addToCart({
        id: item.productId,
        name_ar: item.productName,
        name_en: item.productName,
        price: item.price,
        quantity: item.quantity,
        provider_id: item.providerId,
        provider_name: item.providerName,
        variants: item.variants,
      });
    });
    
    // رسالة تأكيد
    const confirmMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: `تمام! 🎉 ضفت ${orderDraft.items.length} عناصر للسلة.
      
الإجمالي: ${orderDraft.total} ج.م

تقدر تروح للسلة دلوقتي لإتمام الطلب، أو تضيف حاجات تانية.`,
      timestamp: new Date(),
      suggestions: ['🛒 اذهب للسلة', '➕ أضف المزيد', '🏠 الصفحة الرئيسية'],
    };
    
    setMessages(prev => [...prev, confirmMessage]);
    setOrderDraft(null);
  }, [orderDraft, addToCart]);
  
  // تعديل الطلب
  const modifyOrder = useCallback((modifications: Partial<OrderDraft>) => {
    setOrderDraft(prev => prev ? { ...prev, ...modifications } : null);
  }, []);
  
  // إلغاء الطلب
  const cancelOrder = useCallback(() => {
    setOrderDraft(null);
    
    const cancelMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: 'تمام، لغيت الطلب. تحب تبدأ من الأول؟',
      timestamp: new Date(),
      suggestions: ['🔍 ابحث عن أكل', '📋 طلباتي السابقة', '❌ إغلاق'],
    };
    
    setMessages(prev => [...prev, cancelMessage]);
  }, []);
  
  // مسح المحادثة
  const clearChat = useCallback(() => {
    setMessages([]);
    setOrderDraft(null);
    conversationIdRef.current = generateId();
  }, []);
  
  return {
    messages,
    isLoading,
    error,
    orderDraft,
    sendMessage,
    confirmOrder,
    modifyOrder,
    cancelOrder,
    clearChat,
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### 4. مكون واجهة المستخدم

```typescript
// src/components/customer/chat/SmartAssistant.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { useAIChat, Message } from '@/hooks/useAIChat';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Loader2, ShoppingCart,
  ChevronDown, Sparkles, History, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/customer/shared/ProductCard';
import { ProviderCard } from '@/components/customer/shared/ProviderCard';
import { OrderSummaryCard } from './OrderSummaryCard';

interface SmartAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SmartAssistant({ isOpen, onClose }: SmartAssistantProps) {
  const t = useTranslations('chat');
  const {
    messages,
    isLoading,
    error,
    orderDraft,
    sendMessage,
    confirmOrder,
    modifyOrder,
    cancelOrder,
    clearChat,
  } = useAIChat();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // التمرير لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // التركيز على الإدخال عند الفتح
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);
  
  // إرسال الرسالة
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const message = input;
    setInput('');
    await sendMessage(message);
  };
  
  // الضغط على Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // الضغط على اقتراح
  const handleSuggestionClick = async (suggestion: string) => {
    await sendMessage(suggestion);
  };
  
  // رسالة الترحيب
  const welcomeMessage: Message = {
    id: 'welcome',
    role: 'assistant',
    content: `مرحباً! 👋 أنا مساعد إنجزنا الذكي.
    
اكتب لي ماذا تريد أن تطلب اليوم؟

مثال: "عايز 2 شاورما فراخ من مطعم الأمير"`,
    timestamp: new Date(),
    suggestions: [
      '🍕 عايز بيتزا',
      '🍔 اقترح عليا برجر',
      '📋 طلباتي السابقة',
      '🔍 ابحث في بني سويف',
    ],
  };
  
  const allMessages = messages.length === 0 ? [welcomeMessage] : messages;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-x-4 bottom-20 md:inset-auto md:bottom-24 md:right-4 
                     md:w-[420px] h-[70vh] md:h-[600px] max-h-[600px]
                     bg-white rounded-2xl shadow-2xl border border-gray-200
                     flex flex-col overflow-hidden z-50"
        >
          {/* Header */}
          <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">مساعد إنجزنا الذكي</h3>
                <p className="text-xs text-white/80">دردش واطلب</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {allMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onSuggestionClick={handleSuggestionClick}
                onConfirmOrder={confirmOrder}
                onCancelOrder={cancelOrder}
              />
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">جاري الكتابة...</span>
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Order Draft Summary */}
          {orderDraft && (
            <OrderSummaryCard
              orderDraft={orderDraft}
              onConfirm={confirmOrder}
              onModify={modifyOrder}
              onCancel={cancelOrder}
            />
          )}
          
          {/* Input */}
          <div className="border-t p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="اكتب طلبك هنا... مثال: عايز 2 برجر و بيبسي"
                className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="rounded-full w-12 h-12"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// مكون فقاعة الرسالة
function MessageBubble({
  message,
  onSuggestionClick,
  onConfirmOrder,
  onCancelOrder,
}: {
  message: Message;
  onSuggestionClick: (suggestion: string) => void;
  onConfirmOrder: () => void;
  onCancelOrder: () => void;
}) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
            : 'bg-primary text-white rounded-tr-sm'
        }`}
      >
        {/* نص الرسالة */}
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        
        {/* عرض المنتجات */}
        {message.products && message.products.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.products.slice(0, 3).map((product) => (
              <MiniProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        
        {/* عرض المطاعم */}
        {message.providers && message.providers.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.providers.slice(0, 3).map((provider) => (
              <MiniProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
        
        {/* ملخص الطلب */}
        {message.orderDraft && (
          <div className="mt-3 bg-white/10 rounded-lg p-3">
            <p className="font-bold mb-2">📋 ملخص الطلب:</p>
            {message.orderDraft.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.productName}</span>
                <span>{item.price * item.quantity} ج.م</span>
              </div>
            ))}
            <div className="border-t border-white/20 mt-2 pt-2 font-bold">
              الإجمالي: {message.orderDraft.total} ج.م
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={onConfirmOrder}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                ✅ أضف للسلة
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelOrder}
                className="bg-white/20 border-white/30"
              >
                ❌ إلغاء
              </Button>
            </div>
          </div>
        )}
        
        {/* الاقتراحات */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(suggestion)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium
                          transition-colors ${
                  isUser
                    ? 'bg-white border border-gray-200 hover:bg-gray-50'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// بطاقة منتج مصغرة
function MiniProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white/10 rounded-lg p-2 flex items-center gap-2">
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name_ar}
          className="w-12 h-12 rounded-lg object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{product.name_ar}</p>
        <p className="text-xs opacity-80">{product.price} ج.م</p>
      </div>
    </div>
  );
}

// بطاقة مطعم مصغرة
function MiniProviderCard({ provider }: { provider: Provider }) {
  return (
    <div className="bg-white/10 rounded-lg p-2 flex items-center gap-2">
      {provider.logo_url && (
        <img
          src={provider.logo_url}
          alt={provider.name_ar}
          className="w-12 h-12 rounded-lg object-cover"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{provider.name_ar}</p>
        <div className="flex items-center gap-2 text-xs opacity-80">
          <span>⭐ {provider.rating}</span>
          <span>•</span>
          <span>{provider.delivery_time} د</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 💬 تدفق المحادثة

### السيناريو 1: طلب محدد

```
┌─────────────────────────────────────────────────────────────┐
│ 👤 العميل: عايز 2 بيتزا مارجريتا كبيرة                      │
├─────────────────────────────────────────────────────────────┤
│ 🔍 تحليل النية:                                             │
│    • Type: search_product                                    │
│    • Products: ["بيتزا مارجريتا"]                            │
│    • Quantities: [2]                                         │
│    • Attributes: ["كبيرة"]                                   │
├─────────────────────────────────────────────────────────────┤
│ 📊 البحث في قاعدة البيانات:                                 │
│    • البحث عن "بيتزا مارجريتا" في menu_items                │
│    • تصفية حسب مدينة العميل                                 │
│    • ترتيب حسب التقييم والسعر                               │
├─────────────────────────────────────────────────────────────┤
│ 🤖 المساعد: لقيتلك بيتزا مارجريتا في بني سويف! 🍕          │
│                                                              │
│    🏆 سلطان بيتزا (الأعلى تقييماً)                          │
│    • بيتزا مارجريتا كبيرة: 85 ج.م                           │
│    • التقييم: 4.8★ | التوصيل: 15 د | 8 ج.م                  │
│                                                              │
│    💰 مطعم الأمير (الأرخص)                                   │
│    • بيتزا مارجريتا كبيرة: 70 ج.م                           │
│    • التقييم: 4.5★ | التوصيل: 25 د | 10 ج.م                 │
│                                                              │
│    تحب تطلب من أي مطعم؟                                     │
│                                                              │
│    [سلطان بيتزا] [مطعم الأمير] [أي حاجة تانية]              │
├─────────────────────────────────────────────────────────────┤
│ 👤 العميل: سلطان بيتزا                                      │
├─────────────────────────────────────────────────────────────┤
│ 🤖 المساعد: ممتاز! 🎉                                       │
│                                                              │
│    📋 ملخص طلبك:                                            │
│    ┌─────────────────────────────────────────┐              │
│    │ 2x بيتزا مارجريتا كبيرة    170 ج.م      │              │
│    │ رسوم التوصيل               8 ج.م        │              │
│    │ ─────────────────────────────           │              │
│    │ الإجمالي                   178 ج.م      │              │
│    └─────────────────────────────────────────┘              │
│                                                              │
│    تحب تضيف حاجة تانية؟ 🥤                                  │
│    • مشروب غازي (10 ج.م)                                    │
│    • سلطة (25 ج.م)                                          │
│                                                              │
│    [✅ أضف للسلة] [➕ أضف مشروب] [❌ إلغاء]                  │
├─────────────────────────────────────────────────────────────┤
│ 👤 العميل: أضف للسلة                                        │
├─────────────────────────────────────────────────────────────┤
│ 🤖 المساعد: تمام! 🎉 ضفت طلبك للسلة.                        │
│                                                              │
│    تقدر تروح للسلة دلوقتي لإتمام الطلب.                     │
│                                                              │
│    [🛒 اذهب للسلة] [➕ طلب تاني] [🏠 الرئيسية]              │
└─────────────────────────────────────────────────────────────┘
```

### السيناريو 2: طلب غامض مع سياق

```
┌─────────────────────────────────────────────────────────────┐
│ 👤 العميل: جعان                                             │
├─────────────────────────────────────────────────────────────┤
│ 🔍 السياق:                                                   │
│    • الوقت: 8 مساءً (وقت عشاء)                              │
│    • آخر طلبات العميل: بيتزا، برجر، شاورما                  │
│    • المطعم المفضل: سلطان بيتزا                              │
│    • متوسط الطلب: 85 ج.م                                     │
├─────────────────────────────────────────────────────────────┤
│ 🤖 المساعد: يا أحمد! 😊 جاي في وقته!                        │
│                                                              │
│    بناءً على طلباتك السابقة، ممكن أقترح عليك:              │
│                                                              │
│    🍕 بيتزا من سلطان (المفضل عندك)                          │
│    • بيتزا مارجريتا كبيرة: 85 ج.م                           │
│    • طلبتها 3 مرات قبل كده!                                 │
│                                                              │
│    🆕 جديد! عرض اليوم:                                      │
│    • 2 برجر + بطاطس + 2 بيبسي = 120 ج.م (بدل 150)          │
│                                                              │
│    🔥 الأكثر طلباً دلوقتي:                                  │
│    • شاورما فراخ من الأمير: 45 ج.م                          │
│                                                              │
│    إيه اللي يفتح نفسك؟                                      │
│                                                              │
│    [🍕 بيتزا] [🍔 البرجر] [🌯 شاورما] [🔍 حاجة تانية]       │
└─────────────────────────────────────────────────────────────┘
```

### السيناريو 3: إعادة طلب سابق

```
┌─────────────────────────────────────────────────────────────┐
│ 👤 العميل: زي المرة اللي فاتت                               │
├─────────────────────────────────────────────────────────────┤
│ 🔍 البحث في الطلبات السابقة:                                │
│    • آخر طلب: 2 ديسمبر 2025                                 │
│    • المحتوى: 2 بيتزا مارجريتا + 1 بيبسي                    │
│    • من: سلطان بيتزا                                        │
│    • الإجمالي: 188 ج.م                                      │
├─────────────────────────────────────────────────────────────┤
│ 🤖 المساعد: تمام! 📋                                        │
│                                                              │
│    آخر طلب ليك كان يوم 2 ديسمبر من سلطان بيتزا:            │
│                                                              │
│    ┌─────────────────────────────────────────┐              │
│    │ 2x بيتزا مارجريتا كبيرة    170 ج.م      │              │
│    │ 1x بيبسي كبير              10 ج.م       │              │
│    │ رسوم التوصيل               8 ج.م        │              │
│    │ ─────────────────────────────           │              │
│    │ الإجمالي                   188 ج.م      │              │
│    └─────────────────────────────────────────┘              │
│                                                              │
│    تحب تكرر نفس الطلب؟                                      │
│                                                              │
│    [✅ نعم، اطلب] [✏️ عدّل الكمية] [❌ لا، حاجة تانية]      │
└─────────────────────────────────────────────────────────────┘
```

### السيناريو 4: مقارنة بين مطاعم

```
┌─────────────────────────────────────────────────────────────┐
│ 👤 العميل: مين أحسن في البرجر؟                              │
├─────────────────────────────────────────────────────────────┤
│ 🤖 المساعد: خليني أقارنلك! 🔍                               │
│                                                              │
│    ┌─────────────────────────────────────────────────────┐  │
│    │        المقارنة         │ سلطان │ الأمير │ لافندر │  │
│    ├─────────────────────────┼────────┼────────┼─────────┤  │
│    │ سعر البرجر              │ 55 ج.م │ 45 ج.م │ 40 ج.م  │  │
│    │ التقييم                 │ 4.8★   │ 4.5★   │ 4.3★    │  │
│    │ وقت التوصيل             │ 15 د   │ 25 د   │ 20 د    │  │
│    │ رسوم التوصيل            │ 8 ج.م  │ 10 ج.م │ 5 ج.م   │  │
│    │ آراء العملاء            │ ممتاز  │ جيد    │ جيد     │  │
│    └─────────────────────────┴────────┴────────┴─────────┘  │
│                                                              │
│    💡 توصيتي:                                               │
│    • لو الجودة أهم ← سلطان بيتزا (أعلى تقييم)              │
│    • لو السعر أهم ← كافيه لافندر (أرخص + أقل توصيل)        │
│    • لو السرعة أهم ← سلطان بيتزا (أسرع توصيل)              │
│                                                              │
│    تحب تطلب من مين؟                                         │
│                                                              │
│    [سلطان] [الأمير] [لافندر]                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ قاعدة البيانات والـ Context

### جداول جديدة مطلوبة

```sql
-- جدول محادثات المساعد الذكي
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  messages_count INT DEFAULT 0,
  resulted_in_order BOOLEAN DEFAULT FALSE,
  order_id UUID REFERENCES orders(id),
  feedback_rating INT CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول رسائل المحادثة
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  intent_type TEXT,
  intent_confidence FLOAT,
  entities JSONB,
  products_shown UUID[],
  providers_shown UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تفضيلات العملاء (تُحدّث تلقائياً)
CREATE TABLE customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  favorite_categories TEXT[] DEFAULT '{}',
  favorite_providers UUID[] DEFAULT '{}',
  favorite_products UUID[] DEFAULT '{}',
  price_range TEXT DEFAULT 'mid',
  dietary_restrictions TEXT[] DEFAULT '{}',
  usual_order_time TEXT,
  average_order_value DECIMAL(10,2),
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- دالة لتحديث تفضيلات العميل بعد كل طلب
CREATE OR REPLACE FUNCTION update_customer_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث التفضيلات بناءً على الطلب الجديد
  INSERT INTO customer_preferences (customer_id)
  VALUES (NEW.customer_id)
  ON CONFLICT (customer_id) DO UPDATE SET
    average_order_value = (
      SELECT AVG(total) FROM orders WHERE customer_id = NEW.customer_id
    ),
    last_updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_preferences
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_preferences();

-- Indexes للأداء
CREATE INDEX idx_ai_conversations_customer ON ai_conversations(customer_id);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_customer_preferences_customer ON customer_preferences(customer_id);
```

### استعلامات مهمة

```typescript
// جلب سياق العميل الكامل
async function getCustomerContext(customerId: string) {
  const supabase = createClient();
  
  const [
    { data: profile },
    { data: preferences },
    { data: recentOrders },
    { data: conversations }
  ] = await Promise.all([
    // الملف الشخصي
    supabase
      .from('profiles')
      .select('*, governorates(name_ar), cities(name_ar)')
      .eq('id', customerId)
      .single(),
    
    // التفضيلات
    supabase
      .from('customer_preferences')
      .select('*')
      .eq('customer_id', customerId)
      .single(),
    
    // آخر 10 طلبات
    supabase
      .from('orders')
      .select(`
        *,
        order_items(*, menu_items(*)),
        providers(name_ar, category, logo_url)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10),
    
    // آخر محادثة
    supabase
      .from('ai_conversations')
      .select('*, ai_messages(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1)
  ]);
  
  return { profile, preferences, recentOrders, lastConversation: conversations?.[0] };
}

// البحث الذكي عن منتجات
async function smartProductSearch(query: string, context: CustomerContext) {
  const supabase = createClient();
  
  // البحث النصي + الفلترة حسب المدينة
  const { data: products } = await supabase
    .from('menu_items')
    .select(`
      *,
      providers!inner(
        id, name_ar, rating, delivery_time, delivery_fee, city_id
      )
    `)
    .eq('providers.city_id', context.cityId)
    .eq('providers.status', 'approved')
    .eq('is_available', true)
    .or(`name_ar.ilike.%${query}%,name_en.ilike.%${query}%,description_ar.ilike.%${query}%`)
    .order('providers(rating)', { ascending: false })
    .limit(20);
  
  // ترتيب ذكي: الأولوية للمفضلات
  const sortedProducts = products?.sort((a, b) => {
    const aIsFavorite = context.preferences?.favorite_providers?.includes(a.provider_id) ? 1 : 0;
    const bIsFavorite = context.preferences?.favorite_providers?.includes(b.provider_id) ? 1 : 0;
    return bIsFavorite - aIsFavorite;
  });
  
  return sortedProducts;
}
```

---

## 🎭 الـ Prompts والشخصية

### System Prompt الرئيسي

```typescript
const SYSTEM_PROMPT = `أنت "مساعد إنجزنا الذكي" 🤖، مساعد ودود ومرح لتطبيق توصيل الطعام "إنجزنا" في بني سويف، صعيد مصر.

## شخصيتك:
- تتكلم بالعامية المصرية بطريقة ودودة ومرحة
- تستخدم الإيموجي بشكل معتدل وطبيعي
- تعرف اسم العميل وتستخدمه بشكل طبيعي
- تفهم السياق المحلي (بني سويف، الأسعار المناسبة، المطاعم المحلية)
- لا تكون مزعجاً أو تضغط على العميل

## قواعد المحادثة:
1. ابدأ دائماً بتحية قصيرة إذا كانت أول رسالة
2. افهم ما يريده العميل قبل اقتراح أي شيء
3. اعرض خيارات محدودة (2-3) وليس قائمة طويلة
4. قدم مقارنات مفيدة عند الحاجة
5. اقترح منتجات مكملة بشكل طبيعي وليس إلحاحي
6. راجع الطلب مع العميل قبل الإضافة للسلة
7. إذا لم تجد ما يطلبه، اقترح بدائل قريبة

## ما لا يجب فعله:
- لا تكذب عن توفر منتج أو سعره
- لا تخترع معلومات عن المطاعم
- لا تضغط على العميل للشراء
- لا تستخدم لغة رسمية جافة
- لا ترسل رسائل طويلة جداً

## تنسيق الرد:
- استخدم سطور قصيرة ومقروءة
- استخدم bullet points للقوائم
- ضع الأسعار بشكل واضح
- أضف اقتراحات سريعة في النهاية [زر 1] [زر 2]

## الردود الجاهزة:
- إذا لم تفهم: "مش فاهم قصدك، ممكن توضحلي أكتر؟ 🤔"
- إذا لم تجد: "للأسف مش لاقي [X] دلوقتي، بس ممكن أقترح عليك [Y]"
- عند الخطأ: "حصلت مشكلة صغيرة، ممكن تجرب تاني؟"`;
```

### أمثلة Few-Shot

```typescript
const FEW_SHOT_EXAMPLES = [
  {
    user: "عايز بيتزا",
    assistant: `لقيتلك بيتزا في بني سويف! 🍕

🏆 سلطان بيتزا (الأعلى تقييماً)
• مارجريتا كبيرة: 85 ج.م
• ⭐ 4.8 | 🕐 15 دقيقة

💰 مطعم الأمير
• مارجريتا كبيرة: 70 ج.م
• ⭐ 4.5 | 🕐 25 دقيقة

تحب تختار من أي مطعم؟

[سلطان بيتزا] [مطعم الأمير]`
  },
  {
    user: "جعان",
    assistant: `يا ${customerName}! 😊 

بناءً على طلباتك السابقة، ممكن أقترح:

🍕 بيتزا من سلطان (المفضل عندك)
🍔 عرض البرجر الجديد (2 برجر + بطاطس = 100 ج.م)
🌯 شاورما فراخ من الأمير

إيه اللي يفتح نفسك النهارده؟

[🍕 بيتزا] [🍔 برجر] [🌯 شاورما]`
  },
  {
    user: "زي المرة اللي فاتت",
    assistant: `آخر طلب ليك كان:

📋 من سلطان بيتزا:
• 2x بيتزا مارجريتا كبيرة (170 ج.م)
• 1x بيبسي (10 ج.م)
• توصيل: 8 ج.م
─────────────────
💰 الإجمالي: 188 ج.م

تحب تكرر نفس الطلب؟

[✅ نعم] [✏️ عدّل] [❌ حاجة تانية]`
  }
];
```

---

## 🎨 واجهة المستخدم

### مكونات الواجهة

```
┌─────────────────────────────────────────────────────────────┐
│                      SmartAssistant                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Header: مساعد إنجزنا الذكي 🤖                        │  │
│  │  [X] Close Button                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   Messages Area                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ Assistant Bubble (Right/Blue)                   │  │  │
│  │  │ - Text                                          │  │  │
│  │  │ - Product Cards (optional)                      │  │  │
│  │  │ - Suggestions Chips                             │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ User Bubble (Left/Gray)                         │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Order Summary Card (when orderDraft exists)          │  │
│  │  [Confirm] [Modify] [Cancel]                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Input: [________________________] [Send Button]      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### تصميم المكونات

| المكون | الوصف | الخصائص |
|--------|-------|---------|
| **ChatFAB** | زر فتح المحادثة | أيقونة رسالة، يظهر في كل الصفحات |
| **SmartAssistant** | نافذة المحادثة | قابلة للإغلاق، responsive |
| **MessageBubble** | فقاعة الرسالة | user/assistant، تدعم المحتوى الغني |
| **ProductCard** | بطاقة منتج مصغرة | صورة، اسم، سعر، زر إضافة |
| **ProviderCard** | بطاقة مطعم مصغرة | لوجو، اسم، تقييم، وقت توصيل |
| **OrderSummaryCard** | ملخص الطلب | قائمة العناصر، الإجمالي، أزرار الإجراء |
| **SuggestionChips** | اقتراحات سريعة | أزرار قابلة للنقر |

---

## 📅 خطة التنفيذ

### المرحلة 1: الأساسيات (أسبوع 1-2)

| المهمة | الأولوية | المدة | الحالة |
|--------|----------|-------|--------|
| إنشاء API Route للمحادثة | عالية | 2 يوم | ⬜ |
| بناء Context Builder | عالية | 2 يوم | ⬜ |
| بناء Intent Parser | عالية | 2 يوم | ⬜ |
| بناء Response Generator | عالية | 2 يوم | ⬜ |
| إنشاء useAIChat Hook | عالية | 1 يوم | ⬜ |
| تكامل مع OpenAI API | عالية | 1 يوم | ⬜ |

### المرحلة 2: الواجهة (أسبوع 2-3)

| المهمة | الأولوية | المدة | الحالة |
|--------|----------|-------|--------|
| تحديث SmartAssistant UI | عالية | 2 يوم | ⬜ |
| إنشاء MessageBubble | عالية | 1 يوم | ⬜ |
| إنشاء ProductCard المصغرة | متوسطة | 1 يوم | ⬜ |
| إنشاء ProviderCard المصغرة | متوسطة | 1 يوم | ⬜ |
| إنشاء OrderSummaryCard | عالية | 1 يوم | ⬜ |
| إضافة الـ Animations | منخفضة | 1 يوم | ⬜ |

### المرحلة 3: القدرات الذكية (أسبوع 3-4)

| المهمة | الأولوية | المدة | الحالة |
|--------|----------|-------|--------|
| بناء نظام المقارنة | عالية | 2 يوم | ⬜ |
| استحضار الطلبات السابقة | عالية | 2 يوم | ⬜ |
| اقتراحات المنتجات المكملة | متوسطة | 2 يوم | ⬜ |
| تخصيص التجربة | متوسطة | 2 يوم | ⬜ |
| مراجعة وتأكيد الطلب | عالية | 1 يوم | ⬜ |
| الإضافة للسلة | عالية | 1 يوم | ⬜ |

### المرحلة 4: التحسين والاختبار (أسبوع 4-5)

| المهمة | الأولوية | المدة | الحالة |
|--------|----------|-------|--------|
| إنشاء جداول التحليلات | متوسطة | 1 يوم | ⬜ |
| تحسين الـ Prompts | عالية | 2 يوم | ⬜ |
| اختبار السيناريوهات | عالية | 3 يوم | ⬜ |
| تحسين الأداء | متوسطة | 2 يوم | ⬜ |
| إصلاح الأخطاء | عالية | 2 يوم | ⬜ |

### الجدول الزمني

```
الأسبوع 1: ──█████████──────────────────────────
           API + Context + Intent Parser

الأسبوع 2: ──────────█████████──────────────────
           Response Generator + UI Components

الأسبوع 3: ────────────────────█████████────────
           Smart Features (Compare, History)

الأسبوع 4: ──────────────────────────────████████
           Testing + Optimization

الأسبوع 5: ──────────────────────────────────███
           Bug Fixes + Polish
```

---

## 📊 معايير النجاح

### KPIs الأساسية

| المؤشر | الوصف | الهدف الشهر الأول | الهدف 6 أشهر |
|--------|-------|-------------------|---------------|
| **Adoption Rate** | نسبة العملاء الذين يستخدمون المساعد | 20% | 50% |
| **Completion Rate** | نسبة المحادثات التي تنتهي بطلب | 30% | 50% |
| **AOV Increase** | زيادة متوسط قيمة الطلب | +10% | +25% |
| **Time to Order** | متوسط وقت إتمام الطلب | 3 دقائق | 2 دقيقة |
| **User Satisfaction** | تقييم المستخدمين للمساعد | 4.0/5 | 4.5/5 |
| **Intent Accuracy** | دقة فهم نوايا المستخدم | 80% | 95% |

### مؤشرات المتابعة

```typescript
// تتبع الأداء
interface AnalyticsEvents {
  // بدء المحادثة
  'chat_started': { userId: string; source: string };
  
  // إرسال رسالة
  'message_sent': { 
    userId: string; 
    messageType: 'user' | 'assistant';
    intentType: string;
  };
  
  // عرض منتجات
  'products_shown': { 
    userId: string; 
    productIds: string[]; 
    searchQuery: string;
  };
  
  // إضافة للسلة من المساعد
  'cart_added_via_assistant': {
    userId: string;
    productIds: string[];
    totalValue: number;
  };
  
  // إتمام طلب
  'order_completed_via_assistant': {
    userId: string;
    orderId: string;
    orderValue: number;
    conversationId: string;
  };
  
  // تقييم المحادثة
  'chat_rated': {
    userId: string;
    conversationId: string;
    rating: number;
    feedback?: string;
  };
}
```

---

## ⚠️ المخاطر والحلول

### المخاطر التقنية

| المخاطر | الاحتمالية | التأثير | الحل |
|---------|-----------|---------|------|
| **بطء الاستجابة** | متوسط | عالي | Streaming responses + loading states |
| **تكلفة API عالية** | متوسط | متوسط | استخدام GPT-4o-mini + caching |
| **فهم خاطئ للنوايا** | عالي | متوسط | Few-shot examples + fallback |
| **عدم توفر المنتجات** | منخفض | متوسط | اقتراحات بديلة دائماً |

### المخاطر التجارية

| المخاطر | الاحتمالية | التأثير | الحل |
|---------|-----------|---------|------|
| **عدم تبني المستخدمين** | متوسط | عالي | Onboarding + تحفيزات |
| **تجربة سيئة** | متوسط | عالي | اختبار مكثف + feedback loop |
| **توقعات غير واقعية** | منخفض | متوسط | وضوح الحدود + disclaimers |

### خطة الطوارئ

```
إذا فشل OpenAI API:
├── 1. عرض رسالة خطأ ودية
├── 2. تفعيل fallback للبحث العادي
└── 3. إرسال تنبيه للفريق التقني

إذا كانت الردود سيئة:
├── 1. جمع feedback من المستخدمين
├── 2. تحديث الـ prompts
└── 3. إضافة المزيد من الأمثلة

إذا كانت التكلفة عالية:
├── 1. تحليل أنماط الاستخدام
├── 2. تحسين الـ prompts لتقليل tokens
└── 3. تفعيل rate limiting
```

---

## 💰 التكلفة والموارد

### تكلفة OpenAI API

```
التقدير الشهري (1000 مستخدم نشط):

GPT-4o-mini للـ Intent Parsing:
├── ~500 tokens/request × 5 requests/user × 1000 users
├── = 2,500,000 tokens/month
├── = $0.15/1M input + $0.60/1M output
└── ≈ $2-3/month

GPT-4o للـ Response Generation:
├── ~2000 tokens/request × 5 requests/user × 1000 users  
├── = 10,000,000 tokens/month
├── = $2.50/1M input + $10/1M output
└── ≈ $50-80/month

الإجمالي التقديري: $60-100/month
```

### الموارد البشرية

| المورد | المهمة | الوقت المطلوب |
|--------|--------|---------------|
| Full-stack Developer | تطوير الميزة | 5 أسابيع |
| UI/UX Review | مراجعة التصميم | 2-3 ساعات |
| QA Testing | اختبار السيناريوهات | 1 أسبوع |
| Product Owner | مراجعة ومتابعة | مستمر |

### ROI المتوقع

```
الاستثمار:
├── تطوير: ~200 ساعة × $X/hour = $Y
├── OpenAI API: ~$100/month
└── الإجمالي السنة الأولى: $Z

العائد المتوقع:
├── زيادة AOV 20% × 5000 طلب/شهر × 80 ج.م = +80,000 ج.م/شهر
├── زيادة معدل التحويل 10% = +500 طلب/شهر
└── تقليل الدعم الفني 30% = توفير X ساعة/شهر

ROI المتوقع: > 300% في السنة الأولى
```

---

## 📝 ملاحظات ختامية

### نصائح للتنفيذ

1. **ابدأ بسيطاً**: ابدأ بالقدرات الأساسية (بحث + عرض + إضافة للسلة) ثم أضف الميزات المتقدمة
2. **اختبر مبكراً**: اختبر مع مستخدمين حقيقيين من بني سويف
3. **اجمع feedback**: أضف نظام تقييم المحادثات من البداية
4. **حسّن باستمرار**: راجع الـ prompts أسبوعياً بناءً على المحادثات الفعلية
5. **راقب التكلفة**: تابع استهلاك API يومياً

### الخطوات التالية

1. ✅ مراجعة واعتماد الخطة
2. ⬜ إعداد مفتاح OpenAI API
3. ⬜ إنشاء بيئة التطوير
4. ⬜ بدء التنفيذ من المرحلة 1

---

---

## 🤖 Claude Code Implementation Prompt

### كيفية استخدام هذا القسم

انسخ الـ Prompt التالي وأعطه لـ Claude Code لتنفيذ المساعد الذكي بالكامل.

---

### 📋 Prompt الكامل لـ Claude Code

```markdown
# 🎯 مهمة: تنفيذ مساعد إنجزنا الذكي (AI Smart Assistant)

## السياق
أنا أعمل على مشروع Engezna - منصة توصيل طعام في مصر (بني سويف).
أحتاج تنفيذ مساعد ذكي يعمل بالـ AI للدردشة مع العملاء ومساعدتهم في الطلب.

## التقنيات المستخدمة في المشروع
- Next.js 15+ (App Router)
- TypeScript
- Supabase (Database + Auth)
- Tailwind CSS + shadcn/ui
- Zustand (State Management)
- OpenAI API (GPT-4o / GPT-4o-mini)

## المتطلبات الوظيفية للمساعد الذكي

### 1. فهم اللغة الطبيعية
- يفهم العامية المصرية: "عايز 2 شاورما فراخ"
- يفهم العربية الفصحى: "أريد طلب وجبة غداء"
- يتعامل مع الطلبات الغامضة: "جعان" → يسأل عن التفضيلات
- يستخرج: المنتجات، الكميات، المطاعم، الصفات (حار، نباتي، إلخ)

### 2. المقارنة بين المطاعم
- مقارنة الأسعار لنفس المنتج
- مقارنة التقييمات وعدد المراجعات
- مقارنة وقت التوصيل ورسومه
- تقديم توصيات ذكية (الأفضل جودة، الأرخص، الأسرع)

### 3. استحضار الطلبات السابقة
- جلب آخر طلبات العميل
- معرفة المنتجات والمطاعم المفضلة
- استنتاج التفضيلات (نوع الأكل، نطاق السعر، وقت الطلب المعتاد)
- دعم "زي المرة اللي فاتت"

### 4. اقتراحات ذكية
- منتجات مكملة (بيتزا → مشروب + حلويات)
- بناءً على الوقت (إفطار/غداء/عشاء)
- بناءً على العروض النشطة
- بناءً على الأكثر طلباً

### 5. مراجعة الطلب
- عرض ملخص الطلب للعميل
- السماح بالتعديل (الكمية، الحذف، الإضافة)
- طلب تأكيد قبل الإضافة للسلة

### 6. إضافة للسلة
- بعد موافقة العميل، إضافة كل العناصر للسلة
- توجيه العميل لإتمام الطلب أو متابعة التسوق

## البنية المطلوبة

### الملفات المطلوب إنشاؤها:

```
src/
├── app/api/chat/
│   └── route.ts                    # API Endpoint للمحادثة
│
├── lib/ai/
│   ├── index.ts                    # تصدير كل الـ modules
│   ├── context-builder.ts          # جمع سياق العميل من DB
│   ├── intent-parser.ts            # تحليل نية المستخدم
│   ├── response-generator.ts       # توليد الرد باستخدام GPT
│   ├── product-search.ts           # البحث الذكي عن المنتجات
│   ├── comparison-engine.ts        # محرك المقارنة بين المطاعم
│   └── prompts.ts                  # System prompts والأمثلة
│
├── hooks/
│   └── useAIChat.ts                # React Hook للمحادثة
│
├── components/customer/chat/
│   ├── SmartAssistant.tsx          # المكون الرئيسي (Modal/Drawer)
│   ├── ChatFAB.tsx                 # زر فتح المحادثة (Floating Action Button)
│   ├── MessageBubble.tsx           # فقاعة الرسالة (user/assistant)
│   ├── MessageList.tsx             # قائمة الرسائل مع auto-scroll
│   ├── ChatInput.tsx               # حقل الإدخال + زر الإرسال
│   ├── ProductSuggestionCard.tsx   # بطاقة منتج مقترح (داخل الدردشة)
│   ├── ProviderComparisonCard.tsx  # بطاقة مقارنة مطاعم
│   ├── OrderDraftCard.tsx          # بطاقة ملخص الطلب
│   ├── SuggestionChips.tsx         # أزرار الاقتراحات السريعة
│   └── TypingIndicator.tsx         # مؤشر الكتابة
│
├── types/
│   └── chat.ts                     # TypeScript types للمحادثة
│
└── store/
    └── chat-store.ts               # Zustand store للمحادثة (اختياري)
```

## تفاصيل التنفيذ

### 1. API Route (`/api/chat/route.ts`)

```typescript
// الوظائف المطلوبة:
// - استقبال رسالة المستخدم + تاريخ المحادثة + userId
// - بناء السياق (Context) للعميل
// - تحليل النية (Intent) من الرسالة
// - جلب البيانات المطلوبة (منتجات/مطاعم/طلبات سابقة)
// - توليد الرد باستخدام GPT
// - إرجاع: text, actions, products, providers, orderDraft, suggestions

export async function POST(request: Request) {
  // 1. Parse request
  // 2. Build context
  // 3. Parse intent
  // 4. Fetch relevant data
  // 5. Generate response
  // 6. Return response with actions
}
```

### 2. Context Builder (`/lib/ai/context-builder.ts`)

```typescript
interface AIContext {
  customer: {
    id: string;
    name: string;
    city: string;
    cityId: string;
  };
  orderHistory: {
    recentOrders: Order[];
    favoriteProducts: Product[];
    favoriteProviders: Provider[];
    totalOrders: number;
    averageOrderValue: number;
  };
  preferences: {
    cuisineTypes: string[];
    priceRange: 'budget' | 'mid' | 'premium';
    usualOrderTime: string;
  };
  currentContext: {
    time: 'صباح' | 'ظهر' | 'مساء' | 'ليل';
    dayOfWeek: string;
    activePromotions: Promotion[];
    nearbyProviders: Provider[];
  };
}

// جلب كل هذه البيانات من Supabase
```

### 3. Intent Parser (`/lib/ai/intent-parser.ts`)

```typescript
type IntentType = 
  | 'search_product'      // بحث عن منتج
  | 'search_provider'     // بحث عن مطعم
  | 'browse_category'     // تصفح فئة
  | 'compare'             // مقارنة
  | 'reorder'             // إعادة طلب سابق
  | 'get_recommendations' // طلب اقتراحات
  | 'add_to_order'        // إضافة للطلب
  | 'modify_order'        // تعديل الطلب
  | 'confirm_order'       // تأكيد الطلب
  | 'cancel_order'        // إلغاء
  | 'greeting'            // تحية
  | 'unclear';            // غير واضح

interface ParsedIntent {
  type: IntentType;
  confidence: number;
  entities: {
    products?: string[];
    providers?: string[];
    quantities?: number[];
    categories?: string[];
    priceRange?: { min?: number; max?: number };
    attributes?: string[]; // ["حار", "نباتي"]
    sortBy?: 'price' | 'rating' | 'delivery_time';
  };
}

// استخدم GPT-4o-mini لتحليل النية (أرخص وأسرع)
```

### 4. Response Generator (`/lib/ai/response-generator.ts`)

```typescript
interface AIResponse {
  text: string;                    // نص الرد بالعامية المصرية
  actions: string[];               // الإجراءات المطلوبة
  products?: Product[];            // المنتجات للعرض
  providers?: Provider[];          // المطاعم للعرض
  orderDraft?: OrderDraft;         // مسودة الطلب
  suggestions?: string[];          // اقتراحات الردود السريعة
}

interface OrderDraft {
  items: {
    productId: string;
    productName: string;
    providerId: string;
    providerName: string;
    quantity: number;
    price: number;
    variants?: { name: string; price: number }[];
  }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}

// استخدم GPT-4o لتوليد الردود (أفضل جودة)
```

### 5. useAIChat Hook (`/hooks/useAIChat.ts`)

```typescript
interface UseAIChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  orderDraft: OrderDraft | null;
  
  // Methods
  sendMessage: (message: string) => Promise<void>;
  confirmOrder: () => void;        // إضافة للسلة
  modifyOrder: (modifications: any) => void;
  cancelOrder: () => void;
  clearChat: () => void;
}

// يستخدم useCart من Zustand لإضافة المنتجات للسلة
```

### 6. SmartAssistant Component

```typescript
// المتطلبات:
// - Modal/Drawer يفتح من ChatFAB
// - RTL support (العربية)
// - Responsive (mobile-first)
// - Header مع عنوان وزر إغلاق
// - Messages area مع auto-scroll
// - Order draft card (عند وجود طلب)
// - Input area مع زر إرسال
// - Animations (framer-motion)
```

## System Prompt للمساعد

```
أنت "مساعد إنجزنا الذكي" 🤖، مساعد ودود ومرح لتطبيق توصيل الطعام "إنجزنا" في بني سويف، مصر.

شخصيتك:
- تتكلم بالعامية المصرية بطريقة ودودة ومرحة
- تستخدم الإيموجي بشكل معتدل 😊🍕🔥
- تعرف اسم العميل وتستخدمه
- تفهم السياق المحلي (بني سويف، صعيد مصر)
- لا تكون مزعجاً أو تضغط على العميل

قواعد الرد:
1. أرجع JSON دائماً بهذا الشكل:
{
  "text": "نص الرد",
  "actions": ["action1", "action2"],
  "products": [],
  "providers": [],
  "orderDraft": null,
  "suggestions": ["اقتراح 1", "اقتراح 2"]
}

2. الإجراءات المتاحة:
- "show_products": عرض منتجات
- "show_providers": عرض مطاعم
- "add_to_cart": إضافة للسلة
- "show_comparison": عرض مقارنة
- "confirm_order": تأكيد الطلب
- "ask_clarification": طلب توضيح

3. قواعد المحادثة:
- افهم ما يريده العميل قبل الاقتراح
- اعرض 2-3 خيارات فقط وليس قائمة طويلة
- قدم مقارنات مفيدة
- اقترح منتجات مكملة بشكل طبيعي
- راجع الطلب قبل الإضافة للسلة
```

## جداول Supabase المطلوب إنشاؤها

```sql
-- جدول محادثات المساعد الذكي
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  messages_count INT DEFAULT 0,
  resulted_in_order BOOLEAN DEFAULT FALSE,
  order_id UUID REFERENCES orders(id),
  feedback_rating INT CHECK (feedback_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول رسائل المحادثة
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  intent_type TEXT,
  intent_confidence FLOAT,
  entities JSONB,
  products_shown UUID[],
  providers_shown UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تفضيلات العملاء
CREATE TABLE customer_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  favorite_categories TEXT[] DEFAULT '{}',
  favorite_providers UUID[] DEFAULT '{}',
  favorite_products UUID[] DEFAULT '{}',
  price_range TEXT DEFAULT 'mid',
  dietary_restrictions TEXT[] DEFAULT '{}',
  usual_order_time TEXT,
  average_order_value DECIMAL(10,2),
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_conversations_customer ON ai_conversations(customer_id);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_customer_preferences_customer ON customer_preferences(customer_id);
```

## الجداول الموجودة في المشروع (للرجوع إليها)

- `profiles` - بيانات المستخدمين
- `providers` - المطاعم ومقدمي الخدمات
- `menu_items` - المنتجات
- `product_variants` - متغيرات المنتجات
- `orders` - الطلبات
- `order_items` - عناصر الطلبات
- `reviews` - التقييمات
- `cities` - المدن
- `governorates` - المحافظات

## خطوات التنفيذ

### المرحلة 1: البنية الأساسية
1. إنشاء الـ types في `/types/chat.ts`
2. إنشاء `/lib/ai/prompts.ts` مع System Prompts
3. إنشاء `/lib/ai/context-builder.ts`
4. إنشاء `/lib/ai/intent-parser.ts`
5. إنشاء `/lib/ai/response-generator.ts`
6. إنشاء `/app/api/chat/route.ts`

### المرحلة 2: الـ Hook والـ Store
1. إنشاء `/hooks/useAIChat.ts`
2. التكامل مع useCart الموجود

### المرحلة 3: الواجهة
1. إنشاء `/components/customer/chat/ChatFAB.tsx`
2. إنشاء `/components/customer/chat/SmartAssistant.tsx`
3. إنشاء باقي المكونات الفرعية
4. إضافة ChatFAB للـ layout

### المرحلة 4: قاعدة البيانات
1. إنشاء الجداول الجديدة في Supabase
2. إنشاء الـ RLS policies

## Environment Variables المطلوبة

```env
OPENAI_API_KEY=sk-...
```

## ملاحظات مهمة

1. **الأداء**: استخدم GPT-4o-mini لتحليل النية (أسرع وأرخص)، وGPT-4o للردود
2. **التكلفة**: حد أقصى 10 رسائل في المحادثة الواحدة للـ context
3. **الأمان**: لا تكشف أي معلومات حساسة في الردود
4. **RTL**: كل الواجهة يجب أن تدعم RTL
5. **Mobile**: صمم mobile-first

## مثال على محادثة كاملة

```
👤 العميل: عايز بيتزا

🤖 المساعد:
{
  "text": "لقيتلك بيتزا في بني سويف! 🍕\n\n🏆 سلطان بيتزا (الأعلى تقييماً)\n• مارجريتا كبيرة: 85 ج.م\n• ⭐ 4.8 | 🕐 15 دقيقة\n\n💰 مطعم الأمير (الأرخص)\n• مارجريتا كبيرة: 70 ج.م\n• ⭐ 4.5 | 🕐 25 دقيقة\n\nتحب تختار من أي مطعم؟",
  "actions": ["show_products", "show_comparison"],
  "products": [...],
  "providers": [...],
  "suggestions": ["سلطان بيتزا", "مطعم الأمير", "حاجة تانية"]
}

👤 العميل: سلطان بيتزا

🤖 المساعد:
{
  "text": "ممتاز! 🎉\n\n📋 طلبك من سلطان بيتزا:\n• 1x بيتزا مارجريتا كبيرة: 85 ج.م\n• توصيل: 8 ج.م\n• الإجمالي: 93 ج.م\n\nتحب تضيف حاجة تانية؟ 🥤",
  "actions": ["show_order_draft"],
  "orderDraft": {
    "items": [{...}],
    "subtotal": 85,
    "deliveryFee": 8,
    "total": 93
  },
  "suggestions": ["✅ أضف للسلة", "➕ أضف مشروب", "❌ إلغاء"]
}

👤 العميل: أضف للسلة

🤖 المساعد:
{
  "text": "تمام! 🎉 ضفت طلبك للسلة.\n\nتقدر تروح للسلة دلوقتي لإتمام الطلب.",
  "actions": ["add_to_cart", "redirect_to_cart"],
  "suggestions": ["🛒 اذهب للسلة", "➕ طلب تاني", "🏠 الرئيسية"]
}
```

ابدأ التنفيذ الآن بالترتيب المذكور في خطوات التنفيذ.
```

---

### 📌 ملاحظات لاستخدام الـ Prompt

1. **قبل إعطاء الـ Prompt لـ Claude Code:**
   - تأكد من وجود `OPENAI_API_KEY` في `.env.local`
   - تأكد من تشغيل المشروع بنجاح

2. **بعد التنفيذ:**
   - اختبر المحادثة مع سيناريوهات مختلفة
   - راجع الـ prompts وحسّنها حسب النتائج
   - تابع استهلاك OpenAI API

3. **للتعديل:**
   - يمكنك تعديل System Prompt في `/lib/ai/prompts.ts`
   - يمكنك إضافة المزيد من الـ intents في Intent Parser

---

**تم إعداد هذه الخطة بواسطة:** Claude AI
**لمشروع:** Engezna (إنجزنا)
**تاريخ الإنشاء:** December 11, 2025
**آخر تحديث:** December 11, 2025

---

> 💡 هذه الوثيقة قابلة للتحديث بناءً على المستجدات والـ feedback من فريق العمل والمستخدمين.
