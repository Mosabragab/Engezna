-- ============================================================================
-- Fix accept_provider_invitation for re-invited staff
-- إصلاح قبول الدعوة للموظفين المعاد دعوتهم
-- ============================================================================
-- Version: 1.0
-- Created: 2026-01-20
-- Description: Handle case where a deleted staff member is re-invited.
--              The function should allow re-adding previously deleted staff.
-- ============================================================================

-- Drop and recreate the function with proper handling
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
  v_existing_staff_id uuid;
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

  -- Check if user already has a staff record for this provider (even if deleted/inactive)
  SELECT id INTO v_existing_staff_id
  FROM public.provider_staff
  WHERE provider_id = v_invitation.provider_id
    AND user_id = v_user_id;

  IF v_existing_staff_id IS NOT NULL THEN
    -- Update existing staff record (re-activate)
    UPDATE public.provider_staff
    SET
      is_active = true,
      can_manage_orders = v_invitation.can_manage_orders,
      can_manage_menu = v_invitation.can_manage_menu,
      can_manage_customers = v_invitation.can_manage_customers,
      can_view_analytics = v_invitation.can_view_analytics,
      can_manage_offers = v_invitation.can_manage_offers,
      updated_at = now()
    WHERE id = v_existing_staff_id;
  ELSE
    -- Create new staff record
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
  END IF;

  -- Update user role to provider_staff if they're just a customer
  UPDATE public.profiles
  SET role = 'provider_staff', updated_at = now()
  WHERE id = v_user_id AND role = 'customer';

  -- Mark invitation as accepted
  UPDATE public.provider_invitations
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.accept_provider_invitation(uuid) IS
'Accept a provider staff invitation. Handles both new staff and re-invited (previously deleted) staff.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
