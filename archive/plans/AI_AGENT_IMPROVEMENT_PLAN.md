# خطة تحسين AI Agent - Engezna Smart Assistant

**التاريخ:** 2025-12-16
**الإصدار:** v2.4 Plan
**الحالة:** في انتظار التنفيذ

---

## ملخص التحليل السابق (من محادثة الشات)

### ما يعمل بشكل جيد ✅

| الميزة            | الحالة | مثال                                |
| ----------------- | ------ | ----------------------------------- |
| التحية بحسب الوقت | ✅     | "صباح الفل!"                        |
| البحث عن منتجات   | ✅     | "عايز حواوشي" → نتائج صحيحة         |
| عرض الـ Variants  | ✅     | عادي/كبير للحواوشي                  |
| تأكيد الطلب       | ✅     | "2x حواوشي فراخ كبير بـ140 ج.م صح؟" |
| اللهجة المصرية    | ✅     | طبيعية وودية                        |

### المشاكل المكتشفة ❌

| المشكلة                 | الأثر | التحليل                                                      |
| ----------------------- | ----- | ------------------------------------------------------------ |
| **السلة لا تتحدث**      | عالي  | الـ `cart_action` يرجع من الـ API لكن الـ Frontend لا يعالجه |
| **زر المنيو معطل**      | عالي  | URL يستخدم اسم التاجر بدلاً من ID/Slug                       |
| **العروض فارغة**        | متوسط | الـ Tool يعمل لكن قد لا توجد بيانات في DB                    |
| **Quick Replies ثابتة** | منخفض | لا تتغير بحسب السياق بشكل كامل                               |

---

## تحليل المعايير الخمسة

### 1️⃣ استراتيجية البحث (Search Strategy)

**الوضع الحالي:**

```typescript
// agentTools.ts - search_menu
.or(`name_ar.ilike.%${query}%,description_ar.ilike.%${query}%`)
```

**المشاكل:**

- `ilike` لا يفهم المترادفات: "ساندوتش" ≠ "سندويتش"
- لا يتعامل مع الأخطاء الإملائية: "بيتذا" ≠ "بيتزا"
- لا يفهم السياق: "حاجة خفيفة" لا ترجع سلطات
- لا يستخدم الـ Embeddings الموجودة!

**الحل المطلوب:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hybrid Search Pipeline                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Keyword Match (ilike)                                       │
│     └── للبحث المباشر السريع                                    │
│                                                                  │
│  2. Semantic Search (pgvector + embeddings)                     │
│     └── لفهم المعنى والمترادفات                                  │
│                                                                  │
│  3. Fuzzy Match (pg_trgm)                                       │
│     └── للأخطاء الإملائية                                        │
│                                                                  │
│  4. RRF (Reciprocal Rank Fusion)                                │
│     └── دمج النتائج من كل الطرق                                  │
└─────────────────────────────────────────────────────────────────┘
```

**الملفات المطلوب تعديلها:**

- `src/lib/ai/agentTools.ts` - تعديل `search_menu`
- `supabase/migrations/` - إضافة دالة `hybrid_search_menu`
- `supabase/functions/search-embedding/` - Edge Function للـ query embedding

**الأولوية:** 🔴 عالية جداً

---

### 2️⃣ الذاكرة والسياق (Memory & Context)

**الوضع الحالي:**

```typescript
// agentPrompt.ts - buildSystemPrompt
// السياق كله في System Prompt (~700 سطر!)
// لا توجد ذاكرة طويلة المدى
// لا يوجد جدول user_insights
```

**المشاكل:**

- System Prompt ضخم جداً (يستهلك tokens كثيرة)
- لا توجد ذاكرة للعميل (تفضيلاته، آخر طلباته)
- لا يوجد context optimization
- نفس المعلومات تُرسل في كل رسالة

**الحل المطلوب:**

```sql
-- جدول جديد: user_insights
CREATE TABLE user_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),

  -- تفضيلات الطعام
  favorite_categories text[],      -- ['بيتزا', 'شاورما']
  dietary_preferences jsonb,       -- {vegetarian: false, spicy: true}
  usual_order_time varchar(20),    -- 'lunch', 'dinner', 'late_night'

  -- سلوك الطلب
  average_order_value decimal,
  preferred_providers uuid[],
  last_ordered_items jsonb,        -- [{item_id, name, count}]

  -- تفاعل مع المساعد
  successful_orders int DEFAULT 0,
  abandoned_carts int DEFAULT 0,
  common_queries text[],

  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**Context Optimization:**

```typescript
// بدلاً من إرسال كل القواعد، نرسل فقط الملائمة للسياق
function buildOptimizedPrompt(context: AgentContext): string {
  const sections = [];

  // Core personality (دايماً)
  sections.push(CORE_PERSONALITY);

  // Context-specific rules
  if (context.cartItems?.length > 0) {
    sections.push(CART_RULES);
  }
  if (context.providerContext) {
    sections.push(PROVIDER_RULES);
  }
  if (context.customerMemory?.orderCount > 0) {
    sections.push(RETURNING_CUSTOMER_RULES);
  }

  return sections.join('\n\n');
}
```

**الملفات المطلوب تعديلها:**

- `supabase/migrations/` - إضافة جدول `user_insights`
- `src/lib/ai/agentPrompt.ts` - تقسيم Prompt لأقسام
- `src/app/api/chat/route.ts` - جلب insights قبل المحادثة

**الأولوية:** 🟡 متوسطة

---

### 3️⃣ دقة استدعاء الأدوات (Tool Calling Precision)

**الوضع الحالي:**

```typescript
// agentHandler.ts
const result = await executeAgentTool(toolName, toolArgs, context);
// لا يوجد validation
// لا يوجد fallback
// لا يوجد retry logic
```

**المشاكل:**

- الـ AI قد يستدعي tool بـ parameters خاطئة
- لا يوجد validation للـ input
- لا يوجد fallback لنموذج أقوى عند الفشل
- لا يوجد caching للنتائج المتكررة

**الحل المطلوب:**

```typescript
// طبقة Validation جديدة
interface ToolValidation {
  toolName: string;
  validate: (params: Record<string, unknown>, context: ToolContext) => ValidationResult;
}

const TOOL_VALIDATORS: Record<string, ToolValidation> = {
  search_menu: {
    validate: (params, context) => {
      // لو مفيش query، ارفض
      if (!params.query || typeof params.query !== 'string') {
        return { valid: false, error: 'Query is required' };
      }
      // لو الـ query قصير جداً
      if (params.query.length < 2) {
        return { valid: false, error: 'Query too short' };
      }
      return { valid: true };
    },
  },
  add_to_cart: {
    validate: (params, context) => {
      // لازم يكون فيه item_id و provider_id
      if (!params.item_id) {
        return { valid: false, error: 'item_id is required' };
      }
      // لو المنتج من تاجر مختلف والسلة فيها حاجات
      if (context.cartProviderId && params.provider_id !== context.cartProviderId) {
        return {
          valid: false,
          error: 'different_provider',
          message: 'السلة فيها منتجات من تاجر تاني',
        };
      }
      return { valid: true };
    },
  },
};

// Fallback Strategy
async function executeWithFallback(
  toolName: string,
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  // 1. Validate first
  const validation = TOOL_VALIDATORS[toolName]?.validate(params, context);
  if (validation && !validation.valid) {
    return { success: false, error: validation.error };
  }

  // 2. Try execution
  const result = await executeAgentTool(toolName, params, context);

  // 3. If failed with empty results, try alternative
  if (result.success && Array.isArray(result.data) && result.data.length === 0) {
    // Try semantic search as fallback
    if (toolName === 'search_menu' && params.query) {
      return await executeSemanticSearch(params.query, context);
    }
  }

  return result;
}
```

**الملفات المطلوب تعديلها:**

- `src/lib/ai/toolValidation.ts` - ملف جديد
- `src/lib/ai/agentHandler.ts` - إضافة validation layer
- `src/lib/ai/agentTools.ts` - تحسين error handling

**الأولوية:** 🔴 عالية

---

### 4️⃣ التعامل مع اللهجات (Dialect Handling)

**الوضع الحالي:**

```typescript
// agentHandler.ts - generateDynamicQuickReplies
// Quick replies ثابتة بـ if/else
if (isAskingVariant && hasProducts) {
  return {
    suggestions: ['صغير', 'وسط', 'كبير'],
    // ...
  };
}
```

**المشاكل:**

- Quick replies ثابتة لا تتغير بحسب المنتج الفعلي
- لو المنتج له أحجام مختلفة (صغير/متوسط/عائلي) ما بتظهرش
- الـ AI مش بيولد الـ quick replies ديناميكياً

**الحل المطلوب:**

```typescript
// بدلاً من hardcoded، نخلي الـ AI يولد Quick Replies
// في response format

interface AIResponseFormat {
  content: string;
  quick_replies?: Array<{
    title: string;
    payload: string;
  }>;
  // الـ AI يولدهم بناءً على السياق
}

// في الـ System Prompt
`
عند الرد، لو محتاج تعرض خيارات للعميل:
- اكتب الخيارات في النص العادي
- Frontend هيحولهم لأزرار تلقائياً بناءً على السياق

مثال:
"الحواوشي فيه حجمين:
• عادي - 50 ج.م
• كبير - 70 ج.م
عايز أنهي؟"

Frontend هيفهم إن فيه خيارين: عادي وكبير
`;

// بدلاً من توليد Quick Replies من الـ handler،
// نحللها من رد الـ AI نفسه
function extractQuickRepliesFromContent(content: string, toolResults: ToolResult[]): QuickReply[] {
  const replies: QuickReply[] = [];

  // 1. لو فيه variants في نتائج البحث
  const variants = extractVariantsFromToolResults(toolResults);
  if (variants.length > 0) {
    variants.forEach((v) => {
      replies.push({
        title: `📏 ${v.name} - ${v.price} ج.م`,
        payload: `عايز ${v.name}`,
      });
    });
  }

  // 2. لو الـ AI بيسأل عن الكمية
  if (content.includes('كام واحد') || content.includes('كمية')) {
    replies.push(
      { title: '1️⃣ واحدة', payload: 'واحدة' },
      { title: '2️⃣ اتنين', payload: 'اتنين' },
      { title: '3️⃣ تلاتة', payload: 'تلاتة' }
    );
  }

  return replies;
}
```

**الملفات المطلوب تعديلها:**

- `src/lib/ai/agentHandler.ts` - تحسين `generateDynamicQuickReplies`
- `src/lib/ai/agentPrompt.ts` - تعديل تعليمات الـ format

**الأولوية:** 🟡 متوسطة

---

### 5️⃣ الحواجز الأمنية (Guardrails)

**الوضع الحالي:**

```typescript
// agentHandler.ts - sanitizeAgentResponse
// يوجد regex لإزالة URLs والـ markdown
sanitized = sanitized.replace(/https?:\/\/[^\s<>"\)]+/gi, '');
```

**ما يعمل ✅:**

- إزالة URLs
- إزالة Markdown images
- إزالة code blocks

**ما ينقص ❌:**

- لا يوجد stock validation قبل الإضافة للسلة
- لا يوجد price validation
- لا يوجد provider status check
- لا يوجد rate limiting للـ tool calls

**الحل المطلوب:**

```typescript
// Pre-execution Guardrails
const PRE_EXECUTION_GUARDS: Record<string, Guard> = {
  add_to_cart: async (params, context) => {
    // 1. Check item availability
    const item = await getMenuItem(params.item_id);
    if (!item?.is_available) {
      return {
        blocked: true,
        message: 'المنتج ده مش متاح دلوقتي',
      };
    }

    // 2. Check stock
    if (item.has_stock === false) {
      return {
        blocked: true,
        message: 'المنتج خلص للأسف',
      };
    }

    // 3. Check provider is open
    const provider = await getProvider(params.provider_id);
    if (provider?.status !== 'open') {
      return {
        blocked: true,
        message: 'المطعم مغلق دلوقتي',
      };
    }

    // 4. Validate price matches
    const expectedPrice = params.variant_id ? await getVariantPrice(params.variant_id) : item.price;
    if (Math.abs(params.price - expectedPrice) > 0.01) {
      return {
        blocked: true,
        message: 'فيه مشكلة في السعر، جرب تاني',
      };
    }

    return { blocked: false };
  },
};

// Post-execution Guardrails (في sanitizeAgentResponse)
function sanitizeAgentResponse(content: string): string {
  let sanitized = content;

  // 1. Remove URLs (موجود)
  sanitized = sanitized.replace(/https?:\/\/[^\s<>"\)]+/gi, '');

  // 2. Remove UUIDs (جديد)
  sanitized = sanitized.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ''
  );

  // 3. Remove JSON (تحسين)
  sanitized = sanitized.replace(/\{[^{}]*"[^"]*"[^{}]*:[^{}]*\}/g, '');

  // 4. Remove provider IDs that might leak
  sanitized = sanitized.replace(/provider[_-]?id[:=]\s*["']?[\w-]+["']?/gi, '');

  // 5. Remove any numeric IDs
  sanitized = sanitized.replace(/\b(id|ID)[:=]\s*\d+\b/g, '');

  return sanitized.trim();
}

// Rate Limiting
const toolCallCounts = new Map<string, number>();
const TOOL_RATE_LIMITS: Record<string, number> = {
  search_menu: 5, // max 5 searches per conversation
  add_to_cart: 10, // max 10 adds per conversation
  cancel_order: 1, // max 1 cancel per conversation
};

function checkRateLimit(toolName: string): boolean {
  const count = toolCallCounts.get(toolName) || 0;
  const limit = TOOL_RATE_LIMITS[toolName] || Infinity;

  if (count >= limit) {
    return false;
  }

  toolCallCounts.set(toolName, count + 1);
  return true;
}
```

**الملفات المطلوب تعديلها:**

- `src/lib/ai/guardrails.ts` - ملف جديد
- `src/lib/ai/agentHandler.ts` - إضافة pre/post guards
- `src/lib/ai/agentTools.ts` - إضافة stock check في `add_to_cart`

**الأولوية:** 🔴 عالية

---

## خطة التنفيذ المحكمة

### المرحلة 1: الإصلاحات العاجلة (يوم واحد)

| #   | المهمة                | الملف                | الوصف                              |
| --- | --------------------- | -------------------- | ---------------------------------- |
| 1.1 | إصلاح Cart Actions    | `useAIChat.ts`       | معالجة `cart_action` من response   |
| 1.2 | إصلاح Menu Navigation | `SmartAssistant.tsx` | استخدام provider ID بدلاً من الاسم |
| 1.3 | إضافة Stock Check     | `agentTools.ts`      | التحقق من التوفر قبل `add_to_cart` |

**كود إصلاح Cart Actions:**

```typescript
// useAIChat.ts - في handleResponse
if (response.cartAction) {
  const { type, provider_id, menu_item_id, quantity, unit_price, variant_id } = response.cartAction;

  switch (type) {
    case 'ADD_ITEM':
      addToCart({
        providerId: provider_id,
        menuItemId: menu_item_id,
        quantity,
        unitPrice: unit_price,
        variantId: variant_id,
      });
      break;
    case 'REMOVE_ITEM':
      removeFromCart(menu_item_id);
      break;
    case 'CLEAR_CART':
      clearCart();
      break;
  }
}
```

---

### المرحلة 2: تحسين البحث (3-5 أيام)

| #   | المهمة              | الملف           | الوصف                     |
| --- | ------------------- | --------------- | ------------------------- |
| 2.1 | دالة Hybrid Search  | Migration       | SQL function مع pgvector  |
| 2.2 | Query Embedding API | Edge Function   | توليد embedding للـ query |
| 2.3 | تحديث search_menu   | `agentTools.ts` | استخدام Hybrid Search     |
| 2.4 | Fuzzy Match         | Migration       | إضافة pg_trgm extension   |

**SQL Function:**

```sql
CREATE OR REPLACE FUNCTION hybrid_search_menu(
  p_query text,
  p_query_embedding vector(1536),
  p_provider_id uuid DEFAULT NULL,
  p_city_id uuid DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name_ar text,
  price decimal,
  image_url text,
  has_variants boolean,
  provider_id uuid,
  provider_name text,
  category_name text,
  match_score float
) AS $$
BEGIN
  RETURN QUERY
  WITH keyword_matches AS (
    SELECT
      mi.id,
      1.0 / (ROW_NUMBER() OVER (ORDER BY mi.name_ar ILIKE '%' || p_query || '%' DESC) + 60) as rrf_score
    FROM menu_items mi
    WHERE mi.is_available = true
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND (mi.name_ar ILIKE '%' || p_query || '%' OR mi.description_ar ILIKE '%' || p_query || '%')
    LIMIT 20
  ),
  semantic_matches AS (
    SELECT
      mi.id,
      1.0 / (ROW_NUMBER() OVER (ORDER BY mi.embedding <=> p_query_embedding) + 60) as rrf_score
    FROM menu_items mi
    WHERE mi.embedding IS NOT NULL
      AND mi.is_available = true
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
    ORDER BY mi.embedding <=> p_query_embedding
    LIMIT 20
  ),
  fuzzy_matches AS (
    SELECT
      mi.id,
      1.0 / (ROW_NUMBER() OVER (ORDER BY similarity(mi.name_ar, p_query) DESC) + 60) as rrf_score
    FROM menu_items mi
    WHERE mi.is_available = true
      AND (p_provider_id IS NULL OR mi.provider_id = p_provider_id)
      AND similarity(mi.name_ar, p_query) > 0.3
    LIMIT 20
  ),
  combined AS (
    SELECT
      COALESCE(k.id, s.id, f.id) as item_id,
      COALESCE(k.rrf_score, 0) + COALESCE(s.rrf_score, 0) + COALESCE(f.rrf_score, 0) as total_score
    FROM keyword_matches k
    FULL OUTER JOIN semantic_matches s ON k.id = s.id
    FULL OUTER JOIN fuzzy_matches f ON COALESCE(k.id, s.id) = f.id
  )
  SELECT
    mi.id,
    mi.name_ar,
    mi.price,
    mi.image_url,
    mi.has_variants,
    mi.provider_id,
    p.name_ar as provider_name,
    pc.name_ar as category_name,
    c.total_score as match_score
  FROM combined c
  JOIN menu_items mi ON c.item_id = mi.id
  JOIN providers p ON mi.provider_id = p.id
  LEFT JOIN provider_categories pc ON mi.provider_category_id = pc.id
  ORDER BY c.total_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

---

### المرحلة 3: الحواجز والتحقق (2-3 أيام)

| #   | المهمة                      | الملف               | الوصف                         |
| --- | --------------------------- | ------------------- | ----------------------------- |
| 3.1 | Tool Validation Layer       | `toolValidation.ts` | validation لكل tool           |
| 3.2 | Pre-execution Guards        | `guardrails.ts`     | stock, price, provider checks |
| 3.3 | Post-execution Sanitization | `agentHandler.ts`   | تحسين regex                   |
| 3.4 | Rate Limiting               | `agentHandler.ts`   | حدود لعدد الاستدعاءات         |

---

### المرحلة 4: الذاكرة والسياق (3-5 أيام)

| #   | المهمة              | الملف            | الوصف                     |
| --- | ------------------- | ---------------- | ------------------------- |
| 4.1 | جدول user_insights  | Migration        | إنشاء الجدول              |
| 4.2 | Insights Collection | API              | جمع البيانات من التفاعلات |
| 4.3 | Prompt Optimization | `agentPrompt.ts` | تقسيم وتحسين الـ prompt   |
| 4.4 | Context Loading     | `route.ts`       | جلب insights قبل المحادثة |

---

### المرحلة 5: تحسين Quick Replies (1-2 يوم)

| #   | المهمة                | الملف             | الوصف                           |
| --- | --------------------- | ----------------- | ------------------------------- |
| 5.1 | Dynamic Variants      | `agentHandler.ts` | استخراج variants من نتائج البحث |
| 5.2 | Context-aware Replies | `agentHandler.ts` | تحسين المنطق                    |
| 5.3 | AI-generated Options  | `agentPrompt.ts`  | تعليمات للـ AI                  |

---

## ملخص الأولويات

```
🔴 عالية جداً (يجب البدء فوراً):
├── إصلاح Cart Actions (Frontend لا يعالج cart_action)
├── إصلاح Menu Navigation (URL معطل)
└── تحسين البحث (Hybrid Search)

🟠 عالية (الأسبوع القادم):
├── Tool Validation Layer
├── Stock/Availability Check
└── Post-processing Guardrails

🟡 متوسطة (الأسبوع الثالث):
├── user_insights Table
├── Prompt Optimization
└── Dynamic Quick Replies

🟢 منخفضة (لاحقاً):
├── Full Semantic Search Integration
└── Advanced Context Management
```

---

## مقاييس النجاح

| المقياس           | الهدف     | طريقة القياس           |
| ----------------- | --------- | ---------------------- |
| نجاح البحث        | > 90%     | نتائج / إجمالي البحث   |
| دقة الإضافة للسلة | > 95%     | إضافات ناجحة / محاولات |
| رضا العميل        | > 4/5     | استطلاع بعد المحادثة   |
| زمن الاستجابة     | < 2 ثانية | متوسط وقت الرد         |

---

_آخر تحديث: 2025-12-16_

---

## 📋 سجل جلسات التطوير

### جلسة 2025-12-21: Regional Filtering للـ Admin Dashboard

#### الأهداف المنجزة ✅

| المهمة                    | الوصف                                | الملف                                 |
| ------------------------- | ------------------------------------ | ------------------------------------- |
| تصفية المتاجر حسب المنطقة | المشرف الإقليمي يرى فقط متاجر منطقته | `admin/providers/page.tsx`            |
| تصفية الطلبات حسب المنطقة | الطلبات من متاجر المنطقة فقط         | `admin/orders/page.tsx`               |
| تصفية العملاء حسب المنطقة | العملاء المرتبطين بطلبات المنطقة     | `admin/customers/page.tsx`            |
| تصفية Resolution Center   | إحصائيات المنازعات للمنطقة فقط       | `admin/resolution-center/page.tsx`    |
| تصفية Analytics           | تحليلات المنطقة فقط                  | `admin/analytics/page.tsx`            |
| تصفية أرقام الشارات       | Badge counts على الـ sidebar         | `admin/layout.tsx`                    |
| تصفية الإشعارات           | إشعارات المنطقة فقط                  | `components/admin/AdminHeader.tsx`    |
| AdminRegionContext        | تخزين مؤقت لبيانات المشرف            | `lib/contexts/AdminRegionContext.tsx` |
| Database Migration        | إضافة regional columns للإشعارات     | Migration file                        |

#### الدروس المستفادة 📚

##### 1. Whitelist vs Blacklist للتصفية

```typescript
// ❌ Blacklist (غير موثوق): حاول استثناء أنواع معينة
const regionalTypes = ['new_provider', 'refund_escalated', 'late_order', ...]
if (regionalTypes.includes(notif.type)) {
  // filter by region
}
// المشكلة: ممكن تنسى نوع جديد

// ✅ Whitelist (موثوق): اسمح فقط بأنواع محددة
const genericTypes = ['message', 'announcement', 'system', 'welcome', 'info']
if (genericTypes.includes(notif.type)) {
  return true // سماح عام
}
if (notif.governorate_id) {
  return allowedGovernorateIds.includes(notif.governorate_id)
}
return false // رفض الباقي
```

##### 2. معالجة حالة "لا يوجد providers في المنطقة"

```typescript
// ❌ غلط: الفلتر لا يُطبق عندما regionProviderIds فارغة
if (hasRegionFilter && regionProviderIds.length > 0) {
  query = query.in('provider_id', regionProviderIds);
}
// المشكلة: لو regionProviderIds.length === 0، يعرض كل البيانات!

// ✅ صح: إرجاع صفر بدلاً من كل البيانات
if (hasRegionFilter && regionProviderIds.length === 0) {
  setData([]); // أو عرض 0
  return;
}
if (hasRegionFilter && regionProviderIds.length > 0) {
  query = query.in('provider_id', regionProviderIds);
}
```

##### 3. انتظار تحميل الفلتر قبل تطبيقه

```typescript
// ❌ غلط: تحميل البيانات قبل أن يجهز الفلتر
useEffect(() => {
  loadData(); // الفلتر قد يكون null
}, []);

// ✅ صح: انتظار تحميل الفلتر
const { loading: filterLoading, hasRegionFilter } = useAdminRegion();

useEffect(() => {
  if (!filterLoading) {
    loadData(); // الفلتر جاهز الآن
  }
}, [filterLoading]);
```

#### الملفات الجديدة

| الملف                                                                                  | الوصف                                        |
| -------------------------------------------------------------------------------------- | -------------------------------------------- |
| `src/lib/contexts/AdminRegionContext.tsx`                                              | Context للتخزين المؤقت لبيانات المنطقة       |
| `supabase/migrations/20251221210000_add_regional_filtering_to_admin_notifications.sql` | إضافة columns و triggers للإشعارات الإقليمية |

#### Database Functions الجديدة

```sql
-- دالة للحصول على المشرفين المسؤولين عن محافظة
get_admins_for_governorate(p_governorate_id UUID)

-- دالة لإنشاء إشعار إقليمي
create_regional_admin_notification(
  p_type, p_title, p_body,
  p_provider_id, p_order_id, p_governorate_id, ...
)
```

#### SQL Query لحذف مستخدم تجريبي

```sql
-- حذف admin user بالإيميل
DELETE FROM admin_users WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'bebo@test.com'
);
DELETE FROM auth.users WHERE email = 'bebo@test.com';
```
