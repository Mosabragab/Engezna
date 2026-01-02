import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const redirectParam = searchParams.get('redirect')
  const next = searchParams.get('next') ?? redirectParam ?? '/'

  // Extract locale from the pathname (e.g., /en/auth/callback or /ar/auth/callback)
  const locale = pathname.split('/')[1] || 'ar'

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    // Redirect to login with error message
    const loginUrl = new URL(`/${locale}/auth/login`, request.url)
    loginUrl.searchParams.set('error', error === 'access_denied' ? 'link_expired' : error)
    if (redirectParam) {
      loginUrl.searchParams.set('redirect', redirectParam)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (!code) {
    console.error('Auth callback: No code provided')
    return NextResponse.redirect(new URL(`/${locale}/auth/login?error=no_code`, request.url))
  }

  const supabase = await createClient()
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error('Auth callback: Code exchange error:', exchangeError.message)
    const loginUrl = new URL(`/${locale}/auth/login`, request.url)
    loginUrl.searchParams.set('error', 'exchange_failed')
    if (redirectParam) {
      loginUrl.searchParams.set('redirect', redirectParam)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (!data.user) {
    console.error('Auth callback: No user returned after code exchange')
    return NextResponse.redirect(new URL(`/${locale}/auth/login?error=no_user`, request.url))
  }

  // Check if user profile is complete (has governorate and phone)
  const { data: profile } = await supabase
    .from('profiles')
    .select('governorate_id, phone, role')
    .eq('id', data.user.id)
    .single()

  // If profile doesn't exist, create it for OAuth/Magic Link users
  if (!profile) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
      role: 'customer',
    })

    if (insertError) {
      console.error('Profile creation error for Magic Link user:', insertError)
    }

    // Redirect to complete profile page
    const completeProfileUrl = next !== '/'
      ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(next)}`
      : `/${locale}/auth/complete-profile`
    return NextResponse.redirect(new URL(completeProfileUrl, request.url))
  }

  // Check if profile is incomplete (missing governorate or phone)
  if (!profile.governorate_id || !profile.phone) {
    // Redirect to complete profile page
    const completeProfileUrl = next !== '/'
      ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(next)}`
      : `/${locale}/auth/complete-profile`
    return NextResponse.redirect(new URL(completeProfileUrl, request.url))
  }

  // Profile is complete - redirect to the intended destination
  const redirectUrl = next.startsWith('/') ? next : `/${locale}${next.startsWith('/') ? '' : '/'}${next}`
  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
