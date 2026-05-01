import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCampaignsService } from '@/lib/campaigns';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createCampaignsService(supabase);
    const campaign = await service.get(id);
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('[/api/admin/gifts/campaigns/[id]]', error);
    return NextResponse.json({ error: 'Failed to load campaign' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (typeof body?.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active boolean required' }, { status: 400 });
    }
    const service = createCampaignsService(supabase);
    const ok = await service.setActive(id, body.is_active);
    if (!ok) return NextResponse.json({ error: 'Cannot update' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/admin/gifts/campaigns/[id] PATCH]', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createCampaignsService(supabase);
    const ok = await service.delete(id);
    if (!ok) return NextResponse.json({ error: 'Cannot delete' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/admin/gifts/campaigns/[id] DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
