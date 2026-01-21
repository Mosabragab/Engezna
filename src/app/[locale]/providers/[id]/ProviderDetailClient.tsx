'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCart } from '@/lib/store/cart';
import { useFavorites } from '@/hooks/customer';
import { useGuestLocation } from '@/lib/hooks/useGuestLocation';
import { Button } from '@/components/ui/button';
import {
  ProductCard,
  RatingStars,
  StatusBadge,
  EmptyState,
  ProductDetailModal,
} from '@/components/customer/shared';
import { ChatFAB, SmartAssistant } from '@/components/customer/chat';
import { BottomNavigation, CustomerHeader } from '@/components/customer/layout';
import { CustomOrderWelcomeBanner } from '@/components/custom-order';
import {
  Clock,
  Truck,
  MapPin,
  Heart,
  Share2,
  Star,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  User,
  Search,
  X,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { getCoverGradientStyle } from '@/lib/utils/generate-cover';

export type ProviderData = {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  phone: string;
  rating: number;
  total_reviews: number;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
  status: string;
  commission_rate: number;
  city_id: string | null;
  operation_mode?: 'standard' | 'custom' | 'hybrid';
  custom_order_settings?: {
    accepts_text?: boolean;
    accepts_voice?: boolean;
    accepts_image?: boolean;
    pricing_timeout_hours?: number;
    customer_approval_timeout_hours?: number;
    welcome_banner_enabled?: boolean;
    welcome_banner_text_ar?: string;
    welcome_banner_text_en?: string;
  };
  metadata?: { brand_color?: string } | null;
};

type ProductVariant = {
  id: string;
  variant_type: 'size' | 'weight' | 'option';
  name_ar: string;
  name_en: string | null;
  price: number;
  original_price: number | null;
  is_default: boolean;
  display_order: number;
  is_available: boolean;
};

export type MenuItem = {
  id: string;
  provider_id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  original_price?: number | null;
  image_url: string | null;
  is_available: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  preparation_time_min: number;
  category_id?: string | null;
  has_variants?: boolean;
  pricing_type?: 'fixed' | 'per_unit' | 'variants';
  variants?: ProductVariant[];
};

export type MenuCategory = {
  id: string;
  name_ar: string;
  name_en: string;
  display_order: number;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  provider_response: string | null;
  provider_response_at: string | null;
  created_at: string;
  profiles:
    | {
        full_name: string | null;
      }
    | { full_name: string | null }[]
    | null;
};

type Promotion = {
  id: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_value: number;
  name_ar: string;
  name_en: string;
  applies_to: 'all' | 'specific';
  product_ids?: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
};

interface ProviderDetailClientProps {
  initialProvider: ProviderData;
  initialMenuItems: MenuItem[];
  initialCategories: MenuCategory[];
  initialReviews: Review[];
  initialPromotions: Promotion[];
  initialPopularItemIds?: string[];
}

export default function ProviderDetailClient({
  initialProvider,
  initialMenuItems,
  initialCategories,
  initialReviews,
  initialPromotions,
  initialPopularItemIds = [],
}: ProviderDetailClientProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations();

  const {
    addItem,
    removeItem,
    getItemQuantity,
    getTotal,
    getItemCount,
    confirmProviderSwitch,
    cancelProviderSwitch,
    pendingItem,
  } = useCart();
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites();
  const { location: guestLocation } = useGuestLocation();
  const guestCityId = guestLocation.cityId;

  const [provider] = useState<ProviderData>(initialProvider);
  const [userId, setUserId] = useState<string | undefined>();
  const [userCityId, setUserCityId] = useState<string | undefined>();
  const [menuItems] = useState<MenuItem[]>(initialMenuItems);
  const [categories] = useState<MenuCategory[]>(initialCategories);
  const [reviews] = useState<Review[]>(initialReviews);
  const [promotions] = useState<Promotion[]>(initialPromotions);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerSwitchInfo, setProviderSwitchInfo] = useState<{
    show: boolean;
    currentProvider: string;
    newProvider: string;
  } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [orderAgainItems, setOrderAgainItems] = useState<MenuItem[]>([]);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  // Popular items are initialized from server-side data (bypasses RLS)
  const [popularItems] = useState<MenuItem[]>(() => {
    return initialPopularItemIds
      .map((itemId) => initialMenuItems.find((item) => item.id === itemId && item.is_available))
      .filter(Boolean) as MenuItem[];
  });
  const categoriesRef = useRef<HTMLDivElement>(null);

  // Smart Arabic text normalization for search
  const normalizeArabicText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[ةه]/g, 'ه')
      .replace(/[أإآا]/g, 'ا')
      .replace(/[يى]/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Share provider functionality
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = getName(provider);
    const shareText =
      locale === 'ar' ? `تصفح ${shareTitle} على إنجزنا` : `Check out ${shareTitle} on Engezna`;

    // Use Web Share API if available (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed - fallback to copy
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get user info for SmartAssistant
  useEffect(() => {
    async function fetchUserData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('city_id')
          .eq('id', user.id)
          .single();
        if (profile?.city_id) {
          setUserCityId(profile.city_id);
        }
      }
    }
    fetchUserData();
  }, []);

  // Fetch "Order Again" items - products the user previously ordered from this provider
  useEffect(() => {
    async function fetchOrderAgainItems() {
      if (!userId || !provider.id) return;

      const supabase = createClient();

      // Get unique menu_item_ids from user's completed orders at this provider
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(
          `
          menu_item_id,
          orders!inner (
            customer_id,
            provider_id,
            status
          )
        `
        )
        .eq('orders.customer_id', userId)
        .eq('orders.provider_id', provider.id)
        .eq('orders.status', 'delivered');

      if (orderItems && orderItems.length > 0) {
        // Get unique menu item IDs
        const menuItemIds = [
          ...new Set(orderItems.map((item) => item.menu_item_id).filter(Boolean)),
        ];

        // Filter menu items that match and are available
        const orderedItems = menuItems.filter(
          (item) => menuItemIds.includes(item.id) && item.is_available
        );

        setOrderAgainItems(orderedItems.slice(0, 6)); // Max 6 items
      }
    }

    fetchOrderAgainItems();
  }, [userId, provider.id, menuItems]);

  // Get promotion for a specific product
  const getProductPromotion = (productId: string) => {
    for (const promo of promotions) {
      if (promo.applies_to === 'all') {
        return {
          type: promo.type,
          discount_value: promo.discount_value,
          name_ar: promo.name_ar,
          name_en: promo.name_en,
        };
      }
      if (promo.applies_to === 'specific' && promo.product_ids?.includes(productId)) {
        return {
          type: promo.type,
          discount_value: promo.discount_value,
          name_ar: promo.name_ar,
          name_en: promo.name_en,
        };
      }
    }
    return null;
  };

  // Check if product has any active promotion or discount
  const hasActivePromotionOrDiscount = (item: MenuItem) => {
    const hasPromotion = promotions.some(
      (promo) =>
        promo.applies_to === 'all' ||
        (promo.applies_to === 'specific' && promo.product_ids?.includes(item.id))
    );
    const hasDiscount = item.original_price != null && item.original_price > item.price;
    return hasPromotion || hasDiscount;
  };

  // Filter menu items by category and search query
  const filteredMenuItems = menuItems.filter((item) => {
    if (selectedCategory && item.category_id !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const normalizedSearch = normalizeArabicText(searchQuery);
      const normalizedNameAr = normalizeArabicText(item.name_ar);
      const normalizedNameEn = normalizeArabicText(item.name_en || '');
      const normalizedDescAr = normalizeArabicText(item.description_ar || '');
      const normalizedDescEn = normalizeArabicText(item.description_en || '');

      return (
        normalizedNameAr.includes(normalizedSearch) ||
        normalizedNameEn.includes(normalizedSearch) ||
        normalizedDescAr.includes(normalizedSearch) ||
        normalizedDescEn.includes(normalizedSearch)
      );
    }
    return true;
  });

  // Get available items and sort by promotions/discounts first
  const availableItems = filteredMenuItems
    .filter((item) => item.is_available)
    .sort((a, b) => {
      const aHasPromo = hasActivePromotionOrDiscount(a);
      const bHasPromo = hasActivePromotionOrDiscount(b);
      if (aHasPromo && !bHasPromo) return -1;
      if (!aHasPromo && bHasPromo) return 1;
      return 0;
    });
  const unavailableItems = filteredMenuItems.filter((item) => !item.is_available);

  const handleAddToCart = (menuItem: MenuItem) => {
    if (provider) {
      const result = addItem(menuItem, {
        id: provider.id,
        name_ar: provider.name_ar,
        name_en: provider.name_en,
        delivery_fee: provider.delivery_fee,
        min_order_amount: provider.min_order_amount,
        estimated_delivery_time_min: provider.estimated_delivery_time_min,
        commission_rate: provider.commission_rate,
        category: provider.category,
      });

      if (result.requiresConfirmation) {
        setProviderSwitchInfo({
          show: true,
          currentProvider: result.currentProviderName || '',
          newProvider: result.newProviderName || '',
        });
      }
    }
  };

  const handleAddFromDetail = (
    product: MenuItem,
    variant?: ProductVariant,
    quantity: number = 1
  ) => {
    if (provider) {
      const providerData = {
        id: provider.id,
        name_ar: provider.name_ar,
        name_en: provider.name_en,
        delivery_fee: provider.delivery_fee,
        min_order_amount: provider.min_order_amount,
        estimated_delivery_time_min: provider.estimated_delivery_time_min,
        commission_rate: provider.commission_rate,
        category: provider.category,
      };

      let result;
      if (variant) {
        for (let i = 0; i < quantity; i++) {
          result = addItem(
            {
              ...product,
              price: variant.price,
              name_ar: `${product.name_ar} (${variant.name_ar})`,
              name_en: `${product.name_en} (${variant.name_en || variant.name_ar})`,
            },
            providerData
          );
          if (result.requiresConfirmation) break;
        }
      } else {
        for (let i = 0; i < quantity; i++) {
          result = addItem(product, providerData);
          if (result.requiresConfirmation) break;
        }
      }

      if (result?.requiresConfirmation) {
        setProviderSwitchInfo({
          show: true,
          currentProvider: result.currentProviderName || '',
          newProvider: result.newProviderName || '',
        });
      }
    }
  };

  const handleConfirmProviderSwitch = () => {
    confirmProviderSwitch();
    setProviderSwitchInfo(null);
  };

  const handleCancelProviderSwitch = () => {
    cancelProviderSwitch();
    setProviderSwitchInfo(null);
  };

  const handleProductClick = (item: MenuItem) => {
    setSelectedProductForDetail(item);
  };

  const getName = (item: MenuItem | ProviderData) => {
    return locale === 'ar' ? item.name_ar : item.name_en;
  };

  const getDescription = (item: MenuItem | ProviderData) => {
    return locale === 'ar' ? item.description_ar : item.description_en;
  };

  const isProviderFavorite = isFavorite(provider.id);

  const handleFavoriteClick = async () => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    await toggleFavorite(provider.id);
  };

  const handleQuantityChange = (item: MenuItem, quantity: number) => {
    const currentQty = getItemQuantity(item.id);
    if (quantity > currentQty) {
      handleAddToCart(item);
    } else if (quantity < currentQty) {
      removeItem(item.id);
    }
  };

  const mapProviderStatus = (status: string): 'open' | 'closed' | 'busy' | 'paused' | 'pending' => {
    switch (status) {
      case 'open':
        return 'open';
      case 'closed':
        return 'closed';
      case 'temporarily_paused':
        return 'paused';
      case 'pending_approval':
        return 'pending';
      default:
        return 'closed';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Main Header */}
      <CustomerHeader />

      {/* Provider Cover & Info */}
      <div className="bg-white border-b">
        {/* Cover Image - aspect-[3/1] matches provider settings recommended dimensions (1080×360) */}
        <div className="aspect-[3/1] bg-slate-100 relative">
          {provider.cover_image_url ? (
            <img
              src={provider.cover_image_url}
              alt={getName(provider)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: getCoverGradientStyle(provider.metadata?.brand_color || '#009DE0'),
              }}
            >
              {/* Show logo centered on gradient if available, otherwise store emoji */}
              {provider.logo_url ? (
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-lg bg-white/95">
                  <img
                    src={provider.logo_url}
                    alt={getName(provider)}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <span className="text-6xl">🏪</span>
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Provider Actions */}
          <div className="absolute top-3 start-3 flex items-center gap-2">
            <button
              onClick={handleFavoriteClick}
              className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
                isProviderFavorite
                  ? 'bg-white/90 text-red-500'
                  : 'bg-white/80 text-slate-600 hover:text-red-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${isProviderFavorite ? 'fill-red-500' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-600 hover:text-primary transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Logo overlay */}
          {provider.logo_url && (
            <div className="absolute bottom-0 start-4 translate-y-1/2 w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-white z-10">
              <img
                src={provider.logo_url}
                alt={getName(provider)}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Provider Info */}
        <div className="px-4 pt-12 pb-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-slate-900">{getName(provider)}</h1>
            <StatusBadge status={mapProviderStatus(provider.status)} size="sm" />
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-sm text-amber-700">
                {provider.rating.toFixed(1)}
              </span>
            </div>
            <span className="text-sm text-slate-400">
              ({provider.total_reviews} {locale === 'ar' ? 'تقييم' : 'reviews'})
            </span>
          </div>

          {/* Quick Info Pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-sm text-slate-600">
              <Clock className="w-4 h-4 text-primary" />
              <span>
                {provider.estimated_delivery_time_min} {locale === 'ar' ? 'دقيقة' : 'min'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-sm text-slate-600">
              <Truck className="w-4 h-4 text-primary" />
              <span>
                {provider.delivery_fee === 0
                  ? locale === 'ar'
                    ? 'توصيل مجاني'
                    : 'Free delivery'
                  : `${provider.delivery_fee} ${locale === 'ar' ? 'ج.م' : 'EGP'}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-sm text-slate-600">
              <MapPin className="w-4 h-4 text-primary" />
              <span>
                {locale === 'ar' ? 'حد أدنى' : 'Min'} {provider.min_order_amount}{' '}
                {locale === 'ar' ? 'ج.م' : 'EGP'}
              </span>
            </div>
          </div>

          {/* Description */}
          {getDescription(provider) && (
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              {getDescription(provider)}
            </p>
          )}
        </div>
      </div>

      {/* Custom Order Welcome Banner */}
      {(provider.operation_mode === 'custom' || provider.operation_mode === 'hybrid') && (
        <div className="px-4 py-3">
          <CustomOrderWelcomeBanner
            providerId={provider.id}
            providerName={locale === 'ar' ? provider.name_ar : provider.name_en}
            settings={provider.custom_order_settings}
          />
        </div>
      )}

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <div className="bg-white border-b">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <h2 className="text-lg font-bold text-slate-900">
                  {locale === 'ar' ? 'التقييمات' : 'Reviews'}
                </h2>
                <span className="text-sm text-slate-400">({provider.total_reviews})</span>
              </div>
              {reviews.length > 3 && (
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  className="text-primary text-sm font-medium flex items-center gap-1"
                >
                  {showAllReviews
                    ? locale === 'ar'
                      ? 'عرض أقل'
                      : 'Show Less'
                    : locale === 'ar'
                      ? 'عرض الكل'
                      : 'View All'}
                  {showAllReviews ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            <div className="space-y-4">
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review) => (
                <div
                  key={review.id}
                  className="border-b border-slate-100 last:border-0 pb-4 last:pb-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {(Array.isArray(review.profiles)
                            ? review.profiles[0]?.full_name
                            : review.profiles?.full_name) ||
                            (locale === 'ar' ? 'مستخدم' : 'Customer')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(review.created_at).toLocaleDateString(
                            locale === 'ar' ? 'ar-EG' : 'en-US',
                            { year: 'numeric', month: 'short', day: 'numeric' }
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{review.comment}</p>
                  )}

                  {review.provider_response && (
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg border-s-4 border-primary">
                      <div className="flex items-center gap-1 mb-1">
                        <MessageSquare className="w-3 h-3 text-primary" />
                        <p className="text-xs font-medium text-primary">
                          {locale === 'ar' ? 'رد المتجر' : 'Store Response'}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600">{review.provider_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Order Again Section - Shows items the user previously ordered */}
      {orderAgainItems.length > 0 && provider.operation_mode !== 'custom' && (
        <div className="bg-white border-b">
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {locale === 'ar' ? 'اطلب تاني' : 'Order Again'}
              </h2>
            </div>
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3" style={{ width: 'max-content' }}>
                {orderAgainItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleProductClick(item)}
                    className="w-36 flex-shrink-0 cursor-pointer"
                  >
                    <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100 hover:border-primary/30 hover:shadow-sm transition-all">
                      <div className="aspect-square relative">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={locale === 'ar' ? item.name_ar : item.name_en}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                            <span className="text-3xl">🍽️</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h3 className="text-sm font-medium text-slate-800 truncate">
                          {locale === 'ar' ? item.name_ar : item.name_en}
                        </h3>
                        <p className="text-sm font-bold text-primary mt-1">
                          {item.price} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Most Popular Section - Shows top ordered items */}
      {popularItems.length > 0 && provider.operation_mode !== 'custom' && (
        <div className="bg-white border-b">
          <div className="px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {locale === 'ar' ? 'الأكثر طلباً' : 'Most Popular'}
              </h2>
            </div>
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3" style={{ width: 'max-content' }}>
                {popularItems.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => handleProductClick(item)}
                    className="w-36 flex-shrink-0 cursor-pointer"
                  >
                    <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100 hover:border-primary/30 hover:shadow-sm transition-all">
                      <div className="aspect-square relative">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={locale === 'ar' ? item.name_ar : item.name_en}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                            <span className="text-3xl">🍽️</span>
                          </div>
                        )}
                        {/* Popularity Badge */}
                        <div className="absolute top-2 start-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          #{index + 1}
                        </div>
                      </div>
                      <div className="p-2">
                        <h3 className="text-sm font-medium text-slate-800 truncate">
                          {locale === 'ar' ? item.name_ar : item.name_en}
                        </h3>
                        <p className="text-sm font-bold text-primary mt-1">
                          {item.price} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Navigation */}
      {categories.length > 0 && provider.operation_mode !== 'custom' && (
        <div ref={categoriesRef} className="bg-white border-b sticky top-14 z-40 shadow-sm">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 px-4 py-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === null
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {locale === 'ar' ? 'الكل' : 'All'}
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    selectedCategory === category.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {locale === 'ar' ? category.name_ar : category.name_en}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      {provider.operation_mode !== 'custom' && (
        <div className="px-4 py-4">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search
                className={`absolute top-1/2 -translate-y-1/2 ${locale === 'ar' ? 'right-3' : 'left-3'} w-5 h-5 text-slate-400`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'ar' ? 'ابحث في القائمة...' : 'Search menu...'}
                className={`w-full h-11 bg-slate-100 rounded-full border border-slate-200 outline-none focus:ring-2 focus:ring-primary focus:bg-white focus:border-primary transition-all ${
                  locale === 'ar' ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10 text-left'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute top-1/2 -translate-y-1/2 ${locale === 'ar' ? 'left-3' : 'right-3'} w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {locale === 'ar' ? 'القائمة' : 'Menu'}
              {selectedCategory && categories.length > 0 && (
                <span className="text-slate-400 font-normal text-base">
                  {' - '}
                  {locale === 'ar'
                    ? categories.find((c) => c.id === selectedCategory)?.name_ar
                    : categories.find((c) => c.id === selectedCategory)?.name_en}
                </span>
              )}
            </h2>
            <span className="text-sm text-slate-400">
              {filteredMenuItems.length} {locale === 'ar' ? 'صنف' : 'items'}
            </span>
          </div>

          {filteredMenuItems.length === 0 ? (
            <EmptyState
              icon="menu"
              title={locale === 'ar' ? 'لا توجد عناصر' : 'No items found'}
              description={
                searchQuery
                  ? locale === 'ar'
                    ? `لا توجد نتائج للبحث عن "${searchQuery}"`
                    : `No results found for "${searchQuery}"`
                  : locale === 'ar'
                    ? 'لا توجد عناصر في هذا القسم حالياً'
                    : 'No menu items available in this category'
              }
            />
          ) : (
            <>
              {/* Available Items */}
              <div className="space-y-3">
                {availableItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleProductClick(item)}
                    className="cursor-pointer"
                  >
                    <ProductCard
                      product={item}
                      quantity={getItemQuantity(item.id)}
                      onQuantityChange={(qty) => handleQuantityChange(item, qty)}
                      onSelectVariant={
                        item.has_variants ? () => handleProductClick(item) : undefined
                      }
                      variant="horizontal"
                      promotion={getProductPromotion(item.id)}
                    />
                  </div>
                ))}
              </div>

              {/* Unavailable Items */}
              {unavailableItems.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">
                    {locale === 'ar' ? 'غير متاح حالياً' : 'Currently Unavailable'}
                  </h3>
                  <div className="space-y-3 opacity-50">
                    {unavailableItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleProductClick(item)}
                        className="cursor-pointer"
                      >
                        <ProductCard product={item} variant="horizontal" showAddButton={false} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* AI Smart Assistant */}
      <ChatFAB onClick={() => setIsChatOpen(!isChatOpen)} isOpen={isChatOpen} />
      <SmartAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userId={userId}
        cityId={userCityId || guestCityId || provider?.city_id || undefined}
        providerContext={provider ? { id: provider.id, name: provider.name_ar } : undefined}
      />

      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          isOpen={!!selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          onAddToCart={handleAddFromDetail}
          currentQuantity={getItemQuantity(selectedProductForDetail.id)}
        />
      )}

      {/* Provider Switch Confirmation Modal */}
      {providerSwitchInfo?.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-card-bg-warning rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-warning"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {locale === 'ar' ? 'تغيير المطعم؟' : 'Switch Restaurant?'}
              </h3>
              <p className="text-slate-600 text-sm">
                {locale === 'ar'
                  ? `سلتك تحتوي على منتجات من "${providerSwitchInfo.currentProvider}". هل تريد مسح السلة والطلب من "${providerSwitchInfo.newProvider}"؟`
                  : `Your cart contains items from "${providerSwitchInfo.currentProvider}". Do you want to clear your cart and order from "${providerSwitchInfo.newProvider}"?`}
              </p>
              <p className="text-warning text-xs mt-2">
                {locale === 'ar'
                  ? 'ملاحظة: لا يمكن الطلب من أكثر من مطعم في نفس الطلب'
                  : 'Note: You cannot order from multiple restaurants in the same order'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelProviderSwitch}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmProviderSwitch}
                className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                {locale === 'ar' ? 'نعم، غيّر' : 'Yes, Switch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          {locale === 'ar' ? 'تم نسخ الرابط' : 'Link copied'}
        </div>
      )}
    </div>
  );
}
