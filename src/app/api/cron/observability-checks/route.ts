import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { dispatchThresholdAlerts, type ThresholdRow } from '@/lib/monitoring/gift-system-alerts';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[Observability] CRON_SECRET missing — bypassing auth in development.');
      return true;
    }
    return false;
  }
  if (!authHeader?.startsWith('Bearer ')) return false;
  return authHeader.substring(7) === cronSecret;
}

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('[Observability] Missing required env vars');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data, error } = await supabase.rpc('observability_check_thresholds');
    if (error) {
      logger.error('[Observability] RPC failed:', error);
      return NextResponse.json({ error: 'RPC failed' }, { status: 500 });
    }

    const rows = (data || []) as ThresholdRow[];
    const dispatched = await dispatchThresholdAlerts(rows);

    logger.info(`[Observability] checked=${rows.length} dispatched=${dispatched}`);
    return NextResponse.json({
      success: true,
      breaches: rows.length,
      dispatched,
      // Include the breach codes (no PII) so the cron's response is useful
      // for debugging without grepping logs
      codes: rows.map((r) => r.code),
    });
  } catch (error) {
    logger.error('[Observability] cron failed:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
