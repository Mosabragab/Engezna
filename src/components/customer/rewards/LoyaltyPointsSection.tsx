'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { REDEMPTION_RATE_PIASTERS_PER_POINT } from '@/lib/loyalty';
import type { LoyaltyBalance, LoyaltyTransaction } from '@/lib/loyalty';
import { AnimatedCounter } from './AnimatedCounter';
import { celebrateSmall } from './celebrate';

interface LoyaltyPointsSectionProps {
  balance: LoyaltyBalance;
  transactions: LoyaltyTransaction[];
  onRedeemed: () => void;
}

const REDEMPTION_TIERS = [100, 500, 1000];

const REDEEM_ERROR_MESSAGES: Record<string, { ar: string; en: string }> = {
  insufficient_points: {
    ar: 'رصيد نقاطك غير كافٍ',
    en: 'Insufficient points balance',
  },
  invalid_amount: {
    ar: 'القيمة يجب أن تكون من مضاعفات ١٠٠',
    en: 'Amount must be a multiple of 100',
  },
  redemption_grant_failed: {
    ar: 'صندوق الهدايا ممتلئ. استخدم هدية أولًا ثم أعد المحاولة.',
    en: 'Gift queue full. Use an existing gift first, then try again.',
  },
  system_error: {
    ar: 'حدث خطأ غير متوقع، حاول مرة أخرى',
    en: 'Unexpected error, please try again',
  },
};

export function LoyaltyPointsSection({
  balance,
  transactions,
  onRedeemed,
}: LoyaltyPointsSectionProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [pendingPoints, setPendingPoints] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ discount: number } | null>(null);

  async function redeem(points: number) {
    if (pendingPoints !== null) return;
    setPendingPoints(points);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      });
      const data = await res.json();
      if (!res.ok) {
        const reason = (data.reason as string) || 'system_error';
        const msg = REDEEM_ERROR_MESSAGES[reason] || REDEEM_ERROR_MESSAGES.system_error;
        setError(isRTL ? msg.ar : msg.en);
        return;
      }
      setSuccess({ discount: (data.discountPiasters as number) / 100 });
      celebrateSmall();
      onRedeemed();
      window.setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError(isRTL ? 'فشل الاتصال، حاول لاحقًا' : 'Network error, please try again');
    } finally {
      setPendingPoints(null);
    }
  }

  return (
    <section aria-labelledby="loyalty-heading" className="space-y-3">
      <h2 id="loyalty-heading" className="text-lg font-bold text-slate-900">
        {isRTL ? '⭐ نقاطي' : '⭐ My points'}
      </h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-center">
          <AnimatedCounter
            value={balance.points_balance}
            className="text-5xl font-bold text-primary tabular-nums"
            highlightOnChange
          />
          <p className="mt-1 text-xs text-slate-500">
            {isRTL ? 'نقطة' : 'points'} · {isRTL ? 'مدى الحياة:' : 'Lifetime:'}{' '}
            {balance.lifetime_points.toLocaleString()}
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          {isRTL
            ? `استبدل ${100} نقطة = خصم ${(100 * REDEMPTION_RATE_PIASTERS_PER_POINT) / 100} ج.م`
            : `Redeem 100 pts = ${(100 * REDEMPTION_RATE_PIASTERS_PER_POINT) / 100} EGP discount`}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {REDEMPTION_TIERS.map((points) => {
            const discount = (points * REDEMPTION_RATE_PIASTERS_PER_POINT) / 100;
            const enabled = balance.points_balance >= points && pendingPoints === null;
            return (
              <Button
                key={points}
                type="button"
                variant="outline"
                size="sm"
                disabled={!enabled}
                onClick={() => redeem(points)}
                className="flex flex-col gap-0.5 h-auto py-2"
              >
                <span className="text-xs font-bold tabular-nums">{points.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500">
                  = {discount} {isRTL ? 'ج.م' : 'EGP'}
                </span>
              </Button>
            );
          })}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 text-center text-xs text-red-600"
              role="alert"
            >
              {error}
            </motion.p>
          )}
          {success && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-green-50 p-2 text-center text-xs font-medium text-green-700"
              role="status"
            >
              <Sparkles className="h-4 w-4" />
              {isRTL
                ? `تم! حصلت على كوبون ${success.discount} ج.م`
                : `Done! You got a ${success.discount} EGP coupon`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {transactions.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="mb-3 text-xs font-medium text-slate-500">
            {isRTL ? '📜 آخر العمليات' : '📜 Recent activity'}
          </p>
          <ul className="space-y-2">
            {transactions.map((tx) => {
              const isEarn = tx.points > 0;
              return (
                <li
                  key={tx.id}
                  className={`flex items-center justify-between gap-3 text-sm ${
                    isRTL ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-slate-700">
                      {tx.description || tx.transaction_type}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                    </p>
                  </div>
                  <span
                    className={`tabular-nums text-sm font-bold ${
                      isEarn ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    {isEarn ? '+' : ''}
                    {tx.points.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-center text-xs text-slate-500">
        <a
          href={`/${locale}/profile/loyalty`}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {isRTL ? 'كل العمليات' : 'View all activity'}
          <ArrowRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
        </a>
      </p>
    </section>
  );
}
