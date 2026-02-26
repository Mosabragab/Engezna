import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { withErrorHandler } from '@/lib/api/error-handler';

interface ExportedUserData {
  exportDate: string;
  exportVersion: string;
  profile: Record<string, unknown> | null;
  addresses: Record<string, unknown>[];
  favorites: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  provider?: {
    profile: Record<string, unknown> | null;
    menuItems: Record<string, unknown>[];
    storeHours: Record<string, unknown>[];
    promotions: Record<string, unknown>[];
    providerReviews: Record<string, unknown>[];
    providerNotifications: Record<string, unknown>[];
  };
}

export const GET = withErrorHandler(async () => {
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
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
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

  // Use service role client to fetch all user data
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

  // Fetch user profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Fetch user addresses
  const { data: addresses } = await supabaseAdmin
    .from('addresses')
    .select('*')
    .eq('user_id', userId);

  // Fetch user favorites with provider details
  const { data: favorites } = await supabaseAdmin
    .from('favorites')
    .select(
      `
      *,
      provider:providers(id, name, name_ar, logo_url)
    `
    )
    .eq('user_id', userId);

  // Fetch user orders with items
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select(
      `
      *,
      items:order_items(*),
      provider:providers(id, name, name_ar)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Fetch user reviews
  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select(
      `
      *,
      provider:providers(id, name, name_ar)
    `
    )
    .eq('user_id', userId);

  // Fetch user notifications
  const { data: notifications } = await supabaseAdmin
    .from('customer_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Build export data object
  const exportData: ExportedUserData = {
    exportDate: new Date().toISOString(),
    exportVersion: '1.0',
    profile: profile || null,
    addresses: addresses || [],
    favorites: favorites || [],
    orders: orders || [],
    reviews: reviews || [],
    notifications: notifications || [],
  };

  // Check if user is a provider owner and include provider data
  const { data: providerData } = await supabaseAdmin
    .from('providers')
    .select('*')
    .eq('owner_id', userId)
    .single();

  if (providerData) {
    const providerId = providerData.id;

    // Fetch provider menu items
    const { data: menuItems } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('provider_id', providerId);

    // Fetch store hours
    const { data: storeHours } = await supabaseAdmin
      .from('store_hours')
      .select('*')
      .eq('provider_id', providerId);

    // Fetch promotions
    const { data: promotions } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('provider_id', providerId);

    // Fetch provider reviews (reviews received)
    const { data: providerReviews } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('provider_id', providerId);

    // Fetch provider notifications
    const { data: providerNotifications } = await supabaseAdmin
      .from('provider_notifications')
      .select('*')
      .eq('provider_id', providerId);

    exportData.provider = {
      profile: providerData,
      menuItems: menuItems || [],
      storeHours: storeHours || [],
      promotions: promotions || [],
      providerReviews: providerReviews || [],
      providerNotifications: providerNotifications || [],
    };
  }

  // Return as downloadable JSON file
  const fileName = `engezna-data-export-${new Date().toISOString().split('T')[0]}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
});
