# Admin Provider Management — Fix Plan

**Created:** 2026-02-11
**Total Issues:** 9
**Status:** COMPLETED

---

## P0 — Critical (3)

### 1. RLS Security Vulnerability: `OR true` exposes all providers

- **Status:** DONE
- **File:** `supabase/migrations/20260211100000_fix_providers_rls.sql`
- **Problem:** Policy `owners_can_view_own_provider` has condition `(owner_id = auth.uid()) OR true` — any authenticated user can see ALL providers including bank details (IBAN, account_number)
- **Fix:** Migration drops 4 vulnerable/duplicate policies, keeps clean set of 4 SELECT policies
- **Note:** Run migration in Supabase SQL Editor to apply

### 2. `approveProvider` sets status to `'approved'` — provider disappears

- **Status:** DONE
- **Files:** `src/lib/admin/providers.ts`, `src/hooks/admin/useAdminProviders.ts`
- **Problem:** RLS only shows `open|closed|temporarily_paused|on_vacation` to customers. Status `'approved'` is invisible to public.
- **Fix:** Changed `approveProvider` to set status `'open'`. Updated optimistic update in hook.

### 3. `total_orders`, `rating`, `total_reviews` are fake seed data

- **Status:** DONE
- **File:** `src/app/[locale]/admin/providers/[id]/page.tsx`
- **Problem:** Admin detail reads cached `providers.total_orders` (1,850) instead of counting from `orders` table (actual: 1). Rating 4.6 (203 reviews) is also seed data.
- **Fix:** Stats grid now uses live queries from `orders` and `reviews` tables

---

## P1 — High (3)

### 4. "Recent Orders" section is empty despite orders existing

- **Status:** DONE
- **File:** `src/app/[locale]/admin/providers/[id]/page.tsx`
- **Problem:** Query joined `users!customer_id(full_name)` — but `users` is `auth.users` (no `full_name`). FK points to `profiles`.
- **Fix:** Separate queries: orders first, then profiles for customer names (avoids nullable FK JOIN issue)

### 5. `'suspended'` status in code but not in ENUM

- **Status:** DONE
- **Files:** `src/lib/admin/types.ts`, `src/lib/admin/providers.ts`, `src/hooks/admin/useAdminProviders.ts`, `src/app/[locale]/admin/providers/[id]/page.tsx`
- **Fix:** Removed all `'suspended'` references. `suspendProvider` already correctly uses `'temporarily_paused'`. Optimistic update in hook fixed to match.

### 6. Duplicate/conflicting RLS policies (6 SELECT policies, need 4)

- **Status:** DONE (fixed together with #1)
- **File:** `supabase/migrations/20260211100000_fix_providers_rls.sql`
- **Fix:** Drops 4 policies: `owners_can_view_own_provider`, `Allow public read access`, `providers_select_active`, `Owners can view all own providers`

---

## P2 — Medium (3)

### 7. Commission accepts 0-100% — should be max 7%

- **Status:** DONE
- **Files:** `src/lib/admin/providers.ts`, `src/app/[locale]/admin/providers/[id]/page.tsx`, `supabase/migrations/20260211100000_fix_providers_rls.sql`
- **Fix:** Server validation changed to 0-7%. UI input max changed to 7. DB CHECK constraint added via migration.

### 8. Category shows raw code `restaurant_cafe` instead of Arabic name

- **Status:** DONE
- **File:** `src/app/[locale]/admin/providers/[id]/page.tsx`
- **Fix:** `getCategoryLabel` now uses `BUSINESS_CATEGORIES` constants to translate codes to Arabic/English names

### 9. Important data hidden from admin UI

- **Status:** DONE
- **File:** `src/app/[locale]/admin/providers/[id]/page.tsx`
- **Added sections:**
  - Grace Period & Commission Status (commission_status, grace_period_start/end, commission_rate)
  - Bank Details (bank_name, account_holder_name, account_number, iban)
  - Delivery & Pickup Settings (operation_mode, supports_pickup, delivery_fee, min_order_amount)

---

## Files Modified

| File                                                       | Changes                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `supabase/migrations/20260211100000_fix_providers_rls.sql` | NEW — drops 4 RLS policies + adds commission CHECK constraint               |
| `src/lib/admin/providers.ts`                               | approve→open, commission cap 0-7%, remove suspended from reactivate         |
| `src/lib/admin/types.ts`                                   | Remove 'suspended' from ProviderStatus, DashboardStats, labels              |
| `src/hooks/admin/useAdminProviders.ts`                     | Optimistic updates: approved→open, suspended→temporarily_paused             |
| `src/app/[locale]/admin/providers/[id]/page.tsx`           | Live stats, fix orders query, category labels, commission cap, new sections |
