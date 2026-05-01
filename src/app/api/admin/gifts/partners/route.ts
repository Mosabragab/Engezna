import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPartnerGiftsService } from '@/lib/partner-gifts';
import type { PartnerOfferStatus } from '@/lib/partner-gifts';

const ALLOWED_STATUSES: PartnerOfferStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'paused',
  'ended',
  'rejected',
];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Validate status against the allowed enum; ignore garbage input.
    const rawStatus = request.nextUrl.searchParams.get('status');
    const status =
      rawStatus && (ALLOWED_STATUSES as string[]).includes(rawStatus) ? rawStatus : undefined;

    // Parse + clamp limit defensively — DoS protection on the admin listing.
    const rawLimit = request.nextUrl.searchParams.get('limit');
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : DEFAULT_LIMIT;
    const limit = Math.max(
      1,
      Math.min(Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT, MAX_LIMIT)
    );

    // Admin RLS on gift_partner_offers permits reading all rows; the underlying
    // SELECT relies on the "Admins can manage partner offers" policy.
    const service = createPartnerGiftsService(supabase);
    const offers = await service.listForAdmin({ status, limit });
    return NextResponse.json({ offers });
  } catch (error) {
    console.error('[/api/admin/gifts/partners]', error);
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 });
  }
}
