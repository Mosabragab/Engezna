'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
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
import { csrfHeaders } from '@/lib/security/csrf-client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  Calendar,
  DollarSign,
  Download,
  Loader2,
  Receipt,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { ErpOverview, ExpenseCategory, OperationalExpense } from '@/lib/admin-erp';

const CATEGORY_LABELS: Record<ExpenseCategory, { ar: string; en: string }> = {
  saas: { ar: 'خدمات SaaS', en: 'SaaS' },
  salary: { ar: 'رواتب', en: 'Salaries' },
  office: { ar: 'مكتب', en: 'Office' },
  legal: { ar: 'قانوني', en: 'Legal' },
  marketing_external: { ar: 'تسويق خارجي', en: 'External Marketing' },
  other: { ar: 'أخرى', en: 'Other' },
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

function formatEgp(piasters: number): string {
  return (piasters / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function ErpClient({ locale }: { locale: string }) {
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [overview, setOverview] = useState<ErpOverview | null>(null);
  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-expense form
  const [showForm, setShowForm] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [draft, setDraft] = useState<{
    category: ExpenseCategory;
    amountEgp: string;
    description: string;
    incurred_date: string;
  }>({
    category: 'saas',
    amountEgp: '',
    description: '',
    incurred_date: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, expRes] = await Promise.all([
        fetch(`/api/admin/erp/overview?month=${month}`, { cache: 'no-store' }),
        fetch(`/api/admin/erp/expenses?month=${month}`, { cache: 'no-store' }),
      ]);
      if (!ovRes.ok) throw new Error('overview_failed');
      const ov = await ovRes.json();
      setOverview(ov.overview);
      if (expRes.ok) {
        const exp = await expRes.json();
        setExpenses(exp.expenses || []);
      }
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل تحميل البيانات' : 'Failed to load ERP data');
    } finally {
      setLoading(false);
    }
  }, [month, isRTL]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAddExpense() {
    const amountEgp = Number(draft.amountEgp);
    if (!Number.isFinite(amountEgp) || amountEgp <= 0) {
      setError(isRTL ? 'القيمة يجب أن تكون أكبر من صفر' : 'Amount must be > 0');
      return;
    }
    if (!draft.description.trim()) {
      setError(isRTL ? 'الوصف مطلوب' : 'Description required');
      return;
    }
    setSavingExpense(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/erp/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          category: draft.category,
          amount_piasters: Math.round(amountEgp * 100),
          description: draft.description.trim(),
          incurred_date: draft.incurred_date,
        }),
      });
      if (!res.ok) throw new Error('save_failed');
      setShowForm(false);
      setDraft({
        category: 'saas',
        amountEgp: '',
        description: '',
        incurred_date: new Date().toISOString().slice(0, 10),
      });
      await load();
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm(isRTL ? 'حذف هذه المصاريف؟' : 'Delete this expense?')) return;
    try {
      const res = await fetch(`/api/admin/erp/expenses/${id}`, {
        method: 'DELETE',
        headers: { ...csrfHeaders() },
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError(isRTL ? 'فشل الحذف' : 'Delete failed');
    }
  }

  function exportToExcel() {
    if (!overview) return;
    const wb = XLSX.utils.book_new();

    const kpisSheet = [
      ['الفترة / Window', `${overview.windowStart} → ${overview.windowEnd}`],
      ['DAU', overview.kpis.dau],
      ['WAU', overview.kpis.wau],
      ['MAU', overview.kpis.mau],
      ['Total completed orders', overview.kpis.total_completed_orders],
      ['Avg order value (EGP)', formatEgp(overview.kpis.avg_order_value_piasters)],
      ['New customers', overview.kpis.new_customers],
      ['Conversion %', overview.kpis.conversion_rate_percent],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpisSheet), 'KPIs');

    const revenueSheet = [
      ['Component', 'EGP'],
      ['Commission', formatEgp(overview.revenue.commission_piasters)],
      ['Processing fees', formatEgp(overview.revenue.processing_fee_piasters)],
      ['Partner gifts (deducted)', formatEgp(overview.revenue.partner_gift_revenue_piasters)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenueSheet), 'Revenue');

    const budgetSheet = [
      ['Bucket', 'Allocated (EGP)', 'Spent (EGP)'],
      ...overview.marketingBudget.map((b) => [
        b.bucket,
        formatEgp(b.allocated_piasters),
        formatEgp(b.spent_piasters),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budgetSheet), 'Marketing Budget');

    const cashFlowSheet = [
      ['Month', 'Revenue (EGP)', 'Operating expenses (EGP)', 'Gift spend (EGP)', 'Net (EGP)'],
      ...overview.cashFlow.map((m) => [
        m.month_start,
        formatEgp(m.revenue_piasters),
        formatEgp(m.expenses_piasters),
        formatEgp(m.gift_spend_piasters),
        formatEgp(m.net_piasters),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cashFlowSheet), 'Cash Flow');

    const expensesSheet = [
      ['Date', 'Category', 'Description', 'Amount (EGP)'],
      ...expenses.map((e) => [
        e.incurred_date,
        CATEGORY_LABELS[e.category]?.en ?? e.category,
        e.description,
        formatEgp(e.amount_piasters),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expensesSheet), 'Expenses');

    XLSX.writeFile(wb, `engezna-erp-${overview.windowStart.slice(0, 7)}.xlsx`);
  }

  const totalRevenuePiasters = overview
    ? overview.revenue.commission_piasters +
      overview.revenue.processing_fee_piasters +
      overview.revenue.partner_gift_revenue_piasters
    : 0;

  const totalGiftSpendPiasters = useMemo(
    () => (overview?.marketingBudget ?? []).reduce((s, b) => s + Number(b.spent_piasters || 0), 0),
    [overview]
  );

  const netPiasters = overview
    ? totalRevenuePiasters - overview.totalExpensesPiasters - totalGiftSpendPiasters
    : 0;

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
    <>
      <AdminHeader
        user={user}
        title={isRTL ? 'ERP — الإدارة المالية والتشغيلية' : 'ERP — Financial & Operations'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 overflow-auto p-4 lg:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mx-auto max-w-6xl space-y-5">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-9 w-44"
                aria-label={isRTL ? 'الشهر' : 'Month'}
              />
            </div>
            <Button type="button" variant="outline" onClick={exportToExcel} disabled={!overview}>
              <Download className="h-4 w-4" />
              {isRTL ? 'تصدير Excel' : 'Export Excel'}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading || !overview ? (
            <Card className="p-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            </Card>
          ) : (
            <>
              {/* Headline KPI cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard
                  label={isRTL ? 'الإيرادات' : 'Revenue'}
                  value={`${formatEgp(totalRevenuePiasters)} ${isRTL ? 'ج.م' : 'EGP'}`}
                  hint={`${overview.revenue.delivered_orders_count} ${isRTL ? 'طلب' : 'orders'}`}
                  icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
                  accent="emerald"
                />
                <KpiCard
                  label={isRTL ? 'مصاريف تشغيلية' : 'Operating expenses'}
                  value={`${formatEgp(overview.totalExpensesPiasters)} ${isRTL ? 'ج.م' : 'EGP'}`}
                  hint={`${expenses.length} ${isRTL ? 'بند' : 'entries'}`}
                  icon={<Briefcase className="h-5 w-5 text-amber-500" />}
                  accent="amber"
                />
                <KpiCard
                  label={isRTL ? 'إنفاق الهدايا' : 'Gift spend'}
                  value={`${formatEgp(totalGiftSpendPiasters)} ${isRTL ? 'ج.م' : 'EGP'}`}
                  hint={
                    overview.monthlyTotalBudgetPiasters > 0
                      ? `${Math.round((totalGiftSpendPiasters / overview.monthlyTotalBudgetPiasters) * 100)}% ${isRTL ? 'من الميزانية' : 'of budget'}`
                      : ''
                  }
                  icon={<Sparkles className="h-5 w-5 text-purple-500" />}
                  accent="purple"
                />
                <KpiCard
                  label={isRTL ? 'صافي' : 'Net'}
                  value={`${formatEgp(netPiasters)} ${isRTL ? 'ج.م' : 'EGP'}`}
                  hint={netPiasters >= 0 ? (isRTL ? 'ربح' : 'profit') : isRTL ? 'خسارة' : 'loss'}
                  icon={
                    netPiasters >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )
                  }
                  accent={netPiasters >= 0 ? 'blue' : 'red'}
                />
              </div>

              {/* Activity KPIs */}
              <Card className="p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Users className="h-4 w-4 text-blue-500" />
                  {isRTL ? 'مؤشرات النشاط' : 'Activity KPIs'}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  <MiniKpi label="DAU" value={overview.kpis.dau} />
                  <MiniKpi label="WAU" value={overview.kpis.wau} />
                  <MiniKpi label="MAU" value={overview.kpis.mau} />
                  <MiniKpi
                    label={isRTL ? 'طلبات منجزة' : 'Completed'}
                    value={overview.kpis.total_completed_orders}
                  />
                  <MiniKpi
                    label={isRTL ? 'متوسط الطلب' : 'AOV'}
                    value={`${formatEgp(overview.kpis.avg_order_value_piasters)}`}
                    suffix={isRTL ? 'ج.م' : 'EGP'}
                  />
                  <MiniKpi
                    label={isRTL ? 'عملاء جدد' : 'New users'}
                    value={overview.kpis.new_customers}
                  />
                  <MiniKpi
                    label={isRTL ? 'تحويل %' : 'Conversion'}
                    value={`${overview.kpis.conversion_rate_percent}%`}
                  />
                </div>
              </Card>

              {/* Cash flow chart */}
              <Card className="p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  {isRTL ? 'التدفق النقدي — آخر ١٢ شهر' : 'Cash flow — last 12 months'}
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={overview.cashFlow.map((m) => ({
                        month: m.month_start.slice(0, 7),
                        revenue: Math.round(m.revenue_piasters / 100),
                        expenses: Math.round(m.expenses_piasters / 100),
                        gifts: Math.round(m.gift_spend_piasters / 100),
                        net: Math.round(m.net_piasters / 100),
                      }))}
                      margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip
                        formatter={(value) => [`${Number(value).toLocaleString()} EGP`, '']}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#revGradient)"
                        name={isRTL ? 'الإيرادات' : 'Revenue'}
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#expGradient)"
                        name={isRTL ? 'مصاريف' : 'Expenses'}
                      />
                      <Area
                        type="monotone"
                        dataKey="gifts"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="transparent"
                        strokeDasharray="4 4"
                        name={isRTL ? 'هدايا' : 'Gifts'}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Marketing budget bars */}
              <Card className="p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  {isRTL ? 'استهلاك ميزانية التسويق' : 'Marketing budget consumption'}
                </h3>
                <div className="h-64">
                  {overview.marketingBudget.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={overview.marketingBudget.map((b) => ({
                          name: isRTL
                            ? (BUCKET_LABELS[b.bucket]?.ar ?? b.bucket)
                            : (BUCKET_LABELS[b.bucket]?.en ?? b.bucket),
                          allocated: Math.round(b.allocated_piasters / 100),
                          spent: Math.round(b.spent_piasters / 100),
                          raw: b.bucket,
                        }))}
                        margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip
                          formatter={(value) => [`${Number(value).toLocaleString()} EGP`, '']}
                        />
                        <Legend />
                        <Bar
                          dataKey="allocated"
                          fill="#cbd5e1"
                          name={isRTL ? 'مخصص' : 'Allocated'}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar dataKey="spent" name={isRTL ? 'مصروف' : 'Spent'} radius={[4, 4, 0, 0]}>
                          {overview.marketingBudget.map((b) => (
                            <Cell
                              key={b.bucket}
                              fill={BUCKET_COLORS[b.bucket] ?? BUCKET_COLORS.unknown}
                            />
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

              {/* Operating expenses table */}
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Receipt className="h-4 w-4 text-amber-500" />
                    {isRTL ? 'المصاريف التشغيلية' : 'Operating expenses'}
                  </h3>
                  <Button type="button" size="sm" onClick={() => setShowForm((s) => !s)}>
                    {showForm ? (isRTL ? 'إغلاق' : 'Close') : isRTL ? '+ إضافة' : '+ Add'}
                  </Button>
                </div>

                {showForm && (
                  <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label htmlFor="exp-cat" className="text-xs">
                        {isRTL ? 'الفئة' : 'Category'}
                      </Label>
                      <select
                        id="exp-cat"
                        value={draft.category}
                        onChange={(e) =>
                          setDraft({ ...draft, category: e.target.value as ExpenseCategory })
                        }
                        className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                      >
                        {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((c) => (
                          <option key={c} value={c}>
                            {isRTL ? CATEGORY_LABELS[c].ar : CATEGORY_LABELS[c].en}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="exp-amount" className="text-xs">
                        {isRTL ? 'القيمة (ج.م)' : 'Amount (EGP)'}
                      </Label>
                      <Input
                        id="exp-amount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft.amountEgp}
                        onChange={(e) => setDraft({ ...draft, amountEgp: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="exp-date" className="text-xs">
                        {isRTL ? 'التاريخ' : 'Date'}
                      </Label>
                      <Input
                        id="exp-date"
                        type="date"
                        value={draft.incurred_date}
                        onChange={(e) => setDraft({ ...draft, incurred_date: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1">
                      <Label htmlFor="exp-desc" className="text-xs">
                        {isRTL ? 'الوصف' : 'Description'}
                      </Label>
                      <Input
                        id="exp-desc"
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        maxLength={200}
                      />
                    </div>
                    <div className="flex items-end gap-2 lg:col-span-4">
                      <Button type="button" onClick={handleAddExpense} disabled={savingExpense}>
                        {savingExpense ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isRTL ? (
                          'حفظ'
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {expenses.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    {isRTL ? 'لا توجد مصاريف لهذا الشهر' : 'No expenses this month'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-slate-500">
                        <tr className="border-b border-slate-200">
                          <th className={`py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {isRTL ? 'التاريخ' : 'Date'}
                          </th>
                          <th className={`py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {isRTL ? 'الفئة' : 'Category'}
                          </th>
                          <th className={`py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {isRTL ? 'الوصف' : 'Description'}
                          </th>
                          <th className={`py-2 tabular-nums ${isRTL ? 'text-left' : 'text-right'}`}>
                            {isRTL ? 'القيمة' : 'Amount'}
                          </th>
                          <th className="py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((e) => (
                          <tr key={e.id} className="border-b border-slate-100">
                            <td className="py-2 tabular-nums text-slate-600">{e.incurred_date}</td>
                            <td className="py-2 text-slate-700">
                              {isRTL
                                ? CATEGORY_LABELS[e.category]?.ar
                                : CATEGORY_LABELS[e.category]?.en}
                            </td>
                            <td className="py-2 text-slate-600 truncate max-w-[300px]">
                              {e.description}
                            </td>
                            <td
                              className={`py-2 tabular-nums font-medium ${isRTL ? 'text-left' : 'text-right'}`}
                            >
                              {formatEgp(e.amount_piasters)} {isRTL ? 'ج.م' : 'EGP'}
                            </td>
                            <td className="py-2 text-end">
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(e.id)}
                                className="rounded p-1 text-red-500 hover:bg-red-50"
                                aria-label={isRTL ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Revenue breakdown */}
              <Card className="p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  {isRTL ? 'تفصيل الإيرادات' : 'Revenue breakdown'}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <RevenueRow
                    label={isRTL ? 'العمولات' : 'Commissions'}
                    value={overview.revenue.commission_piasters}
                    isRTL={isRTL}
                  />
                  <RevenueRow
                    label={isRTL ? 'رسوم المعالجة' : 'Processing fees'}
                    value={overview.revenue.processing_fee_piasters}
                    isRTL={isRTL}
                  />
                  <RevenueRow
                    label={isRTL ? 'هدايا الشركاء (خصم)' : 'Partner gifts (deducted)'}
                    value={overview.revenue.partner_gift_revenue_piasters}
                    isRTL={isRTL}
                  />
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function MiniKpi({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
        {value}
        {suffix && <span className="ms-1 text-xs font-normal text-slate-500">{suffix}</span>}
      </p>
    </div>
  );
}

const ACCENT_BG: Record<string, string> = {
  emerald: 'bg-emerald-50',
  amber: 'bg-amber-50',
  purple: 'bg-purple-50',
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
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
          {hint && <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="flex-shrink-0">{icon}</div>
      </div>
    </Card>
  );
}

function RevenueRow({ label, value, isRTL }: { label: string; value: number; isRTL: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">
        {formatEgp(value)}{' '}
        <span className="text-xs font-normal text-slate-500">{isRTL ? 'ج.م' : 'EGP'}</span>
      </p>
    </div>
  );
}
