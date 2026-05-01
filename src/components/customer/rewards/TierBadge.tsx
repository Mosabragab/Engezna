'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { LoyaltyTier } from '@/lib/loyalty';

interface TierBadgeProps {
  tier: LoyaltyTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  isRTL?: boolean;
}

const SIZES = {
  sm: { box: 'h-10 w-10', label: 'text-xs' },
  md: { box: 'h-14 w-14', label: 'text-sm' },
  lg: { box: 'h-20 w-20', label: 'text-base' },
};

const LABELS: Record<LoyaltyTier, { ar: string; en: string }> = {
  bronze: { ar: 'برونزي', en: 'Bronze' },
  silver: { ar: 'فضّي', en: 'Silver' },
  gold: { ar: 'ذهبي', en: 'Gold' },
  platinum: { ar: 'بلاتيني', en: 'Platinum' },
};

const ACCENT_COLORS: Record<LoyaltyTier, string> = {
  bronze: '#A0522D',
  silver: '#94A3B8',
  gold: '#F59E0B',
  platinum: '#A78BFA',
};

/**
 * Premium tier badge — custom SVG with metallic gradients, NOT emojis.
 * Bronze: copper sheen. Silver: brushed metal. Gold: warm shimmer + glow.
 * Platinum: iridescent + animated shimmer overlay + sparkles.
 */
export function TierBadge({ tier, size = 'md', showLabel = false, isRTL = false }: TierBadgeProps) {
  const dims = SIZES[size];
  const reduceMotion = useReducedMotion();
  const accent = ACCENT_COLORS[tier];

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
        className={`relative ${dims.box} flex-shrink-0`}
        aria-label={`${LABELS[tier].en} tier`}
      >
        <TierMedalSVG tier={tier} reduceMotion={Boolean(reduceMotion)} />
      </motion.div>
      {showLabel && (
        <span className={`font-bold ${dims.label}`} style={{ color: accent }}>
          {isRTL ? LABELS[tier].ar : LABELS[tier].en}
        </span>
      )}
    </div>
  );
}

function TierMedalSVG({ tier, reduceMotion }: { tier: LoyaltyTier; reduceMotion: boolean }) {
  const gradId = `tier-grad-${tier}`;
  const ribbonId = `tier-ribbon-${tier}`;
  const shineId = `tier-shine-${tier}`;

  const palettes: Record<
    LoyaltyTier,
    { dark: string; mid: string; light: string; ribbon: string }
  > = {
    bronze: { dark: '#7C3F1A', mid: '#B45309', light: '#FBBF24', ribbon: '#92400E' },
    silver: { dark: '#475569', mid: '#94A3B8', light: '#E2E8F0', ribbon: '#334155' },
    gold: { dark: '#B45309', mid: '#F59E0B', light: '#FEF08A', ribbon: '#7C2D12' },
    platinum: { dark: '#6D28D9', mid: '#A78BFA', light: '#F5F3FF', ribbon: '#4C1D95' },
  };

  const palette = palettes[tier];
  const showSparkles = tier === 'gold' || tier === 'platinum';
  const showShimmer = tier === 'platinum' && !reduceMotion;

  return (
    <svg viewBox="0 0 100 120" className="w-full h-full overflow-visible">
      <defs>
        {/* Medal radial gradient with metallic look */}
        <radialGradient id={gradId} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={palette.light} />
          <stop offset="50%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.dark} />
        </radialGradient>

        {/* Ribbon gradient */}
        <linearGradient id={ribbonId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.ribbon} stopOpacity="0.95" />
          <stop offset="100%" stopColor={palette.ribbon} stopOpacity="0.6" />
        </linearGradient>

        {/* Animated shine sweep (platinum only) */}
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Outer glow filter (gold + platinum) */}
        {(tier === 'gold' || tier === 'platinum') && (
          <filter id={`glow-${tier}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Ribbon (V-shape behind the medal) */}
      <path d="M 30 18 L 50 60 L 70 18 L 60 18 L 50 35 L 40 18 Z" fill={`url(#${ribbonId})`} />

      {/* Medal disc with glow on premium tiers */}
      <g filter={tier === 'gold' || tier === 'platinum' ? `url(#glow-${tier})` : undefined}>
        {/* Outer ring */}
        <circle cx="50" cy="70" r="36" fill={palette.dark} opacity="0.4" />
        {/* Main medal */}
        <circle cx="50" cy="70" r="33" fill={`url(#${gradId})`} />
        {/* Inner ring */}
        <circle
          cx="50"
          cy="70"
          r="26"
          fill="none"
          stroke={palette.light}
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Star/check center */}
        <g transform="translate(50, 70)">
          {tier === 'platinum' ? (
            <path
              d="M 0 -14 L 4 -4 L 14 -4 L 6 2 L 9 12 L 0 6 L -9 12 L -6 2 L -14 -4 L -4 -4 Z"
              fill={palette.light}
              opacity="0.95"
            />
          ) : tier === 'gold' ? (
            <path
              d="M 0 -12 L 3.5 -3.5 L 12 -3.5 L 5.5 1.5 L 8 10 L 0 5 L -8 10 L -5.5 1.5 L -12 -3.5 L -3.5 -3.5 Z"
              fill={palette.light}
              opacity="0.9"
            />
          ) : tier === 'silver' ? (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="22"
              fontWeight="800"
              fill={palette.light}
              opacity="0.85"
            >
              2
            </text>
          ) : (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="22"
              fontWeight="800"
              fill={palette.light}
              opacity="0.85"
            >
              3
            </text>
          )}
        </g>

        {/* Highlight on top-left for 3D feel */}
        <ellipse cx="38" cy="58" rx="14" ry="8" fill="white" opacity="0.25" />
      </g>

      {/* Animated shimmer for platinum */}
      {showShimmer && (
        <motion.rect
          x="-40"
          y="35"
          width="40"
          height="70"
          fill={`url(#${shineId})`}
          animate={{ x: [-40, 110] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: 'linear' }}
          style={{ mixBlendMode: 'overlay', clipPath: 'circle(33px at 50px 70px)' }}
        />
      )}

      {/* Floating sparkles for gold + platinum */}
      {showSparkles && !reduceMotion && (
        <>
          <motion.circle
            cx="80"
            cy="50"
            r="1.5"
            fill={palette.light}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          />
          <motion.circle
            cx="20"
            cy="80"
            r="1.5"
            fill={palette.light}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
          />
          <motion.circle
            cx="78"
            cy="92"
            r="1"
            fill={palette.light}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
          />
        </>
      )}
    </svg>
  );
}
