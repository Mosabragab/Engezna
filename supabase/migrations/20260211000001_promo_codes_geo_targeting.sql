-- ============================================================================
-- P1: Promo Codes Geo-Targeting
-- Adds governorate and city targeting to promo codes (like banners system)
-- ============================================================================

-- Step 1: Add location columns
ALTER TABLE public.promo_codes
ADD COLUMN IF NOT EXISTS governorate_id UUID REFERENCES public.governorates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL;

-- Step 2: Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_promo_codes_governorate ON public.promo_codes(governorate_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_city ON public.promo_codes(city_id);

-- Step 3: Comment for documentation
COMMENT ON COLUMN public.promo_codes.governorate_id IS 'Target governorate (NULL = all Egypt)';
COMMENT ON COLUMN public.promo_codes.city_id IS 'Target city within governorate (NULL = all cities in governorate)';
