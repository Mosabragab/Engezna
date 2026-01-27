'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Tag, Percent, Truck, Gift, ChevronRight, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CustomerLayout } from '@/components/customer/layout';
import { ProviderCard, EmptyState } from '@/components/customer/shared';
import { Button } from '@/components/ui/button';
import { useSDUI } from '@/hooks/sdui';

interface PromoCode {
  id: string;
  code: string;
  description_ar: string | null;
  description_en: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  valid_until: string;
}

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
  status: string;
}

export default function OffersPage() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('offers');
  const isRTL = locale === 'ar';

  // SDUI: Get sections configuration from database
  const previewToken = searchParams.get('preview');
  const { sections, isSectionVisible, getSectionContent } = useSDUI({
    page: 'offers',
    userRole: 'customer',
    previewToken,
  });

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [freeDeliveryProviders, setFreeDeliveryProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOffers = useCallback(async () => {
    const supabase = createClient();

    // Fetch active promo codes - wrap in try-catch in case table doesn't exist
    try {
      const { data: promos, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('valid_until', { ascending: true })
        .limit(5);

      if (!error && promos) {
        setPromoCodes(promos);
      }
    } catch (error) {
      // promo_codes table may not exist yet
    }

    // Fetch providers with free delivery
    try {
      const { data: providers, error } = await supabase
        .from('providers')
        .select('*')
        .eq('delivery_fee', 0)
        .in('status', ['open', 'closed'])
        .order('rating', { ascending: false })
        .limit(6);

      if (!error && providers) {
        setFreeDeliveryProviders(providers);
      }
    } catch (error) {
      // Error handled silently
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const getDescription = (promo: PromoCode) => {
    return locale === 'ar' ? promo.description_ar : promo.description_en;
  };

  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  // Get SDUI content for featured offer
  const heroContent = getSectionContent('offers_hero', isRTL ? 'ar' : 'en');
  const promoContent = getSectionContent('promo_codes', isRTL ? 'ar' : 'en');
  const freeDeliveryContent = getSectionContent('free_delivery', isRTL ? 'ar' : 'en');

  // Featured offer banner - now controlled by SDUI
  const featuredOffer = {
    badge: heroContent.badge || (locale === 'ar' ? 'عرض اليوم' : "Today's Deal"),
    title: heroContent.title || (locale === 'ar' ? 'خصم 50% على أول طلب!' : '50% OFF First Order!'),
    description:
      heroContent.description ||
      (locale === 'ar'
        ? 'استخدم الكود WELCOME50 واحصل على خصم 50% على طلبك الأول'
        : 'Use code WELCOME50 and get 50% off your first order'),
    code: heroContent.code || 'WELCOME50',
    buttonText: heroContent.buttonText || (locale === 'ar' ? 'اطلب الآن' : 'Order Now'),
    bgColor: 'bg-gradient-to-br from-primary via-primary to-cyan-500',
  };

  if (isLoading) {
    return (
      <CustomerLayout headerTitle={t('title')} showBackButton>
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-slate-200 rounded-2xl" />
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-slate-200 rounded-xl" />
              <div className="h-32 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout headerTitle={t('title')} showBackButton>
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Featured Offer Banner - SDUI Controlled */}
        {isSectionVisible('offers_hero') && (
          <div
            className={`${featuredOffer.bgColor} rounded-2xl p-6 text-white relative overflow-hidden`}
          >
            <div className="absolute top-0 end-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 start-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5" />
                <span className="text-sm font-medium opacity-90">{featuredOffer.badge}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{featuredOffer.title}</h2>
              <p className="text-sm opacity-90 mb-4">{featuredOffer.description}</p>

              <div className="flex items-center justify-between">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <span className="text-xs opacity-75">{t('code')}:</span>
                  <span className="font-bold ms-2">{featuredOffer.code}</span>
                </div>
                <Button
                  onClick={() => router.push(`/${locale}/providers`)}
                  className="bg-white text-primary hover:bg-white/90"
                >
                  {featuredOffer.buttonText}
                  <Arrow className="w-4 h-4 ms-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Active Promo Codes - SDUI Controlled */}
        {isSectionVisible('promo_codes') && promoCodes.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Percent className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-slate-900">
                {promoContent.title || t('discounts')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {promoCodes.map((promo) => (
                <div
                  key={promo.id}
                  className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Tag className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <span className="font-bold text-red-500">
                          {promo.discount_type === 'percentage'
                            ? `${promo.discount_value}%`
                            : `${promo.discount_value} ${locale === 'ar' ? 'ج.م' : 'EGP'}`}
                        </span>
                        <span className="text-slate-500 text-sm ms-1">
                          {locale === 'ar' ? 'خصم' : 'OFF'}
                        </span>
                      </div>
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-1 rounded">
                      {promo.code}
                    </span>
                  </div>

                  {getDescription(promo) && (
                    <p className="text-sm text-slate-600 mb-2">{getDescription(promo)}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    {promo.min_order_amount > 0 && (
                      <span>
                        {locale === 'ar' ? 'الحد الأدنى:' : 'Min:'} {promo.min_order_amount}{' '}
                        {locale === 'ar' ? 'ج.م' : 'EGP'}
                      </span>
                    )}
                    <span>
                      {t('validUntil')}{' '}
                      {new Date(promo.valid_until).toLocaleDateString(
                        locale === 'ar' ? 'ar-EG' : 'en-US'
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Free Delivery Section - SDUI Controlled */}
        {isSectionVisible('free_delivery') && freeDeliveryProviders.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-bold text-slate-900">
                {freeDeliveryContent.title || t('freeDelivery')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {freeDeliveryProviders.map((provider) => (
                <ProviderCard key={provider.id} provider={provider as any} variant="default" />
              ))}
            </div>
          </section>
        )}

        {/* Empty state if no offers */}
        {promoCodes.length === 0 && freeDeliveryProviders.length === 0 && (
          <EmptyState
            icon={<Tag className="w-16 h-16 text-slate-300" />}
            title={locale === 'ar' ? 'لا توجد عروض حالياً' : 'No offers available'}
            description={
              locale === 'ar'
                ? 'تابعنا للحصول على أحدث العروض والخصومات'
                : 'Follow us for the latest deals and discounts'
            }
            actionLabel={locale === 'ar' ? 'تصفح المتاجر' : 'Browse Stores'}
            onAction={() => router.push(`/${locale}/providers`)}
          />
        )}
      </div>
    </CustomerLayout>
  );
}
