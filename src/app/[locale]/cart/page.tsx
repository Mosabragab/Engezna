'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Minus,
  ShoppingBag,
  Store,
  Percent,
  Tag,
  Gift,
  Sparkles,
  Crown,
  BadgeCheck,
} from 'lucide-react';
import { useCart, CartItem } from '@/lib/store/cart';
import { CustomerLayout } from '@/components/customer/layout';
import { createClient } from '@/lib/supabase/client';

type ExtrasItem = {
  id: string;
  name_ar: string;
  name_en: string;
  price: number;
  image_url: string | null;
  provider_id: string;
};

type Promotion = {
  id: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  discount_value: number;
  buy_quantity?: number;
  get_quantity?: number;
  name_ar: string;
  name_en: string;
  applies_to: 'all' | 'specific';
  product_ids?: string[];
  min_order_amount?: number;
  max_discount?: number;
};

export default function CartPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('cart');

  const {
    cart: items,
    provider,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTotal,
    getItemCount,
    addItem,
  } = useCart();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(false);
  const [extrasItems, setExtrasItems] = useState<ExtrasItem[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // Fetch active promotions for the provider
  useEffect(() => {
    async function fetchPromotions() {
      if (!provider?.id) {
        setPromotions([]);
        return;
      }

      setLoadingPromotions(true);
      const supabase = createClient();
      const now = new Date().toISOString();

      const { data } = await supabase
        .from('promotions')
        .select('*')
        .eq('provider_id', provider.id)
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now);

      if (data) {
        setPromotions(data);
      }
      setLoadingPromotions(false);
    }

    fetchPromotions();
  }, [provider?.id]);

  // Fetch extras items from provider's "extras" category
  useEffect(() => {
    async function fetchExtras() {
      if (!provider?.id) {
        setExtrasItems([]);
        return;
      }

      setLoadingExtras(true);
      const supabase = createClient();

      // First, find the extras category for this provider
      const { data: extrasCategory } = await supabase
        .from('provider_categories')
        .select('id')
        .eq('provider_id', provider.id)
        .eq('is_extras', true)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!extrasCategory) {
        setExtrasItems([]);
        setLoadingExtras(false);
        return;
      }

      // Get items from the extras category that aren't already in cart
      const cartItemIds = items.map((item) => item.menuItem.id);

      const { data: extras } = await supabase
        .from('menu_items')
        .select('id, name_ar, name_en, price, image_url, provider_id')
        .eq('provider_id', provider.id)
        .eq('category_id', extrasCategory.id)
        .eq('is_available', true)
        .order('display_order', { ascending: true })
        .limit(6);

      if (extras) {
        // Filter out items already in cart
        const filteredExtras = extras.filter((item) => !cartItemIds.includes(item.id));
        setExtrasItems(filteredExtras.slice(0, 4)); // Show max 4 items
      }
      setLoadingExtras(false);
    }

    fetchExtras();
  }, [provider?.id, items]);

  // Get applicable promotion for a product
  const getProductPromotion = (productId: string): Promotion | null => {
    for (const promo of promotions) {
      if (promo.applies_to === 'all') {
        return promo;
      }
      if (promo.applies_to === 'specific' && promo.product_ids?.includes(productId)) {
        return promo;
      }
    }
    return null;
  };

  // Calculate variant-level discount (from original_price)
  const calculateVariantDiscount = (item: CartItem): number => {
    // Check if variant has original_price (meaning it's discounted)
    if (
      item.selectedVariant?.original_price &&
      item.selectedVariant.original_price > item.selectedVariant.price
    ) {
      const discountPerUnit = item.selectedVariant.original_price - item.selectedVariant.price;
      return discountPerUnit * item.quantity;
    }

    // Check if menu item has original_price (meaning it's discounted)
    if (item.menuItem.original_price && item.menuItem.original_price > item.menuItem.price) {
      const discountPerUnit = item.menuItem.original_price - item.menuItem.price;
      return discountPerUnit * item.quantity;
    }

    return 0;
  };

  // Calculate discount for a single item (from promotions table)
  const calculateItemDiscount = (item: CartItem): number => {
    // First check for variant-level discount (original_price)
    const variantDiscount = calculateVariantDiscount(item);
    if (variantDiscount > 0) {
      return variantDiscount;
    }

    // Then check for promotions-based discount
    const promo = getProductPromotion(item.menuItem.id);
    if (!promo) return 0;

    const price = item.selectedVariant?.price ?? item.menuItem.price;
    const itemTotal = price * item.quantity;
    const subtotal = getSubtotal();

    // Check if this specific promotion meets min_order_amount requirement
    if (promo.min_order_amount && subtotal < promo.min_order_amount) {
      return 0; // This promotion doesn't apply due to minimum order
    }

    if (promo.type === 'percentage') {
      let discount = (itemTotal * promo.discount_value) / 100;
      // Apply max discount if set
      if (promo.max_discount && discount > promo.max_discount) {
        discount = promo.max_discount;
      }
      return discount;
    }

    if (promo.type === 'fixed') {
      // Fixed discount per item
      return Math.min(promo.discount_value * item.quantity, itemTotal);
    }

    if (promo.type === 'buy_x_get_y' && promo.buy_quantity && promo.get_quantity) {
      // Calculate free items
      const totalItems = item.quantity;
      const setSize = promo.buy_quantity + promo.get_quantity;
      const completeSets = Math.floor(totalItems / setSize);
      const freeItems = completeSets * promo.get_quantity;
      return freeItems * price;
    }

    return 0;
  };

  // Calculate total discount
  const calculateTotalDiscount = (): number => {
    // Sum up discounts per item (min_order_amount is checked per-promotion in calculateItemDiscount)
    return items.reduce((sum, item) => sum + calculateItemDiscount(item), 0);
  };

  const subtotal = getSubtotal();
  const discount = calculateTotalDiscount();
  const deliveryFee = provider?.delivery_fee || 0;
  const total = subtotal - discount + deliveryFee;

  const handleCheckout = () => {
    router.push(`/${locale}/checkout`);
  };

  const getName = (item: { name_ar: string; name_en: string }) => {
    return locale === 'ar' ? item.name_ar : item.name_en;
  };

  // Handle adding an extras item to cart
  const handleAddExtras = (extrasItem: ExtrasItem) => {
    if (!provider) return;

    // Create a complete menu item object for the cart
    addItem(
      {
        id: extrasItem.id,
        name_ar: extrasItem.name_ar,
        name_en: extrasItem.name_en,
        price: extrasItem.price,
        image_url: extrasItem.image_url,
        provider_id: extrasItem.provider_id,
        // Required fields with defaults for extras
        description_ar: null,
        description_en: null,
        is_available: true,
        is_vegetarian: false,
        is_spicy: false,
        preparation_time_min: 0,
      },
      provider
    );
  };

  if (items.length === 0) {
    return (
      <CustomerLayout headerTitle={t('title')} showBackButton={false} showBottomNav={true}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="w-12 h-12 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('empty')}</h2>
          <p className="text-slate-500 text-center mb-6">{t('emptyDescription')}</p>
          <button
            onClick={() => router.push(`/${locale}/providers`)}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            {t('browsStores')}
          </button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout headerTitle={t('title')} showBackButton={false} showBottomNav={true}>
      <div className="px-4 py-4 pb-6">
        {/* Provider Info */}
        {provider && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-primary/10">
                {provider.logo_url ? (
                  <img
                    src={provider.logo_url}
                    alt={getName(provider)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-slate-900">{getName(provider)}</h3>
                  {provider.is_featured && <Crown className="w-4 h-4 text-premium flex-shrink-0" />}
                  {provider.is_verified && (
                    <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {items.length} {locale === 'ar' ? 'عناصر' : 'items'}
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/providers/${provider.id}`}
              className="text-primary text-sm font-medium hover:underline"
            >
              {t('edit')}
            </Link>
          </div>
        )}

        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          {items.map((item) => {
            const promo = getProductPromotion(item.menuItem.id);
            const itemDiscount = calculateItemDiscount(item);
            const price = item.selectedVariant?.price ?? item.menuItem.price;
            const itemTotal = price * item.quantity;
            // Check if promo exists but discount is 0 due to min_order_amount
            const hasUnmetMinOrder =
              promo && promo.min_order_amount && subtotal < promo.min_order_amount;

            return (
              <div
                key={`${item.menuItem.id}-${item.selectedVariant?.id || ''}`}
                className={`bg-white rounded-xl border p-4 ${promo ? 'border-primary/30 ring-1 ring-primary/20' : 'border-slate-100'}`}
              >
                <div className="flex gap-3">
                  {/* Image */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    {item.menuItem.image_url ? (
                      <img
                        src={item.menuItem.image_url}
                        alt={getName(item.menuItem)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🍽️
                      </div>
                    )}
                    {/* Promotion Badge on Image */}
                    {promo && (
                      <div className="absolute top-1 start-1 bg-gradient-to-r from-primary to-primary/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        {promo.type === 'percentage' ? (
                          <>
                            <Percent className="w-2.5 h-2.5" />
                            <span>{promo.discount_value}%</span>
                          </>
                        ) : promo.type === 'fixed' ? (
                          <>
                            <Tag className="w-2.5 h-2.5" />
                            <span>{promo.discount_value}</span>
                          </>
                        ) : (
                          <>
                            <Gift className="w-2.5 h-2.5" />
                            <span>{locale === 'ar' ? 'عرض' : 'Offer'}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 truncate">
                      {getName(item.menuItem)}
                    </h4>
                    {item.selectedVariant && (
                      <p className="text-xs text-slate-500">
                        {locale === 'ar'
                          ? item.selectedVariant.name_ar
                          : item.selectedVariant.name_en || item.selectedVariant.name_ar}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-primary font-bold">
                        {price} {locale === 'ar' ? 'ج.م' : 'EGP'}
                      </span>
                      {itemDiscount > 0 && (
                        <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                          -{itemDiscount.toFixed(0)} {locale === 'ar' ? 'خصم' : 'off'}
                        </span>
                      )}
                    </div>
                    {/* Show message if promo exists but min order not met */}
                    {hasUnmetMinOrder && (
                      <p className="text-[10px] text-warning mt-1">
                        {locale === 'ar'
                          ? `أضف ${(promo.min_order_amount! - subtotal).toFixed(0)} ج.م للحصول على الخصم`
                          : `Add ${(promo.min_order_amount! - subtotal).toFixed(0)} EGP to get discount`}
                      </p>
                    )}

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeItem(item.menuItem.id, item.selectedVariant?.id)}
                          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-red-300 hover:text-red-500 transition-colors"
                          aria-label={locale === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'}
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.menuItem.id,
                              item.quantity + 1,
                              item.selectedVariant?.id
                            )
                          }
                          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
                          aria-label={locale === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="text-end">
                        {itemDiscount > 0 ? (
                          <>
                            <span className="text-slate-400 line-through text-sm">
                              {itemTotal.toFixed(2)}
                            </span>
                            <span className="font-bold text-green-600 ms-2">
                              {(itemTotal - itemDiscount).toFixed(2)}{' '}
                              {locale === 'ar' ? 'ج.م' : 'EGP'}
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-slate-900">
                            {itemTotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add More Items */}
        {provider && (
          <Link
            href={`/${locale}/providers/${provider.id}`}
            className="block bg-slate-50 rounded-xl p-4 text-center text-primary font-medium hover:bg-slate-100 transition-colors mb-6"
          >
            + {t('addMore')} {getName(provider)}
          </Link>
        )}

        {/* Cross-sell Extras Section */}
        {extrasItems.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-slate-900">
                {locale === 'ar' ? 'أضف إضافات لطلبك' : 'Add extras to your order'}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {extrasItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-100 overflow-hidden hover:border-primary/30 transition-colors"
                >
                  {/* Image */}
                  <div className="h-20 bg-slate-100 relative">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={getName(item)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🍽️
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="p-3">
                    <h4 className="font-medium text-slate-900 text-sm truncate mb-1">
                      {getName(item)}
                    </h4>
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-bold text-sm">
                        {item.price} {locale === 'ar' ? 'ج.م' : 'EGP'}
                      </span>
                      <button
                        onClick={() => handleAddExtras(item)}
                        className="min-w-[44px] min-h-[44px] w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
                        aria-label={locale === 'ar' ? 'إضافة للسلة' : 'Add to cart'}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <h4 className="font-semibold text-slate-900 mb-4">{t('summary')}</h4>

          <div className="space-y-3">
            <div className="flex justify-between text-slate-600">
              <span>{t('subtotal')}</span>
              <span>
                {subtotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
              </span>
            </div>

            {/* Discount Row */}
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-4 h-4" />
                  {locale === 'ar' ? 'خصم العرض' : 'Promotion Discount'}
                </span>
                <span>
                  -{discount.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>{t('deliveryFee')}</span>
              <span>
                {deliveryFee === 0
                  ? locale === 'ar'
                    ? 'مجاني'
                    : 'Free'
                  : `${deliveryFee.toFixed(2)} ${locale === 'ar' ? 'ج.م' : 'EGP'}`}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-lg">
              <span>{t('total')}</span>
              <span className="text-primary">
                {total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
              </span>
            </div>

            {/* Checkout Button - Inside card */}
            {provider && provider.min_order_amount > subtotal && (
              <div className="bg-card-bg-warning text-warning text-xs rounded-lg px-3 py-1.5 text-center">
                {locale === 'ar'
                  ? `أضف ${(provider.min_order_amount - subtotal).toFixed(0)} ج.م للوصول للحد الأدنى`
                  : `Add ${(provider.min_order_amount - subtotal).toFixed(0)} EGP to reach minimum order`}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={!!(provider && provider.min_order_amount > subtotal)}
              className="w-full bg-primary text-white rounded-lg py-3 font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mt-2"
            >
              <span>{t('checkout')}</span>
              <span className="bg-white/20 px-2.5 py-0.5 rounded-md text-sm">
                {total.toFixed(0)} {locale === 'ar' ? 'ج.م' : 'EGP'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
