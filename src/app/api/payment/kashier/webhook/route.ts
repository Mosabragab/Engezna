import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  validateKashierSignature,
  parseKashierCallback,
  KASHIER_PAYMENT_STATUS,
} from '@/lib/payment/kashier';
import { withErrorHandler } from '@/lib/api/error-handler';
import { validateBody } from '@/lib/api/validate';
import { logger } from '@/lib/logger';

const webhookSchema = z
  .object({
    orderId: z.string().optional(),
    transactionId: z.string().optional(),
    paymentStatus: z.string().optional(),
    signature: z.string().optional(),
    // Kashier fields may come under various names; parseKashierCallback handles mapping
    merchantOrderId: z.string().optional(),
    order: z.any().optional(),
    data: z.any().optional(),
  })
  .passthrough();

/**
 * Kashier Webhook Handler
 * Receives payment notifications from Kashier and updates order status
 *
 * This endpoint is called by Kashier after payment processing
 * It validates the signature to prevent fake payment notifications
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Parse and validate request body
  const body = await validateBody(request, webhookSchema);
  logger.info('[Kashier Webhook] Received callback');

  // Extract callback data
  const callbackData = parseKashierCallback(body as Record<string, string>);
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

  const isValid = validateKashierSignature(body as Record<string, string>, signature);
  if (!isValid) {
    logger.warn('[Kashier Webhook] Rejected: invalid signature', { orderId });
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 403 });
  }

  // Use admin client to bypass RLS
  const supabaseAdmin = createAdminClient();

  // Fetch the order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, customer_id, payment_status, payment_transaction_id, status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    logger.warn('[Kashier Webhook] Order not found', { orderId });
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  }

  // Idempotency: Skip if already in a terminal payment state
  if (order.payment_status === 'paid' || order.payment_status === 'failed') {
    logger.info('[Kashier Webhook] Skipped: already processed', {
      orderId,
      existingStatus: order.payment_status,
      incomingStatus: paymentStatus,
      transactionId,
    });
    return NextResponse.json({
      success: true,
      message: `Order already ${order.payment_status}`,
    });
  }

  // Idempotency: Skip if order is already cancelled (e.g., by cron or payment-result page)
  if (order.status === 'cancelled') {
    logger.info('[Kashier Webhook] Skipped: order already cancelled', {
      orderId,
      transactionId,
    });
    return NextResponse.json({ success: true, message: 'Order already cancelled' });
  }

  // Duplicate transaction check: if same transactionId already stored, skip
  if (
    transactionId &&
    order.payment_transaction_id &&
    order.payment_transaction_id === transactionId
  ) {
    logger.info('[Kashier Webhook] Skipped: duplicate transactionId', {
      orderId,
      transactionId,
    });
    return NextResponse.json({ success: true, message: 'Duplicate webhook' });
  }

  // Determine new payment status
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

  // Build update data
  const updateData: Record<string, unknown> = {
    payment_status: newPaymentStatus,
    payment_completed_at: newPaymentStatus === 'paid' ? new Date().toISOString() : null,
    payment_response: body,
  };

  // CRITICAL: When payment succeeds, change order status from 'pending_payment' to 'pending'
  // This makes the order visible to the merchant
  if (newPaymentStatus === 'paid') {
    updateData.status = 'pending';
  }

  // When payment fails, cancel the order
  if (newPaymentStatus === 'failed') {
    updateData.status = 'cancelled';
    updateData.cancelled_at = new Date().toISOString();
  }

  // Store transaction ID if available
  if (transactionId) {
    updateData.payment_transaction_id = transactionId;
  }

  // Idempotent update: only update if order is still in pending_payment status
  // This prevents race conditions with payment-result page and cron job
  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .eq('status', 'pending_payment')
    .select('id');

  if (updateError) {
    logger.error('[Kashier Webhook] Failed to update order', { orderId, error: updateError });
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 });
  }

  // If no rows updated, the order was already processed by another path
  if (!updatedRows || updatedRows.length === 0) {
    logger.info('[Kashier Webhook] No update needed (already processed by another path)', {
      orderId,
      transactionId,
    });
    return NextResponse.json({ success: true, message: 'Order already processed' });
  }

  // Send notification to customer
  await supabaseAdmin.from('customer_notifications').insert({
    customer_id: order.customer_id,
    type: notificationType,
    title_ar: newPaymentStatus === 'paid' ? 'تم الدفع بنجاح' : 'تحديث حالة الدفع',
    title_en: newPaymentStatus === 'paid' ? 'Payment Successful' : 'Payment Status Update',
    body_ar: notificationMessage,
    body_en:
      newPaymentStatus === 'paid'
        ? 'Payment received successfully! Your order is being prepared.'
        : newPaymentStatus === 'pending'
          ? 'Processing payment...'
          : 'Payment failed. Please try again or choose a different payment method.',
    related_order_id: orderId,
  });

  logger.info('[Kashier Webhook] Order updated successfully', {
    orderId,
    paymentStatus: newPaymentStatus,
    transactionId,
  });

  return NextResponse.json({
    success: true,
    orderId,
    paymentStatus: newPaymentStatus,
  });
});

// Also handle GET requests (some payment gateways use GET for callbacks)
export const GET = withErrorHandler(async (request: NextRequest) => {
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
});
