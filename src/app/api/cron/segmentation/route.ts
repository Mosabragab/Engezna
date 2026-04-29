import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }

  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.substring(7) === cronSecret;
}

interface OrderStats {
  customer_id: string;
  total_orders: number;
  total_spent: number;
  avg_order_value: number;
  days_since_last_order: number;
  discount_usage_rate: number;
  unique_providers: number;
  avg_rating: number;
  account_age_days: number;
}

function classifySegment(stats: OrderStats): string {
  if (stats.total_orders === 0 || stats.account_age_days < 7) return 'new_user';
  if (stats.days_since_last_order >= 30) return 'churned';
  if (stats.days_since_last_order >= 14) return 'at_risk';
  if (stats.total_orders >= 10 && stats.avg_rating >= 4) return 'champion';
  if (stats.avg_order_value >= 25000) return 'high_value';
  if (stats.discount_usage_rate >= 0.6) return 'bargain_hunter';
  if (stats.total_orders >= 3) return 'regular';
  return 'undefined';
}

function determineLoyaltyTier(lifetimePoints: number): string {
  if (lifetimePoints >= 5000) return 'platinum';
  if (lifetimePoints >= 1500) return 'gold';
  if (lifetimePoints >= 500) return 'silver';
  return 'bronze';
}

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split('T')[0];

  try {
    const { data: customers, error: customerError } = await supabase
      .from('profiles')
      .select('id, created_at')
      .eq('role', 'customer')
      .eq('is_active', true);

    if (customerError) throw customerError;
    if (!customers || customers.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processed = 0;
    const batchSize = 50;

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);

      const segmentRows = [];
      const profileUpdates = [];

      for (const customer of batch) {
        const { data: orders } = await supabase
          .from('orders')
          .select('subtotal, discount, created_at, provider_id, status')
          .eq('customer_id', customer.id)
          .eq('status', 'delivered');

        const orderList = orders || [];
        const totalOrders = orderList.length;
        const totalSpent = orderList.reduce(
          (s: number, o: { subtotal: number }) => s + (o.subtotal || 0),
          0
        );

        let daysSinceLastOrder = 9999;
        if (orderList.length > 0) {
          const sorted = [...orderList].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          daysSinceLastOrder = Math.floor(
            (Date.now() - new Date(sorted[0].created_at).getTime()) / 86400000
          );
        }

        const discountedOrders = orderList.filter(
          (o: { discount: number }) => (o.discount || 0) > 0
        ).length;

        const uniqueProviders = new Set(
          orderList.map((o: { provider_id: string }) => o.provider_id)
        ).size;

        const accountAgeDays = Math.floor(
          (Date.now() - new Date(customer.created_at).getTime()) / 86400000
        );

        const stats: OrderStats = {
          customer_id: customer.id,
          total_orders: totalOrders,
          total_spent: totalSpent,
          avg_order_value: totalOrders > 0 ? totalSpent / totalOrders : 0,
          days_since_last_order: daysSinceLastOrder,
          discount_usage_rate: totalOrders > 0 ? discountedOrders / totalOrders : 0,
          unique_providers: uniqueProviders,
          avg_rating: 0,
          account_age_days: accountAgeDays,
        };

        const segment = classifySegment(stats);

        segmentRows.push({
          user_id: customer.id,
          snapshot_date: today,
          segment,
          facts: {
            total_orders: stats.total_orders,
            total_spent: stats.total_spent,
            avg_order_value: stats.avg_order_value,
            days_since_last_order: stats.days_since_last_order,
            discount_usage_rate: stats.discount_usage_rate,
            unique_providers: stats.unique_providers,
            account_age_days: stats.account_age_days,
          },
        });

        const { data: loyaltyData } = await supabase
          .from('loyalty_points')
          .select('lifetime_points')
          .eq('user_id', customer.id)
          .single();

        const tier = determineLoyaltyTier(loyaltyData?.lifetime_points || 0);

        profileUpdates.push({
          id: customer.id,
          last_segment: segment,
          loyalty_tier: tier,
        });
      }

      if (segmentRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('customer_segments_daily')
          .upsert(segmentRows, { onConflict: 'user_id,snapshot_date' });

        if (upsertError) {
          logger.error('[Segmentation] Upsert error:', upsertError);
        }
      }

      for (const update of profileUpdates) {
        await supabase
          .from('profiles')
          .update({ last_segment: update.last_segment, loyalty_tier: update.loyalty_tier })
          .eq('id', update.id);
      }

      processed += batch.length;
    }

    logger.info(`[Segmentation] Processed ${processed} customers for ${today}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      date: today,
      processed,
    });
  } catch (error) {
    logger.error('[Segmentation] Cron failed:', error);
    return NextResponse.json(
      { error: 'Segmentation failed', details: String(error) },
      { status: 500 }
    );
  }
}

export const GET = handler;
export const POST = handler;
