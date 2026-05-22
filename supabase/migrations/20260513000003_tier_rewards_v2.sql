-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: v2.5.2 — Tier Rewards System (concrete benefits, no probabilities)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-13
-- Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.5.2 (v2.5.2)
--
-- Aman's restructuring: Replace "probability-based" tier rewards with concrete,
-- visible benefits. New tier table:
--
--   🥉 Bronze (0-499)       → Basics only
--   🥈 Silver (500-1,499)   → 20% off delivery (always)
--   🥇 Gold (1,500-4,999)   → 30% off + 1 free delivery/month + priority support
--   💎 Platinum (5,000+)    → Free delivery on orders ≥400 EGP + monthly box + AM
--
-- Platinum cap (≥400 EGP min order) protects margin from -65 EGP/month/Platinum.
--
-- Changes:
--   1. New table tier_rewards (configurable per-tier benefits)
--   2. New table tier_benefits_usage (track monthly free deliveries used)
--   3. Function get_tier_benefits(user_id) for checkout integration
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. tier_rewards configuration table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tier_rewards (
  tier                              TEXT PRIMARY KEY,
  delivery_discount_percent         NUMERIC(5,2) NOT NULL DEFAULT 0,
  free_deliveries_per_month         INT NOT NULL DEFAULT 0,
  free_delivery_min_order_piasters  BIGINT,  -- NULL = no min (Bronze/Silver/Gold)
  free_delivery_unlimited           BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE for Platinum
  monthly_box_value_piasters        BIGINT NOT NULL DEFAULT 0,
  priority_support                  BOOLEAN NOT NULL DEFAULT FALSE,
  account_manager                   BOOLEAN NOT NULL DEFAULT FALSE,
  badge_emoji                       TEXT,
  label_ar                          TEXT,
  label_en                          TEXT,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tier_valid CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'))
);

INSERT INTO public.tier_rewards (
  tier, delivery_discount_percent, free_deliveries_per_month,
  free_delivery_min_order_piasters, free_delivery_unlimited,
  monthly_box_value_piasters, priority_support, account_manager,
  badge_emoji, label_ar, label_en
) VALUES
  ('bronze',   0,    0,  NULL,  FALSE, 0,    FALSE, FALSE, '🥉', 'برونزي',  'Bronze'),
  ('silver',   20,   0,  NULL,  FALSE, 0,    FALSE, FALSE, '🥈', 'فضي',    'Silver'),
  ('gold',     30,   1,  NULL,  FALSE, 0,    TRUE,  FALSE, '🥇', 'ذهبي',   'Gold'),
  ('platinum', 0,    0,  40000, TRUE,  3000, TRUE,  TRUE,  '💎', 'بلاتيني', 'Platinum')
ON CONFLICT (tier) DO UPDATE SET
  delivery_discount_percent        = EXCLUDED.delivery_discount_percent,
  free_deliveries_per_month        = EXCLUDED.free_deliveries_per_month,
  free_delivery_min_order_piasters = EXCLUDED.free_delivery_min_order_piasters,
  free_delivery_unlimited          = EXCLUDED.free_delivery_unlimited,
  monthly_box_value_piasters       = EXCLUDED.monthly_box_value_piasters,
  priority_support                 = EXCLUDED.priority_support,
  account_manager                  = EXCLUDED.account_manager,
  updated_at                       = NOW();

-- ─── 2. Monthly tier benefits usage ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tier_benefits_usage (
  user_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_year               TEXT NOT NULL,  -- 'YYYY-MM'
  free_deliveries_used     INT  NOT NULL DEFAULT 0,
  monthly_box_granted_at   TIMESTAMPTZ,
  monthly_box_entry_id     UUID REFERENCES public.gift_box_entries(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, month_year),
  CONSTRAINT month_year_format CHECK (month_year ~ '^\d{4}-\d{2}$')
);

CREATE INDEX IF NOT EXISTS idx_tier_usage_month
  ON public.tier_benefits_usage(month_year);

-- ─── 3. RPC: get current tier benefits for checkout ────────────────────────────
DROP FUNCTION IF EXISTS public.get_tier_benefits_for_checkout(UUID, BIGINT);

CREATE OR REPLACE FUNCTION public.get_tier_benefits_for_checkout(
  p_user_id            UUID,
  p_order_subtotal_piasters BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier            TEXT;
  v_rewards         public.tier_rewards%ROWTYPE;
  v_month_year      TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_used_free       INT;
  v_can_use_free    BOOLEAN := FALSE;
  v_discount_pct    NUMERIC(5,2) := 0;
BEGIN
  -- Get user's current tier
  SELECT loyalty_tier INTO v_tier FROM public.profiles WHERE id = p_user_id;
  v_tier := COALESCE(v_tier, 'bronze');

  -- Get tier rewards config
  SELECT * INTO v_rewards FROM public.tier_rewards WHERE tier = v_tier;

  IF v_rewards.free_delivery_unlimited THEN
    -- Platinum: unlimited free delivery on orders ≥ min
    v_can_use_free := (p_order_subtotal_piasters >= COALESCE(v_rewards.free_delivery_min_order_piasters, 0));
  ELSIF v_rewards.free_deliveries_per_month > 0 THEN
    -- Gold: check monthly cap
    SELECT free_deliveries_used INTO v_used_free
    FROM public.tier_benefits_usage
    WHERE user_id = p_user_id AND month_year = v_month_year;
    v_used_free := COALESCE(v_used_free, 0);
    v_can_use_free := (v_used_free < v_rewards.free_deliveries_per_month);
  END IF;

  -- Delivery discount applies if free delivery is NOT used
  IF NOT v_can_use_free THEN
    v_discount_pct := v_rewards.delivery_discount_percent;
  END IF;

  RETURN jsonb_build_object(
    'tier',                       v_tier,
    'badge_emoji',                v_rewards.badge_emoji,
    'delivery_discount_percent',  v_discount_pct,
    'can_use_free_delivery',      v_can_use_free,
    'free_deliveries_remaining',  CASE
                                    WHEN v_rewards.free_delivery_unlimited THEN -1
                                    ELSE GREATEST(0, v_rewards.free_deliveries_per_month - COALESCE(v_used_free, 0))
                                  END,
    'priority_support',           v_rewards.priority_support
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_tier_benefits_for_checkout(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tier_benefits_for_checkout(UUID, BIGINT) TO authenticated, service_role;

-- ─── 4. RPC: consume free delivery (called on successful order) ────────────────
DROP FUNCTION IF EXISTS public.consume_tier_free_delivery(UUID, UUID);

CREATE OR REPLACE FUNCTION public.consume_tier_free_delivery(
  p_user_id  UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_year TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  INSERT INTO public.tier_benefits_usage (user_id, month_year, free_deliveries_used)
  VALUES (p_user_id, v_month_year, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    free_deliveries_used = public.tier_benefits_usage.free_deliveries_used + 1,
    updated_at = NOW();

  RETURN jsonb_build_object('consumed', true, 'month', v_month_year);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_tier_free_delivery(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_tier_free_delivery(UUID, UUID) TO service_role;

-- ─── 5. RPC: grant Platinum monthly box (called via cron) ──────────────────────
DROP FUNCTION IF EXISTS public.grant_platinum_monthly_box();

CREATE OR REPLACE FUNCTION public.grant_platinum_monthly_box()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count        INT := 0;
  v_user_id      UUID;
  v_month_year   TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_box_value    BIGINT;
  v_gift_id      UUID;
  v_entry_id     UUID;
BEGIN
  SELECT monthly_box_value_piasters INTO v_box_value
  FROM public.tier_rewards WHERE tier = 'platinum';

  IF v_box_value IS NULL OR v_box_value = 0 THEN
    RETURN 0;
  END IF;

  -- Resolve gift template
  SELECT id INTO v_gift_id
  FROM public.gifts
  WHERE type = 'discount_code' AND value_piasters = v_box_value
    AND metadata->>'template' = 'platinum_monthly'
  LIMIT 1;

  IF v_gift_id IS NULL THEN
    INSERT INTO public.gifts (type, value_piasters, title_ar, title_en, metadata)
    VALUES (
      'discount_code', v_box_value,
      'صندوق بلاتيني الشهري',
      'Platinum Monthly Box',
      jsonb_build_object('template', 'platinum_monthly')
    )
    RETURNING id INTO v_gift_id;
  END IF;

  FOR v_user_id IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.tier_benefits_usage u
      ON u.user_id = p.id AND u.month_year = v_month_year
    WHERE p.loyalty_tier = 'platinum'
      AND u.monthly_box_granted_at IS NULL
  LOOP
    INSERT INTO public.gift_box_entries (
      user_id, gift_id, source, status, expires_at,
      bucket_name, cost_piasters, funder_type
    ) VALUES (
      v_user_id, v_gift_id, 'manual_campaign', 'granted',
      NOW() + INTERVAL '30 days',
      'welcome', v_box_value, 'engezna'
    )
    RETURNING id INTO v_entry_id;

    INSERT INTO public.gift_financial_log (
      transaction_type, amount_piasters, bucket, funder_type,
      user_id, gift_entry_id, notes
    ) VALUES (
      'grant', v_box_value, 'welcome', 'engezna',
      v_user_id, v_entry_id, 'Platinum monthly box'
    );

    INSERT INTO public.tier_benefits_usage (user_id, month_year, monthly_box_granted_at, monthly_box_entry_id)
    VALUES (v_user_id, v_month_year, NOW(), v_entry_id)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET
      monthly_box_granted_at = EXCLUDED.monthly_box_granted_at,
      monthly_box_entry_id   = EXCLUDED.monthly_box_entry_id,
      updated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_platinum_monthly_box() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_platinum_monthly_box() TO service_role;

-- ─── 6. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.tier_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_benefits_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tier rewards" ON public.tier_rewards;
CREATE POLICY "Public can view tier rewards"
  ON public.tier_rewards FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can view own tier usage" ON public.tier_benefits_usage;
CREATE POLICY "Users can view own tier usage"
  ON public.tier_benefits_usage FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.tier_rewards IS
  'v2.5.2: Concrete tier benefits (delivery discounts, free deliveries, etc.) — replaces probabilistic rewards.';
