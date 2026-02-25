-- Fix unused indexes based on 24-hour usage analysis
-- Data shows 9 of 14 indexes have 0 idx_scan after 24 hours
--
-- Root causes identified:
--   1. PK already handles the query (profiles)
--   2. Table too small for index benefit (governorates ~27 rows)
--   3. PostgREST doesn't leverage covering indexes (product_variants)
--   4. Partial WHERE clause doesn't match actual queries (providers, banners)
--   5. Only used in UPDATE with PK, not SELECT (orders settlement)
--   6. Query fetches all rows without matching filters (refunds, notifications)

-- ============================================================================
-- PHASE 1: Drop redundant/useless indexes (0 scans, no fix possible)
-- ============================================================================

-- profiles: PK index on (id) already handles .eq('id', userId) in middleware
-- A covering index on (id) INCLUDE (role) is redundant when PK is the lookup key
DROP INDEX IF EXISTS idx_profiles_id_role;

-- governorates: Only ~27 rows (Egypt governorates). Sequential scan is faster
-- than index overhead for tables under ~100 rows
DROP INDEX IF EXISTS idx_governorates_is_active;

-- product_variants: PostgREST lateral joins don't leverage covering indexes
-- The base index on product_id (FK) already handles the lookup
DROP INDEX IF EXISTS idx_product_variants_product_covering;

-- orders settlement: Only used in UPDATE...WHERE id = X AND settlement_status = 'on_hold'
-- The PK lookup on id already finds the row; the settlement_status is just a guard
DROP INDEX IF EXISTS idx_orders_provider_settlement_status;

-- refunds: Admin query fetches ALL refunds with .order('created_at', {ascending: false})
-- No provider_id, status, or provider_action filters are applied
DROP INDEX IF EXISTS idx_refunds_provider_pending;

-- homepage_banners: Primary code path uses RPC get_banners_for_location()
-- Fallback query rarely executes. Table is also very small.
DROP INDEX IF EXISTS idx_homepage_banners_active_type;

-- ============================================================================
-- PHASE 2: Redesign indexes with query-index mismatch
-- ============================================================================

-- providers city: Old index had WHERE status IN ('open','closed') but queries
-- often filter by city_id WITHOUT status, or use different status combinations.
-- PostgREST IN() generates ANY() which doesn't match partial index WHERE clause.
DROP INDEX IF EXISTS idx_providers_city_status;
CREATE INDEX IF NOT EXISTS idx_providers_city_id
  ON public.providers (city_id);

-- providers governorate: Same mismatch as city index
DROP INDEX IF EXISTS idx_providers_governorate_status;
CREATE INDEX IF NOT EXISTS idx_providers_governorate_id
  ON public.providers (governorate_id);

-- customer_notifications: Old index was (customer_id, is_read) WHERE is_read = false
-- But the actual query is: .eq('customer_id', userId).order('created_at', desc).limit(50)
-- It fetches ALL notifications (read + unread), not just unread ones.
-- New index matches the actual query pattern.
DROP INDEX IF EXISTS idx_customer_notifications_unread;
CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_created
  ON public.customer_notifications (customer_id, created_at DESC);
