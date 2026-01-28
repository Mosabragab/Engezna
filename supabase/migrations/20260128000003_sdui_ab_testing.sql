-- ============================================================================
-- SDUI A/B Testing Framework
-- Enables creating experiments with multiple variants and tracking results
-- ============================================================================

-- A/B Test status enum
DO $$ BEGIN
  CREATE TYPE sdui_ab_test_status AS ENUM ('draft', 'running', 'paused', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Main A/B Tests table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sdui_ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Test identification
  name TEXT NOT NULL,
  description TEXT,

  -- Test scope
  page TEXT NOT NULL, -- Which page this test applies to
  section_key TEXT, -- Optional: specific section being tested

  -- Test configuration
  status sdui_ab_test_status DEFAULT 'draft',
  traffic_percentage INTEGER DEFAULT 100 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),

  -- Timing
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  -- Goal tracking
  goal_type TEXT DEFAULT 'click' CHECK (goal_type IN ('click', 'conversion', 'engagement', 'custom')),
  goal_section_key TEXT, -- Which section click/interaction counts as conversion

  -- Auto-winner selection
  auto_select_winner BOOLEAN DEFAULT false,
  min_sample_size INTEGER DEFAULT 100,
  confidence_level NUMERIC DEFAULT 0.95,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- A/B Test Variants
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sdui_ab_test_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Reference to test
  test_id UUID NOT NULL REFERENCES public.sdui_ab_tests(id) ON DELETE CASCADE,

  -- Variant info
  name TEXT NOT NULL, -- e.g., "Control", "Variant A", "Variant B"
  is_control BOOLEAN DEFAULT false,

  -- Traffic allocation within the test
  weight INTEGER DEFAULT 50 CHECK (weight >= 0 AND weight <= 100),

  -- Section configuration for this variant
  section_config JSONB, -- Override config for the section
  section_content JSONB, -- Override content for the section

  -- Results
  views INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one control per test
  CONSTRAINT unique_control_per_test UNIQUE (test_id, is_control)
    DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- User variant assignments (for consistent experience)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sdui_ab_test_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Test and variant
  test_id UUID NOT NULL REFERENCES public.sdui_ab_tests(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.sdui_ab_test_variants(id) ON DELETE CASCADE,

  -- User identification (use device fingerprint for anonymous users)
  user_id UUID REFERENCES auth.users(id),
  device_fingerprint TEXT,

  -- Assignment tracking
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one assignment per user per test
  CONSTRAINT unique_user_test_assignment UNIQUE (test_id, user_id),
  CONSTRAINT unique_device_test_assignment UNIQUE (test_id, device_fingerprint)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_ab_tests_status ON public.sdui_ab_tests(status);
CREATE INDEX idx_ab_tests_page ON public.sdui_ab_tests(page);
CREATE INDEX idx_ab_test_variants_test_id ON public.sdui_ab_test_variants(test_id);
CREATE INDEX idx_ab_test_assignments_test_id ON public.sdui_ab_test_assignments(test_id);
CREATE INDEX idx_ab_test_assignments_user_id ON public.sdui_ab_test_assignments(user_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE public.sdui_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdui_ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdui_ab_test_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage tests
CREATE POLICY "Admins can manage AB tests"
  ON public.sdui_ab_tests FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage AB test variants"
  ON public.sdui_ab_test_variants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ));

-- Anyone can be assigned to a test
CREATE POLICY "Anyone can be assigned to tests"
  ON public.sdui_ab_test_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own assignments"
  ON public.sdui_ab_test_assignments FOR SELECT
  USING (user_id = auth.uid() OR device_fingerprint IS NOT NULL);

-- ============================================================================
-- Function: Get or create variant assignment for user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_ab_test_variant(
  p_test_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_variant_id UUID;
  v_test_status sdui_ab_test_status;
  v_test_traffic INTEGER;
  v_random_value NUMERIC;
  v_cumulative_weight INTEGER := 0;
  v_variant RECORD;
BEGIN
  -- Check if test is running
  SELECT status, traffic_percentage INTO v_test_status, v_test_traffic
  FROM public.sdui_ab_tests
  WHERE id = p_test_id
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at >= NOW());

  IF v_test_status IS NULL OR v_test_status != 'running' THEN
    RETURN NULL;
  END IF;

  -- Check if user is in traffic percentage
  IF random() * 100 > v_test_traffic THEN
    RETURN NULL;
  END IF;

  -- Check for existing assignment
  IF p_user_id IS NOT NULL THEN
    SELECT variant_id INTO v_variant_id
    FROM public.sdui_ab_test_assignments
    WHERE test_id = p_test_id AND user_id = p_user_id;
  ELSIF p_device_fingerprint IS NOT NULL THEN
    SELECT variant_id INTO v_variant_id
    FROM public.sdui_ab_test_assignments
    WHERE test_id = p_test_id AND device_fingerprint = p_device_fingerprint;
  END IF;

  IF v_variant_id IS NOT NULL THEN
    RETURN v_variant_id;
  END IF;

  -- Assign to a variant based on weights
  v_random_value := random() * 100;

  FOR v_variant IN
    SELECT id, weight
    FROM public.sdui_ab_test_variants
    WHERE test_id = p_test_id
    ORDER BY is_control DESC, id
  LOOP
    v_cumulative_weight := v_cumulative_weight + v_variant.weight;
    IF v_random_value <= v_cumulative_weight THEN
      v_variant_id := v_variant.id;
      EXIT;
    END IF;
  END LOOP;

  -- If no variant selected (shouldn't happen), select first one
  IF v_variant_id IS NULL THEN
    SELECT id INTO v_variant_id
    FROM public.sdui_ab_test_variants
    WHERE test_id = p_test_id
    LIMIT 1;
  END IF;

  -- Create assignment
  INSERT INTO public.sdui_ab_test_assignments (test_id, variant_id, user_id, device_fingerprint)
  VALUES (p_test_id, v_variant_id, p_user_id, p_device_fingerprint)
  ON CONFLICT DO NOTHING;

  RETURN v_variant_id;
END;
$$;

-- ============================================================================
-- Function: Track AB test view
-- ============================================================================
CREATE OR REPLACE FUNCTION public.track_ab_test_view(
  p_variant_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sdui_ab_test_variants
  SET views = views + 1
  WHERE id = p_variant_id;
END;
$$;

-- ============================================================================
-- Function: Track AB test conversion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.track_ab_test_conversion(
  p_variant_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sdui_ab_test_variants
  SET conversions = conversions + 1
  WHERE id = p_variant_id;
END;
$$;

-- ============================================================================
-- Function: Get AB test results with statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_ab_test_results(
  p_test_id UUID
)
RETURNS TABLE (
  variant_id UUID,
  variant_name TEXT,
  is_control BOOLEAN,
  views INTEGER,
  conversions INTEGER,
  conversion_rate NUMERIC,
  improvement_vs_control NUMERIC,
  is_winner BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_control_rate NUMERIC;
BEGIN
  -- Get control conversion rate
  SELECT
    CASE WHEN v.views > 0 THEN (v.conversions::NUMERIC / v.views::NUMERIC) * 100 ELSE 0 END
  INTO v_control_rate
  FROM public.sdui_ab_test_variants v
  WHERE v.test_id = p_test_id AND v.is_control = true;

  RETURN QUERY
  SELECT
    v.id as variant_id,
    v.name as variant_name,
    v.is_control,
    v.views,
    v.conversions,
    CASE WHEN v.views > 0 THEN ROUND((v.conversions::NUMERIC / v.views::NUMERIC) * 100, 2) ELSE 0 END as conversion_rate,
    CASE
      WHEN v.is_control THEN 0
      WHEN v_control_rate > 0 THEN ROUND(((CASE WHEN v.views > 0 THEN (v.conversions::NUMERIC / v.views::NUMERIC) * 100 ELSE 0 END - v_control_rate) / v_control_rate) * 100, 2)
      ELSE 0
    END as improvement_vs_control,
    false as is_winner -- TODO: Calculate statistical significance
  FROM public.sdui_ab_test_variants v
  WHERE v.test_id = p_test_id
  ORDER BY conversion_rate DESC;
END;
$$;

-- ============================================================================
-- Function: Get active AB tests for a page
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_ab_tests(
  p_page TEXT
)
RETURNS TABLE (
  test_id UUID,
  test_name TEXT,
  section_key TEXT,
  goal_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as test_id,
    t.name as test_name,
    t.section_key,
    t.goal_type
  FROM public.sdui_ab_tests t
  WHERE t.page = p_page
    AND t.status = 'running'
    AND (t.starts_at IS NULL OR t.starts_at <= NOW())
    AND (t.ends_at IS NULL OR t.ends_at >= NOW());
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_ab_test_variant TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.track_ab_test_view TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.track_ab_test_conversion TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_ab_test_results TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_ab_tests TO authenticated, anon;
