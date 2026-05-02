import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createAdminErpService } from '@/lib/admin-erp';

interface Ctx {
  params: Promise<{ id: string }>;
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const userClient = await createServerClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminRow } = await userClient
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const service = createAdminErpService(getAdminSupabase());
    const ok = await service.deleteExpense(id);
    if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/admin/erp/expenses/[id] DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
