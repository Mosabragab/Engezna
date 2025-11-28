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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import {
  Store,
  Coffee,
  ShoppingCart,
  Apple,
  Pill,
  UtensilsCrossed,
  User,
  Briefcase,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

// Business category options with icons
const businessCategories = [
  { value: 'restaurant', icon: UtensilsCrossed, labelAr: 'مطعم', labelEn: 'Restaurant' },
  { value: 'coffee_shop', icon: Coffee, labelAr: 'كافيه', labelEn: 'Cafe' },
  { value: 'grocery', icon: ShoppingCart, labelAr: 'سوبر ماركت', labelEn: 'Supermarket' },
  { value: 'juice_shop', icon: Apple, labelAr: 'عصائر', labelEn: 'Juice Shop' },
  { value: 'pharmacy', icon: Pill, labelAr: 'صيدلية', labelEn: 'Pharmacy' },
  { value: 'vegetables_fruits', icon: Apple, labelAr: 'خضروات وفواكه', labelEn: 'Vegetables & Fruits' },
]

// Partner role options
const partnerRoles = [
  { value: 'owner', icon: Briefcase, labelAr: 'المالك', labelEn: 'Owner' },
  { value: 'manager', icon: User, labelAr: 'المدير المسؤول', labelEn: 'Manager' },
]

// Form validation schema
const partnerSignupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^01[0-2,5]{1}[0-9]{8}$/, 'Please enter a valid Egyptian phone number'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  businessCategory: z.string().min(1, 'Please select a business category'),
  partnerRole: z.string().min(1, 'Please select your role'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type PartnerSignupFormData = z.infer<typeof partnerSignupSchema>

export default function PartnerRegisterPage() {
  const t = useTranslations('partner.register')
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState(1) // Step 1: Personal Info, Step 2: Business Info

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<PartnerSignupFormData>({
    resolver: zodResolver(partnerSignupSchema),
    defaultValues: {
      businessCategory: '',
      partnerRole: '',
    }
  })

  const businessCategory = watch('businessCategory')
  const partnerRole = watch('partnerRole')

  // Handle next step
  const handleNextStep = async () => {
    const isValid = await trigger(['fullName', 'phone', 'email', 'password', 'confirmPassword'])
    if (isValid) {
      setStep(2)
    }
  }

  // Handle previous step
  const handlePrevStep = () => {
    setStep(1)
  }

  const onSubmit = async (data: PartnerSignupFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // 1. Create user account in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone,
            role: 'provider_owner',
          },
        },
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (authData.user) {
        // 2. Insert user profile as provider_owner
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: data.email,
            phone: data.phone,
            full_name: data.fullName,
            role: 'provider_owner',
            partner_role: data.partnerRole,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          setError(profileError.message)
          return
        }

        // 3. Create provider record with status "incomplete"
        const { error: providerError } = await supabase
          .from('providers')
          .insert({
            owner_id: authData.user.id,
            name_ar: '', // Will be completed later
            name_en: '', // Will be completed later
            category: data.businessCategory,
            phone: data.phone,
            address_ar: '', // Will be completed later
            delivery_fee: 0, // Will be completed later
            status: 'incomplete',
          })

        if (providerError) {
          console.error('Provider creation error:', providerError)
          setError(providerError.message)
          return
        }

        setSuccess(true)
        // Redirect to provider dashboard after 2 seconds
        setTimeout(() => {
          router.push(`/${locale}/provider`)
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold">{t('successTitle')}</h2>
              <p className="text-muted-foreground">{t('successMessage')}</p>
              <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200 text-start">
                    {t('completeProfileNote')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Store className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('description')}
          </CardDescription>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <div className={`w-3 h-3 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-12 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-3 h-3 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {step === 1 ? t('step1Title') : t('step2Title')}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Personal Information */}
            {step === 1 && (
              <>
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
                    dir="ltr"
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
                    dir="ltr"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
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
                  type="button"
                  className="w-full"
                  onClick={handleNextStep}
                  disabled={isLoading}
                >
                  {t('nextStep')}
                  {isRTL ? <ArrowLeft className="w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </>
            )}

            {/* Step 2: Business Information */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>{t('businessCategory')}</Label>
                  <Select
                    value={businessCategory}
                    onValueChange={(value) => setValue('businessCategory', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className={errors.businessCategory ? 'border-destructive' : ''}>
                      <SelectValue placeholder={t('businessCategoryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {businessCategories.map((category) => {
                        const Icon = category.icon
                        return (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{locale === 'ar' ? category.labelAr : category.labelEn}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {errors.businessCategory && (
                    <p className="text-sm text-destructive">{errors.businessCategory.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('partnerRole')}</Label>
                  <Select
                    value={partnerRole}
                    onValueChange={(value) => setValue('partnerRole', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className={errors.partnerRole ? 'border-destructive' : ''}>
                      <SelectValue placeholder={t('partnerRolePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerRoles.map((role) => {
                        const Icon = role.icon
                        return (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{locale === 'ar' ? role.labelAr : role.labelEn}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {errors.partnerRole && (
                    <p className="text-sm text-destructive">{errors.partnerRole.message}</p>
                  )}
                </div>

                {/* Info Notice */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {t('completeProfileLater')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handlePrevStep}
                    disabled={isLoading}
                  >
                    {isRTL ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
                    {t('prevStep')}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? t('registering') : t('registerButton')}
                  </Button>
                </div>
              </>
            )}
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
          <div className="text-sm text-center text-muted-foreground">
            {t('isCustomer')}{' '}
            <Link
              href={`/${locale}/auth/signup`}
              className="text-primary hover:underline font-medium"
            >
              {t('customerSignupLink')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
