import { Suspense } from 'react';
import { createStaticClient } from '@/lib/supabase/static';
import HomePageClient from './HomePageClient';

// ISR: Revalidate every 5 minutes — caches server-fetched provider data
// Categories and governorates are cached client-side (1-hour TTL)
export const revalidate = 300;

// Loading skeleton matching HomePageClient's loading state
function HomePageLoading() {
  return (
    <div className="min-h-screen">
      {/* Skeleton hero */}
      <div className="px-4 pt-12 pb-6">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-2" />
        <div className="h-5 w-64 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
      </div>
      {/* Skeleton banners */}
      <div className="px-4 flex gap-3 overflow-hidden">
        <div className="w-72 h-36 bg-slate-100 rounded-2xl animate-pulse shrink-0" />
        <div className="w-72 h-36 bg-slate-100 rounded-2xl animate-pulse shrink-0" />
      </div>
      {/* Skeleton categories */}
      <div className="px-4 mt-6">
        <div className="h-6 w-24 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-3 w-12 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  // Pre-fetch top-rated providers server-side for faster initial render
  // Client will refine with location-based filtering after hydration
  let initialTopRated: any[] = [];

  try {
    const supabase = createStaticClient();
    if (supabase) {
      const { data } = await supabase
        .from('providers')
        .select(
          'id, name_ar, name_en, logo_url, cover_image_url, category, status, city_id, governorate_id, rating, is_featured, is_verified, delivery_fee, estimated_delivery_time_min, total_reviews, min_order_amount, business_hours'
        )
        .in('status', ['open', 'closed'])
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false })
        .limit(6);

      initialTopRated = data || [];
    }
  } catch {
    // Graceful degradation — client will fetch on mount
  }

  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageClient initialTopRated={initialTopRated} />
    </Suspense>
  );
}
