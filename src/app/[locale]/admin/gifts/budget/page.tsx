'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, Loader2, Wallet } from 'lucide-react';
import type { RetentionSettingsRow } from '@/lib/admin-gifts';

const BUCKET_PERCENT_FIELDS: Array<{
  field: keyof RetentionSettingsRow;
  ar: string;
  en: string;
}> = [
  { field: 'bucket_mystery_percent', ar: 'صناديق المفاجآت', en: 'Mystery box' },
  { field: 'bucket_stamp_percent', ar: 'بطاقة الأختام', en: 'Stamp card' },
  { field: 'bucket_referral_percent', ar: 'الإحالة', en: 'Referral' },
  { field: 'bucket_winback_percent', ar: 'استعادة العملاء', en: 'Win-back' },
  { field: 'bucket_welcome_percent', ar: 'الترحيب', en: 'Welcome' },
];

export default function AdminGiftsBudgetPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<RetentionSettingsRow | null>(null);
  const [draft, setDraft] = useState<Partial<RetentionSettingsRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/gifts/budget', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSettings(data.settings);
      setDraft(data.settings);
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل تحميل الإعدادات' : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof RetentionSettingsRow>(field: K, value: RetentionSettingsRow[K]) {
    setDraft((d) => ({ ...(d ?? {}), [field]: value }));
  }

  // Compute the diff so we only PATCH what changed
  const patch = useMemo(() => {
    if (!settings || !draft) return {} as Partial<RetentionSettingsRow>;
    const result: Partial<RetentionSettingsRow> = {};
    for (const key of Object.keys(draft) as Array<keyof RetentionSettingsRow>) {
      if (key === 'id' || key === 'updated_by' || key === 'updated_at') continue;
      if (draft[key] !== settings[key]) {
        (result as Record<string, unknown>)[key] = draft[key];
      }
    }
    return result;
  }, [draft, settings]);

  const dirty = Object.keys(patch).length > 0;

  // Sum-of-buckets validation
  const bucketSum = useMemo(() => {
    if (!draft) return 0;
    return BUCKET_PERCENT_FIELDS.reduce(
      (acc, b) => acc + (Number(draft[b.field as keyof RetentionSettingsRow]) || 0),
      0
    );
  }, [draft]);

  async function handleSave() {
    if (!dirty || bucketSum > 100) return;
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const res = await fetch('/api/admin/gifts/budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data.error as string) || 'Failed');
        return;
      }
      setSettings(data.settings);
      setDraft(data.settings);
      setSavedAt(Date.now());
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!user || loading || !draft) {
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
        title={isRTL ? 'ميزانية نظام الهدايا' : 'Gifts Budget'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 overflow-auto p-4 lg:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-sm text-slate-600">
            {isRTL
              ? 'تتحكم هذه الإعدادات في الميزانية الشهرية الكلية لنظام الهدايا، توزيع الدلاء، وحدود قيمة الهدية لكل شريحة طلب. التعديلات تظهر فورًا في الإنتاج.'
              : 'These settings drive the system-wide monthly gift budget, bucket allocation, and per-tier gift caps. Changes apply immediately in production.'}
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {savedAt && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <Check className="h-4 w-4 flex-shrink-0" />
              {isRTL ? 'تم الحفظ.' : 'Saved.'}
            </div>
          )}

          {/* Monthly budget */}
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Wallet className="h-4 w-4 text-blue-500" />
              {isRTL ? 'الميزانية الشهرية' : 'Monthly budget'}
            </h3>
            <div>
              <Label htmlFor="monthly_budget" className="text-xs">
                {isRTL ? 'الميزانية الكلية (بالقروش)' : 'Total budget (piasters)'}
              </Label>
              <Input
                id="monthly_budget"
                type="number"
                min={0}
                value={draft.monthly_total_budget_piasters ?? 0}
                onChange={(e) => update('monthly_total_budget_piasters', Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-slate-500">
                ≈ {((Number(draft.monthly_total_budget_piasters) || 0) / 100).toLocaleString()}{' '}
                {isRTL ? 'ج.م' : 'EGP'}
              </p>
            </div>
            <div className="mt-3">
              <Label htmlFor="overflow" className="text-xs">
                {isRTL ? 'هامش التجاوز المسموح %' : 'Overflow tolerance %'}
              </Label>
              <Input
                id="overflow"
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={draft.overflow_tolerance_percent ?? 0}
                onChange={(e) => update('overflow_tolerance_percent', Number(e.target.value))}
              />
            </div>
          </Card>

          {/* Bucket allocation */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                {isRTL ? 'توزيع الدلاء (% من الميزانية)' : 'Bucket allocation (% of budget)'}
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                  bucketSum > 100
                    ? 'bg-red-100 text-red-700'
                    : bucketSum === 100
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isRTL ? 'المجموع: ' : 'Sum: '}
                {bucketSum.toFixed(2)}%
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BUCKET_PERCENT_FIELDS.map((b) => (
                <div key={b.field}>
                  <Label htmlFor={b.field} className="text-xs">
                    {isRTL ? b.ar : b.en}
                  </Label>
                  <Input
                    id={b.field}
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={Number(draft[b.field as keyof RetentionSettingsRow]) ?? 0}
                    onChange={(e) =>
                      update(b.field as keyof RetentionSettingsRow, Number(e.target.value) as never)
                    }
                  />
                </div>
              ))}
            </div>
            {bucketSum > 100 && (
              <p className="mt-2 text-xs font-medium text-red-700">
                {isRTL
                  ? `المجموع أكبر من 100% — قلّل النِّسب قبل الحفظ.`
                  : `Sum exceeds 100% — reduce values before saving.`}
              </p>
            )}
          </Card>

          {/* Tiered gift caps */}
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-800">
              {isRTL ? 'حد قيمة الهدية لكل شريحة طلب' : 'Per-tier gift caps'}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="tier_300" className="text-xs">
                  {isRTL ? 'طلب ٣٠٠–٤٩٩ ج.م' : 'Order 300–499 EGP'}
                </Label>
                <Input
                  id="tier_300"
                  type="number"
                  min={0}
                  value={draft.tier_300_499_max_piasters ?? 0}
                  onChange={(e) => update('tier_300_499_max_piasters', Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-slate-500">
                  ≈ {((Number(draft.tier_300_499_max_piasters) || 0) / 100).toFixed(0)}{' '}
                  {isRTL ? 'ج.م' : 'EGP'}
                </p>
              </div>
              <div>
                <Label htmlFor="tier_500" className="text-xs">
                  {isRTL ? 'طلب ٥٠٠–٧٩٩ ج.م' : 'Order 500–799 EGP'}
                </Label>
                <Input
                  id="tier_500"
                  type="number"
                  min={0}
                  value={draft.tier_500_799_max_piasters ?? 0}
                  onChange={(e) => update('tier_500_799_max_piasters', Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-slate-500">
                  ≈ {((Number(draft.tier_500_799_max_piasters) || 0) / 100).toFixed(0)}{' '}
                  {isRTL ? 'ج.م' : 'EGP'}
                </p>
              </div>
              <div>
                <Label htmlFor="tier_800" className="text-xs">
                  {isRTL ? 'طلب ٨٠٠+ ج.م' : 'Order 800+ EGP'}
                </Label>
                <Input
                  id="tier_800"
                  type="number"
                  min={0}
                  value={draft.tier_800_plus_max_piasters ?? 0}
                  onChange={(e) => update('tier_800_plus_max_piasters', Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-slate-500">
                  ≈ {((Number(draft.tier_800_plus_max_piasters) || 0) / 100).toFixed(0)}{' '}
                  {isRTL ? 'ج.م' : 'EGP'}
                </p>
              </div>
            </div>
          </Card>

          {/* Other knobs */}
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-800">
              {isRTL ? 'إعدادات إضافية' : 'Additional settings'}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="default_expiry" className="text-xs">
                  {isRTL ? 'صلاحية الهدية الافتراضية (يوم)' : 'Default gift validity (days)'}
                </Label>
                <Input
                  id="default_expiry"
                  type="number"
                  min={1}
                  value={draft.gift_default_expiry_days ?? 7}
                  onChange={(e) => update('gift_default_expiry_days', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="max_queue" className="text-xs">
                  {isRTL ? 'الحد الأقصى للهدايا في الصندوق' : 'Max gift queue size'}
                </Label>
                <Input
                  id="max_queue"
                  type="number"
                  min={1}
                  value={draft.gift_max_queue_size ?? 4}
                  onChange={(e) => update('gift_max_queue_size', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="max_discount" className="text-xs">
                  {isRTL ? 'حد الخصم الأقصى لكل طلب %' : 'Max discount % per order'}
                </Label>
                <Input
                  id="max_discount"
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={draft.max_discount_percent_per_order ?? 0}
                  onChange={(e) => update('max_discount_percent_per_order', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="referral_reward" className="text-xs">
                  {isRTL ? 'مكافأة الإحالة (قروش)' : 'Referral reward (piasters)'}
                </Label>
                <Input
                  id="referral_reward"
                  type="number"
                  min={0}
                  value={draft.referral_reward_piasters ?? 0}
                  onChange={(e) => update('referral_reward_piasters', Number(e.target.value))}
                />
              </div>
            </div>
          </Card>

          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving || bucketSum > 100}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRTL ? (
                'حفظ التعديلات'
              ) : (
                'Save changes'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(settings)}
              disabled={!dirty || saving}
            >
              {isRTL ? 'استعادة' : 'Reset'}
            </Button>
            {settings?.updated_at && (
              <span
                className={`text-xs text-slate-400 tabular-nums ${isRTL ? 'me-auto' : 'ms-auto'}`}
              >
                {isRTL ? 'آخر تحديث: ' : 'Last updated: '}
                {new Date(settings.updated_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}
              </span>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
