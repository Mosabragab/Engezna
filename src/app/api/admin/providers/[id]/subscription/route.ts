import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createProviderSubscriptionService } from '@/lib/provider-subscriptions';
import type { SubscriptionTier } from '@/lib/provider-subscriptions';

interface Ctx {
  params: Promise<{ id: string }>;
}

const ALLOWED_TIERS: ReadonlyArray<SubscriptionTier> = ['basic', 'pro', 'elite'];

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
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  return { user, isAdmin: !!adminRow };
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { user, isAdmin } = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const service = createProviderSubscriptionService(getAdminSupabase());
    const subscription = await service.getCurrent(id);
    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('[/api/admin/providers/[id]/subscription GET]', error);
    return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { user, isAdmin } = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

    const tier = String(body.tier) as SubscriptionTier;
    if (!ALLOWED_TIERS.includes(tier)) {
      return NextResponse.json({ error: 'invalid_tier' }, { status: 400 });
    }

    const grantedFree = body.granted_free === true;
    const endsAt =
      typeof body.ends_at === 'string' && body.ends_at.length > 0 ? body.ends_at : null;

    const service = createProviderSubscriptionService(getAdminSupabase());
    const result = await service.setSubscription(
      id,
      { tier, granted_free: grantedFree, ends_at: endsAt },
      user.id
    );
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'set_failed' }, { status: 400 });
    }
    return NextResponse.json({ success: true, subscription: result.subscription });
  } catch (error) {
    console.error('[/api/admin/providers/[id]/subscription POST]', error);
    return NextResponse.json({ error: 'Failed to set subscription' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { user, isAdmin } = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const service = createProviderSubscriptionService(getAdminSupabase());
    const result = await service.cancel(id, user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'cancel_failed' }, { status: 400 });
    }
    return NextResponse.json({ success: true, subscription: result.subscription });
  } catch (error) {
    console.error('[/api/admin/providers/[id]/subscription DELETE]', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
