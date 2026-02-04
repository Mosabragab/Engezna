import { notFound } from 'next/navigation';
import type { Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { notoSans, notoSansArabic, arefRuqaa } from '@/lib/fonts';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { UpdateNotification } from '@/components/shared/UpdateNotification';
import { LocationProvider, OrderModeProvider } from '@/lib/contexts';
import { PushNotificationProvider } from '@/components/providers/PushNotificationProvider';
import { locales } from '@/i18n/config';
import '../globals.css';

/**
 * Viewport configuration (Next.js 14+)
 * Separated from metadata as per Next.js best practices
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-viewport
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zoom up to 5x for accessibility
  userScalable: true, // WCAG: Must allow user scaling
  viewportFit: 'cover',
  // Brand color for browser status bar
  themeColor: '#0F172A',
};

export function generateMetadata() {
  return {
    // SEO: Include both Arabic variations (with/without hamza) for better search coverage
    title: 'إنجزنا | احتياجات بيتك اليومية',
    description:
      'اطلب كل اللي بيتك محتاجه: أكل، دوا، خضار، بقالة، حلويات. من محلات قريبة منك وبأسعار مناسبة.',
    // SEO: Keywords for Arabic search variations
    keywords: [
      'إنجزنا',
      'انجزنا',
      'Engezna',
      'احتياجات البيت',
      'طلبات',
      'مطاعم',
      'سوبر ماركت',
      'صيدليات',
      'خضار',
      'حلويات',
    ],
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'إنجزنا',
    },
    formatDetection: {
      telephone: true,
    },
    icons: {
      icon: [
        { url: '/icons/favicon-32-dark.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/favicon-64-dark.png', sizes: '64x64', type: 'image/png' },
        { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      shortcut: '/icons/favicon-32-dark.png',
      apple: '/icons/icon-192x192.png',
    },
    // Open Graph for social sharing and SEO
    openGraph: {
      title: 'إنجزنا | احتياجات بيتك اليومية 💙',
      description: 'اطلب كل اللي بيتك محتاجه: أكل، دوا، خضار، بقالة، حلويات. من محلات قريبة منك.',
      url: 'https://www.engezna.com',
      siteName: 'إنجزنا',
      locale: 'ar_EG',
      alternateLocale: 'en_US',
      type: 'website',
      images: [
        {
          url: '/images/og-image.png',
          width: 1200,
          height: 630,
          alt: 'إنجزنا | احتياجات بيتك اليومية',
        },
      ],
    },
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: 'إنجزنا | احتياجات بيتك اليومية 💙',
      description: 'اطلب كل اللي بيتك محتاجه: أكل، دوا، خضار، بقالة، حلويات.',
      images: ['/images/og-image.png'],
    },
    // Robots for SEO
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    // Alternate language versions
    alternates: {
      canonical: 'https://www.engezna.com',
      languages: {
        ar: 'https://www.engezna.com/ar',
        en: 'https://www.engezna.com/en',
      },
    },
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!locales.includes(locale as any)) {
    notFound();
  }

  let messages;
  try {
    messages = (await import(`@/i18n/messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cmxpvzqrmptfnuymhxmr.supabase.co" />
        <link rel="dns-prefetch" href="https://cmxpvzqrmptfnuymhxmr.supabase.co" />
{/* Fonts are loaded via next/font/google in @/lib/fonts for better performance */}
        {/* Apple Touch Icons - Required for iOS Home Screen */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-192x192.png" />
        {/* Apple Startup Image / Splash Screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="إنجزنا" />
        {/* Theme Color for all browsers */}
        <meta name="theme-color" content="#0F172A" />
        <meta name="msapplication-TileColor" content="#0F172A" />
        <meta name="msapplication-TileImage" content="/icons/icon-192x192.png" />
      </head>
      <body className={`${notoSans.variable} ${notoSansArabic.variable} ${arefRuqaa.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="engezna-theme"
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <LocationProvider>
              <OrderModeProvider>
                <PushNotificationProvider>
                  {children}
                  <UpdateNotification />
                </PushNotificationProvider>
              </OrderModeProvider>
            </LocationProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
        {/* Vercel Analytics & Speed Insights (Phase 4.3) */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
