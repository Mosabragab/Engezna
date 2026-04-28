import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySupabaseClient = SupabaseClient<any, any, any>;

export type GiftType =
  | 'discount_code'
  | 'discount_percent'
  | 'free_delivery'
  | 'partner_gift'
  | 'loyalty_boost'
  | 'mystery'
  | 'golden_box';

export type GiftSource =
  | 'welcome'
  | 'win_back'
  | 'referral'
  | 'stamp_card'
  | 'mystery_box'
  | 'partner'
  | 'manual_campaign'
  | 'gift_forward'
  | 'birthday';

export type GiftEntryStatus = 'granted' | 'opened' | 'used' | 'expired' | 'revoked' | 'forwarded';

export type CustomerSegment =
  | 'new_user'
  | 'champion'
  | 'regular'
  | 'at_risk'
  | 'churned'
  | 'bargain_hunter'
  | 'high_value'
  | 'remote_area'
  | 'undefined';

export type FinancialLogType =
  | 'grant'
  | 'use'
  | 'expire'
  | 'revoke'
  | 'clawback'
  | 'partner_settlement_deduction';

export type FunderType = 'engezna' | 'partner';

export type FaultSource = 'customer' | 'provider' | 'delivery' | 'system' | 'fraud';

export interface Gift {
  id: string;
  type: GiftType;
  value_piasters: number;
  max_discount_piasters: number | null;
  min_order_piasters: number;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon_url: string | null;
  applicable_provider_ids: string[] | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface GiftBoxEntry {
  id: string;
  user_id: string;
  gift_id: string | null;
  source: GiftSource;
  rule_id: string | null;
  status: GiftEntryStatus;
  expires_at: string;
  opened_at: string | null;
  used_at: string | null;
  used_order_id: string | null;
  forward_id: string | null;
  bucket_name: string;
  cost_piasters: number;
  funder_type: FunderType;
  funder_provider_id: string | null;
  created_at: string;
  gift?: Gift;
}

export interface GiftStamp {
  id: string;
  user_id: string;
  card_started_at: string;
  card_expires_at: string;
  stamp_count: number;
  is_completed: boolean;
  golden_box_id: string | null;
  order_ids: string[];
  created_at: string;
}

export interface RetentionSettings {
  id: number;
  monthly_total_budget_piasters: number;
  bucket_mystery_percent: number;
  bucket_stamp_percent: number;
  bucket_referral_percent: number;
  bucket_winback_percent: number;
  bucket_welcome_percent: number;
  overflow_tolerance_percent: number;
  referral_reward_piasters: number;
  referral_min_first_order_piasters: number;
  referral_monthly_limit_per_user: number;
  stamp_card_size: number;
  stamp_card_validity_days: number;
  stamp_min_order_piasters: number;
  golden_box_default_piasters: number;
  golden_box_max_piasters: number;
  gift_default_expiry_days: number;
  gift_max_queue_size: number;
  one_discount_per_order: boolean;
  max_discount_percent_per_order: number;
  tier_300_499_max_piasters: number;
  tier_500_799_max_piasters: number;
  tier_800_plus_max_piasters: number;
  processing_fee_enabled: boolean;
  processing_fee_percent: number;
  updated_by: string | null;
  updated_at: string;
}

export interface GrantGiftParams {
  userId: string;
  giftId: string | null;
  source: GiftSource;
  ruleId?: string;
  bucketName: string;
  costPiasters: number;
  funderType?: FunderType;
  funderProviderId?: string;
  expiryDays?: number;
}

export interface UseGiftParams {
  giftEntryId: string;
  orderId: string;
  userId: string;
}

export interface GiftFinancialLogEntry {
  transaction_type: FinancialLogType;
  amount_piasters: number;
  bucket: string | null;
  funder_type: FunderType;
  funder_provider_id?: string | null;
  user_id: string;
  gift_entry_id?: string | null;
  order_id?: string | null;
  notes?: string | null;
}

export type BucketName = 'mystery' | 'stamp' | 'referral' | 'win_back' | 'welcome';

export interface BudgetStatus {
  bucket: BucketName;
  limit_piasters: number;
  spent_piasters: number;
  remaining_piasters: number;
  is_exhausted: boolean;
  usage_percent: number;
}
