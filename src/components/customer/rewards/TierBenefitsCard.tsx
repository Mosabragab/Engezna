'use client';

import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Headphones, User } from 'lucide-react';

/**
 * Rewards Hub — Tier Benefits Card (v2.5.2)
 *
 * Shows the user's current tier with CONCRETE benefits (not probabilities).
 * Replaces the old "احتمال صندوق نادر +10%" pattern that users couldn't see.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.5.2 (v2.5.2)
 */

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface TierBenefitsCardProps {
  tier: LoyaltyTier;
  deliveryDiscountPercent: number;
  freeDeliveriesPerMonth: number;
  freeDeliveryUnlimited: boolean;
  freeDeliveryMinOrderPiasters: number | null;
  monthlyBoxValuePiasters: number;
  prioritySupport: boolean;
  accountManager: boolean;
  pointsToNextTier?: number | null;
  nextTierName?: string | null;
}

const TIER_LABEL: Record<LoyaltyTier, { ar: string; en: string; emoji: string }> = {
  bronze: { ar: 'برونزي', en: 'Bronze', emoji: '🥉' },
  silver: { ar: 'فضي', en: 'Silver', emoji: '🥈' },
  gold: { ar: 'ذهبي', en: 'Gold', emoji: '🥇' },
  platinum: { ar: 'بلاتيني', en: 'Platinum', emoji: '💎' },
};

const TIER_GRADIENT: Record<LoyaltyTier, string> = {
  bronze: 'from-orange-50 to-amber-50 border-orange-200',
  silver: 'from-slate-50 to-zinc-100 border-slate-300',
  gold: 'from-yellow-50 to-amber-100 border-yellow-300',
  platinum: 'from-purple-50 via-fuchsia-50 to-pink-50 border-purple-300',
};

export function TierBenefitsCard(props: TierBenefitsCardProps) {
  const {
    tier,
    deliveryDiscountPercent,
    freeDeliveriesPerMonth,
    freeDeliveryUnlimited,
    freeDeliveryMinOrderPiasters,
    monthlyBoxValuePiasters,
    prioritySupport,
    accountManager,
    pointsToNextTier,
    nextTierName,
  } = props;

  const locale = useLocale();
  const isRTL = locale === 'ar';
  const label = TIER_LABEL[tier];
  const gradient = TIER_GRADIENT[tier];

  // Compose human-readable benefit lines. Hide rows that are 0/false.
  const benefits: Array<{ icon: 'check' | 'support' | 'am'; text: string }> = [];

  if (deliveryDiscountPercent > 0) {
    benefits.push({
      icon: 'check',
      text: isRTL
        ? `خصم ${deliveryDiscountPercent}% على رسوم التوصيل دائمًا`
        : `${deliveryDiscountPercent}% off delivery, always`,
    });
  }

  if (freeDeliveryUnlimited) {
    const minEgp = freeDeliveryMinOrderPiasters ? freeDeliveryMinOrderPiasters / 100 : 0;
    benefits.push({
      icon: 'check',
      text: minEgp
        ? isRTL
          ? `توصيل مجاني على كل طلب ≥ ${minEgp} ج.م`
          : `Free delivery on every order ≥ ${minEgp} EGP`
        : isRTL
          ? 'توصيل مجاني غير محدود'
          : 'Unlimited free delivery',
    });
  } else if (freeDeliveriesPerMonth > 0) {
    benefits.push({
      icon: 'check',
      text: isRTL
        ? `توصيل مجاني ${freeDeliveriesPerMonth}× شهريًا`
        : `${freeDeliveriesPerMonth}× free delivery / month`,
    });
  }

  if (monthlyBoxValuePiasters > 0) {
    benefits.push({
      icon: 'check',
      text: isRTL
        ? `صندوق شهري مضمون بقيمة ${monthlyBoxValuePiasters / 100} ج.م`
        : `Monthly box worth ${monthlyBoxValuePiasters / 100} EGP`,
    });
  }

  if (prioritySupport) {
    benefits.push({
      icon: 'support',
      text: isRTL ? 'أولوية في الدعم (WhatsApp مخصص)' : 'Priority support (dedicated WhatsApp)',
    });
  }

  if (accountManager) {
    benefits.push({
      icon: 'am',
      text: isRTL ? 'مدير حساب مخصص لك' : 'Personal account manager',
    });
  }

  return (
    <section aria-labelledby="tier-benefits-heading" className="space-y-3">
      <h2 id="tier-benefits-heading" className="text-lg font-bold text-slate-900">
        {isRTL ? '🏅 مزاياك الحالية' : '🏅 Your benefits'}
      </h2>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`rounded-2xl border bg-gradient-to-br p-5 ${gradient}`}
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="text-3xl" aria-hidden>
            {label.emoji}
          </span>
          <div>
            <p className="text-base font-extrabold text-slate-900">{isRTL ? label.ar : label.en}</p>
            {pointsToNextTier !== null && pointsToNextTier !== undefined && nextTierName && (
              <p className="text-xs text-slate-600">
                {isRTL
                  ? `${pointsToNextTier} نقطة لـ ${nextTierName}`
                  : `${pointsToNextTier} points to ${nextTierName}`}
              </p>
            )}
          </div>
        </div>

        {benefits.length === 0 ? (
          <p className="text-sm text-slate-600">
            {isRTL ? 'استمر في الطلب لفتح مزايا أعلى!' : 'Keep ordering to unlock higher benefits!'}
          </p>
        ) : (
          <ul className="space-y-2">
            {benefits.map((b, i) => {
              const Icon = b.icon === 'support' ? Headphones : b.icon === 'am' ? User : Check;
              return (
                <li key={i} className="flex items-start gap-2 text-sm font-medium text-slate-800">
                  <Icon size={16} className="mt-0.5 flex-shrink-0 text-green-600" />
                  <span>{b.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </section>
  );
}
