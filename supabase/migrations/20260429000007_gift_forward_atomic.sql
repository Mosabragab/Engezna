-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Phase 11 — Gift-it Forward (atomic RPCs)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- Reuses the public.gift_forwards table created in 20260428000001. Adds:
--   • prior_status column so we can restore the original gift_box_entry status
--     when a forward expires unclaimed
--   • create_gift_forward_atomic — sender creates a share token (rate-limited
--     to 3 forwards per sender per 7 days)
--   • peek_gift_forward — public-safe lookup that returns the minimal preview
--     fields the recipient landing page needs (no PII beyond sender first name)
--   • claim_gift_forward_atomic — recipient claims, gets a fresh gift_box_entry,
--     sender is awarded +10 loyalty points (per plan §7.2)
--   • expire_pending_gift_forwards — restores expired/unclaimed forwards back
--     to the sender (called lazily from the rewards page load)
--
-- Constraints (per plan §7.2 / §7.3):
--   - Forwarding only from gift_type IN ('discount_code', 'discount_percent')
--     — not mystery, partner_gift, loyalty_boost, etc.
--   - Sender entry must be in status 'granted' or 'opened' (never 'used' /
--     'expired' / already 'forwarded')
--   - Recipient cannot be the sender (no self-gifting)
--   - Forward expires 48h after creation (already in table default)
--   - Once claimed, sender's entry stays in status 'forwarded' (recipient
--     receives a brand-new entry via grant_gift_atomic)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Schema additions                                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

ALTER TABLE public.gift_forwards
  ADD COLUMN IF NOT EXISTS prior_status public.gift_entry_status NOT NULL DEFAULT 'granted';

-- Recipient cannot equal sender (defense-in-depth alongside RPC check)
DO $$ BEGIN
  ALTER TABLE public.gift_forwards
    ADD CONSTRAINT gift_forwards_recipient_not_sender
    CHECK (recipient_id IS NULL OR recipient_id <> sender_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Token must be reasonably opaque
DO $$ BEGIN
  ALTER TABLE public.gift_forwards
    ADD CONSTRAINT gift_forwards_token_min_length
    CHECK (char_length(forward_token) >= 16);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Helpful index for the rate-limit scan (3 per 7 days per sender)
CREATE INDEX IF NOT EXISTS idx_gift_forwards_sender_created
  ON public.gift_forwards (sender_id, created_at DESC);


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ create_gift_forward_atomic — sender → token                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DROP FUNCTION IF EXISTS public.create_gift_forward_atomic(UUID);

CREATE OR REPLACE FUNCTION public.create_gift_forward_atomic(p_gift_entry_id UUID)
RETURNS TABLE (
  forward_id UUID,
  forward_token TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_entry public.gift_box_entries%ROWTYPE;
  v_gift public.gifts%ROWTYPE;
  v_recent_count INT;
  v_token TEXT;
  v_forward_id UUID;
  v_expires TIMESTAMPTZ := NOW() + INTERVAL '48 hours';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Lock the entry row so a concurrent open/use can't race us
  SELECT * INTO v_entry
  FROM public.gift_box_entries
  WHERE id = p_gift_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'gift_not_found';
  END IF;

  IF v_entry.user_id <> v_user_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_entry.status NOT IN ('granted', 'opened') THEN
    RAISE EXCEPTION 'gift_not_forwardable';
  END IF;

  IF v_entry.expires_at <= NOW() THEN
    RAISE EXCEPTION 'gift_expired';
  END IF;

  -- Type whitelist: discount_code OR discount_percent only (plan §7.2)
  SELECT * INTO v_gift FROM public.gifts WHERE id = v_entry.gift_id;
  IF NOT FOUND OR v_gift.type NOT IN ('discount_code', 'discount_percent') THEN
    RAISE EXCEPTION 'gift_type_not_forwardable';
  END IF;

  -- Rate limit: 3 forwards per sender per rolling 7 days
  SELECT COUNT(*) INTO v_recent_count
  FROM public.gift_forwards
  WHERE sender_id = v_user_id
    AND created_at >= NOW() - INTERVAL '7 days';

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'forward_rate_limit_exceeded';
  END IF;

  -- Generate a URL-safe opaque token (32 hex chars)
  v_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.gift_forwards (
    sender_id, gift_entry_id, forward_token, prior_status, expires_at
  ) VALUES (
    v_user_id, v_entry.id, v_token, v_entry.status, v_expires
  )
  RETURNING id INTO v_forward_id;

  -- Lock the entry as 'forwarded' until the forward is claimed or expires
  UPDATE public.gift_box_entries
  SET status = 'forwarded', forward_id = v_forward_id
  WHERE id = v_entry.id;

  forward_id := v_forward_id;
  forward_token := v_token;
  expires_at := v_expires;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_gift_forward_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_gift_forward_atomic(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_gift_forward_atomic(UUID) TO authenticated;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ peek_gift_forward — public landing page preview                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Returns the minimum the landing page needs to render the gift card. Does
-- NOT expose sender's full name or PII beyond the first word; does NOT mark
-- the forward as claimed. Public — no auth required.

DROP FUNCTION IF EXISTS public.peek_gift_forward(TEXT);

CREATE OR REPLACE FUNCTION public.peek_gift_forward(p_token TEXT)
RETURNS TABLE (
  status TEXT,             -- 'pending' | 'claimed' | 'expired' | 'not_found'
  sender_first_name TEXT,
  gift_title_ar TEXT,
  gift_title_en TEXT,
  gift_value_piasters BIGINT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_forward public.gift_forwards%ROWTYPE;
  v_gift public.gifts%ROWTYPE;
  v_entry public.gift_box_entries%ROWTYPE;
  v_sender_full_name TEXT;
  v_first TEXT;
  v_status TEXT;
BEGIN
  SELECT * INTO v_forward
  FROM public.gift_forwards
  WHERE forward_token = p_token;

  IF NOT FOUND THEN
    status := 'not_found';
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_forward.claimed_at IS NOT NULL THEN
    v_status := 'claimed';
  ELSIF v_forward.expires_at <= NOW() THEN
    v_status := 'expired';
  ELSE
    v_status := 'pending';
  END IF;

  SELECT * INTO v_entry FROM public.gift_box_entries WHERE id = v_forward.gift_entry_id;
  IF FOUND THEN
    SELECT * INTO v_gift FROM public.gifts WHERE id = v_entry.gift_id;
  END IF;

  SELECT full_name INTO v_sender_full_name
  FROM public.profiles WHERE id = v_forward.sender_id;
  v_first := COALESCE(split_part(v_sender_full_name, ' ', 1), '');

  status := v_status;
  sender_first_name := v_first;
  gift_title_ar := COALESCE(v_gift.title_ar, '');
  gift_title_en := COALESCE(v_gift.title_en, '');
  gift_value_piasters := COALESCE(v_entry.cost_piasters, 0);
  expires_at := v_forward.expires_at;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.peek_gift_forward(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_gift_forward(TEXT) TO anon, authenticated;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ claim_gift_forward_atomic — recipient claims                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Wraps grant_gift_atomic so the recipient gets a brand-new gift_box_entry
-- (with source='gift_forward'), then awards the sender +10 loyalty points.
-- All in one transaction so a partial state never leaks.

DROP FUNCTION IF EXISTS public.claim_gift_forward_atomic(TEXT, TEXT, INET);

CREATE OR REPLACE FUNCTION public.claim_gift_forward_atomic(
  p_token TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_ip INET DEFAULT NULL
)
RETURNS TABLE (
  gift_entry_id UUID,
  sender_id UUID,
  cost_piasters BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_forward public.gift_forwards%ROWTYPE;
  v_orig_entry public.gift_box_entries%ROWTYPE;
  v_orig_gift public.gifts%ROWTYPE;
  v_new_entry public.gift_box_entries%ROWTYPE;
  v_expiry_days INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Lock the forward row so two concurrent claims can't both succeed
  SELECT * INTO v_forward
  FROM public.gift_forwards
  WHERE forward_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'forward_not_found';
  END IF;

  IF v_forward.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'forward_already_claimed';
  END IF;

  IF v_forward.expires_at <= NOW() THEN
    RAISE EXCEPTION 'forward_expired';
  END IF;

  IF v_forward.sender_id = v_user_id THEN
    RAISE EXCEPTION 'cannot_claim_own_forward';
  END IF;

  SELECT * INTO v_orig_entry FROM public.gift_box_entries WHERE id = v_forward.gift_entry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'gift_not_found';
  END IF;

  SELECT * INTO v_orig_gift FROM public.gifts WHERE id = v_orig_entry.gift_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'gift_not_found';
  END IF;

  -- Recipient gets the same expiry budget as the original (in days, rounded up)
  v_expiry_days := GREATEST(
    1,
    CEIL(EXTRACT(EPOCH FROM (v_orig_entry.expires_at - v_orig_entry.created_at)) / 86400.0)::INT
  );

  -- Mint a new entry for the recipient via grant_gift_atomic so all the
  -- usual ledger writes happen consistently
  SELECT * INTO v_new_entry FROM public.grant_gift_atomic(
    v_user_id,
    v_orig_gift.id,
    'gift_forward'::public.gift_source,
    NULL, -- no rule_id — this is a peer-to-peer transfer
    v_orig_entry.bucket_name,
    v_orig_entry.cost_piasters,
    v_orig_entry.funder_type,
    v_orig_entry.funder_provider_id,
    v_expiry_days
  );

  IF v_new_entry.id IS NULL THEN
    RAISE EXCEPTION 'grant_failed';
  END IF;

  -- Mark the forward as claimed
  UPDATE public.gift_forwards
  SET
    recipient_id = v_user_id,
    claimed_at = NOW(),
    recipient_device_id = p_device_id,
    recipient_ip = p_ip
  WHERE id = v_forward.id;

  -- Award the sender +10 loyalty points (best-effort — never block the claim)
  BEGIN
    PERFORM public.award_loyalty_points_atomic(
      v_forward.sender_id,
      NULL,
      10,
      'Gift-it Forward — recipient claimed'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[claim_gift_forward_atomic] loyalty award failed: %', SQLERRM;
  END;

  gift_entry_id := v_new_entry.id;
  sender_id := v_forward.sender_id;
  cost_piasters := v_new_entry.cost_piasters;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_gift_forward_atomic(TEXT, TEXT, INET) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_gift_forward_atomic(TEXT, TEXT, INET) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_gift_forward_atomic(TEXT, TEXT, INET) TO authenticated;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ expire_pending_gift_forwards — lazy reclaim                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Restores any of the caller's expired-unclaimed forwards back to its prior
-- gift_box_entries.status. Idempotent. Called from /rewards page load and
-- from the daily gift-expiry cron.

DROP FUNCTION IF EXISTS public.expire_pending_gift_forwards();

CREATE OR REPLACE FUNCTION public.expire_pending_gift_forwards()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INT := 0;
  v_row RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_row IN
    SELECT f.id AS forward_id, f.gift_entry_id, f.prior_status, e.expires_at AS entry_expires_at
    FROM public.gift_forwards f
    JOIN public.gift_box_entries e ON e.id = f.gift_entry_id
    WHERE f.sender_id = v_user_id
      AND f.claimed_at IS NULL
      AND f.expires_at <= NOW()
      AND e.status = 'forwarded'
    FOR UPDATE OF f, e
  LOOP
    -- If the original gift itself has now expired, mark it expired; otherwise
    -- restore to the status it had before being forwarded.
    IF v_row.entry_expires_at <= NOW() THEN
      UPDATE public.gift_box_entries
      SET status = 'expired', forward_id = NULL
      WHERE id = v_row.gift_entry_id;
    ELSE
      UPDATE public.gift_box_entries
      SET status = v_row.prior_status, forward_id = NULL
      WHERE id = v_row.gift_entry_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pending_gift_forwards() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_pending_gift_forwards() FROM anon;
GRANT EXECUTE ON FUNCTION public.expire_pending_gift_forwards() TO authenticated;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ Service-role variant for the daily cron                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝
-- Walks every expired-unclaimed forward across all senders. Designed to be
-- called from /api/cron/gift-expiry (or directly from pg_cron) once a day.

DROP FUNCTION IF EXISTS public.expire_pending_gift_forwards_all();

CREATE OR REPLACE FUNCTION public.expire_pending_gift_forwards_all()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT f.id AS forward_id, f.gift_entry_id, f.prior_status, e.expires_at AS entry_expires_at
    FROM public.gift_forwards f
    JOIN public.gift_box_entries e ON e.id = f.gift_entry_id
    WHERE f.claimed_at IS NULL
      AND f.expires_at <= NOW()
      AND e.status = 'forwarded'
    FOR UPDATE OF f, e
  LOOP
    IF v_row.entry_expires_at <= NOW() THEN
      UPDATE public.gift_box_entries
      SET status = 'expired', forward_id = NULL
      WHERE id = v_row.gift_entry_id;
    ELSE
      UPDATE public.gift_box_entries
      SET status = v_row.prior_status, forward_id = NULL
      WHERE id = v_row.gift_entry_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pending_gift_forwards_all() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_pending_gift_forwards_all() FROM anon;
REVOKE ALL ON FUNCTION public.expire_pending_gift_forwards_all() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_gift_forwards_all() TO service_role;
