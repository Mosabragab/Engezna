import { Money } from '@/lib/finance/money';
import type { RetentionSettings, BucketName, BudgetStatus, FaultSource } from './types';

const DEFAULT_SETTINGS: RetentionSettings = {
  id: 1,
  monthly_total_budget_piasters: 2000000,
  bucket_mystery_percent: 30,
  bucket_stamp_percent: 25,
  bucket_referral_percent: 20,
  bucket_winback_percent: 15,
  bucket_welcome_percent: 10,
  overflow_tolerance_percent: 5,
  referral_reward_piasters: 2000,
  referral_min_first_order_piasters: 30000,
  referral_monthly_limit_per_user: 10,
  stamp_card_size: 4,
  stamp_card_validity_days: 60,
  stamp_min_order_piasters: 30000,
  golden_box_default_piasters: 5000,
  golden_box_max_piasters: 10000,
  gift_default_expiry_days: 7,
  gift_max_queue_size: 4,
  one_discount_per_order: true,
  max_discount_percent_per_order: 20,
  tier_300_499_max_piasters: 1000,
  tier_500_799_max_piasters: 1500,
  tier_800_plus_max_piasters: 2000,
  processing_fee_enabled: false,
  processing_fee_percent: 3,
  updated_by: null,
  updated_at: new Date().toISOString(),
};

export function getDefaultSettings(): RetentionSettings {
  return { ...DEFAULT_SETTINGS };
}

export function getTieredGiftCap(subtotalPiasters: number, settings: RetentionSettings): Money {
  if (subtotalPiasters >= 80000) {
    return Money.fromPiasters(settings.tier_800_plus_max_piasters);
  }
  if (subtotalPiasters >= 50000) {
    return Money.fromPiasters(settings.tier_500_799_max_piasters);
  }
  if (subtotalPiasters >= 30000) {
    return Money.fromPiasters(settings.tier_300_499_max_piasters);
  }
  return Money.zero();
}

export function calculateMaxDiscount(subtotalPiasters: number, settings: RetentionSettings): Money {
  const tieredCap = getTieredGiftCap(subtotalPiasters, settings);
  const percentCap = Money.fromPiasters(subtotalPiasters).percent(
    settings.max_discount_percent_per_order
  );
  return tieredCap.min(percentCap);
}

export function clampGiftValue(
  giftValuePiasters: number,
  subtotalPiasters: number,
  settings: RetentionSettings
): Money {
  const giftValue = Money.fromPiasters(giftValuePiasters);
  const maxAllowed = calculateMaxDiscount(subtotalPiasters, settings);
  return giftValue.min(maxAllowed);
}

export function getBucketLimit(bucket: BucketName, settings: RetentionSettings): number {
  const total = settings.monthly_total_budget_piasters;
  const percentMap: Record<BucketName, number> = {
    mystery: settings.bucket_mystery_percent,
    stamp: settings.bucket_stamp_percent,
    referral: settings.bucket_referral_percent,
    win_back: settings.bucket_winback_percent,
    welcome: settings.bucket_welcome_percent,
  };
  return Math.round((total * percentMap[bucket]) / 100);
}

export function getBucketLimitWithTolerance(
  bucket: BucketName,
  settings: RetentionSettings
): number {
  const base = getBucketLimit(bucket, settings);
  const tolerance = settings.overflow_tolerance_percent / 100;
  return Math.round(base * (1 + tolerance));
}

export function checkBudgetAvailable(
  bucket: BucketName,
  spentPiasters: number,
  costPiasters: number,
  settings: RetentionSettings
): BudgetStatus {
  const limit = getBucketLimitWithTolerance(bucket, settings);
  const remaining = Math.max(0, limit - spentPiasters);
  const isExhausted = spentPiasters + costPiasters > limit;
  const usagePercent = limit > 0 ? Math.round((spentPiasters / limit) * 100) : 100;

  return {
    bucket,
    limit_piasters: limit,
    spent_piasters: spentPiasters,
    remaining_piasters: remaining,
    is_exhausted: isExhausted,
    usage_percent: usagePercent,
  };
}

export function isOrderEligibleForStamp(
  subtotalPiasters: number,
  settings: RetentionSettings
): boolean {
  return subtotalPiasters >= settings.stamp_min_order_piasters;
}

export function isOrderEligibleForGift(
  subtotalPiasters: number,
  settings: RetentionSettings
): boolean {
  return subtotalPiasters >= settings.stamp_min_order_piasters;
}

export function isReferralEligible(
  firstOrderSubtotalPiasters: number,
  settings: RetentionSettings
): boolean {
  return firstOrderSubtotalPiasters >= settings.referral_min_first_order_piasters;
}

export function calculateClawbackPoints(
  originalPoints: number,
  refundAmountPiasters: number,
  orderTotalPiasters: number
): number {
  if (orderTotalPiasters <= 0) return 0;
  const ratio = refundAmountPiasters / orderTotalPiasters;
  return Math.round(originalPoints * ratio);
}

export function shouldClawback(faultSource: FaultSource): boolean {
  return faultSource === 'customer' || faultSource === 'fraud';
}

export function calculateGiftExpiry(
  existingActiveCount: number,
  latestExpiryDate: Date | null,
  expiryDays: number,
  maxQueueSize: number
): { canGrant: boolean; expiresAt: Date | null } {
  if (existingActiveCount >= maxQueueSize) {
    return { canGrant: false, expiresAt: null };
  }

  const now = new Date();
  let expiresAt: Date;

  if (latestExpiryDate && latestExpiryDate > now) {
    expiresAt = new Date(latestExpiryDate);
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
  } else {
    expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
  }

  return { canGrant: true, expiresAt };
}

export function calculateLoyaltyPoints(subtotalPiasters: number, multiplier: number = 1): number {
  const pounds = subtotalPiasters / 100;
  return Math.floor((pounds / 10) * multiplier);
}

export function pointsToDiscount(points: number): Money {
  const discountPer100Points = 500;
  const redeemable = Math.floor(points / 100) * 100;
  const discountPiasters = (redeemable / 100) * discountPer100Points;
  return Money.fromPiasters(discountPiasters);
}
