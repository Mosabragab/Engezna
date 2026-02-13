import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';

export async function DELETE() {
  try {
    // Get current user from session
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Use service role client to delete user data and auth user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user is a provider owner
    const { data: providerData } = await supabaseAdmin
      .from('providers')
      .select('id')
      .eq('owner_id', userId)
      .single();

    // Delete provider-related data if user is a provider owner
    if (providerData) {
      const providerId = providerData.id;

      // Delete provider notifications
      await supabaseAdmin.from('provider_notifications').delete().eq('provider_id', providerId);

      // Delete menu items (products)
      await supabaseAdmin.from('menu_items').delete().eq('provider_id', providerId);

      // Delete store hours
      await supabaseAdmin.from('store_hours').delete().eq('provider_id', providerId);

      // Delete promotions
      await supabaseAdmin.from('promotions').delete().eq('provider_id', providerId);

      // Delete reviews (or anonymize)
      await supabaseAdmin.from('reviews').delete().eq('provider_id', providerId);

      // Note: Orders are kept for business records
      // Refunds are kept for business records

      // Delete provider record
      await supabaseAdmin.from('providers').delete().eq('id', providerId);
    }

    // Delete user data in order (respecting foreign key constraints)
    // 1. Delete favorites
    await supabaseAdmin.from('favorites').delete().eq('user_id', userId);

    // 2. Delete customer notifications
    await supabaseAdmin.from('customer_notifications').delete().eq('user_id', userId);

    // 3. Delete addresses
    await supabaseAdmin.from('addresses').delete().eq('user_id', userId);

    // 4. Anonymize orders (keep for business records but remove personal reference)
    // We don't delete orders as they're needed for business/tax records
    // Instead, we'll just keep them as-is since user_id is a foreign key

    // 5. Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 6. Delete auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      logger.error('Error deleting auth user:', { error: deleteAuthError });
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete account error:', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
