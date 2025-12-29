-- ============================================================================
-- Provider Team Management System Migration
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. ADD NEW COLUMNS TO provider_staff
-- ============================================================================

-- Add can_manage_customers column
ALTER TABLE public.provider_staff
ADD COLUMN IF NOT EXISTS can_manage_customers boolean DEFAULT false;

-- Add can_manage_offers column
ALTER TABLE public.provider_staff
ADD COLUMN IF NOT EXISTS can_manage_offers boolean DEFAULT false;

-- ============================================================================
-- 2. CREATE provider_invitations TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.provider_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id uuid REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,

  -- Invitation Details
  email text NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Permissions (same as provider_staff)
  can_manage_orders boolean DEFAULT true,
  can_manage_menu boolean DEFAULT true,
  can_manage_customers boolean DEFAULT false,
  can_view_analytics boolean DEFAULT false,
  can_manage_offers boolean DEFAULT false,

  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),

  -- Token for accepting invitation
  invitation_token uuid DEFAULT gen_random_uuid() UNIQUE,

  -- Expiry (7 days from creation)
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),

  -- Tracking
  accepted_at timestamp with time zone,
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Prevent duplicate pending invitations
  UNIQUE(provider_id, email, status)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_provider_invitations_provider ON public.provider_invitations(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_email ON public.provider_invitations(email);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_token ON public.provider_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_status ON public.provider_invitations(status);

-- Enable RLS
ALTER TABLE public.provider_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS POLICIES FOR provider_invitations
-- ============================================================================

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Owners can view invitations" ON public.provider_invitations;
DROP POLICY IF EXISTS "Owners can create invitations" ON public.provider_invitations;
DROP POLICY IF EXISTS "Owners can update invitations" ON public.provider_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.provider_invitations;

-- Owners can view invitations for their provider
CREATE POLICY "Owners can view invitations"
  ON public.provider_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.providers
      WHERE id = provider_invitations.provider_id
      AND owner_id = auth.uid()
    )
  );

-- Owners can create invitations
CREATE POLICY "Owners can create invitations"
  ON public.provider_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.providers
      WHERE id = provider_invitations.provider_id
      AND owner_id = auth.uid()
    )
  );

-- Owners can update invitations (cancel)
CREATE POLICY "Owners can update invitations"
  ON public.provider_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.providers
      WHERE id = provider_invitations.provider_id
      AND owner_id = auth.uid()
    )
  );

-- Users can view invitations sent to their email
CREATE POLICY "Users can view invitations sent to their email"
  ON public.provider_invitations FOR SELECT
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to create invitation
CREATE OR REPLACE FUNCTION public.create_provider_invitation(
  p_provider_id uuid,
  p_email text,
  p_can_manage_orders boolean DEFAULT true,
  p_can_manage_menu boolean DEFAULT true,
  p_can_manage_customers boolean DEFAULT false,
  p_can_view_analytics boolean DEFAULT false,
  p_can_manage_offers boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_id uuid;
  v_owner_id uuid;
  v_existing_user uuid;
  v_staff_count int;
BEGIN
  -- Check if caller is the provider owner
  SELECT owner_id INTO v_owner_id
  FROM public.providers
  WHERE id = p_provider_id;

  IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the provider owner can send invitations';
  END IF;

  -- Check staff limit (owner + 2 staff = 3 max)
  SELECT COUNT(*) INTO v_staff_count
  FROM public.provider_staff
  WHERE provider_id = p_provider_id AND is_active = true;

  IF v_staff_count >= 3 THEN
    RAISE EXCEPTION 'Maximum staff limit reached (3 members including owner)';
  END IF;

  -- Check if email already has active staff record
  SELECT ps.user_id INTO v_existing_user
  FROM public.provider_staff ps
  JOIN public.profiles p ON p.id = ps.user_id
  WHERE ps.provider_id = p_provider_id
  AND p.email = p_email
  AND ps.is_active = true;

  IF v_existing_user IS NOT NULL THEN
    RAISE EXCEPTION 'This email already has an active staff record';
  END IF;

  -- Cancel any existing pending invitations for this email
  UPDATE public.provider_invitations
  SET status = 'cancelled', updated_at = now()
  WHERE provider_id = p_provider_id
  AND email = p_email
  AND status = 'pending';

  -- Create new invitation
  INSERT INTO public.provider_invitations (
    provider_id,
    email,
    invited_by,
    can_manage_orders,
    can_manage_menu,
    can_manage_customers,
    can_view_analytics,
    can_manage_offers
  ) VALUES (
    p_provider_id,
    p_email,
    auth.uid(),
    p_can_manage_orders,
    p_can_manage_menu,
    p_can_manage_customers,
    p_can_view_analytics,
    p_can_manage_offers
  )
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_provider_invitation(
  p_invitation_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation record;
  v_user_email text;
  v_user_id uuid;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  SELECT email INTO v_user_email FROM public.profiles WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM public.provider_invitations
  WHERE invitation_token = p_invitation_token
  AND status = 'pending'
  AND expires_at > now();

  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Check email matches
  IF v_invitation.email != v_user_email THEN
    RAISE EXCEPTION 'This invitation was sent to a different email address';
  END IF;

  -- Create staff record
  INSERT INTO public.provider_staff (
    provider_id,
    user_id,
    role,
    can_manage_orders,
    can_manage_menu,
    can_manage_customers,
    can_view_analytics,
    can_manage_offers,
    is_active
  ) VALUES (
    v_invitation.provider_id,
    v_user_id,
    'staff',
    v_invitation.can_manage_orders,
    v_invitation.can_manage_menu,
    v_invitation.can_manage_customers,
    v_invitation.can_view_analytics,
    v_invitation.can_manage_offers,
    true
  );

  -- Update user role to provider_staff if they're just a customer
  UPDATE public.profiles
  SET role = 'provider_staff'
  WHERE id = v_user_id AND role = 'customer';

  -- Mark invitation as accepted
  UPDATE public.provider_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by = v_user_id,
    updated_at = now()
  WHERE id = v_invitation.id;

  RETURN true;
END;
$$;

-- Function to deactivate staff member
CREATE OR REPLACE FUNCTION public.deactivate_staff_member(
  p_staff_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff record;
  v_owner_id uuid;
BEGIN
  -- Get staff record
  SELECT * INTO v_staff
  FROM public.provider_staff
  WHERE id = p_staff_id;

  IF v_staff IS NULL THEN
    RAISE EXCEPTION 'Staff record not found';
  END IF;

  -- Check if caller is the provider owner
  SELECT owner_id INTO v_owner_id
  FROM public.providers
  WHERE id = v_staff.provider_id;

  IF v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the provider owner can deactivate staff';
  END IF;

  -- Cannot deactivate owner
  IF v_staff.role = 'owner' THEN
    RAISE EXCEPTION 'Cannot deactivate the owner';
  END IF;

  -- Deactivate staff
  UPDATE public.provider_staff
  SET is_active = false, updated_at = now()
  WHERE id = p_staff_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- 5. UPDATE TRIGGER FOR provider_invitations
-- ============================================================================

CREATE TRIGGER provider_invitations_updated_at
  BEFORE UPDATE ON public.provider_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- DONE! Migration completed successfully
-- ============================================================================
