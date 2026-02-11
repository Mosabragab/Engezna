-- ============================================================================
-- P7: Banner Analytics - Impressions & Clicks Tracking
-- Lightweight event tracking for banner performance metrics
-- ============================================================================

-- Step 1: Create banner analytics table
CREATE TABLE IF NOT EXISTS public.banner_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id UUID NOT NULL REFERENCES public.homepage_banners(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_banner_analytics_banner ON public.banner_analytics(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_event ON public.banner_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_banner_analytics_created ON public.banner_analytics(created_at);

-- Step 3: RLS policies
ALTER TABLE public.banner_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics (including anonymous)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can track banner events' AND tablename = 'banner_analytics'
  ) THEN
    CREATE POLICY "Anyone can track banner events"
      ON public.banner_analytics
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Only admins can read analytics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read banner analytics' AND tablename = 'banner_analytics'
  ) THEN
    CREATE POLICY "Admins can read banner analytics"
      ON public.banner_analytics
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Step 4: Documentation
COMMENT ON TABLE public.banner_analytics IS 'Tracks banner impressions and clicks for performance analytics';
COMMENT ON COLUMN public.banner_analytics.event_type IS 'impression = banner viewed, click = banner CTA clicked';
