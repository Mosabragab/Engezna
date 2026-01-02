'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import Link from 'next/link'
import { MapPin, Phone, Loader2, CheckCircle, User } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface Governorate {
  id: string
  name_ar: string
  name_en: string
  is_active: boolean
}

interface City {
  id: string
  name_ar: string
  name_en: string
  governorate_id: string
  is_active: boolean
}

// ============================================================================
// Form Schema
// ============================================================================

const completeProfileSchema = z.object({
  firstName: z.string().min(2, 'الاسم الأول مطلوب'),
  lastName: z.string().min(2, 'اسم العائلة مطلوب'),
  phone: z.string().regex(/^01[0-2,5]{1}[0-9]{8}$/, 'رقم هاتف مصري غير صالح'),
  governorateId: z.string().min(1, 'يرجى اختيار المحافظة'),
  cityId: z.string().min(1, 'يرجى اختيار المدينة'),
})

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>

// ============================================================================
// Main Component
// ============================================================================

export default function CompleteProfilePage() {
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')

  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Location data
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)

  // User data
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [hasExistingName, setHasExistingName] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      governorateId: '',
      cityId: '',
    },
  })

  const selectedGovernorateId = watch('governorateId')

  // Filter cities based on selected governorate
  const filteredCities = useMemo(() => {
    if (!selectedGovernorateId) return []
    return cities.filter(city => city.governorate_id === selectedGovernorateId)
  }, [selectedGovernorateId, cities])

  // Check authentication and profile status
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Not authenticated - redirect to login
        router.push(`/${locale}/auth/login`)
        return
      }

      setUserId(user.id)
      setUserEmail(user.email || null)

      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, governorate_id, city_id')
        .eq('id', user.id)
        .single()

      if (profile) {
        // If profile is already complete, redirect
        if (profile.governorate_id && profile.phone && profile.full_name) {
          const destination = redirectTo || `/${locale}`
          router.push(destination)
          return
        }

        // Pre-fill existing data
        if (profile.full_name) {
          setHasExistingName(true)
          const nameParts = profile.full_name.split(' ')
          setValue('firstName', nameParts[0] || '')
          setValue('lastName', nameParts.slice(1).join(' ') || '')
        }

        if (profile.phone) {
          setValue('phone', profile.phone)
        }
      }

      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [locale, router, redirectTo, setValue])

  // Fetch locations
  useEffect(() => {
    async function fetchLocations() {
      const supabase = createClient()

      // Fetch governorates
      const { data: govData } = await supabase
        .from('governorates')
        .select('id, name_ar, name_en, is_active')
        .eq('is_active', true)
        .order('name_ar')

      if (govData) {
        setGovernorates(govData)
      }

      // Fetch all cities
      const { data: cityData } = await supabase
        .from('cities')
        .select('id, name_ar, name_en, governorate_id, is_active')
        .eq('is_active', true)
        .order('name_ar')

      if (cityData) {
        setCities(cityData)
      }

      setLoadingLocations(false)
    }

    fetchLocations()
  }, [])

  // Reset city when governorate changes
  useEffect(() => {
    setValue('cityId', '')
  }, [selectedGovernorateId, setValue])

  const onSubmit = async (data: CompleteProfileFormData) => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Combine first and last name
      const fullName = `${data.firstName} ${data.lastName}`.trim()

      // Update profile with all data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: data.phone,
          governorate_id: data.governorateId,
          city_id: data.cityId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        throw updateError
      }

      setSuccess(true)

      // Redirect after success
      setTimeout(() => {
        const destination = redirectTo || `/${locale}`
        window.location.href = destination
      }, 1500)

    } catch (err) {
      console.error('Error updating profile:', err)
      setError(
        locale === 'ar'
          ? 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.'
          : 'An error occurred while saving. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">
                {locale === 'ar' ? 'تم حفظ البيانات!' : 'Profile Completed!'}
              </h2>
              <p className="text-muted-foreground">
                {locale === 'ar'
                  ? 'جاري تحويلك...'
                  : 'Redirecting you...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      {/* Logo */}
      <div className="mb-6">
        <Link href={`/${locale}`} className="inline-block">
          <EngeznaLogo size="lg" static showPen={false} />
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {locale === 'ar' ? 'أكمل ملفك الشخصي' : 'Complete Your Profile'}
          </CardTitle>
          <CardDescription>
            {locale === 'ar'
              ? 'أدخل بياناتك للمتابعة'
              : 'Enter your details to continue'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Name Fields Row */}
            <div className="grid grid-cols-2 gap-3">
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  {locale === 'ar' ? 'الاسم الأول' : 'First Name'}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder={locale === 'ar' ? 'أحمد' : 'Ahmed'}
                  {...register('firstName')}
                  disabled={isLoading}
                  className={errors.firstName ? 'border-destructive' : ''}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {locale === 'ar' ? 'مطلوب' : 'Required'}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  {locale === 'ar' ? 'اسم العائلة' : 'Last Name'}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder={locale === 'ar' ? 'محمد' : 'Mohamed'}
                  {...register('lastName')}
                  disabled={isLoading}
                  className={errors.lastName ? 'border-destructive' : ''}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {locale === 'ar' ? 'مطلوب' : 'Required'}
                  </p>
                )}
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="01xxxxxxxxx"
                {...register('phone')}
                disabled={isLoading}
                className={errors.phone ? 'border-destructive' : ''}
                dir="ltr"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">
                  {locale === 'ar' ? 'يرجى إدخال رقم هاتف مصري صحيح' : errors.phone.message}
                </p>
              )}
            </div>

            {/* Governorate */}
            <div className="space-y-2">
              <Label htmlFor="governorateId" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {locale === 'ar' ? 'المحافظة' : 'Governorate'}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                disabled={isLoading || loadingLocations}
                value={selectedGovernorateId}
                onValueChange={(value) => setValue('governorateId', value)}
              >
                <SelectTrigger className={errors.governorateId ? 'border-destructive' : ''}>
                  <SelectValue
                    placeholder={
                      loadingLocations
                        ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...')
                        : (locale === 'ar' ? 'اختر المحافظة' : 'Select governorate')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {governorates.map((gov) => (
                    <SelectItem key={gov.id} value={gov.id}>
                      {locale === 'ar' ? gov.name_ar : gov.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.governorateId && (
                <p className="text-sm text-destructive">
                  {locale === 'ar' ? 'يرجى اختيار المحافظة' : errors.governorateId.message}
                </p>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="cityId" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-500" />
                {locale === 'ar' ? 'المدينة' : 'City'}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                disabled={isLoading || !selectedGovernorateId || filteredCities.length === 0}
                value={watch('cityId')}
                onValueChange={(value) => setValue('cityId', value)}
              >
                <SelectTrigger className={errors.cityId ? 'border-destructive' : ''}>
                  <SelectValue
                    placeholder={
                      !selectedGovernorateId
                        ? (locale === 'ar' ? 'اختر المحافظة أولاً' : 'Select governorate first')
                        : filteredCities.length === 0
                          ? (locale === 'ar' ? 'لا توجد مدن متاحة' : 'No cities available')
                          : (locale === 'ar' ? 'اختر المدينة' : 'Select city')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredCities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {locale === 'ar' ? city.name_ar : city.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cityId && (
                <p className="text-sm text-destructive">
                  {locale === 'ar' ? 'يرجى اختيار المدينة' : errors.cityId.message}
                </p>
              )}
            </div>

            {/* Info Note */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-muted-foreground">
              <p>
                {locale === 'ar'
                  ? '📍 سيتم استخدام موقعك لعرض المتاجر القريبة منك.'
                  : '📍 Your location will be used to show nearby stores.'}
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                locale === 'ar' ? 'حفظ ومتابعة' : 'Save & Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center mt-6 text-sm text-slate-400">
        {locale === 'ar' ? 'انجزنا - منصة توصيل' : 'Engezna - Delivery Platform'}
      </p>
    </div>
  )
}
