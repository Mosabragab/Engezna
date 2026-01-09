# Custom Order System - Implementation Plan
## نظام الطلب المفتوح - خطة التنفيذ

**Version:** 1.0
**Date:** January 2026
**Status:** In Progress

---

## Table of Contents
1. [Overview](#1-overview)
2. [Database Schema](#2-database-schema)
3. [Order State Machine](#3-order-state-machine)
4. [Triple Broadcast System](#4-triple-broadcast-system)
5. [Frontend Components](#5-frontend-components)
6. [Financial Integration](#6-financial-integration)
7. [Implementation Checklist](#7-implementation-checklist)

---

## 1. Overview

### 1.1 Purpose
Add a "Custom Order" (الطلب المفتوح) system for:
- **Supermarkets** (سوبر ماركت)
- **Pharmacies** (صيدليات)
- **Vegetables & Fruits** (خضروات وفواكه)

While maintaining the existing **Standard Menu Flow** for restaurants.

### 1.2 Key Features
- Text/Voice/Image order input from customers
- Merchant pricing notepad with flexible item naming
- Triple Broadcast: Send to 3 merchants, first to price wins
- Clear delivery fee separation in pricing review
- Commission calculation (5-7%) on subtotal only

### 1.3 Operation Modes
| Mode | Description | Categories |
|------|-------------|------------|
| `standard` | Menu-based ordering | restaurant_cafe, coffee_patisserie |
| `custom` | Open/Custom ordering | grocery, pharmacy, vegetables_fruits |
| `hybrid` | Supports both (future) | Any |

---

## 2. Database Schema

### 2.1 Provider Updates
```sql
-- Add operation_mode to providers
ALTER TABLE providers ADD COLUMN operation_mode TEXT DEFAULT 'standard';
ALTER TABLE providers ADD COLUMN custom_order_settings JSONB;
```

### 2.2 New Tables

#### `custom_order_broadcasts` (Triple Broadcast System)
Tracks sending one order to multiple merchants.

#### `custom_order_requests`
Stores customer's original order input (text/voice/image).

#### `custom_order_items`
Stores merchant-priced items with:
- Flexible naming (merchant can rename items)
- Original customer text preserved
- Availability status
- Substitute items support

### 2.3 Order Updates
```sql
ALTER TABLE orders ADD COLUMN order_flow TEXT DEFAULT 'standard';
ALTER TABLE orders ADD COLUMN pricing_status TEXT;
ALTER TABLE orders ADD COLUMN broadcast_id UUID;
```

---

## 3. Order State Machine

### 3.1 Custom Order Flow
```
[Customer submits order]
         │
         ▼
┌─────────────────────┐
│      draft          │ ← Customer writes/records/uploads
└─────────────────────┘
         │
         │ [Send to merchants - Triple Broadcast]
         ▼
┌─────────────────────┐
│  awaiting_pricing   │ ← Waiting for merchant pricing (24h timeout)
└─────────────────────┘
         │
         │ [Merchant prices items]
         ▼
┌─────────────────────┐
│   pricing_sent      │ ← Pricing sent to customer (2h to approve)
└─────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[Approved] [Rejected/Expired]
    │              │
    ▼              ▼
confirmed      cancelled
    │
    ▼
[Standard flow: preparing → ready → delivered]
```

### 3.2 Status Transitions
| From | To | Trigger |
|------|----|---------|
| draft | awaiting_pricing | Customer submits |
| awaiting_pricing | pricing_sent | Merchant completes pricing |
| awaiting_pricing | expired | 24h timeout |
| pricing_sent | confirmed | Customer approves |
| pricing_sent | cancelled | Customer rejects |
| pricing_sent | expired | 2h timeout |

---

## 4. Triple Broadcast System

### 4.1 Overview
When customer submits a custom order, it can be sent to up to 3 competing merchants.
**First merchant to have their pricing approved by customer wins.**

### 4.2 Database Structure
```sql
CREATE TABLE custom_order_broadcasts (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL,
  provider_ids UUID[] NOT NULL,        -- Up to 3 merchants
  winning_order_id UUID,               -- The order that won
  status TEXT DEFAULT 'active',        -- active, completed, expired, cancelled
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Flow
```
┌──────────────────────────────────────────────────────────────────┐
│                    TRIPLE BROADCAST FLOW                         │
└──────────────────────────────────────────────────────────────────┘

                    Customer Order
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
     ┌─────────┐   ┌─────────┐   ┌─────────┐
     │ Order A │   │ Order B │   │ Order C │
     │ Shop 1  │   │ Shop 2  │   │ Shop 3  │
     └─────────┘   └─────────┘   └─────────┘
          │              │              │
          ▼              ▼              ▼
     [Pricing]     [Pricing]     [Pricing]
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
              Customer Reviews All
                         │
               ┌─────────┴─────────┐
               │                   │
               ▼                   ▼
        [Approves B]        [Rejects A, C]
               │                   │
               ▼                   ▼
      Order B WINS!          Auto-Cancel
      (confirmed)            Orders A & C
```

### 4.4 Implementation Rules
1. **Max 3 merchants** per broadcast
2. **First approval wins** - Other orders auto-cancelled
3. **Partial pricing allowed** - Merchant can price even if some items unavailable
4. **Customer sees all** - Can compare pricing from all merchants
5. **Timeout handling** - If all expire, broadcast cancelled

### 4.5 Cancel Logic
```typescript
async function handleCustomerApproval(orderId: string, broadcastId: string) {
  // 1. Mark winning order as confirmed
  await updateOrder(orderId, { status: 'confirmed' });

  // 2. Mark broadcast as completed
  await updateBroadcast(broadcastId, {
    status: 'completed',
    winning_order_id: orderId
  });

  // 3. Cancel all other orders in broadcast
  await cancelCompetingOrders(broadcastId, orderId);

  // 4. Notify losing merchants
  await notifyMerchantsOrderLost(broadcastId, orderId);
}
```

---

## 5. Frontend Components

### 5.1 Customer Components

#### `CustomOrderInterface`
Main component for custom order input.
- Text input with placeholder examples
- Voice recording with AI transcription
- Image upload (up to 5 images)
- Merchant selection (1-3 merchants)

#### `PricingReview`
Review merchant pricing before approval.
- **Clear separation of delivery fee and products**
- Compare multiple merchant quotes
- Accept/Reject buttons with countdown timer

### 5.2 Merchant Components

#### `PricingNotepad`
Merchant's interface to price customer orders.

**Key Feature: Flexible Item Naming**
```
┌─────────────────────────────────────────────────────────────┐
│  اسم الصنف                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ أرز بسمتي أبيض - كيلو                                   ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────┐                                │
│  │ 📝 استخدام نص العميل    │  ← Quick fill from customer   │
│  └─────────────────────────┘                                │
│  نص العميل الأصلي: "2 كيلو رز بسمتي"                        │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Editable item name (for invoice accuracy)
- "Use customer text" button for convenience
- Original customer text always visible
- Mark unavailable / Add substitute
- Quantity and unit type selection
- Price input with auto-total calculation

#### `PricingItemRow`
Individual item row in pricing notepad.
```typescript
interface PricingItemRowProps {
  item: PricedItem;
  originalText?: string;        // Customer's original text
  onUpdate: (item: PricedItem) => void;
  onUseCustomerText: () => void; // Copy customer text to name
  onMarkUnavailable: () => void;
  onAddSubstitute: () => void;
  onRemove: () => void;
}
```

### 5.3 Pricing Review - Delivery Fee Transparency

```
┌─────────────────────────────────────────────────────────────┐
│                    مراجعة التسعير                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  المنتجات                                        السعر     │
│  ─────────────────────────────────────────────────────────  │
│  أرز بسمتي - 2 كيلو                              120 ج.م   │
│  زيت ذرة - 1 لتر                                  85 ج.م   │
│  تونة معلبة - 3 علب                               90 ج.م   │
│  ─────────────────────────────────────────────────────────  │
│  إجمالي المنتجات                                 295 ج.م   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │  🚚 رسوم التوصيل                              15 ج.م   ││
│  │  ────────────────────────────────────────────────────   ││
│  │  يتم تحديدها من إعدادات التاجر                         ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ╔═════════════════════════════════════════════════════════╗│
│  ║  الإجمالي النهائي                           310 ج.م   ║│
│  ╚═════════════════════════════════════════════════════════╝│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Financial Integration

### 6.1 Commission Calculation
- Commission (5-7%) applied to **product subtotal only**
- Delivery fee goes **100% to merchant**
- Same tiered commission as standard orders

### 6.2 Settlement Impact
```typescript
// Custom order settlement calculation
const settlement = {
  productSubtotal: 295,          // Sum of priced items
  deliveryFee: 15,               // From provider settings
  commissionRate: 0.06,          // 6% example
  platformCommission: 17.70,     // 295 * 0.06
  merchantPayout: 292.30,        // 295 - 17.70 + 15
  total: 310,                    // Customer pays
};
```

### 6.3 Payment Flow
1. Customer approves pricing
2. If online payment → Kashier checkout
3. If COD → Order confirmed directly
4. Settlement includes custom order in weekly cycle

---

## 7. Implementation Checklist

### Phase 1: Database (Priority: HIGH)
- [ ] Add `operation_mode` to providers table
- [ ] Add `custom_order_settings` JSONB to providers
- [ ] Create `custom_order_broadcasts` table
- [ ] Create `custom_order_requests` table
- [ ] Create `custom_order_items` table
- [ ] Add `order_flow`, `pricing_status`, `broadcast_id` to orders
- [ ] Add `item_source`, `custom_item_id`, `original_customer_text` to order_items
- [ ] Add `pharmacy` to provider categories
- [ ] Create RLS policies for new tables
- [ ] Update TypeScript types

### Phase 2: Backend Services (Priority: HIGH)
- [ ] Create `src/lib/orders/custom-orders.ts` service
- [ ] Create `src/lib/orders/broadcast-service.ts`
- [ ] Create custom order API routes
- [ ] Implement order state transitions
- [ ] Implement broadcast cancel logic
- [ ] Create notification templates
- [ ] Add cron job for expired orders

### Phase 3: Customer Frontend (Priority: HIGH)
- [ ] Create `CustomOrderInterface` component
- [ ] Create `TextOrderInput` component
- [ ] Create `VoiceOrderInput` component
- [ ] Create `ImageOrderInput` component
- [ ] Create `MerchantSelector` for triple broadcast
- [ ] Create `PricingReview` page with delivery fee separation
- [ ] Create `BroadcastComparison` view
- [ ] Update `providers/[id]/page.tsx`

### Phase 4: Merchant Frontend (Priority: HIGH)
- [ ] Create `PricingNotepad` component
- [ ] Create `PricingItemRow` with flexible naming
- [ ] Create "Use customer text" functionality
- [ ] Create `CustomOrdersList` for provider dashboard
- [ ] Add substitute item modal
- [ ] Add countdown timer for pricing deadline

### Phase 5: Integration & Testing (Priority: MEDIUM)
- [ ] Integration with Kashier payment
- [ ] Integration with notification system
- [ ] E2E testing for custom order flow
- [ ] E2E testing for triple broadcast
- [ ] Performance testing
- [ ] Bug fixes and polish

### Phase 6: Admin Dashboard (Priority: LOW)
- [ ] Add custom orders to admin orders view
- [ ] Add broadcast monitoring
- [ ] Add custom order analytics
- [ ] Add provider operation_mode management

---

## 8. API Endpoints

### Customer APIs
```
POST   /api/custom-orders/create          # Create draft order
POST   /api/custom-orders/submit          # Submit for pricing (broadcast)
GET    /api/custom-orders/[id]/pricing    # Get pricing from all merchants
POST   /api/custom-orders/[id]/approve    # Approve pricing
POST   /api/custom-orders/[id]/reject     # Reject pricing
```

### Merchant APIs
```
GET    /api/provider/custom-orders        # List pending custom orders
GET    /api/provider/custom-orders/[id]   # Get order details
POST   /api/provider/custom-orders/[id]/price  # Submit pricing
```

---

## 9. Notifications

### Customer Notifications
| Event | Title (AR) | Title (EN) |
|-------|-----------|------------|
| pricing_received | تم تسعير طلبك | Your order has been priced |
| pricing_expired | انتهت مهلة الموافقة | Approval deadline expired |
| order_won | تم تأكيد طلبك | Your order is confirmed |

### Merchant Notifications
| Event | Title (AR) | Title (EN) |
|-------|-----------|------------|
| new_custom_order | طلب جديد بانتظار التسعير | New order awaiting pricing |
| pricing_deadline | تنبيه: الطلب سينتهي قريباً | Warning: Order expiring soon |
| order_lost | تم اختيار تاجر آخر | Another merchant was chosen |

---

## 10. Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database | 2-3 days | None |
| Phase 2: Backend | 3-4 days | Phase 1 |
| Phase 3: Customer UI | 4-5 days | Phase 2 |
| Phase 4: Merchant UI | 3-4 days | Phase 2 |
| Phase 5: Testing | 2-3 days | Phase 3, 4 |
| Phase 6: Admin | 2-3 days | Phase 5 |

**Total Estimated: 16-22 working days**

---

## 11. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Complex state management | Use Zustand store per order flow |
| Race conditions in broadcast | Database transactions + optimistic locking |
| Voice transcription errors | Show transcribed text for customer review |
| Merchant pricing delays | Auto-reminder notifications + expiry |
| Customer confusion | Clear UI states and progress indicators |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Claude | Initial plan with Triple Broadcast |

