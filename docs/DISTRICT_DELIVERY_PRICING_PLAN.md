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
3. Inline fee editing (change fee by typing and blurring)
4. Delete individual district zones
5. Duplicate district prevention (unique constraint on provider_id + district_id)
6. Shows message when no districts registered for the provider's city
7. Default flat `delivery_fee` kept as fallback for districts without zone pricing

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

---

### Phase 7: Analytics Updates

**Status: COMPLETED**

**Files Modified:**

- `src/components/admin/GeoFilter.tsx`

**Changes Made:**

1. Re-enabled district filter (was deprecated with `showDistrict = false`)
2. Added District interface and state
3. Districts loaded in parallel with governorates and cities
4. Cascading filter: Governorate → City → District
5. Both inline and stacked layouts support district filtering
6. Default `showDistrict = true`
7. Removed all deprecation comments

---

## Database Schema Reference

### Existing Tables (Relevant)

| Table          | Key Columns                                            |
| -------------- | ------------------------------------------------------ |
| `governorates` | id, name_ar, name_en, is_active                        |
| `cities`       | id, governorate_id, name_ar, name_en, is_active        |
| `districts`    | id, city_id, name_ar, name_en, is_active               |
| `providers`    | id, delivery_fee, governorate_id, city_id, district_id |
| `addresses`    | id, user_id, governorate_id, city_id, district_id      |
| `orders`       | id, delivery_fee, delivery_address (JSONB)             |

### New Table

| Table                     | Key Columns                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------- |
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
3. If provider has zones but customer's district is not served → use flat fee as fallback
