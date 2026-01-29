/**
 * Custom Orders Expiration Cron Job
 *
 * This endpoint is triggered periodically to expire priced custom orders
 * that haven't been approved by customers within 24 hours.
 *
 * Security: Protected by CRON_SECRET header verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

// Hours after which a priced order expires if not approved
const EXPIRATION_HOURS = 24;

// ═══════════════════════════════════════════════════════════════════════════════
// Security Middleware
// ═══════════════════════════════════════════════════════════════════════════════

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('[Cron:ExpireCustomOrders] CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Create admin Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate expiration threshold
    const expirationThreshold = new Date();
    expirationThreshold.setHours(expirationThreshold.getHours() - EXPIRATION_HOURS);

    // Find and expire old priced orders
    const { data: expiredOrders, error: selectError } = await supabase
      .from('custom_order_requests')
      .select('id, customer_id, provider_id')
      .eq('status', 'priced')
      .lt('priced_at', expirationThreshold.toISOString());

    if (selectError) {
      console.error('[Cron:ExpireCustomOrders] Error selecting orders:', selectError);
      return NextResponse.json(
        { error: 'Database error', details: selectError.message },
        { status: 500 }
      );
    }

    const ordersToExpire = expiredOrders || [];
    let expiredCount = 0;
    const errors: string[] = [];

    // Update each order to expired status
    for (const order of ordersToExpire) {
      const { error: updateError } = await supabase
        .from('custom_order_requests')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) {
        errors.push(`Order ${order.id}: ${updateError.message}`);
      } else {
        expiredCount++;

        // Optionally notify customer that their order expired
        // This could be done via a notification insert
        try {
          await supabase.from('notifications').insert({
            user_id: order.customer_id,
            type: 'custom_order_expired',
            title_ar: 'انتهت صلاحية طلبك الخاص',
            title_en: 'Your custom order has expired',
            body_ar: 'انتهت صلاحية عرض السعر لطلبك الخاص. يمكنك إنشاء طلب جديد.',
            body_en:
              'The price quote for your custom order has expired. You can create a new order.',
            data: { custom_order_id: order.id },
            is_read: false,
          });
        } catch {
          // Notification failure shouldn't stop the process
        }
      }
    }

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      expirationThreshold: expirationThreshold.toISOString(),
      totalFound: ordersToExpire.length,
      expiredCount,
      errors: errors.length > 0 ? errors : undefined,
      executionTimeMs: executionTime,
    });
  } catch (error) {
    console.error('[Cron:ExpireCustomOrders] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Disable body parsing for cron routes
export const dynamic = 'force-dynamic';
