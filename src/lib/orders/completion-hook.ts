import type { AnySupabaseClient } from '@/lib/gifts/types';
import { createGiftEngine } from '@/lib/gifts';
import { createRuleEngine } from '@/lib/gifts/rule-engine';
import { createReferralService } from '@/lib/referrals';
import { createLoyaltyService } from '@/lib/loyalty';

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

  // Step 2: Stamp card
  try {
    const stamp = await giftEngine.addStamp(order.customer_id, orderId, subtotalPiasters);
    results.stamp_added = stamp !== null;
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
  } catch (error) {
    results.errors.push({
      step: 'referral',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  // Step 4: Loyalty points (computed on subtotal AFTER discount)
  try {
    const award = await loyaltyService.awardOrderPoints(
      order.customer_id,
      orderId,
      earningPiasters
    );
    results.loyalty_points_awarded = award.pointsAwarded;
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
