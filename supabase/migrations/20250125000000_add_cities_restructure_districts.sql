-- ============================================================================
-- Migration: Add Cities Table & Restructure Districts
-- ============================================================================
-- Version: 1.1
-- Created: 2025-01-25
-- Description:
--   1. Creates update_updated_at_column() function (alias for handle_updated_at)
--   2. Creates cities table for Egyptian centers (مراكز/مدن)
--   3. Restructures districts to properly reference cities
--   4. Moves center data from districts to cities table
--
-- Egyptian Administrative Structure:
--   محافظة (Governorate) → مركز/مدينة (Center/City) → حي (District/Neighborhood)
-- ============================================================================

-- ============================================================================
-- STEP 1: Create the missing update_updated_at_column function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Create cities table for centers (مراكز)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  governorate_id UUID NOT NULL REFERENCES public.governorates(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure unique city names within a governorate
  UNIQUE(governorate_id, name_ar),
  UNIQUE(governorate_id, name_en)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cities_governorate ON public.cities(governorate_id);
CREATE INDEX IF NOT EXISTS idx_cities_name_ar ON public.cities(name_ar);

-- Add trigger for updated_at
CREATE TRIGGER update_cities_updated_at
  BEFORE UPDATE ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 3: Add city_id column to districts table
-- ============================================================================
-- First, add the new column (nullable initially)
ALTER TABLE public.districts
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_districts_city ON public.districts(city_id);

-- ============================================================================
-- STEP 4: Insert cities from districts (where name starts with مركز)
-- ============================================================================
-- Insert centers into cities table
INSERT INTO public.cities (governorate_id, name_ar, name_en, is_active)
SELECT DISTINCT
  governorate_id,
  name_ar,
  name_en,
  is_active
FROM public.districts
WHERE name_ar LIKE 'مركز%'
ON CONFLICT (governorate_id, name_ar) DO NOTHING;

-- ============================================================================
-- STEP 5: Delete centers from districts table (after moving to cities)
-- ============================================================================
DELETE FROM public.districts
WHERE name_ar LIKE 'مركز%';

-- ============================================================================
-- STEP 6: Add Row Level Security (RLS) for cities table
-- ============================================================================
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Everyone can view active cities
CREATE POLICY "Anyone can view active cities"
  ON public.cities
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage cities
CREATE POLICY "Admins can manage cities"
  ON public.cities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 7: Add RLS policies for districts if not exists
-- ============================================================================
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

-- Everyone can view active districts
DROP POLICY IF EXISTS "Anyone can view active districts" ON public.districts;
CREATE POLICY "Anyone can view active districts"
  ON public.districts
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage districts
DROP POLICY IF EXISTS "Admins can manage districts" ON public.districts;
CREATE POLICY "Admins can manage districts"
  ON public.districts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 8: Add RLS policies for governorates if not exists
-- ============================================================================
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;

-- Everyone can view active governorates
DROP POLICY IF EXISTS "Anyone can view active governorates" ON public.governorates;
CREATE POLICY "Anyone can view active governorates"
  ON public.governorates
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage governorates
DROP POLICY IF EXISTS "Admins can manage governorates" ON public.governorates;
CREATE POLICY "Admins can manage governorates"
  ON public.governorates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- Add updated_at trigger for governorates and districts if not exists
-- ============================================================================
DROP TRIGGER IF EXISTS update_governorates_updated_at ON public.governorates;
CREATE TRIGGER update_governorates_updated_at
  BEFORE UPDATE ON public.governorates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_districts_updated_at ON public.districts;
CREATE TRIGGER update_districts_updated_at
  BEFORE UPDATE ON public.districts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================
COMMENT ON TABLE public.cities IS 'Egyptian centers/cities (مراكز/مدن) - administrative divisions within governorates';
COMMENT ON COLUMN public.cities.governorate_id IS 'Reference to the parent governorate (محافظة)';
COMMENT ON COLUMN public.cities.name_ar IS 'Arabic name of the center/city';
COMMENT ON COLUMN public.cities.name_en IS 'English name of the center/city';

COMMENT ON TABLE public.districts IS 'Egyptian districts/neighborhoods (أحياء) - administrative divisions within cities';
COMMENT ON COLUMN public.districts.city_id IS 'Reference to the parent city/center (مركز/مدينة)';
