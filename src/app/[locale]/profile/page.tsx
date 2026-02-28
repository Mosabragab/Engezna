import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfilePageClient from './ProfilePageClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Profile Page — Server Component
 *
 * Fetches auth + profile data server-side to eliminate the client waterfall:
 *   Before: page loads → JS executes → auth check → profile fetch → render (~2s)
 *   After:  server fetches auth+profile → sends HTML with data → instant render
 *
 * If not authenticated, redirects immediately (no client-side flash).
 */
export default async function ProfilePage({ params }: PageProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/profile`);
  }

  // Fetch profile data server-side (same query as the old client-side fetch)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single();

  const userProfile = {
    full_name: profile?.full_name || null,
    phone: profile?.phone || null,
    email: user.email || null,
  };

  return <ProfilePageClient userProfile={userProfile} />;
}
