# Custom Order System - Implementation Plan v2.0
## نظام الطلب المفتوح - خطة التنفيذ النهائية

**Version:** 2.0
**Date:** January 2026
**Status:** In Progress
**Last Updated:** 2026-01-09

---

## Table of Contents
1. [Overview](#1-overview)
2. [UX Architecture](#2-ux-architecture)
3. [Database Schema](#3-database-schema)
4. [Order State Machine](#4-order-state-machine)
5. [Triple Broadcast System](#5-triple-broadcast-system)
6. [Frontend Components](#6-frontend-components)
7. [Provider Dashboard](#7-provider-dashboard)
8. [Offline & Error Handling](#8-offline--error-handling)
9. [Financial Integration](#9-financial-integration)
10. [Implementation Checklist](#10-implementation-checklist)
11. [API Endpoints](#11-api-endpoints)
12. [Notifications](#12-notifications)

---

## 1. Overview

### 1.1 Purpose
Add a "Custom Order" (الطلب المفتوح) system for:
- **Supermarkets** (سوبر ماركت) - نوتة السوبر ماركت
- **Pharmacies** (صيدليات) - روشتة الصيدلية
- **Vegetables & Fruits** (خضروات وفواكه)

While maintaining the existing **Standard Menu Flow** for restaurants with **ZERO impact** on existing code.

### 1.2 Key Features
| Feature | Description |
|---------|-------------|
| Multi-Input | Text, Voice, Image order input |
| Flexible Naming | Merchant can rename items for invoice accuracy |
| Triple Broadcast | Send to 3 merchants, first approval wins |
| Price History | "تم شراؤه مسبقاً" - Show previous prices |
| Delivery Transparency | Clear separation of products vs delivery fees |
| Offline Support | Voice recording cached when offline |
| Parallel Orders | Custom order doesn't block standard cart |

### 1.3 Operation Modes
| Mode | Description | Default For |
|------|-------------|-------------|
| `standard` | Menu-based ordering only | restaurant_cafe, coffee_patisserie |
| `custom` | Open/Custom ordering only | grocery, pharmacy, vegetables_fruits |
| `hybrid` | Both menu + custom | Any (future expansion) |

### 1.4 Design Principles
1. **Zero Impact**: Existing restaurant flow unchanged
2. **Parallel Paths**: Customer can have menu cart + custom order simultaneously
3. **Feature Toggles**: UI adapts based on provider operation_mode
4. **Consistent Navigation**: Bottom bar never changes

---

## 2. UX Architecture

### 2.1 Bottom Navigation (UNCHANGED)
```
┌────────┬────────┬────────┬────────┬────────┐
│ 🏠     │ 🔍     │ 📋     │ 👤     │ ⚙️     │
│الرئيسية│ تصفح   │ طلباتي │ حسابي  │ المزيد │
└────────┴────────┴────────┴────────┴────────┘
         ↑
    NEVER CHANGES - Same on all screens
```

**Routing Structure:**
```
/                           → Home (categories, providers)
/providers                  → Browse providers
/providers/[id]             → Provider detail
  ├── [standard mode]       → Show MenuItemsList
  └── [custom mode]         → Show CustomOrderInterface
/orders                     → All orders (standard + custom)
/orders/[id]                → Order detail
/orders/[id]/review-pricing → Review custom order pricing (NEW)
/profile                    → User profile
```

### 2.2 Cart vs Custom Order Separation

**Problem Solved:**
- Customer orders lunch from restaurant (in cart)
- Customer also wants groceries from supermarket (custom order)
- Both should work **independently and simultaneously**

**Solution: Dual-Track System**
```
┌─────────────────────────────────────────────────────────────┐
│                    DUAL-TRACK ORDERS                        │
└─────────────────────────────────────────────────────────────┘

Track 1: Standard Cart (Restaurants)
─────────────────────────────────────
• Uses existing cart system (Zustand)
• Shows in bottom cart icon with badge
• Checkout flow unchanged

Track 2: Custom Orders (Supermarket/Pharmacy)
─────────────────────────────────────
• NO CART - Direct submission to "طلباتي"
• Shows in orders list with "⏳ قيد التسعير" status
• Separate from cart completely

Result: Both can exist at same time!
┌────────────────────────────────────────────────────────────┐
│ 🛒 Cart: 3 items from "مطعم الكبابجي" (150 ج.م)           │
├────────────────────────────────────────────────────────────┤
│ 📋 طلباتي:                                                 │
│ • ⏳ طلب قيد التسعير - سوبر ماركت الأمل (4 أصناف)          │
│ • ✅ طلب #1234 - مكتمل                                     │
└────────────────────────────────────────────────────────────┘
```

### 2.3 Active Cart Banner Component

When customer with active cart visits a custom-order provider:

```
┌─────────────────────────────────────────────────────────────┐
│ 🛒 لديك سلة نشطة من "مطعم الكبابجي" (3 أصناف)       عرض ← │
└─────────────────────────────────────────────────────────────┘
│                                                             │
│                   [سوبر ماركت الأمل]                        │
│                                                             │
│        اكتب طلبك هنا - لن يؤثر على سلتك الحالية            │
```

**Component: `ActiveCartBanner`**
```typescript
// src/components/customer/shared/ActiveCartBanner.tsx
interface ActiveCartBannerProps {
  cartProvider: {
    name: string;
    itemCount: number;
  };
  onViewCart: () => void;
}
```

---

## 3. Database Schema

### 3.1 Provider Updates
```sql
-- Operation mode
ALTER TABLE providers
ADD COLUMN operation_mode TEXT DEFAULT 'standard'
CHECK (operation_mode IN ('standard', 'custom', 'hybrid'));

-- Custom order settings (JSONB for flexibility)
ALTER TABLE providers
ADD COLUMN custom_order_settings JSONB DEFAULT '{
  "accepts_text": true,
  "accepts_voice": true,
  "accepts_image": true,
  "max_items_per_order": 50,
  "pricing_timeout_hours": 24,
  "customer_approval_timeout_hours": 2,
  "auto_cancel_after_hours": 48,
  "show_price_history": true
}'::jsonb;
```

### 3.2 New Tables

#### `custom_order_broadcasts`
Triple Broadcast - Send order to multiple merchants.
```sql
CREATE TABLE custom_order_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  provider_ids UUID[] NOT NULL,           -- Max 3
  winning_order_id UUID,                  -- Set when customer approves one

  -- Original input (shared across all providers)
  original_input_type TEXT NOT NULL,      -- text, voice, image, mixed
  original_text TEXT,
  voice_url TEXT,
  image_urls TEXT[],
  transcribed_text TEXT,
  customer_notes TEXT,

  -- Delivery info
  delivery_address_id UUID REFERENCES addresses(id),
  delivery_address JSONB,
  order_type TEXT DEFAULT 'delivery',

  -- Status
  status TEXT DEFAULT 'active',           -- active, completed, expired, cancelled
  pricing_deadline TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT max_three_providers CHECK (array_length(provider_ids, 1) <= 3)
);
```

#### `custom_order_requests`
Per-provider pricing request.
```sql
CREATE TABLE custom_order_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  broadcast_id UUID REFERENCES custom_order_broadcasts(id),
  order_id UUID REFERENCES orders(id),
  provider_id UUID NOT NULL REFERENCES providers(id),

  -- Copied from broadcast for easy access
  input_type TEXT NOT NULL,
  original_text TEXT,
  voice_url TEXT,
  image_urls TEXT[],
  transcribed_text TEXT,
  customer_notes TEXT,

  -- Status
  status TEXT DEFAULT 'pending',          -- pending, priced, approved, rejected, expired, cancelled

  -- Pricing summary
  items_count INTEGER DEFAULT 0,
  subtotal DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  priced_at TIMESTAMPTZ,
  pricing_expires_at TIMESTAMPTZ,

  UNIQUE(broadcast_id, provider_id)
);
```

#### `custom_order_items`
Merchant-priced items with flexible naming.
```sql
CREATE TABLE custom_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES custom_order_requests(id),
  order_id UUID REFERENCES orders(id),

  -- Original customer text (PRESERVED - never edited)
  original_customer_text TEXT,

  -- Merchant-entered details (EDITABLE for invoice accuracy)
  item_name_ar TEXT NOT NULL,
  item_name_en TEXT,
  description_ar TEXT,

  -- Quantity & Pricing
  unit_type TEXT,                         -- كيلو، علبة، قطعة، لتر
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  -- Availability
  availability_status TEXT DEFAULT 'available',  -- available, unavailable, partial, substituted

  -- Substitute (when original unavailable)
  substitute_name_ar TEXT,
  substitute_name_en TEXT,
  substitute_quantity DECIMAL(10,2),
  substitute_unit_type TEXT,
  substitute_unit_price DECIMAL(10,2),
  substitute_total_price DECIMAL(10,2),
  substitute_notes TEXT,

  -- Merchant notes
  merchant_notes TEXT,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `custom_order_price_history`
Track previous prices for "تم شراؤه مسبقاً" feature.
```sql
CREATE TABLE custom_order_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),

  -- Item identification (fuzzy match)
  item_name_normalized TEXT NOT NULL,     -- Normalized for matching
  item_name_ar TEXT NOT NULL,             -- Display name

  -- Pricing
  unit_type TEXT,
  unit_price DECIMAL(10,2) NOT NULL,

  -- Source
  order_id UUID REFERENCES orders(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for fast lookup
  UNIQUE(provider_id, customer_id, item_name_normalized)
);

-- Function to normalize Arabic text for matching
CREATE OR REPLACE FUNCTION normalize_arabic(text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(text, '[ةه]', 'ه', 'g'),
        '[أإآا]', 'ا', 'g'
      ),
      '[يى]', 'ي', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 3.3 Order Table Updates
```sql
ALTER TABLE orders
ADD COLUMN order_flow TEXT DEFAULT 'standard' CHECK (order_flow IN ('standard', 'custom')),
ADD COLUMN broadcast_id UUID REFERENCES custom_order_broadcasts(id),
ADD COLUMN pricing_status TEXT CHECK (pricing_status IN (
  'awaiting_pricing', 'pricing_sent', 'pricing_approved',
  'pricing_rejected', 'pricing_expired'
)),
ADD COLUMN pricing_sent_at TIMESTAMPTZ,
ADD COLUMN pricing_responded_at TIMESTAMPTZ,
ADD COLUMN pricing_expires_at TIMESTAMPTZ;
```

### 3.4 Order Items Updates
```sql
ALTER TABLE order_items
ADD COLUMN item_source TEXT DEFAULT 'menu' CHECK (item_source IN ('menu', 'custom')),
ADD COLUMN custom_item_id UUID REFERENCES custom_order_items(id),
ADD COLUMN original_customer_text TEXT;
```

---

## 4. Order State Machine

### 4.1 Custom Order Flow
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CUSTOM ORDER STATE MACHINE                               │
└─────────────────────────────────────────────────────────────────────────────┘

[Customer writes/records order]
         │
         ▼
┌─────────────────────┐
│       draft         │ ← Local state (not in DB yet)
└─────────────────────┘
         │
         │ [Submit to 1-3 merchants]
         ▼
┌─────────────────────┐
│  awaiting_pricing   │ ← Orders created, waiting for merchant pricing
│     ⏱️ 24 hours     │   Notification: "طلب جديد بانتظار التسعير"
└─────────────────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         │ [Merchant prices]                    │ [24h timeout]
         ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│   pricing_sent      │              │      expired        │
│    ⏱️ 2 hours       │              │   (auto-cancel)     │
└─────────────────────┘              └─────────────────────┘
         │
         ├─────────────────────┐
         │                     │
         │ [Customer approves] │ [Customer rejects / 2h timeout]
         ▼                     ▼
┌─────────────────────┐  ┌─────────────────────┐
│ pricing_approved    │  │   cancelled         │
│   (confirmed)       │  │                     │
└─────────────────────┘  └─────────────────────┘
         │
         ▼
┌─────────────────────┐
│    STANDARD FLOW    │
│  preparing → ready  │
│  → out_for_delivery │
│  → delivered        │
└─────────────────────┘
```

### 4.2 Status Definitions
| Status | Arabic | Description |
|--------|--------|-------------|
| `awaiting_pricing` | بانتظار التسعير | Order submitted, waiting for merchant |
| `pricing_sent` | تم إرسال التسعير | Merchant priced, waiting for customer |
| `pricing_approved` | موافق على السعر | Customer approved, becomes `confirmed` |
| `pricing_rejected` | مرفوض | Customer rejected the pricing |
| `pricing_expired` | منتهي الصلاحية | Timeout - no response |

---

## 5. Triple Broadcast System

### 5.1 Overview
Customer can send their order to **1-3 merchants** simultaneously.
**First merchant whose pricing is approved by customer WINS.**

### 5.2 Flow Diagram
```
                    Customer submits order
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
       ┌─────────┐   ┌─────────┐   ┌─────────┐
       │ Shop A  │   │ Shop B  │   │ Shop C  │
       │ Order 1 │   │ Order 2 │   │ Order 3 │
       └─────────┘   └─────────┘   └─────────┘
            │              │              │
            ▼              ▼              ▼
       [Pricing]     [Pricing]     [Waiting]
       385 ج.م       370 ج.م         ...
            │              │
            └──────┬───────┘
                   │
                   ▼
            ┌─────────────────┐
            │ Customer sees   │
            │ comparison view │
            │ A: 385 ج.م      │
            │ B: 370 ج.م ✓    │ ← Customer chooses B
            │ C: Waiting...   │
            └─────────────────┘
                   │
                   ▼
         [Customer approves B]
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   Order B WINS!         Orders A & C
   → confirmed           → auto-cancelled
   → notify Shop B       → notify Shops A & C
```

### 5.3 Implementation Rules
1. **Max 3 merchants** per broadcast
2. **First approval wins** - Other orders auto-cancelled immediately
3. **Partial pricing allowed** - Some items can be "unavailable"
4. **Price comparison** - Customer sees all quotes side by side
5. **Independent timeouts** - Each merchant has their own 24h window
6. **Graceful degradation** - If only 1 merchant responds, customer can still approve

### 5.4 Cancel Logic (PostgreSQL Function)
```sql
CREATE OR REPLACE FUNCTION handle_custom_order_approval(
  p_order_id UUID,
  p_broadcast_id UUID
) RETURNS VOID AS $$
DECLARE
  v_broadcast RECORD;
BEGIN
  -- Lock broadcast to prevent race conditions
  SELECT * INTO v_broadcast
  FROM custom_order_broadcasts
  WHERE id = p_broadcast_id
  FOR UPDATE;

  IF v_broadcast.status != 'active' THEN
    RAISE EXCEPTION 'Broadcast already completed or cancelled';
  END IF;

  -- 1. Mark broadcast as completed
  UPDATE custom_order_broadcasts SET
    status = 'completed',
    winning_order_id = p_order_id,
    completed_at = NOW()
  WHERE id = p_broadcast_id;

  -- 2. Mark winning order
  UPDATE orders SET
    status = 'confirmed',
    pricing_status = 'pricing_approved',
    pricing_responded_at = NOW()
  WHERE id = p_order_id;

  -- 3. Cancel ALL other orders in this broadcast
  UPDATE orders SET
    status = 'cancelled',
    pricing_status = 'pricing_rejected',
    cancellation_reason = 'تم اختيار تاجر آخر',
    cancelled_at = NOW()
  WHERE broadcast_id = p_broadcast_id
    AND id != p_order_id
    AND status NOT IN ('cancelled', 'rejected');

  -- 4. Update request statuses
  UPDATE custom_order_requests SET
    status = 'cancelled'
  WHERE broadcast_id = p_broadcast_id
    AND order_id != p_order_id;

  UPDATE custom_order_requests SET
    status = 'customer_approved'
  WHERE order_id = p_order_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. Frontend Components

### 6.1 Customer Components

#### `CustomOrderInterface`
Main component shown when visiting a custom-mode provider.

**Location:** `src/components/customer/custom-order/CustomOrderInterface.tsx`

**Props:**
```typescript
interface CustomOrderInterfaceProps {
  provider: Provider;
  settings: CustomOrderSettings;
  onSubmit: (order: CustomOrderDraft) => Promise<void>;
}
```

**Features:**
- Tab switching: Text / Voice / Image
- Character counter for text input
- Voice recording with visual feedback
- Image upload with preview (max 5)
- Additional notes field
- Submit button with validation

#### `TextOrderInput`
Text input with Arabic-optimized UX.

**Location:** `src/components/customer/custom-order/TextOrderInput.tsx`

```typescript
interface TextOrderInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
}
```

#### `VoiceOrderInput`
Voice recording with offline support.

**Location:** `src/components/customer/custom-order/VoiceOrderInput.tsx`

```typescript
interface VoiceOrderInputProps {
  onRecordingComplete: (blob: Blob, transcription?: string) => void;
  onError: (error: string) => void;
  maxDuration?: number; // seconds
}
```

**Offline Handling:**
- Recording stored in IndexedDB if offline
- Auto-upload when connection restored
- Visual indicator: "سيتم الإرسال عند عودة الاتصال"

#### `ImageOrderInput`
Image upload with compression.

**Location:** `src/components/customer/custom-order/ImageOrderInput.tsx`

```typescript
interface ImageOrderInputProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  maxImages?: number; // default 5
}
```

#### `ActiveCartBanner`
Non-intrusive banner when user has active cart.

**Location:** `src/components/customer/shared/ActiveCartBanner.tsx`

```typescript
interface ActiveCartBannerProps {
  cartProvider: { name: string; itemCount: number; };
  onViewCart: () => void;
  onDismiss: () => void;
}
```

**Design:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🛒 لديك سلة من "مطعم الكبابجي" (3)            عرض │ ✕ │
└─────────────────────────────────────────────────────────────┘
```
- Small, top of screen
- Dismissible (remembers for session)
- "عرض" links to cart

#### `MerchantSelector`
Select 1-3 merchants for triple broadcast.

**Location:** `src/components/customer/custom-order/MerchantSelector.tsx`

```typescript
interface MerchantSelectorProps {
  providers: Provider[];
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelection?: number; // default 3
}
```

#### `PricingReview`
Review single merchant's pricing.

**Location:** `src/app/[locale]/orders/[id]/review-pricing/page.tsx`

**Sections:**
1. Provider info + countdown timer
2. **Products list** (with availability badges)
3. **Products subtotal** (separated)
4. **Delivery fee box** (clearly separated, shows source)
5. **Final total** (prominent)
6. Action buttons: Approve / Reject

#### `BroadcastComparison`
Compare pricing from multiple merchants.

**Location:** `src/components/customer/custom-order/BroadcastComparison.tsx`

```typescript
interface BroadcastComparisonProps {
  broadcast: CustomOrderBroadcast;
  requests: CustomOrderRequest[];
  onSelectProvider: (orderId: string) => void;
}
```

### 6.2 Merchant Components

#### `PricingNotepad`
Main merchant interface for pricing orders.

**Location:** `src/components/provider/custom-order/PricingNotepad.tsx`

**Props:**
```typescript
interface PricingNotepadProps {
  request: CustomOrderRequest;
  broadcast: CustomOrderBroadcast;
  priceHistory: PriceHistoryItem[];
  onSubmitPricing: (items: CustomOrderItem[]) => Promise<void>;
  onCancel: () => void;
}
```

**Sections:**
1. Header: Order #, Customer name, Countdown timer
2. Original customer request (text/voice player/images)
3. Items list with PricingItemRow
4. Add item button
5. Summary: Subtotal, Delivery fee, Total, Commission, Net payout
6. Submit/Cancel buttons

#### `PricingItemRow`
Individual item row with flexible naming.

**Location:** `src/components/provider/custom-order/PricingItemRow.tsx`

```typescript
interface PricingItemRowProps {
  item: PricedItem;
  originalText?: string;
  priceHistory?: { price: number; date: string; };
  onUpdate: (item: PricedItem) => void;
  onUseCustomerText: () => void;
  onUsePreviousPrice: () => void;
  onMarkUnavailable: () => void;
  onAddSubstitute: () => void;
  onRemove: () => void;
}
```

**"تم شراؤه مسبقاً" Feature:**
```
┌─────────────────────────────────────────────────────────────┐
│ اسم الصنف: [أرز بسمتي أبيض               ] ✏️             │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📝 استخدام نص العميل: "2 كيلو رز بسمتي"                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🕐 تم شراؤه مسبقاً: 55 ج.م/كيلو (منذ 3 أيام)           │ │
│ │              [📋 استخدام السعر القديم]                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ الكمية: [2]  الوحدة: [كيلو ▼]  السعر: [60] ج.م            │
│ الإجمالي: 120 ج.م                                          │
│                                                             │
│ [✅ متوفر] [❌ غير متوفر] [🔄 بديل]                        │
└─────────────────────────────────────────────────────────────┘
```

#### `CustomOrdersList`
List of pending custom orders for merchant.

**Location:** `src/components/provider/custom-order/CustomOrdersList.tsx`

**Tabs:**
- ⏳ بانتظار التسعير (with count badge)
- ✅ تم التسعير
- 📦 الكل

---

## 7. Provider Dashboard

### 7.1 Feature Toggles System

```typescript
// src/lib/utils/provider-features.ts

export type OperationMode = 'standard' | 'custom' | 'hybrid';

export interface ProviderFeatures {
  // Tab visibility
  showOrdersTab: boolean;        // Standard orders
  showPricingTab: boolean;       // Custom order pricing
  showProductsTab: boolean;      // Menu management

  // Customer interface
  customerInterface: 'menu' | 'custom-order' | 'both';

  // Default tab
  defaultTab: 'orders' | 'pricing-orders' | 'dashboard';
}

export function getProviderFeatures(mode: OperationMode): ProviderFeatures {
  switch (mode) {
    case 'standard':
      return {
        showOrdersTab: true,
        showPricingTab: false,
        showProductsTab: true,
        customerInterface: 'menu',
        defaultTab: 'orders',
      };
    case 'custom':
      return {
        showOrdersTab: false,
        showPricingTab: true,
        showProductsTab: false,  // Optional: can show as reference
        customerInterface: 'custom-order',
        defaultTab: 'pricing-orders',
      };
    case 'hybrid':
      return {
        showOrdersTab: true,
        showPricingTab: true,
        showProductsTab: true,
        customerInterface: 'both',
        defaultTab: 'dashboard',
      };
  }
}
```

### 7.2 Dashboard Layout by Mode

**Standard Mode (Restaurants):**
```
┌─────────────────────────────────────────────────────────────┐
│  📊 الرئيسية │ 📋 الطلبات │ 🍽️ المنتجات │ 💰 المالية │ ⚙️ │
└─────────────────────────────────────────────────────────────┘
              (No changes - existing layout)
```

**Custom Mode (Supermarket/Pharmacy):**
```
┌─────────────────────────────────────────────────────────────┐
│  📊 الرئيسية │ 📝 طلبات التسعير │ 💰 المالية │ ⚙️ الإعدادات │
└─────────────────────────────────────────────────────────────┘
              (Products tab hidden or optional)
```

**Hybrid Mode:**
```
┌─────────────────────────────────────────────────────────────┐
│  📊 │ 📋 الطلبات │ 📝 التسعير │ 🍽️ المنتجات │ 💰 │ ⚙️     │
└─────────────────────────────────────────────────────────────┘
              (Both order types available)
```

### 7.3 Settings Page Updates

**New Section: "إعدادات الطلب المفتوح"**

```
┌─────────────────────────────────────────────────────────────┐
│                    إعدادات المتجر                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ═══════════════════════════════════════════════════════    │
│  🔧 نوع العمليات                                           │
│  ═══════════════════════════════════════════════════════    │
│                                                             │
│  وضع التشغيل:                                               │
│  ○ قائمة الطعام فقط (Standard)                             │
│  ● الطلب المفتوح فقط (Custom)                              │
│  ○ الوضع المختلط (Hybrid)                                  │
│                                                             │
│  ═══════════════════════════════════════════════════════    │
│  📝 إعدادات الطلب المفتوح                                   │
│  ═══════════════════════════════════════════════════════    │
│                                                             │
│  طرق استقبال الطلب:                                         │
│  ☑️ كتابة نصية                                              │
│  ☑️ تسجيل صوتي                                              │
│  ☑️ صور                                                     │
│                                                             │
│  مهلة التسعير: [24] ساعة                                    │
│  مهلة موافقة العميل: [2] ساعة                               │
│  الحد الأقصى للأصناف: [50] صنف                              │
│                                                             │
│  ☑️ إظهار تاريخ الأسعار السابقة (تم شراؤه مسبقاً)           │
│                                                             │
│  ═══════════════════════════════════════════════════════    │
│  🚚 إعدادات التوصيل (مشتركة)                                │
│  ═══════════════════════════════════════════════════════    │
│                                                             │
│  رسوم التوصيل: [15] ج.م                                     │
│  الحد الأدنى للطلب: [50] ج.م                                │
│  وقت التوصيل المتوقع: [45] دقيقة                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Offline & Error Handling

### 8.1 Voice Recording Offline Support

**Problem:** User records voice but internet is down.

**Solution: IndexedDB Cache**

```typescript
// src/lib/offline/voice-cache.ts

interface CachedVoiceRecording {
  id: string;
  blob: Blob;
  providerId: string;
  timestamp: number;
  status: 'pending' | 'uploaded' | 'failed';
}

export class VoiceRecordingCache {
  private db: IDBDatabase;

  async cacheRecording(recording: Blob, providerId: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.db.put('voice_recordings', {
      id,
      blob: recording,
      providerId,
      timestamp: Date.now(),
      status: 'pending'
    });
    return id;
  }

  async uploadPendingRecordings(): Promise<void> {
    const pending = await this.getPendingRecordings();
    for (const recording of pending) {
      try {
        await uploadVoiceRecording(recording.blob, recording.providerId);
        await this.markAsUploaded(recording.id);
      } catch (error) {
        console.error('Failed to upload cached recording:', error);
      }
    }
  }
}

// Auto-sync when online
window.addEventListener('online', () => {
  voiceCache.uploadPendingRecordings();
});
```

**UI Feedback:**
```
┌─────────────────────────────────────────────────────────────┐
│                     🎤 التسجيل الصوتي                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ أنت غير متصل بالإنترنت                                 │
│  سيتم حفظ التسجيل وإرساله عند عودة الاتصال                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  🔴 جاري التسجيل... 00:15                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Error States

| Error | Message (AR) | Action |
|-------|-------------|--------|
| Network offline | أنت غير متصل بالإنترنت | Cache locally, retry when online |
| Voice transcription failed | تعذر تحويل الصوت لنص | Allow manual text entry |
| Image upload failed | فشل رفع الصورة | Retry button |
| Pricing timeout | انتهت مهلة التسعير | Show expired state |
| Broadcast expired | انتهت صلاحية الطلب | Allow new submission |

---

## 9. Financial Integration

### 9.1 Commission Calculation
```typescript
// Same tiered commission as standard orders
// Commission applied to PRODUCT SUBTOTAL only
// Delivery fee goes 100% to merchant

interface CustomOrderFinancials {
  productSubtotal: number;      // Sum of priced items
  deliveryFee: number;          // From provider.delivery_fee
  customerTotal: number;        // subtotal + deliveryFee

  commissionRate: number;       // 5-7% tiered
  platformCommission: number;   // subtotal * rate

  merchantPayout: number;       // subtotal - commission + deliveryFee
}

function calculateCustomOrderFinancials(
  items: CustomOrderItem[],
  provider: Provider
): CustomOrderFinancials {
  const productSubtotal = items.reduce((sum, item) => {
    if (item.availability_status === 'substituted') {
      return sum + (item.substitute_total_price || 0);
    }
    if (item.availability_status === 'available') {
      return sum + item.total_price;
    }
    return sum;
  }, 0);

  const deliveryFee = provider.delivery_fee;
  const commissionRate = getProviderCommissionRate(provider);
  const platformCommission = productSubtotal * commissionRate;

  return {
    productSubtotal,
    deliveryFee,
    customerTotal: productSubtotal + deliveryFee,
    commissionRate,
    platformCommission,
    merchantPayout: productSubtotal - platformCommission + deliveryFee,
  };
}
```

### 9.2 Settlement Integration
- Custom orders included in weekly settlement cycle
- Same settlement tables used
- `order_flow = 'custom'` for filtering/reporting

---

## 10. Implementation Checklist

### Phase 1: Database (2-3 days)
- [ ] Add `operation_mode` to providers table
- [ ] Add `custom_order_settings` JSONB to providers
- [ ] Create `custom_order_broadcasts` table
- [ ] Create `custom_order_requests` table
- [ ] Create `custom_order_items` table
- [ ] Create `custom_order_price_history` table
- [ ] Add order table columns (order_flow, pricing_status, broadcast_id)
- [ ] Add order_items columns (item_source, custom_item_id, original_customer_text)
- [ ] Create RLS policies for all new tables
- [ ] Create `handle_custom_order_approval()` function
- [ ] Create `expire_custom_order_broadcasts()` function
- [ ] Create `normalize_arabic()` function
- [ ] Update default operation_mode for existing providers

### Phase 2: TypeScript Types (1 day)
- [ ] Add `OperationMode` type
- [ ] Add `CustomOrderSettings` interface
- [ ] Add `CustomOrderBroadcast` interface
- [ ] Add `CustomOrderRequest` interface
- [ ] Add `CustomOrderItem` interface
- [ ] Add `PriceHistoryItem` interface
- [ ] Update `Provider` type
- [ ] Update `Order` type
- [ ] Update `OrderItem` type

### Phase 3: Backend Services (3-4 days)
- [ ] Create `src/lib/orders/custom-orders.ts`
- [ ] Create `src/lib/orders/broadcast-service.ts`
- [ ] Create `src/lib/orders/price-history-service.ts`
- [ ] Create `src/lib/offline/voice-cache.ts`
- [ ] Create custom order API routes
- [ ] Implement broadcast creation
- [ ] Implement pricing submission
- [ ] Implement approval/rejection
- [ ] Implement auto-expiry (cron job)
- [ ] Create notification templates

### Phase 4: Customer Frontend (4-5 days)
- [ ] Create `CustomOrderInterface` component
- [ ] Create `TextOrderInput` component
- [ ] Create `VoiceOrderInput` component with offline support
- [ ] Create `ImageOrderInput` component
- [ ] Create `ActiveCartBanner` component
- [ ] Create `MerchantSelector` component
- [ ] Create `PricingReview` page
- [ ] Create `BroadcastComparison` component
- [ ] Update `providers/[id]/page.tsx` with mode detection
- [ ] Add custom orders to "طلباتي" list

### Phase 5: Merchant Frontend (3-4 days)
- [ ] Create `PricingNotepad` component
- [ ] Create `PricingItemRow` component
- [ ] Implement "استخدام نص العميل" button
- [ ] Implement "تم شراؤه مسبقاً" feature
- [ ] Create `SubstituteItemModal` component
- [ ] Create `CustomOrdersList` component
- [ ] Update provider dashboard with feature toggles
- [ ] Update provider settings page

### Phase 6: Integration & Testing (2-3 days)
- [ ] Kashier payment integration for custom orders
- [ ] Notification system integration
- [ ] Offline voice upload testing
- [ ] E2E: Single merchant flow
- [ ] E2E: Triple broadcast flow
- [ ] E2E: Timeout handling
- [ ] E2E: Substitute items
- [ ] Performance testing

### Phase 7: Admin Dashboard (2-3 days)
- [ ] Add custom orders to admin orders view
- [ ] Add broadcast monitoring
- [ ] Add operation_mode management for providers
- [ ] Add custom order analytics

---

## 11. API Endpoints

### Customer APIs
```
POST   /api/custom-orders/draft           # Save draft locally
POST   /api/custom-orders/submit          # Submit broadcast
GET    /api/custom-orders/[broadcastId]   # Get broadcast status
GET    /api/custom-orders/[broadcastId]/pricing  # Get all pricing
POST   /api/custom-orders/[orderId]/approve      # Approve pricing
POST   /api/custom-orders/[orderId]/reject       # Reject pricing

POST   /api/voice/upload                  # Upload voice recording
POST   /api/voice/transcribe              # Transcribe voice to text
```

### Merchant APIs
```
GET    /api/provider/custom-orders                    # List pending orders
GET    /api/provider/custom-orders/[requestId]        # Get order details
POST   /api/provider/custom-orders/[requestId]/price  # Submit pricing
GET    /api/provider/price-history                    # Get price history
```

---

## 12. Notifications

### Customer Notifications
| Event | Title (AR) | Message (AR) |
|-------|-----------|--------------|
| `order_submitted` | تم إرسال طلبك | طلبك في انتظار التسعير من {count} تاجر |
| `pricing_received` | تم تسعير طلبك | {provider} قام بتسعير طلبك - {total} ج.م |
| `all_pricing_received` | جميع التسعيرات جاهزة | راجع وقارن الأسعار واختر الأنسب |
| `pricing_expiring` | مهلة الموافقة تنتهي قريباً | لديك {time} للموافقة على التسعير |
| `order_confirmed` | تم تأكيد طلبك | طلبك من {provider} جاري التجهيز |
| `order_expired` | انتهت صلاحية الطلب | لم يتم الرد في الوقت المحدد |

### Merchant Notifications
| Event | Title (AR) | Message (AR) |
|-------|-----------|--------------|
| `new_custom_order` | طلب جديد بانتظار التسعير | لديك طلب جديد من {customer} - {items_count} صنف |
| `pricing_deadline_soon` | تنبيه: الطلب سينتهي قريباً | لديك {time} لتسعير الطلب #{number} |
| `order_won` | 🎉 تم اختيارك | العميل وافق على تسعيرتك - جهّز الطلب |
| `order_lost` | تم اختيار تاجر آخر | العميل اختار تاجراً آخر للطلب #{number} |

---

## 13. Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Database | 2-3 days | ✅ Migration created |
| Phase 2: Types | 1 day | ⏳ Pending |
| Phase 3: Backend | 3-4 days | ⏳ Pending |
| Phase 4: Customer UI | 4-5 days | ⏳ Pending |
| Phase 5: Merchant UI | 3-4 days | ⏳ Pending |
| Phase 6: Testing | 2-3 days | ⏳ Pending |
| Phase 7: Admin | 2-3 days | ⏳ Pending |

**Total Estimated: 17-23 working days**

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Claude | Initial plan |
| 2.0 | Jan 2026 | Claude | Added: Offline support, ActiveCartBanner, Price history, Feature toggles, Hybrid mode, Settings page, UX architecture |
