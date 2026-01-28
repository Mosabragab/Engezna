-- ============================================================================
-- SDUI Analytics System
-- Tracks section views, clicks, and interactions for analytics dashboard
-- ============================================================================

-- Analytics events table
CREATE TABLE IF NOT EXISTS public.sdui_section_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Section reference
  section_key TEXT NOT NULL,
  page TEXT NOT NULL,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'interaction')),
  event_count INTEGER DEFAULT 1,

  -- Aggregation date (for daily rollups)
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Device and user context
  device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  user_type TEXT CHECK (user_type IN ('guest', 'customer', 'provider', 'admin')),

  -- Location context
  governorate_id UUID REFERENCES public.governorates(id),
  city_id UUID REFERENCES public.cities(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for daily aggregation
  CONSTRAINT unique_daily_section_event UNIQUE (section_key, page, event_type, event_date, device_type, user_type)
);

-- Create indexes for analytics queries
CREATE INDEX idx_sdui_analytics_section ON public.sdui_section_analytics(section_key, page);
CREATE INDEX idx_sdui_analytics_date ON public.sdui_section_analytics(event_date);
CREATE INDEX idx_sdui_analytics_event_type ON public.sdui_section_analytics(event_type);
CREATE INDEX idx_sdui_analytics_page_date ON public.sdui_section_analytics(page, event_date);

-- Enable RLS
ALTER TABLE public.sdui_section_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics (we'll use upsert for aggregation)
CREATE POLICY "Anyone can insert analytics"
  ON public.sdui_section_analytics FOR INSERT
  WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can read analytics"
  ON public.sdui_section_analytics FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ));

-- Only admins can delete old analytics
CREATE POLICY "Admins can delete analytics"
  ON public.sdui_section_analytics FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- Function to track section event with daily aggregation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.track_section_event(
  p_section_key TEXT,
  p_page TEXT,
  p_event_type TEXT,
  p_device_type TEXT DEFAULT NULL,
  p_user_type TEXT DEFAULT 'guest',
  p_governorate_id UUID DEFAULT NULL,
  p_city_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert to aggregate daily counts
  INSERT INTO public.sdui_section_analytics (
    section_key,
    page,
    event_type,
    event_date,
    device_type,
    user_type,
    governorate_id,
    city_id,
    event_count
  )
  VALUES (
    p_section_key,
    p_page,
    p_event_type,
    CURRENT_DATE,
    p_device_type,
    p_user_type,
    p_governorate_id,
    p_city_id,
    1
  )
  ON CONFLICT (section_key, page, event_type, event_date, device_type, user_type)
  DO UPDATE SET
    event_count = sdui_section_analytics.event_count + 1,
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- Function to get section analytics summary
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_section_analytics(
  p_page TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  section_key TEXT,
  page TEXT,
  total_views BIGINT,
  total_clicks BIGINT,
  click_rate NUMERIC,
  unique_devices BIGINT,
  top_device TEXT,
  trend_direction TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH section_stats AS (
    SELECT
      a.section_key,
      a.page,
      SUM(CASE WHEN a.event_type = 'view' THEN a.event_count ELSE 0 END) as views,
      SUM(CASE WHEN a.event_type = 'click' THEN a.event_count ELSE 0 END) as clicks,
      COUNT(DISTINCT a.device_type) as device_count,
      MODE() WITHIN GROUP (ORDER BY a.device_type) as most_common_device
    FROM public.sdui_section_analytics a
    WHERE a.event_date BETWEEN p_start_date AND p_end_date
      AND (p_page IS NULL OR a.page = p_page)
    GROUP BY a.section_key, a.page
  ),
  previous_period AS (
    SELECT
      a.section_key,
      a.page,
      SUM(CASE WHEN a.event_type = 'view' THEN a.event_count ELSE 0 END) as prev_views
    FROM public.sdui_section_analytics a
    WHERE a.event_date BETWEEN (p_start_date - (p_end_date - p_start_date)) AND (p_start_date - INTERVAL '1 day')::DATE
      AND (p_page IS NULL OR a.page = p_page)
    GROUP BY a.section_key, a.page
  )
  SELECT
    ss.section_key,
    ss.page,
    ss.views as total_views,
    ss.clicks as total_clicks,
    CASE
      WHEN ss.views > 0 THEN ROUND((ss.clicks::NUMERIC / ss.views::NUMERIC) * 100, 2)
      ELSE 0
    END as click_rate,
    ss.device_count as unique_devices,
    ss.most_common_device as top_device,
    CASE
      WHEN pp.prev_views IS NULL OR pp.prev_views = 0 THEN 'new'
      WHEN ss.views > pp.prev_views THEN 'up'
      WHEN ss.views < pp.prev_views THEN 'down'
      ELSE 'stable'
    END as trend_direction
  FROM section_stats ss
  LEFT JOIN previous_period pp ON ss.section_key = pp.section_key AND ss.page = pp.page
  ORDER BY ss.views DESC;
END;
$$;

-- ============================================================================
-- Function to get daily analytics for a specific section
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_section_daily_analytics(
  p_section_key TEXT,
  p_page TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  event_date DATE,
  views BIGINT,
  clicks BIGINT,
  interactions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.event_date,
    SUM(CASE WHEN a.event_type = 'view' THEN a.event_count ELSE 0 END)::BIGINT as views,
    SUM(CASE WHEN a.event_type = 'click' THEN a.event_count ELSE 0 END)::BIGINT as clicks,
    SUM(CASE WHEN a.event_type = 'interaction' THEN a.event_count ELSE 0 END)::BIGINT as interactions
  FROM public.sdui_section_analytics a
  WHERE a.section_key = p_section_key
    AND a.page = p_page
    AND a.event_date >= (CURRENT_DATE - (p_days || ' days')::INTERVAL)::DATE
  GROUP BY a.event_date
  ORDER BY a.event_date ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.track_section_event TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_section_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_section_daily_analytics TO authenticated;
