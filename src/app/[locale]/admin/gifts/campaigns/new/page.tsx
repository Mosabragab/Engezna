'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { CampaignTrigger } from '@/lib/campaigns';

const REASON_MESSAGES: Record<string, { ar: string; en: string }> = {
  invalid_input: { ar: 'البيانات المدخلة غير مكتملة', en: 'Invalid input' },
  duplicate_name: {
    ar: 'يوجد حملة بنفس الاسم — اختر اسمًا مختلفًا',
    en: 'A campaign with this name already exists',
  },
  system_error: { ar: 'حدث خطأ غير متوقع', en: 'Unexpected error' },
};

const SEGMENTS = [
  { value: '', ar: 'كل العملاء', en: 'All customers' },
  { value: 'new_user', ar: 'عملاء جدد', en: 'New users' },
  { value: 'champion', ar: 'بطل', en: 'Champion' },
  { value: 'regular', ar: 'متوسط النشاط', en: 'Regular' },
  { value: 'at_risk', ar: 'مُعرّض للفقد', en: 'At risk' },
  { value: 'churned', ar: 'فاقد', en: 'Churned' },
  { value: 'high_value', ar: 'قيمة عالية', en: 'High value' },
  { value: 'bargain_hunter', ar: 'باحث عن العروض', en: 'Bargain hunter' },
];

const BUCKETS = [
  { value: 'mystery', ar: 'صناديق المفاجآت', en: 'Mystery box' },
  { value: 'win_back', ar: 'استعادة العملاء', en: 'Win-back' },
  { value: 'welcome', ar: 'الترحيب', en: 'Welcome' },
];

export default function NewCampaignPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useRouter();
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [trigger, setTrigger] = useState<CampaignTrigger>('manual_campaign');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [valueEgp, setValueEgp] = useState(15); // 15 EGP default
  const [bucket, setBucket] = useState('mystery');
  const [segment, setSegment] = useState('');
  const [maxRecipients, setMaxRecipients] = useState(500);
  const [expiryDays, setExpiryDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUser(data.user));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/gifts/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          trigger,
          audience: trigger === 'manual_campaign' && segment ? { segment } : undefined,
          action: {
            value_piasters: Math.round(valueEgp * 100),
            bucket,
            expiry_days: expiryDays,
            max_recipients: trigger === 'manual_campaign' ? maxRecipients : undefined,
          },
          is_active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const reason = (data.error as string) || 'system_error';
        const msg = REASON_MESSAGES[reason] || REASON_MESSAGES.system_error;
        setError(isRTL ? msg.ar : msg.en);
        return;
      }
      router.push(`/${locale}/admin/gifts/campaigns`);
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل إنشاء الحملة' : 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={isRTL ? 'حملة جديدة' : 'New campaign'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="trigger" className="text-sm font-medium">
                  {isRTL ? 'نوع الحملة' : 'Campaign type'}
                </Label>
                <select
                  id="trigger"
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as CampaignTrigger)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="manual_campaign">
                    {isRTL ? 'حملة يدوية (تشغيل فوري)' : 'Manual campaign (run on demand)'}
                  </option>
                  <option value="birthday">
                    {isRTL ? 'حملة عيد ميلاد (يومية)' : 'Birthday (daily auto)'}
                  </option>
                </select>
                {trigger === 'birthday' && (
                  <p className="mt-1 text-xs text-amber-700">
                    {isRTL
                      ? 'يفعَّل واحد فقط من حملات عيد الميلاد في وقت واحد. الـ cron اليومي يستخدم أول حملة نشطة.'
                      : 'Only one active birthday campaign at a time. The daily cron picks the first active one.'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  {isRTL ? 'اسم الحملة' : 'Campaign name'}
                </Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isRTL ? 'مثال: يوم ممطر' : 'e.g. Rainy Day'}
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  {isRTL ? 'الوصف (اختياري)' : 'Description (optional)'}
                </Label>
                <textarea
                  id="description"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="value" className="text-sm font-medium">
                    {isRTL ? 'قيمة الهدية (ج.م)' : 'Gift value (EGP)'}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={valueEgp}
                    onChange={(e) => setValueEgp(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="bucket" className="text-sm font-medium">
                    {isRTL ? 'الدلو الميزانياتي' : 'Budget bucket'}
                  </Label>
                  <select
                    id="bucket"
                    value={bucket}
                    onChange={(e) => setBucket(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    {BUCKETS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {isRTL ? b.ar : b.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {trigger === 'manual_campaign' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="segment" className="text-sm font-medium">
                      {isRTL ? 'الجمهور' : 'Audience'}
                    </Label>
                    <select
                      id="segment"
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    >
                      {SEGMENTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {isRTL ? s.ar : s.en}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="max_recipients" className="text-sm font-medium">
                      {isRTL ? 'حد المستفيدين' : 'Max recipients'}
                    </Label>
                    <Input
                      id="max_recipients"
                      type="number"
                      required
                      min={1}
                      max={5000}
                      value={maxRecipients}
                      onChange={(e) => setMaxRecipients(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="expiry_days" className="text-sm font-medium">
                  {isRTL ? 'صلاحية الهدية (أيام)' : 'Gift validity (days)'}
                </Label>
                <Input
                  id="expiry_days"
                  type="number"
                  required
                  min={1}
                  max={30}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button type="submit" disabled={submitting || !name.trim()}>
                  {submitting ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : isRTL ? 'حفظ' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => router.back()}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </>
  );
}
