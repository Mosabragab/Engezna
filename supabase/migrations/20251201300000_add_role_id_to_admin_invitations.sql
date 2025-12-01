-- ============================================================================
-- Add role_id to Admin Invitations for New Permission System
-- إضافة معرف الدور لجدول الدعوات لدعم نظام الصلاحيات الجديد
-- ============================================================================
-- Version: 1.0
-- Created: 2025-12-01
-- Description: Adds role_id column to admin_invitations for integration with
--              the new roles/permissions system while maintaining backward
--              compatibility with the old role enum.
-- ============================================================================

-- ============================================================================
-- 1. ADD role_id COLUMN TO admin_invitations
-- ============================================================================

-- Add role_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_invitations'
    AND column_name = 'role_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.admin_invitations
    ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

    RAISE NOTICE 'Added role_id column to admin_invitations table';
  END IF;
END $$;

-- ============================================================================
-- 2. CREATE INDEX FOR role_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_invitations_role_id
ON admin_invitations(role_id);

-- ============================================================================
-- 3. BACKFILL role_id FOR EXISTING INVITATIONS
-- ============================================================================

-- Update existing invitations to link to the new roles table
UPDATE admin_invitations ai
SET role_id = r.id
FROM roles r
WHERE ai.role::text = r.code
  AND ai.role_id IS NULL;

-- ============================================================================
-- 4. UPDATE accept_admin_invitation FUNCTION
-- ============================================================================

-- Drop the old function first
DROP FUNCTION IF EXISTS accept_admin_invitation(UUID, UUID);

-- Create updated function that handles both old and new role systems
CREATE OR REPLACE FUNCTION accept_admin_invitation(
  p_token UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation RECORD;
  v_new_admin_id UUID;
BEGIN
  -- Get and validate the invitation
  SELECT * INTO v_invitation FROM admin_invitations
  WHERE invitation_token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Update the invitation status
  UPDATE admin_invitations SET
    status = 'accepted',
    accepted_at = NOW(),
    accepted_user_id = p_user_id,
    updated_at = NOW()
  WHERE id = v_invitation.id;

  -- Update the profile role to admin
  UPDATE profiles SET
    role = 'admin',
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Create the admin_users record
  INSERT INTO admin_users (
    user_id,
    role,
    permissions,
    assigned_regions,
    is_active
  ) VALUES (
    p_user_id,
    v_invitation.role,
    v_invitation.permissions,
    v_invitation.assigned_regions,
    true
  )
  RETURNING id INTO v_new_admin_id;

  -- If role_id is present, also add to admin_roles for new permission system
  IF v_invitation.role_id IS NOT NULL AND v_new_admin_id IS NOT NULL THEN
    INSERT INTO admin_roles (admin_id, role_id, is_primary)
    VALUES (v_new_admin_id, v_invitation.role_id, true)
    ON CONFLICT (admin_id, role_id) DO NOTHING;

    RAISE NOTICE 'Created admin_roles entry for admin % with role %', v_new_admin_id, v_invitation.role_id;
  ELSE
    -- Fallback: try to find role by code and create admin_roles entry
    INSERT INTO admin_roles (admin_id, role_id, is_primary)
    SELECT v_new_admin_id, r.id, true
    FROM roles r
    WHERE r.code = v_invitation.role::text
    ON CONFLICT (admin_id, role_id) DO NOTHING;

    RAISE NOTICE 'Created admin_roles entry from role code for admin %', v_new_admin_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CREATE register_admin_from_invitation FUNCTION
-- ============================================================================

-- Drop the old function if exists
DROP FUNCTION IF EXISTS register_admin_from_invitation(UUID, UUID, VARCHAR, VARCHAR);

-- Create function for registration page to use
CREATE OR REPLACE FUNCTION register_admin_from_invitation(
  p_user_id UUID,
  p_invitation_token UUID,
  p_full_name VARCHAR(255),
  p_phone VARCHAR(50) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_invitation RECORD;
  v_new_admin_id UUID;
  v_role_id UUID;
BEGIN
  -- Get and validate the invitation
  SELECT * INTO v_invitation FROM admin_invitations
  WHERE invitation_token = p_invitation_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Update the profile with the provided info and set role to admin
  UPDATE profiles SET
    full_name = p_full_name,
    phone = COALESCE(p_phone, phone),
    role = 'admin',
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Update the invitation status
  UPDATE admin_invitations SET
    status = 'accepted',
    accepted_at = NOW(),
    accepted_user_id = p_user_id,
    updated_at = NOW()
  WHERE id = v_invitation.id;

  -- Create the admin_users record
  INSERT INTO admin_users (
    user_id,
    role,
    permissions,
    assigned_regions,
    is_active
  ) VALUES (
    p_user_id,
    v_invitation.role,
    v_invitation.permissions,
    v_invitation.assigned_regions,
    true
  )
  RETURNING id INTO v_new_admin_id;

  -- Handle role assignment for new permission system
  v_role_id := v_invitation.role_id;

  -- If role_id is not set, try to find it by role code
  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM roles WHERE code = v_invitation.role::text;
  END IF;

  -- Create admin_roles entry if we have a valid role_id
  IF v_role_id IS NOT NULL AND v_new_admin_id IS NOT NULL THEN
    INSERT INTO admin_roles (admin_id, role_id, is_primary)
    VALUES (v_new_admin_id, v_role_id, true)
    ON CONFLICT (admin_id, role_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'admin_id', v_new_admin_id,
    'role', v_invitation.role,
    'role_id', v_role_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Ensure the functions can be executed
GRANT EXECUTE ON FUNCTION accept_admin_invitation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_admin_invitation(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION register_admin_from_invitation(UUID, UUID, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION register_admin_from_invitation(UUID, UUID, VARCHAR, VARCHAR) TO anon;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
