/**
 * GET /api/streaks/current
 *
 * Returns the authenticated user's current weekly streak state.
 * Used by the Header StreakIcon + the Rewards Hub StreakSection.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §4.1 (v2.5.2)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StreakService } from '@/lib/streaks';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new StreakService(supabase);
    const streak = await service.get(user.id);

    // Null = user has never qualified — return zeroed defaults so the UI
    // can render an "encouragement" state instead of erroring.
    return NextResponse.json(
      streak ?? {
        userId: user.id,
        currentStreakWeeks: 0,
        longestStreakWeeks: 0,
        lastQualifyingWeek: null,
        streakTier: 'none',
        pointsMultiplier: 1.0,
        totalMilestonesHit: 0,
      }
    );
  } catch (error) {
    console.error('[streaks/current] failed:', error);
    return NextResponse.json({ error: 'Failed to load streak' }, { status: 500 });
  }
}
