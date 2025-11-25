-- ============================================================================
-- Migration: Cleanup Districts - Remove Centers
-- ============================================================================
-- Version: 1.2
-- Created: 2025-01-25
-- Description:
--   1. Creates update_updated_at_column() function (fixes Step 6 error)
--   2. Removes centers (مراكز) from districts table (already in cities table)
--
-- Egyptian Administrative Structure:
--   محافظات (Governorates) → مراكز/مدن (Cities - already populated) → أحياء (Districts)
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
-- STEP 2: Delete centers from districts table
-- Centers (مراكز) are already in the cities table, remove them from districts
-- ============================================================================
DELETE FROM public.districts
WHERE name_ar LIKE 'مركز%';

-- Verify: After this migration, districts should only contain actual neighborhoods (أحياء)
-- like: حي وسط البلد, حي صلاح سالم, حي الجامعة, etc.
