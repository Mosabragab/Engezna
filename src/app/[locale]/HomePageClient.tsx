'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CustomerLayout } from '@/components/customer/layout';
import { HeroSection } from '@/components/customer/home';
import { useSDUI } from '@/hooks/sdui';

// Lazy load below-the-fold sections to improve FCP and reduce initial bundle
const CategoriesSection = dynamic(
  () => import('@/components/customer/home').then((mod) => mod.CategoriesSection),
  {
    loading: () => (
      <div className="mt-6 px-4">
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
    ),
  }
);

const DeliveryModeSelector = dynamic(
  () => import('@/components/customer/home').then((mod) => mod.DeliveryModeSelector),
  {
    loading: () => (
      <div className="mt-3 px-4">
        <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    ),
  }
);

const ReorderSection = dynamic(
  () => import('@/components/customer/home').then((mod) => mod.ReorderSection),
  {
    loading: () => (
      <div className="mt-2 px-4">
        <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    ),
  }
);

const TopRatedSection = dynamic(
  () => import('@/components/customer/home').then((mod) => mod.TopRatedSection),
  {
    loading: () => (
      <div className="mt-2 px-4">
        <div className="h-6 w-32 bg-slate-100 rounded animate-pulse mb-3" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-36 h-44 bg-slate-100 rounded-2xl animate-pulse shrink-0" />
          ))}
        </div>
      </div>
    ),
  }
);

const NearbySection = dynamic(
  () => import('@/components/customer/home').then((mod) => mod.NearbySection),
  {
    loading: () => (
      <div className="mt-2 px-4">
        <div className="h-6 w-32 bg-slate-100 rounded animate-pulse mb-3" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-36 h-44 bg-slate-100 rounded-2xl animate-pulse shrink-0" />
          ))}
        </div>
      </div>
    ),
  }
);

// Lazy load OffersCarousel to defer framer-motion (~40KB) from initial bundle
const OffersCarousel = dynamic(
  () => import('@/components/customer/home').then((mod) => mod.OffersCarousel),
  {
    loading: () => (
      <div className="mt-4 px-4">
        <div className="flex gap-3 overflow-hidden">
          {[1, 2].map((i) => (
            <div key={i} className="w-72 h-36 bg-slate-100 rounded-2xl animate-pulse shrink-0" />
          ))}
        </div>
      </div>
    ),
  }
);

// AI Chat components disabled for initial launch - see docs/features/AI_SMART_ASSISTANT.md
// To re-enable, uncomment the following and set NEXT_PUBLIC_AI_ASSISTANT_ENABLED=true
// const ChatFAB = dynamic(() => import('@/components/customer/chat').then((mod) => mod.ChatFAB), {
//   ssr: false,
// });
// const SmartAssistant = dynamic(
//   () => import('@/components/customer/chat').then((mod) => mod.SmartAssistant),
//   { ssr: false }
// );
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/lib/store/cart';
import { useLocation } from '@/lib/contexts/LocationContext';
import { guestLocationStorage } from '@/lib/hooks/useGuestLocation';
import { Loader2 } from 'lucide-react';

// Type for last order display
interface LastOrderDisplay {
  id: string;
  providerName: string;
  providerNameAr: string;
  providerLogo?: string;
  providerId: string;
  items: string[];
  itemsAr: string[];
  total: number;
  createdAt: Date;
}

export interface HomePageClientProps {
  initialTopRated: any[];
}

export default function HomePageClient({ initialTopRated }: HomePageClientProps) {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem, clearCart } = useCart();

  // Use LocationContext for cached location data (single source of truth)
  const { userLocation, isDataLoaded, isUserLocationLoading } = useLocation();

  // SDUI: Get sections configuration from database
  const previewToken = searchParams.get('preview');
  const { sections, isSectionVisible } = useSDUI({
    userRole: 'customer',
    governorateId: userLocation.governorateId,
    cityId: userLocation.cityId,
    previewToken,
  });

  // AI Chat disabled - see docs/features/AI_SMART_ASSISTANT.md
  // const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<LastOrderDisplay | null>(null);
  const [nearbyProviders, setNearbyProviders] = useState<any[]>([]);
  const [topRatedProviders, setTopRatedProviders] = useState<any[]>(initialTopRated);
  const [userId, setUserId] = useState<string | undefined>();
  const [isReordering, setIsReordering] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // SYNCHRONOUS CHECK: Determine on first render if we need to redirect to welcome.
  // Using lazy initializer so localStorage is read before the first paint,
  // preventing a flash of the homepage skeleton before redirect.
  const [earlyRedirectDone] = useState(() => {
    if (typeof window === 'undefined') return false;
    const guestLocation = guestLocationStorage.get();
    return !guestLocation?.governorateId;
  });

  // Track if we've already loaded providers to avoid duplicate calls
  const providersLoadedRef = useRef(false);
  const lastLocationRef = useRef<string | null>(null);

  // Perform the actual redirect (useEffect is still needed for router.replace)
  useEffect(() => {
    if (earlyRedirectDone) {
      router.replace(`/${locale}/welcome`);
    }
  }, [earlyRedirectDone, locale, router]);

  // Single auth check on mount - just to get userId for orders
  useEffect(() => {
    async function initAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
      setIsInitializing(false);
    }
    initAuth();
  }, []);

  // Check location and redirect if needed (using LocationContext data)
  // This is a fallback for edge cases where early redirect didn't catch it
  useEffect(() => {
    if (earlyRedirectDone) return; // Already redirected
    if (isInitializing || !isDataLoaded || isUserLocationLoading) return;

    // No location set - redirect
    if (!userLocation.governorateId) {
      if (userId) {
        // Logged-in user without location
        router.replace(`/${locale}/profile/governorate`);
      } else {
        // Guest without location
        router.replace(`/${locale}/welcome`);
      }
    }
  }, [
    earlyRedirectDone,
    isInitializing,
    isDataLoaded,
    isUserLocationLoading,
    userLocation.governorateId,
    userId,
    locale,
    router,
  ]);

  // Load providers when location changes (from LocationContext)
  useEffect(() => {
    if (!isDataLoaded || isUserLocationLoading || !userLocation.governorateId) return;

    // Create a location key to track changes
    const locationKey = `${userLocation.governorateId}-${userLocation.cityId || ''}`;

    // Only reload if location actually changed
    if (lastLocationRef.current === locationKey && providersLoadedRef.current) return;

    lastLocationRef.current = locationKey;
    providersLoadedRef.current = true;

    // Fetch providers using cached location data
    fetchNearbyProviders(userLocation.cityId, userLocation.governorateId);
    fetchTopRatedProviders(userLocation.cityId, userLocation.governorateId);
  }, [isDataLoaded, isUserLocationLoading, userLocation.governorateId, userLocation.cityId]);

  // Load last order only when userId is available
  useEffect(() => {
    if (userId) {
      loadLastOrder(userId);
    }
  }, [userId]);

  // Listen for location changes from context
  useEffect(() => {
    const handleLocationChange = () => {
      // Reset the loaded flag to allow reload on location change
      providersLoadedRef.current = false;
    };
    window.addEventListener('locationChanged', handleLocationChange);
    window.addEventListener('guestLocationChanged', handleLocationChange);
    return () => {
      window.removeEventListener('locationChanged', handleLocationChange);
      window.removeEventListener('guestLocationChanged', handleLocationChange);
    };
  }, []);

  // Load last completed order for reorder section
  const loadLastOrder = useCallback(async (currentUserId: string) => {
    const supabase = createClient();

    // Fetch last delivered order with provider and items
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        total,
        created_at,
        provider_id,
        providers:provider_id (
          id,
          name_ar,
          name_en,
          logo_url
        ),
        order_items (
          quantity,
          item_name_ar,
          item_name_en
        )
      `
      )
      .eq('customer_id', currentUserId)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !order) {
      setLastOrder(null);
      return;
    }

    const provider = order.providers as any;
    const items = order.order_items as any[];

    setLastOrder({
      id: order.id,
      providerId: order.provider_id,
      providerName: provider?.name_en || 'Provider',
      providerNameAr: provider?.name_ar || 'المتجر',
      providerLogo: provider?.logo_url || undefined,
      items: items.map((i) => `${i.quantity} ${i.item_name_en}`),
      itemsAr: items.map((i) => `${i.quantity} ${i.item_name_ar}`),
      total: order.total,
      createdAt: new Date(order.created_at),
    });
  }, []);

  async function fetchNearbyProviders(cityId: string | null, governorateId: string | null = null) {
    const supabase = createClient();

    // Build query with proper filtering
    let query = supabase
      .from('providers')
      .select(
        'id, name_ar, name_en, logo_url, cover_image_url, category, status, city_id, governorate_id, rating, is_featured, is_verified, delivery_fee, estimated_delivery_time_min, total_reviews, min_order_amount, business_hours'
      )
      .in('status', ['open', 'closed']);

    // Filter by city or governorate - STRICT filtering
    if (cityId) {
      query = query.eq('city_id', cityId);
    } else if (governorateId) {
      query = query.eq('governorate_id', governorateId);
    }

    const { data } = await query.limit(10);

    if (data) {
      // Add mock distance for demo
      const withDistance = data.slice(0, 6).map((p, i) => ({
        ...p,
        distance: 0.5 + i * 0.3,
      }));
      setNearbyProviders(withDistance);
    } else {
      setNearbyProviders([]);
    }
  }

  async function fetchTopRatedProviders(
    cityId: string | null,
    governorateId: string | null = null
  ) {
    const supabase = createClient();

    // Build query with proper filtering
    let query = supabase
      .from('providers')
      .select(
        'id, name_ar, name_en, logo_url, cover_image_url, category, status, city_id, governorate_id, rating, is_featured, is_verified, delivery_fee, estimated_delivery_time_min, total_reviews, min_order_amount, business_hours'
      )
      .in('status', ['open', 'closed']);

    // Filter by city or governorate - STRICT filtering
    if (cityId) {
      query = query.eq('city_id', cityId);
    } else if (governorateId) {
      query = query.eq('governorate_id', governorateId);
    }

    const { data } = await query
      .order('is_featured', { ascending: false })
      .order('rating', { ascending: false })
      .limit(10);

    if (data) {
      setTopRatedProviders(data.slice(0, 6));
    } else {
      setTopRatedProviders([]);
    }
  }

  // AI Chat disabled - see docs/features/AI_SMART_ASSISTANT.md
  const handleChatClick = useCallback(() => {
    // setIsChatOpen(true);
  }, []);

  const handleSearchClick = useCallback(() => {
    router.push(`/${locale}/search`);
  }, [router, locale]);

  const handleSearch = useCallback(
    (query: string) => {
      router.push(`/${locale}/search?q=${encodeURIComponent(query)}`);
    },
    [router, locale]
  );

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      router.push(`/${locale}/providers?category=${categoryId}`);
    },
    [router, locale]
  );

  const handleViewAllOffers = useCallback(() => {
    router.push(`/${locale}/offers`);
  }, [router, locale]);

  const handleViewAllTopRated = useCallback(() => {
    router.push(`/${locale}/providers?sort=rating`);
  }, [router, locale]);

  const handleViewAllNearby = useCallback(() => {
    router.push(`/${locale}/providers?sort=distance`);
  }, [router, locale]);

  const handleReorder = async (orderId: string) => {
    if (isReordering || !lastOrder) return;
    setIsReordering(true);

    try {
      const supabase = createClient();

      // Fetch order items with their menu_item_id
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('menu_item_id, quantity')
        .eq('order_id', orderId);

      if (itemsError || !orderItems || orderItems.length === 0) {
        router.push(`/${locale}/orders/${orderId}`);
        return;
      }

      // Fetch the provider info
      const { data: provider, error: providerError } = await supabase
        .from('providers')
        .select(
          'id, name_ar, name_en, delivery_fee, min_order_amount, estimated_delivery_time_min, commission_rate, category, logo_url'
        )
        .eq('id', lastOrder.providerId)
        .single();

      if (providerError || !provider) {
        router.push(`/${locale}/orders/${orderId}`);
        return;
      }

      // Fetch menu items that are still available
      const menuItemIds = orderItems.map((item) => item.menu_item_id).filter(Boolean);

      if (menuItemIds.length === 0) {
        router.push(`/${locale}/providers/${lastOrder.providerId}`);
        return;
      }

      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .in('id', menuItemIds)
        .eq('is_available', true);

      if (menuError || !menuItems || menuItems.length === 0) {
        // No items available, redirect to provider page
        router.push(`/${locale}/providers/${lastOrder.providerId}`);
        return;
      }

      // Clear existing cart and add items
      clearCart();

      // Add each available item to cart
      for (const orderItem of orderItems) {
        const menuItem = menuItems.find((m) => m.id === orderItem.menu_item_id);
        if (menuItem) {
          // Add item with quantity
          for (let i = 0; i < orderItem.quantity; i++) {
            addItem(menuItem, provider);
          }
        }
      }

      // Navigate to checkout
      router.push(`/${locale}/checkout`);
    } catch (error) {
      router.push(`/${locale}/orders/${orderId}`);
    } finally {
      setIsReordering(false);
    }
  };

  const handleViewOrderDetails = useCallback(
    (orderId: string) => {
      router.push(`/${locale}/orders/${orderId}`);
    },
    [router, locale]
  );

  // If redirecting to welcome, render nothing to avoid a flash of the homepage skeleton
  if (earlyRedirectDone) {
    return null;
  }

  // Show loading only while location data is loading.
  // Auth (isInitializing) is NOT a blocker — the page renders with ISR data
  // immediately and auth-dependent sections (reorder) appear when ready.
  const isLoading = !isDataLoaded || isUserLocationLoading;

  if (isLoading) {
    return (
      <CustomerLayout showHeader={true} showBottomNav={true}>
        <div className="min-h-screen">
          {/* Skeleton hero — matches HeroSection: pt-8 pb-10, text-center */}
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
          {/* Skeleton banners — matches OffersCarousel min-h */}
          <div className="min-h-[220px] md:min-h-[280px] px-4 py-6">
            <div className="h-7 w-28 bg-slate-100 rounded-lg animate-pulse mb-5" />
            <div className="flex gap-4 overflow-hidden">
              <div className="w-[85%] shrink-0 aspect-[16/9] rounded-2xl bg-slate-100 animate-pulse" />
              <div className="w-[85%] shrink-0 aspect-[16/9] rounded-2xl bg-slate-100 animate-pulse" />
            </div>
          </div>
          {/* Skeleton categories — matches CategoriesSection grid */}
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
      </CustomerLayout>
    );
  }

  // If no location after loading, the useEffect will redirect - show loading in meantime
  if (!userLocation.governorateId) {
    return (
      <CustomerLayout showHeader={true} showBottomNav={true}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  // Build sections based on SDUI configuration
  const renderSection = (sectionKey: string) => {
    if (!isSectionVisible(sectionKey)) return null;

    switch (sectionKey) {
      case 'hero_search':
        return (
          <HeroSection
            key="hero_search"
            onSearch={handleSearch}
            onSearchClick={handleSearchClick}
          />
        );
      case 'address_selector':
      case 'delivery_mode':
        // New combined delivery mode selector (replaces old address_selector)
        return <DeliveryModeSelector key="delivery_mode" className="mt-3" />;
      case 'offers_carousel':
        return (
          <div key="offers_carousel" className="min-h-[220px] md:min-h-[280px]">
            <OffersCarousel onViewAll={handleViewAllOffers} className="mt-4" />
          </div>
        );
      case 'categories':
        return (
          <div key="categories" className="min-h-[180px]">
            <CategoriesSection onCategoryClick={handleCategoryClick} className="mt-6" />
          </div>
        );
      case 'reorder':
        // Only reserve space if there's a last order
        if (!lastOrder) return null;
        return (
          <div key="reorder" className="min-h-[100px]">
            <ReorderSection
              lastOrder={lastOrder}
              onReorder={handleReorder}
              onViewDetails={handleViewOrderDetails}
              className="mt-2"
            />
          </div>
        );
      case 'top_rated':
        return (
          <div key="top_rated" className="min-h-[220px]">
            <TopRatedSection
              providers={topRatedProviders}
              onViewAll={handleViewAllTopRated}
              className="mt-2"
            />
          </div>
        );
      case 'nearby':
        return (
          <div key="nearby" className="min-h-[220px]">
            <NearbySection
              providers={nearbyProviders}
              onViewAll={handleViewAllNearby}
              className="mt-2"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <CustomerLayout showHeader={true} showBottomNav={true}>
      <div className="pb-4">
        {/* SDUI: Render sections based on database configuration */}
        {sections
          .sort((a, b) => a.display_order - b.display_order)
          .map((section) => renderSection(section.section_key))}
      </div>

      {/* AI Smart Assistant - Disabled for initial launch */}
      {/* To re-enable, set NEXT_PUBLIC_AI_ASSISTANT_ENABLED=true and uncomment below */}
      {/* See docs/features/AI_SMART_ASSISTANT.md for details */}
      {/* <ChatFAB onClick={() => setIsChatOpen(!isChatOpen)} isOpen={isChatOpen} />
      <SmartAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userId={userId}
        cityId={userLocation.cityId || undefined}
        governorateId={userLocation.governorateId || undefined}
      /> */}
    </CustomerLayout>
  );
}
