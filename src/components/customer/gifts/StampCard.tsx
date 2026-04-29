'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Stamp, Trophy } from 'lucide-react';
import type { GiftStamp } from '@/lib/gifts/types';

interface StampCardProps {
  stampCard: GiftStamp | null;
  totalStamps?: number;
}

export function StampCard({ stampCard, totalStamps = 4 }: StampCardProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [now] = useState(() => Date.now());

  const currentStamps = stampCard?.stamp_count || 0;
  const progress = (currentStamps / totalStamps) * 100;

  const daysLeft = stampCard
    ? Math.max(0, Math.ceil((new Date(stampCard.card_expires_at).getTime() - now) / 86400000))
    : 0;

  return (
    <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {isRTL ? 'بطاقة الختم' : 'Stamp Card'}
          </h3>
        </div>
        {stampCard && (
          <span className="text-xs text-slate-400">
            {isRTL ? `${daysLeft} يوم متبقي` : `${daysLeft} days left`}
          </span>
        )}
      </div>

      <div className="mb-3 flex justify-center gap-3">
        {Array.from({ length: totalStamps }).map((_, i) => (
          <div
            key={i}
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
              i < currentStamps
                ? 'border-yellow-400 bg-yellow-400 text-white'
                : 'border-dashed border-slate-300 bg-white text-slate-300'
            }`}
          >
            <Stamp className="h-6 w-6" />
          </div>
        ))}
      </div>

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-center text-xs text-slate-500">
        {currentStamps >= totalStamps
          ? isRTL
            ? 'مبروك! الصندوق الذهبي جاهز 🏆'
            : 'Congratulations! Golden Box ready 🏆'
          : isRTL
            ? `${totalStamps - currentStamps} ${totalStamps - currentStamps === 1 ? 'ختم' : 'أختام'} للصندوق الذهبي`
            : `${totalStamps - currentStamps} stamp${totalStamps - currentStamps === 1 ? '' : 's'} to Golden Box`}
      </p>
    </div>
  );
}
