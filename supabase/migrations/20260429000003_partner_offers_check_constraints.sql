-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Defense-in-depth CHECK constraints on gift_partner_offers
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-29
-- Purpose: Mirror the JS-level validations from PartnerGiftsService.createDraftOffer
-- at the DB layer so direct inserts (admin tools, future RPCs, etc.) cannot
-- create rows that violate the business rules.
--
-- Constraints added:
--   • max_orders > 0
--   • max_discount_total_piasters NULL or > 0
--   • used_orders >= 0
--   • total_discount_used_piasters >= 0
--   • ends_at > starts_at
--   • Status transitions away from draft must have terms_accepted = true
--     (i.e., providers can save a draft without accepting, but the moment
--     anyone else looks at the offer the terms must be accepted)
--
-- Done with NOT VALID + VALIDATE to avoid blocking on existing rows; the
-- VALIDATE will fail loudly if any current row violates a rule, which is
-- exactly the signal we want.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.gift_partner_offers
  ADD CONSTRAINT gift_partner_offers_max_orders_positive
  CHECK (max_orders > 0) NOT VALID;

ALTER TABLE public.gift_partner_offers
  ADD CONSTRAINT gift_partner_offers_max_discount_positive
  CHECK (max_discount_total_piasters IS NULL OR max_discount_total_piasters > 0) NOT VALID;

ALTER TABLE public.gift_partner_offers
  ADD CONSTRAINT gift_partner_offers_used_nonneg
  CHECK (used_orders >= 0) NOT VALID;

ALTER TABLE public.gift_partner_offers
  ADD CONSTRAINT gift_partner_offers_total_used_nonneg
  CHECK (total_discount_used_piasters >= 0) NOT VALID;

ALTER TABLE public.gift_partner_offers
  ADD CONSTRAINT gift_partner_offers_dates_ordered
  CHECK (ends_at > starts_at) NOT VALID;

ALTER TABLE public.gift_partner_offers
  ADD CONSTRAINT gift_partner_offers_terms_accepted_for_non_draft
  CHECK (status = 'draft' OR terms_accepted = TRUE) NOT VALID;

-- gifts: value_piasters must be positive for partner_gift type
ALTER TABLE public.gifts
  ADD CONSTRAINT gifts_value_piasters_positive
  CHECK (value_piasters > 0) NOT VALID;

ALTER TABLE public.gifts
  ADD CONSTRAINT gifts_min_order_piasters_nonneg
  CHECK (min_order_piasters IS NULL OR min_order_piasters >= 0) NOT VALID;

-- Validate against current rows. If anything fails, the migration aborts.
ALTER TABLE public.gift_partner_offers VALIDATE CONSTRAINT gift_partner_offers_max_orders_positive;
ALTER TABLE public.gift_partner_offers VALIDATE CONSTRAINT gift_partner_offers_max_discount_positive;
ALTER TABLE public.gift_partner_offers VALIDATE CONSTRAINT gift_partner_offers_used_nonneg;
ALTER TABLE public.gift_partner_offers VALIDATE CONSTRAINT gift_partner_offers_total_used_nonneg;
ALTER TABLE public.gift_partner_offers VALIDATE CONSTRAINT gift_partner_offers_dates_ordered;
ALTER TABLE public.gift_partner_offers VALIDATE CONSTRAINT gift_partner_offers_terms_accepted_for_non_draft;
ALTER TABLE public.gifts VALIDATE CONSTRAINT gifts_value_piasters_positive;
ALTER TABLE public.gifts VALIDATE CONSTRAINT gifts_min_order_piasters_nonneg;
