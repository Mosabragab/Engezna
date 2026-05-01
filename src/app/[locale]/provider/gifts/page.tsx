'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ProviderLayout } from '@/components/provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Pause, Play, Trash2, Send, AlertCircle, Gift } from 'lucide-react';
import type { PartnerOfferWithGift } from '@/lib/partner-gifts';

const STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  draft: { ar: 'مسودة', en: 'Draft', color: 'bg-slate-100 text-slate-700' },
  pending_approval: {
    ar: 'بانتظار الموافقة',
    en: 'Pending approval',
    color: 'bg-amber-100 text-amber-700',
  },
  approved: { ar: 'معتمد', en: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  active: { ar: 'نشط', en: 'Active', color: 'bg-green-100 text-green-700' },
  paused: { ar: 'متوقف', en: 'Paused', color: 'bg-slate-100 text-slate-600' },
  ended: { ar: 'منتهٍ', en: 'Ended', color: 'bg-slate-50 text-slate-500' },
  rejected: { ar: 'مرفوض', en: 'Rejected', color: 'bg-red-100 text-red-700' },
};

export default function ProviderGiftsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [offers, setOffers] = useState<PartnerOfferWithGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/provider/gifts', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load offers');
      const data = await res.json();
      setOffers(data.offers || []);
    } catch (e) {
      setError(isRTL ? 'فشل تحميل العروض' : 'Failed to load offers');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  useEffect(() => {
    load();
  }, [load]);

  async function callAction(offerId: string, path: string, method: 'POST' | 'DELETE' = 'POST') {
    setBusyId(offerId);
    try {
      const res = await fetch(path, { method });
      if (!res.ok) throw new Error('Action failed');
      await load();
    } catch (e) {
      setError(isRTL ? 'فشل تنفيذ العملية' : 'Action failed');
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'هدايا المتجر', en: 'Store Gifts' }}
      pageSubtitle={{
        ar: 'أنشئ هدايا تظهر في صناديق العملاء — الخصم يُخصم من تسويتك',
        en: 'Create gifts shown in customer reward boxes — discount deducted from your settlement',
      }}
    >
      <div className="container mx-auto max-w-5xl p-4 lg:p-6 space-y-4">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <p className="text-sm text-slate-600">
              {isRTL
                ? 'كل عرض يحتاج موافقة الإدارة قبل النشر للعملاء.'
                : 'Each offer needs admin approval before it goes live to customers.'}
            </p>
          </div>
          <Link href={`/${locale}/provider/gifts/new`}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {isRTL ? 'هدية جديدة' : 'New gift'}
            </Button>
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <Card className="p-8 text-center text-slate-500">
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </Card>
        ) : offers.length === 0 ? (
          <Card className="p-10 text-center">
            <Gift className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-base font-bold text-slate-800">
              {isRTL ? 'مفيش هدايا لسه' : 'No gift offers yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {isRTL
                ? 'ابدأ بإنشاء هدية لتظهر في صناديق العملاء وتجذب طلبات أكتر.'
                : 'Create your first offer to appear in customer reward boxes and drive more orders.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => {
              const status = STATUS_LABELS[offer.status] || STATUS_LABELS.draft;
              const title = isRTL ? offer.gift?.title_ar : offer.gift?.title_en;
              return (
                <Card key={offer.id} className="p-4">
                  <div
                    className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <h3 className="font-bold text-slate-900 truncate">{title || '—'}</h3>
                        <span
                          className={`text-xs font-medium rounded-full px-2 py-0.5 ${status.color}`}
                        >
                          {isRTL ? status.ar : status.en}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {isRTL ? 'الفترة:' : 'Period:'}{' '}
                        {new Date(offer.starts_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                        {' — '}
                        {new Date(offer.ends_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {isRTL ? 'الاستخدام' : 'Used'}: {offer.used_orders} / {offer.max_orders}
                      </p>
                      {offer.status === 'rejected' && offer.rejection_reason && (
                        <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                          {isRTL ? 'سبب الرفض:' : 'Rejection reason:'} {offer.rejection_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {offer.status === 'draft' && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === offer.id}
                            onClick={() =>
                              callAction(offer.id, `/api/provider/gifts/${offer.id}/submit`)
                            }
                            className="gap-1"
                          >
                            <Send className="h-3 w-3" />
                            {isRTL ? 'إرسال' : 'Submit'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busyId === offer.id}
                            onClick={() =>
                              callAction(offer.id, `/api/provider/gifts/${offer.id}`, 'DELETE')
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {(offer.status === 'active' || offer.status === 'approved') && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyId === offer.id}
                          onClick={() =>
                            callAction(offer.id, `/api/provider/gifts/${offer.id}/pause`)
                          }
                          className="gap-1"
                        >
                          <Pause className="h-3 w-3" />
                          {isRTL ? 'إيقاف' : 'Pause'}
                        </Button>
                      )}
                      {offer.status === 'paused' && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === offer.id}
                          onClick={() =>
                            callAction(offer.id, `/api/provider/gifts/${offer.id}/resume`)
                          }
                          className="gap-1"
                        >
                          <Play className="h-3 w-3" />
                          {isRTL ? 'استئناف' : 'Resume'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
