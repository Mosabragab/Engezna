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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { EngeznaLogo } from '@/components/ui/EngeznaLogo'
import {
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
  AlertCircle,
  Store,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  RefreshCw
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href={`/${locale}`} className="inline-block">
              <EngeznaLogo size="lg" static showPen={false} />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{t('successTitle')}</h2>
              <p className="text-slate-600">{t('successMessage')}</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 text-start">
                    {t('completeProfileNote')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-block">
            <EngeznaLogo size="lg" static showPen={false} />
          </Link>
          <p className="text-sm text-slate-600 mt-2">
            {locale === 'ar' ? 'انضم لشبكة شركائنا' : 'Join Our Partner Network'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {t('title')}
                </h1>
                <p className="text-sm text-white/80">
                  {t('description')}
                </p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className={`w-3 h-3 rounded-full transition-colors ${step >= 1 ? 'bg-white' : 'bg-white/30'}`} />
              <div className={`w-12 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
              <div className={`w-3 h-3 rounded-full transition-colors ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
            </div>
            <p className="text-center text-sm text-white/80 mt-2">
              {step === 1 ? t('step1Title') : t('step2Title')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Step 1: Personal Information */}
            {step === 1 && (
              <>
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t('fullName')}</Label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder={t('fullNamePlaceholder')}
                      {...register('fullName')}
                      disabled={isLoading}
                      className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} ${errors.fullName ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <div className="relative">
                    <Phone className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder={t('phonePlaceholder')}
                      {...register('phone')}
                      disabled={isLoading}
                      className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} ${errors.phone ? 'border-destructive' : ''}`}
                      dir="ltr"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <div className="relative">
                    <Mail className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      {...register('email')}
                      disabled={isLoading}
                      className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} ${errors.email ? 'border-destructive' : ''}`}
                      dir="ltr"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <div className="relative">
                    <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('passwordPlaceholder')}
                      {...register('password')}
                      disabled={isLoading}
                      className={`${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.password ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('confirmPasswordPlaceholder')}
                      {...register('confirmPassword')}
                      disabled={isLoading}
                      className={`${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} ${errors.confirmPassword ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="button"
                  className="w-full py-3"
                  onClick={handleNextStep}
                  disabled={isLoading}
                >
                  {t('nextStep')}
                  {isRTL ? <ArrowLeft className="w-4 h-4 me-2" /> : <ArrowRight className="w-4 h-4 ms-2" />}
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
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      {t('completeProfileLater')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 py-3"
                    onClick={handlePrevStep}
                    disabled={isLoading}
                  >
                    {isRTL ? <ArrowRight className="w-4 h-4 me-2" /> : <ArrowLeft className="w-4 h-4 me-2" />}
                    {t('prevStep')}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 py-3"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      t('registerButton')
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Links */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-slate-600">
            {t('hasAccount')}{' '}
            <Link
              href={`/${locale}/provider/login`}
              className="text-primary font-medium hover:underline"
            >
              {t('loginLink')}
            </Link>
          </p>
          <p className="text-slate-600 text-sm">
            {t('isCustomer')}{' '}
            <Link
              href={`/${locale}/auth/signup`}
              className="text-primary hover:underline"
            >
              {t('customerSignupLink')}
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {locale === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
