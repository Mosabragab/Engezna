-- ============================================================================
-- Migration: Add Partner Registration Fields
-- ============================================================================
-- Version: 1.0
-- Created: 2026-01-03
-- Description:
--   Adds fields required for partner/merchant registration:
--   1. partner_role column to profiles table (owner/manager)
--   2. 'incomplete' status to provider_status enum
-- ============================================================================

-- ============================================================================
-- STEP 1: Add 'incomplete' value to provider_status enum
-- ============================================================================
-- This status is used for newly registered merchants who haven't completed their store setup
ALTER TYPE provider_status ADD VALUE IF NOT EXISTS 'incomplete';

-- ============================================================================
-- STEP 2: Add partner_role column to profiles table
-- ============================================================================
-- partner_role indicates whether the merchant is the owner or manager of the store
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS partner_role TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.partner_role IS 'Role of the partner/merchant in their business (owner/manager)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
