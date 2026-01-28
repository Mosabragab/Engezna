-- ============================================================================
-- SDUI Provider Dashboard
-- Adds SDUI support for provider dashboard page
-- ============================================================================

-- Add provider_dashboard to page type enum
ALTER TYPE sdui_page_type ADD VALUE IF NOT EXISTS 'provider_dashboard';

-- Add provider dashboard section types
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'dashboard_stats';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'dashboard_orders';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'dashboard_revenue';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'dashboard_menu';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'dashboard_reviews';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'dashboard_notifications';
