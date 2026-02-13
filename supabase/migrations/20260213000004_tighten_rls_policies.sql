-- ============================================
-- 1.5.10: Tighten overly permissive RLS policies
-- ============================================
-- Issues found during security audit:
-- 1. profiles: SELECT true (exposes email/phone to everyone including anonymous)
-- 2. promo_codes: SELECT true (exposes inactive/unpublished promo codes)
-- 3. provider_invitations: redundant broad SELECT policy
-- ============================================

-- ================================================
-- Phase 1: Fix profiles SELECT (true → authenticated only)
-- ================================================
-- Changed from "true" to "auth.uid() IS NOT NULL" to prevent
-- anonymous access to user data (email, phone, full_name).
-- This is a Phase 1.5 interim fix; further column-level
-- restrictions should be applied post-launch after auditing
-- all client queries that join on profiles.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Authenticated users can view profiles"
ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ================================================
-- Phase 2: Fix promo_codes SELECT (true → active only)
-- ================================================
-- Regular users can only see active promo codes within
-- their validity period. Admins can see all codes.
DROP POLICY IF EXISTS "Anyone can view promo codes for validation" ON promo_codes;

CREATE POLICY "Users can view active promo codes"
ON promo_codes FOR SELECT
USING (
  is_admin(auth.uid())
  OR (
    is_active = true
    AND valid_from <= now()
    AND (valid_until IS NULL OR valid_until >= now())
  )
);

-- ================================================
-- Phase 3: Remove redundant provider_invitations policy
-- ================================================
-- "Users can view invitation by token" allowed ANY authenticated
-- user to read ALL invitations. This is redundant because:
-- - Owners see their invitations via "Owners can view invitations"
-- - Invitees see by email via "Users can view invitations sent to their email"
-- - Public access for pending invitations via "Public can view pending invitations by token"
DROP POLICY IF EXISTS "Users can view invitation by token" ON provider_invitations;
