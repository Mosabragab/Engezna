/**
 * Voice Order Confirmation API Route
 *
 * Handles the confirmation of voice orders.
 *
 * @version 1.1.0 - Added Rate Limiting (Phase 1.1)
 * @version 1.2.0 - Added Zod Validation (Phase 1.3)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  orderCreationLimiter,
  checkRateLimit,
  getClientIdentifier,
  rateLimitErrorResponse,
} from '@/lib/utils/upstash-rate-limit';
import { z } from 'zod';

// =============================================================================
// ZOD VALIDATION SCHEMA
// =============================================================================

const orderItemSchema = z.object({
  productId: z.string().min(1, 'معرف المنتج مطلوب'),
  providerId: z.string().min(1, 'معرف المزود مطلوب'),
  quantity: z
    .number()
    .int('الكمية يجب أن تكون عدد صحيح')
    .min(1, 'الكمية يجب أن تكون 1 على الأقل')
    .max(100, 'الكمية كبيرة جداً'),
  price: z.number().positive('السعر يجب أن يكون موجباً').max(100000, 'السعر كبير جداً'),
  notes: z.string().max(500, 'الملاحظات طويلة جداً').optional(),
});

const voiceOrderConfirmSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, 'يجب إضافة منتج واحد على الأقل')
    .max(50, 'عدد المنتجات كبير جداً'),
  locale: z.enum(['ar', 'en']).optional(),
  customerId: z.string().uuid().optional(),
});

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting Check (20 requests per 5 minutes)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(orderCreationLimiter, identifier);

    if (!rateLimitResult.success) {
      return rateLimitErrorResponse(rateLimitResult);
    }

    // Zod Validation
    const rawBody = await request.json();
    const validationResult = voiceOrderConfirmSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          error_ar: 'خطأ في البيانات المدخلة',
          details: validationResult.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { items, locale } = validationResult.data;

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

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
