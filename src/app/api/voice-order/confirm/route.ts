import { NextRequest, NextResponse } from 'next/server';
import {
  orderCreationLimiter,
  checkRateLimit,
  getClientIdentifier,
  rateLimitErrorResponse,
} from '@/lib/utils/upstash-rate-limit';

// This endpoint handles the confirmation of voice orders
// The actual cart state management happens on the client side with Zustand
// This endpoint can be used to log orders, validate items, etc.

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting Check (20 requests per 5 minutes)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(orderCreationLimiter, identifier);

    if (!rateLimitResult.success) {
      return rateLimitErrorResponse(rateLimitResult);
    }

    const body = await request.json();
    const { items, locale } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items to confirm' }, { status: 400 });
    }

    // Validate items structure
    const validItems = items.every(
      (item: Record<string, unknown>) =>
        item.productId &&
        item.providerId &&
        typeof item.quantity === 'number' &&
        typeof item.price === 'number'
    );

    if (!validItems) {
      return NextResponse.json({ error: 'Invalid item structure' }, { status: 400 });
    }

    // Calculate total
    const total = items.reduce(
      (sum: number, item: { quantity: number; price: number }) => sum + item.quantity * item.price,
      0
    );

    // Here you could:
    // 1. Log the order for analytics
    // 2. Validate prices against database
    // 3. Check item availability
    // 4. Apply any promotions

    return NextResponse.json({
      success: true,
      itemCount: items.length,
      total,
      message: locale === 'ar' ? 'تم تأكيد الطلب بنجاح' : 'Order confirmed successfully',
    });
  } catch (error) {
    console.error('Error in confirm route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
