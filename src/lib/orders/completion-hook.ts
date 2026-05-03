import type { AnySupabaseClient } from '@/lib/gifts/types';
import { createGiftEngine } from '@/lib/gifts';
import { createRuleEngine } from '@/lib/gifts/rule-engine';
import { createReferralService } from '@/lib/referrals';
import { createLoyaltyService, REDEMPTION_RATE_PIASTERS_PER_POINT } from '@/lib/loyalty';
import {
  sendGiftStampCompleteEmail,
  sendGiftLoyaltyTierUpEmail,
  sendGiftReferralRewardEmail,
} from '@/lib/email/resend';
import { logger } from '@/lib/logger';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';
const REWARDS_URL = `${SITE_URL}/ar/rewards`;

export interface CompletionResults {
  rules_granted: number;
  stamp_added: boolean;
  referral_completed: boolean;
  loyalty_points_awarded: number;
  errors: Array<{ step: string; message: string }>;
}

/**
 * Order Completion Hook — the single entrypoint that activates the entire
 * gift/loyalty/referral system when an order transitions to delivered + paid.
 *
 * Idempotent via order_completion_processed (PK = order_id). Safe to call
 * multiple times; the second call is a no-op.
 *
 * Each sub-step is wrapped in try/catch so a single failure doesn't poison
 * the entire flow. Errors are aggregated and persisted for observability.
 *
 * Should be invoked from a cron (or webhook) under service-role context so the
 * RPCs (which are GRANTed to service_role) can execute.
 */
export async function processOrderCompletion(
  supabase: AnySupabaseClient,
  orderId: string
): Promise<CompletionResults | null> {
  if (!orderId) throw new Error('orderId required');

  // Idempotency lock: insert and bail if the row already exists.
  const { error: lockError } = await supabase.from('order_completion_processed').insert({
    order_id: orderId,
  });

  if (lockError) {
    // 23505 = unique_violation → already processed.
    const code = (lockError as { code?: string }).code;
    const isDuplicate = code === '23505' || /duplicate|unique/i.test(lockError.message || '');
    if (isDuplicate) return null;
    throw new Error(`processOrderCompletion: failed to claim lock: ${lockError.message}`);
  }

  // Load the order. Requires customer_id, subtotal, payment_status, status, discount.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, customer_id, subtotal, discount, status, payment_status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    await supabase
      .from('order_completion_processed')
      .update({
        error_count: 1,
        errors: [{ step: 'load_order', message: orderError?.message || 'not_found' }],
      })
      .eq('order_id', orderId);
    throw new Error(`processOrderCompletion: order ${orderId} not found`);
  }

  if (!order.customer_id) {
    // Guest orders / deleted customers — nothing to do.
    return {
      rules_granted: 0,
      stamp_added: false,
      referral_completed: false,
      loyalty_points_awarded: 0,
      errors: [],
    };
  }

  // Eligibility gate: only delivered + paid orders trigger rewards.
  if (order.status !== 'delivered' || order.payment_status !== 'completed') {
    return {
      rules_granted: 0,
      stamp_added: false,
      referral_completed: false,
      loyalty_points_awarded: 0,
      errors: [{ step: 'eligibility', message: 'not_delivered_or_paid' }],
    };
  }

  const subtotalPiasters = Math.round(Number(order.subtotal || 0) * 100);
  const discountPiasters = Math.round(Number(order.discount || 0) * 100);
  const earningPiasters = Math.max(0, subtotalPiasters - discountPiasters);

  const ruleEngine = createRuleEngine(supabase);
  const giftEngine = createGiftEngine(supabase);
  const referralService = createReferralService(supabase);
  const loyaltyService = createLoyaltyService(supabase);

  const results: CompletionResults = {
    rules_granted: 0,
    stamp_added: false,
    referral_completed: false,
    loyalty_points_awarded: 0,
    errors: [],
  };

  // Pull customer profile once — used for the email channel for each downstream
  // celebratory event. Best-effort: a missing/failing fetch only suppresses
  // emails (in-app + push from Path B still fire).
  const { data: customer } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', order.customer_id)
    .maybeSingle();
  const customerFirstName = (customer?.full_name?.trim().split(/\s+/)[0] || '') as string;

  // Step 1: Rule engine (welcome, win-back, delivery-on-us, etc.)
  try {
    const granted = await ruleEngine.processOrderCompleted(order.customer_id, orderId);
    results.rules_granted = granted.length;
  } catch (error) {
    results.errors.push({
      step: 'rule_engine',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Step 2: Stamp card — also fires the celebratory email when the card just
  // completed (in-app + push handled automatically by the DB trigger we added
  // in 20260429000008_gift_notifications.sql).
  try {
    const stamp = await giftEngine.addStamp(order.customer_id, orderId, subtotalPiasters);
    results.stamp_added = stamp !== null;

    if (stamp?.is_completed && customer?.email) {
      // Pull the actual golden box value for the email rather than guessing
      const { data: settings } = await supabase
        .from('retention_settings')
        .select('golden_box_default_piasters, golden_box_max_piasters, gift_default_expiry_days')
        .eq('id', 1)
        .maybeSingle();
      const goldenEgp = Math.round(
        Math.min(
          Number(settings?.golden_box_default_piasters ?? 5000),
          Number(settings?.golden_box_max_piasters ?? 10000)
        ) / 100
      );
      const expiryDays = Number(settings?.gift_default_expiry_days ?? 7);

      sendGiftStampCompleteEmail({
        to: customer.email,
        userName: customerFirstName,
        goldenBoxEgp: goldenEgp,
        expiryDays,
        rewardsUrl: REWARDS_URL,
      }).catch((err) => logger.warn('[CompletionHook] stamp email failed', { err }));
    }
  } catch (error) {
    results.errors.push({
      step: 'stamp',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Step 3: Referral completion (no-op if no pending referral or order doesn't qualify)
  try {
    const ref = await referralService.completeReferral(order.customer_id, orderId);
    results.referral_completed = ref.success;

    // On success, fire the referrer-side email. Need referrer profile + the
    // referee's first name; both come from a single join.
    if (ref.success && ref.referralId) {
      const { data: refRow } = await supabase
        .from('referrals')
        .select(
          'referrer_credit, referrer:referrer_id(email, full_name), referee:referee_id(full_name)'
        )
        .eq('id', ref.referralId)
        .maybeSingle();

      // Supabase types joined relations as arrays; the FK is one-to-one here.
      const referrer = refRow?.referrer as unknown as {
        email: string | null;
        full_name: string | null;
      } | null;
      const referee = refRow?.referee as unknown as { full_name: string | null } | null;
      const rewardEgp = Math.round(Number(refRow?.referrer_credit ?? 20));

      if (referrer?.email) {
        const { data: settings } = await supabase
          .from('retention_settings')
          .select('referral_min_first_order_piasters, gift_default_expiry_days')
          .eq('id', 1)
          .maybeSingle();
        const minOrderEgp = Math.round(
          Number(settings?.referral_min_first_order_piasters ?? 30000) / 100
        );
        const expiryDays = Number(settings?.gift_default_expiry_days ?? 7);

        sendGiftReferralRewardEmail({
          to: referrer.email,
          userName: (referrer.full_name?.trim().split(/\s+/)[0] || '') as string,
          refereeName: (referee?.full_name?.trim().split(/\s+/)[0] || '') as string,
          rewardEgp,
          expiryDays,
          minOrderEgp,
          rewardsUrl: REWARDS_URL,
        }).catch((err) => logger.warn('[CompletionHook] referral email failed', { err }));
      }
    }
  } catch (error) {
    results.errors.push({
      step: 'referral',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Step 4: Loyalty points (computed on subtotal AFTER discount). On tier
  // upgrade, fire the celebratory email — Path B already handles push.
  try {
    const award = await loyaltyService.awardOrderPoints(
      order.customer_id,
      orderId,
      earningPiasters
    );
    results.loyalty_points_awarded = award.pointsAwarded;

    if (award.tierChanged && award.newTier !== 'bronze' && customer?.email) {
      sendGiftLoyaltyTierUpEmail({
        to: customer.email,
        userName: customerFirstName,
        newTier: award.newTier,
        pointsBalance: award.newBalance,
        pointsPerEgp: Math.round(100 / REDEMPTION_RATE_PIASTERS_PER_POINT),
        rewardsUrl: REWARDS_URL,
      }).catch((err) => logger.warn('[CompletionHook] tier-up email failed', { err }));
    }
  } catch (error) {
    results.errors.push({
      step: 'loyalty',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Persist results for observability + admin debug.
  await supabase
    .from('order_completion_processed')
    .update({
      results,
      error_count: results.errors.length,
      errors: results.errors,
    })
    .eq('order_id', orderId);

  return results;
}
