/**
 * Settlement Overdue Check - Cron Job
 *
 * Runs daily to check for overdue settlements and:
 * 1. Updates their status to 'overdue'
 * 2. Sends overdue notification emails to providers
 *
 * Security: Protected by CRON_SECRET header verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSettlementOverdueEmail } from '@/lib/email/resend';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface OverdueResult {
  success: boolean;
  timestamp: string;
  overdueFound: number;
  emailsSent: number;
  statusUpdated: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Security
// ═══════════════════════════════════════════════════════════════════════════════

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Overdue Cron] CRON_SECRET not set - allowing in development mode');
      return true;
    }
    console.error('[Overdue Cron] CRON_SECRET not configured');
    return false;
  }

  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[Overdue Cron] Invalid authorization header format');
    return false;
  }

  const token = authHeader.substring(7);
  return token === cronSecret;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Overdue Processing
// ═══════════════════════════════════════════════════════════════════════════════

async function processOverdueSettlements(): Promise<OverdueResult> {
  const errors: string[] = [];
  let emailsSent = 0;
  let statusUpdated = 0;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      overdueFound: 0,
      emailsSent: 0,
      statusUpdated: 0,
      errors: ['Missing Supabase configuration'],
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    // Find pending settlements that are past their due date
    const now = new Date().toISOString();
    const { data: overdueSettlements, error: fetchError } = await supabase
      .from('settlements')
      .select(
        `
        id,
        provider_id,
        period_start,
        period_end,
        net_amount_due,
        net_balance,
        platform_commission,
        gross_revenue,
        total_orders,
        status,
        created_at,
        provider:providers(id, name_ar, name_en, email)
      `
      )
      .eq('status', 'pending')
      .lt('period_end', now);

    if (fetchError) {
      errors.push(`Failed to fetch settlements: ${fetchError.message}`);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        overdueFound: 0,
        emailsSent: 0,
        statusUpdated: 0,
        errors,
      };
    }

    if (!overdueSettlements || overdueSettlements.length === 0) {
      return {
        success: true,
        timestamp: new Date().toISOString(),
        overdueFound: 0,
        emailsSent: 0,
        statusUpdated: 0,
        errors: [],
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.engezna.com';

    for (const settlement of overdueSettlements) {
      try {
        // Calculate overdue days
        const periodEnd = new Date(settlement.period_end);
        const overdueDays = Math.ceil((Date.now() - periodEnd.getTime()) / (1000 * 60 * 60 * 24));

        // Skip if less than 1 day overdue (grace window)
        if (overdueDays < 1) continue;

        // Update status to overdue
        const { error: updateError } = await supabase
          .from('settlements')
          .update({
            status: 'overdue',
            updated_at: new Date().toISOString(),
          })
          .eq('id', settlement.id)
          .eq('status', 'pending'); // Only update if still pending (prevent race conditions)

        if (updateError) {
          errors.push(`Failed to update settlement ${settlement.id}: ${updateError.message}`);
          continue;
        }

        statusUpdated++;

        // Send overdue email
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = settlement.provider as any;
        const providerEmail = provider?.email;

        if (providerEmail) {
          try {
            const periodStr = `${new Date(settlement.period_start).toLocaleDateString('ar-EG')} - ${new Date(settlement.period_end).toLocaleDateString('ar-EG')}`;

            await sendSettlementOverdueEmail({
              to: providerEmail,
              merchantName: provider?.name_ar || 'التاجر',
              storeName: provider?.name_ar || 'المتجر',
              settlementId: settlement.id,
              amountDue: Math.abs(settlement.net_balance || settlement.platform_commission || 0),
              overdueDays,
              period: periodStr,
              dashboardUrl: `${siteUrl}/ar/provider/dashboard/settlements`,
            });

            emailsSent++;
            console.log(
              `[Overdue Cron] Email sent to ${providerEmail} for settlement ${settlement.id} (${overdueDays} days overdue)`
            );
          } catch (emailErr) {
            console.error(
              `[Overdue Cron] Failed to send email for settlement ${settlement.id}:`,
              emailErr
            );
            errors.push(`Email failed for ${settlement.id}: ${emailErr}`);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Error processing settlement ${settlement.id}: ${message}`);
      }
    }

    return {
      success: errors.length === 0,
      timestamp: new Date().toISOString(),
      overdueFound: overdueSettlements.length,
      emailsSent,
      statusUpdated,
      errors,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      success: false,
      timestamp: new Date().toISOString(),
      overdueFound: 0,
      emailsSent: 0,
      statusUpdated: 0,
      errors: [message],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Route Handlers
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest): Promise<NextResponse<OverdueResult>> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        overdueFound: 0,
        emailsSent: 0,
        statusUpdated: 0,
        errors: ['Unauthorized: Invalid or missing CRON_SECRET'],
      },
      { status: 401 }
    );
  }

  console.log('[Overdue Cron] Starting overdue settlement check...');

  const result = await processOverdueSettlements();

  if (result.success) {
    console.log(
      `[Overdue Cron] Completed: ${result.overdueFound} overdue found, ${result.statusUpdated} updated, ${result.emailsSent} emails sent`
    );
  } else {
    console.error('[Overdue Cron] Failed with errors:', result.errors);
  }

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse<OverdueResult>> {
  return GET(request);
}
