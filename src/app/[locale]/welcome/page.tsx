import { Suspense } from 'react';
import type { Metadata } from 'next';
import { WelcomePageClient } from './WelcomePageClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'مرحباً | إنجزنا' : 'Welcome | Engezna',
    description:
      locale === 'ar'
        ? 'لتلبية احتياجات بيتك اليومية من أقرب تاجر - بدون رسوم خدمة'
        : 'For your daily home essentials from the nearest merchant - no service fees',
    alternates: {
      canonical: `https://www.engezna.com/${locale}/welcome`,
      languages: {
        ar: 'https://www.engezna.com/ar/welcome',
        en: 'https://www.engezna.com/en/welcome',
      },
    },
  };
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
