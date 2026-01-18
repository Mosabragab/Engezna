import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { notoSans, notoSansArabic } from '@/lib/fonts';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { LocationProvider } from '@/lib/contexts';
import { PushNotificationProvider } from '@/components/providers/PushNotificationProvider';
import { GoogleOAuthProvider } from '@/components/providers/GoogleOAuthProvider';
import { locales } from '@/i18n/config';
import '../globals.css';

export function generateMetadata() {
  return {
    title: 'Engezna - إنجزنا | Local Marketplace in Egypt',
    description:
      'منصة إنجزنا لتلبية احتياجات البيت اليومية: مطاعم، سوبر ماركت، صيدليات، خضروات وفاكهة، بن وحلويات',
    manifest: '/manifest.json',
    themeColor: '#0F172A',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'إنجزنا',
    },
    formatDetection: {
      telephone: true,
    },
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
      viewportFit: 'cover',
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
        {/* Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&display=swap"
          rel="stylesheet"
        />
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
      <body className={`${notoSans.variable} ${notoSansArabic.variable} font-sans antialiased`}>
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
              <PushNotificationProvider>
                <GoogleOAuthProvider>{children}</GoogleOAuthProvider>
              </PushNotificationProvider>
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
