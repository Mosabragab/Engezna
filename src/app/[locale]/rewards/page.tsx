import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createGiftEngine } from '@/lib/gifts';
import { createLoyaltyService } from '@/lib/loyalty';
import { RewardsHubClient } from './RewardsHubClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function RewardsPage({ params }: PageProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/rewards`);
  }

  const giftEngine = createGiftEngine(supabase);
  const loyaltyService = createLoyaltyService(supabase);

  const [gifts, stampCard, loyaltyBalance, transactions, profile] = await Promise.all([
    giftEngine.getUserGiftBox(user.id),
    giftEngine.getUserStampCard(user.id),
    loyaltyService.getBalance(user.id),
    loyaltyService.getHistory(user.id, 5),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ]);

  const fullName = profile.data?.full_name || null;

  return (
    <RewardsHubClient
      userId={user.id}
      fullName={fullName}
      gifts={gifts}
      stampCard={stampCard}
      loyaltyBalance={loyaltyBalance}
      recentTransactions={transactions}
    />
  );
}
