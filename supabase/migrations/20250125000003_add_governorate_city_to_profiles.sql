-- ============================================================================
-- Migration: Add Governorate and City to Profiles
-- ============================================================================
-- Version: 1.0
-- Created: 2025-01-25
-- Description:
--   Adds governorate_id and city_id columns to profiles table for location-based
--   service filtering. Users can select their governorate and city in settings.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add governorate_id and city_id columns to profiles table
-- ============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS governorate_id UUID REFERENCES public.governorates(id),
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id);

-- ============================================================================
-- STEP 2: Add indexes for better query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_governorate_id ON public.profiles(governorate_id);
CREATE INDEX IF NOT EXISTS idx_profiles_city_id ON public.profiles(city_id);

-- ============================================================================
-- STEP 3: Add comments for documentation
-- ============================================================================
COMMENT ON COLUMN public.profiles.governorate_id IS 'User''s selected governorate for location-based service filtering';
COMMENT ON COLUMN public.profiles.city_id IS 'User''s selected city/center for location-based service filtering';
