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
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Prevent double execution
    if (isProcessing) return
    setIsProcessing(true)

    const handleCallback = async () => {
      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      const redirectParam = searchParams.get('redirect')
      const verified = searchParams.get('verified')
      const next = searchParams.get('next') ?? redirectParam ?? '/'

      const supabase = createClient()

      // Handle error from Supabase (e.g., expired link)
      if (errorParam) {
        console.error('Auth callback error:', errorParam, errorDescription)
        const errorMessage = errorParam === 'access_denied' ? 'link_expired' : errorParam
        router.push(`/${locale}/auth/login?error=${errorMessage}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`)
        return
      }

      // First, check if user is already logged in (session might be set automatically)
      let { data: { user } } = await supabase.auth.getUser()

      // Handle token_hash verification (from email verification link)
      let isSignupVerification = false
      if (!user && tokenHash && type) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'recovery' | 'email',
        })

        if (verifyError) {
          console.error('Auth callback: Token verification error:', verifyError.message)
          setError(locale === 'ar' ? 'فشل التحقق من الرابط. قد يكون منتهي الصلاحية.' : 'Failed to verify link. It may have expired.')
          setTimeout(() => {
            router.push(`/${locale}/auth/login?error=verification_failed${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`)
          }, 3000)
          return
        }
        user = data.user
        isSignupVerification = type === 'signup'
      }

      // If no user and we have a code, try to exchange it
      if (!user && code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error('Auth callback: Code exchange error:', exchangeError.message)
          // Try getting user again - sometimes session is set but exchange fails
          const { data: { user: retryUser } } = await supabase.auth.getUser()
          if (retryUser) {
            user = retryUser
          } else {
            setError(locale === 'ar' ? 'فشل التحقق من الرابط' : 'Failed to verify link')
            setTimeout(() => {
              router.push(`/${locale}/auth/login?error=exchange_failed${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`)
            }, 2000)
            return
          }
        } else {
          user = data.user
        }
      }

      // If still no user, redirect to login
      if (!user) {
        console.error('Auth callback: No user found')
        router.push(`/${locale}/auth/login?error=no_user`)
        return
      }

      // Check if user profile exists and is complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('governorate_id, phone, role')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, create it
      if (!profile) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
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
        // For providers, redirect to provider complete-profile
        if (profile.role === 'provider_owner') {
          router.push(`/${locale}/provider/complete-profile`)
          return
        }
        // For customers, redirect to customer complete-profile
        const completeProfileUrl = next !== '/'
          ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(next)}`
          : `/${locale}/auth/complete-profile`
        router.push(completeProfileUrl)
        return
      }

      // Send welcome email if this is a signup verification
      if (isSignupVerification && user) {
        try {
          await fetch('/api/auth/send-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          })
        } catch (emailError) {
          // Don't block the flow if welcome email fails
          console.error('Failed to send welcome email:', emailError)
        }
      }

      // Profile complete - redirect based on role
      if (profile.role === 'provider_owner') {
        // Check if provider has completed their store setup
        const { data: provider } = await supabase
          .from('providers')
          .select('status')
          .eq('owner_id', user.id)
          .single()

        if (provider?.status === 'incomplete') {
          router.push(`/${locale}/provider/complete-profile`)
          return
        }
        router.push(`/${locale}/provider`)
        return
      }

      // For customers, redirect to destination
      const redirectUrl = next.startsWith('/') ? next : `/${locale}${next.startsWith('/') ? '' : '/'}${next}`
      router.push(redirectUrl)
    }

    handleCallback()
  }, [searchParams, locale, router, isProcessing])

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
