'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { ProviderLayout } from '@/components/provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Crown, Loader2, Sparkles, Zap, Mail } from 'lucide-react';
import type { CurrentSubscription, SubscriptionTier } from '@/lib/provider-subscriptions';
import { TIER_PLANS } from '@/lib/provider-subscriptions';

const FEATURE_LABELS: Record<string, { ar: string; en: string }> = {
  basic_reports: {
    ar: 'تقارير مبسطة (إيرادات، طلبات، تقييم)',
    en: 'Basic reports (revenue, orders, ratings)',
  },
  cohort_analysis: { ar: 'تحليل cohort', en: 'Cohort analysis' },
  peak_hours: { ar: 'ساعات الذروة', en: 'Peak hours analysis' },
  top_products: { ar: 'أفضل المنتجات', en: 'Top products' },
  competitor_compare: { ar: 'مقارنة مع منافسين', en: 'Competitor comparison' },
  demographics: { ar: 'تقارير ديموغرافية', en: 'Demographics' },
  ai_forecasts: { ar: 'توقعات AI', en: 'AI forecasts' },
  priority_support: { ar: 'دعم أولوية', en: 'Priority support' },
};

const TIER_META: Record<
  SubscriptionTier,
  { ar: string; en: string; icon: React.ElementType; accent: string }
> = {
  basic: { ar: 'الأساسية', en: 'Basic', icon: Sparkles, accent: 'border-slate-200' },
  pro: { ar: 'المحترف', en: 'Pro', icon: Zap, accent: 'border-blue-300 ring-1 ring-blue-200' },
  elite: {
    ar: 'النخبة',
    en: 'Elite',
    icon: Crown,
    accent: 'border-purple-400 ring-2 ring-purple-300',
  },
};

export default function ProviderSubscriptionPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/provider/subscription', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSubscription(data.subscription);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'اشتراك التحليلات', en: 'Analytics Subscription' }}
      pageSubtitle={{
        ar: 'ارفع مستوى تحليلاتك للحصول على رؤى أعمق ومميزات حصرية.',
        en: 'Upgrade your analytics for deeper insights and exclusive features.',
      }}
    >
      <div className="container mx-auto max-w-5xl p-4 lg:p-6">
        {loading || !subscription ? (
          <Card className="p-12 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
          </Card>
        ) : (
          <>
            {/* Current tier banner */}
            <Card className="mb-6 p-4">
              <div
                className={`flex items-center justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div>
                  <p className="text-xs text-slate-500">
                    {isRTL ? 'مستواك الحالي' : 'Your current tier'}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {isRTL ? TIER_META[subscription.tier].ar : TIER_META[subscription.tier].en}
                    {subscription.granted_free && (
                      <span
                        className={`${isRTL ? 'mr-2' : 'ml-2'} rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700`}
                      >
                        {isRTL ? 'مجانًا' : 'Free'}
                      </span>
                    )}
                  </p>
                  {subscription.ends_at && (
                    <p className="mt-1 text-xs text-slate-500">
                      {isRTL ? 'ينتهي في:' : 'Expires:'}{' '}
                      <span className="tabular-nums">
                        {new Date(subscription.ends_at).toLocaleDateString(
                          isRTL ? 'ar-EG' : 'en-US'
                        )}
                      </span>
                    </p>
                  )}
                </div>
                <div className="rounded-full bg-gradient-to-br from-blue-100 to-purple-100 p-3">
                  {(() => {
                    const Icon = TIER_META[subscription.tier].icon;
                    return <Icon className="h-7 w-7 text-blue-700" />;
                  })()}
                </div>
              </div>
            </Card>

            {/* Tier cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(Object.keys(TIER_PLANS) as SubscriptionTier[]).map((tier) => {
                const plan = TIER_PLANS[tier];
                const meta = TIER_META[tier];
                const Icon = meta.icon;
                const isCurrent = subscription.tier === tier;
                const priceEgp = Math.round(plan.price_piasters / 100);

                return (
                  <Card
                    key={tier}
                    className={`relative p-5 ${meta.accent} ${isCurrent ? 'bg-gradient-to-br from-blue-50/50 to-white' : ''}`}
                  >
                    {isCurrent && (
                      <div
                        className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white`}
                      >
                        {isRTL ? 'الحالي' : 'Current'}
                      </div>
                    )}
                    <div className="mb-3 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-bold text-slate-900">
                        {isRTL ? meta.ar : meta.en}
                      </h3>
                    </div>
                    <div className="mb-4">
                      <p className="text-3xl font-bold tabular-nums text-slate-900">
                        {priceEgp === 0
                          ? isRTL
                            ? 'مجانًا'
                            : 'Free'
                          : `${priceEgp} ${isRTL ? 'ج.م' : 'EGP'}`}
                      </p>
                      {priceEgp > 0 && (
                        <p className="text-xs text-slate-500">{isRTL ? 'شهريًا' : 'per month'}</p>
                      )}
                    </div>
                    <ul className="mb-4 space-y-2 text-sm text-slate-600">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                        >
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                          <span>
                            {isRTL ? (FEATURE_LABELS[f]?.ar ?? f) : (FEATURE_LABELS[f]?.en ?? f)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <Button type="button" variant="outline" disabled className="w-full">
                        {isRTL ? 'مستواك الحالي' : 'Your current tier'}
                      </Button>
                    ) : tier === 'basic' ? (
                      <Button type="button" variant="outline" disabled className="w-full">
                        {isRTL ? 'الخطة الأساسية' : 'Default plan'}
                      </Button>
                    ) : (
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          isRTL
                            ? `أرغب في الترقية لخطة ${meta.ar} من إنجزنا`
                            : `I'd like to upgrade to the ${meta.en} plan on Engezna`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button type="button" className="w-full gap-2">
                          <Mail className="h-4 w-4" />
                          {isRTL ? 'تواصل للترقية' : 'Contact to upgrade'}
                        </Button>
                      </a>
                    )}
                  </Card>
                );
              })}
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              {isRTL
                ? 'الترقية تتم عبر فريق إنجزنا حاليًا. الفوترة الذاتية ستكون متاحة قريبًا.'
                : 'Upgrades are processed through the Engezna team for now. Self-service billing coming soon.'}
            </p>
          </>
        )}
      </div>
    </ProviderLayout>
  );
}
