import { Suspense } from 'react';
import { createStaticClient } from '@/lib/supabase/static';
import HomePageClient from './HomePageClient';

// ISR: Revalidate every 5 minutes — caches server-fetched provider data
// Categories and governorates are cached client-side (1-hour TTL)
export const revalidate = 300;

// Loading skeleton — dimensions match actual HeroSection + OffersCarousel + Categories
function HomePageLoading() {
  return (
    <div className="min-h-screen">
      {/* Skeleton hero — matches HeroSection: pt-8 pb-10, centered text + search bar */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#E8F7FF] via-[#F0FAFF] to-white" />
        <div className="relative px-4 pt-8 pb-10">
          <div className="text-center mb-8">
            <div className="h-8 w-56 bg-slate-200/60 rounded-lg animate-pulse mx-auto mb-2" />
            <div className="h-5 w-72 bg-slate-200/40 rounded animate-pulse mx-auto" />
          </div>
          <div className="h-[58px] bg-white rounded-2xl shadow-sm animate-pulse max-w-2xl mx-auto" />
        </div>
      </div>
      {/* Skeleton banners — matches OffersCarousel: 16:9 aspect, -mx-4 scroll */}
      <div className="min-h-[220px] md:min-h-[280px] px-4 py-6">
        <div className="h-7 w-28 bg-slate-100 rounded-lg animate-pulse mb-5" />
        <div className="flex gap-4 overflow-hidden">
          <div className="w-[85%] shrink-0 aspect-[16/9] rounded-2xl bg-slate-100 animate-pulse" />
          <div className="w-[85%] shrink-0 aspect-[16/9] rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
      {/* Skeleton categories — matches CategoriesSection 4-column grid */}
      <div className="min-h-[180px] px-4 mt-6">
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
