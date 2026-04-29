-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Add increment_gift_rule_stats RPC function (v2 — hardened)
-- Atomic increment for gift rule statistics with validation + access control
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop previous version if exists
DROP FUNCTION IF EXISTS public.increment_gift_rule_stats(UUID, BIGINT);

CREATE OR REPLACE FUNCTION public.increment_gift_rule_stats(
  p_rule_id UUID,
  p_cost_piasters BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate inputs
  IF p_rule_id IS NULL THEN
    RAISE EXCEPTION 'p_rule_id cannot be NULL';
  END IF;

  IF p_cost_piasters IS NULL OR p_cost_piasters < 0 THEN
    p_cost_piasters := 0;
  END IF;

  UPDATE public.gift_rules
  SET
    applied_count = COALESCE(applied_count, 0) + 1,
    total_cost_piasters = COALESCE(total_cost_piasters, 0) + p_cost_piasters,
    updated_at = NOW()
  WHERE id = p_rule_id;
END;
$$;

-- Restrict execution to service_role only
REVOKE ALL ON FUNCTION public.increment_gift_rule_stats(UUID, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_gift_rule_stats(UUID, BIGINT) FROM anon;
REVOKE ALL ON FUNCTION public.increment_gift_rule_stats(UUID, BIGINT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_gift_rule_stats(UUID, BIGINT) TO service_role;
