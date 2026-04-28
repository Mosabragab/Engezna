'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Copy, Check, Share2, Gift, Users, Clock, CheckCircle2 } from 'lucide-react';
import { SettingsLayout } from '@/components/customer/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ReferralStats, ReferralHistoryEntry } from '@/lib/referrals';

interface ReferralPageClientProps {
  stats: ReferralStats | null;
  history: ReferralHistoryEntry[];
}

export function ReferralPageClient({ stats, history }: ReferralPageClientProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [copied, setCopied] = useState(false);

  const code = stats?.code || '';
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${locale}/auth/signup?ref=${code}`
      : '';

  const shareMessage = isRTL
    ? `جرّب إنجزنا — توصيل سريع لأكلك المفضل! استخدم الكود ${code} عند التسجيل واحصلوا على هدية ٢٠ ج.م لما تطلبوا أول طلبكم.\n${shareUrl}`
    : `Try Engezna — fast delivery for your favorites! Use code ${code} on signup and we both get a 20 EGP gift after your first order.\n${shareUrl}`;

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  }

  function shareOnWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank');
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: isRTL ? 'إنجزنا — كود الإحالة' : 'Engezna — Referral Code',
          text: shareMessage,
          url: shareUrl,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      shareOnWhatsApp();
    }
  }

  const rewardsEarned = (stats?.rewards_earned_piasters || 0) / 100;

  return (
    <SettingsLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          {isRTL ? 'ادعُ صديقًا' : 'Invite a Friend'}
        </h1>
        <p className="mb-6 text-sm text-slate-600">
          {isRTL
            ? 'شارك كودك مع أصحابك. لما يطلبوا أول طلب ٣٠٠ ج.م أو أكثر، تستلم صندوق هدية ٢٠ ج.م.'
            : 'Share your code with friends. When they place a first order of 300 EGP or more, you both get a 20 EGP gift box.'}
        </p>

        <Card className="mb-4 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
          <p className="mb-2 text-xs font-medium text-slate-500">
            {isRTL ? 'كودك الخاص' : 'Your code'}
          </p>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="font-mono text-3xl font-bold tracking-widest text-primary">
              {code || '—'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyCode}
              disabled={!code}
              className="gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? (isRTL ? 'تم النسخ' : 'Copied') : isRTL ? 'نسخ' : 'Copy'}
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={nativeShare} disabled={!code} className="flex-1 gap-2">
              <Share2 className="h-4 w-4" />
              {isRTL ? 'مشاركة' : 'Share'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={shareOnWhatsApp}
              disabled={!code}
              className="flex-1 gap-2"
            >
              {isRTL ? 'إرسال على واتساب' : 'Send on WhatsApp'}
            </Button>
          </div>
        </Card>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock
            icon={<Users className="h-4 w-4" />}
            label={isRTL ? 'إجمالي' : 'Total'}
            value={String(stats?.total_referrals ?? 0)}
          />
          <StatBlock
            icon={<Clock className="h-4 w-4" />}
            label={isRTL ? 'معلّق' : 'Pending'}
            value={String(stats?.pending_referrals ?? 0)}
          />
          <StatBlock
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={isRTL ? 'مكتمل' : 'Completed'}
            value={String(stats?.completed_referrals ?? 0)}
          />
          <StatBlock
            icon={<Gift className="h-4 w-4" />}
            label={isRTL ? 'مكافآتك' : 'Rewards'}
            value={`${rewardsEarned} ${isRTL ? 'ج.م' : 'EGP'}`}
          />
        </div>

        {stats && (
          <Card className="mb-6 p-4">
            <p className="text-sm text-slate-700">
              {isRTL
                ? `هذا الشهر: ${stats.monthly_completed} من ${stats.monthly_limit} إحالة`
                : `This month: ${stats.monthly_completed} of ${stats.monthly_limit} referrals`}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, (stats.monthly_completed / Math.max(1, stats.monthly_limit)) * 100)}%`,
                }}
              />
            </div>
            {stats.monthly_remaining === 0 && (
              <p className="mt-2 text-xs text-amber-600">
                {isRTL
                  ? 'وصلت لحد الإحالات الشهري — مكافأتك ستصل الشهر القادم.'
                  : "You reached this month's referral cap — rewards continue next month."}
              </p>
            )}
          </Card>
        )}

        <h2 className="mb-3 text-lg font-bold text-slate-900">
          {isRTL ? 'سجل الإحالات' : 'Referral History'}
        </h2>

        {history.length === 0 ? (
          <Card className="p-6 text-center text-sm text-slate-500">
            {isRTL ? 'لم تقم بأي إحالة بعد.' : 'No referrals yet.'}
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <Card key={entry.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {entry.referee_name || (isRTL ? 'صديق' : 'Friend')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(entry.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                  </p>
                </div>
                <StatusBadge status={entry.status} isRTL={isRTL} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-1 flex items-center gap-1 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status, isRTL }: { status: string; isRTL: boolean }) {
  const styles: Record<string, { bg: string; text: string; label: { ar: string; en: string } }> = {
    pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      label: { ar: 'معلّق', en: 'Pending' },
    },
    completed: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      label: { ar: 'مكتمل', en: 'Completed' },
    },
    expired: {
      bg: 'bg-slate-100',
      text: 'text-slate-500',
      label: { ar: 'منتهي', en: 'Expired' },
    },
  };
  const style = styles[status] || styles.pending;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
      {isRTL ? style.label.ar : style.label.en}
    </span>
  );
}
