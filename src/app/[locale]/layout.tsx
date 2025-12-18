import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { notoSans, notoSansArabic } from '@/lib/fonts'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { LocationProvider } from '@/lib/contexts'
import { locales } from '@/i18n/config'
import '../globals.css'

export function generateMetadata() {
  return {
    title: "Engezna - إنجزنا | Food Delivery in Beni Suef",
    description: "إنجزنا واطلب - Fast food delivery from restaurants, coffee shops, groceries in Beni Suef",
    manifest: '/manifest.json',
    themeColor: '#009DE0',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
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
      icon: '/icons/icon-192x192.png',
      apple: '/icons/icon-192x192.png',
    },
  }
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params
}: Props) {
  const { locale } = await params

  if (!locales.includes(locale as any)) {
    notFound()
  }

  let messages
  try {
    messages = (await import(`@/i18n/messages/${locale}.json`)).default
  } catch (error) {
    notFound()
  }

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&display=swap"
          rel="stylesheet"
        />
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
              {children}
            </LocationProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}