import { describe, it, expect } from 'vitest';
import {
  applyTierDeliveryAdjustment,
  type TierBenefits,
} from '@/lib/tier-rewards/use-tier-benefits';

/**
 * v2.5.2 — Pure helper that computes the effective delivery fee after
 * applying a tier benefit. Has four branches:
 *
 *   1. benefits is null            → return base fee unchanged
 *   2. canUseFreeDelivery is true  → fee = 0
 *   3. deliveryDiscountPercent > 0 → fee = base × (1 − pct/100)
 *   4. neither → return base fee unchanged
 *
 * These tests exercise each branch + the rounding/floor edge cases.
 */

function makeBenefits(overrides: Partial<TierBenefits> = {}): TierBenefits {
  return {
    tier: 'bronze',
    badgeEmoji: '🥉',
    deliveryDiscountPercent: 0,
    canUseFreeDelivery: false,
    freeDeliveriesRemaining: 0,
    prioritySupport: false,
    ...overrides,
  };
}

describe('applyTierDeliveryAdjustment', () => {
  describe('branch 1: null benefits', () => {
    it('returns the base fee unchanged', () => {
      const result = applyTierDeliveryAdjustment(2250, null);
      expect(result).toEqual({
        feeAfterTier: 2250,
        freeDeliveryApplied: false,
        discountApplied: 0,
      });
    });

    it('handles zero base fee', () => {
      const result = applyTierDeliveryAdjustment(0, null);
      expect(result.feeAfterTier).toBe(0);
      expect(result.discountApplied).toBe(0);
    });
  });

  describe('branch 2: free delivery enabled', () => {
    it('zeroes the fee and reports the full base as discount', () => {
      const benefits = makeBenefits({ canUseFreeDelivery: true, tier: 'platinum' });
      const result = applyTierDeliveryAdjustment(2250, benefits);
      expect(result).toEqual({
        feeAfterTier: 0,
        freeDeliveryApplied: true,
        discountApplied: 2250,
      });
    });

    it('still zeroes when free delivery is set on a Gold user', () => {
      const benefits = makeBenefits({
        canUseFreeDelivery: true,
        tier: 'gold',
        deliveryDiscountPercent: 30, // ignored when canUseFreeDelivery=true
      });
      const result = applyTierDeliveryAdjustment(1000, benefits);
      expect(result.feeAfterTier).toBe(0);
      expect(result.freeDeliveryApplied).toBe(true);
    });
  });

  describe('branch 3: percentage discount', () => {
    it('applies Silver 20% off correctly', () => {
      const benefits = makeBenefits({ tier: 'silver', deliveryDiscountPercent: 20 });
      // 2250 × 0.20 = 450 → fee 2250 - 450 = 1800
      const result = applyTierDeliveryAdjustment(2250, benefits);
      expect(result).toEqual({
        feeAfterTier: 1800,
        freeDeliveryApplied: false,
        discountApplied: 450,
      });
    });

    it('applies Gold 30% off correctly', () => {
      const benefits = makeBenefits({ tier: 'gold', deliveryDiscountPercent: 30 });
      // 1000 × 0.30 = 300 → fee 700
      const result = applyTierDeliveryAdjustment(1000, benefits);
      expect(result.feeAfterTier).toBe(700);
      expect(result.discountApplied).toBe(300);
    });

    it('rounds the discount (not the fee) to avoid sub-piaster drift', () => {
      const benefits = makeBenefits({ deliveryDiscountPercent: 17 });
      // 1234 × 0.17 = 209.78 → round → 210 → fee 1024
      const result = applyTierDeliveryAdjustment(1234, benefits);
      expect(result.discountApplied).toBe(210);
      expect(result.feeAfterTier).toBe(1024);
    });

    it('clamps the fee to zero if discount equals/exceeds base', () => {
      // 100% discount via percent (theoretical) — fee must not go negative
      const benefits = makeBenefits({ deliveryDiscountPercent: 100 });
      const result = applyTierDeliveryAdjustment(500, benefits);
      expect(result.feeAfterTier).toBe(0);
      expect(result.discountApplied).toBe(500);
    });
  });

  describe('branch 4: no benefit applicable', () => {
    it('returns base fee unchanged for Bronze (no discount + no free)', () => {
      const benefits = makeBenefits({ tier: 'bronze' });
      const result = applyTierDeliveryAdjustment(2250, benefits);
      expect(result.feeAfterTier).toBe(2250);
      expect(result.discountApplied).toBe(0);
      expect(result.freeDeliveryApplied).toBe(false);
    });
  });
});
