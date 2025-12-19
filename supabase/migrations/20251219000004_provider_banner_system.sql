-- ═══════════════════════════════════════════════════════════════════════════
-- Provider Banner System Migration
-- Allows providers to create banners for their city with admin approval
-- ═══════════════════════════════════════════════════════════════════════════

-- Create enum for approval status
DO $$ BEGIN
  CREATE TYPE banner_approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for banner duration
DO $$ BEGIN
  CREATE TYPE banner_duration_type AS ENUM ('1_day', '3_days', '1_week', '1_month');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add provider banner columns to homepage_banners
ALTER TABLE public.homepage_banners
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS approval_status banner_approval_status DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS duration_type banner_duration_type,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Set default approval_status for existing banners (admin-created)
UPDATE public.homepage_banners
SET approval_status = 'approved'
WHERE approval_status IS NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_homepage_banners_provider ON public.homepage_banners(provider_id);
CREATE INDEX IF NOT EXISTS idx_homepage_banners_approval_status ON public.homepage_banners(approval_status);
CREATE INDEX IF NOT EXISTS idx_homepage_banners_duration_type ON public.homepage_banners(duration_type);

-- Comments
COMMENT ON COLUMN public.homepage_banners.provider_id IS 'Provider who created this banner (NULL for admin-created banners)';
COMMENT ON COLUMN public.homepage_banners.approval_status IS 'Approval status: pending, approved, rejected, cancelled';
COMMENT ON COLUMN public.homepage_banners.duration_type IS 'Duration of the banner: 1_day, 3_days, 1_week, 1_month';
COMMENT ON COLUMN public.homepage_banners.submitted_at IS 'When the provider submitted the banner for approval';
COMMENT ON COLUMN public.homepage_banners.reviewed_at IS 'When admin reviewed the banner';
COMMENT ON COLUMN public.homepage_banners.reviewed_by IS 'Admin user who reviewed the banner';
COMMENT ON COLUMN public.homepage_banners.rejection_reason IS 'Reason for rejection or cancellation';

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper function to calculate end date based on duration type
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION calculate_banner_end_date(
  p_starts_at TIMESTAMPTZ,
  p_duration_type banner_duration_type
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_duration_type
    WHEN '1_day' THEN RETURN p_starts_at + INTERVAL '1 day';
    WHEN '3_days' THEN RETURN p_starts_at + INTERVAL '3 days';
    WHEN '1_week' THEN RETURN p_starts_at + INTERVAL '7 days';
    WHEN '1_month' THEN RETURN p_starts_at + INTERVAL '30 days';
    ELSE RETURN p_starts_at + INTERVAL '1 day';
  END CASE;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Function to get duration priority (lower = higher priority)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_duration_priority(p_duration_type banner_duration_type)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_duration_type
    WHEN '1_day' THEN RETURN 1;
    WHEN '3_days' THEN RETURN 2;
    WHEN '1_week' THEN RETURN 3;
    WHEN '1_month' THEN RETURN 4;
    ELSE RETURN 5;
  END CASE;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Updated RPC function to get banners with proper ordering
-- Provider banners ordered by duration (shorter first), then by submission date
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_banners_for_location(
  p_governorate_id UUID DEFAULT NULL,
  p_city_id UUID DEFAULT NULL,
  p_banner_type banner_type DEFAULT 'customer'
)
RETURNS SETOF public.homepage_banners
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.homepage_banners
  WHERE is_active = true
    AND banner_type = p_banner_type
    AND (approval_status = 'approved' OR approval_status IS NULL)
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at >= NOW())
    AND (
      -- National banners (no location restriction)
      (governorate_id IS NULL AND city_id IS NULL)
      OR
      -- Governorate-level banners
      (governorate_id = p_governorate_id AND city_id IS NULL)
      OR
      -- City-level banners
      (governorate_id = p_governorate_id AND city_id = p_city_id)
    )
  ORDER BY
    -- Admin banners first (no provider_id), then provider banners
    CASE WHEN provider_id IS NULL THEN 0 ELSE 1 END,
    -- For provider banners: shorter duration = higher priority
    COALESCE(get_duration_priority(duration_type), 5),
    -- Then by submission/creation date (earlier = higher priority)
    COALESCE(submitted_at, created_at) ASC,
    -- Finally by display_order for admin banners
    display_order ASC;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Function to get pending banners for admin approval
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_pending_banners_for_approval()
RETURNS TABLE (
  id UUID,
  title_ar VARCHAR,
  title_en VARCHAR,
  description_ar TEXT,
  description_en TEXT,
  image_url TEXT,
  gradient_start VARCHAR,
  gradient_end VARCHAR,
  badge_text_ar VARCHAR,
  badge_text_en VARCHAR,
  cta_text_ar VARCHAR,
  cta_text_en VARCHAR,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  duration_type banner_duration_type,
  submitted_at TIMESTAMPTZ,
  provider_id UUID,
  provider_name_ar VARCHAR,
  provider_name_en VARCHAR,
  provider_logo TEXT,
  governorate_name_ar VARCHAR,
  governorate_name_en VARCHAR,
  city_name_ar VARCHAR,
  city_name_en VARCHAR
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
    b.badge_text_ar,
    b.badge_text_en,
    b.cta_text_ar,
    b.cta_text_en,
    b.starts_at,
    b.ends_at,
    b.duration_type,
    b.submitted_at,
    b.provider_id,
    p.name_ar AS provider_name_ar,
    p.name_en AS provider_name_en,
    p.logo_url AS provider_logo,
    g.name_ar AS governorate_name_ar,
    g.name_en AS governorate_name_en,
    c.name_ar AS city_name_ar,
    c.name_en AS city_name_en
  FROM public.homepage_banners b
  LEFT JOIN public.providers p ON b.provider_id = p.id
  LEFT JOIN public.governorates g ON b.governorate_id = g.id
  LEFT JOIN public.cities c ON b.city_id = c.id
  WHERE b.approval_status = 'pending'
    AND b.provider_id IS NOT NULL
  ORDER BY b.submitted_at ASC;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Function to check if provider can create a new banner
-- Returns true if provider has no active/pending banners
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION can_provider_create_banner(p_provider_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.homepage_banners
    WHERE provider_id = p_provider_id
    AND (
      -- Has pending banner
      approval_status = 'pending'
      OR
      -- Has active approved banner
      (approval_status = 'approved' AND is_active = true AND (ends_at IS NULL OR ends_at >= NOW()))
    )
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Function to get provider's banner status
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_provider_banner_status(p_provider_id UUID)
RETURNS TABLE (
  has_active_banner BOOLEAN,
  has_pending_banner BOOLEAN,
  current_banner_id UUID,
  current_banner_status banner_approval_status,
  current_banner_starts_at TIMESTAMPTZ,
  current_banner_ends_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND approval_status = 'approved'
      AND is_active = true
      AND (ends_at IS NULL OR ends_at >= NOW())
    ) AS has_active_banner,
    EXISTS (
      SELECT 1 FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND approval_status = 'pending'
    ) AS has_pending_banner,
    (
      SELECT id FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND (
        approval_status = 'pending'
        OR (approval_status = 'approved' AND is_active = true AND (ends_at IS NULL OR ends_at >= NOW()))
      )
      ORDER BY
        CASE approval_status WHEN 'pending' THEN 0 ELSE 1 END,
        submitted_at DESC
      LIMIT 1
    ) AS current_banner_id,
    (
      SELECT approval_status FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND (
        approval_status = 'pending'
        OR (approval_status = 'approved' AND is_active = true AND (ends_at IS NULL OR ends_at >= NOW()))
      )
      ORDER BY
        CASE approval_status WHEN 'pending' THEN 0 ELSE 1 END,
        submitted_at DESC
      LIMIT 1
    ) AS current_banner_status,
    (
      SELECT starts_at FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND (
        approval_status = 'pending'
        OR (approval_status = 'approved' AND is_active = true AND (ends_at IS NULL OR ends_at >= NOW()))
      )
      ORDER BY
        CASE approval_status WHEN 'pending' THEN 0 ELSE 1 END,
        submitted_at DESC
      LIMIT 1
    ) AS current_banner_starts_at,
    (
      SELECT ends_at FROM public.homepage_banners
      WHERE provider_id = p_provider_id
      AND (
        approval_status = 'pending'
        OR (approval_status = 'approved' AND is_active = true AND (ends_at IS NULL OR ends_at >= NOW()))
      )
      ORDER BY
        CASE approval_status WHEN 'pending' THEN 0 ELSE 1 END,
        submitted_at DESC
      LIMIT 1
    ) AS current_banner_ends_at;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Policies for provider banner access
-- ═══════════════════════════════════════════════════════════════════════════

-- Providers can view their own banners
DO $$ BEGIN
  CREATE POLICY "Providers can view own banners"
  ON public.homepage_banners FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM public.providers
      WHERE owner_id = auth.uid()
    )
    OR provider_id IS NULL -- Allow viewing admin banners too
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Providers can insert their own banners (with pending status)
DO $$ BEGIN
  CREATE POLICY "Providers can create own banners"
  ON public.homepage_banners FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.providers
      WHERE owner_id = auth.uid()
    )
    AND approval_status = 'pending'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Providers can update their pending banners only
DO $$ BEGIN
  CREATE POLICY "Providers can update pending banners"
  ON public.homepage_banners FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM public.providers
      WHERE owner_id = auth.uid()
    )
    AND approval_status = 'pending'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Providers can delete their pending banners only
DO $$ BEGIN
  CREATE POLICY "Providers can delete pending banners"
  ON public.homepage_banners FOR DELETE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM public.providers
      WHERE owner_id = auth.uid()
    )
    AND approval_status = 'pending'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
