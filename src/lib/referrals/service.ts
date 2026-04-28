import { GiftEngine } from '@/lib/gifts/engine';
import { isReferralEligible } from '@/lib/gifts/helpers';
import type {
  AnySupabaseClient,
  Referral,
  ReferralStats,
  ReferralHistoryEntry,
  ApplyReferralResult,
  CompleteReferralResult,
} from './types';

const REFERRAL_CODE_LENGTH = 6;
const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1

/**
 * CSPRNG-backed code generation, unbiased via rejection sampling.
 * Ambiguous characters (I, O, 0, 1) are excluded from the alphabet.
 */
function generateCandidateCode(): string {
  const alphabetSize = REFERRAL_CODE_ALPHABET.length;
  // Largest multiple of alphabetSize that fits in a byte; reject above to avoid bias.
  const acceptCutoff = Math.floor(256 / alphabetSize) * alphabetSize;

  const out: string[] = [];
  const buf = new Uint8Array(REFERRAL_CODE_LENGTH * 2);
  while (out.length < REFERRAL_CODE_LENGTH) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && out.length < REFERRAL_CODE_LENGTH; i++) {
      const b = buf[i];
      if (b < acceptCutoff) {
        out.push(REFERRAL_CODE_ALPHABET[b % alphabetSize]);
      }
    }
  }
  return out.join('');
}

const PG_UNIQUE_VIOLATION = '23505';

export class ReferralService {
  private supabase: AnySupabaseClient;
  private giftEngine: GiftEngine;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
    this.giftEngine = new GiftEngine(supabase);
  }

  async getOrCreateReferralCode(userId: string): Promise<string | null> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (profile?.referral_code) return profile.referral_code;

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCandidateCode();
      const { data: collision } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', candidate)
        .limit(1)
        .maybeSingle();

      if (collision) continue;

      const { error } = await this.supabase
        .from('profiles')
        .update({ referral_code: candidate })
        .eq('id', userId)
        .is('referral_code', null);

      if (!error) return candidate;

      // Only retry on unique-constraint races; surface other failures.
      const isUniqueViolation =
        (error as { code?: string }).code === PG_UNIQUE_VIOLATION ||
        /duplicate key|unique/i.test(error.message || '');
      if (!isUniqueViolation) {
        console.error('[ReferralService] Failed to assign referral_code:', error);
        return null;
      }
    }

    return null;
  }

  async applyReferralCode(refereeId: string, rawCode: string): Promise<ApplyReferralResult> {
    const code = rawCode.trim().toUpperCase();
    if (!code) return { success: false, reason: 'invalid_code' };

    const { data: referrer } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();

    if (!referrer) return { success: false, reason: 'invalid_code' };
    if (referrer.id === refereeId) return { success: false, reason: 'self_referral' };

    const { data: existing } = await this.supabase
      .from('referrals')
      .select('id')
      .eq('referee_id', refereeId)
      .limit(1)
      .maybeSingle();

    if (existing) return { success: false, reason: 'already_referred' };

    const { count: existingOrders } = await this.supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', refereeId)
      .not('status', 'in', '(cancelled,rejected)');

    if ((existingOrders || 0) > 0) {
      return { success: false, reason: 'has_orders' };
    }

    const { data: created, error } = await this.supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referee_id: refereeId,
        referral_code: code,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !created) return { success: false, reason: 'invalid_code' };

    return { success: true, referralId: created.id };
  }

  async getMonthlyCompletedCount(referrerId: string): Promise<number> {
    // UTC month-start to align with complete_referral_atomic's
    // DATE_TRUNC('month', NOW()) which uses UTC.
    const now = new Date();
    const startOfMonthUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const { count } = await this.supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referrerId)
      .eq('status', 'completed')
      .gte('completed_at', startOfMonthUtc.toISOString());

    return count || 0;
  }

  /**
   * Complete a referral atomically. Pre-validates the order qualifies, then
   * delegates the cap check + dual gift grants + referrals UPDATE to
   * complete_referral_atomic RPC (single transaction).
   */
  async completeReferral(refereeId: string, orderId: string): Promise<CompleteReferralResult> {
    const { data: referral } = await this.supabase
      .from('referrals')
      .select('id, referrer_id, status')
      .eq('referee_id', refereeId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!referral) return { success: false, reason: 'no_pending_referral' };

    const { data: order } = await this.supabase
      .from('orders')
      .select('id, subtotal, status, payment_status, customer_id, created_at')
      .eq('id', orderId)
      .single();

    if (!order || order.customer_id !== refereeId) {
      return { success: false, reason: 'order_not_qualifying' };
    }

    if (order.status !== 'delivered' || order.payment_status !== 'completed') {
      return { success: false, reason: 'order_not_qualifying' };
    }

    const { count: priorOrders } = await this.supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', refereeId)
      .eq('status', 'delivered')
      .lt('created_at', order.created_at);

    if ((priorOrders || 0) > 0) {
      return { success: false, reason: 'order_not_qualifying' };
    }

    const settings = await this.giftEngine.getSettings();
    const subtotalPounds = Number(order.subtotal || 0);
    const subtotalPiasters = Math.round(subtotalPounds * 100);

    if (!isReferralEligible(subtotalPiasters, settings)) {
      return { success: false, reason: 'order_below_minimum' };
    }

    const { data, error } = await this.supabase.rpc('complete_referral_atomic', {
      p_referee_id: refereeId,
      p_order_id: orderId,
    });

    if (error) {
      const message = error.message || '';
      if (message.includes('monthly_cap_reached')) {
        return { success: false, reason: 'monthly_cap_reached' };
      }
      if (message.includes('no_pending_referral')) {
        return { success: false, reason: 'no_pending_referral' };
      }
      console.error('[ReferralService] complete_referral_atomic failed:', error);
      return { success: false, reason: 'order_not_qualifying' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { success: false, reason: 'order_not_qualifying' };

    return {
      success: true,
      referralId: row.referral_id,
      referrerGiftEntryId: row.referrer_gift_entry_id || null,
      refereeGiftEntryId: row.referee_gift_entry_id || null,
    };
  }

  async getStats(userId: string): Promise<ReferralStats | null> {
    const code = await this.getOrCreateReferralCode(userId);
    if (!code) return null;

    const settings = await this.giftEngine.getSettings();

    const [{ count: total }, { count: pending }, { count: completed }, monthlyCompleted] =
      await Promise.all([
        this.supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', userId),
        this.supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', userId)
          .eq('status', 'pending'),
        this.supabase
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', userId)
          .eq('status', 'completed'),
        this.getMonthlyCompletedCount(userId),
      ]);

    const rewardsEarned = (completed || 0) * settings.referral_reward_piasters;

    return {
      code,
      total_referrals: total || 0,
      pending_referrals: pending || 0,
      completed_referrals: completed || 0,
      monthly_completed: monthlyCompleted,
      monthly_limit: settings.referral_monthly_limit_per_user,
      monthly_remaining: Math.max(0, settings.referral_monthly_limit_per_user - monthlyCompleted),
      rewards_earned_piasters: rewardsEarned,
    };
  }

  async getHistory(userId: string, limit = 20): Promise<ReferralHistoryEntry[]> {
    const { data } = await this.supabase
      .from('referrals')
      .select(
        'id, status, completed_at, created_at, referee:profiles!referrals_referee_id_fkey(full_name)'
      )
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!data) return [];

    return (
      data as unknown as Array<Referral & { referee: { full_name: string | null } | null }>
    ).map((row) => ({
      id: row.id,
      status: row.status,
      completed_at: row.completed_at,
      created_at: row.created_at,
      referee_name: row.referee?.full_name || null,
    }));
  }
}

export function createReferralService(supabase: AnySupabaseClient): ReferralService {
  return new ReferralService(supabase);
}
