import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectParam = searchParams.get('redirect')
  const next = searchParams.get('next') ?? redirectParam ?? '/'

  // Extract locale from the pathname (e.g., /en/auth/callback or /ar/auth/callback)
  const locale = pathname.split('/')[1] || 'en'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user profile is complete (has governorate and phone)
      const { data: profile } = await supabase
        .from('profiles')
        .select('governorate_id, phone, role')
        .eq('id', data.user.id)
        .single()

      // If profile doesn't exist, create it for OAuth users
      if (!profile) {
        const { error: insertError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
          role: 'customer',
        })

        if (insertError) {
          console.error('Profile creation error for OAuth user:', insertError)
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
  }

  // If there's an error or no code, redirect to login with locale
  return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url))
}
