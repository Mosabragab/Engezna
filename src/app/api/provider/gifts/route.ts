import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPartnerGiftsService } from '@/lib/partner-gifts';
import type { CreatePartnerOfferInput } from '@/lib/partner-gifts';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createPartnerGiftsService(supabase);
    const offers = await service.listProviderOffers();
    return NextResponse.json({ offers });
  } catch (error) {
    console.error('[/api/provider/gifts]', error);
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as CreatePartnerOfferInput | null;
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const service = createPartnerGiftsService(supabase);
    const result = await service.createDraftOffer(body);

    if (!result.success) {
      const status = result.reason === 'no_provider' ? 403 : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }
    return NextResponse.json({
      success: true,
      offerId: result.offerId,
      giftId: result.giftId,
    });
  } catch (error) {
    console.error('[/api/provider/gifts POST]', error);
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
  }
}
