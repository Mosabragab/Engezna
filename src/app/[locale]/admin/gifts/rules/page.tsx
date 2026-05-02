'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Activity,
  AlertCircle,
  Calendar,
  Check,
  Loader2,
  Pause,
  Pencil,
  Play,
  X,
} from 'lucide-react';
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

interface DraftRule {
  valueEgp: string;
  budgetCapPerDayEgp: string;
  budgetCapPerMonthEgp: string;
  description: string;
}

function ruleToDraft(rule: GiftRuleRow): DraftRule {
  const value = (rule.action as { value_piasters?: number })?.value_piasters ?? 0;
  return {
    valueEgp: (value / 100).toFixed(0),
    budgetCapPerDayEgp:
      rule.budget_cap_per_day !== null ? (rule.budget_cap_per_day / 100).toFixed(0) : '',
    budgetCapPerMonthEgp:
      rule.budget_cap_per_month !== null ? (rule.budget_cap_per_month / 100).toFixed(0) : '',
    description: rule.description ?? '',
  };
}

export default function AdminGiftRulesPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [rules, setRules] = useState<GiftRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftRule | null>(null);

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
    setError(null);
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

  function startEdit(rule: GiftRuleRow) {
    setEditingId(rule.id);
    setDraft(ruleToDraft(rule));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(rule: GiftRuleRow) {
    if (!draft) return;
    setBusyId(rule.id);
    setError(null);

    const valueEgp = Number(draft.valueEgp);
    if (!Number.isFinite(valueEgp) || valueEgp <= 0) {
      setError(isRTL ? 'قيمة الهدية يجب أن تكون أكبر من صفر' : 'Gift value must be > 0');
      setBusyId(null);
      return;
    }

    const patch: Record<string, unknown> = {
      action_value_piasters: Math.round(valueEgp * 100),
      description: draft.description.trim() || null,
    };

    if (draft.budgetCapPerDayEgp.trim() === '') {
      patch.budget_cap_per_day = null;
    } else {
      const dayCap = Number(draft.budgetCapPerDayEgp);
      if (!Number.isFinite(dayCap) || dayCap < 0) {
        setError(isRTL ? 'حد اليومي غير صالح' : 'Invalid daily cap');
        setBusyId(null);
        return;
      }
      patch.budget_cap_per_day = Math.round(dayCap * 100);
    }

    if (draft.budgetCapPerMonthEgp.trim() === '') {
      patch.budget_cap_per_month = null;
    } else {
      const monthCap = Number(draft.budgetCapPerMonthEgp);
      if (!Number.isFinite(monthCap) || monthCap < 0) {
        setError(isRTL ? 'حد الشهري غير صالح' : 'Invalid monthly cap');
        setBusyId(null);
        return;
      }
      patch.budget_cap_per_month = Math.round(monthCap * 100);
    }

    try {
      const res = await fetch(`/api/admin/gifts/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Failed');
      cancelEdit();
      await load();
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل الحفظ' : 'Save failed');
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
              ? 'تتحكم القواعد في متى تُمنح الهدايا تلقائيًا (مثل ترحيب العميل الجديد، استعادة العملاء النائمين، الأختام). تقدر تعدّل قيمة الهدية وحدود الميزانية اليومية/الشهرية لكل قاعدة. الحملات اليدوية وعيد الميلاد منفصلة.'
              : "Rules trigger automatic gift grants (welcome, win-back, stamps). You can edit each rule's gift value and daily/monthly caps. Manual campaigns and birthday gifts are managed separately."}
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
                const isEditing = editingId === rule.id;

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
                        {!isEditing && rule.description && (
                          <p className="mt-1 text-xs text-slate-500">{rule.description}</p>
                        )}
                        {!isEditing && (
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
                        )}
                        {!isEditing && (
                          <p className="mt-1 text-xs text-slate-500">
                            {isRTL ? 'مرات التفعيل:' : 'Applied:'}{' '}
                            <strong>{rule.applied_count}</strong>
                            {' • '}
                            {isRTL ? 'إجمالي التكلفة:' : 'Total cost:'}{' '}
                            <strong>{(rule.total_cost_piasters / 100).toFixed(0)}</strong>{' '}
                            {isRTL ? 'ج.م' : 'EGP'}
                            {rule.budget_cap_per_day !== null && (
                              <>
                                {' • '}
                                {isRTL ? 'حد يومي:' : 'Daily cap:'}{' '}
                                <strong>{(rule.budget_cap_per_day / 100).toFixed(0)}</strong>{' '}
                                {isRTL ? 'ج.م' : 'EGP'}
                              </>
                            )}
                            {rule.budget_cap_per_month !== null && (
                              <>
                                {' • '}
                                {isRTL ? 'حد شهري:' : 'Monthly cap:'}{' '}
                                <strong>{(rule.budget_cap_per_month / 100).toFixed(0)}</strong>{' '}
                                {isRTL ? 'ج.م' : 'EGP'}
                              </>
                            )}
                          </p>
                        )}

                        {isEditing && draft && (
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <Label htmlFor={`desc-${rule.id}`} className="text-xs">
                                {isRTL ? 'الوصف' : 'Description'}
                              </Label>
                              <Input
                                id={`desc-${rule.id}`}
                                value={draft.description}
                                onChange={(e) =>
                                  setDraft({ ...draft, description: e.target.value })
                                }
                                maxLength={500}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`value-${rule.id}`} className="text-xs">
                                {isRTL ? 'قيمة الهدية (ج.م)' : 'Gift value (EGP)'}
                              </Label>
                              <Input
                                id={`value-${rule.id}`}
                                type="number"
                                min={1}
                                step={1}
                                value={draft.valueEgp}
                                onChange={(e) => setDraft({ ...draft, valueEgp: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`day-${rule.id}`} className="text-xs">
                                {isRTL
                                  ? 'حد يومي (ج.م — اتركه فارغًا للا حد)'
                                  : 'Daily cap (EGP — empty = none)'}
                              </Label>
                              <Input
                                id={`day-${rule.id}`}
                                type="number"
                                min={0}
                                step={1}
                                value={draft.budgetCapPerDayEgp}
                                onChange={(e) =>
                                  setDraft({ ...draft, budgetCapPerDayEgp: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor={`month-${rule.id}`} className="text-xs">
                                {isRTL
                                  ? 'حد شهري (ج.م — اتركه فارغًا للا حد)'
                                  : 'Monthly cap (EGP — empty = none)'}
                              </Label>
                              <Input
                                id={`month-${rule.id}`}
                                type="number"
                                min={0}
                                step={1}
                                value={draft.budgetCapPerMonthEgp}
                                onChange={(e) =>
                                  setDraft({ ...draft, budgetCapPerMonthEgp: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-shrink-0 flex-col items-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              disabled={busyId === rule.id}
                              onClick={() => saveEdit(rule)}
                              className="gap-1"
                            >
                              {busyId === rule.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              {isRTL ? 'حفظ' : 'Save'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              disabled={busyId === rule.id}
                              className="gap-1"
                            >
                              <X className="h-3 w-3" />
                              {isRTL ? 'إلغاء' : 'Cancel'}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(rule)}
                              disabled={busyId === rule.id}
                              className="gap-1"
                            >
                              <Pencil className="h-3 w-3" />
                              {isRTL ? 'تعديل' : 'Edit'}
                            </Button>
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
                          </>
                        )}
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
