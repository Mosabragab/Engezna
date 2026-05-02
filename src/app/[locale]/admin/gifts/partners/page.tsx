'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { csrfHeaders } from '@/lib/security/csrf-client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Gift, Calendar, Package } from 'lucide-react';
import type { PartnerOfferWithGift, PartnerOfferStatus } from '@/lib/partner-gifts';

const STATUS_TABS: { key: PartnerOfferStatus | 'all'; ar: string; en: string }[] = [
  { key: 'pending_approval', ar: 'بانتظار الموافقة', en: 'Pending' },
  { key: 'approved', ar: 'معتمد', en: 'Approved' },
  { key: 'active', ar: 'نشط', en: 'Active' },
  { key: 'paused', ar: 'متوقف', en: 'Paused' },
  { key: 'rejected', ar: 'مرفوض', en: 'Rejected' },
  { key: 'ended', ar: 'منتهٍ', en: 'Ended' },
  { key: 'all', ar: 'الكل', en: 'All' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-slate-100 text-slate-600',
  ended: 'bg-slate-50 text-slate-500',
  rejected: 'bg-red-100 text-red-700',
};

export default function AdminPartnerGiftsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [offers, setOffers] = useState<PartnerOfferWithGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PartnerOfferStatus | 'all'>('pending_approval');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('status', activeTab);
      const res = await fetch(`/api/admin/gifts/partners?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load offers');
      const data = await res.json();
      setOffers(data.offers || []);
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل تحميل العروض' : 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, [activeTab, isRTL]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(offerId: string) {
    setBusyId(offerId);
    try {
      const res = await fetch(`/api/admin/gifts/partners/${offerId}/approve`, {
        method: 'POST',
        headers: { ...csrfHeaders() },
      });
      if (!res.ok) throw new Error('Failed to approve');
      await load();
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل الاعتماد' : 'Failed to approve');
    } finally {
      setBusyId(null);
    }
  }

  async function reject() {
    if (!rejectingId || !rejectReason.trim()) return;
    setBusyId(rejectingId);
    try {
      const res = await fetch(`/api/admin/gifts/partners/${rejectingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      setRejectingId(null);
      setRejectReason('');
      await load();
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل الرفض' : 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  }

  // Render the header only after auth resolves so we never pass a null user
  // to AdminHeader (whose prop is required).
  if (!user) {
    return (
      <main
        className="flex-1 p-4 lg:p-6 flex items-center justify-center"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={isRTL ? 'هدايا الشركاء' : 'Partner Gifts'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-5xl mx-auto space-y-4">
          {/* Tabs */}
          <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} role="tablist">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isRTL ? tab.ar : tab.en}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <Card className="p-10 text-center text-slate-500">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            </Card>
          ) : offers.length === 0 ? (
            <Card className="p-10 text-center">
              <Gift className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-base font-bold text-slate-800">
                {isRTL ? 'لا توجد عروض' : 'No offers'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const title = isRTL ? offer.gift?.title_ar : offer.gift?.title_en;
                const provider = isRTL ? offer.provider?.name_ar : offer.provider?.name_en;
                return (
                  <Card key={offer.id} className="p-4">
                    <div
                      className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <h3 className="font-bold text-slate-900 truncate">{title || '—'}</h3>
                          <span
                            className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_COLORS[offer.status]}`}
                          >
                            {offer.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {isRTL ? 'المتجر:' : 'Provider:'} <strong>{provider || '—'}</strong>
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                          <p className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(offer.starts_at).toLocaleDateString(
                              isRTL ? 'ar-EG' : 'en-US'
                            )}
                            {' — '}
                            {new Date(offer.ends_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                          </p>
                          <p className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {isRTL ? 'حد أقصى:' : 'Max:'} {offer.max_orders}
                            {' • '}
                            {isRTL ? 'استُخدم:' : 'Used:'} {offer.used_orders}
                          </p>
                        </div>
                        {offer.gift && (
                          <p className="mt-2 text-xs text-slate-500">
                            {isRTL ? 'القيمة:' : 'Value:'}{' '}
                            <strong>
                              {offer.gift.value_piasters / 100}{' '}
                              {offer.gift.type === 'discount_percent' ? '%' : isRTL ? 'ج.م' : 'EGP'}
                            </strong>
                            {' • '}
                            {isRTL ? 'حد أدنى للطلب:' : 'Min order:'}{' '}
                            {offer.gift.min_order_piasters / 100} {isRTL ? 'ج.م' : 'EGP'}
                          </p>
                        )}
                        {offer.rejection_reason && (
                          <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                            {isRTL ? 'سبب الرفض:' : 'Reason:'} {offer.rejection_reason}
                          </p>
                        )}
                      </div>

                      {offer.status === 'pending_approval' && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === offer.id}
                            onClick={() => approve(offer.id)}
                            className="gap-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {isRTL ? 'اعتماد' : 'Approve'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId === offer.id}
                            onClick={() => {
                              setRejectingId(offer.id);
                              setRejectReason('');
                            }}
                            className="gap-1 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-3 w-3" />
                            {isRTL ? 'رفض' : 'Reject'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Inline reject form */}
                    {rejectingId === offer.id && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                        <label
                          htmlFor={`reject-${offer.id}`}
                          className="block text-xs font-bold text-red-700 mb-1"
                        >
                          {isRTL
                            ? 'سبب الرفض (للتاجر):'
                            : 'Rejection reason (visible to provider):'}
                        </label>
                        <textarea
                          id={`reject-${offer.id}`}
                          rows={2}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full rounded border border-red-200 px-2 py-1 text-sm"
                          placeholder={
                            isRTL
                              ? 'مثلاً: قيمة الخصم أعلى من المسموح'
                              : 'e.g. Discount value exceeds the policy limit'
                          }
                        />
                        <div
                          className={`mt-2 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === offer.id || !rejectReason.trim()}
                            onClick={reject}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {isRTL ? 'تأكيد الرفض' : 'Confirm reject'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason('');
                            }}
                          >
                            {isRTL ? 'إلغاء' : 'Cancel'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
