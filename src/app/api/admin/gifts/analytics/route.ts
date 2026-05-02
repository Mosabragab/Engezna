import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminGiftsService } from '@/lib/admin-gifts';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const daysParam = Number(request.nextUrl.searchParams.get('days') ?? 30);
    const days = Number.isFinite(daysParam) ? Math.max(7, Math.min(daysParam, 90)) : 30;

    const service = createAdminGiftsService(supabase);
    const [dailyGrants, bucketDistribution, segmentDistribution] = await Promise.all([
      service.getDailyGrants(days),
      service.getBucketDistribution(),
      service.getSegmentDistribution(),
    ]);

    return NextResponse.json({ dailyGrants, bucketDistribution, segmentDistribution, days });
  } catch (error) {
    console.error('[/api/admin/gifts/analytics]', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
