# Promotions & Banners System Improvements Plan

## Overview

This plan covers 11 improvements identified during the review of the promotions (promo codes) and banners systems. Each item includes scope, files affected, and implementation status.

---

## P1: Geo-Targeting for Promo Codes

**Status:** DONE
**Priority:** High
**Files:**

- `supabase/migrations/20260211000001_promo_codes_geo_targeting.sql` (NEW)
- `src/app/[locale]/admin/promotions/page.tsx` (MODIFY)
- `src/app/[locale]/checkout/page.tsx` (MODIFY)

**Changes:**

1. Migration: Add `governorate_id` and `city_id` columns to `promo_codes` table
2. Admin UI: Add governorate/city dropdowns in create/edit modal (reuses GeoFilter component from banners)
3. Checkout: Add location check (14th validation) - compares customer's delivery governorate/city with promo code targeting

---

## P2: Edit Promo Codes in Admin

**Status:** DONE
**Priority:** High
**Files:**

- `src/app/[locale]/admin/promotions/page.tsx` (MODIFY)

**Changes:**

1. Add edit button (blue pencil icon) to each promo row
2. Open create modal pre-filled with promo data
3. Use update instead of insert when editing (`editingPromoId` state)
4. Modal title and submit button change based on mode (Create/Edit)

---

## P3: Create Promotions Table Migration

**Status:** DONE
**Priority:** High
**Files:**

- `supabase/migrations/20260211000002_promotions_table.sql` (NEW)

**Changes:**

1. Created migration documenting the existing `promotions` table structure (15 columns)
2. Uses `CREATE TABLE IF NOT EXISTS` to be safe with existing DB
3. Includes indexes and column comments

---

## P4: Expose Hidden Promo Fields in Admin UI

**Status:** DONE
**Priority:** Medium
**Files:**

- `src/app/[locale]/admin/promotions/page.tsx` (MODIFY)

**Changes:**

1. `first_order_only` checkbox toggle
2. `per_user_limit` number input (was hardcoded to 1)
3. `applicable_categories` toggle-chip multi-select (7 categories)
4. `applicable_providers` searchable multi-select with tag display
5. Targeting badges shown in table (Geo, 1st Order, Categories count, Providers count)

---

## P5: Server-Side Promo Validation API

**Status:** DONE
**Priority:** Medium
**Files:**

- `src/app/api/promo/validate/route.ts` (NEW)

**Changes:**

1. POST endpoint accepts: code, user_id, provider_id, subtotal, governorate_id, city_id, provider_category
2. Runs all 10 validation checks server-side (active, dates, min order, usage limit, per-user, first order, categories, providers, geo-targeting)
3. Returns: valid/invalid, discount_amount, error_code
4. In-memory rate limiting: 10 req/min per IP

---

## P6: Fix Promo Transaction Safety

**Status:** DONE
**Priority:** Medium
**Files:**

- `src/app/[locale]/checkout/page.tsx` (MODIFY)

**Changes:**

1. Record promo usage BEFORE order creation (optimistic lock on usage_count)
2. If order creation fails, rollback: delete usage record + restore usage_count
3. After successful order, link usage record to order_id

---

## P7: Banner Analytics (Impressions/Clicks)

**Status:** DONE
**Priority:** Medium
**Files:**

- `supabase/migrations/20260211000003_banner_analytics.sql` (NEW)
- `src/app/api/banners/track/route.ts` (NEW)
- `src/components/customer/home/OffersCarousel.tsx` (MODIFY)
- `src/app/[locale]/admin/banners/page.tsx` (MODIFY)

**Changes:**

1. Migration: `banner_analytics` table with RLS (anyone inserts, admins read)
2. API: Lightweight POST `/api/banners/track` for fire-and-forget event recording
3. Carousel: `trackBannerEvent()` fires impression on banner view, click on CTA link
4. Admin: Shows impressions, clicks, and CTR per banner in list

---

## P8: Banner Image Cleanup on Delete

**Status:** DONE
**Priority:** Low
**Files:**

- `src/app/[locale]/admin/banners/page.tsx` (MODIFY)

**Changes:**

1. Before deleting banner record, extracts image path from `image_url`
2. Deletes from Supabase Storage `public-assets` bucket
3. Image cleanup failure doesn't block record deletion

---

## P9: Draft System for Provider Banners

**Status:** DONE
**Priority:** Low
**Files:**

- `src/app/[locale]/provider/banner/page.tsx` (MODIFY)

**Changes:**

1. Auto-saves form data to localStorage (`engezna_banner_draft`) on change
2. Restores from localStorage on page load (auto-opens form if draft exists)
3. Clears localStorage on successful submission
4. Only saves during new banner creation (not edit mode)

---

## P10: Banner Caching and Pagination

**Status:** DONE
**Priority:** Low
**Files:**

- `src/app/[locale]/admin/banners/page.tsx` (MODIFY)

**Changes:**

1. Admin: Pagination with 20 per page, Previous/Next controls, page counter
2. Resets to page 1 when filters change

---

## P11: Enhanced Banner Approvals Page

**Status:** DONE
**Priority:** Low
**Files:**

- `src/app/[locale]/admin/banners/approvals/page.tsx` (MODIFY)

**Changes:**

1. Search by provider name or banner title
2. 5 rejection reason templates (clickable chips that populate the reason field)
3. Bulk approve/reject with checkboxes and Select All
4. Bulk actions toolbar appears when items are selected

---

## Execution Order (Completed)

1. P1 + P2 + P4 (Promo code improvements - one pass through admin page)
2. P3 (Promotions migration)
3. P5 + P6 (Server-side validation + transaction safety)
4. P7 (Banner analytics)
5. P8 + P9 + P10 + P11 (Banner improvements)
