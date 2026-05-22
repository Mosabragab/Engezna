/**
 * Streak Service (v2.5.2)
 *
 * Weekly streak tracking. Active streak requires at least 1 qualifying order
 * (≥ 200 EGP) per ISO week. Milestones grant bonus points and tier badges.
 *
 * Milestones:
 *   4  weeks → +10 points (one-time)
 *   8  weeks → +25 points + Silver Streak 🥈
 *   12 weeks → +50 points + Gold Streak 🥇
 *   24 weeks → 1.10× permanent multiplier + Platinum Streak 💎
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §4.1 (v2.5.2)
 */

import type { AnySupabaseClient, CustomerStreak, UpdateStreakResult } from './types';

const QUALIFYING_ORDER_THRESHOLD_PIASTERS = 20_000; // 200 EGP

export class StreakService {
  constructor(private supabase: AnySupabaseClient) {}

  /**
   * Updates the streak after a successful order. Called from the order
   * completion hook. Returns the new streak state + any milestone bonus.
   */
  async update(userId: string, orderValuePiasters: number): Promise<UpdateStreakResult> {
    const { data, error } = await this.supabase.rpc('update_customer_streak', {
      p_user_id: userId,
      p_order_value_piasters: orderValuePiasters,
    });

    if (error) {
      throw new Error(`StreakService.update failed: ${error.message}`);
    }

    return data as UpdateStreakResult;
  }

  /**
   * Reads the user's current streak state for UI display.
   */
  async get(userId: string): Promise<CustomerStreak | null> {
    const { data, error } = await this.supabase
      .from('customer_streaks')
      .select(
        'user_id, current_streak_weeks, longest_streak_weeks, last_qualifying_week, streak_tier, points_multiplier, total_milestones_hit'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`StreakService.get failed: ${error.message}`);
    }

    if (!data) return null;

    return {
      userId: data.user_id,
      currentStreakWeeks: data.current_streak_weeks,
      longestStreakWeeks: data.longest_streak_weeks,
      lastQualifyingWeek: data.last_qualifying_week,
      streakTier: data.streak_tier,
      pointsMultiplier: Number(data.points_multiplier),
      totalMilestonesHit: data.total_milestones_hit,
    };
  }

  /**
   * Resets all inactive streaks (missed >= 14 days). Called by weekly cron.
   * Returns the number of streaks reset.
   */
  async resetInactive(): Promise<number> {
    const { data, error } = await this.supabase.rpc('reset_inactive_streaks');

    if (error) {
      throw new Error(`StreakService.resetInactive failed: ${error.message}`);
    }

    return Number(data);
  }

  /**
   * Returns whether the order is eligible to count toward streak.
   * Useful for the UI to predict "this order will continue your streak".
   */
  isQualifyingOrder(orderValuePiasters: number): boolean {
    return orderValuePiasters >= QUALIFYING_ORDER_THRESHOLD_PIASTERS;
  }
}

export const STREAK_MILESTONES = [
  { weeks: 4, points: 10, tier: 'none' as const },
  { weeks: 8, points: 25, tier: 'silver' as const },
  { weeks: 12, points: 50, tier: 'gold' as const },
  { weeks: 24, points: 0, tier: 'platinum' as const, multiplier: 1.1 },
];

export { QUALIFYING_ORDER_THRESHOLD_PIASTERS };
