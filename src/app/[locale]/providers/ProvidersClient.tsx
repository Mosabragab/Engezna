'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CustomerLayout } from '@/components/customer/layout';
import { SearchBar, FilterChip, ProviderCard, EmptyState } from '@/components/customer/shared';
import { useFavorites } from '@/hooks/customer';
import { useSDUI } from '@/hooks/sdui';
import { Star, Clock, Percent, ArrowUpDown, MapPin, Navigation } from 'lucide-react';
import { useUserLocation } from '@/lib/contexts';
import Link from 'next/link';
import { BusinessHours } from '@/lib/utils/business-hours';

export type Provider = {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  category:
    | 'restaurant_cafe'
    | 'coffee_patisserie'
    | 'grocery'
    | 'vegetables_fruits'
    | 'pharmacy'
    | 'home_cooked';
  logo_url: string | null;
  cover_image_url: string | null;
  rating: number;
  total_reviews: number;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
  status: 'open' | 'closed' | 'temporarily_paused' | 'on_vacation' | 'pending_approval';
  is_featured?: boolean;
  is_verified?: boolean;
  city_id?: string;
  governorate_id?: string;
  business_hours?: BusinessHours | null;
};

type SortOption = 'rating' | 'delivery_time' | 'delivery_fee';

interface ProvidersClientProps {
  initialProviders: Provider[];
}

export default function ProvidersClient({ initialProviders }: ProvidersClientProps) {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  const previewToken = searchParams.get('preview');

  // SDUI integration
  const { isSectionVisible, getSectionContent } = useSDUI({
    page: 'providers',
    userRole: 'customer',
    previewToken,
  });

  const [providers, setProviders] = useState<Provider[]>(initialProviders);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFromUrl || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption | null>(null);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  const [productMatchedProviderIds, setProductMatchedProviderIds] = useState<Set<string>>(
    new Set()
  );
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  // Update category when URL changes
  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  // Get location from context
  const {
    cityId: userCityId,
    governorateId: userGovernorateId,
    cityName: userCityNameObj,
    governorateName: userGovernorateNameObj,
    isLoading: isLocationLoading,
  } = useUserLocation();

  // Get display name based on locale
  const userCityName = userCityNameObj
    ? locale === 'ar'
      ? userCityNameObj.ar
      : userCityNameObj.en
    : userGovernorateNameObj
      ? locale === 'ar'
        ? userGovernorateNameObj.ar
        : userGovernorateNameObj.en
      : null;

  // Favorites hook
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites();

  // Re-fetch providers when location or category changes
  useEffect(() => {
    if (!isLocationLoading && (userCityId || userGovernorateId)) {
      fetchProviders();
    }
  }, [selectedCategory, userCityId, userGovernorateId, isLocationLoading]);

  // Smart Arabic text normalization for search
  const normalizeArabicText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .replace(/[ةه]/g, 'ه')
      .replace(/[أإآا]/g, 'ا')
      .replace(/[يى]/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // Search products to find providers that sell matching items
  const searchProducts = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setProductMatchedProviderIds(new Set());
        return;
      }

      setIsSearchingProducts(true);
      try {
        const supabase = createClient();
        const normalizedQuery = normalizeArabicText(query);

        // Fetch all products with their providers
        const productsQuery = supabase
          .from('menu_items')
          .select(
            'id, name_ar, name_en, description_ar, description_en, provider_id, provider:providers!inner (id, city_id, governorate_id, status)'
          )
          .eq('is_available', true);

        const { data: productsData } = await productsQuery;

        // Filter products client-side for better Arabic matching
        const matchingProviderIds = new Set<string>();

        (productsData || []).forEach((p: any) => {
          const provider = p.provider;
          if (!provider) return;

          // Location filter
          if (userCityId && provider.city_id !== userCityId) return;
          if (!userCityId && userGovernorateId && provider.governorate_id !== userGovernorateId)
            return;

          // Provider must be active
          if (!['open', 'closed'].includes(provider.status)) return;

          const nameAr = normalizeArabicText(p.name_ar || '');
          const nameEn = (p.name_en || '').toLowerCase();
          const descAr = normalizeArabicText(p.description_ar || '');
          const descEn = (p.description_en || '').toLowerCase();

          if (
            nameAr.includes(normalizedQuery) ||
            nameEn.includes(normalizedQuery) ||
            descAr.includes(normalizedQuery) ||
            descEn.includes(normalizedQuery)
          ) {
            matchingProviderIds.add(p.provider_id);
          }
        });

        setProductMatchedProviderIds(matchingProviderIds);
      } catch (error) {
        console.error('Product search error:', error);
      } finally {
        setIsSearchingProducts(false);
      }
    },
    [userCityId, userGovernorateId, normalizeArabicText]
  );

  // Search products when search query changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchProducts]);

  // Filter and sort providers client-side
  const filteredProviders = useMemo(() => {
    let result = [...providers];

    // Location filter (applied to initial data)
    if (userCityId) {
      result = result.filter((p) => p.city_id === userCityId);
    } else if (userGovernorateId) {
      result = result.filter((p) => p.governorate_id === userGovernorateId);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Search filter - includes stores matching by name OR stores that sell matching products
    if (searchQuery) {
      const normalizedQuery = normalizeArabicText(searchQuery);
      result = result.filter((p) => {
        // Check if provider matches by name/description
        const nameAr = normalizeArabicText(p.name_ar || '');
        const nameEn = (p.name_en || '').toLowerCase();
        const descAr = normalizeArabicText(p.description_ar || '');
        const descEn = (p.description_en || '').toLowerCase();

        const matchesByName =
          nameAr.includes(normalizedQuery) ||
          nameEn.includes(normalizedQuery) ||
          descAr.includes(normalizedQuery) ||
          descEn.includes(normalizedQuery);

        // Check if provider has matching products
        const hasMatchingProducts = productMatchedProviderIds.has(p.id);

        return matchesByName || hasMatchingProducts;
      });
    }

    // Open only filter
    if (showOpenOnly) {
      result = result.filter((p) => p.status === 'open');
    }

    // Offers filter (featured providers)
    if (showOffersOnly) {
      result = result.filter((p) => p.is_featured);
    }

    // Sort
    if (sortBy) {
      result.sort((a, b) => {
        switch (sortBy) {
          case 'rating':
            return b.rating - a.rating;
          case 'delivery_time':
            return a.estimated_delivery_time_min - b.estimated_delivery_time_min;
          case 'delivery_fee':
            return a.delivery_fee - b.delivery_fee;
          default:
            return 0;
        }
      });
    }

    return result;
  }, [
    providers,
    searchQuery,
    sortBy,
    showOpenOnly,
    showOffersOnly,
    selectedCategory,
    userCityId,
    userGovernorateId,
    productMatchedProviderIds,
    normalizeArabicText,
  ]);

  async function fetchProviders() {
    setLoading(true);
    try {
      const supabase = createClient();

      let query = supabase
        .from('providers')
        .select(
          'id, name_ar, name_en, description_ar, description_en, category, logo_url, cover_image_url, rating, total_reviews, delivery_fee, min_order_amount, estimated_delivery_time_min, status, is_featured, is_verified, city_id, governorate_id, business_hours'
        )
        .in('status', ['open', 'closed'])
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false });

      // STRICT filtering by city or governorate
      if (userCityId) {
        query = query.eq('city_id', userCityId);
      } else if (userGovernorateId) {
        query = query.eq('governorate_id', userGovernorateId);
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) {
        setProviders([]);
      } else {
        // Check which providers have delivery zones configured
        if (data && data.length > 0) {
          const providerIds = data.map((p) => p.id);
          const { data: zones } = await supabase
            .from('provider_delivery_zones')
            .select('provider_id')
            .in('provider_id', providerIds)
            .eq('is_active', true);

          const providersWithZones = new Set((zones || []).map((z) => z.provider_id));
          setProviders(
            data.map((p) => ({ ...p, has_delivery_zones: providersWithZones.has(p.id) }))
          );
        } else {
          setProviders(data || []);
        }
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }

  // Updated February 2026 - Added home_cooked category
  const categories = [
    { id: 'all', name_ar: 'الكل', name_en: 'All' },
    { id: 'restaurant_cafe', name_ar: 'مطاعم', name_en: 'Restaurants' },
    { id: 'coffee_patisserie', name_ar: 'البن والحلويات', name_en: 'Coffee & Patisserie' },
    { id: 'grocery', name_ar: 'سوبر ماركت', name_en: 'Supermarket' },
    { id: 'vegetables_fruits', name_ar: 'خضروات وفواكه', name_en: 'Fruits & Vegetables' },
    { id: 'pharmacy', name_ar: 'صيدليات', name_en: 'Pharmacies' },
    { id: 'home_cooked', name_ar: 'أكل بيتي', name_en: 'Home Food' },
  ];

  const handleSortToggle = (option: SortOption) => {
    setSortBy(sortBy === option ? null : option);
  };

  // Check if location is not set after loading completes
  const noLocationSet = !isLocationLoading && !userGovernorateId && !userCityId;

  // Show location required message if no location is set
  if (noLocationSet) {
    return (
      <CustomerLayout showHeader={true} showBottomNav={true}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Navigation className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            {locale === 'ar' ? 'حدد موقعك أولاً' : 'Select Your Location First'}
          </h1>
          <p className="text-slate-500 mb-6 max-w-sm">
            {locale === 'ar'
              ? 'لعرض المتاجر القريبة منك، يرجى اختيار موقعك أولاً'
              : 'To show stores near you, please select your location first'}
          </p>
          <Link
            href={`/${locale}/welcome`}
            className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            {locale === 'ar' ? 'اختيار الموقع' : 'Select Location'}
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout showHeader={true} showBottomNav={true}>
      {/* Page Content */}
      <div className="px-4 py-4">
        {/* Page Title with Location - SDUI: providers_header */}
        {isSectionVisible('providers_header') && (
          <div className="mb-4">
            <h1 className="text-xl font-bold text-slate-900">
              {getSectionContent('providers_header', locale as 'ar' | 'en').title ||
                (locale === 'ar' ? 'مقدمو الخدمات' : 'Providers')}
            </h1>
            <p className="text-slate-500 text-sm">
              {userCityName
                ? locale === 'ar'
                  ? `متاجر متاحة في ${userCityName}`
                  : `Stores available in ${userCityName}`
                : locale === 'ar'
                  ? 'اطلب من أفضل المطاعم والمتاجر'
                  : 'Order from the best restaurants and stores'}
            </p>
          </div>
        )}

        {/* Search Bar - SDUI: providers_search */}
        {isSectionVisible('providers_search') && (
          <div className="mb-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={setSearchQuery}
              placeholder={
                getSectionContent('providers_search', locale as 'ar' | 'en').placeholder ||
                (locale === 'ar' ? 'ابحث عن متجر أو منتج...' : 'Search for a store or product...')
              }
            />
            {/* Link to full search page */}
            {searchQuery && (
              <Link
                href={`/${locale}/search?q=${encodeURIComponent(searchQuery)}`}
                className="flex items-center justify-center gap-2 mt-2 text-sm text-primary hover:text-primary/80 transition-colors py-2"
              >
                <span>
                  {locale === 'ar'
                    ? `عرض جميع نتائج البحث عن "${searchQuery}"`
                    : `View all search results for "${searchQuery}"`}
                </span>
                <span className="text-xs">→</span>
              </Link>
            )}
          </div>
        )}

        {/* Category Filter - SDUI: providers_categories */}
        {isSectionVisible('providers_categories') && (
          <div
            className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide -mx-4 px-4"
            role="tablist"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                role="tab"
                aria-selected={selectedCategory === category.id}
                aria-label={
                  locale === 'ar'
                    ? `فلتر حسب: ${category.name_ar}`
                    : `Filter by: ${category.name_en}`
                }
                onClick={() => setSelectedCategory(category.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all min-h-[44px] ${
                  selectedCategory === category.id
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/30'
                }`}
              >
                {locale === 'ar' ? category.name_ar : category.name_en}
              </button>
            ))}
          </div>
        )}

        {/* Filter Chips - SDUI: providers_filters */}
        {isSectionVisible('providers_filters') && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide -mx-4 px-4">
            <FilterChip
              label={
                getSectionContent('providers_filters', locale as 'ar' | 'en').openNow ||
                (locale === 'ar' ? 'مفتوح الآن' : 'Open Now')
              }
              isActive={showOpenOnly}
              onClick={() => setShowOpenOnly(!showOpenOnly)}
            />
            <FilterChip
              label={
                getSectionContent('providers_filters', locale as 'ar' | 'en').offers ||
                (locale === 'ar' ? 'عروض' : 'Offers')
              }
              icon={<Percent className="w-3.5 h-3.5" />}
              isActive={showOffersOnly}
              onClick={() => setShowOffersOnly(!showOffersOnly)}
            />
            <FilterChip
              label={
                getSectionContent('providers_filters', locale as 'ar' | 'en').topRated ||
                (locale === 'ar' ? 'الأعلى تقييماً' : 'Top Rated')
              }
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
        )}

        {/* Results count */}
        {!loading && !isSearchingProducts && (
          <div className="text-sm text-slate-500 mb-4">
            {searchQuery && productMatchedProviderIds.size > 0
              ? locale === 'ar'
                ? `${filteredProviders.length} متجر (بما في ذلك متاجر تبيع "${searchQuery}")`
                : `${filteredProviders.length} stores (including stores selling "${searchQuery}")`
              : locale === 'ar'
                ? `${filteredProviders.length} متجر`
                : `${filteredProviders.length} stores found`}
          </div>
        )}

        {/* Searching products indicator */}
        {isSearchingProducts && searchQuery && (
          <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            {locale === 'ar' ? 'جاري البحث في المنتجات...' : 'Searching products...'}
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

        {/* Providers Grid - SDUI: providers_grid */}
        {isSectionVisible('providers_grid') && (
          <>
            {/* Empty State */}
            {!loading && filteredProviders.length === 0 && (
              <EmptyState
                icon="store"
                title={
                  getSectionContent('providers_grid', locale as 'ar' | 'en').noResults ||
                  (locale === 'ar' ? 'لا توجد متاجر' : 'No stores found')
                }
                description={
                  searchQuery
                    ? locale === 'ar'
                      ? 'جرب البحث بكلمات أخرى'
                      : 'Try searching with different keywords'
                    : locale === 'ar'
                      ? 'لا توجد متاجر متاحة في هذا القسم'
                      : 'No stores available in this category'
                }
                actionLabel={
                  searchQuery ? (locale === 'ar' ? 'مسح البحث' : 'Clear search') : undefined
                }
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
                    onFavoriteToggle={
                      isAuthenticated ? () => toggleFavorite(provider.id) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
