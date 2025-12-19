-- ═══════════════════════════════════════════════════════════════════════════
-- Fix Provider Banner Status and Add Notification System
-- This migration fixes the get_provider_banner_status function to include
-- rejected/cancelled banners and adds notification support for banner actions
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Add banner notification type to existing notification_type enum (if not exists)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'banner_approved';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'banner_rejected';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Updated function to get provider's banner status
-- Now includes rejected/cancelled banners for provider to see
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop the old function first (return type is changing)
DROP FUNCTION IF EXISTS get_provider_banner_status(UUID);

CREATE OR REPLACE FUNCTION get_provider_banner_status(p_provider_id UUID)
RETURNS TABLE (
  has_active_banner BOOLEAN,
  has_pending_banner BOOLEAN,
  has_rejected_banner BOOLEAN,
  current_banner_id UUID,
  current_banner_status banner_approval_status,
  current_banner_starts_at TIMESTAMPTZ,
  current_banner_ends_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    -- Has active approved banner
    EXISTS (
      SELECT 1 FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND approval_status = 'approved'
      AND is_active = true
      AND (ends_at IS NULL OR ends_at >= NOW())
    ) AS has_active_banner,

    -- Has pending banner
    EXISTS (
      SELECT 1 FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND approval_status = 'pending'
    ) AS has_pending_banner,

    -- Has recently rejected/cancelled banner (within last 30 days)
    EXISTS (
      SELECT 1 FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND approval_status IN ('rejected', 'cancelled')
      AND reviewed_at >= NOW() - INTERVAL '30 days'
    ) AS has_rejected_banner,

    -- Get most recent banner (pending > approved > rejected > cancelled)
    (
      SELECT id FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND (
        -- Pending banners
        approval_status = 'pending'
        OR
        -- Active approved banners
        (approval_status = 'approved' AND is_active = true AND (ends_at IS NULL OR ends_at >= NOW()))
        OR
        -- Recently rejected/cancelled banners (within 30 days)
        (approval_status IN ('rejected', 'cancelled') AND reviewed_at >= NOW() - INTERVAL '30 days')
      )
      ORDER BY
        CASE approval_status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          WHEN 'rejected' THEN 2
          WHEN 'cancelled' THEN 3
          ELSE 4
        END,
        COALESCE(reviewed_at, submitted_at) DESC
      LIMIT 1
    ) AS current_banner_id,

    -- Get status of most recent banner
    (
      SELECT approval_status FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND (
        approval_status = 'pending'
        OR (approval_status = 'approved' AND is_active = true AND (ends_at IS NULL OR ends_at >= NOW()))
        OR (approval_status IN ('rejected', 'cancelled') AND reviewed_at >= NOW() - INTERVAL '30 days')
      )
      ORDER BY
        CASE approval_status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          WHEN 'rejected' THEN 2
          WHEN 'cancelled' THEN 3
          ELSE 4
        END,
        COALESCE(reviewed_at, submitted_at) DESC
      LIMIT 1
    ) AS current_banner_status,

    -- Get starts_at of most recent banner
    (
      SELECT starts_at FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND (
        approval_status = 'pending'
        OR (approval_status = 'approved' AND is_active = true AND (ends_at IS NULL OR ends_at >= NOW()))
        OR (approval_status IN ('rejected', 'cancelled') AND reviewed_at >= NOW() - INTERVAL '30 days')
      )
      ORDER BY
        CASE approval_status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          WHEN 'rejected' THEN 2
          WHEN 'cancelled' THEN 3
          ELSE 4
        END,
        COALESCE(reviewed_at, submitted_at) DESC
      LIMIT 1
    ) AS current_banner_starts_at,

    -- Get ends_at of most recent banner
    (
      SELECT ends_at FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND (
        approval_status = 'pending'
        OR (approval_status = 'approved' AND is_active = true AND (ends_at IS NULL OR ends_at >= NOW()))
        OR (approval_status IN ('rejected', 'cancelled') AND reviewed_at >= NOW() - INTERVAL '30 days')
      )
      ORDER BY
        CASE approval_status
          WHEN 'pending' THEN 0
          WHEN 'approved' THEN 1
          WHEN 'rejected' THEN 2
          WHEN 'cancelled' THEN 3
          ELSE 4
        END,
        COALESCE(reviewed_at, submitted_at) DESC
      LIMIT 1
    ) AS current_banner_ends_at;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Function to get all provider banners with history
-- Returns all banners for a provider including rejected/cancelled
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_provider_banner_history(p_provider_id UUID)
RETURNS TABLE (
  id UUID,
  title_ar VARCHAR,
  title_en VARCHAR,
  approval_status banner_approval_status,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    title_ar,
    title_en,
    approval_status,
    rejection_reason,
    submitted_at,
    reviewed_at,
    starts_at,
    ends_at,
    is_active
  FROM public.homepage_banners
  WHERE provider_id = p_provider_id
  ORDER BY COALESCE(submitted_at, created_at) DESC
  LIMIT 10;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Function to get provider banners for admin with all statuses
-- Used in admin panel to see rejected/cancelled banners
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_all_provider_banners_for_admin(
  p_status banner_approval_status DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title_ar VARCHAR,
  title_en VARCHAR,
  description_ar TEXT,
  description_en TEXT,
  image_url TEXT,
  gradient_start VARCHAR,
  gradient_end VARCHAR,
  approval_status banner_approval_status,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN,
  provider_id UUID,
  provider_name_ar VARCHAR,
  provider_name_en VARCHAR,
  provider_logo TEXT,
  reviewed_by_name VARCHAR
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    b.id,
    b.title_ar,
    b.title_en,
    b.description_ar,
    b.description_en,
    b.image_url,
    b.gradient_start,
    b.gradient_end,
    b.approval_status,
    b.rejection_reason,
    b.submitted_at,
    b.reviewed_at,
    b.starts_at,
    b.ends_at,
    b.is_active,
    b.provider_id,
    p.name_ar AS provider_name_ar,
    p.name_en AS provider_name_en,
    p.logo_url AS provider_logo,
    pr.full_name AS reviewed_by_name
  FROM public.homepage_banners b
  LEFT JOIN public.providers p ON b.provider_id = p.id
  LEFT JOIN public.profiles pr ON b.reviewed_by = pr.id
  WHERE b.provider_id IS NOT NULL
    AND (p_status IS NULL OR b.approval_status = p_status)
  ORDER BY
    CASE b.approval_status
      WHEN 'pending' THEN 0
      WHEN 'rejected' THEN 1
      WHEN 'cancelled' THEN 2
      WHEN 'approved' THEN 3
      ELSE 4
    END,
    COALESCE(b.reviewed_at, b.submitted_at) DESC;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Function to create notification for provider when banner status changes
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_provider_banner_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_provider_owner_id UUID;
  v_notification_type notification_type;
  v_title_ar VARCHAR;
  v_title_en VARCHAR;
  v_message_ar TEXT;
  v_message_en TEXT;
BEGIN
  -- Only trigger on approval_status change
  IF OLD.approval_status = NEW.approval_status THEN
    RETURN NEW;
  END IF;

  -- Only for provider banners
  IF NEW.provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get provider owner ID
  SELECT owner_id INTO v_provider_owner_id
  FROM public.providers
  WHERE id = NEW.provider_id;

  IF v_provider_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Set notification content based on status
  IF NEW.approval_status = 'approved' THEN
    v_notification_type := 'banner_approved';
    v_title_ar := 'تم قبول البانر';
    v_title_en := 'Banner Approved';
    v_message_ar := 'تم قبول طلب البانر الخاص بك "' || NEW.title_ar || '" وسيتم عرضه للعملاء.';
    v_message_en := 'Your banner request "' || NEW.title_en || '" has been approved and will be displayed to customers.';
  ELSIF NEW.approval_status = 'rejected' THEN
    v_notification_type := 'banner_rejected';
    v_title_ar := 'تم رفض البانر';
    v_title_en := 'Banner Rejected';
    v_message_ar := 'تم رفض طلب البانر الخاص بك "' || NEW.title_ar || '". السبب: ' || COALESCE(NEW.rejection_reason, 'غير محدد');
    v_message_en := 'Your banner request "' || NEW.title_en || '" has been rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'Not specified');
  ELSIF NEW.approval_status = 'cancelled' THEN
    v_notification_type := 'banner_rejected';
    v_title_ar := 'تم إلغاء البانر';
    v_title_en := 'Banner Cancelled';
    v_message_ar := 'تم إلغاء البانر الخاص بك "' || NEW.title_ar || '". السبب: ' || COALESCE(NEW.rejection_reason, 'غير محدد');
    v_message_en := 'Your banner "' || NEW.title_en || '" has been cancelled. Reason: ' || COALESCE(NEW.rejection_reason, 'Not specified');
  ELSE
    RETURN NEW;
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title_ar,
    title_en,
    message_ar,
    message_en,
    provider_id,
    action_url,
    is_read
  ) VALUES (
    v_provider_owner_id,
    v_notification_type,
    v_title_ar,
    v_title_en,
    v_message_ar,
    v_message_en,
    NEW.provider_id,
    '/provider/banner',
    false
  );

  RETURN NEW;
END;
$$;

-- Create trigger for banner status notifications
DROP TRIGGER IF EXISTS trigger_notify_provider_banner_status ON public.homepage_banners;
CREATE TRIGGER trigger_notify_provider_banner_status
  AFTER UPDATE ON public.homepage_banners
  FOR EACH ROW
  EXECUTE FUNCTION notify_provider_banner_status();

-- ═══════════════════════════════════════════════════════════════════════════
-- Comments
-- ═══════════════════════════════════════════════════════════════════════════
COMMENT ON FUNCTION get_provider_banner_status IS 'Get provider banner status including rejected/cancelled banners';
COMMENT ON FUNCTION get_provider_banner_history IS 'Get provider banner history for display';
COMMENT ON FUNCTION get_all_provider_banners_for_admin IS 'Get all provider banners for admin panel with filtering';
COMMENT ON FUNCTION notify_provider_banner_status IS 'Send notification to provider when banner status changes';
