'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Users } from 'lucide-react';

/**
 * Rewards Hub — Mega Referrer Badge (v2.5.2)
 *
 * Two states:
 *   1. User IS a Mega Referrer  → permanent "Founder #N" badge + multiplier
 *   2. User is progressing      → "X / 10 successful referrals" progress bar
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §4.2 (v2.5.2)
 */

interface MegaReferrerBadgeProps {
  isMegaReferrer: boolean;
  rank: number | null;
  loyaltyMultiplier: number;
  successfulReferralsCount: number;
}

const THRESHOLD = 10;

export function MegaReferrerBadge({
  isMegaReferrer,
  rank,
  loyaltyMultiplier,
  successfulReferralsCount,
}: MegaReferrerBadgeProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const reduceMotion = useReducedMotion();

  if (isMegaReferrer && rank !== null) {
    return (
      <section aria-labelledby="mega-referrer-heading" className="space-y-3">
        <h2 id="mega-referrer-heading" className="text-lg font-bold text-slate-900">
          {isRTL ? '🌟 Mega Referrer' : '🌟 Mega Referrer'}
        </h2>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-purple-300 bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50 p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-purple-600">
                {isRTL ? 'Founder' : 'Founder'} #{rank}
              </p>
              <p className="mt-1 text-base font-extrabold text-slate-900">
                {isRTL
                  ? `أنت من أول ${THRESHOLD} محيلين 🎉`
                  : `Among the first ${THRESHOLD} referrers 🎉`}
              </p>
              <p className="mt-2 text-sm font-bold text-purple-700">
                ×{loyaltyMultiplier.toFixed(2)}{' '}
                {isRTL ? 'نقاط ولاء (دائم)' : 'loyalty points (permanent)'}
              </p>
            </div>
            <motion.div
              animate={reduceMotion ? {} : { rotate: [0, 8, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            >
              <Star size={48} className="text-amber-500" fill="currentColor" />
            </motion.div>
          </div>
        </motion.div>
      </section>
    );
  }

  // Progress state — don't show if user hasn't referred anyone yet
  // (avoid cluttering UX with a zero-progress bar).
  if (successfulReferralsCount === 0) return null;

  const percent = Math.min(100, Math.round((successfulReferralsCount / THRESHOLD) * 100));
  const remaining = Math.max(0, THRESHOLD - successfulReferralsCount);

  return (
    <section aria-labelledby="mega-referrer-heading" className="space-y-3">
      <h2 id="mega-referrer-heading" className="text-lg font-bold text-slate-900">
        {isRTL ? '🌟 طريقك لـ Mega Referrer' : '🌟 Mega Referrer track'}
      </h2>
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users size={20} className="text-purple-500" />
          <span className="text-sm font-bold text-slate-800">
            {successfulReferralsCount} / {THRESHOLD}{' '}
            {isRTL ? 'إحالة ناجحة' : 'successful referrals'}
          </span>
        </div>

        <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/60">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-purple-400 to-pink-500"
          />
        </div>

        <p className="mb-3 text-xs leading-relaxed text-slate-600">
          {isRTL
            ? `${remaining} إحالة ناجحة بعد — لو من أول 10، تكسب مضاعف ×1.25 على كل نقاطك للأبد!`
            : `${remaining} more — if you're in the first 10, earn a permanent ×1.25 points multiplier!`}
        </p>

        <Link
          href={`/${locale}/referral`}
          className="inline-block rounded-full bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-600 active:scale-95"
        >
          {isRTL ? 'ادعُ صديقًا' : 'Invite a friend'}
        </Link>
      </div>
    </section>
  );
}
