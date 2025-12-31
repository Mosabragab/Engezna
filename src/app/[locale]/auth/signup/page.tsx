'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import { ArrowLeft, ArrowRight, MapPin, ChevronDown, Loader2 } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

interface Governorate {
  id: string
  name_ar: string
  name_en: string
  is_active: boolean
}

// Form validation schema
const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^01[0-2,5]{1}[0-9]{8}$/, 'Please enter a valid Egyptian phone number'),
  email: z.string().email('Invalid email address'),
  governorateId: z.string().min(1, 'Please select your governorate'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const t = useTranslations('auth.signup')
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [loadingGovernorates, setLoadingGovernorates] = useState(true)

  // Handle Google signup with authorization code flow
  const handleGoogleSignup = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      setIsGoogleLoading(true)
      setError(null)

      try {
        // Exchange auth code for ID token via our API
        const tokenResponse = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
        })

        const tokens = await tokenResponse.json()

        if (!tokenResponse.ok || !tokens.id_token) {
          setError(locale === 'ar' ? 'فشل في الحصول على بيانات Google' : 'Failed to get Google credentials')
          setIsGoogleLoading(false)
          return
        }

        const supabase = createClient()

        // Sign in to Supabase with Google ID token
        const { data, error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: tokens.id_token,
        })

        if (signInError) {
          console.error('Supabase signInWithIdToken error:', signInError)
          setError(signInError.message)
          setIsGoogleLoading(false)
          return
        }

        if (data.user) {
          // Check if profile exists, if not create one
          const { data: profile } = await supabase
            .from('profiles')
            .select('governorate_id, phone, role')
            .eq('id', data.user.id)
            .single()

          if (!profile) {
            // Create profile for new Google user
            await supabase.from('profiles').insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
              role: 'customer',
            })
          }

          // Check if profile is complete - always redirect to complete profile for new signups
          if (!profile?.governorate_id || !profile?.phone) {
            const completeProfileUrl = redirectTo
              ? `/${locale}/auth/complete-profile?redirect=${encodeURIComponent(redirectTo)}`
              : `/${locale}/auth/complete-profile`
            window.location.href = completeProfileUrl
            return
          }

          // Profile is complete - redirect
          window.location.href = redirectTo || `/${locale}`
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setIsGoogleLoading(false)
      }
    },
    onError: () => {
      setError(locale === 'ar' ? 'فشل التسجيل بـ Google' : 'Google sign-up failed')
      setIsGoogleLoading(false)
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      governorateId: '',
      agreeToTerms: false,
    },
  })

  const selectedGovernorateId = watch('governorateId')

  // Fetch governorates on mount
  useEffect(() => {
    async function fetchGovernorates() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('governorates')
        .select('id, name_ar, name_en, is_active')
        .eq('is_active', true)
        .order('name_ar')

      if (!error && data) {
        setGovernorates(data)
      }
      setLoadingGovernorates(false)
    }
    fetchGovernorates()
  }, [])

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (authData.user) {
        // Insert user profile data with governorate_id
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: data.email,
            phone: data.phone,
            full_name: data.fullName,
            role: 'customer',
            governorate_id: data.governorateId,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // Profile creation failed - show error to user
          setError(
            locale === 'ar'
              ? 'فشل في إنشاء الملف الشخصي. يرجى المحاولة مرة أخرى.'
              : 'Failed to create profile. Please try again.'
          )
          // Delete the auth user since profile creation failed
          // This prevents orphaned auth users without profiles
          await supabase.auth.signOut()
          return
        }

        setSuccess(true)
        setTimeout(() => {
          // If there's a redirect URL, go to login with that redirect preserved
          if (redirectTo) {
            router.push(`/${locale}/auth/login?redirect=${encodeURIComponent(redirectTo)}`)
          } else {
            router.push(`/${locale}/auth/login`)
          }
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">{t('successTitle')}</h2>
              <p className="text-muted-foreground">{t('successMessage')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isRTL = locale === 'ar'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      {/* Logo - Links back to home */}
      <div className="mb-6">
        <Link href={`/${locale}`} className="inline-block">
          <EngeznaLogo size="lg" static showPen={false} />
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">{t('fullName')}</Label>
              <Input
                id="fullName"
                type="text"
                placeholder={t('fullNamePlaceholder')}
                {...register('fullName')}
                disabled={isLoading}
                className={errors.fullName ? 'border-destructive' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('phonePlaceholder')}
                {...register('phone')}
                disabled={isLoading}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                {...register('email')}
                disabled={isLoading}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Governorate Selection */}
            <div className="space-y-2">
              <Label htmlFor="governorateId" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {locale === 'ar' ? 'المحافظة' : 'Governorate'}
              </Label>
              <div className="relative">
                <select
                  id="governorateId"
                  {...register('governorateId')}
                  disabled={isLoading || loadingGovernorates}
                  className={`w-full h-10 px-3 py-2 text-sm rounded-md border bg-background appearance-none cursor-pointer
                    ${errors.governorateId ? 'border-destructive' : 'border-input'}
                    focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                    disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <option value="">
                    {loadingGovernorates
                      ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...')
                      : (locale === 'ar' ? 'اختر المحافظة' : 'Select governorate')
                    }
                  </option>
                  {governorates.map((gov) => (
                    <option key={gov.id} value={gov.id}>
                      {locale === 'ar' ? gov.name_ar : gov.name_en}
                    </option>
                  ))}
                </select>
                <ChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none`} />
              </div>
              {errors.governorateId && (
                <p className="text-sm text-destructive">
                  {locale === 'ar' ? 'يرجى اختيار المحافظة' : errors.governorateId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                {...register('password')}
                disabled={isLoading}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('confirmPasswordPlaceholder')}
                {...register('confirmPassword')}
                disabled={isLoading}
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  {...register('agreeToTerms')}
                  disabled={isLoading}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="agreeToTerms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  {locale === 'ar' ? (
                    <>
                      أوافق على{' '}
                      <Link href={`/${locale}/terms`} className="text-primary hover:underline font-medium" target="_blank">
                        الشروط والأحكام
                      </Link>
                      {' '}و{' '}
                      <Link href={`/${locale}/privacy`} className="text-primary hover:underline font-medium" target="_blank">
                        سياسة الخصوصية
                      </Link>
                    </>
                  ) : (
                    <>
                      I agree to the{' '}
                      <Link href={`/${locale}/terms`} className="text-primary hover:underline font-medium" target="_blank">
                        Terms & Conditions
                      </Link>
                      {' '}and{' '}
                      <Link href={`/${locale}/privacy`} className="text-primary hover:underline font-medium" target="_blank">
                        Privacy Policy
                      </Link>
                    </>
                  )}
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-sm text-destructive">
                  {locale === 'ar' ? 'يجب الموافقة على الشروط والأحكام' : errors.agreeToTerms.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? t('signingUp') : t('signupButton')}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {locale === 'ar' ? 'أو' : 'OR'}
              </span>
            </div>
          </div>

          {/* Google Sign-Up Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleGoogleSignup()}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 me-2 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span className="ms-2">
              {locale === 'ar' ? 'التسجيل عبر جوجل' : 'Sign up with Google'}
            </span>
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link
              href={redirectTo ? `/${locale}/auth/login?redirect=${encodeURIComponent(redirectTo)}` : `/${locale}/auth/login`}
              className="text-primary hover:underline font-medium"
            >
              {t('loginLink')}
            </Link>
          </div>
        </CardFooter>
      </Card>

      {/* Back to Home Link */}
      <Link
        href={`/${locale}`}
        className="mt-6 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        {locale === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
      </Link>
    </div>
  )
}
