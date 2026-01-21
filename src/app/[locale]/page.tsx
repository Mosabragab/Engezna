'use client';

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { CustomerLayout } from '@/components/customer/layout';
import {
  HeroSection,
  CategoriesSection,
  OffersCarousel,
  ReorderSection,
  TopRatedSection,
  NearbySection,
} from '@/components/customer/home';
import { ChatFAB, SmartAssistant } from '@/components/customer/chat';
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

export default function HomePage() {
  const locale = useLocale();
  const router = useRouter();
  const { addItem, clearCart } = useCart();

  // Use LocationContext for cached location data (single source of truth)
  const { userLocation, isDataLoaded, isUserLocationLoading } = useLocation();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<LastOrderDisplay | null>(null);
  const [nearbyProviders, setNearbyProviders] = useState<any[]>([]);
  const [topRatedProviders, setTopRatedProviders] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>();
  const [isReordering, setIsReordering] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [earlyRedirectDone, setEarlyRedirectDone] = useState(false);

  // Track if we've already loaded providers to avoid duplicate calls
  const providersLoadedRef = useRef(false);
  const lastLocationRef = useRef<string | null>(null);

  // FAST CHECK: Check localStorage immediately on mount (before any async operations)
  // This ensures new visitors are redirected to welcome page ASAP
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check localStorage synchronously for guest location
    const guestLocation = guestLocationStorage.get();

    // If no location saved, redirect to welcome immediately (for guests)
    // Don't wait for auth check - just redirect fast, welcome page will handle logged-in users
    if (!guestLocation?.governorateId) {
      setEarlyRedirectDone(true);
      router.replace(`/${locale}/welcome`);
      return;
    }
  }, [locale, router]);

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
        'id, name_ar, name_en, logo_url, cover_image_url, category, status, city_id, governorate_id'
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
        'id, name_ar, name_en, logo_url, cover_image_url, category, status, city_id, governorate_id, rating, is_featured, delivery_fee, estimated_delivery_time_min'
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

  const handleChatClick = () => {
    setIsChatOpen(true);
  };

  const handleSearchClick = () => {
    router.push(`/${locale}/providers`);
  };

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/${locale}/providers?category=${categoryId}`);
  };

  const handleViewAllOffers = () => {
    router.push(`/${locale}/offers`);
  };

  const handleViewAllTopRated = () => {
    router.push(`/${locale}/providers?sort=rating`);
  };

  const handleViewAllNearby = () => {
    router.push(`/${locale}/providers?sort=distance`);
  };

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
          'id, name_ar, name_en, delivery_fee, min_order_amount, estimated_delivery_time_min, commission_rate, category'
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

  const handleViewOrderDetails = (orderId: string) => {
    router.push(`/${locale}/orders/${orderId}`);
  };

  // Show loading while initializing or loading location data
  const isLoading = isInitializing || !isDataLoaded || isUserLocationLoading;

  if (isLoading) {
    return (
      <CustomerLayout showHeader={false} showBottomNav={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  // If no location after loading, the useEffect will redirect - show loading in meantime
  if (!userLocation.governorateId) {
    return (
      <CustomerLayout showHeader={false} showBottomNav={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout showHeader={true} showBottomNav={true}>
      <div className="pb-4">
        {/* Hero Section with Chat CTA */}
        <HeroSection onChatClick={handleChatClick} onSearchClick={handleSearchClick} />

        {/* Categories */}
        <CategoriesSection onCategoryClick={handleCategoryClick} className="mt-4" />

        {/* Offers Carousel - Fetches from database automatically */}
        <OffersCarousel onViewAll={handleViewAllOffers} className="mt-6" />

        {/* Reorder Section */}
        <ReorderSection
          lastOrder={lastOrder}
          onReorder={handleReorder}
          onViewDetails={handleViewOrderDetails}
          className="mt-2"
        />

        {/* Top Rated */}
        <TopRatedSection
          providers={topRatedProviders}
          onViewAll={handleViewAllTopRated}
          className="mt-2"
        />

        {/* Nearby */}
        <NearbySection
          providers={nearbyProviders}
          onViewAll={handleViewAllNearby}
          className="mt-2"
        />
      </div>

      {/* AI Smart Assistant */}
      <ChatFAB onClick={() => setIsChatOpen(!isChatOpen)} isOpen={isChatOpen} />
      <SmartAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userId={userId}
        cityId={userLocation.cityId || undefined}
        governorateId={userLocation.governorateId || undefined}
      />
    </CustomerLayout>
  );
}
