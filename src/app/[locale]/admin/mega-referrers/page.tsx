'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Card } from '@/components/ui/card';
import { Star, Loader2, AlertCircle } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  displayName: string | null;
  qualifiedAt: string | null;
  referralsCount: number | null;
  isFilled: boolean;
}

export default function AdminMegaReferrersPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
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
        const res = await fetch('/api/mega-referrer/leaderboard');
        if (!res.ok) {
          setError('failed_to_load');
          return;
        }
        const data = (await res.json()) as { leaderboard: LeaderboardEntry[] };
        setEntries(data.leaderboard);
      } catch {
        setError('network_error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filledCount = entries?.filter((e) => e.isFilled).length ?? 0;
  const remainingSlots = entries ? entries.length - filledCount : 0;

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
        title={isRTL ? 'Mega Referrers' : 'Mega Referrers'}
        onMenuClick={toggleSidebar}
      />

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Star className="text-amber-500" fill="currentColor" size={28} />
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isRTL ? 'أوائل المُحيلين' : 'Founder slots'}
            </h1>
            <p className="text-sm text-slate-500">
              {isRTL
                ? 'أول 10 محيلين يحققون 10+ إحالات ناجحة يحصلون على مضاعف نقاط ×1.25 دائم.'
                : 'First 10 referrers to hit 10+ successful referrals earn a permanent ×1.25 multiplier.'}
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
        ) : entries ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-xs font-medium uppercase text-slate-500">
                  {isRTL ? 'مُؤهَّلين' : 'Qualified'}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-purple-600">{filledCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium uppercase text-slate-500">
                  {isRTL ? 'مراكز متاحة' : 'Slots open'}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-emerald-600">{remainingSlots}</p>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-start font-medium">#</th>
                    <th className="px-4 py-2 text-start font-medium">
                      {isRTL ? 'المستخدم' : 'User'}
                    </th>
                    <th className="px-4 py-2 text-end font-medium">
                      {isRTL ? 'إحالات' : 'Referrals'}
                    </th>
                    <th className="px-4 py-2 text-end font-medium">
                      {isRTL ? 'التاريخ' : 'Qualified at'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((e) => (
                    <tr key={e.rank} className={e.isFilled ? 'bg-amber-50/50' : ''}>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {e.isFilled && e.rank <= 3 ? (
                          <span className="text-base">
                            {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          `#${e.rank}`
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {e.isFilled ? (
                          <span className="font-semibold text-slate-900">
                            {e.displayName ?? '—'}
                          </span>
                        ) : (
                          <span className="text-slate-400">{isRTL ? 'متاح' : 'Available'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end text-slate-700">
                        {e.referralsCount ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-end text-xs text-slate-500">
                        {e.qualifiedAt
                          ? new Date(e.qualifiedAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
