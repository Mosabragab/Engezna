'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Loader2, X, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareGiftDialogProps {
  giftEntryId: string;
  giftTitle: string;
  giftValuePiasters: number;
  open: boolean;
  onClose: () => void;
  onShared?: () => void;
}

const REASON_MESSAGES: Record<string, { ar: string; en: string }> = {
  not_authenticated: { ar: 'يجب تسجيل الدخول أولًا', en: 'Please sign in first' },
  gift_not_found: { ar: 'الهدية غير موجودة', en: 'Gift not found' },
  not_authorized: { ar: 'هذه ليست هديتك', en: 'This is not your gift' },
  gift_not_forwardable: {
    ar: 'هذه الهدية غير قابلة للإرسال (مستخدمة أو منتهية)',
    en: 'This gift cannot be shared (used or expired)',
  },
  gift_expired: { ar: 'الهدية انتهت صلاحيتها', en: 'Gift has expired' },
  gift_type_not_forwardable: {
    ar: 'هذا النوع من الهدايا غير قابل للإرسال',
    en: 'This gift type cannot be shared',
  },
  forward_rate_limit_exceeded: {
    ar: 'وصلت للحد الأقصى — ٣ هدايا في الأسبوع',
    en: 'Limit reached — 3 gifts per week',
  },
  system_error: { ar: 'حدث خطأ غير متوقع', en: 'Unexpected error' },
};

export function ShareGiftDialog({
  giftEntryId,
  giftTitle,
  giftValuePiasters,
  open,
  onClose,
  onShared,
}: ShareGiftDialogProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state every time the dialog re-opens
  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setError(null);
      setShareUrl(null);
      setCopied(false);
    }
  }, [open]);

  async function handleShare() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/gifts/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftEntryId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = REASON_MESSAGES[data.error as string] || REASON_MESSAGES.system_error;
        setError(isRTL ? msg.ar : msg.en);
        return;
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${origin}/${locale}/gift/${data.forwardToken}`;
      setShareUrl(url);
      onShared?.();
    } catch (e) {
      console.error(e);
      const msg = REASON_MESSAGES.system_error;
      setError(isRTL ? msg.ar : msg.en);
    } finally {
      setSubmitting(false);
    }
  }

  const giftValueEgp = (giftValuePiasters / 100).toFixed(0);

  const whatsappText = isRTL
    ? `🎁 بعتلك هدية من إنجزنا — ${giftTitle} (${giftValueEgp} ج.م). افتح اللينك دلوقتي قبل ما تنتهي صلاحيتها خلال ٤٨ ساعة:\n${shareUrl}`
    : `🎁 I sent you a gift from Engezna — ${giftTitle} (${giftValueEgp} EGP). Open it within 48 hours:\n${shareUrl}`;

  const whatsappUrl = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(whatsappText)}`
    : undefined;

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Clipboard write failed', e);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={onClose}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-gift-title"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-gradient-to-br from-pink-100 to-purple-100 p-2">
                  <Gift className="h-5 w-5 text-pink-600" />
                </div>
                <h3 id="share-gift-title" className="text-lg font-bold text-slate-900">
                  {isRTL ? 'أرسلها لصاحبك' : 'Share with a friend'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={isRTL ? 'إغلاق' : 'Close'}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!shareUrl ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {isRTL ? 'هتبعت "' : "You're sending '"}
                  <span className="font-bold text-slate-900">{giftTitle}</span>
                  {isRTL
                    ? `" بقيمة ${giftValueEgp} ج.م لصاحبك. `
                    : `' (${giftValueEgp} EGP) to a friend. `}
                  {isRTL
                    ? 'الهدية لازم يستلمها خلال ٤٨ ساعة، بعدها ترجعلك تلقائيًا.'
                    : 'They have 48h to claim it — otherwise it bounces back to you automatically.'}
                </p>

                <ul className="mt-4 space-y-1.5 text-xs text-slate-500">
                  <li>
                    {isRTL
                      ? '• هتاخد +١٠ نقاط ولاء لما صاحبك يفتح الهدية'
                      : '• You earn +10 loyalty points when your friend opens it'}
                  </li>
                  <li>
                    {isRTL
                      ? '• تقدر ترسل ٣ هدايا في الأسبوع كحد أقصى'
                      : '• You can share up to 3 gifts per week'}
                  </li>
                </ul>

                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="mt-5 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={onClose}
                    disabled={submitting}
                  >
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-95"
                    onClick={handleShare}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isRTL ? (
                      'أنشئ اللينك'
                    ) : (
                      'Generate link'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {isRTL
                    ? '✅ تمام — اللينك جاهز. صالح لمدة ٤٨ ساعة.'
                    : '✅ Done — your link is ready. Valid for 48 hours.'}
                </div>

                <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <code
                    className="flex-1 truncate text-xs text-slate-700"
                    dir="ltr"
                    aria-label="share link"
                  >
                    {shareUrl}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-200"
                    aria-label={isRTL ? 'نسخ اللينك' : 'Copy link'}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                    {isRTL ? 'تمام' : 'Done'}
                  </Button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button
                      type="button"
                      className="w-full bg-[#25D366] text-white hover:bg-[#1ea957]"
                    >
                      {isRTL ? 'افتح WhatsApp' : 'Open WhatsApp'}
                    </Button>
                  </a>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
