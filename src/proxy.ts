import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n/config'
import { updateSession } from '@/lib/supabase/middleware'
import { NextRequest } from 'next/server'

// Create the internationalization middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
})

export default async function proxy(request: NextRequest) {
  // First, handle Supabase session refresh
  const supabaseResponse = await updateSession(request)

  // Then apply internationalization
  const intlResponse = intlMiddleware(request)

  // Merge headers from both responses (keep Supabase auth cookies)
  supabaseResponse.headers.forEach((value, key) => {
    intlResponse.headers.set(key, value)
  })

  // Merge cookies from both responses
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value)
  })

  return intlResponse
}

export const config = {
  matcher: [
    '/',
    '/(ar|en)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
}
