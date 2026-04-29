import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createReferralService } from '@/lib/referrals';
import { ReferralPageClient } from './ReferralPageClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ReferralPage({ params }: PageProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/referral`);
  }

  const service = createReferralService(supabase);
  const [stats, history] = await Promise.all([
    service.getStats(user.id),
    service.getHistory(user.id),
  ]);

  return <ReferralPageClient stats={stats} history={history} />;
}
