/**
 * Mega Referrer Service (v2.5.2)
 *
 * Tracks the first 10 customers to achieve 10+ successful referrals.
 * Winners get a permanent 1.25× multiplier on all loyalty points earned.
 *
 * Race-safe: the SQL RPC uses FOR UPDATE SKIP LOCKED on the slots table,
 * so concurrent referral completions cannot grant the same rank twice.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §4.2 (v2.5.2)
 */

import type {
  AnySupabaseClient,
  LeaderboardEntry,
  MegaReferrerCheckResult,
  MegaReferrerStatus,
} from './types';

export const MEGA_REFERRER_THRESHOLD = 10;
export const MEGA_REFERRER_MULTIPLIER = 1.25;
export const MEGA_REFERRER_SLOTS = 10;

export class MegaReferrerService {
  constructor(private supabase: AnySupabaseClient) {}

  /**
   * Called from the referral completion hook. If the user just hit the
   * threshold AND a slot is available, grants the badge + multiplier.
   * Otherwise just updates the successful_referrals_count cache.
   */
  async checkAndGrant(userId: string): Promise<MegaReferrerCheckResult> {
    const { data, error } = await this.supabase.rpc('check_and_grant_mega_referrer', {
      p_user_id: userId,
    });

    if (error) {
      throw new Error(`MegaReferrerService.checkAndGrant failed: ${error.message}`);
    }

    return data as MegaReferrerCheckResult;
  }

  /**
   * Returns the user's current Mega Referrer status. Used by the rewards
   * page and the referrals page.
   */
  async getStatus(userId: string): Promise<MegaReferrerStatus> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(
        'is_mega_referrer, mega_referrer_rank, mega_referrer_qualified_at, loyalty_multiplier, successful_referrals_count'
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`MegaReferrerService.getStatus failed: ${error.message}`);
    }

    return {
      isMegaReferrer: Boolean(data?.is_mega_referrer),
      rank: data?.mega_referrer_rank ?? null,
      qualifiedAt: data?.mega_referrer_qualified_at ?? null,
      loyaltyMultiplier: Number(data?.loyalty_multiplier ?? 1.0),
      successfulReferralsCount: data?.successful_referrals_count ?? 0,
    };
  }

  /**
   * Returns the public leaderboard of the 10 slots (filled + empty).
   * Used by the admin page and the customer-facing /rewards/referrals page.
   */
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data, error } = await this.supabase.rpc('get_mega_referrer_leaderboard');

    if (error) {
      throw new Error(`MegaReferrerService.getLeaderboard failed: ${error.message}`);
    }

    return (data as Array<Record<string, unknown>>).map((row) => ({
      rank: row.rank as number,
      displayName: (row.display_name as string) ?? null,
      qualifiedAt: (row.qualified_at as string) ?? null,
      referralsCount: (row.referrals_count as number) ?? null,
      isFilled: Boolean(row.is_filled),
    }));
  }
}
