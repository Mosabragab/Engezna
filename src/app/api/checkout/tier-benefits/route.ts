/**
 * POST /api/checkout/tier-benefits
 *
 * Computes the tier benefits applicable to the current checkout:
 *   - delivery discount percentage (Silver 20%, Gold 30%, Platinum 0% but free)
 *   - whether the user can use a free delivery for THIS order
 *   - remaining free deliveries this month
 *
 * Body: { subtotalPiasters: number }
 *
 * Auth: authenticated. The SQL function ALSO enforces auth.uid() = p_user_id
 * (see migration 009), so even a bypass at the API layer is safe.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.5.2 + §5 (v2.5.2)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TierRewardsService } from '@/lib/tier-rewards';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      subtotalPiasters?: unknown;
    };

    // v2.5.2 fix: strict validation — refuse coerced values.
    // Number(null) === 0, Number(false) === 0, Number('') === 0 all
    // silently passed through the previous Number(x) coercion.
    const raw = body.subtotalPiasters;
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
      return NextResponse.json({ error: 'Invalid subtotalPiasters' }, { status: 400 });
    }
    const subtotalPiasters = raw;

    const service = new TierRewardsService(supabase);
    const benefits = await service.getBenefitsForCheckout(user.id, subtotalPiasters);

    return NextResponse.json(benefits);
  } catch (error) {
    console.error('[checkout/tier-benefits] failed:', error);
    return NextResponse.json({ error: 'Failed to compute tier benefits' }, { status: 500 });
  }
}
