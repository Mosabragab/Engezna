/**
 * POST /api/gifts/use
 *
 * Marks a granted/opened gift entry as 'used' and links it to an order.
 * Called from the checkout page after a successful order creation when
 * the gift's discount has been folded into the order's `discount` total.
 *
 * Body: { giftEntryId: string, orderId: string }
 *
 * Auth: caller must be authenticated. The underlying SQL RPC
 * (use_gift_atomic) verifies the entry belongs to the caller before
 * mutating, so even a tampered body cannot use another user's gift.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.1.5 (v2.5.2)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGiftEngine } from '@/lib/gifts';

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
      giftEntryId?: unknown;
      orderId?: unknown;
    };

    if (typeof body.giftEntryId !== 'string' || !body.giftEntryId) {
      return NextResponse.json({ error: 'Invalid giftEntryId' }, { status: 400 });
    }
    if (typeof body.orderId !== 'string' || !body.orderId) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
    }

    const engine = createGiftEngine(supabase);
    const result = await engine.useGift({
      userId: user.id,
      giftEntryId: body.giftEntryId,
      orderId: body.orderId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/gifts/use]', error);
    return NextResponse.json({ error: 'Failed to use gift' }, { status: 500 });
  }
}
