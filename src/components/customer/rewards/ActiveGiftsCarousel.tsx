'use client';

import { useState, useCallback, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { MysteryBoxCard } from '@/components/customer/gifts/MysteryBoxCard';
import { celebrateLarge } from './celebrate';
import { EmptyGiftIllustration } from './EmptyStateIllustrations';
import { ShareGiftDialog } from './ShareGiftDialog';
import { csrfHeaders } from '@/lib/security/csrf-client';
import type { GiftBoxEntry } from '@/lib/gifts/types';

interface ActiveGiftsCarouselProps {
  gifts: GiftBoxEntry[];
  onChange: () => void;
}

const FORWARDABLE_TYPES = new Set(['discount_code', 'discount_percent']);

export function ActiveGiftsCarousel({ gifts, onChange }: ActiveGiftsCarouselProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [shareGiftId, setShareGiftId] = useState<string | null>(null);

  const shareGift = useMemo(
    () => (shareGiftId ? gifts.find((g) => g.id === shareGiftId) : null),
    [shareGiftId, gifts]
  );

  const handleShare = useCallback((id: string) => {
    setShareGiftId(id);
  }, []);

  const handleOpen = useCallback(
    async (id: string) => {
      if (pendingIds.has(id)) return;
      setPendingIds((s) => new Set(s).add(id));
      try {
        const res = await fetch('/api/gifts/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
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
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-blue-50/30 p-6 text-center">
          <EmptyGiftIllustration className="mx-auto mb-2 h-32 w-40" />
          <p className="text-base font-bold text-slate-800">
            {isRTL ? 'صندوقك الأول في الطريق' : 'Your first gift is on the way'}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            {isRTL
              ? 'اطلب طلب ٣٠٠ ج.م أو أكثر هتلاقي صندوق هدية في انتظارك هنا 🎁'
              : 'Place an order of 300 EGP+ and a gift box will be waiting here 🎁'}
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
              <MysteryBoxCard
                entry={gift}
                onOpen={handleOpen}
                onUse={handleUse}
                onShare={
                  gift.gift && FORWARDABLE_TYPES.has(gift.gift.type) ? handleShare : undefined
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {shareGift && shareGift.gift && (
        <ShareGiftDialog
          open
          giftEntryId={shareGift.id}
          giftTitle={isRTL ? shareGift.gift.title_ar : shareGift.gift.title_en}
          giftValuePiasters={shareGift.cost_piasters}
          onClose={() => setShareGiftId(null)}
          onShared={onChange}
        />
      )}
    </section>
  );
}
