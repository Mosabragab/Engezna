-- ============================================================================
-- SDUI: Homepage Sections Management System
-- ============================================================================
-- This migration creates the infrastructure for Server-Driven UI
-- Allows admins to control homepage layout without code changes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUM: Section Types
-- ----------------------------------------------------------------------------
CREATE TYPE homepage_section_type AS ENUM (
  'hero_search',        -- Search bar section
  'address_selector',   -- Address/location selector
  'offers_carousel',    -- Banners/offers carousel
  'categories',         -- Category icons grid
  'reorder',            -- Reorder last order section
  'top_rated',          -- Top rated providers
  'nearby',             -- Nearby providers
  'featured_products',  -- Featured products (future)
  'custom_html',        -- Custom HTML content (future)
  'announcement'        -- System announcements (future)
);

-- ----------------------------------------------------------------------------
-- TABLE: Homepage Sections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Section Identity
  section_type homepage_section_type NOT NULL,
  section_key TEXT UNIQUE NOT NULL,  -- e.g., 'hero_search', 'offers_carousel'

  -- Display Names (for admin UI)
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,

  -- Visibility & Order
  display_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,

  -- Role-based targeting (NULL = show to all)
  target_roles TEXT[],  -- ['customer', 'guest', 'provider_owner']

  -- Section-specific configuration (JSON)
  config JSONB DEFAULT '{}'::jsonb,
  -- Example config for offers_carousel:
  -- {
  --   "autoplay": true,
  --   "autoplayInterval": 5000,
  --   "showDots": true,
  --   "maxItems": 5
  -- }

  -- Section-specific content overrides (JSON)
  content JSONB DEFAULT '{}'::jsonb,
  -- Example content:
  -- {
  --   "ar": { "title": "العروض", "viewAllText": "عرض الكل" },
  --   "en": { "title": "Offers", "viewAllText": "View All" }
  -- }

  -- Scheduling (optional)
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,

  -- Geographic targeting (optional)
  target_governorates UUID[],
  target_cities UUID[],

  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_homepage_sections_visible ON public.homepage_sections(is_visible, display_order);
CREATE INDEX idx_homepage_sections_type ON public.homepage_sections(section_type);
CREATE INDEX idx_homepage_sections_key ON public.homepage_sections(section_key);

-- Trigger for updated_at
CREATE TRIGGER homepage_sections_updated_at
  BEFORE UPDATE ON public.homepage_sections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- TABLE: Homepage Section Drafts (for Preview Mode)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_section_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Reference to original section (NULL for new sections)
  section_id UUID REFERENCES public.homepage_sections(id) ON DELETE CASCADE,

  -- Draft data (complete copy of section data)
  draft_data JSONB NOT NULL,

  -- Draft metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),

  -- Preview token for sharing preview links
  preview_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex')
);

-- Index for cleanup of expired drafts
CREATE INDEX idx_homepage_drafts_expires ON public.homepage_section_drafts(expires_at);

-- ----------------------------------------------------------------------------
-- TABLE: Homepage Layout Versions (for rollback capability)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homepage_layout_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Version info
  version_number SERIAL,
  version_name TEXT,  -- Optional: "Ramadan Layout", "Summer Sale"

  -- Complete snapshot of all sections
  sections_snapshot JSONB NOT NULL,

  -- Metadata
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Is this the currently active version?
  is_active BOOLEAN DEFAULT false
);

-- Only one active version at a time
CREATE UNIQUE INDEX idx_homepage_layout_active ON public.homepage_layout_versions(is_active) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_section_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_layout_versions ENABLE ROW LEVEL SECURITY;

-- Everyone can read visible sections
CREATE POLICY "Anyone can view visible homepage sections"
  ON public.homepage_sections FOR SELECT
  USING (is_visible = true OR EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ));

-- Only admins can modify sections
CREATE POLICY "Admins can manage homepage sections"
  ON public.homepage_sections FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ));

-- Drafts: creator and admins can access
CREATE POLICY "Users can manage own drafts"
  ON public.homepage_section_drafts FOR ALL
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Layout versions: admins only
CREATE POLICY "Admins can manage layout versions"
  ON public.homepage_layout_versions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ));

-- ----------------------------------------------------------------------------
-- FUNCTION: Get active homepage sections for a user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_homepage_sections(
  p_user_role TEXT DEFAULT 'guest',
  p_governorate_id UUID DEFAULT NULL,
  p_city_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  section_type homepage_section_type,
  section_key TEXT,
  title_ar TEXT,
  title_en TEXT,
  config JSONB,
  content JSONB,
  display_order INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.section_type,
    s.section_key,
    s.title_ar,
    s.title_en,
    s.config,
    s.content,
    s.display_order
  FROM public.homepage_sections s
  WHERE
    s.is_visible = true
    -- Check scheduling
    AND (s.starts_at IS NULL OR s.starts_at <= now())
    AND (s.ends_at IS NULL OR s.ends_at > now())
    -- Check role targeting
    AND (s.target_roles IS NULL OR p_user_role = ANY(s.target_roles))
    -- Check geographic targeting
    AND (s.target_governorates IS NULL OR p_governorate_id = ANY(s.target_governorates))
    AND (s.target_cities IS NULL OR p_city_id = ANY(s.target_cities))
  ORDER BY s.display_order ASC;
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: Reorder sections (for drag & drop)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reorder_homepage_sections(
  p_section_orders JSONB  -- [{"id": "uuid", "order": 1}, ...]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item JSONB;
BEGIN
  -- Check admin permission
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update each section's order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_section_orders)
  LOOP
    UPDATE public.homepage_sections
    SET
      display_order = (v_item->>'order')::INT,
      updated_by = auth.uid(),
      updated_at = now()
    WHERE id = (v_item->>'id')::UUID;
  END LOOP;

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: Save layout version (for rollback)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_homepage_layout_version(
  p_version_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version_id UUID;
  v_snapshot JSONB;
BEGIN
  -- Check admin permission
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Create snapshot of current sections
  SELECT jsonb_agg(row_to_json(s))
  INTO v_snapshot
  FROM public.homepage_sections s
  ORDER BY s.display_order;

  -- Insert new version
  INSERT INTO public.homepage_layout_versions (version_name, sections_snapshot, created_by)
  VALUES (p_version_name, v_snapshot, auth.uid())
  RETURNING id INTO v_version_id;

  RETURN v_version_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- SEED DATA: Initial sections matching current homepage
-- ----------------------------------------------------------------------------
INSERT INTO public.homepage_sections (section_type, section_key, title_ar, title_en, description_ar, description_en, display_order, is_visible, config, content)
VALUES
  -- 1. Hero Search Section
  (
    'hero_search',
    'hero_search',
    'البحث',
    'Search',
    'شريط البحث الرئيسي',
    'Main search bar',
    1,
    true,
    '{"showAIButton": false}'::jsonb,
    '{"ar": {"placeholder": "ابحث عن مطعم أو منتج..."}, "en": {"placeholder": "Search for restaurant or product..."}}'::jsonb
  ),

  -- 2. Address Selector
  (
    'address_selector',
    'address_selector',
    'اختيار العنوان',
    'Address Selector',
    'اختيار عنوان التوصيل',
    'Delivery address selector',
    2,
    true,
    '{}'::jsonb,
    '{}'::jsonb
  ),

  -- 3. Offers Carousel (Banners)
  (
    'offers_carousel',
    'offers_carousel',
    'العروض والخصومات',
    'Offers & Discounts',
    'عرض البنرات والعروض الترويجية',
    'Display promotional banners and offers',
    3,
    true,
    '{"autoplay": true, "autoplayInterval": 5000, "showDots": true, "showViewAll": true}'::jsonb,
    '{"ar": {"viewAllText": "عرض الكل"}, "en": {"viewAllText": "View All"}}'::jsonb
  ),

  -- 4. Categories Section
  (
    'categories',
    'categories',
    'الأقسام',
    'Categories',
    'أقسام المتاجر (مطاعم، كافيهات، بقالة، خضار)',
    'Store categories (restaurants, cafes, grocery, vegetables)',
    4,
    true,
    '{"columns": 4, "showLabels": true}'::jsonb,
    '{}'::jsonb
  ),

  -- 5. Reorder Section (only for logged-in customers)
  (
    'reorder',
    'reorder',
    'أعد طلبك السابق',
    'Reorder',
    'إعادة طلب آخر طلب مكتمل',
    'Reorder your last completed order',
    5,
    true,
    '{}'::jsonb,
    '{"ar": {"title": "أعد طلبك السابق", "buttonText": "اطلب مرة أخرى"}, "en": {"title": "Reorder", "buttonText": "Order Again"}}'::jsonb
  ),

  -- 6. Top Rated Providers
  (
    'top_rated',
    'top_rated',
    'الأعلى تقييماً',
    'Top Rated',
    'المتاجر الأعلى تقييماً',
    'Highest rated stores',
    6,
    true,
    '{"maxItems": 6, "showRating": true, "showDeliveryFee": true}'::jsonb,
    '{"ar": {"title": "الأعلى تقييماً", "viewAllText": "عرض الكل"}, "en": {"title": "Top Rated", "viewAllText": "View All"}}'::jsonb
  ),

  -- 7. Nearby Providers
  (
    'nearby',
    'nearby',
    'القريبون منك',
    'Nearby',
    'المتاجر القريبة من موقعك',
    'Stores near your location',
    7,
    true,
    '{"maxItems": 6, "showDistance": true}'::jsonb,
    '{"ar": {"title": "القريبون منك", "viewAllText": "عرض الكل"}, "en": {"title": "Nearby", "viewAllText": "View All"}}'::jsonb
  )
ON CONFLICT (section_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- CLEANUP: Function to remove expired drafts (run periodically)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_drafts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM public.homepage_section_drafts
  WHERE expires_at < now();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
