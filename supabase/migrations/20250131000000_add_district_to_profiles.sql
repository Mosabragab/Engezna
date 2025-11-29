-- ============================================================================
-- Migration: Add District to Profiles
-- ============================================================================
-- Version: 1.0
-- Created: 2025-01-31
-- Description:
--   Adds district_id column to profiles table for location-based
--   service filtering. Users can select their district/neighborhood (الحي/المنطقة)
--   in settings along with governorate and city.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add district_id column to profiles table
-- ============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id);

-- ============================================================================
-- STEP 2: Add index for better query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_district_id ON public.profiles(district_id);

-- ============================================================================
-- STEP 3: Add comment for documentation
-- ============================================================================
COMMENT ON COLUMN public.profiles.district_id IS 'User''s selected district/neighborhood (الحي/المنطقة) for location-based service filtering';
