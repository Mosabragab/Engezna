import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TierConfig {
  tier: LoyaltyTier;
  deliveryDiscountPercent: number;
  freeDeliveriesPerMonth: number;
  freeDeliveryMinOrderPiasters: number | null;
  freeDeliveryUnlimited: boolean;
  monthlyBoxValuePiasters: number;
  prioritySupport: boolean;
  accountManager: boolean;
  badgeEmoji: string | null;
  labelAr: string | null;
  labelEn: string | null;
}

export interface TierBenefitsForCheckout {
  tier: LoyaltyTier;
  badgeEmoji: string;
  deliveryDiscountPercent: number;
  canUseFreeDelivery: boolean;
  freeDeliveriesRemaining: number; // -1 means unlimited
  prioritySupport: boolean;
}

export interface TierBenefitsUsage {
  userId: string;
  monthYear: string;
  freeDeliveriesUsed: number;
  monthlyBoxGrantedAt: string | null;
  monthlyBoxEntryId: string | null;
}
