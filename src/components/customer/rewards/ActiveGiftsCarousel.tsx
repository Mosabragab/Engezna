'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';
import { MysteryBoxCard } from '@/components/customer/gifts/MysteryBoxCard';
import { celebrateLarge } from './celebrate';
import type { GiftBoxEntry } from '@/lib/gifts/types';

interface ActiveGiftsCarouselProps {
  gifts: GiftBoxEntry[];
  onChange: () => void;
}

export function ActiveGiftsCarousel({ gifts, onChange }: ActiveGiftsCarouselProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const handleOpen = useCallback(
    async (id: string) => {
      if (pendingIds.has(id)) return;
      setPendingIds((s) => new Set(s).add(id));
      try {
        const res = await fetch('/api/gifts/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ giftEntryId: id }),
        });
        if (res.ok) {
          const opened = gifts.find((g) => g.id === id);
          // Celebrate for rare gifts (>=15 EGP) or golden boxes
          if (opened && (opened.cost_piasters >= 1500 || opened.source === 'stamp_card')) {
            celebrateLarge();
          }
          onChange();
        }
      } finally {
        setPendingIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }
    },
    [gifts, onChange, pendingIds]
  );

  const handleUse = useCallback(() => {
    // Redirect to providers list. Future: deep-link to a specific provider
    // when the gift is restricted via gift.applicable_provider_ids.
    window.location.href = `/${locale}/providers`;
  }, [locale]);

  if (gifts.length === 0) {
    return (
      <section aria-labelledby="gifts-heading" className="space-y-3">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 id="gifts-heading" className="text-lg font-bold text-slate-900">
            {isRTL ? '🎁 صناديقك' : '🎁 Your gifts'}
          </h2>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <Gift className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">
            {isRTL ? 'مفيش صناديق دلوقتي' : 'No gift boxes yet'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isRTL
              ? 'اطلب طلب ٣٠٠ ج.م أو أكثر علشان تحصل على صندوقك الأول!'
              : 'Place an order of 300 EGP+ to earn your first gift box!'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="gifts-heading" className="space-y-3">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h2 id="gifts-heading" className="text-lg font-bold text-slate-900">
          {isRTL ? `🎁 صناديقك (${gifts.length})` : `🎁 Your gifts (${gifts.length})`}
        </h2>
      </div>

      <div
        className={`flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory ${
          isRTL ? 'flex-row-reverse' : ''
        }`}
        style={{ scrollbarWidth: 'thin' }}
        role="list"
      >
        <AnimatePresence initial={false}>
          {gifts.map((gift) => (
            <motion.div
              key={gift.id}
              role="listitem"
              layout
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="min-w-[260px] flex-shrink-0 snap-center"
            >
              <MysteryBoxCard entry={gift} onOpen={handleOpen} onUse={handleUse} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
