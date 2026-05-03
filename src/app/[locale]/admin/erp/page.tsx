import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ErpClient } from './ErpClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminErpPage({ params }: PageProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/admin/login`);

  return <ErpClient locale={locale} />;
}
