/**
 * Settlement Cron Job - API Route (Phase 4.3)
 *
 * This endpoint is triggered daily at midnight (Cairo time) by Vercel Cron
 * to calculate and create settlement records for all providers with
 * unsettled orders from the previous day.
 *
 * Security: Protected by CRON_SECRET header verification
 *
 * @see docs/MASTER_IMPLEMENTATION_PLAN.md - Section 4.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSettlementCreatedEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { withErrorHandler } from '@/lib/api/error-handler';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface ProviderSettlementData {
  providerId: string;
  providerName: string;
  totalOrders: number;
  grossRevenue: number;
  platformCommission: number;
  deliveryFeesCollected: number;
  netAmountDue: number;
}

interface CronJobResult {
  success: boolean;
  timestamp: string;
  periodStart: string;
  periodEnd: string;
  settlementsCreated: number;
  providersProcessed: number;
  errors: string[];
  settlements?: ProviderSettlementData[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Security Middleware
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verify the cron secret to prevent unauthorized access
 * Vercel sends this automatically for cron jobs
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is not set, reject all requests (except in development)
  if (!cronSecret) {
    // Allow in development without secret for testing
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[Cron] CRON_SECRET not set - allowing in development mode');
      return true;
    }
    logger.error('[Cron] CRON_SECRET not configured');
    return false;
  }

  // Check Bearer token format
  if (!authHeader?.startsWith('Bearer ')) {
    logger.error('[Cron] Invalid authorization header format');
    return false;
  }

  const token = authHeader.substring(7);
  return token === cronSecret;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Settlement Processing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get date range for yesterday (Cairo timezone)
 */
function getYesterdayDateRange(): { start: string; end: string } {
  // Cairo is UTC+2
  const now = new Date();
  const cairoOffset = 2 * 60 * 60 * 1000;
  const cairoNow = new Date(now.getTime() + cairoOffset);

  // Yesterday start (00:00:00 Cairo time)
  const yesterdayStart = new Date(cairoNow);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);

  // Yesterday end (23:59:59 Cairo time)
  const yesterdayEnd = new Date(cairoNow);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);

  // Convert back to UTC for database queries
  return {
    start: new Date(yesterdayStart.getTime() - cairoOffset).toISOString(),
    end: new Date(yesterdayEnd.getTime() - cairoOffset).toISOString(),
  };
}

/**
 * Process daily settlements for all providers
 */
async function processDailySettlements(): Promise<CronJobResult> {
  const errors: string[] = [];
  const settlements: ProviderSettlementData[] = [];

  // Defensive: Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      periodStart: '',
      periodEnd: '',
      settlementsCreated: 0,
      providersProcessed: 0,
      errors: ['Missing Supabase configuration'],
    };
  }

  // Create admin client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { start: periodStart, end: periodEnd } = getYesterdayDateRange();

  try {
    // Step 1: Get all completed orders from yesterday that aren't settled
    const { data: unsettledOrders, error: ordersError } = await supabase
      .from('orders')
      .select(
        `
        id,
        provider_id,
        total,
        platform_commission,
        delivery_fee,
        providers!inner (
          id,
          name_ar,
          name_en,
          email
        )
      `
      )
      .eq('status', 'delivered')
      .is('settlement_id', null)
      .gte('delivered_at', periodStart)
      .lte('delivered_at', periodEnd);

    if (ordersError) {
      errors.push(`Failed to fetch orders: ${ordersError.message}`);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        periodStart,
        periodEnd,
        settlementsCreated: 0,
        providersProcessed: 0,
        errors,
      };
    }

    // If no orders to process
    if (!unsettledOrders || unsettledOrders.length === 0) {
      return {
        success: true,
        timestamp: new Date().toISOString(),
        periodStart,
        periodEnd,
        settlementsCreated: 0,
        providersProcessed: 0,
        errors: [],
        settlements: [],
      };
    }

    // Step 2: Group orders by provider
    const providerOrders = new Map<
      string,
      {
        providerName: string;
        providerEmail: string | null;
        orders: typeof unsettledOrders;
      }
    >();

    for (const order of unsettledOrders) {
      const providerId = order.provider_id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const providerData = order.providers as any;

      if (!providerOrders.has(providerId)) {
        providerOrders.set(providerId, {
          providerName: providerData?.name_ar ?? 'Unknown Provider',
          providerEmail: providerData?.email ?? null,
          orders: [],
        });
      }
      providerOrders.get(providerId)?.orders.push(order);
    }

    // Step 3: Create settlement for each provider
    let settlementsCreated = 0;

    for (const [providerId, data] of providerOrders) {
      try {
        // Calculate totals
        const totalOrders = data.orders.length;
        const grossRevenue = data.orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
        const platformCommission = data.orders.reduce(
          (sum, o) => sum + (o.platform_commission ?? 0),
          0
        );
        const deliveryFeesCollected = data.orders.reduce(
          (sum, o) => sum + (o.delivery_fee ?? 0),
          0
        );
        const netAmountDue = grossRevenue - platformCommission;

        // Create settlement record
        const { data: settlement, error: settlementError } = await supabase
          .from('settlements')
          .insert({
            provider_id: providerId,
            period_start: periodStart,
            period_end: periodEnd,
            total_orders: totalOrders,
            gross_revenue: grossRevenue,
            platform_commission: platformCommission,
            delivery_fees_collected: deliveryFeesCollected,
            net_amount_due: netAmountDue,
            status: 'pending',
            created_at: new Date().toISOString(),
            created_by: 'system:cron',
          })
          .select('id')
          .single();

        if (settlementError) {
          errors.push(`Failed to create settlement for ${providerId}: ${settlementError.message}`);
          continue;
        }

        // Update orders with settlement_id
        if (settlement?.id) {
          const orderIds = data.orders.map((o) => o.id);
          const { error: updateError } = await supabase
            .from('orders')
            .update({ settlement_id: settlement.id })
            .in('id', orderIds);

          if (updateError) {
            errors.push(`Failed to link orders for ${providerId}: ${updateError.message}`);
          }
        }

        settlements.push({
          providerId,
          providerName: data.providerName,
          totalOrders,
          grossRevenue,
          platformCommission,
          deliveryFeesCollected,
          netAmountDue,
        });

        settlementsCreated++;

        // Send settlement created email (non-blocking)
        if (data.providerEmail && settlement?.id) {
          try {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';
            const periodStr = `${new Date(periodStart).toLocaleDateString('ar-EG')} - ${new Date(periodEnd).toLocaleDateString('ar-EG')}`;
            const direction =
              platformCommission > 0 ? 'provider_pays_platform' : ('balanced' as const);

            await sendSettlementCreatedEmail({
              to: data.providerEmail,
              merchantName: data.providerName,
              storeName: data.providerName,
              settlementId: settlement.id,
              period: periodStr,
              ordersCount: totalOrders,
              grossRevenue,
              commission: platformCommission,
              netBalance: netAmountDue,
              direction,
              periodEnd,
              dashboardUrl: `${siteUrl}/ar/provider/dashboard/settlements`,
            });
            logger.info(`[Cron] Settlement email sent to ${data.providerEmail} for ${providerId}`);
          } catch (emailErr) {
            // Email failure should not block settlement creation
            logger.error(`[Cron] Failed to send settlement email for ${providerId}`, {
              error: emailErr,
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Error processing provider ${providerId}: ${message}`);
      }
    }

    return {
      success: errors.length === 0,
      timestamp: new Date().toISOString(),
      periodStart,
      periodEnd,
      settlementsCreated,
      providersProcessed: providerOrders.size,
      errors,
      settlements,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      timestamp: new Date().toISOString(),
      periodStart,
      periodEnd,
      settlementsCreated: 0,
      providersProcessed: 0,
      errors: [message],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Route Handlers
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(
  async (request: NextRequest): Promise<NextResponse<CronJobResult>> => {
    // Security check
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        {
          success: false,
          timestamp: new Date().toISOString(),
          periodStart: '',
          periodEnd: '',
          settlementsCreated: 0,
          providersProcessed: 0,
          errors: ['Unauthorized: Invalid or missing CRON_SECRET'],
        },
        { status: 401 }
      );
    }

    logger.info('[Cron] Starting daily settlement processing...');

    const result = await processDailySettlements();

    if (result.success) {
      logger.info(
        `[Cron] Settlement completed: ${result.settlementsCreated} settlements created for ${result.providersProcessed} providers`
      );
    } else {
      logger.error('[Cron] Settlement failed with errors', { error: result.errors });
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  }
);

// POST handler for manual triggering (same logic)
export const POST = withErrorHandler(async (request: NextRequest) => {
  return GET(request);
});
