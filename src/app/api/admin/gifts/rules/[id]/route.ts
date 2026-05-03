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

    const body = (await request.json().catch(() => null)) as {
      is_active?: boolean;
      budget_cap_per_day?: number | null;
      budget_cap_per_month?: number | null;
      action_value_piasters?: number;
      description?: string | null;
    } | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    // Sanitize numeric fields — negatives and NaN aren't allowed.
    const patch: Record<string, unknown> = {};
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;
    if (body.budget_cap_per_day === null) patch.budget_cap_per_day = null;
    else if (typeof body.budget_cap_per_day === 'number' && body.budget_cap_per_day >= 0) {
      patch.budget_cap_per_day = body.budget_cap_per_day;
    }
    if (body.budget_cap_per_month === null) patch.budget_cap_per_month = null;
    else if (typeof body.budget_cap_per_month === 'number' && body.budget_cap_per_month >= 0) {
      patch.budget_cap_per_month = body.budget_cap_per_month;
    }
    if (typeof body.action_value_piasters === 'number' && body.action_value_piasters > 0) {
      patch.action_value_piasters = body.action_value_piasters;
    }
    if (body.description !== undefined) {
      patch.description = body.description === null ? null : String(body.description).slice(0, 500);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
    }

    const service = createAdminGiftsService(supabase);
    const updated = await service.updateRule(id, patch as Parameters<typeof service.updateRule>[1]);
    if (!updated) {
      return NextResponse.json({ error: 'Rule not found or not editable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, rule: updated });
  } catch (error) {
    console.error('[/api/admin/gifts/rules/[id] PATCH]', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}
