import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProviderDetailClient, {
  type ProviderData,
  type MenuItem,
  type MenuCategory,
} from './ProviderDetailClient';

// ISR: Revalidate every minute
export const revalidate = 60;

// Generate static params - return empty to use on-demand ISR
// Note: Can't use cookies() in generateStaticParams (build time)
export async function generateStaticParams() {
  // Pages will be generated on-demand and cached with revalidate=60
  return [];
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const supabase = await createClient();
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
  const supabase = await createClient();

  // Fetch provider data
  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .single();

  if (providerError || !provider) {
    notFound();
  }

  // Parallel fetch for menu items, categories, reviews, and promotions
  const [categoriesResult, menuItemsResult, reviewsResult, promotionsResult] = await Promise.all([
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
  ]);

  // Process menu items with variants
  const menuItems =
    menuItemsResult.data?.map((item) => ({
      ...item,
      variants: item.product_variants?.filter((v: { is_available: boolean }) => v.is_available) || [],
    })) || [];

  return (
    <Suspense fallback={<ProviderLoading />}>
      <ProviderDetailClient
        initialProvider={provider as ProviderData}
        initialMenuItems={menuItems as MenuItem[]}
        initialCategories={(categoriesResult.data as MenuCategory[]) || []}
        initialReviews={reviewsResult.data || []}
        initialPromotions={promotionsResult.data || []}
      />
    </Suspense>
  );
}
