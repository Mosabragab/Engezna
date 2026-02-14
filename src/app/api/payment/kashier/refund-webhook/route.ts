import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateKashierSignature } from '@/lib/payment/kashier';
import { logger } from '@/lib/logger';

/**
 * Kashier Refund Webhook Handler
 *
 * Receives async refund status notifications from Kashier.
 * When admin initiates a refund via /api/payment/kashier/refund,
 * Kashier may process it asynchronously and send a webhook when done.
 *
 * This endpoint:
 * 1. Validates the webhook signature
 * 2. Updates the order's refund status based on Kashier's response
 * 3. Notifies the customer of the final refund result
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info('[Kashier Refund Webhook] Received callback');

    const {
      orderId,
      transactionId,
      refundId,
      status,
      signature,
      amount,
      error: refundError,
    } = body;

    if (!orderId) {
      logger.warn('[Kashier Refund Webhook] Missing order ID');
      return NextResponse.json({ success: false, error: 'Missing order ID' }, { status: 400 });
    }

    // SECURITY: Signature validation is MANDATORY
    if (!signature) {
      logger.warn('[Kashier Refund Webhook] Rejected: no signature provided', { orderId });
      return NextResponse.json({ success: false, error: 'Missing signature' }, { status: 403 });
    }

    const isValid = validateKashierSignature(body, signature);
    if (!isValid) {
      logger.warn('[Kashier Refund Webhook] Rejected: invalid signature', { orderId });
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    // Fetch the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, payment_status, refund_transaction_id, status, refund_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logger.warn('[Kashier Refund Webhook] Order not found', { orderId });
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Idempotency: Skip if refund already finalized
    if (order.payment_status === 'refunded' && order.refund_transaction_id) {
      logger.info('[Kashier Refund Webhook] Skipped: refund already finalized', {
        orderId,
        existingRefundId: order.refund_transaction_id,
      });
      return NextResponse.json({ success: true, message: 'Refund already finalized' });
    }

    // Determine refund result
    const refundStatus = (status || '').toUpperCase();
    const isSuccess = refundStatus === 'SUCCESS' || refundStatus === 'REFUNDED';
    const isFailed = refundStatus === 'FAILED' || refundStatus === 'REJECTED';

    if (isSuccess) {
      // Refund confirmed by Kashier
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'refunded',
          refund_transaction_id: refundId || transactionId,
          refunded_at: new Date().toISOString(),
          refund_amount: amount ? parseFloat(amount) : order.refund_amount,
        })
        .eq('id', orderId);

      if (updateError) {
        logger.error('[Kashier Refund Webhook] Failed to update order', {
          orderId,
          error: updateError,
        });
        return NextResponse.json(
          { success: false, error: 'Failed to update order' },
          { status: 500 }
        );
      }

      // Notify customer of successful refund
      await supabaseAdmin.from('customer_notifications').insert({
        customer_id: order.customer_id,
        type: 'refund_processed',
        title_ar: 'تم استرجاع المبلغ بنجاح',
        title_en: 'Refund Completed',
        body_ar: `تم استرجاع المبلغ إلى حسابك بنجاح. قد يستغرق ظهوره 5-14 يوم عمل.`,
        body_en: `Your refund has been processed successfully. It may take 5-14 business days to appear.`,
        related_order_id: orderId,
      });

      logger.info('[Kashier Refund Webhook] Refund confirmed', {
        orderId,
        refundId: refundId || transactionId,
        amount,
      });
    } else if (isFailed) {
      // Refund failed - revert payment_status back to paid
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'paid',
          status: order.status === 'refunded' ? 'delivered' : order.status,
          refund_transaction_id: null,
          refund_amount: null,
          refunded_at: null,
        })
        .eq('id', orderId);

      if (updateError) {
        logger.error('[Kashier Refund Webhook] Failed to revert order after failed refund', {
          orderId,
          error: updateError,
        });
      }

      // Notify customer of failed refund
      await supabaseAdmin.from('customer_notifications').insert({
        customer_id: order.customer_id,
        type: 'refund_failed',
        title_ar: 'فشل استرجاع المبلغ',
        title_en: 'Refund Failed',
        body_ar: `لم نتمكن من استرجاع المبلغ. سيتواصل فريق الدعم معك قريباً.`,
        body_en: `We were unable to process your refund. Our support team will contact you soon.`,
        related_order_id: orderId,
      });

      logger.warn('[Kashier Refund Webhook] Refund failed', {
        orderId,
        refundError,
        status: refundStatus,
      });
    } else {
      // Pending or unknown status - log but don't update
      logger.info('[Kashier Refund Webhook] Refund status pending/unknown', {
        orderId,
        status: refundStatus,
      });
    }

    return NextResponse.json({
      success: true,
      orderId,
      refundStatus: isSuccess ? 'refunded' : isFailed ? 'failed' : 'pending',
    });
  } catch (error) {
    logger.error('[Kashier Refund Webhook] Processing failed', { error });
    return NextResponse.json(
      { success: false, error: 'Refund webhook processing failed' },
      { status: 500 }
    );
  }
}
