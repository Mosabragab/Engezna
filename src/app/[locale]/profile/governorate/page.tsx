'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MapPinned, Loader2, Check, User } from 'lucide-react'
import { useGuestLocation, type GuestLocation } from '@/lib/hooks/useGuestLocation'

type Governorate = {
  id: string
  name_ar: string
  name_en: string
}

type City = {
  id: string
  governorate_id: string
  name_ar: string
  name_en: string
}

export default function GovernoratePage() {
  const locale = useLocale()
  const t = useTranslations('settings.governorate')
  const router = useRouter()

  // Guest location hook
  const { location: guestLocation, setLocation: setGuestLocation, isLoaded: guestLocationLoaded } = useGuestLocation()

  const [userId, setUserId] = useState<string | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])

  const [governorateId, setGovernorateId] = useState('')
  const [cityId, setCityId] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [guestLocationLoaded])

  useEffect(() => {
    if (governorateId) {
      loadCities(governorateId)
    } else {
      setCities([])
      setCityId('')
    }
  }, [governorateId])

  async function checkAuthAndLoadData() {
    if (!guestLocationLoaded) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Logged in user
      setUserId(user.id)
      setIsGuest(false)
      await loadGovernorates()
      await loadCurrentSelection(user.id)
    } else {
      // Guest user - allow browsing without login
      setIsGuest(true)
      await loadGovernorates()

      // Load from localStorage
      if (guestLocation.governorateId) {
        setGovernorateId(guestLocation.governorateId)
        if (guestLocation.cityId) {
          setCityId(guestLocation.cityId)
        }
      }
      setLoading(false)
    }

    setAuthLoading(false)
  }

  async function loadGovernorates() {
    const supabase = createClient()
    const { data } = await supabase
      .from('governorates')
      .select('*')
      .eq('is_active', true)
      .order('name_ar')

    if (data) {
      setGovernorates(data)
    }
  }

  async function loadCities(govId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('cities')
      .select('*')
      .eq('governorate_id', govId)
      .eq('is_active', true)
      .order('name_ar')

    if (data) {
      setCities(data)
    }
  }

  async function loadCurrentSelection(uid: string) {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('governorate_id, city_id')
      .eq('id', uid)
      .single()

    if (!error && data) {
      if (data.governorate_id) {
        setGovernorateId(data.governorate_id)
      }
      if (data.city_id) {
        setCityId(data.city_id)
      }
    }

    setLoading(false)
  }

  async function handleSave() {
    if (!governorateId) {
      setMessage({ type: 'error', text: locale === 'ar' ? 'يرجى اختيار المحافظة' : 'Please select a governorate' })
      return
    }

    setSaving(true)
    setMessage(null)

    // Get names for display
    const selectedGov = governorates.find(g => g.id === governorateId)
    const selectedCity = cities.find(c => c.id === cityId)

    if (isGuest) {
      // Save to localStorage for guests
      const newLocation: GuestLocation = {
        governorateId,
        governorateName: selectedGov ? { ar: selectedGov.name_ar, en: selectedGov.name_en } : null,
        cityId: cityId || null,
        cityName: selectedCity ? { ar: selectedCity.name_ar, en: selectedCity.name_en } : null,
      }
      setGuestLocation(newLocation)
      setMessage({ type: 'success', text: locale === 'ar' ? 'تم حفظ الموقع' : 'Location saved' })

      // Redirect to home after short delay
      setTimeout(() => {
        router.push(`/${locale}`)
      }, 1000)
    } else if (userId) {
      // Save to profile for logged-in users
      const supabase = createClient()

      const { error } = await supabase
        .from('profiles')
        .update({
          governorate_id: governorateId,
          city_id: cityId || null,
          district_id: null, // DEPRECATED - always null
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        console.error('Error saving location:', error)
        setMessage({
          type: 'error',
          text: locale === 'ar'
            ? `حدث خطأ: ${error.message}`
            : `Error: ${error.message}`
        })
      } else {
        setMessage({ type: 'success', text: t('saved') })
        setTimeout(() => setMessage(null), 3000)
      }
    }

    setSaving(false)
  }

  if (authLoading) {
    return (
      <CustomerLayout headerTitle={t('title')} showBottomNav={true}>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    )
  }

  return (
    <CustomerLayout headerTitle={t('title')} showBottomNav={true}>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {locale === 'ar' ? 'المحافظة والمدينة' : 'Governorate & City'}
        </h1>
        <p className="text-muted-foreground mb-6">
          {locale === 'ar' ? 'اختر موقعك لعرض الخدمات المتاحة' : 'Select your location to see available services'}
        </p>

        {/* Guest Mode Notice */}
        {isGuest && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <User className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">
                {locale === 'ar' ? 'أنت تتصفح كزائر' : "You're browsing as a guest"}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {locale === 'ar'
                  ? 'يمكنك تصفح المتاجر بدون تسجيل. سجّل دخولك عند الطلب.'
                  : 'You can browse stores without signing in. Sign in when you want to order.'}
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Governorate */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPinned className="w-4 h-4 text-muted-foreground" />
                    {locale === 'ar' ? 'المحافظة' : 'Governorate'}
                  </Label>
                  <Select value={governorateId} onValueChange={setGovernorateId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={locale === 'ar' ? 'اختر المحافظة' : 'Select governorate'} />
                    </SelectTrigger>
                    <SelectContent>
                      {governorates.map((gov) => (
                        <SelectItem key={gov.id} value={gov.id}>
                          {locale === 'ar' ? gov.name_ar : gov.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                {governorateId && cities.length > 0 && (
                  <div className="space-y-2">
                    <Label>{locale === 'ar' ? 'المدينة/المركز' : 'City/Center'}</Label>
                    <Select value={cityId} onValueChange={setCityId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={locale === 'ar' ? 'اختر المدينة' : 'Select city'} />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id}>
                            {locale === 'ar' ? city.name_ar : city.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !governorateId}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                      </>
                    ) : (
                      locale === 'ar' ? 'حفظ الموقع' : 'Save Location'
                    )}
                  </Button>
                </div>

                {/* Message */}
                {message && (
                  <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} p-3 rounded-lg`}>
                    {message.type === 'success' && <Check className="w-4 h-4" />}
                    <span>{message.text}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </CustomerLayout>
  )
}
