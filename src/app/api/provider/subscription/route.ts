import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createProviderSubscriptionService } from '@/lib/provider-subscriptions';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve the provider this user owns. Staff inherit the owner's tier
    // but only owners can request changes — this matches the rest of
    // /api/provider/* which scopes via the owned provider.
    const { data: provider } = await supabase
      .from('providers')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!provider) {
      return NextResponse.json({ error: 'no_provider' }, { status: 403 });
    }

    const service = createProviderSubscriptionService(supabase);
    const subscription = await service.getCurrent(provider.id);
    return NextResponse.json({ subscription, providerId: provider.id });
  } catch (error) {
    console.error('[/api/provider/subscription GET]', error);
    return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 });
  }
}
