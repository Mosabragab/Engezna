-- Performance indexes to eliminate excessive sequential scans
-- Based on Supabase Query Performance analysis showing:
--   governorates: 592K seq_scans vs 11K idx_scans
--   profiles: 366K seq_scans vs 442 idx_scans
--   homepage_banners: 46K seq_scans vs 30 idx_scans
--   support_tickets: 83K seq_scans vs 110 idx_scans
--   admin_users: 109K seq_scans vs 8K idx_scans
--   refunds: 70K seq_scans vs 2K idx_scans
--   subscription: 70K seq_scans vs 15K idx_scans

-- ============================================================================
-- 1. governorates - 592K seq_scans caused by LocationDataContext filtering is_active
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_governorates_is_active
  ON public.governorates (is_active)
  WHERE is_active = true;

-- ============================================================================
-- 2. cities - 51K seq_scans caused by LocationDataContext filtering is_active
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_cities_is_active_governorate
  ON public.cities (governorate_id, is_active)
  WHERE is_active = true;

-- ============================================================================
-- 3. profiles - 366K seq_scans caused by middleware RBAC check (.select('role').eq('id', user.id))
-- The PK index should handle eq(id), but adding a covering index for role
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_id_role
  ON public.profiles (id)
  INCLUDE (role, governorate_id, city_id);

-- ============================================================================
-- 4. homepage_banners - 46K seq_scans caused by banner queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_homepage_banners_active_type
  ON public.homepage_banners (is_active, banner_type, display_order)
  WHERE is_active = true;

-- ============================================================================
-- 5. support_tickets - 83K seq_scans caused by provider dashboard polling
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_support_tickets_provider_status
  ON public.support_tickets (provider_id, status)
  WHERE status IN ('open', 'in_progress');

-- ============================================================================
-- 6. refunds - 70K seq_scans caused by provider dashboard polling
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_refunds_provider_pending
  ON public.refunds (provider_id, status, provider_action)
  WHERE status = 'pending' AND provider_action = 'pending';

-- ============================================================================
-- 7. provider_notifications - polled every 60s (was 5s) for unread count
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_provider_notifications_unread
  ON public.provider_notifications (provider_id, is_read)
  WHERE is_read = false;

-- ============================================================================
-- 8. customer_notifications - polled for unread count
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customer_notifications_unread
  ON public.customer_notifications (customer_id, is_read)
  WHERE is_read = false;

-- ============================================================================
-- 9. orders - polled for pending count and on_hold count
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_provider_pending
  ON public.orders (provider_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_provider_settlement_status
  ON public.orders (provider_id, settlement_status)
  WHERE settlement_status = 'on_hold';

-- ============================================================================
-- 10. admin_users - 109K seq_scans
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id
  ON public.admin_users (id);

-- ============================================================================
-- 11. providers - index on city_id and governorate_id for homepage queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_providers_city_status
  ON public.providers (city_id, status)
  WHERE status IN ('open', 'closed');

CREATE INDEX IF NOT EXISTS idx_providers_governorate_status
  ON public.providers (governorate_id, status)
  WHERE status IN ('open', 'closed');
