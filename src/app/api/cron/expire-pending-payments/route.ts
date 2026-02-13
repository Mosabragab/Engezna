/**
 * Expire Pending Payments Cron Job
 *
 * Runs every 15 minutes to cancel orders stuck in 'pending_payment' status.
 * These are online payment orders where:
 * - The user was redirected to Kashier but never completed payment
 * - The user closed the browser during payment
 * - Kashier failed to send a webhook
 *
 * Orders older than 30 minutes in 'pending_payment' status are:
 * 1. Cancelled (status → 'cancelled', payment_status → 'failed')
 * 2. Promo code usage rolled back (if applicable)
 * 3. Customer notified
 *
 * Security: Protected by CRON_SECRET header verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const EXPIRY_MINUTES = 30;

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    logger.error('[Cron:ExpirePayments] CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const cutoffTime = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Find expired pending_payment orders
    const { data: expiredOrders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, promo_code')
      .eq('status', 'pending_payment')
      .lt('created_at', cutoffTime);

    if (fetchError) {
      logger.error('[Cron:ExpirePayments] Failed to fetch expired orders', {
        error: fetchError,
      });
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired pending payment orders found',
        cancelled: 0,
      });
    }

    let cancelledCount = 0;

    for (const order of expiredOrders) {
      // Cancel the order
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'cancelled',
          payment_status: 'failed',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('status', 'pending_payment'); // Idempotent check

      if (updateError) {
        logger.error('[Cron:ExpirePayments] Failed to cancel order', {
          orderId: order.id,
          error: updateError,
        });
        continue;
      }

      // Rollback promo code usage if applicable
      if (order.promo_code) {
        // Find and delete usage records for this order, then decrement count
        const { data: usageRecords } = await supabaseAdmin
          .from('promo_code_usage')
          .select('id, promo_code_id')
          .eq('order_id', order.id);

        if (usageRecords && usageRecords.length > 0) {
          for (const usage of usageRecords) {
            // Delete the usage record
            await supabaseAdmin.from('promo_code_usage').delete().eq('id', usage.id);

            // Decrement usage count directly (usage_count - 1, min 0)
            const { data: promoCode } = await supabaseAdmin
              .from('promo_codes')
              .select('usage_count')
              .eq('id', usage.promo_code_id)
              .single();

            if (promoCode && promoCode.usage_count > 0) {
              await supabaseAdmin
                .from('promo_codes')
                .update({ usage_count: promoCode.usage_count - 1 })
                .eq('id', usage.promo_code_id)
                .eq('usage_count', promoCode.usage_count); // Optimistic lock
            }
          }
        }
      }

      // Notify customer about expired payment
      await supabaseAdmin.from('customer_notifications').insert({
        user_id: order.customer_id,
        type: 'payment_expired',
        title: 'انتهت صلاحية الدفع',
        message: 'انتهت صلاحية عملية الدفع. يمكنك إعادة الطلب من جديد.',
        data: {
          order_id: order.id,
          payment_status: 'failed',
        },
      });

      cancelledCount++;
    }

    logger.info('[Cron:ExpirePayments] Completed', {
      found: expiredOrders.length,
      cancelled: cancelledCount,
    });

    return NextResponse.json({
      success: true,
      found: expiredOrders.length,
      cancelled: cancelledCount,
      cutoffTime,
    });
  } catch (error) {
    logger.error('[Cron:ExpirePayments] Failed', { error });
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
