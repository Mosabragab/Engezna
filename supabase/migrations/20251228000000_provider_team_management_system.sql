-- ============================================================================
-- Provider Team Management System Migration
-- نظام إدارة فريق عمل المتجر
-- ============================================================================
-- Version: 1.0
-- Created: 2025-12-28
-- Description: Adds supervisor management capabilities for store owners
--   - New permissions: can_manage_customers, can_manage_offers
--   - Provider invitations table for pending invites
--   - Audit trail: updated_by columns
--   - Enhanced RLS policies for team access
-- ============================================================================

-- ============================================================================
-- PART 1: ADD NEW PERMISSIONS TO provider_staff
-- ============================================================================

-- Add can_manage_customers permission (view customer data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_staff' AND column_name = 'can_manage_customers'
  ) THEN
    ALTER TABLE public.provider_staff ADD COLUMN can_manage_customers BOOLEAN DEFAULT false;
    COMMENT ON COLUMN public.provider_staff.can_manage_customers IS 'Permission to view customer data and order history';
  END IF;
END $$;

-- Add can_manage_offers permission (promotions and banners)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'provider_staff' AND column_name = 'can_manage_offers'
  ) THEN
    ALTER TABLE public.provider_staff ADD COLUMN can_manage_offers BOOLEAN DEFAULT false;
    COMMENT ON COLUMN public.provider_staff.can_manage_offers IS 'Permission to manage promotions and banners';
  END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE provider_invitations TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.provider_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Pre-configured permissions for when invite is accepted
  can_manage_orders BOOLEAN DEFAULT true,
  can_manage_menu BOOLEAN DEFAULT true,
  can_manage_customers BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT false,
  can_manage_offers BOOLEAN DEFAULT false,

  -- Invitation status and token
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT unique_pending_invite UNIQUE (provider_id, email, status)
);

-- Indexes for provider_invitations
CREATE INDEX IF NOT EXISTS idx_provider_invitations_provider ON public.provider_invitations(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_email ON public.provider_invitations(email);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_token ON public.provider_invitations(token);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_status ON public.provider_invitations(status);

-- Comments
COMMENT ON TABLE public.provider_invitations IS 'Pending invitations for staff members to join a provider team';
COMMENT ON COLUMN public.provider_invitations.token IS 'Secure token for invitation acceptance (sent via email)';
COMMENT ON COLUMN public.provider_invitations.expires_at IS 'Invitation expires after 7 days by default';

-- ============================================================================
-- PART 3: AUDIT TRAIL - ADD updated_by COLUMNS
-- ============================================================================

-- Add updated_by to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN updated_by UUID REFERENCES public.profiles(id);
    COMMENT ON COLUMN public.orders.updated_by IS 'User ID of the last person who updated this order (audit trail)';
  END IF;
END $$;

-- Add updated_by to menu_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN updated_by UUID REFERENCES public.profiles(id);
    COMMENT ON COLUMN public.menu_items.updated_by IS 'User ID of the last person who updated this menu item (audit trail)';
  END IF;
END $$;

-- Add updated_by to refunds table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refunds' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.refunds ADD COLUMN updated_by UUID REFERENCES public.profiles(id);
    COMMENT ON COLUMN public.refunds.updated_by IS 'User ID of the last person who updated this refund (audit trail)';
  END IF;
END $$;

-- ============================================================================
-- PART 4: HELPER FUNCTION - Get Provider ID for Staff Member
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_staff_provider_id(user_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_provider_id UUID;
BEGIN
  -- First check if user is a provider owner
  SELECT id INTO result_provider_id
  FROM public.providers
  WHERE owner_id = user_uuid
  LIMIT 1;

  IF result_provider_id IS NOT NULL THEN
    RETURN result_provider_id;
  END IF;

  -- If not owner, check if user is active staff
  SELECT provider_id INTO result_provider_id
  FROM public.provider_staff
  WHERE user_id = user_uuid
    AND is_active = true
  LIMIT 1;

  RETURN result_provider_id;
END;
$$;

COMMENT ON FUNCTION public.get_staff_provider_id IS 'Returns the provider_id for a user (whether owner or staff)';

-- ============================================================================
-- PART 5: HELPER FUNCTION - Check Staff Permission
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_staff_permission(
  user_uuid UUID,
  permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner BOOLEAN := false;
  has_permission BOOLEAN := false;
BEGIN
  -- Check if user is a provider owner (owners have all permissions)
  SELECT EXISTS(
    SELECT 1 FROM public.providers WHERE owner_id = user_uuid
  ) INTO is_owner;

  IF is_owner THEN
    RETURN true;
  END IF;

  -- Check specific permission for staff members
  CASE permission_name
    WHEN 'can_manage_orders' THEN
      SELECT can_manage_orders INTO has_permission
      FROM public.provider_staff
      WHERE user_id = user_uuid AND is_active = true
      LIMIT 1;
    WHEN 'can_manage_menu' THEN
      SELECT can_manage_menu INTO has_permission
      FROM public.provider_staff
      WHERE user_id = user_uuid AND is_active = true
      LIMIT 1;
    WHEN 'can_manage_customers' THEN
      SELECT can_manage_customers INTO has_permission
      FROM public.provider_staff
      WHERE user_id = user_uuid AND is_active = true
      LIMIT 1;
    WHEN 'can_view_analytics' THEN
      SELECT can_view_analytics INTO has_permission
      FROM public.provider_staff
      WHERE user_id = user_uuid AND is_active = true
      LIMIT 1;
    WHEN 'can_manage_offers' THEN
      SELECT can_manage_offers INTO has_permission
      FROM public.provider_staff
      WHERE user_id = user_uuid AND is_active = true
      LIMIT 1;
    ELSE
      RETURN false;
  END CASE;

  RETURN COALESCE(has_permission, false);
END;
$$;

COMMENT ON FUNCTION public.check_staff_permission IS 'Checks if a user has a specific permission (owner or staff)';

-- ============================================================================
-- PART 6: FUNCTION - Accept Invitation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_provider_invitation(invitation_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_existing_staff UUID;
  v_staff_count INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find the invitation
  SELECT * INTO v_invitation
  FROM public.provider_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check if user email matches invitation
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND email = v_invitation.email
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;

  -- Check if already a staff member for this provider
  SELECT id INTO v_existing_staff
  FROM public.provider_staff
  WHERE provider_id = v_invitation.provider_id AND user_id = v_user_id;

  IF v_existing_staff IS NOT NULL THEN
    -- Update existing staff record
    UPDATE public.provider_staff
    SET is_active = true,
        can_manage_orders = v_invitation.can_manage_orders,
        can_manage_menu = v_invitation.can_manage_menu,
        can_manage_customers = v_invitation.can_manage_customers,
        can_view_analytics = v_invitation.can_view_analytics,
        can_manage_offers = v_invitation.can_manage_offers,
        updated_at = NOW()
    WHERE id = v_existing_staff;
  ELSE
    -- Check staff limit (max 3 including owner)
    SELECT COUNT(*) INTO v_staff_count
    FROM public.provider_staff
    WHERE provider_id = v_invitation.provider_id AND is_active = true;

    IF v_staff_count >= 3 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Maximum staff limit reached (3)');
    END IF;

    -- Create new staff member
    INSERT INTO public.provider_staff (
      provider_id, user_id, role,
      can_manage_orders, can_manage_menu, can_manage_customers,
      can_view_analytics, can_manage_offers, is_active
    ) VALUES (
      v_invitation.provider_id, v_user_id, 'staff',
      v_invitation.can_manage_orders, v_invitation.can_manage_menu,
      v_invitation.can_manage_customers, v_invitation.can_view_analytics,
      v_invitation.can_manage_offers, true
    );

    -- Update user profile role to provider_staff
    UPDATE public.profiles
    SET role = 'provider_staff'
    WHERE id = v_user_id AND role = 'customer';
  END IF;

  -- Mark invitation as accepted
  UPDATE public.provider_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'provider_id', v_invitation.provider_id,
    'message', 'Successfully joined the team'
  );
END;
$$;

COMMENT ON FUNCTION public.accept_provider_invitation IS 'Accepts a pending invitation and adds user as staff member';

-- ============================================================================
-- PART 7: FUNCTION - Create Invitation (Owner Only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_provider_invitation(
  p_email TEXT,
  p_can_manage_orders BOOLEAN DEFAULT true,
  p_can_manage_menu BOOLEAN DEFAULT true,
  p_can_manage_customers BOOLEAN DEFAULT false,
  p_can_view_analytics BOOLEAN DEFAULT false,
  p_can_manage_offers BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_staff_count INTEGER;
  v_pending_count INTEGER;
  v_invitation_id UUID;
  v_token TEXT;
  v_existing_user RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is a provider owner
  SELECT id INTO v_provider_id
  FROM public.providers
  WHERE owner_id = v_user_id;

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only provider owners can invite staff');
  END IF;

  -- Check current staff count (owner is counted in provider_staff as well)
  SELECT COUNT(*) INTO v_staff_count
  FROM public.provider_staff
  WHERE provider_id = v_provider_id AND is_active = true;

  -- Check pending invitations count
  SELECT COUNT(*) INTO v_pending_count
  FROM public.provider_invitations
  WHERE provider_id = v_provider_id AND status = 'pending';

  -- Total cannot exceed 3 (including owner)
  IF v_staff_count + v_pending_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum team size reached (owner + 2 staff)');
  END IF;

  -- Check if email already has a pending invitation
  IF EXISTS (
    SELECT 1 FROM public.provider_invitations
    WHERE provider_id = v_provider_id
      AND email = LOWER(TRIM(p_email))
      AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation already sent to this email');
  END IF;

  -- Check if user with this email is already staff
  SELECT p.id, p.full_name INTO v_existing_user
  FROM public.profiles p
  JOIN public.provider_staff ps ON ps.user_id = p.id
  WHERE p.email = LOWER(TRIM(p_email))
    AND ps.provider_id = v_provider_id
    AND ps.is_active = true;

  IF v_existing_user.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This user is already a team member');
  END IF;

  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Create invitation
  INSERT INTO public.provider_invitations (
    provider_id, email, invited_by, token,
    can_manage_orders, can_manage_menu, can_manage_customers,
    can_view_analytics, can_manage_offers
  ) VALUES (
    v_provider_id, LOWER(TRIM(p_email)), v_user_id, v_token,
    p_can_manage_orders, p_can_manage_menu, p_can_manage_customers,
    p_can_view_analytics, p_can_manage_offers
  )
  RETURNING id INTO v_invitation_id;

  -- Check if user already exists in the system
  SELECT id, full_name INTO v_existing_user
  FROM public.profiles
  WHERE email = LOWER(TRIM(p_email));

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'token', v_token,
    'user_exists', v_existing_user.id IS NOT NULL,
    'user_name', v_existing_user.full_name,
    'message', CASE
      WHEN v_existing_user.id IS NOT NULL THEN 'Invitation sent to existing user'
      ELSE 'Invitation sent (user needs to register first)'
    END
  );
END;
$$;

COMMENT ON FUNCTION public.create_provider_invitation IS 'Creates an invitation for a new staff member (owner only)';

-- ============================================================================
-- PART 8: RLS POLICIES FOR provider_invitations
-- ============================================================================

ALTER TABLE public.provider_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Owners can manage their invitations" ON public.provider_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.provider_invitations;

-- Policy: Owners can manage their provider's invitations
CREATE POLICY "Owners can manage their invitations"
ON public.provider_invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = provider_invitations.provider_id
      AND owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.providers
    WHERE id = provider_invitations.provider_id
      AND owner_id = auth.uid()
  )
);

-- Policy: Users can view invitations sent to their email
CREATE POLICY "Users can view invitations sent to their email"
ON public.provider_invitations
FOR SELECT
USING (
  email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

-- ============================================================================
-- PART 9: ENHANCED RLS FOR provider_staff
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Staff can view their own team" ON public.provider_staff;
DROP POLICY IF EXISTS "Owners can manage their staff" ON public.provider_staff;

-- Staff members can view their own team
CREATE POLICY "Staff can view their own team"
ON public.provider_staff
FOR SELECT
USING (
  -- Can view if you're a member of this team
  provider_id IN (
    SELECT ps.provider_id FROM public.provider_staff ps
    WHERE ps.user_id = auth.uid() AND ps.is_active = true
  )
  OR
  -- Or if you're the owner
  provider_id IN (
    SELECT id FROM public.providers WHERE owner_id = auth.uid()
  )
);

-- Only owners can manage staff (insert, update, delete)
CREATE POLICY "Owners can manage their staff"
ON public.provider_staff
FOR ALL
USING (
  provider_id IN (
    SELECT id FROM public.providers WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  provider_id IN (
    SELECT id FROM public.providers WHERE owner_id = auth.uid()
  )
);

-- ============================================================================
-- PART 10: FUNCTION - Deactivate Staff Member (with session invalidation note)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deactivate_staff_member(p_staff_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_provider_id UUID;
  v_staff RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get staff member info
  SELECT * INTO v_staff
  FROM public.provider_staff
  WHERE id = p_staff_id;

  IF v_staff IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff member not found');
  END IF;

  -- Verify caller is the owner
  SELECT id INTO v_provider_id
  FROM public.providers
  WHERE id = v_staff.provider_id AND owner_id = v_user_id;

  IF v_provider_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the owner can deactivate staff');
  END IF;

  -- Cannot deactivate yourself (owner)
  IF v_staff.role = 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot deactivate the owner');
  END IF;

  -- Deactivate the staff member
  UPDATE public.provider_staff
  SET is_active = false, updated_at = NOW()
  WHERE id = p_staff_id;

  -- Note: The staff member's session will be invalidated on their next request
  -- due to the is_active check in the auth flow

  RETURN jsonb_build_object(
    'success', true,
    'deactivated_user_id', v_staff.user_id,
    'message', 'Staff member deactivated successfully'
  );
END;
$$;

COMMENT ON FUNCTION public.deactivate_staff_member IS 'Deactivates a staff member (owner only). Staff will be logged out on next request.';

-- ============================================================================
-- PART 11: ENSURE OWNER IS IN provider_staff
-- ============================================================================

-- Function to auto-add owner to provider_staff when provider is created
CREATE OR REPLACE FUNCTION public.auto_add_owner_to_staff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add owner as first staff member with all permissions
  INSERT INTO public.provider_staff (
    provider_id, user_id, role,
    can_manage_orders, can_manage_menu, can_manage_customers,
    can_view_analytics, can_manage_offers, is_active
  ) VALUES (
    NEW.id, NEW.owner_id, 'owner',
    true, true, true, true, true, true
  )
  ON CONFLICT (user_id, provider_id) DO UPDATE
  SET role = 'owner', is_active = true,
      can_manage_orders = true, can_manage_menu = true,
      can_manage_customers = true, can_view_analytics = true,
      can_manage_offers = true;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS auto_add_owner_to_staff_trigger ON public.providers;

-- Create trigger for new providers
CREATE TRIGGER auto_add_owner_to_staff_trigger
  AFTER INSERT ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_owner_to_staff();

-- Backfill: Add existing owners to provider_staff if not already there
INSERT INTO public.provider_staff (
  provider_id, user_id, role,
  can_manage_orders, can_manage_menu, can_manage_customers,
  can_view_analytics, can_manage_offers, is_active
)
SELECT
  p.id, p.owner_id, 'owner',
  true, true, true, true, true, true
FROM public.providers p
WHERE NOT EXISTS (
  SELECT 1 FROM public.provider_staff ps
  WHERE ps.provider_id = p.id AND ps.user_id = p.owner_id
)
ON CONFLICT (user_id, provider_id) DO UPDATE
SET role = 'owner', is_active = true;

-- ============================================================================
-- PART 12: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_invitations TO authenticated;
GRANT USAGE ON SEQUENCE provider_invitations_id_seq TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_staff_provider_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_staff_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_provider_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_provider_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_staff_member TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
