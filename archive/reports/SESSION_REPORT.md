# تقرير جلسة إصلاح AI Agent - إنجزنا

**التاريخ:** 16 ديسمبر 2025
**الفرع:** `claude/fix-ai-agent-chat-RFMvI`
**الموديل الحالي:** GPT-4o-mini
**الموديل المقترح:** Claude 3.5 Haiku

---

## ملخص الجلسة

تم إصلاح عدة مشاكل في الـ AI Agent (أحمد) المسؤول عن أخذ الطلبات في تطبيق إنجزنا.

---

## المشاكل التي تم إصلاحها

### 1. كتابة Function Calls كـ Text

**المشكلة:** الـ AI كان يكتب الـ function calls في الرد بدلاً من تنفيذها:

```
→ addtocart(itemid: "item-1", itemname: "لبن جهينة كامل"...)
```

**الحل:**

- إزالة الأمثلة التي تعرض syntax الـ function calls
- إضافة قاعدة صريحة تمنع كتابة الـ function calls كـ text
- **Commit:** `2dc6747`

---

### 2. خلط المنتجات المتشابهة (Product Context)

**المشكلة:** الـ AI يخلط بين منتجات لها نفس الاسم:

- "تونة الدوحة" (معلبات - 42 ج.م) ↔ "بيتزا تونة" (145 ج.م)

**الحل:**

- إضافة قاعدة Product Context Tracking
- استخدام الاسم الكامل للمنتج
- استخدام الـ ID من البحث الأصلي
- **Commit:** `1eb7b02`

---

### 3. تجاهل الكميات في الرسالة

**المشكلة:** العميل يقول "٢ تونه ١ فول ٣ زيت" والـ AI يسأل "عايز كام؟"

**الحل:**

- إضافة قاعدة لقراءة الكميات من أول رسالة
- الأرقام في الرسالة = كميات
- **Commit:** `e0f7714`

---

### 4. السؤال عن أحجام لمنتجات بدون variants

**المشكلة:** الـ AI يسأل عن الحجم للمعلبات (تونة، فول، زيت) رغم أنها مالهاش أحجام

**الحل:**

- إضافة قاعدة: لو `has_variants = false` → أضف مباشرة
- **Commit:** `e0f7714`

---

### 5. اختراع أسماء مطاعم (Hallucination)

**المشكلة:** ظهور اسم مطعم "عمرو مازن" من العدم

**الحل:**

- إضافة قاعدة تمنع اختراع أسماء مطاعم
- استخدام `provider_name` من نتائج البحث فقط
- **Commit:** `e0f7714`

---

## الملفات المعدلة

| الملف                                                          | التعديلات                             |
| -------------------------------------------------------------- | ------------------------------------- |
| `src/lib/ai/agentPrompt.ts`                                    | إضافة قواعد جديدة للـ prompt          |
| `src/lib/ai/agentTools.ts`                                     | إصلاح variant validation و promotions |
| `supabase/migrations/20251216000003_improved_fuzzy_search.sql` | تحسين البحث العربي                    |

---

## Commits هذه الجلسة

```
e0f7714 fix: Add rules to prevent quantity, variant, and hallucination issues
2dc6747 fix: Prevent AI from writing function calls as text in responses
1eb7b02 fix: Add product context tracking to prevent confusion between similar products
291aa71 fix: Improve fuzzy search, promotions, and cart validation
ac6340a fix: Resolve variant cart failures and promotions not showing
```

---

## خطة ما بعد البريك: تجربة Claude 3.5 Haiku

### الهدف

استبدال GPT-4o-mini بـ Claude 3.5 Haiku وتقييم الفرق في الأداء

### خطوات التنفيذ

#### 1. إعداد Anthropic SDK

```bash
npm install @anthropic-ai/sdk
```

#### 2. إضافة API Key

```env
ANTHROPIC_API_KEY=sk-ant-...
```

#### 3. تعديل ملف الـ Chat API

- **الملف:** `src/app/api/chat/route.ts`
- إضافة Claude client
- تحويل الـ messages format
- تحويل الـ tools format

#### 4. معايير التقييم

| المعيار             | الوصف                        |
| ------------------- | ---------------------------- |
| **Tool Calling**    | هل ينفذ الـ tools صح؟        |
| **اتباع التعليمات** | هل يلتزم بالـ system prompt؟ |
| **فهم العربي**      | هل يفهم العامية المصرية؟     |
| **Hallucination**   | هل يخترع معلومات؟            |
| **السرعة**          | الـ latency                  |
| **التكلفة**         | السعر لكل request            |

#### 5. سيناريوهات الاختبار

1. طلب منتج واحد
2. طلب عدة منتجات بكميات محددة
3. طلب منتج له variants
4. السؤال عن العروض
5. تعديل السلة
6. إلغاء منتج

### الملفات المطلوب تعديلها

```
src/app/api/chat/route.ts          # Main chat API
src/lib/ai/agentTools.ts           # Tools definitions (format conversion)
src/lib/ai/agentPrompt.ts          # System prompt (no changes needed)
.env.local                          # Add ANTHROPIC_API_KEY
```

### مقارنة التكلفة (تقديرية)

| Model            | Input (1M tokens) | Output (1M tokens) |
| ---------------- | ----------------- | ------------------ |
| GPT-4o-mini      | $0.15             | $0.60              |
| Claude 3.5 Haiku | $0.25             | $1.25              |

---

## ملاحظات مهمة

1. **الـ Migration:** يجب تطبيق `20251216000003_improved_fuzzy_search.sql` على قاعدة البيانات
2. **الـ Prompt:** نفس الـ prompt هيشتغل مع Claude بدون تعديل
3. **الـ Tools:** محتاج تحويل من OpenAI format لـ Anthropic format

---

## للاستمرار في الجلسة القادمة

```
الفرع: claude/fix-ai-agent-chat-RFMvI
المهمة: تجربة Claude 3.5 Haiku بدل GPT-4o-mini
```

**الخطوة الأولى:**

```bash
npm install @anthropic-ai/sdk
```

ثم تعديل `src/app/api/chat/route.ts` لإضافة Claude integration.
