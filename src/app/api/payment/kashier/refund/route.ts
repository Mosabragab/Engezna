import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { refundKashierPayment } from '@/lib/payment/kashier';
import { withErrorHandler } from '@/lib/api/error-handler';
import { logger } from '@/lib/logger';

/**
 * Kashier Refund API
 *
 * Processes refunds for online payments through Kashier.
 * Admin-only endpoint that:
 * 1. Validates the order is eligible for refund
 * 2. Calls Kashier's refund API
 * 3. Updates order payment_status to 'refunded'
 * 4. Records the refund transaction
 * 5. Notifies the customer
 *
 * For COD (cash on delivery) orders, refunds are handled manually
 * by the provider/delivery person - no API call needed.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Verify authentication and admin role
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { orderId, amount, reason } = body;

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ error: 'Refund reason is required' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // Fetch the order with payment details
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(
      'id, customer_id, total, payment_method, payment_status, payment_transaction_id, status'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Validate order is eligible for refund
  if (order.payment_method !== 'online') {
    return NextResponse.json(
      {
        error: 'Only online payment orders can be refunded through this endpoint',
        hint: 'COD refunds are handled manually by the provider',
      },
      { status: 400 }
    );
  }

  if (order.payment_status !== 'paid') {
    return NextResponse.json(
      { error: `Cannot refund order with payment_status: ${order.payment_status}` },
      { status: 400 }
    );
  }

  if (!order.payment_transaction_id) {
    return NextResponse.json(
      { error: 'Order has no payment transaction ID - cannot process refund' },
      { status: 400 }
    );
  }

  // Determine refund amount (full or partial)
  const refundAmount = amount && amount > 0 ? Math.min(amount, order.total) : order.total;

  // Call Kashier refund API
  logger.info('[Kashier Refund] Initiating refund', {
    orderId: order.id,
    transactionId: order.payment_transaction_id,
    amount: refundAmount,
    adminId: user.id,
  });

  const refundResult = await refundKashierPayment({
    transactionId: order.payment_transaction_id,
    orderId: order.id,
    amount: refundAmount,
  });

  if (!refundResult.success) {
    logger.error('[Kashier Refund] Kashier API failed', {
      orderId: order.id,
      error: refundResult.error,
    });
    return NextResponse.json(
      { error: `Kashier refund failed: ${refundResult.error}` },
      { status: 502 }
    );
  }

  // Update order status
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'refunded',
      status: 'refunded',
      refund_amount: refundAmount,
      refund_transaction_id: refundResult.refundId,
      refunded_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('payment_status', 'paid'); // Idempotent: only update if still paid

  if (updateError) {
    logger.error('[Kashier Refund] Failed to update order after refund', {
      orderId: order.id,
      error: updateError,
    });
    // Refund was sent to Kashier but DB update failed - log for manual reconciliation
    return NextResponse.json(
      {
        error: 'Refund processed at Kashier but failed to update order. Check logs.',
        refundId: refundResult.refundId,
      },
      { status: 500 }
    );
  }

  // Notify customer
  await supabaseAdmin.from('customer_notifications').insert({
    customer_id: order.customer_id,
    type: 'refund_processed',
    title_ar: 'تم استرجاع المبلغ',
    title_en: 'Refund Processed',
    body_ar: `تم استرجاع مبلغ ${refundAmount} جنيه إلى حسابك. قد يستغرق الأمر 5-14 يوم عمل.`,
    body_en: `A refund of ${refundAmount} EGP has been processed. It may take 5-14 business days.`,
    related_order_id: order.id,
  });

  logger.info('[Kashier Refund] Refund completed', {
    orderId: order.id,
    refundId: refundResult.refundId,
    amount: refundAmount,
  });

  return NextResponse.json({
    success: true,
    orderId: order.id,
    refundId: refundResult.refundId,
    amount: refundAmount,
  });
});
