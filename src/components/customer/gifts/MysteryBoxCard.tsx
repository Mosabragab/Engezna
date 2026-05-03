'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, PartyPopper, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GiftBoxEntry } from '@/lib/gifts/types';

interface MysteryBoxCardProps {
  entry: GiftBoxEntry;
  onOpen: (id: string) => Promise<void>;
  onUse: (id: string) => void;
  /**
   * If provided, a "Share with friend" action is exposed for forwardable
   * gift types (discount_code / discount_percent) once the box is opened.
   * The caller decides whether to show it based on entry.gift?.type.
   */
  onShare?: (id: string) => void;
}

export function MysteryBoxCard({ entry, onOpen, onUse, onShare }: MysteryBoxCardProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [isOpening, setIsOpening] = useState(false);
  const [isRevealed, setIsRevealed] = useState(entry.status === 'opened');
  const [now] = useState(() => Date.now());

  const expiresAt = new Date(entry.expires_at).getTime();
  const isExpiringSoon = expiresAt - now < 2 * 24 * 60 * 60 * 1000;
  const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / 86400000));

  const handleOpen = async () => {
    setIsOpening(true);
    await onOpen(entry.id);
    setTimeout(() => {
      setIsRevealed(true);
      setIsOpening(false);
    }, 2000);
  };

  const giftTitle = entry.gift
    ? isRTL
      ? entry.gift.title_ar
      : entry.gift.title_en
    : isRTL
      ? 'هدية مفاجأة'
      : 'Mystery Gift';

  const giftValue = entry.cost_piasters / 100;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <AnimatePresence mode="wait">
        {!isRevealed && !isOpening ? (
          <motion.div
            key="closed"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
            >
              <Gift className="h-10 w-10 text-primary" />
            </motion.div>
            <p className="text-sm font-medium text-slate-600">
              {isRTL ? 'لديك صندوق هدايا!' : 'You have a gift box!'}
            </p>
            <Button onClick={handleOpen} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {isRTL ? 'افتح الصندوق' : 'Open Box'}
            </Button>
          </motion.div>
        ) : isOpening ? (
          <motion.div
            key="opening"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 py-8"
          >
            <motion.div
              animate={{
                scale: [1, 1.3, 1, 1.3, 1.5],
                rotate: [0, -10, 10, -10, 0],
              }}
              transition={{ duration: 2 }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20"
            >
              <Gift className="h-10 w-10 text-primary" />
            </motion.div>
            <p className="animate-pulse text-sm text-primary">
              {isRTL ? 'جاري الكشف...' : 'Revealing...'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            {entry.cost_piasters >= 1500 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <PartyPopper className="h-16 w-16 text-yellow-400 opacity-20" />
              </motion.div>
            )}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Sparkles className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-bold text-slate-900">{giftTitle}</p>
            <p className="text-2xl font-bold text-primary">
              {giftValue} {isRTL ? 'ج.م' : 'EGP'}
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs ${isExpiringSoon ? 'text-red-500 font-medium' : 'text-slate-400'}`}
              >
                {isRTL
                  ? `صالح لمدة ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}`
                  : `Valid for ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
              </span>
            </div>
            <Button onClick={() => onUse(entry.id)} className="mt-2 w-full gap-2">
              {isRTL ? 'استخدم الآن' : 'Use Now'}
            </Button>
            {onShare && (
              <button
                type="button"
                onClick={() => onShare(entry.id)}
                className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-700 transition-colors hover:bg-pink-100"
              >
                <Send className="h-3 w-3" />
                {isRTL ? 'أرسلها لصاحبك' : 'Share with a friend'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
