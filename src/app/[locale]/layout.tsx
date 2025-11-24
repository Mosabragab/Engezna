import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { notoSans, notoSansArabic } from '@/lib/fonts'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { locales } from '@/i18n/config'
import '../globals.css'

export function generateMetadata() {
  return {
    title: "Engezna - انجزنا | Food Delivery in Beni Suef",
    description: "انجزنا واطلب - Fast food delivery from restaurants, coffee shops, groceries in Beni Suef",
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
      <body className={`${notoSans.variable} ${notoSansArabic.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="engezna-theme"
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}