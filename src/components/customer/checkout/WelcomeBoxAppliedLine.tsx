'use client';

import { useLocale } from 'next-intl';
import { Gift } from 'lucide-react';

/**
 * Checkout — Welcome Box Applied Line (v2.5.2)
 *
 * Rendered in the order summary breakdown when a granted free_delivery
 * gift box entry is being auto-applied to this order. Mirrors the visual
 * grammar of TierDeliveryDiscountLine.tsx — emerald green, role=status.
 *
 * Hides itself when there is no gift to apply.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.1.5 (v2.5.2)
 */

interface WelcomeBoxAppliedLineProps {
  titleAr: string;
  titleEn: string;
  /** Amount waived in EGP (already converted from piasters by caller). */
  amountEgp: number;
}

export function WelcomeBoxAppliedLine({ titleAr, titleEn, amountEgp }: WelcomeBoxAppliedLineProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="flex items-center justify-between text-sm" role="status" aria-live="polite">
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
        <Gift size={14} />
        {isRTL ? `🎁 ${titleAr}` : `🎁 ${titleEn}`}
      </span>
      <span className="font-bold text-emerald-700">
        {isRTL ? `-${amountEgp.toFixed(2)} ج.م ✨` : `-${amountEgp.toFixed(2)} EGP ✨`}
      </span>
    </div>
  );
}
