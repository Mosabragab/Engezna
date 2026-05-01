import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGiftForwardService } from '@/lib/gift-forward';

/**
 * POST /api/gifts/forward
 * Body: { giftEntryId: string }
 *
 * Sender mints a 48h share token for one of their unused gifts. Returns
 * { token, expiresAt } so the client can compose a WhatsApp share link.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { giftEntryId?: string } | null;
    const giftEntryId = body?.giftEntryId?.trim();
    if (!giftEntryId) {
      return NextResponse.json({ error: 'gift_not_found' }, { status: 400 });
    }

    const service = createGiftForwardService(supabase);
    const result = await service.createForward(giftEntryId);

    if (!result.success) {
      const status =
        result.reason === 'not_authorized'
          ? 403
          : result.reason === 'gift_not_found'
            ? 404
            : result.reason === 'forward_rate_limit_exceeded'
              ? 429
              : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }

    return NextResponse.json({
      success: true,
      forwardId: result.forwardId,
      forwardToken: result.forwardToken,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    console.error('[/api/gifts/forward POST]', error);
    return NextResponse.json({ error: 'system_error' }, { status: 500 });
  }
}
