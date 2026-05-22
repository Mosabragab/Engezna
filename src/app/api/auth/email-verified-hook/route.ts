/**
 * POST /api/auth/email-verified-hook
 *
 * Called from the email-verified page after Supabase confirms the address.
 * Grants the Welcome Box (free delivery, 7-day expiry) — idempotent: if the
 * user already has a welcome box, returns granted=false with reason.
 *
 * Auth: caller must be authenticated. The hook respects the auth.uid() — we
 * do NOT trust a userId from the request body.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.1 (v2.5.2)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WelcomeBoxService } from '@/lib/welcome-box';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: 'Email not verified', granted: false }, { status: 400 });
    }

    const service = new WelcomeBoxService(supabase);
    const result = await service.grant(user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[email-verified-hook] failed:', error);
    return NextResponse.json(
      { error: 'Failed to grant welcome box', granted: false },
      { status: 500 }
    );
  }
}
