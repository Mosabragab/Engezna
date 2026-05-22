'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Gift, Clock } from 'lucide-react';

/**
 * Homepage Surprise Card (v2.5.2)
 *
 * Renders a prominent CTA when the user has an unopened gift box —
 * Welcome Box (post-signup) or any Daily Surprise. The card NEVER reveals
 * the gift value before the user opens it — the API surfaces only the
 * entry id + expiry. The reveal happens on /rewards.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §3.1.2.A (v2.5.2)
 */

interface SurpriseCardProps {
  entryId: string;
  expiresAt: string; // ISO timestamp
  locale: 'ar' | 'en';
}

function formatExpiry(expiresAt: string, locale: 'ar' | 'en'): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return locale === 'ar' ? 'انتهت' : 'expired';

  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (locale === 'ar') {
    if (days > 0) return `${days} ${days === 1 ? 'يوم' : 'أيام'}`;
    return `${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
  }
  if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

export function SurpriseCard({ entryId, expiresAt, locale }: SurpriseCardProps) {
  const reduceMotion = useReducedMotion();
  const isRTL = locale === 'ar';
  const expiry = formatExpiry(expiresAt, locale);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto my-4 max-w-xl rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6 text-center shadow-lg"
      role="region"
      aria-label={isRTL ? 'مفاجأة جديدة' : 'New surprise'}
    >
      <motion.div
        animate={reduceMotion ? {} : { y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        className="mx-auto mb-3 inline-block"
      >
        <Gift size={64} className="text-amber-500" strokeWidth={1.8} />
      </motion.div>

      <h3 className="mb-2 text-lg font-bold text-slate-900">
        {isRTL ? 'لديك مفاجأة في انتظارك' : 'You have a surprise waiting'}
      </h3>

      <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-600">
        <Clock size={12} />
        <span>{isRTL ? `تنتهي خلال ${expiry}` : `Expires in ${expiry}`}</span>
      </div>

      <div>
        <Link
          href={`/${locale}/rewards?open=${encodeURIComponent(entryId)}`}
          className="inline-block rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-600 active:scale-95"
        >
          {isRTL ? 'اكتشف هديتك' : 'Discover your gift'}
        </Link>
      </div>
    </motion.div>
  );
}
