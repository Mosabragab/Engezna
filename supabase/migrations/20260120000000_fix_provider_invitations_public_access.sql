-- ============================================================================
-- Fix Provider Invitations Public Access
-- إصلاح الوصول العام لدعوات الموظفين
-- ============================================================================
-- Version: 1.0
-- Created: 2026-01-20
-- Description: Add RLS policy to allow unauthenticated users to view pending
--              invitations by token so they can complete registration.
-- ============================================================================

-- Drop the policy if it exists (to allow re-running)
DROP POLICY IF EXISTS "Public can view pending invitations by token" ON public.provider_invitations;

-- Allow unauthenticated users to view pending, non-expired invitations
-- This is necessary because when a new employee clicks the invitation link,
-- they are not authenticated yet and need to see the invitation to register.
CREATE POLICY "Public can view pending invitations by token"
ON public.provider_invitations
FOR SELECT
USING (
  status = 'pending'
  AND expires_at > NOW()
);

-- Add comment for documentation
COMMENT ON POLICY "Public can view pending invitations by token" ON public.provider_invitations IS
'Allows unauthenticated users to view pending invitations for registration. Limited to pending status and non-expired invitations only.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
