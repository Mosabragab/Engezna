'use client';

import { useEffect, useState } from 'react';

/**
 * useTierBenefits (v2.5.2)
 *
 * Fetches the authenticated user's tier benefits for a given checkout
 * subtotal. Re-fetches whenever the subtotal changes since "can use free
 * delivery" depends on the order value (Platinum needs >= 400 EGP).
 *
 * Returns null while loading or unauthenticated; the consumer should
 * render the checkout as if tier benefits aren't available in that case.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §5.1 (v2.5.2)
 */

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TierBenefits {
  tier: LoyaltyTier;
  badgeEmoji: string;
  deliveryDiscountPercent: number;
  canUseFreeDelivery: boolean;
  freeDeliveriesRemaining: number;
  prioritySupport: boolean;
}

interface UseTierBenefitsResult {
  benefits: TierBenefits | null;
  loading: boolean;
  error: string | null;
}

export function useTierBenefits(subtotalPiasters: number): UseTierBenefitsResult {
  const [benefits, setBenefits] = useState<TierBenefits | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(subtotalPiasters) || subtotalPiasters < 0) {
      setBenefits(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch('/api/checkout/tier-benefits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subtotalPiasters }),
        });

        if (cancelled) return;

        if (res.status === 401) {
          setBenefits(null);
          return;
        }

        if (!res.ok) {
          setError('failed_to_load');
          setBenefits(null);
          return;
        }

        const data = (await res.json()) as {
          tier: LoyaltyTier;
          badge_emoji?: string;
          badgeEmoji?: string;
          delivery_discount_percent?: number;
          deliveryDiscountPercent?: number;
          can_use_free_delivery?: boolean;
          canUseFreeDelivery?: boolean;
          free_deliveries_remaining?: number;
          freeDeliveriesRemaining?: number;
          priority_support?: boolean;
          prioritySupport?: boolean;
        };

        if (cancelled) return;

        // The API returns the camelCase shape from TierRewardsService, but
        // keep snake_case fallbacks so the hook is robust to either.
        setBenefits({
          tier: data.tier,
          badgeEmoji: data.badgeEmoji ?? data.badge_emoji ?? '',
          deliveryDiscountPercent: Number(
            data.deliveryDiscountPercent ?? data.delivery_discount_percent ?? 0
          ),
          canUseFreeDelivery: Boolean(data.canUseFreeDelivery ?? data.can_use_free_delivery),
          freeDeliveriesRemaining: Number(
            data.freeDeliveriesRemaining ?? data.free_deliveries_remaining ?? 0
          ),
          prioritySupport: Boolean(data.prioritySupport ?? data.priority_support),
        });
      } catch {
        if (!cancelled) {
          setError('network_error');
          setBenefits(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [subtotalPiasters]);

  return { benefits, loading, error };
}

/**
 * Pure helper — computes the final delivery fee after tier benefits.
 * Kept outside the hook so it can be unit-tested without React.
 *
 * Returns the discounted (or zero) delivery fee in piasters.
 */
export function applyTierDeliveryAdjustment(
  baseDeliveryFeePiasters: number,
  benefits: TierBenefits | null
): { feeAfterTier: number; freeDeliveryApplied: boolean; discountApplied: number } {
  if (!benefits) {
    return {
      feeAfterTier: baseDeliveryFeePiasters,
      freeDeliveryApplied: false,
      discountApplied: 0,
    };
  }

  if (benefits.canUseFreeDelivery) {
    return {
      feeAfterTier: 0,
      freeDeliveryApplied: true,
      discountApplied: baseDeliveryFeePiasters,
    };
  }

  if (benefits.deliveryDiscountPercent > 0) {
    const discount = Math.round((baseDeliveryFeePiasters * benefits.deliveryDiscountPercent) / 100);
    return {
      feeAfterTier: Math.max(0, baseDeliveryFeePiasters - discount),
      freeDeliveryApplied: false,
      discountApplied: discount,
    };
  }

  return {
    feeAfterTier: baseDeliveryFeePiasters,
    freeDeliveryApplied: false,
    discountApplied: 0,
  };
}
