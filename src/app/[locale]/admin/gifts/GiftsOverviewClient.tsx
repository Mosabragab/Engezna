'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Card } from '@/components/ui/card';
import {
  Gift,
  Loader2,
  Megaphone,
  Sparkles,
  TrendingUp,
  Wallet,
  Activity,
  AlertCircle,
} from 'lucide-react';
import type { BucketDistribution, DailyGrantsPoint, GiftsOverviewKpis } from '@/lib/admin-gifts';

interface GiftsOverviewClientProps {
  locale: string;
  overview: GiftsOverviewKpis;
  dailyGrants: DailyGrantsPoint[];
  bucketDistribution: BucketDistribution[];
}

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

function formatPiastersToEgp(piasters: number): string {
  return (piasters / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function GiftsOverviewClient({
  locale,
  overview,
  dailyGrants,
  bucketDistribution,
}: GiftsOverviewClientProps) {
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

  const budgetUsedPercent =
    overview.monthlyBudgetPiasters > 0
      ? Math.min(
          100,
          Math.round((overview.totalSpendThisMonthPiasters / overview.monthlyBudgetPiasters) * 100)
        )
      : 0;

  const conversionPercent = Math.round(overview.conversionRate * 100);

  const pieData = bucketDistribution
    .filter((b) => b.count > 0)
    .map((b) => ({
      name: isRTL
        ? (BUCKET_LABELS[b.bucket]?.ar ?? b.bucket)
        : (BUCKET_LABELS[b.bucket]?.en ?? b.bucket),
      value: b.count,
      bucket: b.bucket,
    }));

  const lineData = dailyGrants.map((d) => ({
    date: d.date.slice(5), // MM-DD
    granted: d.granted,
    used: d.used,
  }));

  return (
    <>
      <AdminHeader
        user={user}
        title={isRTL ? 'نظرة عامة — نظام الهدايا' : 'Gifts Overview'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 overflow-auto p-4 lg:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Quick links to sub-pages */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickLink
              href={`/${locale}/admin/gifts/rules`}
              label={isRTL ? 'محرك القواعد' : 'Rules'}
              icon={<Activity className="h-4 w-4" />}
              count={overview.activeRules}
            />
            <QuickLink
              href={`/${locale}/admin/gifts/campaigns`}
              label={isRTL ? 'الحملات' : 'Campaigns'}
              icon={<Megaphone className="h-4 w-4" />}
              count={overview.activeCampaigns}
            />
            <QuickLink
              href={`/${locale}/admin/gifts/partners`}
              label={isRTL ? 'الشركاء' : 'Partners'}
              icon={<Gift className="h-4 w-4" />}
              count={overview.pendingPartnerOffers}
              highlight={overview.pendingPartnerOffers > 0}
            />
            <QuickLink
              href={`/${locale}/admin/gifts/budget`}
              label={isRTL ? 'الميزانية' : 'Budget'}
              icon={<Wallet className="h-4 w-4" />}
            />
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard
              label={isRTL ? 'هدايا نشطة' : 'Active gifts'}
              value={overview.activeGifts.toLocaleString()}
              hint={isRTL ? 'في صناديق العملاء' : 'in customer boxes'}
              icon={<Gift className="h-5 w-5 text-purple-500" />}
              accent="purple"
            />
            <KpiCard
              label={isRTL ? 'مُمنحة اليوم' : 'Granted today'}
              value={overview.giftsGrantedToday.toLocaleString()}
              hint={
                isRTL ? `استُخدمت: ${overview.giftsUsedToday}` : `Used: ${overview.giftsUsedToday}`
              }
              icon={<Sparkles className="h-5 w-5 text-emerald-500" />}
              accent="emerald"
            />
            <KpiCard
              label={isRTL ? 'معدل التحويل (٣٠ يوم)' : 'Conversion (30d)'}
              value={`${conversionPercent}%`}
              hint={
                isRTL
                  ? `${overview.usedLast30}/${overview.grantedLast30} استُخدمت`
                  : `${overview.usedLast30}/${overview.grantedLast30} used`
              }
              icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
              accent="amber"
            />
            <KpiCard
              label={isRTL ? 'الإنفاق هذا الشهر' : 'Spend this month'}
              value={`${formatPiastersToEgp(overview.totalSpendThisMonthPiasters)} ${
                isRTL ? 'ج.م' : 'EGP'
              }`}
              hint={
                overview.monthlyBudgetPiasters > 0
                  ? isRTL
                    ? `${budgetUsedPercent}% من الميزانية`
                    : `${budgetUsedPercent}% of budget`
                  : isRTL
                    ? 'لا توجد ميزانية محددة'
                    : 'no budget set'
              }
              icon={<Wallet className="h-5 w-5 text-blue-500" />}
              accent={budgetUsedPercent > 90 ? 'red' : 'blue'}
            />
          </div>

          {/* Budget bar */}
          {overview.monthlyBudgetPiasters > 0 && (
            <Card className="p-4">
              <div className={`mb-2 flex items-center justify-between gap-2`}>
                <h3 className="text-sm font-bold text-slate-800">
                  {isRTL ? 'استخدام الميزانية الشهرية' : 'Monthly budget usage'}
                </h3>
                <span className="text-xs text-slate-500 tabular-nums">
                  {formatPiastersToEgp(overview.totalSpendThisMonthPiasters)} /{' '}
                  {formatPiastersToEgp(overview.monthlyBudgetPiasters)} {isRTL ? 'ج.م' : 'EGP'}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetUsedPercent > 90
                      ? 'bg-red-500'
                      : budgetUsedPercent > 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${budgetUsedPercent}%` }}
                />
              </div>
              {budgetUsedPercent > 90 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {isRTL
                    ? 'وصلت لـ 90% من الميزانية الشهرية — راجع الميزانية'
                    : 'Reached 90% of monthly budget — review budget'}
                </p>
              )}
            </Card>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Daily grants line chart */}
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                {isRTL ? 'الهدايا — آخر ١٤ يومًا' : 'Gifts — last 14 days'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="granted"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      name={isRTL ? 'مُمنحة' : 'Granted'}
                    />
                    <Line
                      type="monotone"
                      dataKey="used"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name={isRTL ? 'مُستخدمة' : 'Used'}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Bucket distribution pie */}
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                {isRTL ? 'التوزيع حسب الدلو (٣٠ يوم)' : 'Bucket distribution (30d)'}
              </h3>
              <div className="h-64">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ percent }) =>
                          percent !== undefined && percent > 0.05
                            ? `${Math.round(percent * 100)}%`
                            : ''
                        }
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.bucket}
                            fill={BUCKET_COLORS[entry.bucket] ?? BUCKET_COLORS.unknown}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-20 text-center text-sm text-slate-400">
                    {isRTL ? 'لا توجد بيانات' : 'No data'}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Spend by bucket bar */}
          {overview.spendByBucket.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-800">
                {isRTL ? 'الإنفاق حسب الدلو هذا الشهر' : 'Spend by bucket this month'}
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={overview.spendByBucket.map((b) => ({
                      bucket: isRTL
                        ? (BUCKET_LABELS[b.bucket]?.ar ?? b.bucket)
                        : (BUCKET_LABELS[b.bucket]?.en ?? b.bucket),
                      egp: Math.round(b.piasters / 100),
                      raw: b.bucket,
                    }))}
                    margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      formatter={(value) => [`${Number(value)} ${isRTL ? 'ج.م' : 'EGP'}`, '']}
                    />
                    <Bar dataKey="egp" radius={[6, 6, 0, 0]}>
                      {overview.spendByBucket.map((b) => (
                        <Cell
                          key={b.bucket}
                          fill={BUCKET_COLORS[b.bucket] ?? BUCKET_COLORS.unknown}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Link
            href={`/${locale}/admin/gifts/analytics`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {isRTL ? 'تحليلات أعمق ←' : 'Deeper analytics →'}
          </Link>
        </div>
      </main>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function QuickLink({
  href,
  label,
  icon,
  count,
  highlight,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between rounded-xl border p-3 transition-all hover:shadow-md ${
        highlight
          ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
          : 'border-slate-200 bg-white hover:border-primary/40'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-slate-500 group-hover:text-primary">{icon}</span>
        <span className="text-sm font-medium text-slate-800">{label}</span>
      </div>
      {typeof count === 'number' && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
            highlight
              ? 'bg-amber-200 text-amber-800'
              : 'bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary'
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

const ACCENT_BG: Record<string, string> = {
  purple: 'bg-purple-50',
  emerald: 'bg-emerald-50',
  amber: 'bg-amber-50',
  blue: 'bg-blue-50',
  red: 'bg-red-50',
};

function KpiCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  accent: keyof typeof ACCENT_BG;
}) {
  return (
    <Card className={`p-4 ${ACCENT_BG[accent] ?? 'bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-600">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="flex-shrink-0">{icon}</div>
      </div>
    </Card>
  );
}
