import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createAdminErpService } from '@/lib/admin-erp';
import type { ExpenseCategory } from '@/lib/admin-erp';

const ALLOWED_CATEGORIES: ReadonlyArray<ExpenseCategory> = [
  'saas',
  'salary',
  'office',
  'legal',
  'marketing_external',
  'other',
];

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function requireAdmin() {
  const userClient = await createServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { user: null, isAdmin: false };

  const { data: adminRow } = await userClient
    .from('admin_users')
    .select('id, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  return { user, isAdmin: !!adminRow };
}

export async function GET(request: NextRequest) {
  try {
    const { user, isAdmin } = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const monthParam = request.nextUrl.searchParams.get('month');
    const monthStart = monthParam
      ? new Date(`${monthParam}-01T00:00:00Z`)
      : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    if (Number.isNaN(monthStart.getTime())) {
      return NextResponse.json({ error: 'invalid_month' }, { status: 400 });
    }

    const service = createAdminErpService(getAdminSupabase());
    const expenses = await service.listExpenses(monthStart);
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('[/api/admin/erp/expenses GET]', error);
    return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, isAdmin } = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    const category = String(body.category) as ExpenseCategory;
    const amountPiasters = Number(body.amount_piasters);
    const description = String(body.description || '').trim();
    const incurredDate = String(body.incurred_date || '');

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
    }
    if (!Number.isFinite(amountPiasters) || amountPiasters <= 0) {
      return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: 'description_required' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(incurredDate)) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    }

    const service = createAdminErpService(getAdminSupabase());
    const expense = await service.createExpense(
      { category, amount_piasters: amountPiasters, description, incurred_date: incurredDate },
      user.id
    );
    if (!expense) {
      return NextResponse.json({ error: 'create_failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('[/api/admin/erp/expenses POST]', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
