import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createStaticClient } from '@/lib/supabase/static';
import ProviderDetailClient, {
  type ProviderData,
  type MenuItem,
  type MenuCategory,
} from './ProviderDetailClient';

// ISR: Revalidate every 60 seconds for fresh data
// Provider details (menu, reviews) change more frequently
export const revalidate = 60;

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const supabase = createStaticClient();

  // Handle missing Supabase client (e.g., in test environments)
  if (!supabase) {
    return { title: 'Provider | إنجزنا' };
  }

  const { data: provider } = await supabase
    .from('providers')
    .select('name_ar, name_en, description_ar, description_en, cover_image_url, rating')
    .eq('id', id)
    .single();

  if (!provider) {
    return { title: 'Provider Not Found' };
  }

  const name = locale === 'ar' ? provider.name_ar : provider.name_en;
  const description = locale === 'ar' ? provider.description_ar : provider.description_en;

  return {
    title: `${name} - ${provider.rating?.toFixed(1) || '0.0'}⭐ | إنجزنا`,
    description: description || undefined,
    openGraph: {
      title: name,
      description: description || undefined,
      images: provider.cover_image_url ? [{ url: provider.cover_image_url }] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      images: provider.cover_image_url ? [provider.cover_image_url] : undefined,
    },
  };
}

// Loading fallback
function ProviderLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cover skeleton */}
      <div className="h-44 bg-slate-200 animate-pulse" />
      <div className="px-4 py-4 space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-slate-200 rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-slate-200 rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const supabase = createStaticClient();

  // Handle missing Supabase client (e.g., in test environments)
  if (!supabase) {
    notFound();
  }

  // Fetch provider data
  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .single();

  if (providerError || !provider) {
    notFound();
  }

  // Parallel fetch for menu items, categories, reviews, promotions, and popular items
  const [categoriesResult, menuItemsResult, reviewsResult, promotionsResult, popularItemsResult] =
    await Promise.all([
      // Categories
      supabase
        .from('provider_categories')
        .select('*')
        .eq('provider_id', id)
        .eq('is_active', true)
        .order('display_order'),

      // Menu items with variants
      supabase
        .from('menu_items')
        .select(
          `
        *,
        product_variants (
          id,
          variant_type,
          name_ar,
          name_en,
          price,
          original_price,
          is_default,
          display_order,
          is_available
        )
      `
        )
        .eq('provider_id', id)
        .order('display_order'),

      // Reviews
      supabase
        .from('reviews')
        .select(
          `
        id,
        rating,
        comment,
        provider_response,
        provider_response_at,
        created_at,
        profiles:customer_id (
          full_name
        )
      `
        )
        .eq('provider_id', id)
        .order('created_at', { ascending: false })
        .limit(10),

      // Promotions
      supabase
        .from('promotions')
        .select('*')
        .eq('provider_id', id)
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString()),

      // Most Popular items - count order_items grouped by menu_item_id
      // Server-side query bypasses RLS to get accurate popularity data
      supabase
        .from('order_items')
        .select(
          `
        menu_item_id,
        orders!inner (
          provider_id,
          status
        )
      `
        )
        .eq('orders.provider_id', id)
        .eq('orders.status', 'delivered'),
    ]);

  // Process menu items with variants
  const menuItems =
    menuItemsResult.data?.map((item) => ({
      ...item,
      variants:
        item.product_variants?.filter((v: { is_available: boolean }) => v.is_available) || [],
    })) || [];

  // Process popular items - count occurrences and sort by popularity
  let popularItemIds: string[] = [];
  if (popularItemsResult.data && popularItemsResult.data.length > 0) {
    const countMap = new Map<string, number>();
    popularItemsResult.data.forEach((item: { menu_item_id: string | null }) => {
      if (item.menu_item_id) {
        countMap.set(item.menu_item_id, (countMap.get(item.menu_item_id) || 0) + 1);
      }
    });
    // Sort by count and get top 6 IDs
    popularItemIds = [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([itemId]) => itemId);
  }

  return (
    <Suspense fallback={<ProviderLoading />}>
      <ProviderDetailClient
        initialProvider={provider as ProviderData}
        initialMenuItems={menuItems as MenuItem[]}
        initialCategories={(categoriesResult.data as MenuCategory[]) || []}
        initialReviews={reviewsResult.data || []}
        initialPromotions={promotionsResult.data || []}
        initialPopularItemIds={popularItemIds}
      />
    </Suspense>
  );
}
