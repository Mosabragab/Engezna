'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { Loader2, AlertCircle } from 'lucide-react'

export default function AuthCallbackPage() {
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      const redirectParam = searchParams.get('redirect')
      const next = searchParams.get('next') ?? redirectParam ?? '/'

      // Handle error from Supabase (e.g., expired link)
      if (errorParam) {
        console.error('Auth callback error:', errorParam, errorDescription)
        const errorMessage = errorParam === 'access_denied' ? 'link_expired' : errorParam
        router.push(`/${locale}/auth/login?error=${errorMessage}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`)
        return
      }

      if (!code) {
        console.error('Auth callback: No code provided')
        router.push(`/${locale}/auth/login?error=no_code`)
        return
      }

      const supabase = createClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Auth callback: Code exchange error:', exchangeError.message)
        setError(locale === 'ar' ? 'فشل التحقق من الرابط' : 'Failed to verify link')
        setTimeout(() => {
          router.push(`/${locale}/auth/login?error=exchange_failed${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`)
        }, 2000)
        return
      }

      if (!data.user) {
        console.error('Auth callback: No user returned')
        router.push(`/${locale}/auth/login?error=no_user`)
        return
      }

      // Check if user profile is complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('governorate_id, phone, role')
        .eq('id', data.user.id)
        .single()

      // If profile doesn't exist, create it
      if (!profile) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
          role: 'customer',
        })

        // Redirect to complete profile
        const completeProfileUrl = next !== '/'
          ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(next)}`
          : `/${locale}/auth/complete-profile`
        router.push(completeProfileUrl)
        return
      }

      // Check if profile is incomplete
      if (!profile.governorate_id || !profile.phone) {
        const completeProfileUrl = next !== '/'
          ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(next)}`
          : `/${locale}/auth/complete-profile`
        router.push(completeProfileUrl)
        return
      }

      // Profile complete - redirect to destination
      const redirectUrl = next.startsWith('/') ? next : `/${locale}${next.startsWith('/') ? '' : '/'}${next}`
      router.push(redirectUrl)
    }

    handleCallback()
  }, [searchParams, locale, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      {/* Logo */}
      <div className="mb-8">
        <EngeznaLogo size="lg" static showPen={false} />
      </div>

      {/* Loading or Error State */}
      {error ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-slate-400 text-sm mt-2">
            {locale === 'ar' ? 'جاري التحويل...' : 'Redirecting...'}
          </p>
        </div>
      ) : (
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#009DE0] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">
            {locale === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing you in...'}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            {locale === 'ar' ? 'يرجى الانتظار' : 'Please wait'}
          </p>
        </div>
      )}
    </div>
  )
}
