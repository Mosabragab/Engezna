'use client';

import { useLocale } from 'next-intl';
import { Trophy } from 'lucide-react';
import { StampCard } from '@/components/customer/gifts/StampCard';
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
        <div className="rounded-2xl border-2 border-dashed border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-8 text-center">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-yellow-300" />
          <p className="text-sm font-medium text-slate-700">
            {isRTL ? 'مفيش بطاقة نشطة' : 'No active card'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isRTL
              ? 'اطلب طلب ٣٠٠ ج.م علشان تبدأ بطاقتك الأولى — ٤ أختام = صندوق ذهبي 🏆'
              : 'Place a 300 EGP order to start your card — 4 stamps = golden box 🏆'}
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
