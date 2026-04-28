-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Add increment_gift_rule_stats RPC function
-- Atomic increment for gift rule statistics (avoids lost updates under concurrency)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_gift_rule_stats(
  p_rule_id UUID,
  p_cost_piasters BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.gift_rules
  SET
    applied_count = applied_count + 1,
    total_cost_piasters = total_cost_piasters + p_cost_piasters,
    updated_at = NOW()
  WHERE id = p_rule_id;
END;
$$;
