import { Suspense } from 'react';
import { createAnonymousClient } from '@/lib/supabase/server';
import ProvidersClient, { type Provider } from './ProvidersClient';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

// Generate static params for both locales
export async function generateStaticParams() {
  return [{ locale: 'ar' }, { locale: 'en' }];
}

// Loading fallback for Suspense
function ProvidersLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 animate-pulse">
              <div className="h-40 bg-slate-100 rounded-t-xl" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-slate-100 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function ProvidersPage() {
  const supabase = createAnonymousClient();

  // Fetch initial providers (top 100 by rating, all active)
  const { data: providers } = await supabase
    .from('providers')
    .select(
      'id, name_ar, name_en, description_ar, description_en, category, logo_url, cover_image_url, rating, total_reviews, delivery_fee, min_order_amount, estimated_delivery_time_min, status, is_featured, city_id, governorate_id'
    )
    .in('status', ['open', 'closed', 'temporarily_paused'])
    .order('is_featured', { ascending: false })
    .order('rating', { ascending: false })
    .limit(100);

  return (
    <Suspense fallback={<ProvidersLoading />}>
      <ProvidersClient initialProviders={(providers as Provider[]) || []} />
    </Suspense>
  );
}
