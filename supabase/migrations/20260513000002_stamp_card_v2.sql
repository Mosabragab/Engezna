-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: v2.5.2 — Stamp Card v2 (3 stamps + per-stamp monthly expiry)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-05-13
-- Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.3 (v2.5.2)
--
-- Aman's decision: 4 stamps → 3 stamps + each stamp expires after 1 month
-- Reasoning: Higher completion rate (65% vs 30%) + stronger word-of-mouth +
-- faster habit formation (BJ Fogg model). Per-customer revenue actually goes
-- up despite per-card payout shrinking, when accounting for completion rate.
--
-- Golden Box: variable 90/10 distribution (75 / 100 EGP) — Skinner's Variable
-- Rewards Psychology + storytelling value.
--
-- Changes:
--   1. retention_settings: stamp_card_size 4→3, min 300→500, Golden Box weights
--   2. New table gift_stamp_entries (per-stamp expiry tracking)
--   3. Updated add_gift_stamp_atomic RPC for new logic
--   4. Updated grant_golden_box logic with weighted random 90/10
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Update retention_settings ──────────────────────────────────────────────
UPDATE public.retention_settings
SET
  stamp_card_size           = 3,        -- was 4
  stamp_min_order_piasters  = 50000,    -- was 30000 (300 → 500 EGP)
  stamp_card_validity_days  = 30,       -- now interpreted as per-stamp days
  golden_box_default_piasters = 7500,   -- was 5000 (50 → 75 EGP for the common case)
  golden_box_max_piasters     = 10000,  -- 100 EGP (rare case, unchanged)
  updated_at = NOW()
WHERE id = 1;

-- Add Golden Box weight columns
ALTER TABLE public.retention_settings
  ADD COLUMN IF NOT EXISTS golden_box_weight_default NUMERIC(5,2) DEFAULT 90.00,
  ADD COLUMN IF NOT EXISTS golden_box_weight_max     NUMERIC(5,2) DEFAULT 10.00;

-- ─── 2. Per-stamp expiry tracking ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_stamp_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stamp_card_id   UUID NOT NULL REFERENCES public.gift_stamps(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES public.orders(id),
  stamped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  is_expired      BOOLEAN NOT NULL DEFAULT FALSE,
  expired_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_stamp_entry_order UNIQUE (stamp_card_id, order_id),
  CONSTRAINT uq_user_order_stamp  UNIQUE (user_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_stamp_entries_expiry
  ON public.gift_stamp_entries(expires_at)
  WHERE is_expired = FALSE;

CREATE INDEX IF NOT EXISTS idx_stamp_entries_card
  ON public.gift_stamp_entries(stamp_card_id);

-- ─── 3. Replace add_gift_stamp_atomic with v2 logic ────────────────────────────
DROP FUNCTION IF EXISTS public.add_gift_stamp_atomic(UUID, UUID, BIGINT);

CREATE OR REPLACE FUNCTION public.add_gift_stamp_atomic(
  p_user_id    UUID,
  p_order_id   UUID,
  p_subtotal_piasters BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings        public.retention_settings%ROWTYPE;
  v_card_id         UUID;
  v_stamp_count     INT;
  v_active_stamps   INT;
  v_golden_value    BIGINT;
  v_golden_entry_id UUID;
  v_gift_id         UUID;
BEGIN
  -- Load settings
  SELECT * INTO v_settings FROM public.retention_settings WHERE id = 1 FOR SHARE;

  -- Eligibility check
  IF p_subtotal_piasters < v_settings.stamp_min_order_piasters THEN
    RETURN jsonb_build_object('stamped', false, 'reason', 'below_minimum',
                              'minimum_piasters', v_settings.stamp_min_order_piasters);
  END IF;

  -- Find or create active card
  SELECT id INTO v_card_id
  FROM public.gift_stamps
  WHERE user_id = p_user_id AND is_completed = FALSE
  FOR UPDATE;

  IF v_card_id IS NULL THEN
    INSERT INTO public.gift_stamps (user_id, card_started_at)
    VALUES (p_user_id, NOW())
    RETURNING id INTO v_card_id;
  END IF;

  -- Insert stamp entry (idempotent via UNIQUE constraint)
  BEGIN
    INSERT INTO public.gift_stamp_entries (
      stamp_card_id, user_id, order_id, expires_at
    ) VALUES (
      v_card_id, p_user_id, p_order_id,
      NOW() + INTERVAL '30 days'
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('stamped', false, 'reason', 'already_stamped');
  END;

  -- Count active (non-expired) stamps on this card
  SELECT COUNT(*) INTO v_active_stamps
  FROM public.gift_stamp_entries
  WHERE stamp_card_id = v_card_id AND is_expired = FALSE;

  -- Update card's denormalized count
  UPDATE public.gift_stamps
  SET stamp_count = v_active_stamps,
      order_ids = array_append(order_ids, p_order_id)
  WHERE id = v_card_id;

  -- Check completion (v2: 3 stamps)
  IF v_active_stamps >= v_settings.stamp_card_size THEN
    -- Weighted random: 90% → default, 10% → max
    IF random() * 100 < v_settings.golden_box_weight_max THEN
      v_golden_value := v_settings.golden_box_max_piasters;       -- 100 EGP
    ELSE
      v_golden_value := v_settings.golden_box_default_piasters;   -- 75 EGP
    END IF;

    -- Resolve Golden Box gift template
    SELECT id INTO v_gift_id
    FROM public.gifts
    WHERE type = 'golden_box' AND value_piasters = v_golden_value
    LIMIT 1;

    IF v_gift_id IS NULL THEN
      INSERT INTO public.gifts (type, value_piasters, title_ar, title_en, metadata)
      VALUES (
        'golden_box', v_golden_value,
        format('صندوق ذهبي %s ج.م', (v_golden_value / 100)::TEXT),
        format('Golden Box %s EGP', (v_golden_value / 100)::TEXT),
        jsonb_build_object('source', 'stamp_card_completion')
      )
      RETURNING id INTO v_gift_id;
    END IF;

    -- Grant Golden Box
    INSERT INTO public.gift_box_entries (
      user_id, gift_id, source, status, expires_at,
      bucket_name, cost_piasters, funder_type
    ) VALUES (
      p_user_id, v_gift_id, 'stamp_card', 'granted',
      NOW() + INTERVAL '7 days',
      'stamp', v_golden_value, 'engezna'
    )
    RETURNING id INTO v_golden_entry_id;

    -- Log financial
    INSERT INTO public.gift_financial_log (
      transaction_type, amount_piasters, bucket, funder_type,
      user_id, gift_entry_id, notes
    ) VALUES (
      'grant', v_golden_value, 'stamp', 'engezna',
      p_user_id, v_golden_entry_id,
      format('Stamp Card v2 completion (Golden Box %s EGP)', (v_golden_value / 100)::TEXT)
    );

    -- Mark card complete
    UPDATE public.gift_stamps
    SET is_completed = TRUE, golden_box_id = v_golden_entry_id
    WHERE id = v_card_id;

    RETURN jsonb_build_object(
      'stamped',        true,
      'stamp_count',    v_active_stamps,
      'card_completed', true,
      'golden_box_value_piasters', v_golden_value,
      'golden_entry_id', v_golden_entry_id
    );
  END IF;

  RETURN jsonb_build_object(
    'stamped',     true,
    'stamp_count', v_active_stamps,
    'remaining',   v_settings.stamp_card_size - v_active_stamps
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_gift_stamp_atomic(UUID, UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_gift_stamp_atomic(UUID, UUID, BIGINT) TO service_role;

-- ─── 4. Cron-friendly: expire overdue stamps ───────────────────────────────────
DROP FUNCTION IF EXISTS public.expire_overdue_stamps();

CREATE OR REPLACE FUNCTION public.expire_overdue_stamps()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  WITH expired AS (
    UPDATE public.gift_stamp_entries
    SET is_expired = TRUE, expired_at = NOW()
    WHERE is_expired = FALSE
      AND expires_at <= NOW()
    RETURNING stamp_card_id
  ),
  -- Recount active stamps on affected cards
  recount AS (
    UPDATE public.gift_stamps gs
    SET stamp_count = (
      SELECT COUNT(*)
      FROM public.gift_stamp_entries
      WHERE stamp_card_id = gs.id AND is_expired = FALSE
    )
    WHERE gs.id IN (SELECT stamp_card_id FROM expired)
    RETURNING gs.id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_overdue_stamps() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_overdue_stamps() TO service_role;

COMMENT ON TABLE  public.gift_stamp_entries IS
  'v2.5.2: Per-stamp expiry tracking. Each stamp expires 30 days from issuance.';
COMMENT ON FUNCTION public.add_gift_stamp_atomic(UUID, UUID, BIGINT) IS
  'v2.5.2: 3 stamps + monthly per-stamp expiry + Golden Box 90/10 weighted random.';
