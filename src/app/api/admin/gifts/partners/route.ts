import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPartnerGiftsService } from '@/lib/partner-gifts';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin RLS on gift_partner_offers permits reading all rows; we don't need
    // an extra permission gate here because the underlying SELECT relies on
    // the "Admins can manage partner offers" policy.
    const status = request.nextUrl.searchParams.get('status') || undefined;
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 50;

    const service = createPartnerGiftsService(supabase);
    const offers = await service.listForAdmin({ status, limit });
    return NextResponse.json({ offers });
  } catch (error) {
    console.error('[/api/admin/gifts/partners]', error);
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 });
  }
}
