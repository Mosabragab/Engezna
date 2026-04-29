-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Atomic Gift Operations + Tightened RLS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-28
-- Purpose: Resolve CodeRabbit critical findings on Phase 8 PR
--   - Atomic RPCs for grant/use/expire/stamp/complete_referral
--   - Idempotent stamp accumulation via gift_stamp_orders unique table
--   - Tighten RLS: service policies → service_role; remove broad UPDATE on
--     gift_box_entries (force user opens through RPC)
-- All RPCs SECURITY DEFINER + revoked from PUBLIC + granted to service_role
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 1: gift_stamp_orders (idempotency table for stamp accumulation)         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.gift_stamp_orders (
  stamp_card_id UUID NOT NULL REFERENCES public.gift_stamps(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (stamp_card_id, order_id)
);

-- One stamp per order, regardless of which card the user is on
CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_stamp_orders_user_order
  ON public.gift_stamp_orders(user_id, order_id);

ALTER TABLE public.gift_stamp_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own stamp orders"
    ON public.gift_stamp_orders FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 2: ATOMIC RPC — expire_gift_entry                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.expire_gift_entry(UUID);

CREATE OR REPLACE FUNCTION public.expire_gift_entry(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.gift_box_entries%ROWTYPE;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'p_id cannot be NULL';
  END IF;

  -- Conditional update: only if still granted/opened AND past expiry
  UPDATE public.gift_box_entries
  SET status = 'expired'
  WHERE id = p_id
    AND status IN ('granted', 'opened')
    AND expires_at < NOW()
  RETURNING * INTO v_entry;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Log expiry in same transaction
  INSERT INTO public.gift_financial_log (
    transaction_type, amount_piasters, bucket, funder_type,
    funder_provider_id, user_id, gift_entry_id, notes
  ) VALUES (
    'expire', v_entry.cost_piasters, v_entry.bucket_name, v_entry.funder_type,
    v_entry.funder_provider_id, v_entry.user_id, v_entry.id, 'Auto-expired by cron'
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_gift_entry(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_gift_entry(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.expire_gift_entry(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_gift_entry(UUID) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 3: ATOMIC RPC — grant_gift_atomic                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Single transaction:
--   1. Lock retention_settings (FOR SHARE) to read budget caps
--   2. Compute bucket spent for current month
--   3. Verify queue size (<= max_queue_size) for the user
--   4. Compute expires_at honoring queue ordering
--   5. INSERT gift_box_entries
--   6. INSERT gift_financial_log (grant)
-- Returns: created entry row, or NULL if budget exhausted / queue full

DROP FUNCTION IF EXISTS public.grant_gift_atomic(
  UUID, UUID, public.gift_source, UUID, TEXT, BIGINT, TEXT, UUID, INT
);

CREATE OR REPLACE FUNCTION public.grant_gift_atomic(
  p_user_id UUID,
  p_gift_id UUID,
  p_source public.gift_source,
  p_rule_id UUID,
  p_bucket_name TEXT,
  p_cost_piasters BIGINT,
  p_funder_type TEXT,
  p_funder_provider_id UUID,
  p_expiry_days INT
)
RETURNS public.gift_box_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.retention_settings%ROWTYPE;
  v_bucket_percent NUMERIC;
  v_bucket_limit BIGINT;
  v_bucket_limit_with_tolerance BIGINT;
  v_month_start TIMESTAMPTZ;
  v_bucket_spent BIGINT;
  v_active_count INT;
  v_latest_expiry TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_expires_at TIMESTAMPTZ;
  v_expiry_days INT;
  v_entry public.gift_box_entries%ROWTYPE;
  v_funder_type TEXT;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'p_user_id cannot be NULL'; END IF;
  IF p_bucket_name IS NULL THEN RAISE EXCEPTION 'p_bucket_name cannot be NULL'; END IF;
  IF p_cost_piasters IS NULL OR p_cost_piasters < 0 THEN
    RAISE EXCEPTION 'p_cost_piasters must be non-negative';
  END IF;

  v_funder_type := COALESCE(p_funder_type, 'engezna');
  IF v_funder_type NOT IN ('engezna', 'partner') THEN
    RAISE EXCEPTION 'Invalid funder_type: %', v_funder_type;
  END IF;

  -- Lock settings row for consistent read
  SELECT * INTO v_settings
  FROM public.retention_settings
  WHERE id = 1
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'retention_settings row missing';
  END IF;

  v_expiry_days := COALESCE(p_expiry_days, v_settings.gift_default_expiry_days);

  -- Map bucket → percent
  v_bucket_percent := CASE p_bucket_name
    WHEN 'mystery'  THEN v_settings.bucket_mystery_percent
    WHEN 'stamp'    THEN v_settings.bucket_stamp_percent
    WHEN 'referral' THEN v_settings.bucket_referral_percent
    WHEN 'win_back' THEN v_settings.bucket_winback_percent
    WHEN 'welcome'  THEN v_settings.bucket_welcome_percent
    ELSE NULL
  END;

  IF v_bucket_percent IS NULL THEN
    RAISE EXCEPTION 'Unknown bucket: %', p_bucket_name;
  END IF;

  -- Budget check (only for engezna-funded gifts)
  IF v_funder_type = 'engezna' THEN
    v_bucket_limit := ROUND(v_settings.monthly_total_budget_piasters * v_bucket_percent / 100);
    v_bucket_limit_with_tolerance := ROUND(
      v_bucket_limit * (1 + v_settings.overflow_tolerance_percent / 100)
    );

    v_month_start := DATE_TRUNC('month', v_now);

    SELECT COALESCE(SUM(amount_piasters), 0)
    INTO v_bucket_spent
    FROM public.gift_financial_log
    WHERE bucket = p_bucket_name
      AND funder_type = 'engezna'
      AND transaction_type = 'grant'
      AND created_at >= v_month_start;

    IF v_bucket_spent + p_cost_piasters > v_bucket_limit_with_tolerance THEN
      RETURN NULL; -- budget exhausted; caller logs/skips
    END IF;
  END IF;

  -- Queue check + compute expires_at
  SELECT COUNT(*), MAX(expires_at)
  INTO v_active_count, v_latest_expiry
  FROM public.gift_box_entries
  WHERE user_id = p_user_id
    AND status IN ('granted', 'opened');

  IF v_active_count >= v_settings.gift_max_queue_size THEN
    RETURN NULL; -- queue full
  END IF;

  IF v_latest_expiry IS NOT NULL AND v_latest_expiry > v_now THEN
    v_expires_at := v_latest_expiry + (v_expiry_days || ' days')::INTERVAL;
  ELSE
    v_expires_at := v_now + (v_expiry_days || ' days')::INTERVAL;
  END IF;

  -- Insert gift entry
  INSERT INTO public.gift_box_entries (
    user_id, gift_id, source, rule_id, status, expires_at,
    bucket_name, cost_piasters, funder_type, funder_provider_id
  ) VALUES (
    p_user_id, p_gift_id, p_source, p_rule_id, 'granted', v_expires_at,
    p_bucket_name, p_cost_piasters, v_funder_type, p_funder_provider_id
  )
  RETURNING * INTO v_entry;

  -- Log financial entry in same transaction
  INSERT INTO public.gift_financial_log (
    transaction_type, amount_piasters, bucket, funder_type,
    funder_provider_id, user_id, gift_entry_id
  ) VALUES (
    'grant', p_cost_piasters, p_bucket_name, v_funder_type,
    p_funder_provider_id, p_user_id, v_entry.id
  );

  RETURN v_entry;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_gift_atomic(
  UUID, UUID, public.gift_source, UUID, TEXT, BIGINT, TEXT, UUID, INT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_gift_atomic(
  UUID, UUID, public.gift_source, UUID, TEXT, BIGINT, TEXT, UUID, INT
) FROM anon;
REVOKE ALL ON FUNCTION public.grant_gift_atomic(
  UUID, UUID, public.gift_source, UUID, TEXT, BIGINT, TEXT, UUID, INT
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_gift_atomic(
  UUID, UUID, public.gift_source, UUID, TEXT, BIGINT, TEXT, UUID, INT
) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 4: ATOMIC RPC — open_gift_atomic (user-driven)                           ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Authenticated users call this to "open" a mystery box — conditional update
-- enforces ownership + status='granted' atomically.

DROP FUNCTION IF EXISTS public.open_gift_atomic(UUID);

CREATE OR REPLACE FUNCTION public.open_gift_atomic(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_updated INT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_id IS NULL THEN
    RAISE EXCEPTION 'p_id cannot be NULL';
  END IF;

  UPDATE public.gift_box_entries
  SET status = 'opened', opened_at = NOW()
  WHERE id = p_id
    AND user_id = v_user
    AND status = 'granted'
    AND expires_at > NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.open_gift_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_gift_atomic(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.open_gift_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_gift_atomic(UUID) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 5: ATOMIC RPC — use_gift_atomic                                          ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Conditional update enforces ownership, status, expiry — returns 0 rows if any
-- precondition fails (TOCTOU-safe).

DROP FUNCTION IF EXISTS public.use_gift_atomic(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION public.use_gift_atomic(
  p_id UUID,
  p_user_id UUID,
  p_order_id UUID
)
RETURNS BIGINT  -- returns discount_piasters on success, 0 on failure
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.gift_box_entries%ROWTYPE;
BEGIN
  IF p_id IS NULL OR p_user_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'All arguments are required';
  END IF;

  UPDATE public.gift_box_entries
  SET status = 'used', used_at = NOW(), used_order_id = p_order_id
  WHERE id = p_id
    AND user_id = p_user_id
    AND status IN ('granted', 'opened')
    AND expires_at > NOW()
  RETURNING * INTO v_entry;

  IF NOT FOUND THEN
    -- Best-effort: mark expired if past-due, but don't error
    UPDATE public.gift_box_entries
    SET status = 'expired'
    WHERE id = p_id
      AND status IN ('granted', 'opened')
      AND expires_at <= NOW();
    RETURN 0;
  END IF;

  -- Log use in same transaction
  INSERT INTO public.gift_financial_log (
    transaction_type, amount_piasters, bucket, funder_type,
    funder_provider_id, user_id, gift_entry_id, order_id
  ) VALUES (
    'use', v_entry.cost_piasters, v_entry.bucket_name, v_entry.funder_type,
    v_entry.funder_provider_id, v_entry.user_id, v_entry.id, p_order_id
  );

  RETURN v_entry.cost_piasters;
END;
$$;

REVOKE ALL ON FUNCTION public.use_gift_atomic(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.use_gift_atomic(UUID, UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.use_gift_atomic(UUID, UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.use_gift_atomic(UUID, UUID, UUID) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 6: ATOMIC RPC — add_gift_stamp_atomic                                    ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Idempotent: relies on UNIQUE(stamp_card_id, order_id) and UNIQUE(user_id, order_id)
-- to prevent double-credit on retries / concurrent calls.

DROP FUNCTION IF EXISTS public.add_gift_stamp_atomic(UUID, UUID, BIGINT);

CREATE OR REPLACE FUNCTION public.add_gift_stamp_atomic(
  p_user_id UUID,
  p_order_id UUID,
  p_subtotal_piasters BIGINT
)
RETURNS public.gift_stamps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.retention_settings%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_card public.gift_stamps%ROWTYPE;
  v_inserted_link BOOLEAN := FALSE;
  v_new_count INT;
  v_is_completed BOOLEAN;
BEGIN
  IF p_user_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id and p_order_id required';
  END IF;

  SELECT * INTO v_settings FROM public.retention_settings WHERE id = 1 FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'retention_settings missing';
  END IF;

  IF p_subtotal_piasters IS NULL OR p_subtotal_piasters < v_settings.stamp_min_order_piasters THEN
    RETURN NULL;
  END IF;

  -- Get or create active card (lock to serialize concurrent stamps)
  SELECT * INTO v_card
  FROM public.gift_stamps
  WHERE user_id = p_user_id AND is_completed = FALSE
  FOR UPDATE;

  IF NOT FOUND OR v_card.card_expires_at < v_now THEN
    -- Mark expired card as completed (so unique partial index permits a new card)
    IF FOUND AND v_card.card_expires_at < v_now THEN
      UPDATE public.gift_stamps SET is_completed = TRUE WHERE id = v_card.id;
    END IF;

    INSERT INTO public.gift_stamps (
      user_id, card_started_at, card_expires_at, stamp_count, order_ids
    ) VALUES (
      p_user_id, v_now,
      v_now + (v_settings.stamp_card_validity_days || ' days')::INTERVAL,
      0, '{}'
    )
    RETURNING * INTO v_card;
  END IF;

  -- Try to insert idempotency link (will be no-op on retry due to unique index)
  BEGIN
    INSERT INTO public.gift_stamp_orders (stamp_card_id, order_id, user_id)
    VALUES (v_card.id, p_order_id, p_user_id);
    v_inserted_link := TRUE;
  EXCEPTION WHEN unique_violation THEN
    v_inserted_link := FALSE;
  END;

  IF NOT v_inserted_link THEN
    -- Order already credited a stamp; return current card unchanged
    RETURN v_card;
  END IF;

  v_new_count := v_card.stamp_count + 1;
  v_is_completed := v_new_count >= v_settings.stamp_card_size;

  UPDATE public.gift_stamps
  SET
    stamp_count = v_new_count,
    order_ids = array_append(COALESCE(order_ids, '{}'), p_order_id),
    is_completed = v_is_completed
  WHERE id = v_card.id
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

REVOKE ALL ON FUNCTION public.add_gift_stamp_atomic(UUID, UUID, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_gift_stamp_atomic(UUID, UUID, BIGINT) FROM anon;
REVOKE ALL ON FUNCTION public.add_gift_stamp_atomic(UUID, UUID, BIGINT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.add_gift_stamp_atomic(UUID, UUID, BIGINT) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 7: ATOMIC RPC — complete_referral_atomic                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Single transaction:
--   1. Lock pending referral (FOR UPDATE) for the referee
--   2. Verify status='pending' (idempotency)
--   3. Verify monthly cap for referrer
--   4. Grant referrer gift via grant_gift_atomic (same transaction)
--   5. Grant referee welcome gift via grant_gift_atomic
--   6. Update referrals row with completed status + applied flags
-- If either grant returns NULL (budget exhausted), referral remains 'pending'
-- and we RAISE so caller can retry / surface to admin.

DROP FUNCTION IF EXISTS public.complete_referral_atomic(UUID, UUID);

CREATE OR REPLACE FUNCTION public.complete_referral_atomic(
  p_referee_id UUID,
  p_order_id UUID
)
RETURNS TABLE (
  referral_id UUID,
  referrer_gift_entry_id UUID,
  referee_gift_entry_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
  v_settings public.retention_settings%ROWTYPE;
  v_month_start TIMESTAMPTZ;
  v_monthly_count INT;
  v_referrer_entry public.gift_box_entries%ROWTYPE;
  v_referee_entry public.gift_box_entries%ROWTYPE;
BEGIN
  IF p_referee_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_referee_id and p_order_id required';
  END IF;

  -- Lock pending referral row
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referee_id = p_referee_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_pending_referral';
  END IF;

  -- Reload settings under share lock
  SELECT * INTO v_settings FROM public.retention_settings WHERE id = 1 FOR SHARE;

  -- Monthly cap check for referrer
  v_month_start := DATE_TRUNC('month', NOW());
  SELECT COUNT(*) INTO v_monthly_count
  FROM public.referrals
  WHERE referrer_id = v_referral.referrer_id
    AND status = 'completed'
    AND completed_at >= v_month_start;

  IF v_monthly_count >= v_settings.referral_monthly_limit_per_user THEN
    RAISE EXCEPTION 'monthly_cap_reached';
  END IF;

  -- Grant referrer reward
  SELECT * INTO v_referrer_entry FROM public.grant_gift_atomic(
    v_referral.referrer_id,
    NULL,
    'referral'::public.gift_source,
    NULL,
    'referral',
    v_settings.referral_reward_piasters,
    'engezna',
    NULL,
    v_settings.gift_default_expiry_days
  );

  IF v_referrer_entry.id IS NULL THEN
    RAISE EXCEPTION 'referrer_grant_failed';
  END IF;

  -- Grant referee welcome reward
  SELECT * INTO v_referee_entry FROM public.grant_gift_atomic(
    p_referee_id,
    NULL,
    'welcome'::public.gift_source,
    NULL,
    'welcome',
    v_settings.referral_reward_piasters,
    'engezna',
    NULL,
    v_settings.gift_default_expiry_days
  );

  IF v_referee_entry.id IS NULL THEN
    RAISE EXCEPTION 'referee_grant_failed';
  END IF;

  -- Mark referral completed
  UPDATE public.referrals
  SET
    status = 'completed',
    completed_at = NOW(),
    referee_first_order_id = p_order_id,
    referrer_credit_applied = TRUE,
    referee_credit_applied = TRUE
  WHERE id = v_referral.id;

  referral_id := v_referral.id;
  referrer_gift_entry_id := v_referrer_entry.id;
  referee_gift_entry_id := v_referee_entry.id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_referral_atomic(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_referral_atomic(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.complete_referral_atomic(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_referral_atomic(UUID, UUID) TO service_role;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 8: TIGHTEN RLS POLICIES                                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- All "Service can ..." policies → restrict to service_role.
-- Users no longer have direct UPDATE on gift_box_entries — must go through
-- open_gift_atomic RPC (SECURITY DEFINER).

-- ── gift_box_entries ──
DROP POLICY IF EXISTS "Users can update own gifts (open)" ON public.gift_box_entries;
DROP POLICY IF EXISTS "Service can insert gift entries" ON public.gift_box_entries;

DO $$ BEGIN
  CREATE POLICY "Service can insert gift entries"
    ON public.gift_box_entries FOR INSERT
    TO service_role
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service can update gift entries"
    ON public.gift_box_entries FOR UPDATE
    TO service_role
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── gift_stamps ──
DROP POLICY IF EXISTS "Service can manage stamps" ON public.gift_stamps;

DO $$ BEGIN
  CREATE POLICY "Service can manage stamps"
    ON public.gift_stamps FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── gift_forwards ──
DROP POLICY IF EXISTS "Service can manage forwards" ON public.gift_forwards;

DO $$ BEGIN
  CREATE POLICY "Service can manage forwards"
    ON public.gift_forwards FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── gift_financial_log ──
DROP POLICY IF EXISTS "Service can insert financial log" ON public.gift_financial_log;

DO $$ BEGIN
  CREATE POLICY "Service can insert financial log"
    ON public.gift_financial_log FOR INSERT
    TO service_role
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── customer_segments_daily ──
DROP POLICY IF EXISTS "Service can manage segments" ON public.customer_segments_daily;

DO $$ BEGIN
  CREATE POLICY "Service can manage segments"
    ON public.customer_segments_daily FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── gift_stamp_orders (new table — service-only writes) ──
DO $$ BEGIN
  CREATE POLICY "Service can manage stamp orders"
    ON public.gift_stamp_orders FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
