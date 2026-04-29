'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { getTierTheme } from '@/lib/loyalty';
import type { LoyaltyTier } from '@/lib/loyalty';

interface TierBadgeProps {
  tier: LoyaltyTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  isRTL?: boolean;
}

const SIZES = {
  sm: { box: 'h-8 w-8', emoji: 'text-base', label: 'text-xs' },
  md: { box: 'h-12 w-12', emoji: 'text-2xl', label: 'text-sm' },
  lg: { box: 'h-16 w-16', emoji: 'text-3xl', label: 'text-base' },
};

export function TierBadge({ tier, size = 'md', showLabel = false, isRTL = false }: TierBadgeProps) {
  const theme = getTierTheme(tier);
  const dims = SIZES[size];
  const reduceMotion = useReducedMotion();

  const pulseAnimation = reduceMotion
    ? {}
    : {
        scale: [1, 1.04, 1],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
      };

  return (
    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <motion.div
        animate={pulseAnimation}
        className={`relative ${dims.box} flex items-center justify-center rounded-full bg-gradient-to-br ${theme.badgeGradient} shadow-lg ${theme.glow ? 'shadow-yellow-300/50' : ''}`}
        style={
          theme.glow
            ? { boxShadow: `0 0 20px ${theme.accent}40, 0 4px 12px rgba(0,0,0,0.15)` }
            : undefined
        }
        aria-label={`${theme.label.en} tier`}
      >
        {theme.shimmer && !reduceMotion && (
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background:
                'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)',
            }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'linear' }}
          />
        )}
        <span className={`${dims.emoji} relative z-10`} aria-hidden="true">
          {theme.emoji}
        </span>
      </motion.div>
      {showLabel && (
        <span className={`font-bold ${dims.label}`} style={{ color: theme.accent }}>
          {isRTL ? theme.label.ar : theme.label.en}
        </span>
      )}
    </div>
  );
}
