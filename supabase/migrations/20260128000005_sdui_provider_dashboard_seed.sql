-- ============================================================================
-- SDUI Provider Dashboard - Seed Data
-- Run this AFTER 20260128000004_sdui_provider_dashboard.sql
-- ============================================================================

-- Insert provider dashboard sections
INSERT INTO public.homepage_sections (
  page,
  section_type,
  section_key,
  title_ar,
  title_en,
  config,
  content,
  display_order,
  is_visible
) VALUES
-- Stats cards
(
  'provider_dashboard',
  'dashboard_stats',
  'dashboard_stats',
  'إحصائيات سريعة',
  'Quick Stats',
  '{"showTodayOrders": true, "showTodayRevenue": true, "showPendingOrders": true, "showRating": true}'::jsonb,
  '{"ar": {"todayOrders": "طلبات اليوم", "todayRevenue": "إيرادات اليوم", "pendingOrders": "طلبات معلقة", "rating": "التقييم"}, "en": {"todayOrders": "Today Orders", "todayRevenue": "Today Revenue", "pendingOrders": "Pending Orders", "rating": "Rating"}}'::jsonb,
  1,
  true
),
-- Recent orders
(
  'provider_dashboard',
  'dashboard_orders',
  'dashboard_orders',
  'الطلبات الأخيرة',
  'Recent Orders',
  '{"maxItems": 5, "showStatus": true, "showCustomer": true}'::jsonb,
  '{"ar": {"title": "الطلبات الأخيرة", "viewAll": "عرض الكل", "noOrders": "لا توجد طلبات"}, "en": {"title": "Recent Orders", "viewAll": "View All", "noOrders": "No orders"}}'::jsonb,
  2,
  true
),
-- Revenue chart
(
  'provider_dashboard',
  'dashboard_revenue',
  'dashboard_revenue',
  'الإيرادات',
  'Revenue Chart',
  '{"period": "week", "showComparison": true}'::jsonb,
  '{"ar": {"title": "الإيرادات", "thisWeek": "هذا الأسبوع", "lastWeek": "الأسبوع الماضي"}, "en": {"title": "Revenue", "thisWeek": "This Week", "lastWeek": "Last Week"}}'::jsonb,
  3,
  true
),
-- Menu performance
(
  'provider_dashboard',
  'dashboard_menu',
  'dashboard_menu',
  'أداء المنيو',
  'Menu Performance',
  '{"maxItems": 5, "showSales": true, "showRating": true}'::jsonb,
  '{"ar": {"title": "الأكثر مبيعاً", "sales": "مبيعات", "rating": "تقييم"}, "en": {"title": "Top Selling", "sales": "Sales", "rating": "Rating"}}'::jsonb,
  4,
  true
),
-- Reviews section
(
  'provider_dashboard',
  'dashboard_reviews',
  'dashboard_reviews',
  'التقييمات الأخيرة',
  'Recent Reviews',
  '{"maxItems": 3, "showReply": true}'::jsonb,
  '{"ar": {"title": "التقييمات الأخيرة", "viewAll": "عرض الكل", "reply": "رد"}, "en": {"title": "Recent Reviews", "viewAll": "View All", "reply": "Reply"}}'::jsonb,
  5,
  true
),
-- Notifications
(
  'provider_dashboard',
  'dashboard_notifications',
  'dashboard_notifications',
  'الإشعارات',
  'Notifications',
  '{"maxItems": 5, "showUnreadOnly": false}'::jsonb,
  '{"ar": {"title": "الإشعارات", "markAllRead": "تحديد الكل كمقروء"}, "en": {"title": "Notifications", "markAllRead": "Mark All Read"}}'::jsonb,
  6,
  true
);
