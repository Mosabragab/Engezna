import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLoyaltyService } from '@/lib/loyalty';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createLoyaltyService(supabase);
    const [balance, history] = await Promise.all([
      service.getBalance(user.id),
      service.getHistory(user.id, 20),
    ]);

    return NextResponse.json({ balance, history });
  } catch {
    return NextResponse.json({ error: 'Failed to load loyalty data' }, { status: 500 });
  }
}
