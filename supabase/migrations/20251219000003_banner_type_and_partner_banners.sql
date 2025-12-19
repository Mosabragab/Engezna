-- ═══════════════════════════════════════════════════════════════════════════
-- Banner Type Migration
-- Add support for different banner types (customer/partner)
-- ═══════════════════════════════════════════════════════════════════════════

-- Create enum for banner type
DO $$ BEGIN
  CREATE TYPE banner_type AS ENUM ('customer', 'partner');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add banner_type column to homepage_banners
ALTER TABLE public.homepage_banners
ADD COLUMN IF NOT EXISTS banner_type banner_type DEFAULT 'customer';

-- Create index for banner_type filtering
CREATE INDEX IF NOT EXISTS idx_homepage_banners_type ON public.homepage_banners(banner_type);

-- Comment on column
COMMENT ON COLUMN public.homepage_banners.banner_type IS 'Type of banner: customer (homepage) or partner (partner landing page)';

-- ═══════════════════════════════════════════════════════════════════════════
-- Update RPC function to support banner_type
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_banners_for_location(
  p_governorate_id UUID DEFAULT NULL,
  p_city_id UUID DEFAULT NULL,
  p_banner_type banner_type DEFAULT 'customer'
)
RETURNS SETOF public.homepage_banners
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.homepage_banners
  WHERE is_active = true
    AND banner_type = p_banner_type
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at >= NOW())
    AND (
      -- National banners (no location restriction)
      (governorate_id IS NULL AND city_id IS NULL)
      OR
      -- Governorate-level banners
      (governorate_id = p_governorate_id AND city_id IS NULL)
      OR
      -- City-level banners
      (governorate_id = p_governorate_id AND city_id = p_city_id)
    )
  ORDER BY display_order ASC;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Insert Sample Partner Banners
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO public.homepage_banners (
  title_ar, title_en,
  description_ar, description_en,
  badge_text_ar, badge_text_en,
  gradient_start, gradient_end,
  cta_text_ar, cta_text_en,
  link_url, image_position,
  has_glassmorphism, display_order,
  is_active, banner_type
) VALUES
(
  'انضم لأكبر منصة توصيل',
  'Join the Largest Delivery Platform',
  'سجل متجرك الآن واحصل على شهر مجاني بدون عمولة',
  'Register your store now and get one month free without commission',
  'شهر مجاني',
  'Free Month',
  '#009DE0', '#0077B6',
  'سجل الآن', 'Register Now',
  '/partner/register', 'end',
  true, 0,
  true, 'partner'
),
(
  'وصّل لعملاء جدد',
  'Reach New Customers',
  'أكثر من 10,000 عميل نشط في انتظار خدماتك',
  'More than 10,000 active customers waiting for your services',
  '+10K عميل',
  '+10K Customers',
  '#00C27A', '#00A066',
  'ابدأ البيع', 'Start Selling',
  '/partner/register', 'end',
  true, 1,
  true, 'partner'
),
(
  'لوحة تحكم متكاملة',
  'Complete Dashboard',
  'تتبع طلباتك وأرباحك وإحصائياتك في مكان واحد',
  'Track your orders, earnings, and statistics in one place',
  'مجاني 100%',
  '100% Free',
  '#8B5CF6', '#7C3AED',
  'اكتشف المزيد', 'Learn More',
  '/partner/register', 'end',
  true, 2,
  true, 'partner'
);
