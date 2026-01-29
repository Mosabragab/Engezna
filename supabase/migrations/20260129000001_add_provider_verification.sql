-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Add Provider Verification System
-- Date: 2026-01-29
-- Description: Adds is_verified column to providers table for account verification
-- ═══════════════════════════════════════════════════════════════════════════

-- SECTION 1: ADD is_verified COLUMN TO PROVIDERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Add is_verified column with default false
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Add index for filtering verified providers
CREATE INDEX IF NOT EXISTS idx_providers_is_verified
ON providers(is_verified)
WHERE is_verified = TRUE;

-- SECTION 2: MARK EXISTING TEST ACCOUNTS AS VERIFIED (OPTIONAL)
-- ═══════════════════════════════════════════════════════════════════════════

-- Uncomment below to mark all existing approved providers as verified
-- UPDATE providers SET is_verified = TRUE WHERE status IN ('approved', 'open', 'closed');

-- SECTION 3: ADD VERIFICATION METADATA (OPTIONAL FOR FUTURE)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add columns for tracking verification details
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- SECTION 4: COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN providers.is_verified IS 'Indicates if the provider has been verified by admin (business license, identity, etc.)';
COMMENT ON COLUMN providers.verified_at IS 'Timestamp when the provider was verified';
COMMENT ON COLUMN providers.verified_by IS 'Admin user who verified the provider';

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION WORKFLOW:
-- 1. Provider registers → is_verified = FALSE
-- 2. Admin reviews documents/business license
-- 3. Admin toggles is_verified = TRUE in admin panel
-- 4. Provider sees "Verified" badge on their dashboard
-- 5. Customers see "Verified" badge on store page
-- ═══════════════════════════════════════════════════════════════════════════
