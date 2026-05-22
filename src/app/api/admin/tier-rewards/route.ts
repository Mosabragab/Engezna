/**
 * GET /api/admin/tier-rewards
 *
 * Returns all tier_rewards config rows (Bronze/Silver/Gold/Platinum).
 * Admin-only.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §6.1.A (v2.5.2)
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { TierRewardsService } from '@/lib/tier-rewards';

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

  // v2.5.2 fix: distinguish DB errors from "no admin row".
  // Without capturing `error`, a transient query failure silently maps to
  // 403 Forbidden — a misleading response that hides outages.
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

    const service = new TierRewardsService(getAdminSupabase());
    const tiers = await service.getAllConfig();

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error('[/api/admin/tier-rewards GET]', error);
    return NextResponse.json({ error: 'Failed to load tier config' }, { status: 500 });
  }
}
