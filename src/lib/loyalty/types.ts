import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'expired' | 'bonus';

export interface LoyaltyBalance {
  user_id: string;
  points_balance: number;
  lifetime_points: number;
  tier: LoyaltyTier;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  order_id: string | null;
  points: number;
  transaction_type: LoyaltyTransactionType;
  description: string | null;
  balance_after: number;
  created_at: string;
}

export interface AwardPointsResult {
  success: boolean;
  pointsAwarded: number;
  newBalance: number;
  newTier: LoyaltyTier;
  tierChanged: boolean;
  previousTier: LoyaltyTier;
  /** v2.5.2: 'discount_applied' / 'already_awarded' / 'zero_subtotal' / undefined */
  skipReason?: string;
  /** v2.5.2: base points before multiplier (1 per 10 EGP) */
  basePoints?: number;
  /** v2.5.2: combined multiplier (loyalty × streak) */
  multiplier?: number;
}

export type RedeemPointsResult =
  | {
      success: true;
      giftEntryId: string;
      newBalance: number;
      discountPiasters: number;
    }
  | {
      success: false;
      reason: 'insufficient_points' | 'invalid_amount' | 'redemption_grant_failed' | 'system_error';
    };

export interface TierThresholds {
  bronze: { min: 0; max: 499 };
  silver: { min: 500; max: 1499 };
  gold: { min: 1500; max: 4999 };
  platinum: { min: 5000; max: number };
}

export const TIER_THRESHOLDS: Record<LoyaltyTier, { min: number; next: number | null }> = {
  bronze: { min: 0, next: 500 },
  silver: { min: 500, next: 1500 },
  gold: { min: 1500, next: 5000 },
  platinum: { min: 5000, next: null },
};

export const POINTS_PER_EGP = 0.1; // 1 point per 10 EGP
export const REDEMPTION_RATE_PIASTERS_PER_POINT = 5; // 100 points = 500 piasters = 5 EGP
export const REDEMPTION_UNIT = 100;
