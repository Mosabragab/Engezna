# District-Based Delivery Pricing - Implementation Plan

## Overview

Implement a complete district-based delivery pricing system where each merchant (provider) can set different delivery fees per district/neighborhood. This replaces the current flat-rate delivery fee model.

## Current State (Before Changes)

- Each provider has a single `delivery_fee` column (flat rate for all customers)
- Districts system was deprecated - `district_id` always set to `null`
- GPS/LocationPicker used instead of district selection
- No `provider_delivery_zones` table existed
- Admin can manage districts but with bugs (sends non-existent `governorate_id`)
- Analytics pages had incorrect data (wrong provider status filter, wrong revenue field name)

## Implementation Status Summary

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Database - `provider_delivery_zones` Table | COMPLETED |
| Phase 2 | Admin Locations - District Management Fixes | COMPLETED |
| Phase 3 | Customer Address - District Dropdown | COMPLETED |
| Phase 4 | Provider Settings - Delivery Pricing Per District | COMPLETED |
| Phase 5 | Marketplace - ProviderCard & Cart Updates | COMPLETED |
| Phase 6 | Checkout Flow Updates | COMPLETED |
| Phase 7 | Analytics Updates | COMPLETED |
| Extra | Cart Page - Zone Detection | COMPLETED |
| Extra | Custom Orders - Zone-Based Pricing | COMPLETED |
| Extra | Analytics Data Fixes (Locations & Regions) | COMPLETED |

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

**Used in 6 files across the codebase:**
- `src/app/[locale]/cart/page.tsx` - Zone lookup for cart display
- `src/app/[locale]/checkout/page.tsx` - Zone lookup for fee calculation
- `src/app/[locale]/provider/settings/page.tsx` - CRUD operations
- `src/app/[locale]/providers/ProvidersClient.tsx` - Detect active zones
- `src/lib/orders/broadcast-service.ts` - Custom order zone pricing

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
5. Added "city name" column in districts table for better context
6. Ensured admin can manually add districts per city with Arabic/English names

---

### Phase 3: Customer Address - District Dropdown (Replacing GPS)

**Status: COMPLETED**

**Files Modified:**

- `src/app/[locale]/profile/addresses/page.tsx`

**Changes Made:**

1. Removed GPS LocationPicker component and import entirely
2. Added cascading dropdown: Governorate → City → District
3. `district_id` now saved in addresses table (was always null)
4. Removed `latitude`/`longitude` fields from form data
5. Address display shows district name (loaded via separate query for performance)
6. Validation requires governorate + city + district selection
7. District name saved in `area` field for backward compatibility
8. Edit mode loads cascading location data correctly (governorate → cities → districts)

---

### Phase 4: Provider Settings - Delivery Pricing Per District

**Status: COMPLETED**

**Files Modified:**

- `src/app/[locale]/provider/settings/page.tsx`

**Changes Made:**

1. Added "Delivery Fees by District" card in delivery tab
2. Provider can add districts from their city with custom delivery fees
3. Inline fee editing (change fee by typing and blurring via `handleUpdateZoneFee()`)
4. Delete individual district zones via `handleDeleteZone()`
5. Duplicate district prevention (unique constraint on provider_id + district_id)
6. Shows message when no districts registered for the provider's city
7. Default flat `delivery_fee` kept as fallback for districts without zone pricing

**Key Functions:**
- `loadDeliveryZones()` - Fetches existing zones with district names
- `handleAddZone()` - Inserts new zone
- `handleDeleteZone()` - Deletes zone
- `handleUpdateZoneFee()` - Updates fee inline on blur

---

### Phase 5: Marketplace - ProviderCard & Cart Updates

**Status: COMPLETED**

**Files Modified:**

- `src/components/customer/shared/ProviderCard.tsx`
- `src/app/[locale]/providers/ProvidersClient.tsx`

**Changes Made:**

1. ProviderCard: Shows "حسب الحي / By district" when provider has delivery zones
2. Added `has_delivery_zones` field to Provider interface
3. ProvidersClient: Queries `provider_delivery_zones` to detect which providers have zones
4. Falls back to showing flat fee for providers without zones

---

### Phase 6: Checkout Flow Updates

**Status: COMPLETED**

**Files Modified:**

- `src/app/[locale]/checkout/page.tsx`

**Changes Made:**

1. Added `zoneDeliveryFee` state for district-based pricing
2. `calculatedDeliveryFee` now uses zone fee when available, falls back to flat fee
3. Zone fee loaded automatically when saved address or new address district changes
4. `buildDeliveryAddressJson()` now includes `district_id`, `district_ar`, `district_en` for new addresses
5. Two useEffects: one for saved address zone lookup, one for new address zone lookup
6. Added district dropdown in checkout new-address form (cascading: Governorate → City → District)

---

### Phase 7: Analytics Updates

**Status: COMPLETED**

**Files Modified:**

- `src/components/admin/GeoFilter.tsx`
- `src/app/[locale]/admin/analytics/regions/page.tsx`

**Changes Made:**

1. Re-enabled district filter (was deprecated with `showDistrict = false`)
2. Added District interface and state
3. Districts loaded in parallel with governorates and cities
4. Cascading filter: Governorate → City → District
5. Both inline and stacked layouts support district filtering
6. Default `showDistrict = true`
7. Removed all deprecation comments
8. Fixed District interface - removed non-existent `governorate_id` field from analytics regions page

---

## Additional Implementations (Beyond Original Plan)

### Cart Page - Zone Detection

**Status: COMPLETED**

**File:** `src/app/[locale]/cart/page.tsx`

**Changes Made:**

1. Added `hasDeliveryZones` state to detect if the provider uses zone-based pricing
2. When zones exist, shows delivery fee placeholder instead of calculated fee (deferred to checkout)
3. Queries `provider_delivery_zones` count for the current provider
4. Prevents misleading flat fee display when provider uses district pricing

---

### Custom Orders - Zone-Based Pricing

**Status: COMPLETED**

**File:** `src/lib/orders/broadcast-service.ts`

**Changes Made:**

1. Creates `zoneFeesMap` for zone-based delivery fees per provider
2. Looks up zones for customer's district across multiple providers
3. Maps `provider_id → delivery_fee` for zone pricing
4. Used when creating broadcast custom orders to ensure correct delivery fee per provider

---

### Analytics Data Fixes (Locations & Regions)

**Status: COMPLETED**

**File:** `src/app/[locale]/admin/locations/page.tsx`

**Changes Made:**

1. **Provider status filter fix**: Changed from `status === 'active'` to include `['open', 'active', 'approved', 'closed', 'temporarily_paused']` — all 5 active providers in DB have status `'open'`, so old filter returned 0
2. **Revenue field fix**: Changed from `total_amount` (non-existent) to `total` (correct column) — revenue was showing as 0
3. **Customer counting**: Uses `profiles.governorate_id` to count customers per governorate (column confirmed to exist in DB)
4. **Valid orders filtering**: Excludes `cancelled`, `rejected`, `pending_payment` from order counts
5. **Growth rate calculation**: Compares valid orders in last 30 days vs previous 30 days
6. **Readiness score**: Multi-factor scoring (providers 40%, customers 30%, orders 20%, coverage 10%)
7. **District count resolution**: Districts resolved through city relationship since districts don't have direct `governorate_id`

---

## Bug Fixes Applied After Initial Implementation

| Commit | Description | Root Cause |
|--------|-------------|------------|
| `886edea` | Fix admin district management - broken governorate_id refs | Districts table has no `governorate_id` column; was sending invalid field |
| `297c61b` | Use zone-based delivery fee in cart & custom orders | Cart showed flat fee even when provider uses zones; custom orders ignored zones |
| `44635c4` | Add district dropdown in checkout, fix cart delivery fee display | Checkout new-address form had no district selection; cart fee display incorrect |
| `c3f5f27` | Remove non-existent governorate_id from districts query | Analytics regions page queried `districts.governorate_id` which doesn't exist |
| `5367ee1` | Remove governorate_id from District interface | TypeScript District interface included non-existent field |
| `49934fc` | Correct expansion analytics data fetching | Provider status filter `'active'` matched 0 providers (all are `'open'`); revenue field `total_amount` doesn't exist |
| `b34d822` | Restore customer counting from profiles table | Customer count changed to addresses-based query which returned 0; profiles.governorate_id exists and works |

---

## Database Schema Reference

### Existing Tables (Relevant)

| Table          | Key Columns                                            |
| -------------- | ------------------------------------------------------ |
| `governorates` | id, name_ar, name_en, is_active                        |
| `cities`       | id, governorate_id, name_ar, name_en, is_active        |
| `districts`    | id, city_id, name_ar, name_en, is_active               |
| `providers`    | id, delivery_fee, governorate_id, city_id, district_id, status |
| `profiles`     | id, role, governorate_id                               |
| `addresses`    | id, user_id, governorate_id, city_id, district_id      |
| `orders`       | id, delivery_fee, total, delivery_address (JSONB), status, created_at |

### New Table

| Table                     | Key Columns                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `provider_delivery_zones` | id, provider_id, district_id, delivery_fee, estimated_delivery_time_min, is_active |

### Provider Status Values

| Status | Meaning |
|--------|---------|
| `open` | Active and accepting orders (most common) |
| `active` | Alternative active status |
| `approved` | Approved but may not be fully active |
| `closed` | Temporarily closed |
| `temporarily_paused` | Paused by provider |
| `pending_approval` | Awaiting admin approval |

## Key Relationships

```
governorates (1) → (N) cities (1) → (N) districts
providers (1) → (N) provider_delivery_zones (N) ← (1) districts
addresses (N) → (1) districts
profiles (N) → (1) governorates
```

## Delivery Fee Resolution Order

1. Check `provider_delivery_zones` for matching provider + customer's district
2. If no match, use provider's flat `delivery_fee` from providers table
3. If provider has zones but customer's district is not served → use flat fee as fallback

## Files Modified (Complete List)

| File | Phases |
|------|--------|
| `src/app/[locale]/admin/locations/page.tsx` | Phase 2, Analytics Fixes |
| `src/app/[locale]/profile/addresses/page.tsx` | Phase 3 |
| `src/app/[locale]/provider/settings/page.tsx` | Phase 4 |
| `src/components/customer/shared/ProviderCard.tsx` | Phase 5 |
| `src/app/[locale]/providers/ProvidersClient.tsx` | Phase 5 |
| `src/app/[locale]/checkout/page.tsx` | Phase 6 |
| `src/app/[locale]/cart/page.tsx` | Extra (Cart Zone Detection) |
| `src/lib/orders/broadcast-service.ts` | Extra (Custom Orders) |
| `src/components/admin/GeoFilter.tsx` | Phase 7 |
| `src/app/[locale]/admin/analytics/regions/page.tsx` | Phase 7, Bug Fixes |
