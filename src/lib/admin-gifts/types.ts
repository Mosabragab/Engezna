import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export interface GiftsOverviewKpis {
  // Active state
  activeGifts: number; // status in (granted, opened)
  giftsGrantedToday: number;
  giftsUsedToday: number;
  giftsExpiredToday: number;

  // Spend
  totalSpendThisMonthPiasters: number;
  monthlyBudgetPiasters: number;
  spendByBucket: Array<{ bucket: string; piasters: number }>;

  // Pipeline
  pendingPartnerOffers: number;
  activeRules: number;
  activeCampaigns: number;

  // Conversion (last 30 days)
  grantedLast30: number;
  usedLast30: number;
  conversionRate: number; // 0-1
}

export interface DailyGrantsPoint {
  date: string; // YYYY-MM-DD
  granted: number;
  used: number;
}

export interface BucketDistribution {
  bucket: string;
  count: number;
  piasters: number;
}

export interface SegmentDistribution {
  segment: string;
  count: number;
}

export interface GiftRuleRow {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  is_active: boolean;
  budget_bucket: string;
  budget_cap_per_day: number | null;
  budget_cap_per_month: number | null;
  applied_count: number;
  total_cost_piasters: number;
  created_at: string;
  updated_at: string;
}

export interface RetentionSettingsRow {
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

export type RetentionSettingsPatch = Partial<
  Omit<RetentionSettingsRow, 'id' | 'updated_by' | 'updated_at'>
>;
