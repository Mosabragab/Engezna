import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createReferralService } from '@/lib/referrals';

const REASON_MESSAGES: Record<string, { ar: string; en: string; status: number }> = {
  invalid_code: {
    ar: 'كود الإحالة غير صحيح',
    en: 'Invalid referral code',
    status: 400,
  },
  self_referral: {
    ar: 'لا يمكنك استخدام كودك الخاص',
    en: 'You cannot use your own referral code',
    status: 400,
  },
  already_referred: {
    ar: 'تم استخدام كود إحالة من قبل لهذا الحساب',
    en: 'This account already has an applied referral code',
    status: 400,
  },
  has_orders: {
    ar: 'كود الإحالة يُستخدم قبل أول طلب فقط',
    en: 'Referral code can only be applied before your first order',
    status: 400,
  },
  referrer_not_found: {
    ar: 'كود الإحالة غير صحيح',
    en: 'Invalid referral code',
    status: 400,
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
    const code = typeof body?.code === 'string' ? body.code : '';

    if (!code.trim()) {
      return NextResponse.json({ error: 'Referral code required' }, { status: 400 });
    }

    const service = createReferralService(supabase);
    const result = await service.applyReferralCode(user.id, code);

    if (!result.success) {
      const message = REASON_MESSAGES[result.reason];
      return NextResponse.json(
        { error: message?.en || 'Failed to apply referral code', reason: result.reason },
        { status: message?.status || 400 }
      );
    }

    return NextResponse.json({ success: true, referralId: result.referralId });
  } catch {
    return NextResponse.json({ error: 'Failed to apply referral code' }, { status: 500 });
  }
}
