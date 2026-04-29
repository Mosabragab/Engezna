import type { LoyaltyTier } from './types';

export interface TierTheme {
  /** Tailwind gradient class for backgrounds */
  bgGradient: string;
  /** Tailwind gradient class for the badge fill */
  badgeGradient: string;
  /** CSS color for accents (border, glow) */
  accent: string;
  /** Whether the badge has a soft outer glow */
  glow: boolean;
  /** Whether the badge has a moving shimmer overlay */
  shimmer: boolean;
  /** Localized labels */
  label: { ar: string; en: string };
  /** Crown / icon emoji */
  emoji: string;
}

export const TIER_THEMES: Record<LoyaltyTier, TierTheme> = {
  bronze: {
    bgGradient: 'from-amber-50 via-orange-50 to-amber-100',
    badgeGradient: 'from-amber-600 via-orange-500 to-amber-700',
    accent: '#CD7F32',
    glow: false,
    shimmer: false,
    label: { ar: 'برونزي', en: 'Bronze' },
    emoji: '🥉',
  },
  silver: {
    bgGradient: 'from-slate-50 via-gray-100 to-slate-200',
    badgeGradient: 'from-slate-400 via-gray-300 to-slate-500',
    accent: '#C0C0C0',
    glow: false,
    shimmer: false,
    label: { ar: 'فضّي', en: 'Silver' },
    emoji: '🥈',
  },
  gold: {
    bgGradient: 'from-yellow-50 via-amber-100 to-yellow-200',
    badgeGradient: 'from-yellow-400 via-amber-300 to-yellow-500',
    accent: '#FFD700',
    glow: true,
    shimmer: false,
    label: { ar: 'ذهبي', en: 'Gold' },
    emoji: '🏆',
  },
  platinum: {
    bgGradient: 'from-violet-50 via-purple-100 to-violet-200',
    badgeGradient: 'from-violet-400 via-purple-300 to-fuchsia-400',
    accent: '#E5E4E2',
    glow: true,
    shimmer: true,
    label: { ar: 'بلاتيني', en: 'Platinum' },
    emoji: '👑',
  },
};

export function getTierTheme(tier: LoyaltyTier): TierTheme {
  return TIER_THEMES[tier] || TIER_THEMES.bronze;
}
