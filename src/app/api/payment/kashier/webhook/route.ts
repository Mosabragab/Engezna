import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  validateKashierSignature,
  parseKashierCallback,
  KASHIER_PAYMENT_STATUS,
} from '@/lib/payment/kashier';
import { logger } from '@/lib/logger';

/**
 * Kashier Webhook Handler
 * Receives payment notifications from Kashier and updates order status
 *
 * This endpoint is called by Kashier after payment processing
 * It validates the signature to prevent fake payment notifications
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    logger.info('[Kashier Webhook] Received callback');

    // Extract callback data
    const callbackData = parseKashierCallback(body);
    const { paymentStatus, orderId, transactionId, signature } = callbackData;

    if (!orderId) {
      logger.warn('[Kashier Webhook] Missing order ID');
      return NextResponse.json({ success: false, error: 'Missing order ID' }, { status: 400 });
    }

    // SECURITY: Signature validation is MANDATORY
    // Reject any webhook without a valid signature to prevent forged callbacks
    if (!signature) {
      logger.warn('[Kashier Webhook] Rejected: no signature provided', { orderId });
      return NextResponse.json({ success: false, error: 'Missing signature' }, { status: 403 });
    }

    const isValid = validateKashierSignature(body, signature);
    if (!isValid) {
      logger.warn('[Kashier Webhook] Rejected: invalid signature', { orderId });
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createAdminClient();

    // Fetch the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, payment_status, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logger.warn('[Kashier Webhook] Order not found', { orderId });
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Idempotency: Don't process if already paid (handles duplicate webhooks)
    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: true, message: 'Order already paid' });
    }

    // Update order based on payment status
    let newPaymentStatus: string;
    let notificationMessage: string;
    let notificationType: string;

    switch (paymentStatus) {
      case KASHIER_PAYMENT_STATUS.SUCCESS:
        newPaymentStatus = 'paid';
        notificationMessage = 'تم استلام الدفع بنجاح! طلبك قيد التجهيز الآن.';
        notificationType = 'payment_success';
        break;

      case KASHIER_PAYMENT_STATUS.PENDING:
        newPaymentStatus = 'pending';
        notificationMessage = 'جاري معالجة الدفع...';
        notificationType = 'payment_pending';
        break;

      case KASHIER_PAYMENT_STATUS.FAILED:
      case KASHIER_PAYMENT_STATUS.CANCELLED:
      default:
        newPaymentStatus = 'failed';
        notificationMessage = 'فشل الدفع. يرجى المحاولة مرة أخرى أو اختيار طريقة دفع أخرى.';
        notificationType = 'payment_failed';
        break;
    }

    // Update order payment status
    const updateData: Record<string, unknown> = {
      payment_status: newPaymentStatus,
      payment_completed_at: newPaymentStatus === 'paid' ? new Date().toISOString() : null,
    };

    // CRITICAL: When payment succeeds, change order status from 'pending_payment' to 'pending'
    // This makes the order visible to the merchant
    if (newPaymentStatus === 'paid') {
      updateData.status = 'pending';
    }

    // Store transaction ID if available
    if (transactionId) {
      updateData.payment_transaction_id = transactionId;
    }

    // Store full payment response for auditing
    updateData.payment_response = body;

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      logger.error('[Kashier Webhook] Failed to update order', { orderId, error: updateError });
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      );
    }

    // Send notification to customer
    await supabaseAdmin.from('customer_notifications').insert({
      user_id: order.customer_id,
      type: notificationType,
      title: newPaymentStatus === 'paid' ? 'تم الدفع بنجاح' : 'تحديث حالة الدفع',
      message: notificationMessage,
      data: {
        order_id: orderId,
        payment_status: newPaymentStatus,
        transaction_id: transactionId,
      },
    });

    logger.info('[Kashier Webhook] Order updated', { orderId, paymentStatus: newPaymentStatus });

    return NextResponse.json({
      success: true,
      orderId,
      paymentStatus: newPaymentStatus,
    });
  } catch (error) {
    logger.error('[Kashier Webhook] Processing failed', { error });
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Also handle GET requests (some payment gateways use GET for callbacks)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Convert to POST handling
  const fakeRequest = {
    json: async () => params,
  } as NextRequest;

  return POST(fakeRequest);
}
