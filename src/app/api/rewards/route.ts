import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGiftEngine } from '@/lib/gifts';
import { createLoyaltyService } from '@/lib/loyalty';

/**
 * Combined endpoint for the /rewards hub: a single round-trip returns
 * everything the hub needs to render — gifts, stamp card, loyalty balance,
 * and recent transactions.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const giftEngine = createGiftEngine(supabase);
    const loyaltyService = createLoyaltyService(supabase);

    const [gifts, stampCard, balance, transactions] = await Promise.all([
      giftEngine.getUserGiftBox(user.id),
      giftEngine.getUserStampCard(user.id),
      loyaltyService.getBalance(user.id),
      loyaltyService.getHistory(user.id, 5),
    ]);

    return NextResponse.json({
      gifts,
      stampCard,
      loyalty: { balance, transactions },
    });
  } catch (error) {
    console.error('[/api/rewards]', error);
    return NextResponse.json({ error: 'Failed to load rewards' }, { status: 500 });
  }
}
