'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Gift, X } from 'lucide-react';

/**
 * Welcome Box Modal (v2.5.2)
 *
 * Rendered on the /auth/email-verified page after Supabase confirms the
 * user's email. Calls the email-verified-hook endpoint to grant the
 * Welcome Box (idempotent), then shows a celebratory reveal animation.
 *
 * The reveal does NOT call out "free delivery" until the user taps the
 * box — the surprise comes from the reveal animation itself.
 *
 * Source: docs/POINTS_REWARDS_PROPOSAL_V2_5.md §2.1.6 + §3.1.3 (v2.5.2)
 */

type Phase = 'loading' | 'closed' | 'revealing' | 'revealed' | 'error';

export function WelcomeBoxModal() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('loading');
  const [open, setOpen] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Call the hook once on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/email-verified-hook', { method: 'POST' });
        if (cancelled) return;

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          // already_granted is not an error — treat it as "no surprise this time"
          if (body.error === 'Email not verified') {
            setErrorMsg(isRTL ? 'لم يتم تأكيد البريد بعد' : 'Email not verified yet');
            setPhase('error');
            return;
          }
          setOpen(false);
          return;
        }

        const data = (await res.json()) as { granted?: boolean; reason?: string };
        if (data.granted === false && data.reason === 'already_granted') {
          // Quietly close — user has already seen this once.
          setOpen(false);
          return;
        }
        setPhase('closed');
      } catch {
        if (!cancelled) {
          setErrorMsg(isRTL ? 'تعذر تحميل الهدية' : 'Could not load your gift');
          setPhase('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isRTL]);

  function handleReveal() {
    setPhase('revealing');
    // 1.8s reveal animation — matches the bounce duration below.
    setTimeout(() => setPhase('revealed'), 1800);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 end-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={isRTL ? 'إغلاق' : 'Close'}
          >
            <X size={18} />
          </button>

          {phase === 'loading' && (
            <div className="py-8">
              <div className="mx-auto h-16 w-16 animate-pulse rounded-full bg-amber-100" />
              <p className="mt-4 text-sm text-slate-500">
                {isRTL ? 'جاري التحضير...' : 'Preparing...'}
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div className="py-6">
              <p className="text-sm font-medium text-rose-600">{errorMsg}</p>
              <button
                onClick={() => setOpen(false)}
                className="mt-4 text-xs text-slate-500 underline"
              >
                {isRTL ? 'حسنًا' : 'OK'}
              </button>
            </div>
          )}

          {phase === 'closed' && (
            <>
              <h2 id="welcome-modal-title" className="mb-2 text-xl font-extrabold text-slate-900">
                {isRTL ? 'أهلًا بيك في إنجزنا 🎉' : 'Welcome to Engezna 🎉'}
              </h2>
              <p className="mb-4 text-sm text-slate-600">
                {isRTL ? 'هديتك الترحيبية في انتظارك' : 'Your welcome gift awaits'}
              </p>
              <motion.button
                onClick={handleReveal}
                animate={reduceMotion ? {} : { y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                whileTap={{ scale: 0.95 }}
                className="mx-auto block"
                aria-label={isRTL ? 'افتح الصندوق' : 'Open the box'}
              >
                <Gift size={96} className="text-amber-500" strokeWidth={1.6} />
              </motion.button>
              <p className="mt-4 text-xs text-slate-500">
                {isRTL ? 'اضغط الصندوق' : 'Tap the box'}
              </p>
            </>
          )}

          {phase === 'revealing' && (
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.2, 0.9, 1.1], rotate: [0, -8, 8, 0] }}
              transition={{ duration: 1.8, ease: 'easeInOut' }}
              className="py-10"
            >
              <Gift size={96} className="mx-auto text-amber-500" strokeWidth={1.6} />
            </motion.div>
          )}

          {phase === 'revealed' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="py-4"
            >
              <h2 id="welcome-modal-title" className="mb-2 text-xl font-extrabold text-slate-900">
                {isRTL ? '🎁 أول توصيل علينا!' : '🎁 First delivery on us!'}
              </h2>
              <p className="mb-5 text-sm text-slate-600">
                {isRTL
                  ? 'صالحة لمدة 7 أيام على أول طلب من أي متجر'
                  : 'Valid 7 days on your first order from any merchant'}
              </p>
              <Link
                href={`/${locale}`}
                className="inline-block rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-600 active:scale-95"
              >
                {isRTL ? 'اطلب الآن' : 'Order now'}
              </Link>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
