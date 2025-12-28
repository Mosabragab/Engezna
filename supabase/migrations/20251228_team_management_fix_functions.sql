-- ============================================================================
-- Fix RPC Functions to Return Expected JSON Format
-- Run this AFTER the initial team management migration
-- ============================================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.create_provider_invitation(uuid, text, boolean, boolean, boolean, boolean, boolean);
DROP FUNCTION IF EXISTS public.deactivate_staff_member(uuid);

-- ============================================================================
-- 1. FIXED: create_provider_invitation - Returns JSON with success, user_exists, user_name
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_provider_invitation(
  p_provider_id uuid,
  p_email text,
  p_can_manage_orders boolean DEFAULT true,
  p_can_manage_menu boolean DEFAULT true,
  p_can_manage_customers boolean DEFAULT false,
  p_can_view_analytics boolean DEFAULT false,
  p_can_manage_offers boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_id uuid;
  v_owner_id uuid;
  v_existing_user record;
  v_staff_count int;
  v_pending_count int;
BEGIN
  -- Check if caller is the provider owner
  SELECT owner_id INTO v_owner_id
  FROM public.providers
  WHERE id = p_provider_id;

  IF v_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Provider not found');
  END IF;

  IF v_owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the provider owner can send invitations');
  END IF;

  -- Check staff limit (owner + 2 staff = 3 max)
  SELECT COUNT(*) INTO v_staff_count
  FROM public.provider_staff
  WHERE provider_id = p_provider_id AND is_active = true;

  SELECT COUNT(*) INTO v_pending_count
  FROM public.provider_invitations
  WHERE provider_id = p_provider_id AND status = 'pending';

  IF v_staff_count + v_pending_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum staff limit reached (3 members including owner)');
  END IF;

  -- Check if email already has active staff record
  SELECT p.id, p.full_name, p.email INTO v_existing_user
  FROM public.profiles p
  JOIN public.provider_staff ps ON ps.user_id = p.id
  WHERE ps.provider_id = p_provider_id
  AND LOWER(p.email) = LOWER(p_email)
  AND ps.is_active = true;

  IF v_existing_user.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This email already has an active staff record');
  END IF;

  -- Check if user exists in system
  SELECT id, full_name, email INTO v_existing_user
  FROM public.profiles
  WHERE LOWER(email) = LOWER(p_email);

  -- Cancel any existing pending invitations for this email
  UPDATE public.provider_invitations
  SET status = 'cancelled', updated_at = now()
  WHERE provider_id = p_provider_id
  AND LOWER(email) = LOWER(p_email)
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
    LOWER(p_email),
    auth.uid(),
    p_can_manage_orders,
    p_can_manage_menu,
    p_can_manage_customers,
    p_can_view_analytics,
    p_can_manage_offers
  )
  RETURNING id INTO v_invitation_id;

  -- Return success with user info
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'user_exists', v_existing_user.id IS NOT NULL,
    'user_name', COALESCE(v_existing_user.full_name, null)
  );
END;
$$;

-- ============================================================================
-- 2. FIXED: deactivate_staff_member - Returns JSON with success
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deactivate_staff_member(
  p_staff_id uuid
)
RETURNS jsonb
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
    RETURN jsonb_build_object('success', false, 'error', 'Staff record not found');
  END IF;

  -- Check if caller is the provider owner
  SELECT owner_id INTO v_owner_id
  FROM public.providers
  WHERE id = v_staff.provider_id;

  IF v_owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the provider owner can deactivate staff');
  END IF;

  -- Cannot deactivate owner
  IF v_staff.role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot deactivate the owner');
  END IF;

  -- Deactivate staff
  UPDATE public.provider_staff
  SET is_active = false, updated_at = now()
  WHERE id = p_staff_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- 3. accept_provider_invitation - Returns JSON with success
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_provider_invitation(
  p_invitation_token uuid
)
RETURNS jsonb
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
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM public.provider_invitations
  WHERE invitation_token = p_invitation_token
  AND status = 'pending'
  AND expires_at > now();

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check email matches
  IF LOWER(v_invitation.email) != LOWER(v_user_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation was sent to a different email address');
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

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- DONE! Functions updated successfully
-- ============================================================================
