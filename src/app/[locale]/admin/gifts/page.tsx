import { redirect } from 'next/navigation';

interface Params {
  params: Promise<{ locale: string }>;
}

export default async function AdminGiftsIndexPage({ params }: Params) {
  const { locale } = await params;
  redirect(`/${locale}/admin/gifts/campaigns`);
}
