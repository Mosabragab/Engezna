import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGiftForwardService } from '@/lib/gift-forward';

interface Ctx {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/gifts/forward/[token]
 * Public — returns minimal preview fields for the landing page even before
 * the recipient is signed in. Sender PII is limited to first name only.
 */
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!token || token.length < 16) {
      return NextResponse.json({ status: 'not_found' }, { status: 404 });
    }

    const supabase = await createClient();
    const service = createGiftForwardService(supabase);
    const preview = await service.peek(token);

    if (preview.status === 'not_found') {
      return NextResponse.json({ status: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      status: preview.status,
      senderFirstName: preview.senderFirstName,
      giftTitleAr: preview.giftTitleAr,
      giftTitleEn: preview.giftTitleEn,
      giftValuePiasters: preview.giftValuePiasters,
      expiresAt: preview.expiresAt,
    });
  } catch (error) {
    console.error('[/api/gifts/forward/[token] GET]', error);
    return NextResponse.json({ status: 'not_found' }, { status: 500 });
  }
}
