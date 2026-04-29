'use client';

import { useLocale } from 'next-intl';
import { StampCard } from '@/components/customer/gifts/StampCard';
import { EmptyStampIllustration } from './EmptyStateIllustrations';
import type { GiftStamp } from '@/lib/gifts/types';

interface StampCardSectionProps {
  stampCard: GiftStamp | null;
}

export function StampCardSection({ stampCard }: StampCardSectionProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  if (!stampCard) {
    return (
      <section aria-labelledby="stamps-heading" className="space-y-3">
        <h2 id="stamps-heading" className="text-lg font-bold text-slate-900">
          {isRTL ? '🎫 بطاقة الختم' : '🎫 Stamp card'}
        </h2>
        <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-yellow-50 via-amber-50/60 to-orange-50 p-6 text-center">
          <EmptyStampIllustration className="mx-auto mb-2 h-32 w-40" />
          <p className="text-base font-bold text-slate-800">
            {isRTL ? '٤ أختام = صندوق ذهبي 🏆' : '4 stamps = a golden box 🏆'}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            {isRTL
              ? 'كل طلب ٣٠٠ ج.م = ختم. اطلب ٤ مرات وكسبت صندوق هدية ذهبي بقيمة تصل لـ ١٠٠ ج.م'
              : 'Each 300 EGP order = 1 stamp. Collect 4 stamps to unlock a golden gift up to 100 EGP.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="stamps-heading" className="space-y-3">
      <h2 id="stamps-heading" className="text-lg font-bold text-slate-900">
        {isRTL ? '🎫 بطاقة الختم' : '🎫 Stamp card'}
      </h2>
      <StampCard stampCard={stampCard} />
    </section>
  );
}
