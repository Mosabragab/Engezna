'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, ArrowRight, MapPin, ChevronDown } from 'lucide-react'

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
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const t = useTranslations('auth.signup')
  const locale = useLocale()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [loadingGovernorates, setLoadingGovernorates] = useState(true)

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
        }

        setSuccess(true)
        setTimeout(() => {
          router.push(`/${locale}/auth/login`)
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

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t('signingUp') : t('signupButton')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t('hasAccount')}{' '}
            <Link
              href={`/${locale}/auth/login`}
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
