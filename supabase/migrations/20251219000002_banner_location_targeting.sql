-- ═══════════════════════════════════════════════════════════════════════════
-- Banner Location Targeting Migration
-- استهداف البانرات حسب الموقع الجغرافي
-- ═══════════════════════════════════════════════════════════════════════════
-- This migration adds location targeting to homepage banners
-- Banners can now be targeted to:
--   1. All Egypt (governorate_id = NULL, city_id = NULL)
--   2. Specific Governorate (governorate_id = X, city_id = NULL)
--   3. Specific City (governorate_id = X, city_id = Y)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add location targeting columns to homepage_banners
ALTER TABLE public.homepage_banners
ADD COLUMN IF NOT EXISTS governorate_id UUID REFERENCES public.governorates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

-- Add index for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_homepage_banners_governorate ON public.homepage_banners(governorate_id) WHERE governorate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_homepage_banners_city ON public.homepage_banners(city_id) WHERE city_id IS NOT NULL;

-- Add composite index for location filtering
CREATE INDEX IF NOT EXISTS idx_homepage_banners_location ON public.homepage_banners(governorate_id, city_id);

-- Comment on columns for documentation
COMMENT ON COLUMN public.homepage_banners.governorate_id IS 'Target governorate for the banner. NULL = show to all governorates';
COMMENT ON COLUMN public.homepage_banners.city_id IS 'Target city for the banner. NULL = show to all cities in the governorate';

-- ═══════════════════════════════════════════════════════════════════════════
-- Function to get banners for a specific location
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_banners_for_location(
  p_governorate_id UUID DEFAULT NULL,
  p_city_id UUID DEFAULT NULL
)
RETURNS SETOF public.homepage_banners
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.homepage_banners
  WHERE is_active = true
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at >= NOW())
    AND (
      -- National banners (no location restriction)
      (governorate_id IS NULL AND city_id IS NULL)
      OR
      -- Governorate-level banners (matches user's governorate, no city restriction)
      (governorate_id = p_governorate_id AND city_id IS NULL)
      OR
      -- City-level banners (matches user's exact city)
      (governorate_id = p_governorate_id AND city_id = p_city_id)
    )
  ORDER BY display_order ASC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_banners_for_location TO anon, authenticated;
