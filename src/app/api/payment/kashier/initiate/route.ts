import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { buildKashierCheckoutUrl, kashierConfig } from '@/lib/payment/kashier';
import { withErrorHandler } from '@/lib/api/error-handler';
import { validateBody } from '@/lib/api/validate';
import { uuidSchema, priceSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';

const cartItemSchema = z.object({
  item_id: uuidSchema,
  item_name_ar: z.string().min(1),
  item_name_en: z.string().min(1),
  quantity: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  total_price: z.number().nonnegative(),
  variant_id: z.string().uuid().nullable().optional(),
  variant_name_ar: z.string().nullable().optional(),
  variant_name_en: z.string().nullable().optional(),
});

const initiatePaymentSchema = z.object({
  orderData: z.object({
    provider_id: uuidSchema,
    customer_id: uuidSchema,
    subtotal: z.number().nonnegative(),
    delivery_fee: z.number().nonnegative(),
    discount: z.number().nonnegative().default(0),
    total: priceSchema,
    order_type: z.string().min(1),
    delivery_timing: z.string().optional(),
    scheduled_time: z.string().nullable().optional(),
    delivery_address: z.any().optional(),
    customer_notes: z.string().nullable().optional(),
    estimated_delivery_time: z.string().nullable().optional(),
    promo_code: z.string().nullable().optional(),
    promo_code_id: z.string().uuid().nullable().optional(),
    promo_code_usage_count: z.number().int().nonnegative().nullable().optional(),
    provider_name: z.string().optional(),
    cart_items: z.array(cartItemSchema).min(1, 'At least one cart item is required'),
  }),
});

/**
 * Payment Initiation API
 *
 * CRITICAL: This API creates the order in database with 'pending_payment' status
 * BEFORE redirecting the user to Kashier. This prevents "phantom orders" where
 * payment succeeds but the order is lost because the user closed their browser.
 *
 * Flow:
 * 1. Receive order data from checkout
 * 2. Create order in DB with status='pending_payment', payment_status='pending'
 * 3. Create order items
 * 4. Handle promo code usage
 * 5. Generate Kashier checkout URL with real order ID
 * 6. Return checkout URL to client
 *
 * After payment:
 * - Webhook updates order: status='pending', payment_status='paid'
 * - Payment-result page confirms status and redirects
 * - Cron job cancels pending_payment orders after 30 minutes
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderData } = await validateBody(request, initiatePaymentSchema);

  // Verify the user matches the order data
  if (orderData.customer_id !== user.id) {
    return NextResponse.json({ error: 'Customer ID mismatch' }, { status: 403 });
  }

  // Handle promo code atomically (same pattern as COD flow)
  let promoUsageId: string | null = null;
  if (orderData.promo_code_id && orderData.discount > 0) {
    // Atomically increment usage count (optimistic lock)
    const { error: countError } = await supabase
      .from('promo_codes')
      .update({ usage_count: (orderData.promo_code_usage_count ?? 0) + 1 })
      .eq('id', orderData.promo_code_id)
      .eq('usage_count', orderData.promo_code_usage_count ?? 0);

    if (countError) {
      return NextResponse.json(
        { error: 'Promo code was just used by someone else. Please try again.' },
        { status: 409 }
      );
    }

    // Record usage (order_id will be updated after order creation)
    const { data: usageRecord, error: usageError } = await supabase
      .from('promo_code_usage')
      .insert({
        promo_code_id: orderData.promo_code_id,
        user_id: user.id,
        order_id: null,
        discount_amount: orderData.discount,
      })
      .select('id')
      .single();

    if (usageError) {
      // Rollback usage count
      await supabase
        .from('promo_codes')
        .update({ usage_count: orderData.promo_code_usage_count ?? 0 })
        .eq('id', orderData.promo_code_id);
      return NextResponse.json({ error: 'Failed to record promo code usage' }, { status: 500 });
    }
    promoUsageId = usageRecord?.id || null;
  }

  // CREATE ORDER IN DATABASE with pending_payment status
  // This ensures the order exists BEFORE the user is redirected to Kashier
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      provider_id: orderData.provider_id,
      status: 'pending_payment', // Not visible to merchant yet
      subtotal: orderData.subtotal,
      delivery_fee: orderData.delivery_fee,
      discount: orderData.discount,
      total: orderData.total,
      payment_method: 'online',
      payment_status: 'pending',
      order_type: orderData.order_type,
      delivery_timing: orderData.delivery_timing,
      scheduled_time: orderData.scheduled_time,
      delivery_address: orderData.delivery_address,
      customer_notes: orderData.customer_notes,
      estimated_delivery_time: orderData.estimated_delivery_time,
      promo_code: orderData.promo_code,
    })
    .select()
    .single();

  if (orderError) {
    logger.error('[Payment Initiate] Order creation failed', { error: orderError });
    // Rollback promo if order creation fails
    if (promoUsageId) {
      await supabase.from('promo_code_usage').delete().eq('id', promoUsageId);
      if (orderData.promo_code_id) {
        await supabase
          .from('promo_codes')
          .update({ usage_count: orderData.promo_code_usage_count ?? 0 })
          .eq('id', orderData.promo_code_id);
      }
    }
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }

  // Link promo usage to order
  if (promoUsageId && order?.id) {
    await supabase.from('promo_code_usage').update({ order_id: order.id }).eq('id', promoUsageId);
  }

  // Create order items
  if (orderData.cart_items?.length > 0) {
    const orderItems = orderData.cart_items.map(
      (item: {
        item_id: string;
        item_name_ar: string;
        item_name_en: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        variant_id?: string | null;
        variant_name_ar?: string | null;
        variant_name_en?: string | null;
      }) => ({
        order_id: order.id,
        menu_item_id: item.item_id,
        item_name_ar: item.item_name_ar,
        item_name_en: item.item_name_en,
        quantity: item.quantity,
        item_price: item.unit_price,
        unit_price: item.unit_price,
        total_price: item.total_price,
        variant_id: item.variant_id || null,
        variant_name_ar: item.variant_name_ar || null,
        variant_name_en: item.variant_name_en || null,
      })
    );

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      logger.error('[Payment Initiate] Order items creation failed', {
        orderId: order.id,
        error: itemsError,
      });
    }
  }

  // Get customer profile for payment form
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single();

  // Build site URL for redirects
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';
  const locale = 'ar';

  // Generate Kashier checkout URL with REAL order ID
  const checkoutUrl = buildKashierCheckoutUrl({
    orderId: order.id,
    amount: orderData.total,
    customerName: profile?.full_name || undefined,
    customerEmail: user.email || undefined,
    customerPhone: profile?.phone || undefined,
    description: `Order from ${orderData.provider_name || 'Engezna'}`,
    redirectUrl: `${siteUrl}/${locale}/payment-result?orderId=${order.id}`,
    webhookUrl: `${siteUrl}/api/payment/kashier/webhook`,
    language: 'ar',
  });

  logger.info('[Payment Initiate] Order created, redirecting to Kashier', {
    orderId: order.id,
    amount: orderData.total,
  });

  return NextResponse.json({
    success: true,
    checkoutUrl,
    orderId: order.id,
    amount: orderData.total,
    currency: kashierConfig.currency,
  });
});
