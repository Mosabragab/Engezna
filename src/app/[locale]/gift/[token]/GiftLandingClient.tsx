'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Gift, Clock, AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import type { ForwardPreview } from '@/lib/gift-forward';

interface GiftLandingClientProps {
  locale: string;
  token: string;
  preview: ForwardPreview;
  isAuthenticated: boolean;
}

const REASON_MESSAGES: Record<string, { ar: string; en: string }> = {
  not_authenticated: {
    ar: 'يجب تسجيل الدخول أولًا',
    en: 'Please sign in first',
  },
  forward_not_found: {
    ar: 'الرابط غير صالح',
    en: 'Invalid link',
  },
  forward_already_claimed: {
    ar: 'تم استلام الهدية من قبل',
    en: 'This gift has already been claimed',
  },
  forward_expired: {
    ar: 'انتهت صلاحية الرابط — رجعت الهدية للمرسل',
    en: 'Link expired — the gift returned to the sender',
  },
  cannot_claim_own_forward: {
    ar: 'لا يمكنك استلام هديتك بنفسك',
    en: 'You cannot claim your own gift',
  },
  gift_not_found: {
    ar: 'الهدية غير موجودة',
    en: 'Gift not found',
  },
  grant_failed: {
    ar: 'تعذّر إضافة الهدية لصندوقك. حاول مرة أخرى.',
    en: 'Could not add the gift to your box. Please try again.',
  },
  system_error: {
    ar: 'حدث خطأ غير متوقع',
    en: 'Unexpected error',
  },
};

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const KEY = 'engezna_device_id';
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `dev-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function GiftLandingClient({
  locale,
  token,
  preview,
  isAuthenticated,
}: GiftLandingClientProps) {
  const isRTL = locale === 'ar';
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const giftValueEgp = (preview.giftValuePiasters / 100).toFixed(0);
  const giftTitle = isRTL ? preview.giftTitleAr : preview.giftTitleEn;

  const hoursLeft = useMemo(() => {
    if (preview.status !== 'pending') return 0;
    const ms = new Date(preview.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 3600000));
  }, [preview.status, preview.expiresAt]);

  // Auto-claim attempt for already-authenticated users hitting a pending link
  useEffect(() => {
    if (!isAuthenticated || preview.status !== 'pending' || claimed) return;
    // Defer to give the page a beat to render so the user sees the gift first
    const timer = setTimeout(() => {
      void handleClaim();
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, preview.status]);

  async function handleClaim() {
    if (claiming || claimed) return;
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch(`/api/gifts/forward/${encodeURIComponent(token)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: getOrCreateDeviceId() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = REASON_MESSAGES[data.error as string] || REASON_MESSAGES.system_error;
        setError(isRTL ? msg.ar : msg.en);
        return;
      }
      setClaimed(true);
    } catch (e) {
      console.error(e);
      const msg = REASON_MESSAGES.system_error;
      setError(isRTL ? msg.ar : msg.en);
    } finally {
      setClaiming(false);
    }
  }

  // ─── Already-claimed-by-someone-else state ─────────────────────────────
  if (preview.status === 'claimed') {
    return (
      <Shell locale={locale}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <CheckCircle2 className="h-10 w-10 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isRTL ? 'تم استلام الهدية' : 'Gift already claimed'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isRTL
              ? 'الهدية وصلت لصاحبها بالفعل. تابع طلباتك مع إنجزنا!'
              : 'This gift was already claimed. Keep ordering with Engezna!'}
          </p>
          <Link href={`/${locale}`}>
            <Button className="mt-5 w-full">{isRTL ? 'العودة للرئيسية' : 'Back to home'}</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // ─── Expired ───────────────────────────────────────────────────────────
  if (preview.status === 'expired') {
    return (
      <Shell locale={locale}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isRTL ? 'انتهت صلاحية الرابط' : 'Link expired'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isRTL
              ? 'الرابط ده انتهت صلاحيته. الهدية رجعت لصاحبها.'
              : 'This link expired. The gift returned to its sender.'}
          </p>
          <Link href={`/${locale}`}>
            <Button className="mt-5 w-full">{isRTL ? 'استكشف إنجزنا' : 'Explore Engezna'}</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // ─── Not found / invalid ───────────────────────────────────────────────
  if (preview.status === 'not_found') {
    return (
      <Shell locale={locale}>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {isRTL ? 'الرابط غير صالح' : 'Invalid link'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isRTL
              ? 'لم نتمكن من العثور على الهدية. تأكد من اللينك.'
              : "We couldn't find this gift. Please check the link."}
          </p>
          <Link href={`/${locale}`}>
            <Button className="mt-5 w-full">{isRTL ? 'العودة للرئيسية' : 'Back to home'}</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // ─── Successfully claimed (just now) ───────────────────────────────────
  if (claimed) {
    return (
      <Shell locale={locale}>
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg"
          >
            <Sparkles className="h-12 w-12 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isRTL ? '🎉 الهدية وصلت!' : '🎉 Gift unlocked!'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isRTL
              ? 'هديتك دلوقتي في صندوقك. افتحها واستخدمها على طلبك الجاي.'
              : 'Your gift is now in your box. Open it and use it on your next order.'}
          </p>
          <div className="mt-5 grid gap-2">
            <Link href={`/${locale}/rewards`}>
              <Button className="w-full">
                {isRTL ? 'افتح صندوق الهدايا' : 'Open my gift box'}
              </Button>
            </Link>
            <Link href={`/${locale}/providers`}>
              <Button variant="outline" className="w-full">
                {isRTL ? 'تصفّح المتاجر' : 'Browse stores'}
              </Button>
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ─── Default: pending — show the gift + CTA ────────────────────────────
  const senderLine = preview.senderFirstName
    ? isRTL
      ? `${preview.senderFirstName} بعتلك هدية!`
      : `${preview.senderFirstName} sent you a gift!`
    : isRTL
      ? 'هدية في انتظارك!'
      : 'A gift is waiting for you!';

  const loginRedirect = `/${locale}/gift/${encodeURIComponent(token)}`;

  return (
    <Shell locale={locale}>
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-500 shadow-xl"
        >
          <Gift className="h-12 w-12 text-white" />
        </motion.div>

        <p className="text-sm font-medium text-fuchsia-600">{senderLine}</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{giftTitle}</h1>
        <p className="mt-2 text-3xl font-bold text-slate-900">
          {giftValueEgp} {isRTL ? 'ج.م' : 'EGP'}
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <Clock className="h-3.5 w-3.5" />
          {isRTL
            ? hoursLeft > 1
              ? `صالح لمدة ${hoursLeft} ساعة`
              : 'صالح لساعات قليلة فقط'
            : hoursLeft > 1
              ? `Valid for ${hoursLeft}h`
              : 'Only a few hours left'}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6">
          {isAuthenticated ? (
            <Button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-95"
            >
              {claiming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRTL ? (
                'افتح الهدية'
              ) : (
                'Open my gift'
              )}
            </Button>
          ) : (
            <div className="grid gap-2">
              <Link href={`/${locale}/auth/signup?redirect=${encodeURIComponent(loginRedirect)}`}>
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-95">
                  {isRTL ? 'سجّل واستلم هديتك' : 'Sign up & claim your gift'}
                </Button>
              </Link>
              <Link href={`/${locale}/auth/login?redirect=${encodeURIComponent(loginRedirect)}`}>
                <Button variant="outline" className="w-full">
                  {isRTL ? 'لديك حساب؟ سجّل دخول' : 'Already have an account? Sign in'}
                </Button>
              </Link>
            </div>
          )}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          {isRTL
            ? 'هذا الرابط لمستخدم واحد فقط. لو معدتش الاستلام خلال ٤٨ ساعة، الهدية ترجع لصاحبها تلقائيًا.'
            : 'This link is single-use. If not claimed within 48 hours, the gift returns to the sender.'}
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children, locale }: { children: React.ReactNode; locale: string }) {
  const isRTL = locale === 'ar';
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 px-4 py-10"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-md">
        <Link href={`/${locale}`} className="mb-8 flex justify-center">
          <EngeznaLogo size="md" static showPen={false} />
        </Link>
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}
