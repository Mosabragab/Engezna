/**
 * P5: Server-Side Promo Code Validation API
 *
 * POST /api/promo/validate
 * Validates a promo code server-side with all 14+ checks.
 * Returns valid/invalid status, discount amount, and error message.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ValidateRequest {
  code: string;
  user_id: string;
  provider_id: string;
  provider_category?: string;
  subtotal: number;
  governorate_id?: string | null;
  city_id?: string | null;
}

interface ValidateResponse {
  valid: boolean;
  discount_amount?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  promo_code_id?: string;
  error?: string;
  error_code?: string;
}

// Simple in-memory rate limiter (per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest): Promise<NextResponse<ValidateResponse>> {
  // Rate limiting
  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        valid: false,
        error: 'Too many requests. Please try again later.',
        error_code: 'RATE_LIMITED',
      },
      { status: 429 }
    );
  }

  // Parse request body
  let body: ValidateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Invalid request body', error_code: 'INVALID_REQUEST' },
      { status: 400 }
    );
  }

  const { code, user_id, provider_id, provider_category, subtotal, governorate_id, city_id } = body;

  if (!code || !user_id || !provider_id || subtotal === undefined) {
    return NextResponse.json(
      {
        valid: false,
        error: 'Missing required fields: code, user_id, provider_id, subtotal',
        error_code: 'MISSING_FIELDS',
      },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { valid: false, error: 'Server configuration error', error_code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    // Fetch promo code
    const { data: promoCode, error: fetchError } = await supabase
      .from('promo_codes')
      .select('*')
      .ilike('code', code.trim().toUpperCase())
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { valid: false, error: 'Database error', error_code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    if (!promoCode) {
      return NextResponse.json({
        valid: false,
        error: 'Promo code not found',
        error_code: 'NOT_FOUND',
      });
    }

    // Check 1: Active
    if (!promoCode.is_active) {
      return NextResponse.json({
        valid: false,
        error: 'This promo code is not active',
        error_code: 'INACTIVE',
      });
    }

    // Check 2-3: Date validity
    const now = new Date();
    if (now < new Date(promoCode.valid_from)) {
      return NextResponse.json({
        valid: false,
        error: 'This promo code is not valid yet',
        error_code: 'NOT_STARTED',
      });
    }
    if (now > new Date(promoCode.valid_until)) {
      return NextResponse.json({
        valid: false,
        error: 'This promo code has expired',
        error_code: 'EXPIRED',
      });
    }

    // Check 4: Min order amount
    if (subtotal < promoCode.min_order_amount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount: ${promoCode.min_order_amount} EGP`,
        error_code: 'MIN_ORDER',
      });
    }

    // Check 5: Usage limit
    if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
      return NextResponse.json({
        valid: false,
        error: 'This promo code has reached its usage limit',
        error_code: 'USAGE_LIMIT',
      });
    }

    // Check 6: Per-user limit
    const { count: userUsageCount } = await supabase
      .from('promo_code_usage')
      .select('*', { count: 'exact', head: true })
      .eq('promo_code_id', promoCode.id)
      .eq('user_id', user_id);

    if (userUsageCount && userUsageCount >= promoCode.per_user_limit) {
      return NextResponse.json({
        valid: false,
        error: 'You have already used this promo code',
        error_code: 'PER_USER_LIMIT',
      });
    }

    // Check 7: First order only
    if (promoCode.first_order_only) {
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', user_id)
        .not('status', 'eq', 'cancelled');

      if (orderCount && orderCount > 0) {
        return NextResponse.json({
          valid: false,
          error: 'This code is valid for first order only',
          error_code: 'FIRST_ORDER_ONLY',
        });
      }
    }

    // Check 8: Applicable categories
    if (promoCode.applicable_categories && promoCode.applicable_categories.length > 0) {
      if (!provider_category || !promoCode.applicable_categories.includes(provider_category)) {
        return NextResponse.json({
          valid: false,
          error: 'This code is not valid for this store type',
          error_code: 'CATEGORY_MISMATCH',
        });
      }
    }

    // Check 9: Applicable providers
    if (promoCode.applicable_providers && promoCode.applicable_providers.length > 0) {
      if (!promoCode.applicable_providers.includes(provider_id)) {
        return NextResponse.json({
          valid: false,
          error: 'This code is not valid for this store',
          error_code: 'PROVIDER_MISMATCH',
        });
      }
    }

    // Check 10: Geo-targeting (P1)
    if (promoCode.governorate_id) {
      if (governorate_id !== promoCode.governorate_id) {
        return NextResponse.json({
          valid: false,
          error: 'This code is not available in your area',
          error_code: 'GEO_GOVERNORATE',
        });
      }
      if (promoCode.city_id && city_id !== promoCode.city_id) {
        return NextResponse.json({
          valid: false,
          error: 'This code is not available in your city',
          error_code: 'GEO_CITY',
        });
      }
    }

    // All checks passed - calculate discount
    let discount = 0;
    if (promoCode.discount_type === 'percentage') {
      discount = (subtotal * promoCode.discount_value) / 100;
      if (promoCode.max_discount_amount && discount > promoCode.max_discount_amount) {
        discount = promoCode.max_discount_amount;
      }
    } else {
      discount = promoCode.discount_value;
    }

    discount = Math.min(discount, subtotal);

    return NextResponse.json({
      valid: true,
      discount_amount: discount,
      discount_type: promoCode.discount_type,
      discount_value: promoCode.discount_value,
      promo_code_id: promoCode.id,
    });
  } catch (err) {
    console.error('[Promo Validate] Error:', err);
    return NextResponse.json(
      { valid: false, error: 'Internal server error', error_code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
