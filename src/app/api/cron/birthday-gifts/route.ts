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

  try {
    const { data, error } = await supabase.rpc('process_birthday_gifts');
    if (error) {
      logger.error('[BirthdayGifts] RPC failed:', error);
      return NextResponse.json({ error: 'RPC failed' }, { status: 500 });
    }
    const row = Array.isArray(data) ? data[0] : data;
    const granted = Number(row?.granted) || 0;
    const attempted = Number(row?.attempted) || 0;
    logger.info(`[BirthdayGifts] granted=${granted} attempted=${attempted}`);
    return NextResponse.json({ success: true, granted, attempted });
  } catch (error) {
    logger.error('[BirthdayGifts] cron failed:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
