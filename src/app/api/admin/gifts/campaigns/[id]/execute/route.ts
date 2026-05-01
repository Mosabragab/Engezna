import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCampaignsService } from '@/lib/campaigns';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createCampaignsService(supabase);
    const result = await service.execute(id);
    if (!result.success) {
      const status = result.reason === 'not_authorized' ? 403 : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }
    return NextResponse.json({
      success: true,
      granted: result.granted,
      attempted: result.attempted,
      totalCostPiasters: result.totalCostPiasters,
    });
  } catch (error) {
    console.error('[/api/admin/gifts/campaigns/[id]/execute]', error);
    return NextResponse.json({ error: 'Failed to execute campaign' }, { status: 500 });
  }
}
