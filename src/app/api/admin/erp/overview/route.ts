import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createAdminErpService } from '@/lib/admin-erp';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    // Auth check via the cookie-bound user client first.
    const userClient = await createServerClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify admin role: the SECURITY DEFINER ERP RPCs are GRANTed to
    // service_role only, so we additionally check that the caller is in
    // admin_users before issuing them under that role.
    const { data: adminRow } = await userClient
      .from('admin_users')
      .select('id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const monthParam = request.nextUrl.searchParams.get('month'); // YYYY-MM
    const monthStart = monthParam
      ? new Date(`${monthParam}-01T00:00:00Z`)
      : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    if (Number.isNaN(monthStart.getTime())) {
      return NextResponse.json({ error: 'invalid_month' }, { status: 400 });
    }

    const service = createAdminErpService(getAdminSupabase());
    const overview = await service.getOverview(monthStart);
    return NextResponse.json({ overview });
  } catch (error) {
    console.error('[/api/admin/erp/overview]', error);
    return NextResponse.json({ error: 'Failed to load ERP overview' }, { status: 500 });
  }
}
