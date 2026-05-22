/**
 * GET /api/mega-referrer/status
 *
 * Returns the authenticated user's Mega Referrer status (rank, multiplier,
 * referral count). Used by /rewards and /rewards/referrals pages.
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
    const status = await service.getStatus(user.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error('[mega-referrer/status] failed:', error);
    return NextResponse.json({ error: 'Failed to load status' }, { status: 500 });
  }
}
