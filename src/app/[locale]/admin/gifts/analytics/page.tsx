import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminGiftsService } from '@/lib/admin-gifts';
import { GiftsAnalyticsClient } from './GiftsAnalyticsClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminGiftsAnalyticsPage({ params }: PageProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/admin/login`);

  const service = createAdminGiftsService(supabase);
  const [dailyGrants, bucketDistribution, segmentDistribution] = await Promise.all([
    service.getDailyGrants(30),
    service.getBucketDistribution(),
    service.getSegmentDistribution(),
  ]);

  return (
    <GiftsAnalyticsClient
      locale={locale}
      dailyGrants={dailyGrants}
      bucketDistribution={bucketDistribution}
      segmentDistribution={segmentDistribution}
    />
  );
}
