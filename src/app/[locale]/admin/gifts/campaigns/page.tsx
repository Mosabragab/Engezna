'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Loader2,
  AlertCircle,
  Megaphone,
  Cake,
  Calendar,
} from 'lucide-react';
import type { CampaignRow } from '@/lib/campaigns';

const TRIGGER_LABELS: Record<string, { ar: string; en: string; icon: typeof Megaphone }> = {
  manual_campaign: { ar: 'حملة يدوية', en: 'Manual', icon: Megaphone },
  birthday: { ar: 'عيد ميلاد', en: 'Birthday', icon: Cake },
};

const STATUS_FILTERS = [
  { key: 'all', ar: 'الكل', en: 'All' },
  { key: 'active', ar: 'نشط', en: 'Active' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]['key'];

export default function AdminCampaignsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{ id: string; granted: number } | null>(
    null
  );

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
      if (filter === 'active') params.set('active', '1');
      const res = await fetch(`/api/admin/gifts/campaigns?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل تحميل الحملات' : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [filter, isRTL]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(id: string, isActive: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/gifts/campaigns/${id}`, {
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

  async function execute(id: string) {
    setBusyId(id);
    setExecutionResult(null);
    try {
      const res = await fetch(`/api/admin/gifts/campaigns/${id}/execute`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setExecutionResult({ id, granted: Number(data.granted) || 0 });
      await load();
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل تنفيذ الحملة' : 'Failed to execute campaign');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm(isRTL ? 'تأكيد حذف الحملة؟' : 'Delete this campaign?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/gifts/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      await load();
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل الحذف' : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

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
        title={isRTL ? 'حملات الهدايا' : 'Gift Campaigns'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-5xl mx-auto space-y-4">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex gap-2" role="tablist">
              {STATUS_FILTERS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filter === tab.key
                      ? 'bg-primary text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isRTL ? tab.ar : tab.en}
                </button>
              ))}
            </div>
            <Link href={`/${locale}/admin/gifts/campaigns/new`}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {isRTL ? 'حملة جديدة' : 'New campaign'}
              </Button>
            </Link>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {executionResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {isRTL
                ? `تم بنجاح — ${executionResult.granted} هدية مُمنحة.`
                : `Done — ${executionResult.granted} gifts granted.`}
            </div>
          )}

          {loading ? (
            <Card className="p-10 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            </Card>
          ) : campaigns.length === 0 ? (
            <Card className="p-10 text-center">
              <Megaphone className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              <p className="text-base font-bold text-slate-800">
                {isRTL ? 'لا توجد حملات' : 'No campaigns yet'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {isRTL
                  ? 'أنشئ حملة يدوية أو فعّل حملة عيد الميلاد التلقائية.'
                  : 'Create a manual campaign or activate the automatic birthday campaign.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const meta = TRIGGER_LABELS[c.trigger] || {
                  ar: c.trigger,
                  en: c.trigger,
                  icon: Megaphone,
                };
                const Icon = meta.icon;
                const value = (c.action as { value_piasters?: number })?.value_piasters ?? 0;
                return (
                  <Card key={c.id} className="p-4">
                    <div
                      className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <Icon className="h-4 w-4 text-slate-500" />
                          <h3 className="font-bold text-slate-900 truncate">{c.name}</h3>
                          <span
                            className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                              c.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {c.is_active ? (isRTL ? 'نشط' : 'Active') : isRTL ? 'متوقف' : 'Paused'}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({isRTL ? meta.ar : meta.en})
                          </span>
                        </div>
                        {c.description && (
                          <p className="mt-1 text-xs text-slate-500">{c.description}</p>
                        )}
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-500">
                          <p>
                            {isRTL ? 'القيمة:' : 'Value:'} {(value / 100).toFixed(2)}{' '}
                            {isRTL ? 'ج.م' : 'EGP'}
                          </p>
                          <p>
                            {isRTL ? 'الدلو:' : 'Bucket:'} {c.budget_bucket}
                          </p>
                          <p>
                            <Calendar className="inline h-3 w-3 mb-0.5" />{' '}
                            {new Date(c.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {isRTL ? 'هدايا مُمنحة:' : 'Granted:'} <strong>{c.applied_count}</strong>
                          {' • '}
                          {isRTL ? 'تكلفة إجمالية:' : 'Total spent:'}{' '}
                          <strong>{(c.total_cost_piasters / 100).toFixed(2)}</strong>{' '}
                          {isRTL ? 'ج.م' : 'EGP'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.trigger === 'manual_campaign' && c.is_active && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyId === c.id}
                            onClick={() => execute(c.id)}
                            className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Play className="h-3 w-3" />
                            {isRTL ? 'تشغيل' : 'Run'}
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === c.id}
                          onClick={() => toggleActive(c.id, c.is_active)}
                          className="gap-1"
                        >
                          {c.is_active ? (
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          {c.is_active ? (isRTL ? 'إيقاف' : 'Pause') : isRTL ? 'تفعيل' : 'Activate'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId === c.id}
                          onClick={() => remove(c.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
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
