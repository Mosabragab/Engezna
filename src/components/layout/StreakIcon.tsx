'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Flame } from 'lucide-react';

/**
 * Header Streak Icon (v2.5.2)
 *
 * Tiny visual hook in the header showing the user's current weekly streak.
 * Renders nothing for streak < 2 (avoids cognitive clutter on day one).
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §4.1 (v2.5.2)
 */

interface StreakIconProps {
  streak: number;
  tier?: 'none' | 'silver' | 'gold' | 'platinum';
}

const TIER_COLORS: Record<NonNullable<StreakIconProps['tier']>, string> = {
  none: 'text-amber-500',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
  platinum: 'text-purple-500',
};

export function StreakIcon({ streak, tier = 'none' }: StreakIconProps) {
  const reduceMotion = useReducedMotion();

  // Don't distract new users with a streak of 1 — only show from 2 weeks.
  if (streak < 2) return null;

  const color = TIER_COLORS[tier];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5"
      title={`Streak: ${streak} weeks`}
      aria-label={`Streak: ${streak} weeks`}
    >
      <motion.span
        animate={reduceMotion ? {} : { scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
      >
        <Flame size={14} className={color} fill="currentColor" />
      </motion.span>
      <span className={`text-xs font-bold ${color}`}>{streak}</span>
    </motion.div>
  );
}
