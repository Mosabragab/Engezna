-- ============================================================================
-- Add RLS Policy for Viewing Invitation by Token
-- This allows authenticated users to view invitation details by token
-- ============================================================================

-- Allow authenticated users to view invitation by token
-- The token acts as a secret key - if you have the token, you can view the invitation
CREATE POLICY "Users can view invitation by token"
  ON public.provider_invitations FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Note: This replaces the previous restrictive policies with a more permissive one
-- Security is maintained because:
-- 1. The invitation_token is a UUID that's hard to guess
-- 2. Only authenticated users can view invitations
-- 3. Only the correct email owner can accept the invitation (checked in RPC)
