'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import {
  Store,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Image as ImageIcon,
  Loader2
} from 'lucide-react'

// Types
interface Governorate {
  id: string
  name_ar: string
  name_en: string
}

interface City {
  id: string
  governorate_id: string
  name_ar: string
  name_en: string
}

interface Provider {
  id: string
  name_ar: string
  name_en: string
  phone: string
  address_ar: string
  address_en: string | null
  logo_url: string | null
  delivery_fee: number
  estimated_delivery_time_min: number | null
  min_order_amount: number | null
  delivery_radius_km: number | null
  status: string
  category: string
}

// Form validation schema
const completeProfileSchema = z.object({
  storeNameAr: z.string().min(2, 'Store name must be at least 2 characters'),
  storeNameEn: z.string().min(2, 'Store name must be at least 2 characters'),
  storePhone: z.string().regex(/^01[0-2,5]{1}[0-9]{8}$/, 'Please enter a valid Egyptian phone number'),
  governorateId: z.string().min(1, 'Please select a governorate'),
  cityId: z.string().min(1, 'Please select a city'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  deliveryFee: z.number().min(0, 'Delivery fee must be 0 or more'),
  estimatedDeliveryTime: z.number().min(5, 'Delivery time must be at least 5 minutes'),
  minOrderAmount: z.number().min(0, 'Minimum order must be 0 or more'),
  deliveryRadius: z.number().min(1, 'Delivery radius must be at least 1 km'),
})

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>

export default function CompleteProfilePage() {
  const t = useTranslations('partner.completeProfile')
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [filteredCities, setFilteredCities] = useState<City[]>([])

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      deliveryFee: 10,
      estimatedDeliveryTime: 30,
      minOrderAmount: 50,
      deliveryRadius: 5,
    }
  })

  const governorateId = watch('governorateId')

  // Load provider data and governorates
  useEffect(() => {
    loadData()
  }, [])

  // Filter cities when governorate changes
  useEffect(() => {
    if (governorateId) {
      const filtered = cities.filter(city => city.governorate_id === governorateId)
      setFilteredCities(filtered)
      setValue('cityId', '') // Reset city selection
    }
  }, [governorateId, cities, setValue])

  async function loadData() {
    const supabase = createClient()

    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/${locale}/auth/login`)
        return
      }

      // Load provider data
      const { data: providersData, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)

      const providerData = providersData?.[0]
      if (providerError || !providerData) {
        setError('Provider not found. Please register first.')
        setIsLoading(false)
        return
      }

      // Check if already approved or pending_approval
      if (providerData.status === 'approved' || providerData.status === 'pending_approval') {
        router.push(`/${locale}/provider`)
        return
      }

      setProvider(providerData)

      // Pre-fill form if data exists
      if (providerData.name_ar) setValue('storeNameAr', providerData.name_ar)
      if (providerData.name_en) setValue('storeNameEn', providerData.name_en)
      if (providerData.phone) setValue('storePhone', providerData.phone)
      if (providerData.address_ar) setValue('address', providerData.address_ar)
      if (providerData.delivery_fee) setValue('deliveryFee', providerData.delivery_fee)
      if (providerData.estimated_delivery_time_min) setValue('estimatedDeliveryTime', providerData.estimated_delivery_time_min)
      if (providerData.min_order_amount) setValue('minOrderAmount', providerData.min_order_amount)
      if (providerData.delivery_radius_km) setValue('deliveryRadius', providerData.delivery_radius_km)
      if (providerData.logo_url) {
        setLogoUrl(providerData.logo_url)
        setLogoPreview(providerData.logo_url)
      }

      // Load governorates
      const { data: govData } = await supabase
        .from('governorates')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (govData) setGovernorates(govData)

      // Load all cities
      const { data: cityData } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (cityData) setCities(cityData)

    } catch (err) {
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB')
        return
      }

      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
      setError(null)
    }
  }

  // Upload logo to Supabase Storage
  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !provider) return logoUrl

    setLogoUploading(true)
    const supabase = createClient()

    try {
      // Generate unique filename
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${provider.id}-${Date.now()}.${fileExt}`
      const filePath = `provider-logos/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        // If bucket doesn't exist, try creating it or use a fallback
        setError('Failed to upload logo. Please try again.')
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      setLogoUrl(publicUrl)
      return publicUrl

    } catch (err) {
      console.error('Logo upload error:', err)
      setError('Failed to upload logo')
      return null
    } finally {
      setLogoUploading(false)
    }
  }

  const onSubmit = async (data: CompleteProfileFormData) => {
    // Validate logo
    if (!logoUrl && !logoFile) {
      setError(locale === 'ar' ? 'الشعار إجباري' : 'Logo is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Upload logo if new file selected
      let finalLogoUrl = logoUrl
      if (logoFile) {
        finalLogoUrl = await uploadLogo()
        if (!finalLogoUrl) {
          setIsSaving(false)
          return
        }
      }

      const supabase = createClient()

      // Update provider record
      const { error: updateError } = await supabase
        .from('providers')
        .update({
          name_ar: data.storeNameAr,
          name_en: data.storeNameEn,
          phone: data.storePhone,
          address_ar: data.address,
          address_en: data.address, // Use same address for now
          logo_url: finalLogoUrl,
          delivery_fee: data.deliveryFee,
          estimated_delivery_time_min: data.estimatedDeliveryTime,
          min_order_amount: data.minOrderAmount,
          delivery_radius_km: data.deliveryRadius,
          status: 'pending_approval', // Change status to pending approval
          updated_at: new Date().toISOString(),
        })
        .eq('id', provider?.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess(true)

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push(`/${locale}/provider`)
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate progress
  const calculateProgress = () => {
    let completed = 0
    const total = 10

    if (watch('storeNameAr')) completed++
    if (watch('storeNameEn')) completed++
    if (watch('storePhone')) completed++
    if (watch('governorateId')) completed++
    if (watch('cityId')) completed++
    if (watch('address')) completed++
    if (logoUrl || logoFile) completed++
    if (watch('deliveryFee') >= 0) completed++
    if (watch('estimatedDeliveryTime') > 0) completed++
    if (watch('minOrderAmount') >= 0) completed++

    return Math.round((completed / total) * 100)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
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
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">{t('successTitle')}</h2>
              <p className="text-muted-foreground">{t('successMessage')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link href={`/${locale}/provider`} className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
          {locale === 'ar' ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
        </Link>

        <Card>
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

            {/* Progress Bar */}
            <div className="pt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t('progress')}</span>
                <span className="font-medium">{calculateProgress()}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${calculateProgress()}%` }}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Store Information Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">{t('step3Title')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeNameAr">{t('storeNameAr')}</Label>
                    <Input
                      id="storeNameAr"
                      placeholder={t('storeNameArPlaceholder')}
                      {...register('storeNameAr')}
                      disabled={isSaving}
                      className={errors.storeNameAr ? 'border-destructive' : ''}
                    />
                    {errors.storeNameAr && (
                      <p className="text-sm text-destructive">{errors.storeNameAr.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storeNameEn">{t('storeNameEn')}</Label>
                    <Input
                      id="storeNameEn"
                      placeholder={t('storeNameEnPlaceholder')}
                      {...register('storeNameEn')}
                      disabled={isSaving}
                      className={errors.storeNameEn ? 'border-destructive' : ''}
                      dir="ltr"
                    />
                    {errors.storeNameEn && (
                      <p className="text-sm text-destructive">{errors.storeNameEn.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storePhone">{t('storePhone')}</Label>
                  <Input
                    id="storePhone"
                    type="tel"
                    placeholder={t('storePhonePlaceholder')}
                    {...register('storePhone')}
                    disabled={isSaving}
                    className={errors.storePhone ? 'border-destructive' : ''}
                    dir="ltr"
                  />
                  {errors.storePhone && (
                    <p className="text-sm text-destructive">{errors.storePhone.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('governorate')}</Label>
                    <Select
                      value={governorateId}
                      onValueChange={(value) => setValue('governorateId', value)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className={errors.governorateId ? 'border-destructive' : ''}>
                        <SelectValue placeholder={t('governoratePlaceholder')} />
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
                      <p className="text-sm text-destructive">{errors.governorateId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t('city')}</Label>
                    <Select
                      value={watch('cityId')}
                      onValueChange={(value) => setValue('cityId', value)}
                      disabled={isSaving || !governorateId}
                    >
                      <SelectTrigger className={errors.cityId ? 'border-destructive' : ''}>
                        <SelectValue placeholder={t('cityPlaceholder')} />
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
                      <p className="text-sm text-destructive">{errors.cityId.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">{t('address')}</Label>
                  <Input
                    id="address"
                    placeholder={t('addressPlaceholder')}
                    {...register('address')}
                    disabled={isSaving}
                    className={errors.address ? 'border-destructive' : ''}
                  />
                  {errors.address && (
                    <p className="text-sm text-destructive">{errors.address.message}</p>
                  )}
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>
                    {t('logo')} <span className="text-destructive">{t('logoRequired')}</span>
                  </Label>
                  <div
                    className={`
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                      transition-colors hover:border-primary
                      ${logoPreview ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                    `}
                    onClick={() => document.getElementById('logo-input')?.click()}
                  >
                    <input
                      id="logo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                      disabled={isSaving || logoUploading}
                    />

                    {logoPreview ? (
                      <div className="space-y-3">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-24 h-24 object-cover rounded-xl mx-auto"
                        />
                        <p className="text-sm text-muted-foreground">
                          {locale === 'ar' ? 'انقر لتغيير الصورة' : 'Click to change image'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                          {logoUploading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          ) : (
                            <Upload className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('logoUpload')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG (max 2MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery Settings Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">{t('step4Title')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">{t('deliveryFee')}</Label>
                    <Input
                      id="deliveryFee"
                      type="number"
                      placeholder={t('deliveryFeePlaceholder')}
                      {...register('deliveryFee', { valueAsNumber: true })}
                      disabled={isSaving}
                      className={errors.deliveryFee ? 'border-destructive' : ''}
                      dir="ltr"
                    />
                    {errors.deliveryFee && (
                      <p className="text-sm text-destructive">{errors.deliveryFee.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedDeliveryTime">{t('estimatedDeliveryTime')}</Label>
                    <Input
                      id="estimatedDeliveryTime"
                      type="number"
                      placeholder={t('estimatedDeliveryTimePlaceholder')}
                      {...register('estimatedDeliveryTime', { valueAsNumber: true })}
                      disabled={isSaving}
                      className={errors.estimatedDeliveryTime ? 'border-destructive' : ''}
                      dir="ltr"
                    />
                    {errors.estimatedDeliveryTime && (
                      <p className="text-sm text-destructive">{errors.estimatedDeliveryTime.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minOrderAmount">{t('minOrderAmount')}</Label>
                    <Input
                      id="minOrderAmount"
                      type="number"
                      placeholder={t('minOrderAmountPlaceholder')}
                      {...register('minOrderAmount', { valueAsNumber: true })}
                      disabled={isSaving}
                      className={errors.minOrderAmount ? 'border-destructive' : ''}
                      dir="ltr"
                    />
                    {errors.minOrderAmount && (
                      <p className="text-sm text-destructive">{errors.minOrderAmount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryRadius">{t('deliveryRadius')}</Label>
                    <Input
                      id="deliveryRadius"
                      type="number"
                      placeholder={t('deliveryRadiusPlaceholder')}
                      {...register('deliveryRadius', { valueAsNumber: true })}
                      disabled={isSaving}
                      className={errors.deliveryRadius ? 'border-destructive' : ''}
                      dir="ltr"
                    />
                    {errors.deliveryRadius && (
                      <p className="text-sm text-destructive">{errors.deliveryRadius.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSaving || logoUploading}
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  t('submitButton')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
