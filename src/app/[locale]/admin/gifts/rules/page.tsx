'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Activity, AlertCircle, Calendar, Loader2, Pause, Play } from 'lucide-react';
import type { GiftRuleRow } from '@/lib/admin-gifts';

const TRIGGER_LABELS: Record<string, { ar: string; en: string }> = {
  order_completed: { ar: 'إكمال طلب', en: 'Order completed' },
  order_cancelled: { ar: 'إلغاء طلب', en: 'Order cancelled' },
  user_registered: { ar: 'تسجيل عميل', en: 'User registered' },
  user_verified_email: { ar: 'تأكيد البريد', en: 'Email verified' },
  daily_segment_update: { ar: 'تحديث شرائح يومي', en: 'Daily segment update' },
};

const BUCKET_LABELS: Record<string, { ar: string; en: string }> = {
  mystery: { ar: 'صناديق المفاجآت', en: 'Mystery' },
  stamp: { ar: 'بطاقة الأختام', en: 'Stamp' },
  referral: { ar: 'الإحالة', en: 'Referral' },
  win_back: { ar: 'استعادة', en: 'Win-back' },
  welcome: { ar: 'الترحيب', en: 'Welcome' },
};

export default function AdminGiftRulesPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [rules, setRules] = useState<GiftRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/gifts/rules', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRules(data.rules || []);
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل تحميل القواعد' : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(id: string, isActive: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/gifts/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error('Failed');
      await load();
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل التحديث' : 'Update failed');
    } finally {
      setBusyId(null);
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
    <>
      <AdminHeader
        user={user}
        title={isRTL ? 'محرك قواعد الهدايا' : 'Gift Rule Engine'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 overflow-auto p-4 lg:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mx-auto max-w-5xl space-y-4">
          <p className="text-sm text-slate-600">
            {isRTL
              ? 'تتحكم القواعد في متى تُمنح الهدايا تلقائيًا (مثل ترحيب العميل الجديد، استعادة العملاء النائمين، الأختام). الحملات اليدوية وعيد الميلاد منفصلة.'
              : 'Rules trigger automatic gift grants (welcome, win-back, stamps). Manual campaigns and birthday gifts are managed separately.'}
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <Card className="p-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            </Card>
          ) : rules.length === 0 ? (
            <Card className="p-10 text-center">
              <Activity className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-base font-bold text-slate-800">
                {isRTL ? 'لا توجد قواعد' : 'No rules'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {isRTL
                  ? 'يتم seed القواعد من migration 20260428000003.'
                  : 'Rules are seeded by migration 20260428000003.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const triggerMeta = TRIGGER_LABELS[rule.trigger] ?? {
                  ar: rule.trigger,
                  en: rule.trigger,
                };
                const bucketMeta = BUCKET_LABELS[rule.budget_bucket] ?? {
                  ar: rule.budget_bucket,
                  en: rule.budget_bucket,
                };
                const valuePiasters =
                  (rule.action as { value_piasters?: number })?.value_piasters ?? 0;
                return (
                  <Card key={rule.id} className="p-4">
                    <div
                      className={`flex items-start justify-between gap-3 ${
                        isRTL ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div
                          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Activity className="h-4 w-4 text-slate-500" />
                          <h3 className="truncate font-bold text-slate-900">{rule.name}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              rule.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {rule.is_active
                              ? isRTL
                                ? 'نشط'
                                : 'Active'
                              : isRTL
                                ? 'متوقف'
                                : 'Paused'}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="mt-1 text-xs text-slate-500">{rule.description}</p>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
                          <p>
                            {isRTL ? 'المُحفّز:' : 'Trigger:'}{' '}
                            <span className="font-medium text-slate-700">
                              {isRTL ? triggerMeta.ar : triggerMeta.en}
                            </span>
                          </p>
                          <p>
                            {isRTL ? 'الدلو:' : 'Bucket:'}{' '}
                            <span className="font-medium text-slate-700">
                              {isRTL ? bucketMeta.ar : bucketMeta.en}
                            </span>
                          </p>
                          <p>
                            {isRTL ? 'القيمة:' : 'Value:'}{' '}
                            <span className="font-medium text-slate-700 tabular-nums">
                              {(valuePiasters / 100).toFixed(0)} {isRTL ? 'ج.م' : 'EGP'}
                            </span>
                          </p>
                          <p>
                            <Calendar className="mb-0.5 inline h-3 w-3" />{' '}
                            <span className="tabular-nums">
                              {new Date(rule.created_at).toLocaleDateString(
                                isRTL ? 'ar-EG' : 'en-US'
                              )}
                            </span>
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {isRTL ? 'مرات التفعيل:' : 'Applied:'}{' '}
                          <strong>{rule.applied_count}</strong>
                          {' • '}
                          {isRTL ? 'إجمالي التكلفة:' : 'Total cost:'}{' '}
                          <strong>{(rule.total_cost_piasters / 100).toFixed(0)}</strong>{' '}
                          {isRTL ? 'ج.م' : 'EGP'}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === rule.id}
                          onClick={() => toggleActive(rule.id, rule.is_active)}
                          className="gap-1"
                        >
                          {rule.is_active ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          {rule.is_active
                            ? isRTL
                              ? 'إيقاف'
                              : 'Pause'
                            : isRTL
                              ? 'تفعيل'
                              : 'Activate'}
                        </Button>
                      </div>
                    </div>
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
