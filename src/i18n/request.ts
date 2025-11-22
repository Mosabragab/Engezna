import { getRequestConfig } from 'next-intl/server'
import { locales, type Locale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  // Get the locale from the request, awaiting if it's a Promise (Next.js 16+)
  let locale = await requestLocale

  // Ensure the locale is valid, fallback to default if not
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'ar' // fallback to default locale
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  }
})
