'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Card } from '@/components/ui/card';
import { Flame, Loader2, AlertCircle, Trophy } from 'lucide-react';

interface StreakAnalytics {
  totalUsersWithStreak: number;
  activeCount: number;
  longestStreakWeeks: number;
  longestUserId: string | null;
  tierCounts: { none: number; silver: number; gold: number; platinum: number };
}

const TIER_META: Array<{
  key: keyof StreakAnalytics['tierCounts'];
  ar: string;
  en: string;
  emoji: string;
  color: string;
}> = [
  {
    key: 'platinum',
    ar: 'بلاتيني',
    en: 'Platinum',
    emoji: '💎',
    color: 'bg-purple-100 text-purple-700',
  },
  { key: 'gold', ar: 'ذهبي', en: 'Gold', emoji: '🥇', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'silver', ar: 'فضي', en: 'Silver', emoji: '🥈', color: 'bg-slate-100 text-slate-700' },
  {
    key: 'none',
    ar: 'بدون مستوى',
    en: 'No tier',
    emoji: '🔥',
    color: 'bg-amber-100 text-amber-700',
  },
];

export default function AdminStreaksPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<StreakAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user ?? null));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/streaks');
        if (!res.ok) {
          setError('failed_to_load');
          return;
        }
        setData((await res.json()) as StreakAnalytics);
      } catch {
        setError('network_error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        title={isRTL ? 'تحليلات Streaks' : 'Streak analytics'}
        onMenuClick={toggleSidebar}
      />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Flame className="text-amber-500" size={28} />
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isRTL ? 'سلاسل العملاء الأسبوعية' : 'Customer weekly streaks'}
            </h1>
            <p className="text-sm text-slate-500">
              {isRTL
                ? 'العملاء النشطون يطلبون كل أسبوع بقيمة ≥ 200 ج.م.'
                : 'Active users order weekly with subtotal ≥ 200 EGP.'}
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
        ) : data ? (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs font-medium uppercase text-slate-500">
                  {isRTL ? 'إجمالي العملاء بـ streak' : 'Total users with streak'}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  {data.totalUsersWithStreak.toLocaleString(isRTL ? 'ar' : 'en')}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium uppercase text-slate-500">
                  {isRTL ? 'النشطون حاليًا' : 'Currently active'}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-600">
                  {data.activeCount.toLocaleString(isRTL ? 'ar' : 'en')}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  <p className="text-xs font-medium uppercase text-slate-500">
                    {isRTL ? 'أطول سلسلة' : 'Longest streak'}
                  </p>
                </div>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  {data.longestStreakWeeks}{' '}
                  <span className="text-sm font-medium text-slate-500">
                    {isRTL ? 'أسبوع' : 'weeks'}
                  </span>
                </p>
                {data.longestUserId && (
                  <p
                    className="mt-1 truncate text-[10px] text-slate-400"
                    title={data.longestUserId}
                  >
                    {data.longestUserId}
                  </p>
                )}
              </Card>
            </div>

            <Card className="p-5">
              <h2 className="mb-4 text-base font-bold text-slate-900">
                {isRTL ? 'توزيع المستويات' : 'Tier distribution'}
              </h2>
              <div className="space-y-3">
                {TIER_META.map((meta) => {
                  const count = data.tierCounts[meta.key];
                  const pct = data.totalUsersWithStreak
                    ? Math.round((count / data.totalUsersWithStreak) * 100)
                    : 0;
                  return (
                    <div key={meta.key} className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-9 w-24 items-center justify-center rounded-full text-sm font-bold ${meta.color}`}
                      >
                        {meta.emoji} {isRTL ? meta.ar : meta.en}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-16 text-end text-sm font-bold text-slate-700">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
