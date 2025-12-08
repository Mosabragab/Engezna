-- ============================================================================
-- Migration: Settlement Groups and Automation System
-- نظام مجموعات التسوية والأتمتة
-- ============================================================================
-- Date: 2025-12-09
-- Features:
--   1. Settlement groups with frequency (daily, 3_days, weekly)
--   2. Each provider can belong to one group only
--   3. Auto-generation of settlements based on schedule
--   4. Default frequency: 3 days
--   5. Week starts on Saturday
-- ============================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS provider_settlement_groups CASCADE;
DROP TABLE IF EXISTS settlement_groups CASCADE;

-- ============================================================================
-- STEP 1: Create settlement_groups table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settlement_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,

  -- Frequency: daily (every day), 3_days (every 3 days), weekly (every week on Saturday)
  frequency TEXT NOT NULL DEFAULT '3_days' CHECK (frequency IN ('daily', '3_days', 'weekly')),

  -- Is this the default group for new providers?
  is_default BOOLEAN DEFAULT false,

  -- Is this group active?
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.settlement_groups IS 'Groups of providers with same settlement frequency';

-- Create index
CREATE INDEX idx_settlement_groups_frequency ON public.settlement_groups(frequency);
CREATE INDEX idx_settlement_groups_is_default ON public.settlement_groups(is_default) WHERE is_default = true;

-- ============================================================================
-- STEP 2: Create provider_settlement_groups junction table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.provider_settlement_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.settlement_groups(id) ON DELETE CASCADE,

  -- When was the provider added to this group
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Who added them (admin user id from profiles)
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Ensure provider can only be in ONE group
  UNIQUE(provider_id)
);

-- Add comment
COMMENT ON TABLE public.provider_settlement_groups IS 'Links providers to their settlement group (one group per provider)';

-- Create indexes
CREATE INDEX idx_provider_settlement_groups_provider ON public.provider_settlement_groups(provider_id);
CREATE INDEX idx_provider_settlement_groups_group ON public.provider_settlement_groups(group_id);

-- ============================================================================
-- STEP 3: Create default settlement groups
-- ============================================================================
INSERT INTO public.settlement_groups (name_ar, name_en, description_ar, description_en, frequency, is_default, is_active)
VALUES
  ('تسوية يومية', 'Daily Settlement', 'تسوية كل يوم', 'Settlement every day', 'daily', false, true),
  ('تسوية كل ٣ أيام', '3-Day Settlement', 'تسوية كل ٣ أيام عمل', 'Settlement every 3 business days', '3_days', true, true),
  ('تسوية أسبوعية', 'Weekly Settlement', 'تسوية كل أسبوع يوم السبت', 'Settlement every Saturday', 'weekly', false, true);

-- ============================================================================
-- STEP 4: Add settlement_group_id to providers table for quick lookup
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'providers' AND column_name = 'settlement_group_id'
  ) THEN
    ALTER TABLE public.providers
    ADD COLUMN settlement_group_id UUID REFERENCES public.settlement_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_providers_settlement_group ON public.providers(settlement_group_id);

-- ============================================================================
-- STEP 5: Function to assign default group to providers without a group
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_default_settlement_group()
RETURNS TRIGGER AS $$
DECLARE
  v_default_group_id UUID;
BEGIN
  -- Find the default group
  SELECT id INTO v_default_group_id
  FROM public.settlement_groups
  WHERE is_default = true AND is_active = true
  LIMIT 1;

  -- Assign to provider if found
  IF v_default_group_id IS NOT NULL THEN
    NEW.settlement_group_id := v_default_group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new providers
DROP TRIGGER IF EXISTS trigger_assign_default_settlement_group ON public.providers;
CREATE TRIGGER trigger_assign_default_settlement_group
  BEFORE INSERT ON public.providers
  FOR EACH ROW
  WHEN (NEW.settlement_group_id IS NULL)
  EXECUTE FUNCTION public.assign_default_settlement_group();

-- ============================================================================
-- STEP 6: RLS Policies for settlement_groups
-- ============================================================================
ALTER TABLE public.settlement_groups ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage settlement groups"
  ON public.settlement_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Providers can view groups (to see their own)
CREATE POLICY "Providers can view settlement groups"
  ON public.settlement_groups FOR SELECT
  USING (true);

-- ============================================================================
-- STEP 7: RLS Policies for provider_settlement_groups
-- ============================================================================
ALTER TABLE public.provider_settlement_groups ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage provider settlement groups"
  ON public.provider_settlement_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Providers can view their own assignment
CREATE POLICY "Providers can view own settlement group"
  ON public.provider_settlement_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.providers
      WHERE id = provider_settlement_groups.provider_id
      AND owner_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 8: Function to generate settlements automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_auto_settlements(
  p_frequency TEXT DEFAULT NULL -- NULL means all frequencies
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group RECORD;
  v_provider RECORD;
  v_settlement_id UUID;
  v_period_start TIMESTAMP WITH TIME ZONE;
  v_period_end TIMESTAMP WITH TIME ZONE;
  v_settlements_created INTEGER := 0;
  v_total_amount NUMERIC := 0;
  v_day_of_week INTEGER;
BEGIN
  -- Get current day of week (0 = Sunday, 6 = Saturday)
  v_day_of_week := EXTRACT(DOW FROM NOW());

  -- Loop through active settlement groups
  FOR v_group IN
    SELECT * FROM settlement_groups
    WHERE is_active = true
    AND (p_frequency IS NULL OR frequency = p_frequency)
  LOOP
    -- Check if it's time to generate settlements for this group
    CASE v_group.frequency
      WHEN 'daily' THEN
        -- Generate daily
        v_period_start := DATE_TRUNC('day', NOW() - INTERVAL '1 day');
        v_period_end := DATE_TRUNC('day', NOW()) - INTERVAL '1 second';

      WHEN '3_days' THEN
        -- Generate every 3 days (check if current day is divisible by 3)
        IF EXTRACT(DOY FROM NOW())::INTEGER % 3 != 0 THEN
          CONTINUE;
        END IF;
        v_period_start := DATE_TRUNC('day', NOW() - INTERVAL '3 days');
        v_period_end := DATE_TRUNC('day', NOW()) - INTERVAL '1 second';

      WHEN 'weekly' THEN
        -- Generate on Saturday (day 6)
        IF v_day_of_week != 6 THEN
          CONTINUE;
        END IF;
        v_period_start := DATE_TRUNC('day', NOW() - INTERVAL '7 days');
        v_period_end := DATE_TRUNC('day', NOW()) - INTERVAL '1 second';

      ELSE
        CONTINUE;
    END CASE;

    -- Loop through providers in this group
    FOR v_provider IN
      SELECT p.*
      FROM providers p
      WHERE p.settlement_group_id = v_group.id
      AND p.is_approved = true
    LOOP
      -- Check if settlement already exists for this period
      IF EXISTS (
        SELECT 1 FROM settlements
        WHERE provider_id = v_provider.id
        AND period_start = v_period_start
        AND period_end = v_period_end
      ) THEN
        CONTINUE;
      END IF;

      -- Calculate settlement data from orders in this period
      WITH order_stats AS (
        SELECT
          COUNT(*) as total_orders,
          COALESCE(SUM(total), 0) as gross_revenue,
          COALESCE(SUM(platform_commission), 0) as total_commission,
          -- COD breakdown
          COUNT(*) FILTER (WHERE payment_method = 'cash') as cod_orders,
          COALESCE(SUM(total) FILTER (WHERE payment_method = 'cash'), 0) as cod_revenue,
          COALESCE(SUM(platform_commission) FILTER (WHERE payment_method = 'cash'), 0) as cod_commission,
          -- Online breakdown
          COUNT(*) FILTER (WHERE payment_method = 'online') as online_orders,
          COALESCE(SUM(total) FILTER (WHERE payment_method = 'online'), 0) as online_revenue,
          COALESCE(SUM(platform_commission) FILTER (WHERE payment_method = 'online'), 0) as online_commission
        FROM orders
        WHERE provider_id = v_provider.id
        AND status = 'delivered'
        AND created_at >= v_period_start
        AND created_at <= v_period_end
      )
      SELECT * INTO v_provider FROM order_stats;

      -- Only create settlement if there are orders
      IF v_provider.total_orders > 0 THEN
        INSERT INTO settlements (
          provider_id,
          period_start,
          period_end,
          total_orders,
          gross_revenue,
          platform_commission,
          net_payout,
          status,
          cod_orders_count,
          cod_gross_revenue,
          cod_commission_owed,
          online_orders_count,
          online_gross_revenue,
          online_platform_commission,
          online_payout_owed,
          notes
        ) VALUES (
          v_provider.id,
          v_period_start,
          v_period_end,
          v_provider.total_orders,
          v_provider.gross_revenue,
          v_provider.total_commission,
          v_provider.gross_revenue - v_provider.total_commission,
          'pending',
          v_provider.cod_orders,
          v_provider.cod_revenue,
          v_provider.cod_commission,
          v_provider.online_orders,
          v_provider.online_revenue,
          v_provider.online_commission,
          v_provider.online_revenue - v_provider.online_commission,
          'تسوية تلقائية - ' || v_group.name_ar
        )
        RETURNING id INTO v_settlement_id;

        v_settlements_created := v_settlements_created + 1;
        v_total_amount := v_total_amount + (v_provider.gross_revenue - v_provider.total_commission);
      END IF;
    END LOOP;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'settlements_created', v_settlements_created,
    'total_amount', v_total_amount,
    'generated_at', NOW()
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_auto_settlements(TEXT) TO service_role;

-- ============================================================================
-- Done!
-- ============================================================================
