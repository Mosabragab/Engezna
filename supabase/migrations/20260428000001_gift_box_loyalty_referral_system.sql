-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Gift Box + Loyalty + Referral System
-- نظام صندوق الهدايا + الولاء + الريفيرال
-- ═══════════════════════════════════════════════════════════════════════════════
-- Date: 2026-04-28
-- Version: 1.0
-- Reference: docs/GIFT_BOX_LOYALTY_REFERRAL_PLAN.md v2.2
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- CONTENTS:
-- 1. ENUMS (8 new types)
-- 2. TABLES (11 new tables)
-- 3. ALTER EXISTING TABLES (providers, profiles, orders, referrals, refunds)
-- 4. INDEXES
-- 5. RLS POLICIES
-- 6. TRIGGERS
-- 7. REALTIME PUBLICATION
-- 8. SEED DATA (retention_settings)
--
-- GOLDEN RULE: Settlement engine is NOT touched.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 1: ENUMS                                                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

DO $$ BEGIN
  CREATE TYPE gift_type AS ENUM (
    'discount_code', 'discount_percent', 'free_delivery',
    'partner_gift', 'loyalty_boost', 'mystery', 'golden_box'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gift_source AS ENUM (
    'welcome', 'win_back', 'referral', 'stamp_card',
    'mystery_box', 'partner', 'manual_campaign', 'gift_forward', 'birthday'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gift_entry_status AS ENUM (
    'granted', 'opened', 'used', 'expired', 'revoked', 'forwarded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE customer_segment AS ENUM (
    'new_user', 'champion', 'regular', 'at_risk',
    'churned', 'bargain_hunter', 'high_value', 'remote_area', 'undefined'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE partner_offer_status AS ENUM (
    'draft', 'pending_approval', 'approved', 'active', 'paused', 'ended', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE financial_log_type AS ENUM (
    'grant', 'use', 'expire', 'revoke', 'clawback', 'partner_settlement_deduction'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_category AS ENUM (
    'saas', 'salary', 'office', 'legal', 'marketing_external', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('basic', 'pro', 'elite');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new values to existing notification_type enum
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'gift_box';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'loyalty';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'referral_reward';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'stamp_complete';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'gift_expiry';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 2: TABLES (in dependency order)                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.1 gifts — Gift definitions (templates)
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type gift_type NOT NULL,
  value_piasters BIGINT NOT NULL,
  max_discount_piasters BIGINT,
  min_order_piasters BIGINT DEFAULT 30000, -- 300 EGP minimum
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon_url TEXT,
  applicable_provider_ids UUID[], -- NULL = all providers
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.2 gift_rules — Rule Engine conditions and actions
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  trigger TEXT NOT NULL, -- 'order_completed', 'user_registered', etc.
  conditions JSONB NOT NULL,
  action JSONB NOT NULL,
  priority INT DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  budget_bucket TEXT NOT NULL,
  budget_cap_per_day BIGINT,
  budget_cap_per_month BIGINT,
  applied_count INT DEFAULT 0,
  total_cost_piasters BIGINT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.3 gift_box_entries — Each customer's gift box
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_box_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  gift_id UUID REFERENCES public.gifts(id),
  source gift_source NOT NULL,
  rule_id UUID REFERENCES public.gift_rules(id),
  status gift_entry_status DEFAULT 'granted',
  expires_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_order_id UUID, -- FK added after orders ALTER
  forward_id UUID, -- FK added after gift_forwards creation
  bucket_name TEXT NOT NULL,
  cost_piasters BIGINT NOT NULL,
  funder_type TEXT DEFAULT 'engezna' CHECK (funder_type IN ('engezna', 'partner')),
  funder_provider_id UUID REFERENCES public.providers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.4 gift_stamps — Stamp card progress
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  card_started_at TIMESTAMPTZ DEFAULT NOW(),
  card_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '60 days'),
  stamp_count INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  golden_box_id UUID REFERENCES public.gift_box_entries(id),
  order_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active (incomplete) card per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_card_per_user
  ON public.gift_stamps(user_id) WHERE is_completed = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.5 gift_forwards — Gift-it Forward
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_forwards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id),
  gift_entry_id UUID REFERENCES public.gift_box_entries(id) NOT NULL,
  forward_token TEXT UNIQUE NOT NULL,
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  recipient_device_id TEXT,
  recipient_ip INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Now add forward_id FK on gift_box_entries
DO $$ BEGIN
  ALTER TABLE public.gift_box_entries
    ADD CONSTRAINT gift_box_entries_forward_id_fkey
    FOREIGN KEY (forward_id) REFERENCES public.gift_forwards(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.6 gift_partner_offers — Partner gift campaigns (NO deposit)
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_partner_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
  gift_id UUID REFERENCES public.gifts(id) NOT NULL,
  status partner_offer_status DEFAULT 'draft',
  max_orders INT NOT NULL,
  used_orders INT DEFAULT 0,
  max_discount_total_piasters BIGINT,
  total_discount_used_piasters BIGINT DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  terms_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.7 gift_financial_log — Every EGP tracked
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gift_financial_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type financial_log_type NOT NULL,
  amount_piasters BIGINT NOT NULL,
  bucket TEXT,
  funder_type TEXT NOT NULL CHECK (funder_type IN ('engezna', 'partner')),
  funder_provider_id UUID REFERENCES public.providers(id),
  user_id UUID REFERENCES public.profiles(id),
  gift_entry_id UUID REFERENCES public.gift_box_entries(id),
  order_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.8 customer_segments_daily — Daily customer segmentation snapshots
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_segments_daily (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  segment customer_segment NOT NULL,
  facts JSONB NOT NULL,
  PRIMARY KEY (user_id, snapshot_date)
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.9 retention_settings — Single-row system configuration
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.retention_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  monthly_total_budget_piasters BIGINT DEFAULT 2000000, -- 20,000 EGP
  bucket_mystery_percent NUMERIC(5,2) DEFAULT 30.00,
  bucket_stamp_percent NUMERIC(5,2) DEFAULT 25.00,
  bucket_referral_percent NUMERIC(5,2) DEFAULT 20.00,
  bucket_winback_percent NUMERIC(5,2) DEFAULT 15.00,
  bucket_welcome_percent NUMERIC(5,2) DEFAULT 10.00,
  overflow_tolerance_percent NUMERIC(5,2) DEFAULT 5.00,
  referral_reward_piasters BIGINT DEFAULT 2000, -- 20 EGP
  referral_min_first_order_piasters BIGINT DEFAULT 30000, -- 300 EGP
  referral_monthly_limit_per_user INT DEFAULT 10,
  stamp_card_size INT DEFAULT 4,
  stamp_card_validity_days INT DEFAULT 60,
  stamp_min_order_piasters BIGINT DEFAULT 30000, -- 300 EGP (subtotal before discount)
  golden_box_default_piasters BIGINT DEFAULT 5000, -- 50 EGP
  golden_box_max_piasters BIGINT DEFAULT 10000, -- 100 EGP hard cap
  gift_default_expiry_days INT DEFAULT 7,
  gift_max_queue_size INT DEFAULT 4,
  one_discount_per_order BOOLEAN DEFAULT TRUE,
  max_discount_percent_per_order NUMERIC(5,2) DEFAULT 20.00,
  -- Tiered gift caps
  tier_300_499_max_piasters BIGINT DEFAULT 1000, -- 10 EGP
  tier_500_799_max_piasters BIGINT DEFAULT 1500, -- 15 EGP
  tier_800_plus_max_piasters BIGINT DEFAULT 2000, -- 20 EGP
  -- Processing fee
  processing_fee_enabled BOOLEAN DEFAULT FALSE,
  processing_fee_percent NUMERIC(5,2) DEFAULT 3.00,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.10 provider_subscriptions — Analytics tier subscriptions
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.provider_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE NOT NULL,
  tier subscription_tier DEFAULT 'basic',
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT TRUE,
  price_piasters BIGINT NOT NULL DEFAULT 0,
  granted_free BOOLEAN DEFAULT FALSE,
  granted_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2.11 operational_expenses — ERP manual expense tracking
-- ─────────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operational_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL,
  amount_piasters BIGINT NOT NULL,
  description TEXT NOT NULL,
  incurred_date DATE NOT NULL,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 3: ALTER EXISTING TABLES                                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- providers: add grace_period_days
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 30;

-- profiles: add loyalty and segmentation fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS loyalty_points_cache INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS birthdate DATE,
  ADD COLUMN IF NOT EXISTS last_segment customer_segment;

-- orders: add gift tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS gift_entry_id UUID REFERENCES public.gift_box_entries(id),
  ADD COLUMN IF NOT EXISTS processing_fee_piasters BIGINT DEFAULT 0;

-- referrals: update default credits from 30 to 20 EGP
ALTER TABLE public.referrals
  ALTER COLUMN referrer_credit SET DEFAULT 20.00;
ALTER TABLE public.referrals
  ALTER COLUMN referee_credit SET DEFAULT 20.00;

-- refunds: add fault source for clawback logic
ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS fault_source TEXT DEFAULT 'customer'
  CHECK (fault_source IN ('customer', 'provider', 'delivery', 'system', 'fraud'));


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 4: INDEXES                                                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- gift_box_entries
CREATE INDEX IF NOT EXISTS idx_gift_box_entries_user_status
  ON public.gift_box_entries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_box_entries_expires
  ON public.gift_box_entries(expires_at) WHERE status IN ('granted', 'opened');
CREATE INDEX IF NOT EXISTS idx_gift_box_entries_user_active
  ON public.gift_box_entries(user_id, created_at DESC) WHERE status IN ('granted', 'opened');

-- gift_rules
CREATE INDEX IF NOT EXISTS idx_gift_rules_trigger
  ON public.gift_rules(trigger) WHERE is_active = TRUE;

-- gift_financial_log
CREATE INDEX IF NOT EXISTS idx_fin_log_bucket_month
  ON public.gift_financial_log(bucket, created_at);
CREATE INDEX IF NOT EXISTS idx_fin_log_provider
  ON public.gift_financial_log(funder_provider_id) WHERE funder_provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fin_log_user
  ON public.gift_financial_log(user_id);

-- customer_segments_daily
CREATE INDEX IF NOT EXISTS idx_segments_date_segment
  ON public.customer_segments_daily(snapshot_date, segment);

-- gift_stamps
CREATE INDEX IF NOT EXISTS idx_gift_stamps_user
  ON public.gift_stamps(user_id);

-- gift_forwards
CREATE INDEX IF NOT EXISTS idx_gift_forwards_token
  ON public.gift_forwards(forward_token);
CREATE INDEX IF NOT EXISTS idx_gift_forwards_sender
  ON public.gift_forwards(sender_id);

-- gift_partner_offers
CREATE INDEX IF NOT EXISTS idx_partner_offers_provider
  ON public.gift_partner_offers(provider_id);
CREATE INDEX IF NOT EXISTS idx_partner_offers_status
  ON public.gift_partner_offers(status) WHERE status IN ('active', 'approved');

-- orders.gift_entry_id
CREATE INDEX IF NOT EXISTS idx_orders_gift_entry
  ON public.orders(gift_entry_id) WHERE gift_entry_id IS NOT NULL;

-- provider_subscriptions
CREATE INDEX IF NOT EXISTS idx_provider_subs_provider
  ON public.provider_subscriptions(provider_id);

-- operational_expenses
CREATE INDEX IF NOT EXISTS idx_operational_expenses_date
  ON public.operational_expenses(incurred_date);


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 5: RLS POLICIES                                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Enable RLS on all new tables
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_box_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_forwards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_financial_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_expenses ENABLE ROW LEVEL SECURITY;

-- ── gifts: public read, admin write ──
DO $$ BEGIN
  CREATE POLICY "Anyone can view active gifts"
    ON public.gifts FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage gifts"
    ON public.gifts FOR ALL USING (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── gift_box_entries: user sees own, system writes ──
DO $$ BEGIN
  CREATE POLICY "Users can view own gift box"
    ON public.gift_box_entries FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own gifts (open)"
    ON public.gift_box_entries FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service can insert gift entries"
    ON public.gift_box_entries FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage gift entries"
    ON public.gift_box_entries FOR ALL USING (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── gift_rules: admin only ──
DO $$ BEGIN
  CREATE POLICY "Admins can manage gift rules"
    ON public.gift_rules FOR ALL USING (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── gift_stamps: user sees own ──
DO $$ BEGIN
  CREATE POLICY "Users can view own stamps"
    ON public.gift_stamps FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service can manage stamps"
    ON public.gift_stamps FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── gift_forwards: sender and recipient can see ──
DO $$ BEGIN
  CREATE POLICY "Users can view own forwards"
    ON public.gift_forwards FOR SELECT
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service can manage forwards"
    ON public.gift_forwards FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── gift_partner_offers: provider sees own, admin sees all ──
DO $$ BEGIN
  CREATE POLICY "Providers can view own offers"
    ON public.gift_partner_offers FOR SELECT
    USING (provider_id IN (
      SELECT id FROM public.providers WHERE owner_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Providers can create offers"
    ON public.gift_partner_offers FOR INSERT WITH CHECK (
      provider_id IN (
        SELECT id FROM public.providers WHERE owner_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage partner offers"
    ON public.gift_partner_offers FOR ALL USING (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── gift_financial_log: admin (finance+) only ──
DO $$ BEGIN
  CREATE POLICY "Admins can view financial log"
    ON public.gift_financial_log FOR SELECT USING (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service can insert financial log"
    ON public.gift_financial_log FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── customer_segments_daily: user sees own, system writes ──
DO $$ BEGIN
  CREATE POLICY "Users can view own segment"
    ON public.customer_segments_daily FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all segments"
    ON public.customer_segments_daily FOR SELECT USING (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service can manage segments"
    ON public.customer_segments_daily FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── retention_settings: any admin reads, super_admin writes ──
DO $$ BEGIN
  CREATE POLICY "Admins can view retention settings"
    ON public.retention_settings FOR SELECT USING (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Super admins can update retention settings"
    ON public.retention_settings FOR UPDATE USING (is_super_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── provider_subscriptions: provider sees own, admin manages ──
DO $$ BEGIN
  CREATE POLICY "Providers can view own subscription"
    ON public.provider_subscriptions FOR SELECT
    USING (provider_id IN (
      SELECT id FROM public.providers WHERE owner_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage subscriptions"
    ON public.provider_subscriptions FOR ALL USING (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── operational_expenses: finance role only ──
DO $$ BEGIN
  CREATE POLICY "Finance admins can manage expenses"
    ON public.operational_expenses FOR ALL USING (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 6: TRIGGERS                                                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- updated_at triggers for new tables
CREATE TRIGGER gift_rules_updated_at
  BEFORE UPDATE ON public.gift_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER retention_settings_updated_at
  BEFORE UPDATE ON public.retention_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 7: REALTIME PUBLICATION                                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_box_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_stamps;


-- ╔═══════════════════════════════════════════════════════════════════════════════╗
-- ║ PART 8: SEED DATA                                                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════════╝

-- Insert default retention settings (single row)
INSERT INTO public.retention_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration complete.
-- Next: Phase 1 — Gift Engine Core (src/lib/gifts/engine.ts)
-- ═══════════════════════════════════════════════════════════════════════════════
