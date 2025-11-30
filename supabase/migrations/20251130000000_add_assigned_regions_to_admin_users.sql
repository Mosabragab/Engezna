-- ============================================================================
-- Migration: Add assigned_regions to admin_users table
-- Description: Adds geographic region assignment capability for supervisors
-- Created: 2025-11-30
-- ============================================================================

-- Add assigned_regions column to admin_users table
-- This allows supervisors to be assigned to specific governorates, cities, or districts
-- Empty array means full access to all regions

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS assigned_regions JSONB DEFAULT '[]'::JSONB;

-- Create index for faster region-based queries
CREATE INDEX IF NOT EXISTS idx_admin_users_assigned_regions ON admin_users USING GIN (assigned_regions);

-- Add comment for documentation
COMMENT ON COLUMN public.admin_users.assigned_regions IS 'Array of region assignments for this supervisor. Each entry has governorate_id, city_id (optional), and district_id (optional). Empty array means access to all regions.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
