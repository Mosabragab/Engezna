'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { BucketDistribution, DailyGrantsPoint, SegmentDistribution } from '@/lib/admin-gifts';

interface GiftsAnalyticsClientProps {
  locale: string;
  dailyGrants: DailyGrantsPoint[];
  bucketDistribution: BucketDistribution[];
  segmentDistribution: SegmentDistribution[];
}

const SEGMENT_LABELS: Record<string, { ar: string; en: string }> = {
  new_user: { ar: 'عميل جديد', en: 'New' },
  champion: { ar: 'بطل', en: 'Champion' },
  regular: { ar: 'متوسط النشاط', en: 'Regular' },
  at_risk: { ar: 'مُعرّض للفقد', en: 'At risk' },
  churned: { ar: 'فاقد', en: 'Churned' },
  bargain_hunter: { ar: 'باحث عن العروض', en: 'Bargain' },
  high_value: { ar: 'قيمة عالية', en: 'High value' },
  remote_area: { ar: 'منطقة نائية', en: 'Remote' },
  undefined: { ar: 'غير محدد', en: 'Undefined' },
};

const SEGMENT_COLORS: Record<string, string> = {
  new_user: '#3b82f6',
  champion: '#10b981',
  regular: '#8b5cf6',
  at_risk: '#f59e0b',
  churned: '#ef4444',
  bargain_hunter: '#ec4899',
  high_value: '#14b8a6',
  remote_area: '#64748b',
  undefined: '#94a3b8',
};

const BUCKET_LABELS: Record<string, { ar: string; en: string }> = {
  mystery: { ar: 'صناديق المفاجآت', en: 'Mystery' },
  stamp: { ar: 'بطاقة الأختام', en: 'Stamp' },
  referral: { ar: 'الإحالة', en: 'Referral' },
  win_back: { ar: 'استعادة', en: 'Win-back' },
  welcome: { ar: 'الترحيب', en: 'Welcome' },
  manual_campaign: { ar: 'حملات يدوية', en: 'Campaigns' },
  birthday: { ar: 'عيد ميلاد', en: 'Birthday' },
  unknown: { ar: 'غير محدد', en: 'Unknown' },
};

const BUCKET_COLORS: Record<string, string> = {
  mystery: '#8b5cf6',
  stamp: '#f59e0b',
  referral: '#10b981',
  win_back: '#ef4444',
  welcome: '#3b82f6',
  manual_campaign: '#ec4899',
  birthday: '#f97316',
  unknown: '#94a3b8',
};

export function GiftsAnalyticsClient({
  locale,
  dailyGrants,
  bucketDistribution,
  segmentDistribution,
}: GiftsAnalyticsClientProps) {
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user));
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

  const lineData = dailyGrants.map((d) => ({
    date: d.date.slice(5),
    granted: d.granted,
    used: d.used,
  }));

  const segmentData = segmentDistribution.map((s) => ({
    name: isRTL
      ? (SEGMENT_LABELS[s.segment]?.ar ?? s.segment)
      : (SEGMENT_LABELS[s.segment]?.en ?? s.segment),
    count: s.count,
    raw: s.segment,
  }));

  const bucketData = bucketDistribution.map((b) => ({
    name: isRTL
      ? (BUCKET_LABELS[b.bucket]?.ar ?? b.bucket)
      : (BUCKET_LABELS[b.bucket]?.en ?? b.bucket),
    count: b.count,
    egp: Math.round(b.piasters / 100),
    raw: b.bucket,
  }));

  return (
    <>
      <AdminHeader
        user={user}
        title={isRTL ? 'تحليلات نظام الهدايا' : 'Gifts Analytics'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 overflow-auto p-4 lg:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mx-auto max-w-6xl space-y-6">
          {/* 30-day trend area chart */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-800">
              {isRTL
                ? 'آخر ٣٠ يومًا — الهدايا المُمنحة والمُستخدمة'
                : 'Last 30 days — granted vs used'}
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="grantedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="usedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="granted"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#grantedGradient)"
                    name={isRTL ? 'مُمنحة' : 'Granted'}
                  />
                  <Area
                    type="monotone"
                    dataKey="used"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#usedGradient)"
                    name={isRTL ? 'مُستخدمة' : 'Used'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Bucket count vs spend */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                {isRTL ? 'عدد الهدايا حسب الدلو' : 'Gift count by bucket'}
              </h3>
              <div className="h-64">
                {bucketData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bucketData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {bucketData.map((b) => (
                          <Cell key={b.raw} fill={BUCKET_COLORS[b.raw] ?? BUCKET_COLORS.unknown} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-20 text-center text-sm text-slate-400">
                    {isRTL ? 'لا توجد بيانات' : 'No data'}
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                {isRTL ? 'الإنفاق حسب الدلو (ج.م)' : 'Spend by bucket (EGP)'}
              </h3>
              <div className="h-64">
                {bucketData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bucketData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip
                        formatter={(value) => [`${Number(value)} ${isRTL ? 'ج.م' : 'EGP'}`, '']}
                      />
                      <Bar dataKey="egp" radius={[6, 6, 0, 0]}>
                        {bucketData.map((b) => (
                          <Cell key={b.raw} fill={BUCKET_COLORS[b.raw] ?? BUCKET_COLORS.unknown} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-20 text-center text-sm text-slate-400">
                    {isRTL ? 'لا توجد بيانات' : 'No data'}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Segment distribution */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-800">
              {isRTL
                ? 'توزيع شرائح العملاء (آخر snapshot)'
                : 'Customer segment distribution (latest snapshot)'}
            </h3>
            <div className="h-72">
              {segmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segmentData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {segmentData.map((s) => (
                        <Cell
                          key={s.raw}
                          fill={SEGMENT_COLORS[s.raw] ?? SEGMENT_COLORS.undefined}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-20 text-center text-sm text-slate-400">
                  {isRTL
                    ? 'لا توجد بيانات شرائح بعد. الـ cron اليومي يحسبها صباحًا.'
                    : 'No segment snapshots yet. The daily cron computes them in the morning.'}
                </p>
              )}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
