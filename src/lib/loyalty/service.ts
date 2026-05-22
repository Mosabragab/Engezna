import {
  TIER_THRESHOLDS,
  POINTS_PER_EGP,
  REDEMPTION_UNIT,
  type AnySupabaseClient,
  type LoyaltyBalance,
  type LoyaltyTransaction,
  type LoyaltyTier,
  type AwardPointsResult,
  type RedeemPointsResult,
} from './types';

/**
 * Computes loyalty points to award for an order subtotal.
 * 1 point per 10 EGP — rounded down.
 */
export function calculatePointsForOrder(subtotalPiasters: number): number {
  if (!Number.isFinite(subtotalPiasters) || subtotalPiasters <= 0) return 0;
  const subtotalPounds = subtotalPiasters / 100;
  return Math.floor(subtotalPounds * POINTS_PER_EGP);
}

/**
 * Computes proportional clawback points for a partial refund.
 */
export function calculateClawbackPoints(
  originalPoints: number,
  refundAmountPiasters: number,
  orderTotalPiasters: number
): number {
  if (orderTotalPiasters <= 0) return 0;
  const ratio = Math.min(1, refundAmountPiasters / orderTotalPiasters);
  return Math.round(originalPoints * ratio);
}

export function tierProgress(
  lifetimePoints: number,
  tier: LoyaltyTier
): {
  current: number;
  next: number | null;
  pointsToNext: number | null;
  percentInTier: number;
} {
  const thresholds = TIER_THRESHOLDS[tier];
  const next = thresholds.next;
  if (next === null) {
    return { current: lifetimePoints, next: null, pointsToNext: null, percentInTier: 100 };
  }
  const span = next - thresholds.min;
  const earned = Math.max(0, lifetimePoints - thresholds.min);
  const percentInTier = Math.min(100, Math.round((earned / span) * 100));
  return {
    current: lifetimePoints,
    next,
    pointsToNext: Math.max(0, next - lifetimePoints),
    percentInTier,
  };
}

export class LoyaltyService {
  private supabase: AnySupabaseClient;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
  }

  async getBalance(userId: string): Promise<LoyaltyBalance> {
    const { data, error } = await this.supabase
      .from('loyalty_points')
      .select('user_id, points_balance, lifetime_points, tier')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`getBalance failed: ${error.message}`);
    }

    if (!data) {
      return {
        user_id: userId,
        points_balance: 0,
        lifetime_points: 0,
        tier: 'bronze',
      };
    }

    return data as LoyaltyBalance;
  }

  async getHistory(userId: string, limit = 20): Promise<LoyaltyTransaction[]> {
    const { data, error } = await this.supabase
      .from('loyalty_transactions')
      .select(
        'id, user_id, order_id, points, transaction_type, description, balance_after, created_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`getHistory failed: ${error.message}`);
    }
    return (data || []) as LoyaltyTransaction[];
  }

  /**
   * Awards points for a completed order.
   *
   * v2.5.2 changes:
   *   - Zero points if order has any discount (gift / promo / referral)
   *   - Applies loyalty_multiplier (Mega Referrer 1.25×) × streak_multiplier (Platinum 1.10×)
   *   - Routes to award_order_loyalty_points RPC (replaces the v1 award_loyalty_points_atomic)
   *
   * Idempotency lives in the RPC via order_id uniqueness on loyalty_transactions.
   */
  async awardOrderPoints(
    userId: string,
    orderId: string,
    subtotalPiasters: number,
    discountPiasters: number = 0
  ): Promise<AwardPointsResult> {
    const { data, error } = await this.supabase.rpc('award_order_loyalty_points', {
      p_user_id: userId,
      p_order_id: orderId,
      p_subtotal_piasters: subtotalPiasters,
      p_discount_piasters: discountPiasters,
    });

    if (error) {
      throw new Error(`awardOrderPoints failed: ${error.message}`);
    }

    // RPC returns a single JSONB object
    const result = data as {
      points: number;
      base_points?: number;
      multiplier?: number;
      reason?: string;
      new_balance?: number;
      new_lifetime?: number;
      new_tier?: string;
    };

    if (!result) {
      throw new Error('awardOrderPoints returned no row');
    }

    // Zero-point cases: already_awarded / discount_applied / zero_subtotal
    if (result.points === 0) {
      return {
        success: true,
        pointsAwarded: 0,
        skipReason: result.reason,
        newBalance: result.new_balance ?? 0,
        newTier: (result.new_tier as LoyaltyTier) ?? 'bronze',
        tierChanged: false,
        previousTier: (result.new_tier as LoyaltyTier) ?? 'bronze',
      };
    }

    return {
      success: true,
      pointsAwarded: result.points,
      basePoints: result.base_points,
      multiplier: result.multiplier,
      newBalance: result.new_balance!,
      newTier: (result.new_tier as LoyaltyTier) ?? 'bronze',
      tierChanged: false, // tier-up detection now lives in DB trigger (migration 7)
      previousTier: (result.new_tier as LoyaltyTier) ?? 'bronze',
    };
  }

  /**
   * Awards bonus points for a 5-star rating (v2.5.2: 20 points, was 5).
   */
  async awardRatingBonus(
    userId: string,
    orderId: string,
    stars: number
  ): Promise<{ points: number; reason?: string; newBalance?: number }> {
    const { data, error } = await this.supabase.rpc('award_rating_bonus', {
      p_user_id: userId,
      p_order_id: orderId,
      p_stars: stars,
    });

    if (error) {
      throw new Error(`awardRatingBonus failed: ${error.message}`);
    }

    return data as { points: number; reason?: string; newBalance?: number };
  }

  /**
   * Redeems points for a discount gift entry.
   * Returns a typed result so the UI can show the right error message.
   */
  async redeemPoints(userId: string, points: number): Promise<RedeemPointsResult> {
    if (!Number.isInteger(points) || points < REDEMPTION_UNIT || points % REDEMPTION_UNIT !== 0) {
      return { success: false, reason: 'invalid_amount' };
    }

    const { data, error } = await this.supabase.rpc('redeem_loyalty_points_atomic', {
      p_user_id: userId,
      p_points: points,
    });

    if (error) {
      const message = error.message || '';
      if (message.includes('insufficient_points')) {
        return { success: false, reason: 'insufficient_points' };
      }
      if (message.includes('invalid_redemption_amount')) {
        return { success: false, reason: 'invalid_amount' };
      }
      if (message.includes('redemption_grant_failed')) {
        return { success: false, reason: 'redemption_grant_failed' };
      }
      console.error('[LoyaltyService] redeem_loyalty_points_atomic failed:', error);
      return { success: false, reason: 'system_error' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { success: false, reason: 'system_error' };

    return {
      success: true,
      giftEntryId: row.gift_entry_id,
      newBalance: row.points_balance,
      discountPiasters: row.discount_piasters,
    };
  }

  /**
   * For refund flows: deduct proportional points if the refund is the
   * customer's fault. Caller must compute the points to claw back.
   */
  async clawbackPoints(userId: string, orderId: string, points: number): Promise<number> {
    if (points <= 0) return 0;

    const { data, error } = await this.supabase.rpc('clawback_loyalty_points_atomic', {
      p_user_id: userId,
      p_order_id: orderId,
      p_points: points,
    });

    if (error) {
      throw new Error(`clawbackPoints failed: ${error.message}`);
    }
    return Number(data) || 0;
  }
}

export function createLoyaltyService(supabase: AnySupabaseClient): LoyaltyService {
  return new LoyaltyService(supabase);
}
