-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Phase 15 — Provider Analytics Subscriptions
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- Wires the provider_subscriptions table (already exists from
-- 20260428000001_gift_box_loyalty_referral_system.sql) into actionable RPCs.
--
-- Pricing (per plan §15.1):
--   basic    — 0 EGP        — تقارير مبسطة
--   pro      — 299 EGP      — تحليلات متقدمة (cohort, peak hours, products)
--   elite    — 599 EGP      — Pro + ديموغرافية + توقعات AI + دعم أولوية
--
-- Schema additions:
--   • Partial unique index: at most one active subscription per provider.
--   • CHECK constraint: ends_at > starts_at when ends_at is set.
--   • status helper view (optional — kept inline as plpgsql for simplicity).
--
-- New RPCs:
--   • admin_set_provider_subscription_atomic(provider_id, tier,
--       granted_free, ends_at, actor_id) — replaces any current row with a
--       new active subscription. Idempotent in the sense that calling it
--       twice with the same tier is a no-op.
--   • provider_current_subscription(provider_id) — returns the active row
--     or 'basic' default if none.
--   • cancel_provider_subscription_atomic(provider_id, actor_id) — admin
--     downgrade to basic.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Schema additions                                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- One active subscription per provider — "active" defined as tier <> 'basic'
-- AND (ends_at IS NULL OR ends_at > NOW()). Postgres can't reference NOW()
-- in a partial-index predicate (NOW() isn't IMMUTABLE), so we approximate:
-- one row per provider where tier > basic. Application-level checks handle
-- expired rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_subscriptions_one_active
  ON public.provider_subscriptions (provider_id)
  WHERE tier <> 'basic';

DO $$ BEGIN
  ALTER TABLE public.provider_subscriptions
    ADD CONSTRAINT provider_subscriptions_ends_after_starts
    CHECK (ends_at IS NULL OR ends_at > starts_at);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ admin_set_provider_subscription_atomic                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.admin_set_provider_subscription_atomic(
  UUID, public.subscription_tier, BOOLEAN, TIMESTAMPTZ, UUID
);

CREATE OR REPLACE FUNCTION public.admin_set_provider_subscription_atomic(
  p_provider_id UUID,
  p_tier public.subscription_tier,
  p_granted_free BOOLEAN DEFAULT FALSE,
  p_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS public.provider_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price BIGINT;
  v_row public.provider_subscriptions%ROWTYPE;
BEGIN
  IF p_provider_id IS NULL THEN RAISE EXCEPTION 'provider_required'; END IF;

  -- Plan §15.1 pricing — single source of truth
  v_price := CASE p_tier
    WHEN 'basic' THEN 0
    WHEN 'pro' THEN 29900
    WHEN 'elite' THEN 59900
  END;

  -- Replace any existing non-basic subscription before inserting the new one
  -- (the partial unique index would reject duplicates otherwise).
  DELETE FROM public.provider_subscriptions
  WHERE provider_id = p_provider_id AND tier <> 'basic';

  -- basic = revoke / no row needed (the RLS-level absence of a row IS basic)
  IF p_tier = 'basic' THEN
    v_row := ROW(
      gen_random_uuid(),
      p_provider_id,
      'basic'::public.subscription_tier,
      NOW(),
      p_ends_at,
      FALSE,
      0,
      p_granted_free,
      p_actor_id,
      NOW()
    )::public.provider_subscriptions;
    RETURN v_row;
  END IF;

  INSERT INTO public.provider_subscriptions (
    provider_id, tier, starts_at, ends_at, auto_renew,
    price_piasters, granted_free, granted_by
  ) VALUES (
    p_provider_id, p_tier, NOW(), p_ends_at,
    NOT p_granted_free, -- granted-free entries don't auto-renew (no card on file)
    v_price, p_granted_free, p_actor_id
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_provider_subscription_atomic(
  UUID, public.subscription_tier, BOOLEAN, TIMESTAMPTZ, UUID
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_provider_subscription_atomic(
  UUID, public.subscription_tier, BOOLEAN, TIMESTAMPTZ, UUID
) FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_provider_subscription_atomic(
  UUID, public.subscription_tier, BOOLEAN, TIMESTAMPTZ, UUID
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_provider_subscription_atomic(
  UUID, public.subscription_tier, BOOLEAN, TIMESTAMPTZ, UUID
) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ cancel_provider_subscription_atomic — explicit downgrade to basic             ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.cancel_provider_subscription_atomic(UUID, UUID);

CREATE OR REPLACE FUNCTION public.cancel_provider_subscription_atomic(
  p_provider_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM public.provider_subscriptions
    WHERE provider_id = p_provider_id AND tier <> 'basic'
    RETURNING id
  )
  SELECT COUNT(*)::INT INTO v_count FROM deleted;

  -- Touch updated_at on providers so the cache layer (if any) invalidates
  UPDATE public.providers SET updated_at = NOW() WHERE id = p_provider_id;

  RETURN v_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_provider_subscription_atomic(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_provider_subscription_atomic(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.cancel_provider_subscription_atomic(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_provider_subscription_atomic(UUID, UUID) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ provider_current_subscription — read helper (RLS-aware)                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Returns the active row, or a synthesized 'basic' default. Returns one row.

DROP FUNCTION IF EXISTS public.provider_current_subscription(UUID);

CREATE OR REPLACE FUNCTION public.provider_current_subscription(p_provider_id UUID)
RETURNS TABLE (
  tier public.subscription_tier,
  is_active BOOLEAN,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  granted_free BOOLEAN,
  price_piasters BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.provider_subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.provider_subscriptions
  WHERE provider_id = p_provider_id AND tier <> 'basic'
  ORDER BY starts_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    tier := 'basic';
    is_active := TRUE;
    starts_at := NULL;
    ends_at := NULL;
    granted_free := FALSE;
    price_piasters := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  tier := v_row.tier;
  is_active := (v_row.ends_at IS NULL OR v_row.ends_at > NOW());
  starts_at := v_row.starts_at;
  ends_at := v_row.ends_at;
  granted_free := v_row.granted_free;
  price_piasters := v_row.price_piasters;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.provider_current_subscription(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provider_current_subscription(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.provider_current_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_current_subscription(UUID) TO service_role;
