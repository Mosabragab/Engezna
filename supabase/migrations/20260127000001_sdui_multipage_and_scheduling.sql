-- ============================================================================
-- SDUI: Multi-Page Support and Scheduling System
-- ============================================================================
-- This migration extends the SDUI system to support multiple pages:
-- - Offers page
-- - Welcome page
-- And adds scheduling capabilities
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUM: Page Types for SDUI
-- ----------------------------------------------------------------------------
CREATE TYPE sdui_page_type AS ENUM (
  'homepage',
  'offers',
  'welcome',
  'providers',
  'search'
);

-- ----------------------------------------------------------------------------
-- Add page column to homepage_sections (rename table conceptually)
-- ----------------------------------------------------------------------------
ALTER TABLE public.homepage_sections
ADD COLUMN IF NOT EXISTS page sdui_page_type DEFAULT 'homepage';

-- Update existing records to explicitly set page
UPDATE public.homepage_sections SET page = 'homepage' WHERE page IS NULL;

-- ----------------------------------------------------------------------------
-- Add scheduling columns if not exist
-- ----------------------------------------------------------------------------
ALTER TABLE public.homepage_sections
ADD COLUMN IF NOT EXISTS schedule_rules JSONB DEFAULT '{}';
-- schedule_rules example:
-- {
--   "days_of_week": [0, 1, 2, 3, 4, 5, 6],  -- 0=Sunday, 6=Saturday
--   "start_time": "06:00",
--   "end_time": "23:00",
--   "timezone": "Africa/Cairo"
-- }

-- ----------------------------------------------------------------------------
-- Update indexes for multi-page support
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_homepage_sections_visible;
CREATE INDEX idx_sdui_sections_page_visible ON public.homepage_sections(page, is_visible, display_order);

-- ----------------------------------------------------------------------------
-- New section types for offers and welcome pages
-- ----------------------------------------------------------------------------
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'offers_hero';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'promo_codes';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'free_delivery';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'flash_deals';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'category_offers';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'welcome_hero';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'welcome_categories';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'welcome_features';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'welcome_steps';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'welcome_governorates';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'welcome_cta';
ALTER TYPE homepage_section_type ADD VALUE IF NOT EXISTS 'welcome_partners';

-- ----------------------------------------------------------------------------
-- FUNCTION: Get sections for any page (updated)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_page_sections(
  p_page TEXT DEFAULT 'homepage',
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
DECLARE
  v_current_time TIME;
  v_current_day INT;
BEGIN
  -- Get current time info for scheduling
  v_current_time := LOCALTIME AT TIME ZONE 'Africa/Cairo';
  v_current_day := EXTRACT(DOW FROM CURRENT_DATE AT TIME ZONE 'Africa/Cairo');

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
    s.page::TEXT = p_page
    AND s.is_visible = true
    -- Check scheduling (date range)
    AND (s.starts_at IS NULL OR s.starts_at <= now())
    AND (s.ends_at IS NULL OR s.ends_at > now())
    -- Check role targeting
    AND (s.target_roles IS NULL OR p_user_role = ANY(s.target_roles))
    -- Check geographic targeting
    AND (s.target_governorates IS NULL OR p_governorate_id = ANY(s.target_governorates))
    AND (s.target_cities IS NULL OR p_city_id = ANY(s.target_cities))
    -- Check time-based scheduling
    AND (
      s.schedule_rules = '{}'::jsonb
      OR s.schedule_rules IS NULL
      OR (
        -- Check day of week
        (
          s.schedule_rules->'days_of_week' IS NULL
          OR v_current_day = ANY(ARRAY(SELECT jsonb_array_elements_text(s.schedule_rules->'days_of_week')::INT))
        )
        -- Check time range
        AND (
          s.schedule_rules->>'start_time' IS NULL
          OR v_current_time >= (s.schedule_rules->>'start_time')::TIME
        )
        AND (
          s.schedule_rules->>'end_time' IS NULL
          OR v_current_time <= (s.schedule_rules->>'end_time')::TIME
        )
      )
    )
  ORDER BY s.display_order ASC;
END;
$$;

-- Keep backward compatibility with old function name
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
  RETURN QUERY SELECT * FROM public.get_page_sections('homepage', p_user_role, p_governorate_id, p_city_id);
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: Reorder sections for any page
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reorder_page_sections(
  p_page TEXT,
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

  -- Update each section's order (only for the specified page)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_section_orders)
  LOOP
    UPDATE public.homepage_sections
    SET
      display_order = (v_item->>'order')::INT,
      updated_by = auth.uid(),
      updated_at = now()
    WHERE id = (v_item->>'id')::UUID
      AND page::TEXT = p_page;
  END LOOP;

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- SEED DATA: Offers Page Sections
-- ----------------------------------------------------------------------------
INSERT INTO public.homepage_sections (page, section_type, section_key, title_ar, title_en, description_ar, description_en, display_order, is_visible, config, content)
VALUES
  -- 1. Featured Offer Hero Banner
  (
    'offers',
    'offers_hero',
    'offers_hero',
    'العرض المميز',
    'Featured Offer',
    'بانر العرض الرئيسي',
    'Main featured offer banner',
    1,
    true,
    '{"showCode": true, "bgGradient": "from-primary via-primary to-cyan-500"}'::jsonb,
    '{
      "ar": {
        "badge": "عرض اليوم",
        "title": "خصم 50% على أول طلب!",
        "description": "استخدم الكود WELCOME50 واحصل على خصم 50% على طلبك الأول",
        "code": "WELCOME50",
        "buttonText": "اطلب الآن"
      },
      "en": {
        "badge": "Today''s Deal",
        "title": "50% OFF First Order!",
        "description": "Use code WELCOME50 and get 50% off your first order",
        "code": "WELCOME50",
        "buttonText": "Order Now"
      }
    }'::jsonb
  ),

  -- 2. Promo Codes Section
  (
    'offers',
    'promo_codes',
    'promo_codes',
    'أكواد الخصم',
    'Promo Codes',
    'قائمة أكواد الخصم النشطة',
    'Active promo codes list',
    2,
    true,
    '{"maxItems": 5, "showExpiry": true}'::jsonb,
    '{"ar": {"title": "أكواد الخصم", "emptyText": "لا توجد أكواد خصم حالياً"}, "en": {"title": "Discount Codes", "emptyText": "No discount codes available"}}'::jsonb
  ),

  -- 3. Free Delivery Providers
  (
    'offers',
    'free_delivery',
    'free_delivery',
    'توصيل مجاني',
    'Free Delivery',
    'متاجر بتوصيل مجاني',
    'Stores with free delivery',
    3,
    true,
    '{"maxItems": 6, "showRating": true}'::jsonb,
    '{"ar": {"title": "توصيل مجاني", "emptyText": "لا توجد متاجر بتوصيل مجاني حالياً"}, "en": {"title": "Free Delivery", "emptyText": "No free delivery stores available"}}'::jsonb
  ),

  -- 4. Flash Deals (scheduled section example)
  (
    'offers',
    'flash_deals',
    'flash_deals',
    'عروض سريعة',
    'Flash Deals',
    'عروض لفترة محدودة',
    'Limited time flash deals',
    4,
    true,
    '{"maxItems": 4, "showCountdown": true}'::jsonb,
    '{"ar": {"title": "عروض سريعة", "emptyText": "لا توجد عروض سريعة حالياً"}, "en": {"title": "Flash Deals", "emptyText": "No flash deals available"}}'::jsonb
  )
ON CONFLICT (section_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED DATA: Welcome Page Sections
-- ----------------------------------------------------------------------------
INSERT INTO public.homepage_sections (page, section_type, section_key, title_ar, title_en, description_ar, description_en, display_order, is_visible, config, content)
VALUES
  -- 1. Welcome Hero Section
  (
    'welcome',
    'welcome_hero',
    'welcome_hero',
    'الصفحة الرئيسية',
    'Hero Section',
    'قسم الترحيب الرئيسي',
    'Main welcome hero section',
    1,
    true,
    '{"showLogo": true, "showLoginLink": true}'::jsonb,
    '{
      "ar": {
        "title": "عايز تطلب؟ إنجزنا!",
        "subtitle": "لتلبية احتياجات بيتك اليومية من أقرب تاجر - بدون رسوم خدمة",
        "ctaText": "اختر موقعك للبدء",
        "loginText": "لديك حساب؟",
        "loginLink": "سجل دخول"
      },
      "en": {
        "title": "Want to order? Engezna!",
        "subtitle": "For your daily home essentials from the nearest merchant - no service fees",
        "ctaText": "Select Your Location to Start",
        "loginText": "Have an account?",
        "loginLink": "Sign in"
      }
    }'::jsonb
  ),

  -- 2. Categories Section
  (
    'welcome',
    'welcome_categories',
    'welcome_categories',
    'ماذا نقدم',
    'What We Offer',
    'أقسام الخدمات المتاحة',
    'Available service categories',
    2,
    true,
    '{"columns": 5, "showAnimation": true}'::jsonb,
    '{
      "ar": {"title": "ماذا نقدم؟"},
      "en": {"title": "What We Offer"}
    }'::jsonb
  ),

  -- 3. Features Section
  (
    'welcome',
    'welcome_features',
    'welcome_features',
    'مميزات إنجزنا',
    'Why Engezna',
    'مميزات التطبيق',
    'Application features',
    3,
    true,
    '{"columns": 3, "showAnimation": true}'::jsonb,
    '{
      "ar": {
        "title": "ليه إنجزنا؟",
        "subtitle": "تجربة طلب مختلفة - سهلة وسريعة ومن غير رسوم خدمة"
      },
      "en": {
        "title": "Why Engezna?",
        "subtitle": "A different ordering experience - easy, fast, and with no service fees"
      }
    }'::jsonb
  ),

  -- 4. How It Works Section
  (
    'welcome',
    'welcome_steps',
    'welcome_steps',
    'كيف يعمل',
    'How It Works',
    'خطوات استخدام التطبيق',
    'Application usage steps',
    4,
    true,
    '{"showNumbers": true, "showConnectors": true}'::jsonb,
    '{
      "ar": {
        "title": "كيف يعمل؟",
        "subtitle": "ثلاث خطوات بسيطة فقط"
      },
      "en": {
        "title": "How It Works",
        "subtitle": "Just three simple steps"
      }
    }'::jsonb
  ),

  -- 5. Available Governorates Section
  (
    'welcome',
    'welcome_governorates',
    'welcome_governorates',
    'المحافظات المتاحة',
    'Available Governorates',
    'المحافظات التي نخدمها',
    'Governorates we serve',
    5,
    true,
    '{"showMap": false, "showAnimation": true}'::jsonb,
    '{
      "ar": {
        "title": "متاحين في",
        "subtitle": "نتوسع باستمرار - قريباً في محافظات أكثر!"
      },
      "en": {
        "title": "Available In",
        "subtitle": "We are constantly expanding - coming soon to more governorates!"
      }
    }'::jsonb
  ),

  -- 6. Final CTA Section
  (
    'welcome',
    'welcome_cta',
    'welcome_cta',
    'ابدأ الآن',
    'Start Now',
    'دعوة للتسجيل',
    'Call to action section',
    6,
    true,
    '{"showButton": true}'::jsonb,
    '{
      "ar": {
        "title": "جاهز تبدأ؟",
        "subtitle": "اختر موقعك وابدأ تصفح المتاجر المتاحة في منطقتك",
        "buttonText": "اختر موقعك الآن"
      },
      "en": {
        "title": "Ready to Start?",
        "subtitle": "Select your location and start browsing available stores in your area",
        "buttonText": "Select Your Location Now"
      }
    }'::jsonb
  ),

  -- 7. Partner CTA Section
  (
    'welcome',
    'welcome_partners',
    'welcome_partners',
    'انضم كشريك',
    'Join as Partner',
    'دعوة للتجار',
    'Partner invitation section',
    7,
    true,
    '{"showIcon": true}'::jsonb,
    '{
      "ar": {
        "title": "أنت صاحب متجر أو مطعم؟",
        "linkText": "انضم كشريك - 3 شهور بدون عمولة"
      },
      "en": {
        "title": "Own a store or restaurant?",
        "linkText": "Join as a Partner - 3 months with 0% commission"
      }
    }'::jsonb
  )
ON CONFLICT (section_key) DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
