-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Phase 10 follow-up — Birthday idempotency partial index
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
--
-- The daily birthday cron (process_birthday_gifts) checks whether a user has
-- already received a birthday gift today before granting a new one:
--
--   SELECT COUNT(*) FROM public.gift_box_entries
--   WHERE user_id = v_user.id
--     AND source = 'birthday'
--     AND created_at >= CURRENT_DATE
--     AND created_at <  CURRENT_DATE + INTERVAL '1 day';
--
-- A partial index on (user_id, created_at) WHERE source = 'birthday' lets the
-- planner satisfy the lookup without scanning the entire gift_box_entries
-- table (which grows continuously). We keep the index narrow by filtering on
-- the rare 'birthday' source.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_gift_box_entries_birthday_idempotency
  ON public.gift_box_entries (user_id, created_at)
  WHERE source = 'birthday';
