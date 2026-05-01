import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCampaignsService } from '@/lib/campaigns';
import type { CreateCampaignInput } from '@/lib/campaigns';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const activeOnly = request.nextUrl.searchParams.get('active') === '1';
    const trigger = request.nextUrl.searchParams.get('trigger') || undefined;
    const allowedTriggers = ['manual_campaign', 'birthday'];
    const safeTrigger = trigger && allowedTriggers.includes(trigger) ? trigger : undefined;

    const service = createCampaignsService(supabase);
    const campaigns = await service.list({ activeOnly, trigger: safeTrigger });
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('[/api/admin/gifts/campaigns]', error);
    return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as CreateCampaignInput | null;
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const service = createCampaignsService(supabase);
    const result = await service.create(body);
    if (!result.success) {
      const status = result.reason === 'duplicate_name' ? 409 : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }
    return NextResponse.json({ success: true, campaignId: result.campaignId });
  } catch (error) {
    console.error('[/api/admin/gifts/campaigns POST]', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
