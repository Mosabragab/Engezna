'use client'

import { useEffect, useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { CustomerLayout } from '@/components/customer/layout'
import { SearchBar, FilterChip, ProviderCard, EmptyState } from '@/components/customer/shared'
import { VoiceOrderFAB } from '@/components/customer/voice'
import { useFavorites } from '@/hooks/customer'
import { Star, Clock, Percent, ArrowUpDown } from 'lucide-react'

type Provider = {
  id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  category: 'restaurant' | 'coffee_shop' | 'grocery' | 'vegetables_fruits'
  logo_url: string | null
  cover_image_url: string | null
  rating: number
  total_reviews: number
  delivery_fee: number
  min_order_amount: number
  estimated_delivery_time_min: number
  status: 'open' | 'closed' | 'temporarily_paused' | 'on_vacation' | 'pending_approval'
  is_featured?: boolean
}

type SortOption = 'rating' | 'delivery_time' | 'delivery_fee'

export default function ProvidersPage() {
  const t = useTranslations('providers')
  const locale = useLocale()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption | null>(null)
  const [showOpenOnly, setShowOpenOnly] = useState(false)
  const [showOffersOnly, setShowOffersOnly] = useState(false)

  // Favorites hook
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites()

  useEffect(() => {
    fetchProviders()
  }, [selectedCategory])

  // Filter and sort providers client-side
  const filteredProviders = useMemo(() => {
    let result = [...providers]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name_ar.toLowerCase().includes(query) ||
          p.name_en.toLowerCase().includes(query) ||
          (p.description_ar?.toLowerCase().includes(query)) ||
          (p.description_en?.toLowerCase().includes(query))
      )
    }

    // Open only filter
    if (showOpenOnly) {
      result = result.filter((p) => p.status === 'open')
    }

    // Offers filter (featured providers)
    if (showOffersOnly) {
      result = result.filter((p) => p.is_featured)
    }

    // Sort
    if (sortBy) {
      result.sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return b.rating - a.rating
          case 'delivery_time':
            return a.estimated_delivery_time_min - b.estimated_delivery_time_min
          case 'delivery_fee':
            return a.delivery_fee - b.delivery_fee
          default:
            return 0
        }
      })
    }

    return result
  }, [providers, searchQuery, sortBy, showOpenOnly, showOffersOnly])

  async function fetchProviders() {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('providers')
      .select('*')
      .in('status', ['open', 'closed'])
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching providers:', error)
    } else {
      setProviders(data || [])
    }

    setLoading(false)
  }

  const categories = [
    { id: 'all', name_ar: 'الكل', name_en: 'All' },
    { id: 'restaurant', name_ar: 'المطاعم', name_en: 'Restaurants' },
    { id: 'coffee_shop', name_ar: 'الكافيهات', name_en: 'Coffee Shops' },
    { id: 'grocery', name_ar: 'البقالة', name_en: 'Groceries' },
    { id: 'vegetables_fruits', name_ar: 'الخضار والفواكه', name_en: 'Vegetables & Fruits' },
  ]

  const handleSortToggle = (option: SortOption) => {
    setSortBy(sortBy === option ? null : option)
  }

  return (
    <CustomerLayout showHeader={true} showBottomNav={true}>
      {/* Page Content */}
      <div className="px-4 py-4">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-slate-900">
            {locale === 'ar' ? 'المتاجر' : 'Stores'}
          </h1>
          <p className="text-slate-500 text-sm">
            {locale === 'ar'
              ? 'اطلب من أفضل المطاعم والمتاجر'
              : 'Order from the best restaurants and stores'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={setSearchQuery}
            placeholder={locale === 'ar' ? 'ابحث عن متجر...' : 'Search for a store...'}
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide -mx-4 px-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/30'
              }`}
            >
              {locale === 'ar' ? category.name_ar : category.name_en}
            </button>
          ))}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide -mx-4 px-4">
          <FilterChip
            label={locale === 'ar' ? 'مفتوح الآن' : 'Open Now'}
            isActive={showOpenOnly}
            onClick={() => setShowOpenOnly(!showOpenOnly)}
          />
          <FilterChip
            label={locale === 'ar' ? 'عروض' : 'Offers'}
            icon={<Percent className="w-3.5 h-3.5" />}
            isActive={showOffersOnly}
            onClick={() => setShowOffersOnly(!showOffersOnly)}
          />
          <FilterChip
            label={locale === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'}
            icon={<Star className="w-3.5 h-3.5" />}
            isActive={sortBy === 'rating'}
            onClick={() => handleSortToggle('rating')}
          />
          <FilterChip
            label={locale === 'ar' ? 'الأسرع توصيلاً' : 'Fastest'}
            icon={<Clock className="w-3.5 h-3.5" />}
            isActive={sortBy === 'delivery_time'}
            onClick={() => handleSortToggle('delivery_time')}
          />
          <FilterChip
            label={locale === 'ar' ? 'أقل رسوم توصيل' : 'Lowest Fee'}
            icon={<ArrowUpDown className="w-3.5 h-3.5" />}
            isActive={sortBy === 'delivery_fee'}
            onClick={() => handleSortToggle('delivery_fee')}
          />
        </div>

        {/* Results count */}
        {!loading && (
          <div className="text-sm text-slate-500 mb-4">
            {locale === 'ar'
              ? `${filteredProviders.length} متجر`
              : `${filteredProviders.length} stores found`}
          </div>
        )}

        {/* Loading State */}
        {loading && (
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
        )}

        {/* Empty State */}
        {!loading && filteredProviders.length === 0 && (
          <EmptyState
            icon="store"
            title={locale === 'ar' ? 'لا توجد متاجر' : 'No stores found'}
            description={
              searchQuery
                ? locale === 'ar'
                  ? 'جرب البحث بكلمات أخرى'
                  : 'Try searching with different keywords'
                : locale === 'ar'
                  ? 'لا توجد متاجر متاحة في هذا القسم'
                  : 'No stores available in this category'
            }
            actionLabel={searchQuery ? (locale === 'ar' ? 'مسح البحث' : 'Clear search') : undefined}
            onAction={searchQuery ? () => setSearchQuery('') : undefined}
          />
        )}

        {/* Providers Grid */}
        {!loading && filteredProviders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                variant="default"
                isFavorite={isFavorite(provider.id)}
                onFavoriteToggle={isAuthenticated ? () => toggleFavorite(provider.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Voice Order FAB */}
      <VoiceOrderFAB />
    </CustomerLayout>
  )
}
