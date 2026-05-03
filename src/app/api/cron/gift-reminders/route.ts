import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('[GiftReminders] CRON_SECRET missing — bypassing auth in development.');
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
    logger.error(
      '[GiftReminders] Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY'
    );
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data, error } = await supabase.rpc('send_gift_expiry_reminders_all');
    if (error) {
      logger.error('[GiftReminders] RPC failed:', error);
      return NextResponse.json({ error: 'RPC failed' }, { status: 500 });
    }
    const sent = Number(data) || 0;
    logger.info(`[GiftReminders] sent=${sent}`);
    return NextResponse.json({ success: true, sent });
  } catch (error) {
    logger.error('[GiftReminders] cron failed:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
