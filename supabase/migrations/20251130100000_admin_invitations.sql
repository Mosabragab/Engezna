-- ============================================================================
-- Admin Invitations System for Engezna (إنجزنا)
-- نظام دعوة المشرفين
-- ============================================================================
-- Version: 1.0
-- Created: 2025-11-30
-- Description: Complete invitation system for admin/supervisor onboarding
-- ============================================================================

-- ============================================================================
-- INVITATION STATUS ENUM
-- ============================================================================

CREATE TYPE invitation_status AS ENUM (
  'pending',    -- في انتظار القبول
  'accepted',   -- تم القبول والتسجيل
  'expired',    -- انتهت الصلاحية
  'cancelled',  -- تم الإلغاء
  'revoked'     -- تم السحب
);

-- ============================================================================
-- ADMIN INVITATIONS TABLE (دعوات المشرفين)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- معلومات المدعو
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255), -- اسم اختياري يمكن تعديله عند التسجيل

  -- الدور والصلاحيات المحددة مسبقاً
  role admin_role NOT NULL DEFAULT 'general_moderator',
  permissions JSONB NOT NULL DEFAULT '{
    "providers": {"view": true, "approve": false, "edit": false, "delete": false},
    "orders": {"view": true, "cancel": false, "refund": false},
    "customers": {"view": true, "ban": false, "edit": false},
    "finance": {"view": false, "settlements": false, "reports": false},
    "support": {"view": true, "assign": false, "resolve": false},
    "team": {"view": false, "manage": false},
    "settings": {"view": false, "edit": false},
    "analytics": {"view": true}
  }'::JSONB,

  -- المناطق المخصصة
  assigned_regions JSONB DEFAULT '[]'::JSONB,

  -- رمز الدعوة الفريد
  invitation_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),

  -- صلاحية الدعوة (48 ساعة افتراضياً)
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),

  -- حالة الدعوة
  status invitation_status NOT NULL DEFAULT 'pending',

  -- من أنشأ الدعوة
  invited_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,

  -- رسالة اختيارية للمدعو
  invitation_message TEXT,

  -- معلومات القبول
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- معلومات الإلغاء
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,

  -- تتبع الاستخدام
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,

  -- الطوابع الزمنية
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- منع الدعوات المكررة للبريد نفسه إذا كانت معلقة
  CONSTRAINT unique_pending_invitation UNIQUE (email, status)
    DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX idx_admin_invitations_token ON admin_invitations(invitation_token);
CREATE INDEX idx_admin_invitations_status ON admin_invitations(status);
CREATE INDEX idx_admin_invitations_expires ON admin_invitations(expires_at);
CREATE INDEX idx_admin_invitations_invited_by ON admin_invitations(invited_by);
CREATE INDEX idx_admin_invitations_created ON admin_invitations(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- تحديث updated_at تلقائياً
CREATE TRIGGER admin_invitations_updated_at
  BEFORE UPDATE ON admin_invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all invitations
CREATE POLICY "Super admins can manage invitations"
  ON admin_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
  );

-- Admins can view invitations they created
CREATE POLICY "Admins can view own invitations"
  ON admin_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND id = admin_invitations.invited_by AND is_active = true
    )
  );

-- Public can view pending invitations by token (for registration)
CREATE POLICY "Public can view valid invitations by token"
  ON admin_invitations FOR SELECT
  USING (
    status = 'pending'
    AND expires_at > NOW()
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create an invitation
CREATE OR REPLACE FUNCTION create_admin_invitation(
  p_email VARCHAR(255),
  p_role admin_role,
  p_permissions JSONB DEFAULT NULL,
  p_assigned_regions JSONB DEFAULT '[]'::JSONB,
  p_full_name VARCHAR(255) DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_expires_hours INTEGER DEFAULT 48
)
RETURNS UUID AS $$
DECLARE
  v_admin_id UUID;
  v_invitation_id UUID;
  v_default_permissions JSONB;
BEGIN
  -- Get admin_id for current user
  SELECT id INTO v_admin_id FROM admin_users
  WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Only super admins can create invitations';
  END IF;

  -- Check if email already has a pending invitation
  IF EXISTS (
    SELECT 1 FROM admin_invitations
    WHERE email = p_email AND status = 'pending' AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'A pending invitation already exists for this email';
  END IF;

  -- Check if email is already an admin
  IF EXISTS (
    SELECT 1 FROM profiles p
    JOIN admin_users au ON au.user_id = p.id
    WHERE p.email = p_email AND au.is_active = true
  ) THEN
    RAISE EXCEPTION 'This email is already registered as an admin';
  END IF;

  -- Set default permissions based on role if not provided
  IF p_permissions IS NULL THEN
    CASE p_role
      WHEN 'super_admin' THEN
        v_default_permissions := '{
          "providers": {"view": true, "approve": true, "edit": true, "delete": true},
          "orders": {"view": true, "cancel": true, "refund": true},
          "customers": {"view": true, "ban": true, "edit": true},
          "finance": {"view": true, "settlements": true, "reports": true},
          "support": {"view": true, "assign": true, "resolve": true},
          "team": {"view": true, "manage": true},
          "settings": {"view": true, "edit": true},
          "analytics": {"view": true}
        }'::JSONB;
      WHEN 'general_moderator' THEN
        v_default_permissions := '{
          "providers": {"view": true, "approve": true, "edit": true, "delete": false},
          "orders": {"view": true, "cancel": true, "refund": false},
          "customers": {"view": true, "ban": true, "edit": false},
          "finance": {"view": false, "settlements": false, "reports": false},
          "support": {"view": true, "assign": false, "resolve": false},
          "team": {"view": false, "manage": false},
          "settings": {"view": false, "edit": false},
          "analytics": {"view": true}
        }'::JSONB;
      WHEN 'support' THEN
        v_default_permissions := '{
          "providers": {"view": true, "approve": false, "edit": false, "delete": false},
          "orders": {"view": true, "cancel": false, "refund": false},
          "customers": {"view": true, "ban": false, "edit": false},
          "finance": {"view": false, "settlements": false, "reports": false},
          "support": {"view": true, "assign": true, "resolve": true},
          "team": {"view": false, "manage": false},
          "settings": {"view": false, "edit": false},
          "analytics": {"view": false}
        }'::JSONB;
      WHEN 'finance' THEN
        v_default_permissions := '{
          "providers": {"view": true, "approve": false, "edit": false, "delete": false},
          "orders": {"view": true, "cancel": false, "refund": true},
          "customers": {"view": true, "ban": false, "edit": false},
          "finance": {"view": true, "settlements": true, "reports": true},
          "support": {"view": false, "assign": false, "resolve": false},
          "team": {"view": false, "manage": false},
          "settings": {"view": false, "edit": false},
          "analytics": {"view": true}
        }'::JSONB;
      ELSE
        v_default_permissions := '{
          "providers": {"view": true, "approve": false, "edit": false, "delete": false},
          "orders": {"view": true, "cancel": false, "refund": false},
          "customers": {"view": true, "ban": false, "edit": false},
          "finance": {"view": false, "settlements": false, "reports": false},
          "support": {"view": true, "assign": false, "resolve": false},
          "team": {"view": false, "manage": false},
          "settings": {"view": false, "edit": false},
          "analytics": {"view": true}
        }'::JSONB;
    END CASE;
  ELSE
    v_default_permissions := p_permissions;
  END IF;

  -- Create the invitation
  INSERT INTO admin_invitations (
    email,
    full_name,
    role,
    permissions,
    assigned_regions,
    invited_by,
    invitation_message,
    expires_at
  ) VALUES (
    LOWER(TRIM(p_email)),
    p_full_name,
    p_role,
    v_default_permissions,
    COALESCE(p_assigned_regions, '[]'::JSONB),
    v_admin_id,
    p_message,
    NOW() + (p_expires_hours || ' hours')::INTERVAL
  )
  RETURNING id INTO v_invitation_id;

  -- Log the activity
  PERFORM log_admin_activity(
    'create_invitation',
    'invitation',
    v_invitation_id,
    jsonb_build_object(
      'email', p_email,
      'role', p_role,
      'expires_hours', p_expires_hours
    )
  );

  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION accept_admin_invitation(
  p_token UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation RECORD;
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
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel an invitation
CREATE OR REPLACE FUNCTION cancel_admin_invitation(
  p_invitation_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Get admin_id for current user
  SELECT id INTO v_admin_id FROM admin_users
  WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Only super admins can cancel invitations';
  END IF;

  UPDATE admin_invitations SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = v_admin_id,
    cancellation_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_invitation_id AND status = 'pending';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE admin_invitations SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'pending' AND expires_at <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resend/extend an invitation
CREATE OR REPLACE FUNCTION resend_admin_invitation(
  p_invitation_id UUID,
  p_extend_hours INTEGER DEFAULT 48
)
RETURNS UUID AS $$
DECLARE
  v_admin_id UUID;
  v_new_token UUID;
BEGIN
  -- Get admin_id for current user
  SELECT id INTO v_admin_id FROM admin_users
  WHERE user_id = auth.uid() AND role = 'super_admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Only super admins can resend invitations';
  END IF;

  -- Generate new token and extend expiry
  v_new_token := gen_random_uuid();

  UPDATE admin_invitations SET
    invitation_token = v_new_token,
    expires_at = NOW() + (p_extend_hours || ' hours')::INTERVAL,
    status = 'pending',
    view_count = 0,
    updated_at = NOW()
  WHERE id = p_invitation_id AND status IN ('pending', 'expired');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already accepted';
  END IF;

  RETURN v_new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SCHEDULED JOB (optional - run manually or via cron)
-- ============================================================================

-- To expire old invitations, run this periodically:
-- SELECT expire_old_invitations();

-- ============================================================================
-- END OF ADMIN INVITATIONS SCHEMA
-- ============================================================================
