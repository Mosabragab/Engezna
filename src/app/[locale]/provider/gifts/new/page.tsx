'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ProviderLayout } from '@/components/provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Sparkles, Calculator } from 'lucide-react';
import { csrfHeaders } from '@/lib/security/csrf-client';
import type { CreatePartnerOfferInput, PartnerGiftType } from '@/lib/partner-gifts';

const REASON_MESSAGES: Record<string, { ar: string; en: string }> = {
  not_authenticated: {
    ar: 'يجب تسجيل الدخول أولًا',
    en: 'You must be logged in',
  },
  no_provider: {
    ar: 'لا يوجد متجر مرتبط بحسابك',
    en: 'No provider associated with your account',
  },
  invalid_dates: {
    ar: 'التواريخ غير صحيحة',
    en: 'Invalid date range',
  },
  invalid_value: {
    ar: 'القيمة غير صحيحة',
    en: 'Invalid value',
  },
  terms_required: {
    ar: 'يجب الموافقة على الشروط',
    en: 'You must accept the terms',
  },
  system_error: {
    ar: 'حدث خطأ غير متوقع',
    en: 'Unexpected error',
  },
};

/**
 * Format a Date as a local "datetime-local" input value (YYYY-MM-DDTHH:mm).
 * Avoids the toISOString().slice(0, 16) trap which silently shifts to UTC.
 */
function formatLocalDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export default function NewProviderGiftPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useRouter();

  const [form, setForm] = useState<CreatePartnerOfferInput>(() => ({
    type: 'discount_code',
    value_piasters: 1000, // 10 EGP default
    title_ar: '',
    title_en: '',
    max_orders: 50,
    min_order_piasters: 30000, // 300 EGP
    starts_at: formatLocalDatetime(new Date()),
    ends_at: formatLocalDatetime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    terms_accepted: false,
  }));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CreatePartnerOfferInput>(
    key: K,
    value: CreatePartnerOfferInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload: CreatePartnerOfferInput = {
        ...form,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      };

      const res = await fetch('/api/provider/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        // 401 returns { error: 'Unauthorized' } which isn't a REASON_MESSAGES
        // key — map it to the existing not_authenticated localized message.
        const rawReason =
          res.status === 401 ? 'not_authenticated' : (data.error as string) || 'system_error';
        const msg = REASON_MESSAGES[rawReason] || REASON_MESSAGES.system_error;
        setError(isRTL ? msg.ar : msg.en);
        return;
      }
      router.push(`/${locale}/provider/gifts`);
    } catch (e) {
      console.error(e);
      setError(isRTL ? 'فشل إنشاء العرض' : 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  }

  const valueHint = (() => {
    if (form.type === 'discount_percent') {
      return isRTL ? 'النسبة المئوية × 100 (مثلاً 1500 = 15%)' : 'Percent × 100 (e.g. 1500 = 15%)';
    }
    if (form.type === 'free_delivery')
      return isRTL ? 'تكلفة التوصيل المعتادة (في القروش)' : 'Typical delivery cost (in piasters)';
    return isRTL
      ? 'مبلغ الخصم بالقروش (1000 = 10 ج.م)'
      : 'Discount amount in piasters (1000 = 10 EGP)';
  })();

  /**
   * Live settlement preview computed from the same logic as the production
   * settlement engine: commission base = subtotal − discount.
   *
   * NOTE: Partner gifts are funded by the merchant, so they are NOT subject
   * to Engezna's tiered caps in retention_settings (those are for
   * platform-funded gifts only). The preview reflects the merchant's actual
   * configured value, capped only by the order subtotal (so settlement can
   * never go negative) and by max_discount_piasters when set.
   */
  const settlementExample = useMemo(() => {
    const exampleSubtotal = 25000; // 250 EGP order
    const commissionRate = 5; // 5% — illustrative
    const rawDiscount =
      form.type === 'discount_percent'
        ? Math.round((exampleSubtotal * form.value_piasters) / 10000)
        : form.value_piasters;
    const cap = form.max_discount_piasters ?? exampleSubtotal;
    const discount = Math.max(0, Math.min(rawDiscount, cap, exampleSubtotal));
    const baseAfter = Math.max(0, exampleSubtotal - discount);
    const commission = Math.round((baseAfter * commissionRate) / 100);
    const settlement = baseAfter - commission;
    return {
      subtotal: exampleSubtotal,
      discount,
      baseAfter,
      commission,
      settlement,
    };
  }, [form.type, form.value_piasters, form.max_discount_piasters]);

  return (
    <ProviderLayout
      pageTitle={{ ar: 'هدية جديدة', en: 'New gift' }}
      pageSubtitle={{
        ar: 'سجّل تفاصيل الهدية. سترسل للإدارة للموافقة قبل الظهور للعملاء.',
        en: 'Set offer details. It will be sent to admin for approval before going live.',
      }}
    >
      <div className="container mx-auto max-w-2xl p-4 lg:p-6">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="type" className="text-sm font-medium">
                {isRTL ? 'نوع الهدية' : 'Gift type'}
              </Label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => update('type', e.target.value as PartnerGiftType)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="discount_code">
                  {isRTL ? 'خصم بقيمة ثابتة' : 'Fixed-amount discount'}
                </option>
                <option value="discount_percent">
                  {isRTL ? 'خصم بنسبة مئوية' : 'Percentage discount'}
                </option>
                <option value="free_delivery">{isRTL ? 'توصيل مجاني' : 'Free delivery'}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="title_ar" className="text-sm font-medium">
                  {isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'}
                </Label>
                <Input
                  id="title_ar"
                  required
                  value={form.title_ar}
                  onChange={(e) => update('title_ar', e.target.value)}
                  placeholder="خصم 10 ج.م على طلبك التالي"
                />
              </div>
              <div>
                <Label htmlFor="title_en" className="text-sm font-medium">
                  {isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}
                </Label>
                <Input
                  id="title_en"
                  required
                  value={form.title_en}
                  onChange={(e) => update('title_en', e.target.value)}
                  placeholder="10 EGP off your next order"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="value_piasters" className="text-sm font-medium">
                {isRTL ? 'قيمة الهدية' : 'Gift value'}
              </Label>
              <Input
                id="value_piasters"
                type="number"
                required
                min={100}
                step={100}
                value={form.value_piasters}
                onChange={(e) => update('value_piasters', Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-slate-500">{valueHint}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="max_orders" className="text-sm font-medium">
                  {isRTL ? 'الحد الأقصى للطلبات' : 'Max orders'}
                </Label>
                <Input
                  id="max_orders"
                  type="number"
                  required
                  min={1}
                  value={form.max_orders}
                  onChange={(e) => update('max_orders', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="min_order_piasters" className="text-sm font-medium">
                  {isRTL ? 'حد أدنى للطلب' : 'Min order'}
                </Label>
                <Input
                  id="min_order_piasters"
                  type="number"
                  min={0}
                  step={100}
                  value={form.min_order_piasters ?? 0}
                  onChange={(e) => update('min_order_piasters', Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {isRTL ? 'بالقروش (30000 = 300 ج.م)' : 'In piasters (30000 = 300 EGP)'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="starts_at" className="text-sm font-medium">
                  {isRTL ? 'يبدأ في' : 'Starts at'}
                </Label>
                <Input
                  id="starts_at"
                  type="datetime-local"
                  required
                  value={form.starts_at}
                  onChange={(e) => update('starts_at', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ends_at" className="text-sm font-medium">
                  {isRTL ? 'ينتهي في' : 'Ends at'}
                </Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  required
                  value={form.ends_at}
                  onChange={(e) => update('ends_at', e.target.value)}
                />
              </div>
            </div>

            {/* Settlement preview — the actual settlement engine uses
                base = subtotal - discount, commission applies on this base.
                Live numbers so the merchant sees the exact cost. */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              <p className="font-bold mb-2 flex items-center gap-1">
                <Calculator className="h-3 w-3" />
                {isRTL
                  ? 'كيف تُحسب التسوية؟ (مثال على طلب ٢٥٠ ج.م)'
                  : 'How is settlement calculated? (example: 250 EGP order)'}
              </p>
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className={isRTL ? 'text-right py-0.5' : 'py-0.5'}>
                      {isRTL ? 'قيمة الطلب (subtotal)' : 'Order subtotal'}
                    </td>
                    <td
                      className={`tabular-nums font-medium ${isRTL ? 'text-left' : 'text-right'} py-0.5`}
                    >
                      {(settlementExample.subtotal / 100).toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                    </td>
                  </tr>
                  <tr>
                    <td className={isRTL ? 'text-right py-0.5' : 'py-0.5'}>
                      {isRTL ? 'خصم الهدية' : 'Gift discount'}
                    </td>
                    <td
                      className={`tabular-nums font-medium text-red-700 ${isRTL ? 'text-left' : 'text-right'} py-0.5`}
                    >
                      −{(settlementExample.discount / 100).toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                    </td>
                  </tr>
                  <tr className="border-t border-blue-200">
                    <td className={isRTL ? 'text-right py-0.5 font-medium' : 'py-0.5 font-medium'}>
                      {isRTL ? 'القيمة بعد الخصم' : 'Base after discount'}
                    </td>
                    <td
                      className={`tabular-nums font-bold ${isRTL ? 'text-left' : 'text-right'} py-0.5`}
                    >
                      {(settlementExample.baseAfter / 100).toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                    </td>
                  </tr>
                  <tr>
                    <td className={isRTL ? 'text-right py-0.5' : 'py-0.5'}>
                      {isRTL ? 'العمولة (5%)' : 'Commission (5%)'}
                    </td>
                    <td
                      className={`tabular-nums font-medium text-red-700 ${isRTL ? 'text-left' : 'text-right'} py-0.5`}
                    >
                      −{(settlementExample.commission / 100).toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                    </td>
                  </tr>
                  <tr className="border-t border-blue-200">
                    <td
                      className={
                        isRTL ? 'text-right py-1 font-bold text-base' : 'py-1 font-bold text-base'
                      }
                    >
                      {isRTL ? 'تسويتك' : 'Your settlement'}
                    </td>
                    <td
                      className={`tabular-nums font-bold text-base text-emerald-700 ${isRTL ? 'text-left' : 'text-right'} py-1`}
                    >
                      {(settlementExample.settlement / 100).toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-[11px] leading-relaxed">
                {isRTL
                  ? 'العمولة تُحسب على القيمة بعد الخصم — يعني الخصم يقلّل العمولة كمان قليلًا. الحساب نفسه في الدفع أونلاين والكاش عند التوصيل (COD).'
                  : 'Commission is computed on the post-discount base — the discount also slightly reduces the commission. Same calculation for online payment and cash on delivery (COD).'}
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-bold mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {isRTL ? 'الشروط' : 'Terms'}
              </p>
              <ul className="list-disc ms-5 space-y-1">
                <li>
                  {isRTL
                    ? 'الخصم يقلّل قيمة الطلب الذي تُحسب عليه التسوية (لا دفع مقدم).'
                    : 'The discount reduces the order value used for settlement (no upfront payment).'}
                </li>
                <li>
                  {isRTL
                    ? 'يجب تنفيذ كل الطلبات المستخدمة لهذه الهدية بنفس مستوى الجودة.'
                    : 'You must fulfill every order using this gift at the same quality.'}
                </li>
                <li>
                  {isRTL
                    ? 'رفض طلب فيه هدية يوقف الحملة فورًا.'
                    : 'Rejecting an order using this gift immediately suspends the campaign.'}
                </li>
              </ul>
              <label
                className={`mt-3 flex items-center gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={form.terms_accepted}
                  onChange={(e) => update('terms_accepted', e.target.checked)}
                />
                <span className="text-xs font-medium">
                  {isRTL ? 'أوافق على الشروط' : 'I accept the terms'}
                </span>
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button type="submit" disabled={submitting || !form.terms_accepted}>
                {submitting
                  ? isRTL
                    ? 'جاري الحفظ...'
                    : 'Saving...'
                  : isRTL
                    ? 'حفظ كمسودة'
                    : 'Save as draft'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </ProviderLayout>
  );
}
