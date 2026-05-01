import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPartnerGiftsService } from '@/lib/partner-gifts';

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

    const service = createPartnerGiftsService(supabase);
    const result = await service.resume(id);
    if (!result.success) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }
    return NextResponse.json({ success: true, offer: result.offer });
  } catch (error) {
    console.error('[/api/provider/gifts/[id]/resume]', error);
    return NextResponse.json({ error: 'Failed to resume offer' }, { status: 500 });
  }
}
