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
import { NativeSplashHider } from '@/components/shared/NativeSplashHider';
import { NativeInit } from '@/components/shared/NativeInit';
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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const title = isAr
    ? 'إنجزنا - لتلبية احتياجات بيتك اليومية'
    : 'Engezna - Your Daily Home Essentials';
  const description = isAr
    ? 'إنجزنا - منصة مصرية لتلبية احتياجات بيتك اليومية. اطلب أكل، خضار، بقالة، دوا، حلويات من أقرب تاجر بأفضل سعر. قارن الأسعار واختار الأنسب بدون رسوم خدمة.'
    : 'Engezna - An Egyptian platform for your daily home needs. Order food, groceries, pharmacy, and more from the nearest merchant at the best price. Compare prices with no service fees.';
  const shortDescription = isAr
    ? 'إنجزنا - منصة مصرية لتلبية احتياجات بيتك اليومية. اطلب من أقرب تاجر بأفضل سعر وبدون رسوم خدمة.'
    : 'Engezna - Order from the nearest merchant at the best price with no service fees.';

  return {
    title,
    description,
    // SEO: Keywords for search variations in both languages
    keywords: isAr
      ? [
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
        ]
      : [
          'Engezna',
          'Egypt delivery',
          'grocery delivery',
          'food delivery Egypt',
          'compare prices',
          'no service fees',
          'restaurants',
          'supermarket',
          'pharmacy',
        ],
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: isAr ? 'إنجزنا' : 'Engezna',
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
      title,
      description: shortDescription,
      // Note: openGraph.url is intentionally omitted here so child pages
      // can set their own canonical URL without inheriting a wrong one
      // via Next.js shallow merge. Set openGraph.url in leaf page metadata.
      siteName: isAr ? 'إنجزنا' : 'Engezna',
      locale: isAr ? 'ar_EG' : 'en_US',
      alternateLocale: isAr ? 'en_US' : 'ar_EG',
      type: 'website',
      images: [
        {
          url: '/images/og-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title,
      description: shortDescription,
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
    // Alternate language versions (canonical set per-page, not here)
    alternates: {
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
        {/* Fonts are self-hosted via next/font/local — no external font requests */}
        <link rel="preconnect" href="https://cmxpvzqrmptfnuymhxmr.supabase.co" />
        <link rel="dns-prefetch" href="https://cmxpvzqrmptfnuymhxmr.supabase.co" />
        {/* Preconnect to Supabase storage for faster image loading */}
        <link
          rel="preconnect"
          href="https://cmxpvzqrmptfnuymhxmr.supabase.co"
          crossOrigin="anonymous"
        />
        {/* Fonts are self-hosted in public/fonts/ and loaded via next/font/local */}
        {/* Apple Touch Icons - Required for iOS Home Screen */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-192x192.png" />
        {/* Apple Web App meta tags are handled by the metadata API (appleWebApp) */}
        {/* Theme Color for all browsers */}
        <meta name="theme-color" content="#0F172A" />
        <meta name="msapplication-TileColor" content="#0F172A" />
        <meta name="msapplication-TileImage" content="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${notoSans.variable} ${notoSansArabic.variable} ${arefRuqaa.variable} font-sans antialiased`}
      >
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
                  <NativeInit />
                  <NativeSplashHider />
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
