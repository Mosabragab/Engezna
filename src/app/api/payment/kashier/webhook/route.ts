import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  validateKashierSignature,
  parseKashierCallback,
  KASHIER_PAYMENT_STATUS,
} from '@/lib/payment/kashier';

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
    console.log('Kashier webhook received:', JSON.stringify(body, null, 2));

    // Extract callback data
    const callbackData = parseKashierCallback(body);
    const { paymentStatus, orderId, transactionId, signature } = callbackData;

    if (!orderId) {
      console.error('Kashier webhook: Missing order ID');
      return NextResponse.json({ success: false, error: 'Missing order ID' }, { status: 400 });
    }

    // Validate signature if provided
    if (signature) {
      const isValid = validateKashierSignature(body, signature);
      if (!isValid) {
        console.error('Kashier webhook: Invalid signature');
        return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 403 });
      }
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
      console.error('Kashier webhook: Order not found:', orderId);
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Don't process if already paid
    if (order.payment_status === 'paid') {
      console.log('Kashier webhook: Order already paid:', orderId);
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

    // Store full payment response for debugging
    updateData.payment_response = body;

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      console.error('Kashier webhook: Failed to update order:', updateError);
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

    console.log(`Kashier webhook: Order ${orderId} payment status updated to ${newPaymentStatus}`);

    return NextResponse.json({
      success: true,
      orderId,
      paymentStatus: newPaymentStatus,
    });
  } catch (error) {
    console.error('Kashier webhook error:', error);
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
