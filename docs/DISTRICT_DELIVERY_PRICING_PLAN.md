# District-Based Delivery Pricing - Implementation Plan

## Overview
Implement a complete district-based delivery pricing system where each merchant (provider) can set different delivery fees per district/neighborhood. This replaces the current flat-rate delivery fee model.

## Current State (Before Changes)
- Each provider has a single `delivery_fee` column (flat rate for all customers)
- Districts system was deprecated - `district_id` always set to `null`
- GPS/LocationPicker used instead of district selection
- No `provider_delivery_zones` table existed
- Admin can manage districts but with bugs (sends non-existent `governorate_id`)

## Implementation Phases

---

### Phase 1: Database - `provider_delivery_zones` Table
**Status: COMPLETED**

Created table linking providers to districts with custom delivery pricing:
```sql
CREATE TABLE provider_delivery_zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
  district_id UUID REFERENCES districts(id) ON DELETE CASCADE NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL,
  estimated_delivery_time_min INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_id, district_id)
);
```

---

### Phase 2: Admin Locations - District Management Fixes
**Status: COMPLETED**

**Files Modified:**
- `src/app/[locale]/admin/locations/page.tsx`

**Changes Made:**
1. Fixed district creation - removed non-existent `governorate_id` from insert/update
2. Made `city_id` REQUIRED (was optional but DB column is NOT NULL)
3. Fixed district filtering - now uses city's `governorate_id` relationship
4. Improved district modal UX - city selection is required with clear validation
5. Added "districts count" display when navigating from city → districts
6. Ensured admin can manually add districts per city with Arabic/English names

**Bugs Fixed:**
- District insert was sending `governorate_id` which doesn't exist in districts table
- District filtering by `d.governorate_id` was broken (column doesn't exist)
- City was marked "optional" but `city_id` is NOT NULL in DB schema

---

### Phase 3: Customer Address - District Dropdown (Replacing GPS)
**Status: PENDING**

**Files to Modify:**
- `src/app/[locale]/profile/addresses/page.tsx`
- `src/components/maps/LocationPicker.tsx` (remove usage)

**Changes Planned:**
1. Remove GPS LocationPicker component from address form
2. Add cascading dropdown: Governorate → City → District
3. Save `district_id` in addresses table (currently always null)
4. Remove `latitude`/`longitude` from form data
5. Update address display to show district name

---

### Phase 4: Provider Settings - Delivery Pricing Per District
**Status: PENDING**

**Files to Modify:**
- `src/app/[locale]/provider/settings/page.tsx`

**Changes Planned:**
1. Add new section/tab for district-based delivery pricing
2. Provider selects districts they serve from their city
3. Provider sets custom delivery_fee per district
4. Keep existing flat `delivery_fee` as default/fallback
5. CRUD operations on `provider_delivery_zones` table

---

### Phase 5: Marketplace - ProviderCard & Cart Updates
**Status: PENDING**

**Files to Modify:**
- `src/components/customer/shared/ProviderCard.tsx`
- `src/lib/store/cart.ts`
- `src/app/[locale]/cart/page.tsx`

**Changes Planned:**
1. ProviderCard: Show "price varies by district" instead of fixed fee (when provider has zones)
2. Cart Store: Update `getTotal()` to use district-based pricing
3. Cart Page: Fetch delivery fee based on customer's selected address district

---

### Phase 6: Checkout Flow Updates
**Status: PENDING**

**Files to Modify:**
- `src/app/[locale]/checkout/page.tsx`
- `src/app/api/payment/kashier/initiate/route.ts`

**Changes Planned:**
1. Calculate delivery fee from `provider_delivery_zones` based on address district_id
2. Fall back to provider's flat `delivery_fee` if no zone match
3. Update `buildDeliveryAddressJson()` to include district info
4. Validate district is served by provider before order placement

---

### Phase 7: Analytics Updates
**Status: PENDING**

**Files to Modify:**
- `src/components/admin/GeoFilter.tsx`
- `src/app/[locale]/admin/analytics/page.tsx`
- `src/app/[locale]/provider/analytics/page.tsx`

**Changes Planned:**
1. Re-enable district filter in GeoFilter component
2. Add district-level analytics for admin
3. Add delivery zone analytics for providers (revenue per district)

---

## Database Schema Reference

### Existing Tables (Relevant)
| Table | Key Columns |
|-------|------------|
| `governorates` | id, name_ar, name_en, is_active |
| `cities` | id, governorate_id, name_ar, name_en, is_active |
| `districts` | id, city_id, name_ar, name_en, is_active |
| `providers` | id, delivery_fee, governorate_id, city_id, district_id |
| `addresses` | id, user_id, governorate_id, city_id, district_id |
| `orders` | id, delivery_fee, delivery_address (JSONB) |

### New Table
| Table | Key Columns |
|-------|------------|
| `provider_delivery_zones` | id, provider_id, district_id, delivery_fee, estimated_delivery_time_min, is_active |

## Key Relationships
```
governorates (1) → (N) cities (1) → (N) districts
providers (1) → (N) provider_delivery_zones (N) ← (1) districts
addresses (N) → (1) districts
```

## Delivery Fee Resolution Order
1. Check `provider_delivery_zones` for matching provider + customer's district
2. If no match, use provider's flat `delivery_fee` from providers table
3. If provider has zones but customer's district is not served → show error/block order
