import { Suspense } from 'react';
import { WelcomePageClient } from './WelcomePageClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function WelcomePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      }
    >
      <WelcomePageClient locale={locale} />
    </Suspense>
  );
}
