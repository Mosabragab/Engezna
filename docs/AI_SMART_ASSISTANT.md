# مساعد إنجزنا الذكي - AI Smart Assistant

> **حالة المشروع:** ✅ v2.4.1 - تحسين السياق والتمييز بين الكلمات المتشابهة

---

## نظرة عامة

مساعد ذكي للدردشة داخل تطبيق إنجزنا للتوصيل، يستخدم **AI Agent Architecture** مع OpenAI GPT-4o-mini و Function Calling. يعمل كبديل ذكي للشخص الذي يأخذ الطلبات عند التاجر.

### أقسام إنجزنا الأربعة

إنجزنا مش مطاعم بس! المساعد يدعم 4 أقسام رئيسية:

| القسم | الـ ID | الوصف |
|-------|--------|-------|
| 🍽️ مطاعم | `restaurant_cafe` | المطاعم |
| ☕ البن والحلويات | `coffee_sweets` | محلات القهوة والحلويات |
| 🛒 سوبر ماركت | `grocery` | السوبر ماركت والبقالة |
| 🥬 خضروات وفواكه | `vegetables_fruits` | الخضار والفاكهة |

### ما يمكن للمساعد فعله:
- البحث عن المنتجات والتجار
- عرض المنتجات والأقسام لكل أنواع التجار
- استعراض التجار حسب القسم (مطاعم، سوبر ماركت، خضار، بن)
- معلومات التوصيل والأسعار
- تتبع الطلبات وحالتها
- التحقق من أكواد الخصم
- إنشاء تذاكر دعم فني
- التحويل لموظف بشري عند الحاجة

---

## 🏗️ الهيكل الجديد (v2.0)

### الملفات الرئيسية

| الملف | الوصف |
|-------|-------|
| `src/app/api/chat/route.ts` | API endpoint (Streaming SSE) |
| `src/lib/ai/agentTools.ts` | تعريف 22 أداة للـ Agent |
| `src/lib/ai/agentPrompt.ts` | System Prompt بالعربية المصرية |
| `src/lib/ai/agentHandler.ts` | محرك الـ Agent Loop |
| `src/hooks/useAIChat.ts` | React Hook للتفاعل |
| `src/lib/store/chat.ts` | Zustand Store للمحادثات |
| `src/components/customer/chat/SmartAssistant.tsx` | UI Component |

### مقارنة مع النظام القديم

| النظام القديم (v1) | النظام الجديد (v2) |
|-------------------|-------------------|
| Intent Classification + Manual Handlers | AI Agent with Tool Use |
| 4000+ سطر كود | ~500 سطر كود |
| Regex patterns للأخطاء الإملائية | الـ AI يفهم السياق تلقائياً |
| معالجات منفصلة لكل نية | الـ AI يختار الأدوات المناسبة |
| صعب الصيانة والتوسيع | سهل إضافة أدوات جديدة |

---

## 🛠️ الأدوات المتاحة (24 Tool)

### 🏢 Business Category Tools (2) - جديد!

| Tool | الوصف |
|------|-------|
| `get_business_categories` | عرض الأقسام الرئيسية الأربعة (مطاعم، سوبر ماركت، خضار، بن) |
| `get_providers_by_category` | عرض التجار المتاحين في قسم معين |

### 🍽️ Menu Tools (6)

| Tool | الوصف |
|------|-------|
| `get_provider_categories` | أقسام المنيو لتاجر معين |
| `get_menu_items` | المنتجات مع الفلترة |
| `get_item_details` | تفاصيل منتج + variants + addons |
| `get_item_addons` | الإضافات المتاحة |
| `search_menu` | البحث في المنيو |
| `check_item_availability` | التحقق من التوفر |

### 🏪 Provider Tools (4)

| Tool | الوصف |
|------|-------|
| `get_provider_info` | معلومات التاجر |
| `check_provider_open` | هل مفتوح الآن؟ |
| `get_delivery_info` | رسوم التوصيل والحد الأدنى |
| `search_providers` | البحث عن تجار |

### 🛒 Order Tools (4)

| Tool | الوصف |
|------|-------|
| `get_order_status` | حالة طلب معين |
| `get_order_history` | تاريخ طلبات العميل |
| `track_order` | تتبع الطلب مع timeline |
| `cancel_order` | إلغاء طلب (pending فقط) |

### 👤 Customer Tools (2)

| Tool | الوصف |
|------|-------|
| `get_customer_addresses` | عناوين العميل المحفوظة |
| `get_favorites` | التجار المفضلين |

### 🎁 Promotions Tools (2)

| Tool | الوصف |
|------|-------|
| `get_provider_promotions` | **محسّن** - يرجع العروض الترويجية + المنتجات المخفضة (original_price > price) مع نسبة الخصم |
| `validate_promo_code` | التحقق من كود خصم |

### ⭐ Reviews Tools (1)

| Tool | الوصف |
|------|-------|
| `get_provider_reviews` | تقييمات التجار |

### 🎫 Support Tools (2)

| Tool | الوصف |
|------|-------|
| `create_support_ticket` | إنشاء تذكرة دعم |
| `escalate_to_human` | تحويل لموظف بشري |

---

## 🔄 كيف يعمل Agent Loop؟

```
┌─────────────────────────────────────────────────────────────┐
│                      User Message                           │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                    GPT-4o-mini                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ System Prompt + Context + Available Tools                │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           ↓
              ┌────────────┴────────────┐
              ↓                         ↓
      [Tool Call?]               [Final Response]
              ↓                         ↓
    Execute Tool(s)              Stream to Client
              ↓
    Add Result to Context
              ↓
    Loop Back to GPT
```

### مثال تفاعلي

```
👤 المستخدم: "عايز بيتزا"

🤖 GPT يحلل الرسالة...
   → يقرر استدعاء: search_menu(query: "بيتزا")

🔧 Tool Result:
   [
     { name: "بيتزا مارجريتا", price: 80, provider: "سلطان" },
     { name: "بيتزا بيبروني", price: 95, provider: "سلطان" }
   ]

🤖 GPT يولد الرد:
   "لقيت كذا نوع بيتزا 🍕
    - بيتزا مارجريتا (80 ج.م) من سلطان
    - بيتزا بيبروني (95 ج.م) من سلطان

    تحب أضيفلك أيهم للسلة؟"
```

---

## 📡 API Reference

### POST /api/chat (Streaming)

#### Request Body

```typescript
interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  customer_id?: string
  city_id?: string
  governorate_id?: string
  customer_name?: string
  selected_provider_id?: string
  selected_provider_name?: string
  cart_provider_id?: string
  cart_items?: Array<{
    id: string
    name: string
    quantity: number
    price: number
  }>
  cart_total?: number
}
```

#### Response (Server-Sent Events)

```typescript
// Content streaming
event: content
data: { "chunk": "لقيت كذا نوع..." }

// Tool call notification
event: tool_call
data: { "tool": "search_menu", "args": { "query": "بيتزا" } }

// Final message
event: message
data: {
  "content": "...",
  "suggestions": ["🛒 أضف للسلة", "🔍 بحث تاني"],
  "quick_replies": [...],
  "products": [...]
}

// Done
event: done
data: {}
```

### PUT /api/chat (Non-Streaming)

نفس الـ Request Body لكن يرجع JSON مباشرة:

```json
{
  "content": "...",
  "suggestions": [...],
  "quick_replies": [...],
  "products": [...]
}
```

---

## 🎨 System Prompt

الـ Agent يتبع هذه القواعد:

1. **الرد بالعربي المصري** - كلمات زي "عايز"، "تمام"، "ده"
2. **استخدام الأدوات دائماً** - مايردش من دماغه
3. **ردود قصيرة ومفيدة** - العميل عايز الإجابة بسرعة
4. **مساعدة العميل يكمل الطلب** - اقتراح إضافة للسلة
5. **فهم الأخطاء الإملائية** - "بيتذا" = "بيتزا"
6. **احترام سياق السلة** - لو فيها أصناف من تاجر، يركز عليه
7. **التحويل للدعم عند الحاجة** - مشاكل معقدة → موظف بشري
8. **فهم أقسام إنجزنا الأربعة** - مش مطاعم بس! (سوبر ماركت، خضار، بن)
9. **استخدام "المنتجات" بدلاً من "المنيو"** - مناسب لكل أنواع التجار

---

## 🔐 الأمان

- **أدوات تحتاج تسجيل دخول:**
  - `get_customer_addresses`
  - `get_favorites`
  - `get_order_history`
  - `cancel_order`
  - `create_support_ticket`

- **Lazy OpenAI Client** - لا يتم تهيئة الـ client إلا عند الحاجة
- **Max Iterations** - الـ Agent loop محدود بـ 5 iterations
- **Error Handling** - كل أخطاء الأدوات يتم معالجتها

---

## 📊 Logging

```bash
# Tool calls
[Tool Result] search_menu: { success: true, data: [...] }

# Errors
[Agent Error]: OpenAI API error...
[Chat API Error]: ...
```

---

## 🚀 إضافة أداة جديدة

### 1. تعريف الأداة في `agentTools.ts`

```typescript
// في AGENT_TOOLS array
{
  name: 'my_new_tool',
  description: 'وصف الأداة بالعربي',
  parameters: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'وصف المعامل'
      }
    },
    required: ['param1']
  }
}
```

### 2. تنفيذ الأداة في `executeAgentTool`

```typescript
case 'my_new_tool': {
  const { param1 } = params as { param1: string }

  const { data, error } = await supabase
    .from('table')
    .select('...')
    .eq('field', param1)

  if (error) throw error
  return { success: true, data }
}
```

---

## 📁 الملفات المحذوفة (v1 → v2)

تم حذف هذه الملفات لأنها أصبحت غير مستخدمة:

- `src/lib/ai/tools.ts` - أدوات قديمة
- `src/lib/ai/systemPrompt.ts` - prompt قديم
- `src/lib/ai/responsePersonality.ts` - قوالب ردود
- `src/lib/ai/intentClassifier.ts` - تصنيف النوايا
- `src/lib/ai/intentHandlers.ts` - معالجات النوايا
- `src/lib/ai/normalizeArabic.ts` - تطبيع عربي
- `src/lib/ai/prompts.ts` - prompts إضافية
- `src/lib/ai/menu-analyzer.ts` - محلل المنيو
- `src/lib/ai/comparison-engine.ts` - محرك المقارنة
- `src/lib/ai/context-builder.ts` - بناء السياق
- `src/lib/ai/index.ts` - re-exports

---

## ✅ الميزات الجديدة في v2.0+

- **AI Agent Architecture** - الـ AI يختار الأدوات بنفسه
- **Streaming Responses** - الردود تظهر أثناء الكتابة
- **24 أداة متكاملة** - تغطي كل احتياجات العميل (22 + 2 جديدة)
- **Context-Aware** - يفهم سياق السلة والتاجر
- **Provider-Specific Welcome** - رسالة ترحيب مخصصة لكل تاجر
- **Error Recovery** - معالجة أخطاء ذكية
- **Cleaner Codebase** - كود أنظف وأسهل للصيانة
- **دعم 4 أقسام** - مطاعم، سوبر ماركت، خضار، بن (جديد v2.4)
- **Quick Replies ذكية** - تتغير حسب السياق (جديد v2.4)

---

## 🎯 رسالة الترحيب و Quick Replies (v2.4)

### رسالة الترحيب

عند فتح الشات، تظهر رسالة ترحيب مع 4 أزرار للأقسام الرئيسية:

```typescript
// src/lib/store/chat.ts
quickReplies: [
  { title: '🍽️ مطاعم', payload: 'category:restaurant_cafe' },
  { title: '🛒 سوبر ماركت', payload: 'category:grocery' },
  { title: '🥬 خضروات وفواكه', payload: 'category:vegetables_fruits' },
  { title: '☕ البن والحلويات', payload: 'category:coffee_sweets' },
]
```

### Quick Replies الذكية

الأزرار تتغير حسب السياق:

| السياق | الأزرار المعروضة |
|--------|-----------------|
| **بعد اختيار تاجر** | 🛒 شوف المنتجات، 🔍 بحث تاني، 🔥 العروض |
| **بعد بحث بدون تاجر** | 🛒 شوف المنتجات، عندي مكان معين، 🔍 بحث تاني |
| **بدون سياق** | أزرار الأقسام الأربعة |

### معالجة payload الأقسام

```typescript
// src/hooks/useAIChat.ts
const handleQuickReply = (payload: string) => {
  if (payload.startsWith('category:')) {
    const categoryId = payload.replace('category:', '')
    // يرسل رسالة للـ agent مع السياق
  }
}
```

### ملاحظات مهمة

1. **استبدال "المنيو" بـ "المنتجات"** - كلمة "منيو" مناسبة للمطاعم فقط، بينما "منتجات" تناسب الجميع
2. **إزالة "تمام، اطلب"** - خطوة غير ضرورية، المستخدم يقدر يطلب مباشرة
3. **عندي مكان معين** - يظهر فقط لما مفيش تاجر محدد

---

## 🧠 نظام Embeddings التلقائي (جديد v2.3)

### الهدف

توليد embeddings تلقائياً لعناصر المنيو لتحسين البحث الدلالي (Semantic Search).

### المكونات

| المكون | الملف | الوظيفة |
|--------|-------|---------|
| Edge Function | `supabase/functions/generate-embedding/` | توليد الـ embedding باستخدام OpenAI |
| Migration | `20251215000002_embedding_auto_generation.sql` | Triggers + Queue + pg_cron |
| API Route | `src/app/api/embeddings/route.ts` | إحصائيات + تشغيل يدوي |
| Webhook | `src/app/api/webhooks/menu-item/route.ts` | معالجة INSERT/UPDATE |

### كيف يعمل؟

```
┌─────────────────────────────────────────────────────────────┐
│              Menu Item INSERT/UPDATE                         │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│           Database Trigger → embedding_queue                  │
└──────────────────────────┬───────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│        pg_cron (كل 5 دقائق) أو Webhook                        │
│              ↓                                                │
│     Edge Function: generate-embedding                         │
│              ↓                                                │
│     OpenAI text-embedding-3-small (1536 dims)                │
│              ↓                                                │
│     Store in menu_items.embedding                            │
└──────────────────────────────────────────────────────────────┘
```

### Embedding Text Format

يتم بناء النص للـ embedding من:
- اسم المنتج (عربي + إنجليزي)
- الوصف (عربي + إنجليزي)
- اسم القسم
- اسم التاجر
- السعر

```
"بيتزا مارجريتا | Pizza Margherita | عجينة طازجة مع صوص طماطم | قسم: بيتزا | من: سلطان بيتزا | السعر: 85 جنيه"
```

### مراقبة التغطية

```sql
-- استدعاء الدالة للإحصائيات
SELECT * FROM get_embedding_stats();

-- النتيجة
-- total_items: 150
-- items_with_embedding: 145
-- items_without_embedding: 5
-- coverage_percentage: 96.67
-- pending_in_queue: 3
-- failed_in_queue: 0
```

### إعادة توليد Embedding لمنتج معين

```sql
SELECT queue_missing_embeddings(100); -- يضيف 100 منتج للـ queue
```

---

## 📋 سجل التحديثات

### v2.4.1 (17 ديسمبر 2025) - تحسين السياق والتمييز
- ✅ **قاعدة أولوية السلة** - البحث يكون في نفس التاجر أولاً لو السلة فيها حاجات
- ✅ **استثناء المرونة** - لو العميل طلب صراحةً التغيير، روح معاه فوراً
- ✅ **تمييز الكلمات المتشابهة** - "فته" ≠ "كفته" (جدول `confusable_terms`)
- ✅ **تحسين دالة expand_query_with_synonyms** - استخدام word boundaries بدلاً من substring matching
- ✅ **تحديث simple_search_menu** - threshold أعلى للكلمات القصيرة

### v2.4 (17 ديسمبر 2025) - دعم الأقسام المتعددة
- ✅ **دعم 4 أقسام رئيسية** - مطاعم، سوبر ماركت، خضار، بن والحلويات
- ✅ **أداة `get_business_categories`** - عرض الأقسام الأربعة
- ✅ **أداة `get_providers_by_category`** - عرض التجار حسب القسم
- ✅ **تحديث رسالة الترحيب** - 4 أزرار للأقسام الرئيسية
- ✅ **استبدال "المنيو" بـ "المنتجات"** - مناسب لكل أنواع التجار (مش مطاعم بس)
- ✅ **إزالة زر "تمام، اطلب"** - خطوة غير ضرورية
- ✅ **تحسين provider_id fallback** - يستخدم `sessionMemory.pending_item.provider_id`
- ✅ **Quick Replies ذكية** - تتغير حسب السياق (تاجر محدد أو لا)

### v2.3 (16 ديسمبر 2025)
- ✅ إصلاح مشكلة عدم وصول Provider ID للـ Agent
- ✅ تحسين `get_provider_promotions` ليرجع المنتجات المخفضة
- ✅ إضافة جلب الـ variants inline في `search_menu`
- ✅ نظام Embeddings تلقائي جديد
- ✅ قواعد عمليات السلة المحسنة في System Prompt

### v2.2 (15 ديسمبر 2025)
- إعادة بناء كاملة باستخدام AI Agent Architecture

### v2.1 (13 ديسمبر 2025)
- إصلاح زر الأقسام
- تحسين Arabic Normalization

---

## 🎓 الدروس المستفادة والأخطاء الشائعة

### ❌ خطأ 1: UUID "undefined" String
**المشكلة:**
```
ERROR: invalid input syntax for type uuid: "undefined"
```

**السبب:**
الـ AI أحياناً يبعت `"undefined"` كـ string بدلاً من UUID صحيح، والـ check العادي `if (!id)` مش بيمسكه لأن `"undefined"` string مش falsy.

**الحل:**
```typescript
function isValidUUID(id: string | undefined | null): id is string {
  if (!id || id === 'undefined' || id === 'null') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// استخدمها في كل مكان بيستقبل UUID
const effectiveProviderId = getValidUUID(param_provider_id, context.providerId)
```

**الملف:** `src/lib/ai/agentTools.ts`

---

### ❌ خطأ 2: عدم عثور البحث على النتائج (Synonyms)
**المشكلة:**
- المستخدم يقول "عايز حلويات" ← مش بيلاقي فطيرة نوتيلا، شوكولاتة
- المستخدم يقول "عايز كفتة" ← بيلاقي 7 أنواع، بس لما يسأل عن التفاصيل بيلاقي 1 بس

**السبب:**
1. `search_menu` بيستخدم `simple_search_menu` مع synonym expansion
2. `get_menu_items` كان بيستخدم `ilike` عادي بدون synonyms

**الحل:**
1. إضافة synonyms للحلويات في `arabic_synonyms` table:
```sql
INSERT INTO arabic_synonyms (term, synonyms, category) VALUES
  ('حلويات', ARRAY['حلو', 'شوكولاتة', 'نوتيلا', 'لوتس', 'قشطة', 'عسل', 'سكر'], 'food'),
  ('حلو', ARRAY['حلويات', 'شوكولاتة', 'نوتيلا', 'قشطة'], 'food')
ON CONFLICT (term) DO UPDATE SET synonyms = EXCLUDED.synonyms;
```

2. تحديث `get_menu_items` ليستخدم `simple_search_menu` RPC عند وجود search_query

**الملفات:**
- `supabase/migrations/20251217000002_add_dessert_synonyms.sql`
- `src/lib/ai/agentTools.ts` (get_menu_items)

---

### ❌ خطأ 3: normalize_arabic Function لا تعمل
**المشكلة:**
```
ERROR: function normalize_arabic(text) does not exist
```

**السبب:**
الـ migration file موجود بس الـ function مش مُنفَّذة على Supabase

**الحل:**
تشغيل الـ SQL يدوياً على Supabase:
```sql
CREATE OR REPLACE FUNCTION normalize_arabic(text_input text)
RETURNS text AS $$
BEGIN
  RETURN translate(
    text_input,
    'ةىأإآؤئ',
    'هياااوي'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**الدرس:** دايماً تأكد إن الـ migrations اتنفذت بشكل صحيح على Supabase

---

### ❌ خطأ 4: Column Name خاطئ (provider_category_id vs category_id)
**المشكلة:**
```
ERROR: column mi.provider_category_id does not exist
```

**السبب:**
الـ column الصحيح في `menu_items` هو `category_id` مش `provider_category_id`

**الحل:**
تحديث الـ SQL functions:
```sql
-- خطأ
LEFT JOIN provider_categories pc ON mi.provider_category_id = pc.id

-- صح
LEFT JOIN provider_categories pc ON mi.category_id = pc.id
```

**الملفات:** `simple_search_menu`, `hybrid_search_menu` SQL functions

---

### ❌ خطأ 5: AI لا يتذكر الـ Variant IDs (Tool-Context Disconnect)
**المشكلة:**
- المستخدم يقول "عايز كفتة" ← AI يعرض الـ variants (ربع كيلو، نص كيلو)
- المستخدم يقول "ضيف ربعين" ← AI بيدور تاني بدل ما يستخدم الـ IDs

**السبب:**
نتائج الـ Tool Calls مش بترجع في conversation history للـ request التالي

**الحل:**
إنشاء Session Memory system:

1. **agentPrompt.ts** - إضافة `sessionMemory` للـ context:
```typescript
sessionMemory?: {
  pending_item?: {
    id: string
    name_ar: string
    provider_id: string
    variants?: Array<{ id: string; name_ar: string; price: number }>
  }
}
```

2. **agentHandler.ts** - حفظ المنتج المعلق من نتائج البحث:
```typescript
response.sessionMemory = {
  pending_item: {
    id: firstItem.id,
    name_ar: firstItem.name_ar,
    variants: firstItem.variants
  }
}
```

3. **route.ts** - تمرير الـ memory من/إلى Frontend:
```typescript
sessionMemory: body.memory as AgentContext['sessionMemory']
// و
memory: response?.sessionMemory
```

4. **agentPrompt.ts** - عرض المعلومات في System Prompt:
```typescript
${context.sessionMemory?.pending_item ? `
🔴 منتج معلق - استخدم الـ IDs دي!
📦 ${context.sessionMemory.pending_item.name_ar}
   item_id: "${context.sessionMemory.pending_item.id}"
` : ''}
```

**الملفات:**
- `src/lib/ai/agentPrompt.ts`
- `src/lib/ai/agentHandler.ts`
- `src/app/api/chat/route.ts`
- `src/hooks/useAIChat.ts`
- `src/lib/store/chat.ts`

---

### ✅ تحسين: قاعدة أولوية السلة (v2.4.1)

**المشكلة:**
- العميل بحث عن "فتة" وأضافها للسلة من مطعم الصفا
- العميل قال "عايز حلو"
- الـ AI راح على قسم الحلويات بدل ما يدور في نفس المطعم!

**الحل:**
إضافة قاعدة ذهبية في System Prompt:

```
🔴🔴🔴 قاعدة ذهبية: السلة تأخذ الأولوية دايماً! 🔴🔴🔴
لو السلة فيها حاجات من تاجر معين، أي بحث جديد يكون في نفس التاجر أولاً!

مثال:
- السلة فيها "3 فتة" من مطعم الصفا
- العميل قال "عايز حلو"
✅ الصح: search_menu(query: "حلويات", provider_id: "[ID مطعم الصفا من السلة]")
❌ غلط: get_providers_by_category("coffee_sweets") ← ده يتجاهل السلة!

⚡ استثناء: لو العميل طلب صراحةً التغيير، روح معاه فوراً - المرونة مهمة!
```

**الملف:** `src/lib/ai/agentPrompt.ts`

---

### ✅ تحسين: تمييز الكلمات المتشابهة (v2.4.1)

**المشكلة:**
- العميل قال "عايز فتة"
- الـ AI جاب كفتة كمان! (لأن "فته" substring من "كفته")

**السبب:**
دالة `expand_query_with_synonyms()` كانت تستخدم `ILIKE '%' || p_query || '%'` فـ "فته" ماتشت "كفته".

**الحل:**
1. إنشاء جدول `confusable_terms` للكلمات المتشابهة لفظياً لكن مختلفة المعنى
2. تحديث `expand_query_with_synonyms()` ليستخدم word boundaries
3. إضافة قاعدة صريحة في System Prompt

```sql
-- جدول الكلمات المتشابهة
CREATE TABLE confusable_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term1 text NOT NULL,
  term2 text NOT NULL,
  UNIQUE(term1, term2)
);

INSERT INTO confusable_terms (term1, term2) VALUES
  ('فتة', 'كفتة'), ('فته', 'كفته'),
  ('كفتة', 'فتة'), ('كفته', 'فته');
```

```
🚨 كلمات متشابهة لفظياً لكن مختلفة تماماً:
• "فتة/فته" ≠ "كفتة/كفته" - دول أكلتين مختلفين خالص!
  - فتة = عيش محمص + رز + لحمة + صوص طماطم
  - كفتة = لحمة مفرومة مشكلة (مشوية أو مقلية)
• لما العميل يقول "فته" ابحث عن "فتة" بس، ماتجيبش كفتة!
```

**الملفات:**
- `src/lib/ai/agentPrompt.ts`
- `supabase/migrations/20251217000003_fix_fatta_kofta_confusion.sql`

---

### ✅ تحسين: provider_id Fallback Chain (v2.4)

**المشكلة:**
زر "ضيف للسلة" مش بيشتغل لأن الـ provider_id مش بيوصل للـ `add_to_cart` tool.

**الحل:**
توسيع ToolContext لتشمل sessionMemory وتحديث fallback chain:

```typescript
// Extended ToolContext in agentTools.ts
sessionMemory?: {
  pending_item?: {
    id: string
    name_ar: string
    price: number
    provider_id: string  // ← الجديد
    provider_name_ar?: string
    has_variants?: boolean
    variants?: Array<{ id: string; name_ar: string; price: number }>
  }
  // ...
}

// provider_id fallback chain in add_to_cart
const provider_id = param_provider_id                           // 1. Parameter مباشر
  || context.sessionMemory?.pending_item?.provider_id           // 2. من المنتج المعلق
  || context.cartProviderId                                     // 3. من السلة
  || context.providerId                                         // 4. من السياق العام
```

**النتيجة:**
زر "ضيف للسلة" يشتغل حتى لو مفيش provider محدد صراحةً.

---

### ❌ خطأ 6: عدد الأنواع غير متطابق (7 vs 1)
**المشكلة:**
- البحث الأول: "سلطان بيتزا فيه 7 أنواع كفتة"
- البحث الثاني داخل المطعم: "لقيت كفتة مشوية بس"

**السبب:**
- البحث الأول بيستخدم synonym expansion (كفتة + كباب = 7)
- البحث الثاني (`get_menu_items` مع search_query) كان بيستخدم `ilike` بدون synonyms

**الحل:**
تحديث `get_menu_items` ليستخدم `simple_search_menu` RPC:
```typescript
if (search_query) {
  const searchResult = await supabase.rpc('simple_search_menu', {
    p_query: search_query,
    p_provider_id: effectiveProviderId,
    p_limit: limit
  })
  // ...
}
```

---

### ❌ خطأ 7: ON CONFLICT بدون Unique Constraint
**المشكلة:**
```
ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**السبب:**
محاولة استخدام `ON CONFLICT (term)` على table بدون unique constraint على `term`

**الحل:**
```sql
-- أضف الـ constraint أولاً
ALTER TABLE arabic_synonyms ADD CONSTRAINT arabic_synonyms_term_key UNIQUE (term);

-- ثم استخدم ON CONFLICT
INSERT INTO arabic_synonyms (term, synonyms, category) VALUES (...)
ON CONFLICT (term) DO UPDATE SET synonyms = EXCLUDED.synonyms;
```

---

## 📋 قائمة فحص قبل الـ Deployment

```markdown
### Database
- [ ] تأكد من وجود `normalize_arabic` function
- [ ] تأكد من وجود `simple_search_menu` function
- [ ] تأكد من وجود `arabic_synonyms` table مع unique constraint
- [ ] تأكد من إضافة الـ synonyms الشائعة (حلويات، كفتة، فراخ...)
- [ ] تأكد من استخدام `category_id` (مش provider_category_id)

### Code
- [ ] استخدم `isValidUUID()` لكل UUID parameter
- [ ] استخدم `getValidUUID()` للـ fallback chain
- [ ] تأكد من تمرير `sessionMemory` في request/response
- [ ] تأكد من عرض pending_item في System Prompt

### Testing
- [ ] اختبر: "عايز حلويات" → يلاقي فطير حلو
- [ ] اختبر: "عايز كفتة" ثم "ضيف ربعين" → يضيف بدون بحث
- [ ] اختبر: UUID undefined → يرجع رسالة خطأ مناسبة
```

---

## 🔧 أوامر SQL للتشخيص

```sql
-- التحقق من وجود الـ functions
SELECT proname FROM pg_proc WHERE proname IN ('normalize_arabic', 'simple_search_menu', 'hybrid_search_menu');

-- التحقق من الـ synonyms
SELECT * FROM arabic_synonyms WHERE term IN ('كفتة', 'حلويات', 'فراخ');

-- اختبار normalize_arabic
SELECT normalize_arabic('كفته'), normalize_arabic('كفتة');

-- اختبار البحث
SELECT * FROM simple_search_menu('كفتة', NULL, NULL, 10);

-- التحقق من أعمدة menu_items
SELECT column_name FROM information_schema.columns WHERE table_name = 'menu_items';
```

---

*آخر تحديث: 17 ديسمبر 2025 - v2.4.1*
