import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createReferralService } from '@/lib/referrals';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createReferralService(supabase);
    const [stats, history] = await Promise.all([
      service.getStats(user.id),
      service.getHistory(user.id),
    ]);

    if (!stats) {
      return NextResponse.json({ error: 'Failed to load referral code' }, { status: 500 });
    }

    return NextResponse.json({ stats, history });
  } catch {
    return NextResponse.json({ error: 'Failed to load referral data' }, { status: 500 });
  }
}
