/**
 * GET /api/mega-referrer/leaderboard
 *
 * Returns the 10 Mega Referrer slots (filled + empty) for the public
 * leaderboard. Authenticated only (per v2.5.2 decision — no anonymous
 * access until a marketing landing page is built).
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §4.2 (v2.5.2)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MegaReferrerService } from '@/lib/mega-referrer';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new MegaReferrerService(supabase);
    const leaderboard = await service.getLeaderboard();

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('[mega-referrer/leaderboard] failed:', error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
