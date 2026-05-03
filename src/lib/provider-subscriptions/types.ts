import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export type SubscriptionTier = 'basic' | 'pro' | 'elite';

export interface CurrentSubscription {
  tier: SubscriptionTier;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  granted_free: boolean;
  price_piasters: number;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  price_piasters: number;
  features: string[];
}

/** Single source of truth for tier definitions on the client side. */
export const TIER_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  basic: {
    tier: 'basic',
    price_piasters: 0,
    features: ['basic_reports'],
  },
  pro: {
    tier: 'pro',
    price_piasters: 29900,
    features: [
      'basic_reports',
      'cohort_analysis',
      'peak_hours',
      'top_products',
      'competitor_compare',
    ],
  },
  elite: {
    tier: 'elite',
    price_piasters: 59900,
    features: [
      'basic_reports',
      'cohort_analysis',
      'peak_hours',
      'top_products',
      'competitor_compare',
      'demographics',
      'ai_forecasts',
      'priority_support',
    ],
  },
};

export interface SetSubscriptionInput {
  tier: SubscriptionTier;
  granted_free?: boolean;
  ends_at?: string | null;
}
