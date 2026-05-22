'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, Loader2, Crown } from 'lucide-react';
import type { TierConfig, LoyaltyTier } from '@/lib/tier-rewards';

const TIER_ORDER: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum'];

const TIER_LABEL: Record<LoyaltyTier, { ar: string; en: string }> = {
  bronze: { ar: 'برونزي', en: 'Bronze' },
  silver: { ar: 'فضي', en: 'Silver' },
  gold: { ar: 'ذهبي', en: 'Gold' },
  platinum: { ar: 'بلاتيني', en: 'Platinum' },
};

type Patch = Partial<Omit<TierConfig, 'tier'>>;

export default function AdminTierRewardsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [tiers, setTiers] = useState<TierConfig[] | null>(null);
  const [drafts, setDrafts] = useState<Record<LoyaltyTier, Patch>>({
    bronze: {},
    silver: {},
    gold: {},
    platinum: {},
  });
  const [loading, setLoading] = useState(true);
  const [savingTier, setSavingTier] = useState<LoyaltyTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedTier, setSavedTier] = useState<LoyaltyTier | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user ?? null));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/tier-rewards', { method: 'GET' });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? 'failed_to_load');
          return;
        }
        const data = (await res.json()) as { tiers: TierConfig[] };
        // Sort to match TIER_ORDER for stable rendering
        const sorted = TIER_ORDER.map((t) => data.tiers.find((x) => x.tier === t)).filter(
          (x): x is TierConfig => Boolean(x)
        );
        setTiers(sorted);
      } catch {
        setError('network_error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateDraft<K extends keyof Patch>(tier: LoyaltyTier, key: K, value: Patch[K]) {
    setDrafts((d) => ({ ...d, [tier]: { ...d[tier], [key]: value } }));
  }

  async function saveTier(tier: LoyaltyTier) {
    const patch = drafts[tier];
    if (!patch || Object.keys(patch).length === 0) return;

    setSavingTier(tier);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tier-rewards/${tier}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'save_failed');
        return;
      }
      const data = (await res.json()) as { tier: TierConfig };
      setTiers((curr) => curr?.map((t) => (t.tier === tier ? data.tier : t)) ?? null);
      setDrafts((d) => ({ ...d, [tier]: {} }));
      setSavedTier(tier);
      setTimeout(() => setSavedTier(null), 2500);
    } catch {
      setError('network_error');
    } finally {
      setSavingTier(null);
    }
  }

  if (!user) {
    return (
      <main
        className="flex flex-1 items-center justify-center p-4 lg:p-6"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader
        user={user}
        title={isRTL ? 'مزايا المستويات' : 'Tier rewards'}
        onMenuClick={toggleSidebar}
      />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Crown className="text-amber-500" size={28} />
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isRTL ? 'إدارة مزايا المستويات' : 'Manage tier rewards'}
            </h1>
            <p className="text-sm text-slate-500">
              {isRTL
                ? 'كل تعديل يُسجَّل ويُطبَّق على كل العملاء في المستوى.'
                : 'Each change is audited and applies to every customer in that tier.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
        ) : tiers ? (
          <div className="space-y-4">
            {tiers.map((t) => {
              const draft = drafts[t.tier];
              const hasChanges = Object.keys(draft).length > 0;
              const isSaving = savingTier === t.tier;
              const justSaved = savedTier === t.tier;

              const value = <K extends keyof TierConfig>(key: K): TierConfig[K] =>
                (draft[key as keyof Patch] as TierConfig[K] | undefined) ?? t[key];

              return (
                <Card key={t.tier} className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden={true}>
                        {t.badgeEmoji}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900">
                        {isRTL ? TIER_LABEL[t.tier].ar : TIER_LABEL[t.tier].en}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {justSaved && (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <Check size={14} />
                          {isRTL ? 'تم الحفظ' : 'Saved'}
                        </span>
                      )}
                      <Button
                        size="sm"
                        disabled={!hasChanges || isSaving}
                        onClick={() => saveTier(t.tier)}
                      >
                        {isSaving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isRTL ? (
                          'حفظ'
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`${t.tier}-discount`}>
                        {isRTL ? 'خصم التوصيل %' : 'Delivery discount %'}
                      </Label>
                      <Input
                        id={`${t.tier}-discount`}
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={value('deliveryDiscountPercent')}
                        onChange={(e) =>
                          updateDraft(t.tier, 'deliveryDiscountPercent', Number(e.target.value))
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor={`${t.tier}-freecount`}>
                        {isRTL ? 'توصيل مجاني/شهر' : 'Free deliveries / month'}
                      </Label>
                      <Input
                        id={`${t.tier}-freecount`}
                        type="number"
                        min={0}
                        step={1}
                        value={value('freeDeliveriesPerMonth')}
                        onChange={(e) =>
                          updateDraft(
                            t.tier,
                            'freeDeliveriesPerMonth',
                            Math.floor(Number(e.target.value))
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor={`${t.tier}-monthlybox`}>
                        {isRTL ? 'صندوق شهري (قروش)' : 'Monthly box (piasters)'}
                      </Label>
                      <Input
                        id={`${t.tier}-monthlybox`}
                        type="number"
                        min={0}
                        step={100}
                        value={value('monthlyBoxValuePiasters')}
                        onChange={(e) =>
                          updateDraft(
                            t.tier,
                            'monthlyBoxValuePiasters',
                            Math.floor(Number(e.target.value))
                          )
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor={`${t.tier}-minorder`}>
                        {isRTL
                          ? 'حد أدنى للتوصيل المجاني (قروش)'
                          : 'Min order for free delivery (piasters)'}
                      </Label>
                      <Input
                        id={`${t.tier}-minorder`}
                        type="number"
                        min={0}
                        step={100}
                        value={value('freeDeliveryMinOrderPiasters') ?? 0}
                        onChange={(e) =>
                          updateDraft(
                            t.tier,
                            'freeDeliveryMinOrderPiasters',
                            Math.floor(Number(e.target.value))
                          )
                        }
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(value('freeDeliveryUnlimited'))}
                        onChange={(e) =>
                          updateDraft(t.tier, 'freeDeliveryUnlimited', e.target.checked)
                        }
                      />
                      <span>{isRTL ? 'توصيل مجاني غير محدود' : 'Unlimited free delivery'}</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(value('prioritySupport'))}
                        onChange={(e) => updateDraft(t.tier, 'prioritySupport', e.target.checked)}
                      />
                      <span>{isRTL ? 'أولوية في الدعم' : 'Priority support'}</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(value('accountManager'))}
                        onChange={(e) => updateDraft(t.tier, 'accountManager', e.target.checked)}
                      />
                      <span>{isRTL ? 'مدير حساب' : 'Account manager'}</span>
                    </label>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
