import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { processOrderCompletion } from '@/lib/orders/completion-hook';

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

const LOOKBACK_HOURS = 24;
const BATCH_SIZE = 50;

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const startedAt = new Date().toISOString();

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Find delivered + paid orders in the lookback window that don't yet
    // have a row in order_completion_processed. We use a left-anti-join
    // pattern: query orders, then batch-check the processed table.
    const { data: candidates, error: candidatesError } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'delivered')
      .eq('payment_status', 'completed')
      .gte('updated_at', since)
      .order('updated_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (candidatesError) {
      logger.error('[OrderCompletion] candidate query failed:', candidatesError);
      return NextResponse.json({ error: 'Candidate query failed' }, { status: 500 });
    }

    const ids = (candidates || []).map((o: { id: string }) => o.id);
    if (ids.length === 0) {
      return NextResponse.json({
        ok: true,
        startedAt,
        processed: 0,
        skipped: 0,
        failed: 0,
        message: 'no candidates',
      });
    }

    const { data: alreadyDone } = await supabase
      .from('order_completion_processed')
      .select('order_id')
      .in('order_id', ids);

    const doneSet = new Set((alreadyDone || []).map((r: { order_id: string }) => r.order_id));

    for (const id of ids) {
      if (doneSet.has(id)) {
        skipped++;
        continue;
      }
      try {
        const result = await processOrderCompletion(supabase, id);
        if (result) {
          processed++;
          if (result.errors.length > 0) {
            logger.warn('[OrderCompletion] partial success', {
              orderId: id,
              errors: result.errors,
            });
          }
        } else {
          // null = already processed (race with another runner)
          skipped++;
        }
      } catch (error) {
        failed++;
        logger.error('[OrderCompletion] order failed:', {
          orderId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      startedAt,
      processed,
      skipped,
      failed,
      candidates: ids.length,
    });
  } catch (error) {
    logger.error('[OrderCompletion] cron failed:', error);
    return NextResponse.json({ error: 'cron failed' }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
