import { createClient } from '@/lib/supabase/server';
import { createGiftForwardService } from '@/lib/gift-forward';
import { GiftLandingClient } from './GiftLandingClient';

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

export const dynamic = 'force-dynamic';

export default async function GiftLandingPage({ params }: PageProps) {
  const { locale, token } = await params;

  const supabase = await createClient();
  const service = createGiftForwardService(supabase);
  const preview = await service.peek(token);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <GiftLandingClient locale={locale} token={token} preview={preview} isAuthenticated={!!user} />
  );
}
