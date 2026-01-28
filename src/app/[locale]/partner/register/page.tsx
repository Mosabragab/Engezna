'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { EngeznaLogo } from '@/components/ui/EngeznaLogo';
import {
  Coffee,
  ShoppingCart,
  Apple,
  UtensilsCrossed,
  Pill,
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
  RefreshCw,
  MapPin,
  ChevronDown,
  Tag,
} from 'lucide-react';

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface City {
  id: string;
  governorate_id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface BusinessCategory {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  icon: string | null;
  color: string | null;
  display_order: number;
}

// Icon mapping for business categories
const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  restaurant_cafe: UtensilsCrossed,
  coffee_patisserie: Coffee,
  grocery: ShoppingCart,
  vegetables_fruits: Apple,
  pharmacy: Pill,
};

// Partner role options
const partnerRoles = [
  { value: 'owner', icon: Briefcase, labelAr: 'المالك', labelEn: 'Owner' },
  { value: 'manager', icon: User, labelAr: 'المدير المسؤول', labelEn: 'Manager' },
];

// Form validation schema
const partnerSignupSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().regex(/^01[0-2,5]{1}[0-9]{8}$/, 'Please enter a valid Egyptian phone number'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    businessCategory: z.string().min(1, 'Please select a business category'),
    storeName: z.string().min(2, 'Store name must be at least 2 characters'),
    partnerRole: z.string().min(1, 'Please select your role'),
    governorateId: z.string().min(1, 'Please select your governorate'),
    cityId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PartnerSignupFormData = z.infer<typeof partnerSignupSchema>;

export default function PartnerRegisterPage() {
  const t = useTranslations('partner.register');
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'ar';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Personal Info, Step 2: Business Info
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [loadingGovernorates, setLoadingGovernorates] = useState(true);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [businessCategories, setBusinessCategories] = useState<BusinessCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

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
      storeName: '',
      partnerRole: '',
      governorateId: '',
      cityId: '',
    },
  });

  const businessCategory = watch('businessCategory');
  const partnerRole = watch('partnerRole');
  const governorateId = watch('governorateId');
  const cityId = watch('cityId');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch governorates and business categories on mount
  useEffect(() => {
    async function fetchInitialData() {
      const supabase = createClient();

      // Fetch governorates
      const { data: govData, error: govError } = await supabase
        .from('governorates')
        .select('id, name_ar, name_en, is_active')
        .eq('is_active', true)
        .order('name_ar');

      if (!govError && govData) {
        setGovernorates(govData);
      }
      setLoadingGovernorates(false);

      // Fetch business categories from database
      const { data: catData, error: catError } = await supabase
        .from('business_categories')
        .select('id, code, name_ar, name_en, icon, color, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (!catError && catData) {
        setBusinessCategories(catData);
      }
      setLoadingCategories(false);
    }
    fetchInitialData();
  }, []);

  // Fetch cities when governorate changes
  useEffect(() => {
    if (!governorateId) {
      setCities([]);
      setValue('cityId', '');
      return;
    }

    async function fetchCities() {
      setLoadingCities(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cities')
        .select('id, governorate_id, name_ar, name_en, is_active')
        .eq('governorate_id', governorateId)
        .eq('is_active', true)
        .order('name_ar');

      if (!error && data) {
        setCities(data);
      }
      setLoadingCities(false);
    }
    fetchCities();
  }, [governorateId, setValue]);

  // Handle next step
  const handleNextStep = async () => {
    const isValid = await trigger(['fullName', 'phone', 'email', 'password', 'confirmPassword']);
    if (isValid) {
      setStep(2);
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    setStep(1);
  };

  const onSubmit = async (data: PartnerSignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call API route for partner registration (uses admin client to bypass RLS)
      const response = await fetch('/api/auth/partner-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          phone: data.phone,
          governorateId: data.governorateId,
          cityId: data.cityId || undefined,
          businessCategory: data.businessCategory,
          storeName: data.storeName,
          partnerRole: data.partnerRole,
          locale,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error || (locale === 'ar' ? 'حدث خطأ أثناء التسجيل' : 'Registration failed')
        );
        return;
      }

      // Save email for display in success state
      setRegisteredEmail(data.email);
      setSuccess(true);
      // Don't redirect - show check email message
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // State for resend email
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Success state - Check your email page
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
              {/* Email Icon */}
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-10 h-10 text-primary" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900">
                {locale === 'ar' ? 'تحقق من بريدك الإلكتروني' : 'Check Your Email'}
              </h2>

              <p className="text-slate-600">
                {locale === 'ar'
                  ? 'أرسلنا رابط تأكيد إلى بريدك الإلكتروني. يرجى الضغط على الرابط لتفعيل حسابك.'
                  : 'We sent a verification link to your email. Please click the link to activate your account.'}
              </p>

              {/* Email sent to */}
              <div className="bg-slate-50 rounded-xl p-4 mt-4">
                <p className="text-sm text-slate-500 mb-1">
                  {locale === 'ar' ? 'تم الإرسال إلى:' : 'Sent to:'}
                </p>
                <p className="font-medium text-slate-900 dir-ltr">
                  {registeredEmail || watch('email')}
                </p>
              </div>

              {/* Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 text-start">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  {locale === 'ar' ? 'الخطوات التالية:' : 'Next steps:'}
                </p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>{locale === 'ar' ? 'افتح بريدك الإلكتروني' : 'Open your email'}</li>
                  <li>
                    {locale === 'ar' ? 'اضغط على رابط التأكيد' : 'Click the verification link'}
                  </li>
                  <li>{locale === 'ar' ? 'أكمل بيانات متجرك' : 'Complete your store details'}</li>
                  <li>{locale === 'ar' ? 'انتظر موافقة الإدارة' : 'Wait for admin approval'}</li>
                </ol>
              </div>

              {/* Resend email button */}
              <div className="pt-4 space-y-3">
                {resendSuccess ? (
                  <p className="text-sm text-green-600 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {locale === 'ar' ? 'تم إعادة الإرسال بنجاح!' : 'Email resent successfully!'}
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={resendLoading}
                    onClick={async () => {
                      setResendLoading(true);
                      try {
                        await fetch('/api/auth/resend-verification', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: registeredEmail || watch('email') }),
                        });
                        setResendSuccess(true);
                        setTimeout(() => setResendSuccess(false), 5000);
                      } catch (e) {
                        console.error('Resend failed:', e);
                      } finally {
                        setResendLoading(false);
                      }
                    }}
                  >
                    {resendLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin me-2" />
                    ) : (
                      <Mail className="w-4 h-4 me-2" />
                    )}
                    {locale === 'ar' ? 'إعادة إرسال الرابط' : 'Resend verification link'}
                  </Button>
                )}

                <p className="text-xs text-slate-500">
                  {locale === 'ar'
                    ? 'لم يصلك البريد؟ تحقق من مجلد الرسائل غير المرغوب فيها (Spam)'
                    : "Didn't receive the email? Check your spam folder"}
                </p>
              </div>

              {/* Login link */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600">
                  {locale === 'ar' ? 'قمت بتأكيد بريدك؟' : 'Already verified?'}{' '}
                  <Link
                    href={`/${locale}/provider/login`}
                    className="text-primary font-medium hover:underline"
                  >
                    {locale === 'ar' ? 'سجل دخولك' : 'Sign in'}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
                <h1 className="text-xl font-bold">{t('title')}</h1>
                <p className="text-sm text-white/80">{t('description')}</p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div
                className={`w-3 h-3 rounded-full transition-colors ${step >= 1 ? 'bg-white' : 'bg-white/30'}`}
              />
              <div
                className={`w-12 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-white' : 'bg-white/30'}`}
              />
              <div
                className={`w-3 h-3 rounded-full transition-colors ${step >= 2 ? 'bg-white' : 'bg-white/30'}`}
              />
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
                    <User
                      className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
                    />
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
                    <Phone
                      className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
                    />
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
                    <Mail
                      className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
                    />
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
                    <Lock
                      className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
                    />
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
                    <Lock
                      className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
                    />
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
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
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
                  {isRTL ? (
                    <ArrowLeft className="w-4 h-4 me-2" />
                  ) : (
                    <ArrowRight className="w-4 h-4 ms-2" />
                  )}
                </Button>
              </>
            )}

            {/* Step 2: Business Information */}
            {step === 2 && (
              <>
                {/* Governorate Selection - Fixed after registration */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    {locale === 'ar' ? 'المحافظة' : 'Governorate'}
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      {locale === 'ar' ? 'غير قابل للتغيير' : 'Cannot be changed'}
                    </span>
                  </Label>
                  <div className="relative">
                    <select
                      value={governorateId}
                      onChange={(e) => setValue('governorateId', e.target.value)}
                      disabled={isLoading || loadingGovernorates}
                      className={`w-full h-10 px-3 py-2 text-sm rounded-md border bg-background appearance-none cursor-pointer
                        ${errors.governorateId ? 'border-destructive' : 'border-input'}
                        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                        disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <option value="">
                        {loadingGovernorates
                          ? locale === 'ar'
                            ? 'جاري التحميل...'
                            : 'Loading...'
                          : locale === 'ar'
                            ? 'اختر المحافظة'
                            : 'Select governorate'}
                      </option>
                      {governorates.map((gov) => (
                        <option key={gov.id} value={gov.id}>
                          {locale === 'ar' ? gov.name_ar : gov.name_en}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none`}
                    />
                  </div>
                  {errors.governorateId && (
                    <p className="text-sm text-destructive">
                      {locale === 'ar' ? 'يرجى اختيار المحافظة' : errors.governorateId.message}
                    </p>
                  )}
                </div>

                {/* City Selection - Shows after governorate is selected */}
                {governorateId && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      {locale === 'ar' ? 'المدينة' : 'City'}
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {locale === 'ar' ? 'غير قابل للتغيير' : 'Cannot be changed'}
                      </span>
                    </Label>
                    <div className="relative">
                      <select
                        value={cityId}
                        onChange={(e) => setValue('cityId', e.target.value)}
                        disabled={isLoading || loadingCities}
                        className={`w-full h-10 px-3 py-2 text-sm rounded-md border bg-background appearance-none cursor-pointer border-input
                          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                          disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <option value="">
                          {loadingCities
                            ? locale === 'ar'
                              ? 'جاري التحميل...'
                              : 'Loading...'
                            : locale === 'ar'
                              ? 'اختر المدينة'
                              : 'Select city'}
                        </option>
                        {cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {locale === 'ar' ? city.name_ar : city.name_en}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none`}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    {t('businessCategory')}
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      {locale === 'ar' ? 'غير قابل للتغيير' : 'Cannot be changed'}
                    </span>
                  </Label>
                  <Select
                    value={businessCategory}
                    onValueChange={(value) => setValue('businessCategory', value)}
                    disabled={isLoading || loadingCategories}
                  >
                    <SelectTrigger className={errors.businessCategory ? 'border-destructive' : ''}>
                      <SelectValue
                        placeholder={
                          loadingCategories
                            ? locale === 'ar'
                              ? 'جاري التحميل...'
                              : 'Loading...'
                            : t('businessCategoryPlaceholder')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {businessCategories.map((category) => {
                        const Icon = categoryIconMap[category.code] || Store;
                        return (
                          <SelectItem key={category.code} value={category.code}>
                            <div className="flex items-center gap-2">
                              {category.icon ? (
                                <span className="text-base">{category.icon}</span>
                              ) : (
                                <Icon className="w-4 h-4" />
                              )}
                              <span>{locale === 'ar' ? category.name_ar : category.name_en}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {errors.businessCategory && (
                    <p className="text-sm text-destructive">{errors.businessCategory.message}</p>
                  )}
                </div>

                {/* Store Name */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-primary" />
                    {locale === 'ar' ? 'اسم المتجر' : 'Store Name'}
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      {locale === 'ar' ? 'غير قابل للتغيير' : 'Cannot be changed'}
                    </span>
                  </Label>
                  <Input
                    placeholder={locale === 'ar' ? 'أدخل اسم متجرك' : 'Enter your store name'}
                    {...register('storeName')}
                    disabled={isLoading}
                    className={errors.storeName ? 'border-destructive' : ''}
                  />
                  {errors.storeName && (
                    <p className="text-sm text-destructive">
                      {locale === 'ar'
                        ? 'اسم المتجر مطلوب (حرفين على الأقل)'
                        : errors.storeName.message}
                    </p>
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
                        const Icon = role.icon;
                        return (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <span>{locale === 'ar' ? role.labelAr : role.labelEn}</span>
                            </div>
                          </SelectItem>
                        );
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
                    <p className="text-sm text-blue-800">{t('completeProfileLater')}</p>
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
                    {isRTL ? (
                      <ArrowRight className="w-4 h-4 me-2" />
                    ) : (
                      <ArrowLeft className="w-4 h-4 me-2" />
                    )}
                    {t('prevStep')}
                  </Button>
                  <Button type="submit" className="flex-1 py-3" disabled={isLoading}>
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
            <Link href={`/${locale}/auth/signup`} className="text-primary hover:underline">
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
  );
}
