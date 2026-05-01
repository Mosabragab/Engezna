import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPartnerGiftsService } from '@/lib/partner-gifts';

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

    const service = createPartnerGiftsService(supabase);
    const offer = await service.getOffer(id);
    if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ offer });
  } catch (error) {
    console.error('[/api/provider/gifts/[id]]', error);
    return NextResponse.json({ error: 'Failed to load offer' }, { status: 500 });
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

    const service = createPartnerGiftsService(supabase);
    const ok = await service.deleteDraft(id);
    if (!ok) return NextResponse.json({ error: 'Cannot delete' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/provider/gifts/[id] DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
