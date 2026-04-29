import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLoyaltyService } from '@/lib/loyalty';

const REASON_MESSAGES: Record<string, { ar: string; en: string; status: number }> = {
  insufficient_points: {
    ar: 'رصيد نقاطك غير كافٍ',
    en: 'Insufficient points balance',
    status: 400,
  },
  invalid_amount: {
    ar: 'القيمة المطلوبة يجب أن تكون من مضاعفات ١٠٠ نقطة',
    en: 'Redemption amount must be a multiple of 100 points',
    status: 400,
  },
  redemption_grant_failed: {
    ar: 'صندوق الهدايا ممتلئ — استخدم هدية حالية ثم حاول مجددًا',
    en: 'Gift queue full — use an existing gift then try again',
    status: 409,
  },
  system_error: {
    ar: 'حدث خطأ غير متوقع، حاول لاحقًا',
    en: 'Unexpected error, please try again later',
    status: 500,
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const points = Number(body?.points);

    if (!Number.isFinite(points) || points <= 0) {
      return NextResponse.json({ error: 'points (positive integer) required' }, { status: 400 });
    }

    const service = createLoyaltyService(supabase);
    const result = await service.redeemPoints(user.id, points);

    if (!result.success) {
      const message = REASON_MESSAGES[result.reason];
      return NextResponse.json(
        { error: message?.en || 'Redemption failed', reason: result.reason },
        { status: message?.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      giftEntryId: result.giftEntryId,
      newBalance: result.newBalance,
      discountPiasters: result.discountPiasters,
    });
  } catch {
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 });
  }
}
