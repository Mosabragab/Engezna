-- ============================================================================
-- Fix SDUI get_page_sections type casting error
-- ============================================================================
-- Fixes PostgreSQL error 42883: "No operator matches the given name and
-- argument types" when comparing sdui_page_type enum with TEXT parameter.
-- Solution: Explicitly cast the TEXT parameter to sdui_page_type enum.
-- ============================================================================

-- Drop the existing function to allow signature recreation
DROP FUNCTION IF EXISTS public.get_page_sections(TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN);

-- Recreate with explicit type casting
CREATE OR REPLACE FUNCTION public.get_page_sections(
  p_page TEXT DEFAULT 'homepage',
  p_user_role TEXT DEFAULT 'guest',
  p_governorate_id UUID DEFAULT NULL,
  p_city_id UUID DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL,
  p_is_new_user BOOLEAN DEFAULT NULL
)
RETURNS SETOF public.homepage_sections
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW() AT TIME ZONE 'Africa/Cairo';
  v_current_day TEXT := LOWER(to_char(v_now, 'day'));
  v_current_time TIME := v_now::TIME;
  v_user_behavior TEXT;
  v_page sdui_page_type;
BEGIN
  -- Explicitly cast text to enum (with error handling)
  BEGIN
    v_page := p_page::sdui_page_type;
  EXCEPTION WHEN invalid_text_representation THEN
    -- Invalid page type, return empty result
    RETURN;
  END;

  -- Determine user behavior
  v_user_behavior := CASE WHEN p_is_new_user IS TRUE THEN 'new' ELSE 'returning' END;

  RETURN QUERY
  SELECT *
  FROM public.homepage_sections s
  WHERE
    -- Page filter (enum-to-enum comparison, no implicit cast needed)
    s.page = v_page

    -- Visibility check
    AND s.is_visible = true

    -- Device targeting (if specified)
    AND (
      p_device_type IS NULL
      OR s.target_devices IS NULL
      OR p_device_type = ANY(s.target_devices)
    )

    -- User behavior targeting (if specified)
    AND (
      p_is_new_user IS NULL
      OR s.target_user_behavior IS NULL
      OR v_user_behavior = ANY(s.target_user_behavior)
    )

    -- Role targeting
    AND (
      s.target_roles IS NULL
      OR p_user_role = ANY(s.target_roles)
    )

    -- Governorate targeting
    AND (
      s.target_governorates IS NULL
      OR p_governorate_id = ANY(s.target_governorates)
    )

    -- City targeting
    AND (
      s.target_cities IS NULL
      OR p_city_id = ANY(s.target_cities)
    )

    -- Date range check
    AND (s.starts_at IS NULL OR s.starts_at <= v_now)
    AND (s.ends_at IS NULL OR s.ends_at >= v_now)

    -- Schedule rules check
    AND (
      s.schedule_rules IS NULL
      OR (
        -- Check day of week
        (
          s.schedule_rules->>'days_of_week' IS NULL
          OR TRIM(v_current_day) = ANY(
            SELECT jsonb_array_elements_text(s.schedule_rules->'days_of_week')
          )
        )
        -- Check time range
        AND (
          s.schedule_rules->>'start_time' IS NULL
          OR v_current_time >= (s.schedule_rules->>'start_time')::TIME
        )
        AND (
          s.schedule_rules->>'end_time' IS NULL
          OR v_current_time <= (s.schedule_rules->>'end_time')::TIME
        )
      )
    )

    -- Visibility percentage (random selection for gradual rollouts)
    AND (
      s.visibility_percentage >= 100
      OR (random() * 100) <= s.visibility_percentage
    )

  ORDER BY s.priority DESC, s.display_order ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_page_sections TO authenticated, anon;
