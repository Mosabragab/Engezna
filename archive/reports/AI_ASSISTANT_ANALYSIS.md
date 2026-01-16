# AI Smart Assistant - Analysis & Improvement Plan

**Date:** 2025-12-16
**Version:** 2.3
**Status:** Major Fixes Applied - Embedding & Data Access Fixed

> 📋 **خطة التحسين الشاملة:** راجع [AI_AGENT_IMPROVEMENT_PLAN.md](./AI_AGENT_IMPROVEMENT_PLAN.md) للخطة التفصيلية

---

## Overview

This document analyzes the AI Smart Assistant chat flow and identifies issues for improvement.

---

## Session Analysis (December 16, 2025)

### Issues Fixed Today

#### 1. AI Agent Data Access Issues ✅ FIXED

**Problem:**
The AI Agent wasn't receiving the correct provider ID when operating on provider pages, causing:

- Empty search results
- "محتاج أعرف المطعم" responses when provider context was available
- Promotions tool returning empty results

**Root Cause:**
The `useAIChat.ts` hook wasn't passing the `providerContext.id` as a fallback when no `selectedProviderId` was available.

**Fix Applied:**

```typescript
// useAIChat.ts - Now passes effectiveProviderId
const effectiveProviderId = selectedProviderId || providerContext?.id;
```

#### 2. Promotions Tool Showing Empty Results ✅ FIXED

**Problem:**
`get_provider_promotions` was only querying the `promotions` table, missing products that have discounts (where `original_price > price`).

**Fix Applied:**
The tool now returns BOTH:

- Promotional campaigns from `promotions` table
- Discounted products from `menu_items` where `original_price > price`

```typescript
// Returns both campaigns AND discounted products
{
  promotions: [...],
  discounted_products: [
    {
      id, name_ar, price, original_price, image_url, has_variants,
      discount_percentage: Math.round(((original_price - price) / original_price) * 100)
    }
  ]
}
```

#### 3. Variant Details Missing in Search ✅ FIXED

**Problem:**
When `search_menu` found items with `has_variants=true`, it wasn't fetching the actual variants, so the AI couldn't show size options.

**Fix Applied:**
Added inline variant fetching in `search_menu`:

```typescript
// For items with has_variants=true, fetch variants inline
const fetchVariantsForItems = async (items) => {
  const itemsWithVariants = items.filter((i) => i.has_variants);
  if (itemsWithVariants.length > 0) {
    const { data: variants } = await supabase
      .from('menu_item_variants')
      .select('id, menu_item_id, name_ar, price')
      .in(
        'menu_item_id',
        itemsWithVariants.map((i) => i.id)
      );
    // Merge variants into items
  }
  return items;
};
```

#### 4. Automatic Embedding Generation ✅ ADDED

**New Feature:**
Added automatic embedding generation for menu items using:

- Supabase Edge Function (`generate-embedding`)
- Queue-based processing with `embedding_queue` table
- Database triggers on INSERT/UPDATE
- pg_cron job for catch-up processing (every 5 minutes)

**Files Added/Modified:**

- `supabase/functions/generate-embedding/index.ts`
- `supabase/migrations/20251215000002_embedding_auto_generation.sql`
- `src/app/api/embeddings/route.ts`
- `src/app/api/webhooks/menu-item/route.ts`

### Architecture Improvements

| Component   | Before                | After                           |
| ----------- | --------------------- | ------------------------------- |
| Provider ID | Manual selection only | Fallback to providerContext     |
| Promotions  | promotions table only | campaigns + discounted_products |
| Variants    | Separate API call     | Inline with search results      |
| Embeddings  | Manual generation     | Auto on INSERT/UPDATE           |

### Files Modified

- `src/hooks/useAIChat.ts` - Added effectiveProviderId fallback
- `src/lib/ai/agentTools.ts` - Enhanced promotions + variant handling
- `src/lib/ai/agentPrompt.ts` - Added cart operation rules
- `supabase/functions/generate-embedding/index.ts` - New Edge Function
- `supabase/migrations/20251215000002_embedding_auto_generation.sql` - New migration

### Next Steps (Tomorrow)

1. **Test AI Agent Performance** - Verify all fixes work in production
2. **Monitor Embedding Coverage** - Use `get_embedding_stats()` to track progress
3. **Semantic Search Integration** - Use embeddings for better search results
4. **Performance Optimization** - Review API response times

---

## Session Analysis (December 13, 2025)

### Test Scenario

User ordering from "سلطان بيتزا" - multiple items added to cart.

### What Worked Well

| Feature                         | Status | Example                                         |
| ------------------------------- | ------ | ----------------------------------------------- |
| Smart Intent Extraction         | ✅     | "اريد كفته", "ابغي حواوشي" understood correctly |
| Provider Context Search         | ✅     | "عندهم حواوشي؟" searched in current provider    |
| Cart Confirmation with Provider | ✅     | "ضفت للسلة من سلطان بيتزا"                      |
| Quick Reply with Provider Name  | ✅     | "➕ أضف من سلطان بيتزا"                         |
| Variant Selection               | ✅     | حواوشي لحمة → عادي/سوبر                         |
| Quantity Selection              | ✅     | Buttons + Arabic text parsing                   |
| Order Confirmation Step         | ✅     | Shows total before adding                       |

### Issues Found

#### Issue 1: Categories Button Shown When Shopping from Provider (HIGH PRIORITY)

**Problem:**
After user adds items to cart from a specific provider, the quick replies still show "🏠 الأقسام" (Categories).

**Current Behavior:**

```
تمام! ✅ ضفت 2x فراخ باربكيو للسلة من سلطان بيتزا

🛒 اذهب للسلة
➕ أضف من سلطان بيتزا
🏠 الأقسام  ← PROBLEM: This is disruptive!
```

**Expected Behavior:**
When user is actively shopping from one provider, don't offer navigation to other categories.

**Suggested Quick Replies:**

```
🛒 اذهب للسلة
➕ أضف من سلطان بيتزا
📋 شوف المنيو الكامل
```

**Files to Modify:**

- `src/app/api/chat/route.ts` - `handleConfirmAdd()` function

---

#### Issue 2: Arabic Normalization - ه vs ة (MEDIUM PRIORITY)

**Problem:**
Search doesn't normalize Arabic ه (haa) to ة (taa marbuta).

**Failed Searches:**
| Query | Result | Expected |
|-------|--------|----------|
| "عايز سلطه" | مش لاقي | Should find "سلطة خضراء" |
| "عنده طحينه؟" | مش لاقي | Should find "طحينة" |

**Successful Searches (same items):**
| Query | Result |
|-------|--------|
| "ولا سلطة؟" | Found سلطة خضراء, سلطة طحينة |
| "ولا طحينة؟" | Found طحينة, سلطة طحينة |

**Root Cause:**
The `normalizeArabic()` function doesn't normalize ه → ة.

**Files to Modify:**

- `src/lib/ai/normalizeArabic.ts` - Add ه ↔ ة normalization

---

#### Issue 3: Inconsistent "Not Found" Then "Found" (MEDIUM PRIORITY)

**Problem:**
First search says "not found", then similar search finds the item.

**Example:**

1. "عنده طحينه؟" → "مش لاقي طحينه دلوقتي"
2. "ولا طحينة؟" → Found طحينة!

**Root Cause:**

- Combination of normalization issue (Issue 2)
- Smart intent extraction might not be using normalized search

---

## Architecture Overview

### Current Flow

```
User Message
    ↓
1. Direct Payload Handlers (category:, provider:, item:, qty:, etc.)
    ↓
2. Search Pattern Handlers (عايز X, في X, كمان X, etc.)
    ↓
3. Smart Intent Extraction (GPT extracts product name)
    ↓
4. GPT Fallback (full conversation processing)
```

### Key Components

| Component            | File                 | Purpose                           |
| -------------------- | -------------------- | --------------------------------- |
| Direct Handlers      | `route.ts`           | Handle button clicks without GPT  |
| Search Patterns      | `route.ts`           | Regex patterns for Arabic queries |
| Smart Extraction     | `route.ts`           | GPT extracts intent + product     |
| Arabic Normalization | `normalizeArabic.ts` | Normalize Arabic text for search  |
| Chat Memory          | `chat.ts`            | Persist conversation state        |
| Cart Integration     | `useAIChat.ts`       | Handle cart actions               |

---

## Improvement Plan

### Phase 1: Quick Fixes ✅ COMPLETED

#### 1.1 Fix Categories Button ✅

- [x] Updated `handleConfirmAdd()` to show "📋 منيو [provider]" instead of "🏠 الأقسام"
- [x] Updated `handleClearCartAndAdd()` to show "📋 منيو [provider]" instead of "🏠 الأقسام"

**Changes Made:**

- `src/app/api/chat/route.ts` lines 513, 567: Replaced "🏠 الأقسام" with "📋 منيو [provider]"

#### 1.2 Fix Arabic Normalization ✅

- [x] Improved `performDirectSearch()` to ALWAYS use normalization-based filtering first
- [x] Previous code tried `ilike` first, then fallback to normalization only if 0 results
- [x] New code fetches more items and applies `filterByNormalizedArabic()` first

**Root Cause Identified:**
The `normalizeArabic()` function already converts ة → ه correctly. The issue was that
`performDirectSearch()` was using SQL `ilike` first, which doesn't understand Arabic normalization.

**Changes Made:**

- `src/app/api/chat/route.ts` `performDirectSearch()`: Now always applies normalization first
- Added logging for normalization debugging

### Phase 2: Enhancements

#### 2.1 Provider-Locked Mode

- When user has items in cart, keep them focused on current provider
- Show provider name in header of chat
- Require explicit action to switch providers

#### 2.2 Search Improvements

- Pre-normalize search query before matching patterns
- Use fuzzy matching for Arabic text
- Log failed searches for analysis

#### 2.3 UX Improvements

- Show cart summary in chat header
- Quick add buttons for previously ordered items
- "Order again" feature

---

## Memory Structure

```typescript
interface ChatMemory {
  pending_item?: PendingItem; // Item being ordered
  pending_variant?: PendingVariant; // Selected variant
  pending_quantity?: number; // Selected quantity
  awaiting_quantity?: boolean; // Waiting for quantity input
  awaiting_confirmation?: boolean; // Waiting for cart confirmation
  awaiting_cart_clear?: boolean; // Waiting for cart clear confirmation
  current_provider?: CurrentProvider; // PERSISTS after cart add
}

interface CurrentProvider {
  id: string;
  name_ar: string;
}
```

---

## Testing Checklist

### Search Patterns to Test

- [ ] "عايز X" / "عايزين X"
- [ ] "ابغي X" / "ابغى X"
- [ ] "محتاج X"
- [ ] "جيبلي X"
- [ ] "ممكن X"
- [ ] "في X؟"
- [ ] "فيه X؟"
- [ ] "الاقي X فين"
- [ ] "الاقي فين X"
- [ ] "كمان X"
- [ ] "عنده X؟"
- [ ] "عندهم X؟"
- [ ] "ولا X؟"

### Arabic Normalization to Test

- [ ] سلطه ↔ سلطة
- [ ] طحينه ↔ طحينة
- [ ] كفته ↔ كفتة
- [ ] شاورمه ↔ شاورما
- [ ] بيتزا ↔ بيتزه

### Cart Flow to Test

- [ ] Add from provider A
- [ ] Try to add from provider B → Should warn
- [ ] Clear cart and add → Should work
- [ ] "كمان X" after add → Should search in current provider

---

## Commits Related to This Work

```
0a03ecb feat: Add smart intent extraction and cart conflict detection
92e245b feat: Add provider context preservation and smart follow-up ordering
28d7cb9 fix: Add comprehensive search handlers and promotions direct handler
2653b59 fix: Improve search consistency and add product-level discounts
aed0c3c feat: Add order confirmation step before adding to cart
```

---

## Next Steps

1. ~~**Fix Categories button**~~ ✅ DONE
2. ~~**Fix Arabic ه/ة normalization**~~ ✅ DONE
3. **Test all search patterns** - Ensure consistency with new normalization
4. **Monitor logs** - Track failed searches for improvement
5. **Phase 2 Enhancements** - Provider-locked mode, search improvements, UX

---

_Last Updated: 2025-12-13_
