import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export interface MegaReferrerStatus {
  isMegaReferrer: boolean;
  rank: number | null;
  qualifiedAt: string | null;
  loyaltyMultiplier: number;
  successfulReferralsCount: number;
}

export interface MegaReferrerCheckResult {
  granted: boolean;
  rank?: number;
  multiplier?: number;
  count: number;
  remaining?: number;
  reason?: 'below_threshold' | 'all_slots_taken' | 'already_mega_referrer';
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string | null;
  qualifiedAt: string | null;
  referralsCount: number | null;
  isFilled: boolean;
}
