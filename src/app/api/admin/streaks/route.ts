/**
 * GET /api/admin/streaks
 *
 * Returns streak analytics for the admin dashboard:
 *   - count of active users per streak tier
 *   - longest streak ever achieved (+ which user)
 *   - total users with any streak history
 *
 * Admin-only.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §6.1.B (v2.5.2)
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin() {
  const userClient = await createServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 as const };

  const { data: adminRow, error: adminErr } = await userClient
    .from('admin_users')
    .select('id, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (adminErr) {
    console.error('[admin guard] admin_users lookup failed:', adminErr);
    return { error: 'Internal Server Error', status: 500 as const };
  }
  if (!adminRow) return { error: 'Forbidden', status: 403 as const };
  return { admin: adminRow };
}

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ('error' in guard) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const supabase = getAdminSupabase();

    // Aggregate counts per tier (single fetch — small table).
    const { data: rows, error } = await supabase
      .from('customer_streaks')
      .select('user_id, current_streak_weeks, longest_streak_weeks, streak_tier');

    if (error) {
      console.error('[/api/admin/streaks GET]', error);
      return NextResponse.json({ error: 'Failed to load streaks' }, { status: 500 });
    }

    const list = rows ?? [];
    const tierCounts = {
      none: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
    };
    let longest = 0;
    let longestUserId: string | null = null;
    let activeCount = 0;

    for (const r of list) {
      const tier = (r.streak_tier ?? 'none') as keyof typeof tierCounts;
      if (tier in tierCounts) {
        tierCounts[tier] += 1;
      }
      if (r.current_streak_weeks > 0) activeCount += 1;
      if (r.longest_streak_weeks > longest) {
        longest = r.longest_streak_weeks;
        longestUserId = r.user_id;
      }
    }

    return NextResponse.json({
      totalUsersWithStreak: list.length,
      activeCount,
      longestStreakWeeks: longest,
      longestUserId,
      tierCounts,
    });
  } catch (error) {
    console.error('[/api/admin/streaks GET]', error);
    return NextResponse.json({ error: 'Failed to load streaks' }, { status: 500 });
  }
}
