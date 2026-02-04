'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/customer';
import { CustomerLayout } from '@/components/customer/layout';
import { ProviderCard } from '@/components/customer/shared';

export default function FavoritesPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('favorites');

  const { favoriteProviders, isLoading, isAuthenticated, toggleFavorite } = useFavorites();

  // If not authenticated, show login prompt
  if (!isAuthenticated && !isLoading) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <Heart className="w-12 h-12 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'سجل دخولك أولاً' : 'Login Required'}
          </h2>
          <p className="text-slate-500 text-center mb-6">
            {locale === 'ar'
              ? 'سجل دخولك لعرض المتاجر المفضلة'
              : 'Login to view your favorite stores'}
          </p>
          <button
            onClick={() => router.push(`/${locale}/auth/login`)}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </button>
        </div>
      </CustomerLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="px-4 py-4">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border animate-pulse">
                <div className="aspect-[16/9] bg-slate-200 rounded-t-2xl" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-2/3" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // Empty state
  if (favoriteProviders.length === 0) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <Heart className="w-12 h-12 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('empty')}</h2>
          <p className="text-slate-500 text-center mb-6">{t('emptyDescription')}</p>
          <button
            onClick={() => router.push(`/${locale}/providers`)}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            {t('browse')}
          </button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="px-4 py-4">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-slate-900">
            {locale === 'ar' ? 'المفضلة' : 'Favorites'}
          </h1>
          <p className="text-slate-500 text-sm">
            {favoriteProviders.length} {locale === 'ar' ? 'متجر محفوظ' : 'saved stores'}
          </p>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 mb-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          </div>
          <div>
            <span className="text-2xl font-bold text-red-600">{favoriteProviders.length}</span>
            <span className="text-slate-600 ms-2">{t('stores')}</span>
          </div>
        </div>

        {/* Providers List */}
        <div className="space-y-4">
          {favoriteProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider as any}
              isFavorite={true}
              onFavoriteToggle={() => toggleFavorite(provider.id)}
            />
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
