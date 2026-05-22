import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export type StreakTier = 'none' | 'silver' | 'gold' | 'platinum';

export interface CustomerStreak {
  userId: string;
  currentStreakWeeks: number;
  longestStreakWeeks: number;
  lastQualifyingWeek: string | null;
  streakTier: StreakTier;
  pointsMultiplier: number;
  totalMilestonesHit: number;
}

export interface UpdateStreakResult {
  updated: boolean;
  streak?: number;
  tier?: StreakTier;
  milestonePoints?: number;
  multiplier?: number;
  reason?: 'below_threshold' | 'same_week';
  thresholdPiasters?: number;
}
