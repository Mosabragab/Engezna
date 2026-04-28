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

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date().toISOString();
  let expired = 0;
  let reminded = 0;

  try {
    // 1. Batch-expire overdue gifts via atomic RPC: single transaction,
    //    conditional UPDATE + financial log inserts for every overdue row.
    const { data: batchCount, error: batchError } = await supabase.rpc(
      'expire_overdue_gifts_batch'
    );
    if (batchError) {
      logger.error('[GiftExpiry] expire_overdue_gifts_batch failed:', batchError);
    } else {
      expired = Number(batchCount) || 0;
    }

    // 2. Send reminders for gifts expiring in 48 hours
    const in48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { data: expiringGifts } = await supabase
      .from('gift_box_entries')
      .select('id, user_id, cost_piasters')
      .in('status', ['granted', 'opened'])
      .gt('expires_at', now)
      .lte('expires_at', in48Hours);

    for (const gift of expiringGifts || []) {
      // Idempotency: skip if a reminder for this gift_entry_id was already sent.
      // Repeat cron runs within the 48h window would otherwise spam the user.
      const { data: existing } = await supabase
        .from('customer_notifications')
        .select('id')
        .eq('customer_id', gift.user_id)
        .eq('type', 'gift_expiry')
        .eq('data->>gift_entry_id', gift.id)
        .limit(1)
        .maybeSingle();

      if (existing) continue;

      const giftValue = gift.cost_piasters / 100;

      const { error: insertError } = await supabase.from('customer_notifications').insert({
        customer_id: gift.user_id,
        type: 'gift_expiry',
        title_ar: 'هديتك على وشك الانتهاء!',
        title_en: 'Your gift is expiring soon!',
        body_ar: `هديتك بقيمة ${giftValue} ج.م هتنتهي خلال يومين. استخدمها قبل ما تفوتك!`,
        body_en: `Your ${giftValue} EGP gift expires in 2 days. Use it before it's gone!`,
        data: { gift_entry_id: gift.id, action_url: '/rewards' },
      });

      if (insertError) {
        logger.error('[GiftExpiry] reminder insert failed:', { id: gift.id, error: insertError });
        continue;
      }

      reminded++;
    }

    logger.info(`[GiftExpiry] Expired: ${expired}, Reminded: ${reminded}`);

    return NextResponse.json({
      success: true,
      timestamp: now,
      expired,
      reminded,
    });
  } catch (error) {
    logger.error('[GiftExpiry] Cron failed:', error);
    return NextResponse.json({ error: 'Gift expiry cron failed' }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
