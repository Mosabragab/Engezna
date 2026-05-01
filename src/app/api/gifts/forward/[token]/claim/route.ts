import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGiftForwardService } from '@/lib/gift-forward';

interface Ctx {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/gifts/forward/[token]/claim
 * Authenticated — recipient claims the gift. We pass the request's IP and
 * the optional client-supplied device id through to the RPC for anti-fraud
 * tracking (per plan §7.3).
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'forward_not_found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { deviceId?: string } | null;
    const deviceId = body?.deviceId?.slice(0, 128) ?? null;

    // Best-effort IP capture — Vercel sets x-forwarded-for; fall back to null
    const xff = request.headers.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0]?.trim() || null : null;

    const service = createGiftForwardService(supabase);
    const result = await service.claim(token, deviceId, ip);

    if (!result.success) {
      const status =
        result.reason === 'forward_not_found' || result.reason === 'gift_not_found'
          ? 404
          : result.reason === 'forward_already_claimed' || result.reason === 'forward_expired'
            ? 410
            : result.reason === 'cannot_claim_own_forward'
              ? 403
              : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }

    return NextResponse.json({
      success: true,
      giftEntryId: result.giftEntryId,
      senderId: result.senderId,
      costPiasters: result.costPiasters,
    });
  } catch (error) {
    console.error('[/api/gifts/forward/[token]/claim POST]', error);
    return NextResponse.json({ error: 'system_error' }, { status: 500 });
  }
}
