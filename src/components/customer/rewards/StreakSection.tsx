'use client';

import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Flame, Trophy } from 'lucide-react';

/**
 * Rewards Hub — Streak Section (v2.5.2)
 *
 * Shows current weekly streak + progress to next milestone.
 * Milestones: 4 (+10 pts), 8 (Silver), 12 (Gold), 24 (Platinum 1.10× mult).
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §4.1 (v2.5.2)
 */

interface StreakSectionProps {
  currentStreakWeeks: number;
  longestStreakWeeks: number;
  streakTier: 'none' | 'silver' | 'gold' | 'platinum';
  pointsMultiplier: number;
}

const MILESTONES = [4, 8, 12, 24] as const;

const TIER_LABEL: Record<StreakSectionProps['streakTier'], { ar: string; en: string }> = {
  none: { ar: '', en: '' },
  silver: { ar: 'فضي 🥈', en: 'Silver 🥈' },
  gold: { ar: 'ذهبي 🥇', en: 'Gold 🥇' },
  platinum: { ar: 'بلاتيني 💎', en: 'Platinum 💎' },
};

function findNextMilestone(current: number): number | null {
  for (const m of MILESTONES) {
    if (current < m) return m;
  }
  return null;
}

export function StreakSection({
  currentStreakWeeks,
  longestStreakWeeks,
  streakTier,
  pointsMultiplier,
}: StreakSectionProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const nextMilestone = findNextMilestone(currentStreakWeeks);
  const weeksToNext = nextMilestone ? nextMilestone - currentStreakWeeks : 0;
  const progressPercent = nextMilestone
    ? Math.min(100, Math.round((currentStreakWeeks / nextMilestone) * 100))
    : 100;

  // New user: no streak yet — encouragement state.
  if (currentStreakWeeks === 0) {
    return (
      <section aria-labelledby="streak-heading" className="space-y-3">
        <h2 id="streak-heading" className="text-lg font-bold text-slate-900">
          {isRTL ? '🔥 سلسلتك الأسبوعية' : '🔥 Weekly streak'}
        </h2>
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50 p-5 text-center">
          <Flame size={32} className="mx-auto mb-2 text-amber-400" />
          <p className="text-sm font-medium text-slate-700">
            {isRTL
              ? 'ابدأ سلسلتك! طلب أسبوعي ≥ ٢٠٠ ج.م يبني streak قوية.'
              : 'Start your streak! One weekly order ≥ 200 EGP builds it up.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="streak-heading" className="space-y-3">
      <h2 id="streak-heading" className="text-lg font-bold text-slate-900">
        {isRTL ? '🔥 سلسلتك الأسبوعية' : '🔥 Weekly streak'}
      </h2>
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="flex items-center gap-2"
          >
            <Flame size={28} className="text-amber-500" fill="currentColor" />
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{currentStreakWeeks}</p>
              <p className="text-xs text-slate-600">
                {isRTL
                  ? `${currentStreakWeeks === 1 ? 'أسبوع متواصل' : 'أسابيع متواصلة'}`
                  : `week${currentStreakWeeks === 1 ? '' : 's'} in a row`}
              </p>
            </div>
          </motion.div>

          {streakTier !== 'none' && (
            <div className="flex flex-col items-end">
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-slate-800">
                {TIER_LABEL[streakTier][locale as 'ar' | 'en']}
              </span>
              {pointsMultiplier > 1.0 && (
                <span className="mt-1 text-[10px] font-bold text-purple-600">
                  ×{pointsMultiplier.toFixed(2)} {isRTL ? 'نقاط' : 'points'}
                </span>
              )}
            </div>
          )}
        </div>

        {nextMilestone && (
          <>
            <div className="mb-1 flex justify-between text-xs text-slate-600">
              <span>
                {isRTL ? `${weeksToNext} أسبوع للهدف التالي` : `${weeksToNext} weeks to next`}
              </span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
              />
            </div>
          </>
        )}

        {longestStreakWeeks > currentStreakWeeks && (
          <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
            <Trophy size={12} />
            <span>
              {isRTL
                ? `أطول سلسلة: ${longestStreakWeeks} أسبوع`
                : `Longest: ${longestStreakWeeks} weeks`}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
