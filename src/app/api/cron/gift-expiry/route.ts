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
    // 1. Expire overdue gifts
    const { data: overdueGifts } = await supabase
      .from('gift_box_entries')
      .select('id, user_id, cost_piasters, bucket_name, funder_type, funder_provider_id')
      .in('status', ['granted', 'opened'])
      .lt('expires_at', now);

    for (const gift of overdueGifts || []) {
      await supabase.from('gift_box_entries').update({ status: 'expired' }).eq('id', gift.id);

      await supabase.from('gift_financial_log').insert({
        transaction_type: 'expire',
        amount_piasters: gift.cost_piasters,
        bucket: gift.bucket_name,
        funder_type: gift.funder_type,
        funder_provider_id: gift.funder_provider_id,
        user_id: gift.user_id,
        gift_entry_id: gift.id,
        notes: 'Auto-expired by cron',
      });

      expired++;
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
      const giftValue = gift.cost_piasters / 100;

      await supabase.from('customer_notifications').insert({
        customer_id: gift.user_id,
        type: 'gift_expiry',
        title_ar: 'هديتك على وشك الانتهاء!',
        title_en: 'Your gift is expiring soon!',
        body_ar: `هديتك بقيمة ${giftValue} ج.م هتنتهي خلال يومين. استخدمها قبل ما تفوتك!`,
        body_en: `Your ${giftValue} EGP gift expires in 2 days. Use it before it's gone!`,
        data: { gift_entry_id: gift.id, action_url: '/rewards' },
      });

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
