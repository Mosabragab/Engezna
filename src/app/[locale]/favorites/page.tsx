'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Heart, Store } from 'lucide-react'
import { useFavorites } from '@/hooks/customer'
import { CustomerLayout } from '@/components/customer/layout'
import { ProviderCard, EmptyState } from '@/components/customer/shared'
import { Button } from '@/components/ui/button'

export default function FavoritesPage() {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('favorites')

  const {
    favoriteProviders,
    isLoading,
    isAuthenticated,
    toggleFavorite,
    isFavorite,
  } = useFavorites()

  // If not authenticated, show login prompt
  if (!isAuthenticated && !isLoading) {
    return (
      <CustomerLayout headerTitle={t('title')} showBackButton>
        <EmptyState
          icon={<Heart className="w-16 h-16 text-slate-300" />}
          title={locale === 'ar' ? 'سجل دخولك أولاً' : 'Login Required'}
          description={locale === 'ar' ? 'سجل دخولك لعرض المتاجر المفضلة' : 'Login to view your favorite stores'}
          actionLabel={locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
          onAction={() => router.push(`/${locale}/auth/login`)}
        />
      </CustomerLayout>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <CustomerLayout headerTitle={t('title')} showBackButton>
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    )
  }

  // Empty state
  if (favoriteProviders.length === 0) {
    return (
      <CustomerLayout headerTitle={t('title')} showBackButton>
        <EmptyState
          icon={<Heart className="w-16 h-16 text-slate-300" />}
          title={t('empty')}
          description={t('emptyDescription')}
          actionLabel={t('browse')}
          onAction={() => router.push(`/${locale}/providers`)}
        />
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout headerTitle={t('title')} showBackButton>
      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="bg-primary/5 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary fill-primary" />
          </div>
          <div>
            <span className="text-2xl font-bold text-primary">{favoriteProviders.length}</span>
            <span className="text-slate-600 ms-2">{t('stores')}</span>
          </div>
        </div>

        {/* Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
  )
}
