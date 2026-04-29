'use client';

import { useEffect, useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SettingsLayout } from '@/components/customer/layout';
import { HeroHeader } from '@/components/customer/rewards/HeroHeader';
import { ActiveGiftsCarousel } from '@/components/customer/rewards/ActiveGiftsCarousel';
import { StampCardSection } from '@/components/customer/rewards/StampCardSection';
import { LoyaltyPointsSection } from '@/components/customer/rewards/LoyaltyPointsSection';
import { QuickActionsBar } from '@/components/customer/rewards/QuickActionsBar';
import { celebrateLarge, celebrateTierUpgrade } from '@/components/customer/rewards/celebrate';
import { createClient } from '@/lib/supabase/client';
import type { GiftBoxEntry, GiftStamp } from '@/lib/gifts/types';
import type { LoyaltyBalance, LoyaltyTier, LoyaltyTransaction } from '@/lib/loyalty';

interface RewardsHubClientProps {
  userId: string;
  fullName: string | null;
  gifts: GiftBoxEntry[];
  stampCard: GiftStamp | null;
  loyaltyBalance: LoyaltyBalance;
  recentTransactions: LoyaltyTransaction[];
}

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function RewardsHubClient({
  userId,
  fullName,
  gifts: initialGifts,
  stampCard: initialStamp,
  loyaltyBalance: initialBalance,
  recentTransactions: initialTx,
}: RewardsHubClientProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [gifts, setGifts] = useState(initialGifts);
  const [stampCard, setStampCard] = useState(initialStamp);
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState(initialTx);

  // Refresh from server (after redemption, gift open, etc.)
  async function refresh() {
    try {
      const res = await fetch('/api/rewards', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setGifts(data.gifts || []);
      setStampCard(data.stampCard || null);
      setBalance(data.loyalty?.balance || balance);
      setTransactions(data.loyalty?.transactions || []);
    } catch {
      /* ignore */
    }
    // Also revalidate the server component (badges in nav, etc.)
    startTransition(() => router.refresh());
  }

  // Real-time subscriptions: react to gift_box_entries, gift_stamps,
  // loyalty_points changes for this user.
  useEffect(() => {
    const supabase = createClient();
    const previousTier = balance.tier;

    const channel = supabase
      .channel(`rewards:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gift_box_entries',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // New granted gift → celebrate if this is a fresh insert with high value
          if (payload.eventType === 'INSERT') {
            const cost = (payload.new as { cost_piasters?: number })?.cost_piasters ?? 0;
            if (cost >= 1500) celebrateLarge();
          }
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gift_stamps',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const next = payload.new as { is_completed?: boolean };
            if (next?.is_completed) celebrateLarge();
          }
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loyalty_points',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as { tier?: LoyaltyTier };
          if (next?.tier && next.tier !== previousTier) {
            if (next.tier === 'gold' || next.tier === 'platinum') {
              celebrateTierUpgrade(next.tier);
            }
          }
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <SettingsLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          className="space-y-6"
        >
          <motion.div variants={sectionVariants} transition={{ duration: 0.4 }}>
            <HeroHeader fullName={fullName} loyalty={balance} />
          </motion.div>

          <motion.div variants={sectionVariants} transition={{ duration: 0.4 }}>
            <ActiveGiftsCarousel gifts={gifts} onChange={refresh} />
          </motion.div>

          <motion.div variants={sectionVariants} transition={{ duration: 0.4 }}>
            <StampCardSection stampCard={stampCard} />
          </motion.div>

          <motion.div variants={sectionVariants} transition={{ duration: 0.4 }}>
            <LoyaltyPointsSection
              balance={balance}
              transactions={transactions}
              onRedeemed={refresh}
            />
          </motion.div>

          <motion.div variants={sectionVariants} transition={{ duration: 0.4 }}>
            <QuickActionsBar />
          </motion.div>
        </motion.div>
      </div>
    </SettingsLayout>
  );
}
