'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CustomerLayout } from '@/components/customer/layout';
import { ProviderCard, ProductCard, EmptyState } from '@/components/customer/shared';
import { useUserLocation } from '@/lib/contexts';
import { useFavorites } from '@/hooks/customer';
import {
  Search,
  X,
  Store,
  ShoppingBag,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/lib/store/cart';

interface Provider {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  rating: number;
  total_reviews: number;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
  status: 'open' | 'closed' | 'temporarily_paused' | 'on_vacation' | 'pending_approval';
  is_featured?: boolean;
  city_id?: string;
  governorate_id?: string;
}

interface ProductProvider {
  id: string;
  name_ar: string;
  name_en: string | null;
  logo_url: string | null;
  status: string;
  city_id: string | null;
  governorate_id: string | null;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
}

interface Product {
  id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  is_available: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  preparation_time_min: number;
  provider_id: string;
  provider: ProductProvider;
}

// Arabic text normalization for better search
function normalizeArabicText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ةه]/g, 'ه')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[يى]/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // Remove tashkeel
    .replace(/\s+/g, ' ')
    .trim();
}

export default function SearchPage() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'stores' | 'products'>('all');

  const { cityId, governorateId } = useUserLocation();
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites();
  const { addItem, getItemQuantity, updateQuantity, provider: cartProvider } = useCart();

  const isRTL = locale === 'ar';
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Handle add to cart
  const handleAddToCart = (product: Product) => {
    const menuItem = {
      id: product.id,
      provider_id: product.provider_id,
      name_ar: product.name_ar,
      name_en: product.name_en || product.name_ar,
      description_ar: product.description_ar,
      description_en: product.description_en,
      price: product.price,
      original_price: product.original_price,
      image_url: product.image_url,
      is_available: product.is_available,
      is_vegetarian: product.is_vegetarian,
      is_spicy: product.is_spicy,
      preparation_time_min: product.preparation_time_min,
    };

    const provider = {
      id: product.provider.id,
      name_ar: product.provider.name_ar,
      name_en: product.provider.name_en || product.provider.name_ar,
      delivery_fee: product.provider.delivery_fee,
      min_order_amount: product.provider.min_order_amount,
      estimated_delivery_time_min: product.provider.estimated_delivery_time_min,
    };

    const result = addItem(menuItem, provider);

    if (result.requiresConfirmation) {
      // Show confirmation dialog for provider switch
      const confirmSwitch = window.confirm(
        locale === 'ar'
          ? `سلتك تحتوي على منتجات من ${result.currentProviderName}. هل تريد مسح السلة وإضافة منتج من ${result.newProviderName}؟`
          : `Your cart contains items from ${result.currentProviderName}. Do you want to clear the cart and add item from ${result.newProviderName}?`
      );
      if (confirmSwitch) {
        useCart.getState().confirmProviderSwitch();
      }
    }
  };

  // Handle quantity change
  const handleQuantityChange = (product: Product, newQuantity: number) => {
    if (newQuantity === 0) {
      updateQuantity(product.id, 0);
    } else if (newQuantity > getItemQuantity(product.id)) {
      handleAddToCart(product);
    } else {
      updateQuantity(product.id, newQuantity);
    }
  };

  // Perform search
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setProviders([]);
        setProducts([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);

      try {
        const supabase = createClient();
        const normalizedQuery = normalizeArabicText(query);

        // Search providers
        let providersQuery = supabase
          .from('providers')
          .select(
            'id, name_ar, name_en, description_ar, description_en, category, logo_url, cover_image_url, rating, total_reviews, delivery_fee, min_order_amount, estimated_delivery_time_min, status, is_featured, city_id, governorate_id'
          )
          .in('status', ['open', 'closed']);

        // Location filter
        if (cityId) {
          providersQuery = providersQuery.eq('city_id', cityId);
        } else if (governorateId) {
          providersQuery = providersQuery.eq('governorate_id', governorateId);
        }

        const { data: providersData } = await providersQuery;

        // Filter providers client-side for better Arabic matching
        const filteredProviders: Provider[] = (providersData || [])
          .filter((p: any) => {
            const nameAr = normalizeArabicText(p.name_ar || '');
            const nameEn = (p.name_en || '').toLowerCase();
            const descAr = normalizeArabicText(p.description_ar || '');
            const descEn = (p.description_en || '').toLowerCase();

            return (
              nameAr.includes(normalizedQuery) ||
              nameEn.includes(normalizedQuery) ||
              descAr.includes(normalizedQuery) ||
              descEn.includes(normalizedQuery)
            );
          })
          .map((p: any) => ({
            id: p.id,
            name_ar: p.name_ar,
            name_en: p.name_en || p.name_ar, // Fallback to Arabic name if English is null
            description_ar: p.description_ar,
            description_en: p.description_en,
            category: p.category,
            logo_url: p.logo_url,
            cover_image_url: p.cover_image_url,
            rating: p.rating || 0,
            total_reviews: p.total_reviews || 0,
            delivery_fee: p.delivery_fee || 0,
            min_order_amount: p.min_order_amount || 0,
            estimated_delivery_time_min: p.estimated_delivery_time_min || 30,
            status: p.status as Provider['status'],
            is_featured: p.is_featured,
            city_id: p.city_id,
            governorate_id: p.governorate_id,
          }));

        // Search products
        let productsQuery = supabase
          .from('menu_items')
          .select(
            `
          id, name_ar, name_en, description_ar, description_en, price, original_price, image_url, is_available, is_vegetarian, is_spicy, preparation_time_min, provider_id,
          provider:providers!inner (id, name_ar, name_en, logo_url, status, city_id, governorate_id, delivery_fee, min_order_amount, estimated_delivery_time_min)
        `
          )
          .eq('is_available', true);

        const { data: productsData } = await productsQuery;

        // Filter products client-side for better Arabic matching and location
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filteredProducts: Product[] = (productsData || [])
          .filter((p: any) => {
            const provider = p.provider;
            if (!provider) return false;

            // Location filter
            if (cityId && provider.city_id !== cityId) return false;
            if (!cityId && governorateId && provider.governorate_id !== governorateId) return false;

            // Provider must be active
            if (!['open', 'closed'].includes(provider.status)) return false;

            const nameAr = normalizeArabicText(p.name_ar || '');
            const nameEn = (p.name_en || '').toLowerCase();
            const descAr = normalizeArabicText(p.description_ar || '');
            const descEn = (p.description_en || '').toLowerCase();

            return (
              nameAr.includes(normalizedQuery) ||
              nameEn.includes(normalizedQuery) ||
              descAr.includes(normalizedQuery) ||
              descEn.includes(normalizedQuery)
            );
          })
          .map((p: any) => ({
            id: p.id,
            name_ar: p.name_ar,
            name_en: p.name_en,
            description_ar: p.description_ar,
            description_en: p.description_en,
            price: p.price,
            original_price: p.original_price,
            image_url: p.image_url,
            is_available: p.is_available,
            is_vegetarian: p.is_vegetarian || false,
            is_spicy: p.is_spicy || false,
            preparation_time_min: p.preparation_time_min || 15,
            provider_id: p.provider_id,
            provider: {
              ...p.provider,
              delivery_fee: p.provider.delivery_fee || 0,
              min_order_amount: p.provider.min_order_amount || 0,
              estimated_delivery_time_min: p.provider.estimated_delivery_time_min || 30,
            } as ProductProvider,
          }));

        // Get unique provider IDs from matching products
        const productProviderIds = [...new Set(filteredProducts.map((p) => p.provider_id))];

        // Fetch full provider details for stores that have matching products
        let allProviders = [...filteredProviders];

        if (productProviderIds.length > 0) {
          // Get providers that are not already in filteredProviders
          const existingProviderIds = new Set(filteredProviders.map((p) => p.id));
          const newProviderIds = productProviderIds.filter((id) => !existingProviderIds.has(id));

          if (newProviderIds.length > 0) {
            const { data: productProvidersData } = await supabase
              .from('providers')
              .select(
                'id, name_ar, name_en, description_ar, description_en, category, logo_url, cover_image_url, rating, total_reviews, delivery_fee, min_order_amount, estimated_delivery_time_min, status, is_featured, city_id, governorate_id'
              )
              .in('id', newProviderIds);

            if (productProvidersData) {
              const additionalProviders: Provider[] = productProvidersData.map((p: any) => ({
                id: p.id,
                name_ar: p.name_ar,
                name_en: p.name_en || p.name_ar,
                description_ar: p.description_ar,
                description_en: p.description_en,
                category: p.category,
                logo_url: p.logo_url,
                cover_image_url: p.cover_image_url,
                rating: p.rating || 0,
                total_reviews: p.total_reviews || 0,
                delivery_fee: p.delivery_fee || 0,
                min_order_amount: p.min_order_amount || 0,
                estimated_delivery_time_min: p.estimated_delivery_time_min || 30,
                status: p.status as Provider['status'],
                is_featured: p.is_featured,
                city_id: p.city_id,
                governorate_id: p.governorate_id,
              }));

              allProviders = [...filteredProviders, ...additionalProviders];
            }
          }
        }

        setProviders(allProviders);
        setProducts(filteredProducts.slice(0, 20)); // Limit to 20 products
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [cityId, governorateId]
  );

  // Search on initial load if query exists
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  // Handle search submit
  const handleSearch = useCallback(() => {
    const query = inputValue.trim();
    if (query) {
      router.replace(`/${locale}/search?q=${encodeURIComponent(query)}`);
      setSearchQuery(query);
      performSearch(query);
    }
  }, [inputValue, locale, router, performSearch]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear search
  const handleClear = () => {
    setInputValue('');
    setSearchQuery('');
    setProviders([]);
    setProducts([]);
    setHasSearched(false);
    router.replace(`/${locale}/search`);
  };

  // Navigate to product's provider
  const handleProductClick = (product: Product) => {
    router.push(`/${locale}/providers/${product.provider_id}?highlight=${product.id}`);
  };

  // Calculate counts
  const storesCount = providers.length;
  const productsCount = products.length;
  const totalCount = storesCount + productsCount;

  return (
    <CustomerLayout showHeader={false} showBottomNav={true}>
      {/* Custom Header with Search */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            aria-label={locale === 'ar' ? 'رجوع' : 'Back'}
          >
            <BackArrow className="w-5 h-5 text-slate-600" />
          </button>

          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="flex items-center bg-slate-100 rounded-full border border-slate-200 focus-within:ring-2 focus-within:ring-primary focus-within:bg-white focus-within:border-primary transition-all">
              <Search className={`w-5 h-5 text-slate-400 ${isRTL ? 'mr-4' : 'ml-4'}`} />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  locale === 'ar' ? 'ابحث عن متجر أو منتج...' : 'Search for store or product...'
                }
                autoFocus
                className={`flex-1 h-11 bg-transparent outline-none px-3 ${isRTL ? 'text-right' : 'text-left'}`}
              />
              {inputValue && (
                <button
                  onClick={handleClear}
                  className={`w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 ${isRTL ? 'ml-2' : 'mr-2'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {locale === 'ar' ? 'بحث' : 'Search'}
          </button>
        </div>

        {/* Tabs */}
        {hasSearched && !isLoading && totalCount > 0 && (
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {locale === 'ar' ? 'الكل' : 'All'} ({totalCount})
            </button>
            <button
              onClick={() => setActiveTab('stores')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'stores'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Store className="w-4 h-4" />
              {locale === 'ar' ? 'متاجر' : 'Stores'} ({storesCount})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'products'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {locale === 'ar' ? 'منتجات' : 'Products'} ({productsCount})
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Initial State - No Search Yet */}
        {!hasSearched && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-2">
              {locale === 'ar' ? 'ابحث عن أي شيء' : 'Search for anything'}
            </h2>
            <p className="text-slate-500 text-sm max-w-xs">
              {locale === 'ar'
                ? 'ابحث في المتاجر والمنتجات المتاحة في منطقتك'
                : 'Search stores and products available in your area'}
            </p>
          </div>
        )}

        {/* No Results */}
        {hasSearched && !isLoading && totalCount === 0 && (
          <EmptyState
            icon="search"
            title={locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}
            description={
              locale === 'ar'
                ? `لم نجد نتائج لـ "${searchQuery}". جرب كلمات أخرى`
                : `No results for "${searchQuery}". Try different keywords`
            }
          />
        )}

        {/* Results */}
        {hasSearched && !isLoading && totalCount > 0 && (
          <div className="space-y-6">
            {/* Stores Section */}
            {(activeTab === 'all' || activeTab === 'stores') && storesCount > 0 && (
              <section>
                {activeTab === 'all' && (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Store className="w-5 h-5 text-primary" />
                      {locale === 'ar' ? 'المتاجر' : 'Stores'}
                      <span className="text-sm font-normal text-slate-500">({storesCount})</span>
                    </h2>
                    {storesCount > 3 && (
                      <button
                        onClick={() => setActiveTab('stores')}
                        className="text-sm text-primary font-medium"
                      >
                        {locale === 'ar' ? 'عرض الكل' : 'View all'}
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(activeTab === 'all' ? providers.slice(0, 3) : providers).map((provider) => (
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
              </section>
            )}

            {/* Products Section */}
            {(activeTab === 'all' || activeTab === 'products') && productsCount > 0 && (
              <section>
                {activeTab === 'all' && (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                      {locale === 'ar' ? 'المنتجات' : 'Products'}
                      <span className="text-sm font-normal text-slate-500">({productsCount})</span>
                    </h2>
                    {productsCount > 4 && (
                      <button
                        onClick={() => setActiveTab('products')}
                        className="text-sm text-primary font-medium"
                      >
                        {locale === 'ar' ? 'عرض الكل' : 'View all'}
                      </button>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  {(activeTab === 'all' ? products.slice(0, 4) : products).map((product) => {
                    const quantity = getItemQuantity(product.id);
                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-xl border border-slate-100 p-3 flex gap-3 hover:border-primary/30 hover:shadow-sm transition-all"
                      >
                        {/* Product Image - Clickable to navigate */}
                        <div
                          onClick={() => handleProductClick(product)}
                          className="w-20 h-20 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 cursor-pointer"
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={
                                locale === 'ar'
                                  ? product.name_ar
                                  : product.name_en || product.name_ar
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3
                            onClick={() => handleProductClick(product)}
                            className="font-semibold text-slate-900 truncate cursor-pointer hover:text-primary"
                          >
                            {locale === 'ar' ? product.name_ar : product.name_en || product.name_ar}
                          </h3>
                          {product.description_ar && (
                            <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">
                              {locale === 'ar'
                                ? product.description_ar
                                : product.description_en || product.description_ar}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              {product.original_price && product.original_price > product.price && (
                                <span className="text-xs text-slate-400 line-through">
                                  {product.original_price} {locale === 'ar' ? 'ج.م' : 'EGP'}
                                </span>
                              )}
                              <span className="font-bold text-primary">
                                {product.price} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              </span>
                            </div>
                          </div>
                          {/* Provider Info */}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {product.provider.logo_url ? (
                              <img
                                src={product.provider.logo_url}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            ) : (
                              <Store className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="text-xs text-slate-500">
                              {locale === 'ar'
                                ? product.provider.name_ar
                                : product.provider.name_en || product.provider.name_ar}
                            </span>
                          </div>
                        </div>

                        {/* Add to Cart Button */}
                        <div className="flex items-center flex-shrink-0">
                          {quantity > 0 ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(product, quantity - 1);
                                }}
                                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary hover:text-primary transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-6 text-center font-semibold text-sm">
                                {quantity}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuantityChange(product, quantity + 1);
                                }}
                                className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(product);
                              }}
                              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
                              aria-label={locale === 'ar' ? 'أضف للسلة' : 'Add to cart'}
                            >
                              <ShoppingCart className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
