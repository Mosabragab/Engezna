import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminGiftsService } from '@/lib/admin-gifts';
import { GiftsOverviewClient } from './GiftsOverviewClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminGiftsOverviewPage({ params }: PageProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/admin/login`);

  const service = createAdminGiftsService(supabase);
  const [overview, dailyGrants, bucketDistribution] = await Promise.all([
    service.getOverview(),
    service.getDailyGrants(14),
    service.getBucketDistribution(),
  ]);

  return (
    <GiftsOverviewClient
      locale={locale}
      overview={overview}
      dailyGrants={dailyGrants}
      bucketDistribution={bucketDistribution}
    />
  );
}
