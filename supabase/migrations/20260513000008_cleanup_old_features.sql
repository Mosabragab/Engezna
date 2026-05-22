-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: v2.5.2 — Cleanup deprecated features
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-13
-- Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.6 + §4.9 (v2.5.2)
--
-- Deactivate (not drop — preserve historical data):
--   1. Birthday Gift cron + birthday-related rules
--   2. Gift-it Forward (the 4 RPCs + table marked deprecated)
--   3. Merchant onboarding Golden Boxes rule (replaced by visibility boost)
--   4. Win-back bucket budget set to 0 (merged into Daily Surprise)
--
-- Note: Tables are NOT dropped. Existing entries remain readable. Only new
-- writes are blocked via deprecated flag + rule deactivation.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Mark Gift-it Forward deprecated ────────────────────────────────────────
ALTER TABLE public.gift_forwards
  ADD COLUMN IF NOT EXISTS is_deprecated BOOLEAN NOT NULL DEFAULT TRUE;

-- Block new forwards from being created (RPC throws)
CREATE OR REPLACE FUNCTION public.create_gift_forward_atomic(p_gift_entry_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Gift-it Forward is deprecated in v2.5.2'
    USING HINT = 'This feature was removed per docs/POINTS_REWARDS_PROPOSAL_V2_5.md decision matrix #2.';
END;
$$;

-- claim/peek still work for historical inflight forwards
COMMENT ON TABLE public.gift_forwards IS
  'v2.5.2: DEPRECATED. New forwards blocked. Existing entries preserved for history/claims.';

-- ─── 2. Deactivate Birthday Gift cron + rules ──────────────────────────────────
-- Disable the pg_cron job if it exists
DO $$
BEGIN
  PERFORM cron.unschedule('birthday-gifts-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'birthday-gifts-daily');
EXCEPTION WHEN OTHERS THEN
  -- cron extension may not be present in dev/staging; safe to ignore
  NULL;
END $$;

-- Mark all birthday rules inactive
UPDATE public.gift_rules
SET is_active = FALSE,
    updated_at = NOW()
WHERE trigger = 'birthday'
   OR name ILIKE '%birthday%';

-- Block process_birthday_gifts RPC from doing anything
CREATE OR REPLACE FUNCTION public.process_birthday_gifts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'granted',  0,
    'reason',   'birthday_feature_deprecated_v2_5_2'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_birthday_gifts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_birthday_gifts() TO service_role;

-- ─── 3. Deactivate merchant onboarding Golden Boxes rules ──────────────────────
UPDATE public.gift_rules
SET is_active = FALSE,
    updated_at = NOW()
WHERE name ILIKE '%merchant_onboarding%'
   OR name ILIKE '%new_provider_boost%';

-- ─── 4. Win-back bucket → merged into Daily Surprise (already in migration 1) ─
-- bucket_winback_percent = 0 was applied in 20260513000001_welcome_box_system.sql.
-- Mark win_back rules to use mystery bucket instead.
UPDATE public.gift_rules
SET action = jsonb_set(
      action,
      '{bucket}',
      '"mystery"'::jsonb
    ),
    updated_at = NOW()
WHERE action->>'bucket' = 'win_back'
  AND is_active = TRUE;

-- ─── 5. Gift Queue (max 4) → 1 daily limit ─────────────────────────────────────
-- The new "1 gift per day" rule replaces the queue concept.
-- We add the daily limit column to retention_settings.
ALTER TABLE public.retention_settings
  ADD COLUMN IF NOT EXISTS max_gifts_per_day INT NOT NULL DEFAULT 1;

-- Set queue size to 1 (effectively daily limit)
UPDATE public.retention_settings
SET gift_max_queue_size = 1,
    max_gifts_per_day   = 1,
    updated_at = NOW()
WHERE id = 1;

-- ─── 6. Minimum gift value (Daily Surprise): 5 → 10 EGP ────────────────────────
-- Find existing 5-EGP discount gifts and update their value to 10
UPDATE public.gifts
SET value_piasters = 1000,  -- 10 EGP
    title_ar       = REPLACE(title_ar, '٥ ج.م', '١٠ ج.م'),
    title_en       = REPLACE(title_en, '5 EGP', '10 EGP')
WHERE type = 'discount_code'
  AND value_piasters = 500   -- old 5 EGP
  AND (metadata IS NULL OR NOT (metadata ? 'template'));

-- ─── 7. Audit log of v2.5.2 cleanup ────────────────────────────────────────────
INSERT INTO public.gift_financial_log (
  transaction_type, amount_piasters, bucket, funder_type, notes
) VALUES (
  'grant', 0, 'welcome', 'engezna',
  'v2.5.2 migration applied: birthday/forward/merchant-boxes deactivated, queue→daily-limit, min-value 5→10 EGP'
);

COMMENT ON FUNCTION public.process_birthday_gifts() IS
  'v2.5.2: Birthday gifts deprecated. Function returns 0 grants for legacy callers.';
COMMENT ON FUNCTION public.create_gift_forward_atomic(UUID) IS
  'v2.5.2: Gift-it Forward deprecated. New forwards blocked. Historical entries still claimable.';
