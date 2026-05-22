'use client';

import { useLocale } from 'next-intl';
import type { TierBenefits } from '@/lib/tier-rewards';

/**
 * Checkout — Tier Delivery Discount Line (v2.5.2)
 *
 * Rendered inside the order summary breakdown, between "Delivery fee" and
 * "Total". Shows the applied tier benefit:
 *   - Free delivery (Platinum or Gold's monthly free shot)
 *   - X% discount (Silver/Gold percentage off)
 *
 * Renders nothing if no tier benefit applies.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §5.2 (v2.5.2)
 */

interface TierDeliveryDiscountLineProps {
  benefits: TierBenefits | null;
  freeDeliveryApplied: boolean;
  discountPiasters: number; // amount saved (positive integer in piasters)
}

export function TierDeliveryDiscountLine({
  benefits,
  freeDeliveryApplied,
  discountPiasters,
}: TierDeliveryDiscountLineProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  if (!benefits) return null;
  if (!freeDeliveryApplied && discountPiasters <= 0) return null;

  const tierEmoji = benefits.badgeEmoji || '';
  const tierLabel = isRTL
    ? { bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني' }[benefits.tier]
    : benefits.tier.charAt(0).toUpperCase() + benefits.tier.slice(1);

  const label = freeDeliveryApplied
    ? isRTL
      ? `${tierEmoji} توصيل مجاني (${tierLabel})`
      : `${tierEmoji} Free delivery (${tierLabel})`
    : isRTL
      ? `${tierEmoji} خصم ${benefits.deliveryDiscountPercent}% توصيل (${tierLabel})`
      : `${tierEmoji} ${benefits.deliveryDiscountPercent}% off delivery (${tierLabel})`;

  const amountEgp = (discountPiasters / 100).toFixed(2);

  return (
    <div className="flex items-center justify-between text-sm" role="status" aria-live="polite">
      <span className="font-medium text-emerald-700">{label}</span>
      <span className="font-bold text-emerald-700">
        {isRTL ? `-${amountEgp} ج.م ✨` : `-${amountEgp} EGP ✨`}
      </span>
    </div>
  );
}
