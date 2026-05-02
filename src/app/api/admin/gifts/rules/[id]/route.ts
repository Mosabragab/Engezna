import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminGiftsService } from '@/lib/admin-gifts';

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { is_active?: boolean } | null;
    if (!body || typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const service = createAdminGiftsService(supabase);
    const updated = await service.setRuleActive(id, body.is_active);
    if (!updated) {
      return NextResponse.json({ error: 'Rule not found or not editable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, rule: updated });
  } catch (error) {
    console.error('[/api/admin/gifts/rules/[id] PATCH]', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}
