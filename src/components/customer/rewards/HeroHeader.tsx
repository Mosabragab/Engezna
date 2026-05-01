'use client';

import { useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { TIER_THEMES, tierProgress } from '@/lib/loyalty';
import type { LoyaltyBalance } from '@/lib/loyalty';
import { TierBadge } from './TierBadge';
import { AnimatedCounter } from './AnimatedCounter';

interface HeroHeaderProps {
  fullName: string | null;
  loyalty: LoyaltyBalance;
}

function greeting(isRTL: boolean): string {
  const hour = new Date().getHours();
  if (isRTL) {
    if (hour < 12) return 'صباح الخير';
    if (hour < 18) return 'مساء الخير';
    return 'مساء الخير';
  }
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HeroHeader({ fullName, loyalty }: HeroHeaderProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const theme = TIER_THEMES[loyalty.tier];
  const progress = tierProgress(loyalty.lifetime_points, loyalty.tier);
  const reduceMotion = useReducedMotion();

  const firstName = fullName?.split(' ')[0] || (isRTL ? 'صديقنا' : 'friend');

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.bgGradient} p-6 shadow-sm border border-white/40`}
    >
      {/* Mesh gradient ornaments — large soft blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -right-12 -top-16 h-48 w-48 rounded-full"
          style={{ background: theme.accent, filter: 'blur(40px)', opacity: 0.18 }}
          animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        />
        <motion.div
          className="absolute -left-10 -bottom-16 h-40 w-40 rounded-full"
          style={{ background: theme.accent, filter: 'blur(50px)', opacity: 0.12 }}
          animate={reduceMotion ? undefined : { scale: [1, 1.2, 1], opacity: [0.1, 0.18, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          aria-hidden="true"
        />
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.5) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />
      </div>

      <div className="relative">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-sm text-slate-600"
        >
          {greeting(isRTL)}، {firstName} 👋
        </motion.p>

        <div className={`mt-4 flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <TierBadge tier={loyalty.tier} size="lg" isRTL={isRTL} />
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-500">{isRTL ? 'مستواك' : 'Your tier'}</p>
            <p className="text-xl font-bold text-slate-900">
              {isRTL ? theme.label.ar : theme.label.en}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <AnimatedCounter
                value={loyalty.points_balance}
                className="text-2xl font-bold text-primary tabular-nums"
                highlightOnChange
              />
              <span className="text-sm text-slate-500">{isRTL ? 'نقطة' : 'points'}</span>
            </div>
          </div>
        </div>

        {/* Progress to next tier */}
        {progress.next !== null && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
              <span>
                {isRTL
                  ? `${progress.pointsToNext?.toLocaleString()} نقطة للمستوى التالي`
                  : `${progress.pointsToNext?.toLocaleString()} pts to next tier`}
              </span>
              <span className="tabular-nums text-slate-500">
                {loyalty.lifetime_points.toLocaleString()} / {progress.next.toLocaleString()}
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-white/70 backdrop-blur-sm">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentInTier}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                className="relative h-full rounded-full overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}cc)`,
                }}
              >
                {/* Shine sweep on the progress fill */}
                {!reduceMotion && (
                  <motion.div
                    className="absolute inset-y-0 w-1/3"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                    }}
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: 'easeInOut',
                    }}
                  />
                )}
              </motion.div>
            </div>
          </div>
        )}

        {progress.next === null && (
          <p className="mt-5 text-center text-sm font-medium text-slate-700">
            {isRTL
              ? '🌟 وصلت لأعلى مستوى — مبروك!'
              : "🌟 You've reached the top tier — congratulations!"}
          </p>
        )}
      </div>
    </div>
  );
}
