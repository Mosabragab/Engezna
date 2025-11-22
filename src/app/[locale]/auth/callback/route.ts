import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Extract locale from the pathname (e.g., /en/auth/callback or /ar/auth/callback)
  const locale = pathname.split('/')[1] || 'en'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect to the next URL or home page with locale
      const redirectUrl = next.startsWith('/') ? next : `/${locale}${next.startsWith('/') ? '' : '/'}${next}`
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
  }

  // If there's an error or no code, redirect to login with locale
  return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url))
}
