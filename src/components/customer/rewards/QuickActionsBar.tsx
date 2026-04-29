'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Users, History } from 'lucide-react';

export function QuickActionsBar() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <section className="grid grid-cols-2 gap-3">
      <Link
        href={`/${locale}/referral`}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">
            {isRTL ? 'ادعُ صديق' : 'Refer a friend'}
          </p>
          <p className="text-xs text-slate-500">{isRTL ? 'هدية ٢٠ ج.م لكل واحد' : '20 EGP each'}</p>
        </div>
      </Link>
      <Link
        href={`/${locale}/profile/loyalty`}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <History className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">
            {isRTL ? 'سجل النقاط' : 'Points history'}
          </p>
          <p className="text-xs text-slate-500">{isRTL ? 'كل العمليات' : 'All activity'}</p>
        </div>
      </Link>
    </section>
  );
}
