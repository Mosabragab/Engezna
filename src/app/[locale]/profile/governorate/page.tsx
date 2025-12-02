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
import { MapPinned, Loader2, Check } from 'lucide-react'

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

type District = {
  id: string
  city_id: string
  name_ar: string
  name_en: string
}

export default function GovernoratePage() {
  const locale = useLocale()
  const t = useTranslations('settings.governorate')
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])

  const [governorateId, setGovernorateId] = useState('')
  const [cityId, setCityId] = useState('')
  const [districtId, setDistrictId] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  useEffect(() => {
    if (governorateId) {
      loadCities(governorateId)
    } else {
      setCities([])
      setCityId('')
    }
    // Reset district when governorate changes
    setDistricts([])
    setDistrictId('')
  }, [governorateId])

  useEffect(() => {
    if (cityId) {
      loadDistricts(cityId)
    } else {
      setDistricts([])
      setDistrictId('')
    }
  }, [cityId])

  async function checkAuthAndLoadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/profile/governorate`)
      return
    }

    setUserId(user.id)
    setAuthLoading(false)

    await loadGovernorates()
    await loadCurrentSelection(user.id)
  }

  async function loadGovernorates() {
    const supabase = createClient()
    const { data } = await supabase
      .from('governorates')
      .select('*')
      .eq('is_active', true)
      .order('name_en')

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
      .order('name_en')

    if (data) {
      setCities(data)
    }
  }

  async function loadDistricts(cityId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('districts')
      .select('*')
      .eq('city_id', cityId)
      .eq('is_active', true)
      .order('name_en')

    if (data) {
      setDistricts(data)
    }
  }

  async function loadCurrentSelection(uid: string) {
    setLoading(true)
    const supabase = createClient()

    // Check if governorate_id column exists in profiles table
    // If it doesn't exist, this query will fail silently
    const { data, error } = await supabase
      .from('profiles')
      .select('governorate_id, city_id, district_id')
      .eq('id', uid)
      .single()

    if (!error && data) {
      if (data.governorate_id) {
        setGovernorateId(data.governorate_id)
      }
      if (data.city_id) {
        setCityId(data.city_id)
      }
      if (data.district_id) {
        setDistrictId(data.district_id)
      }
    }

    setLoading(false)
  }

  async function handleSave() {
    if (!userId) return

    if (!governorateId) {
      setMessage({ type: 'error', text: locale === 'ar' ? 'يرجى اختيار المحافظة' : 'Please select a governorate' })
      return
    }

    setSaving(true)
    setMessage(null)

    const supabase = createClient()

    // First, check if columns exist by attempting a select
    const { data: currentProfile, error: selectError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (selectError) {
      console.error('Error fetching profile:', selectError)
      setMessage({
        type: 'error',
        text: locale === 'ar' ? 'خطأ في جلب البيانات' : 'Error fetching profile'
      })
      setSaving(false)
      return
    }

    // Try to update with location data
    const { error } = await supabase
      .from('profiles')
      .update({
        governorate_id: governorateId,
        city_id: cityId || null,
        district_id: districtId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Error saving governorate:', error)
      // Provide more specific error messages
      if (error.code === '42703' || error.message.includes('column')) {
        setMessage({
          type: 'error',
          text: locale === 'ar'
            ? 'خطأ في قاعدة البيانات: الأعمدة المطلوبة غير موجودة'
            : 'Database error: Required columns do not exist'
        })
      } else if (error.code === '42501') {
        setMessage({
          type: 'error',
          text: locale === 'ar'
            ? 'ليس لديك صلاحية لتعديل هذه البيانات'
            : 'You do not have permission to update this data'
        })
      } else {
        setMessage({
          type: 'error',
          text: locale === 'ar'
            ? `حدث خطأ: ${error.message}`
            : `Error: ${error.message}`
        })
      }
    } else {
      setMessage({ type: 'success', text: t('saved') })
      setTimeout(() => setMessage(null), 3000)
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
          {t('title')}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t('description')}
        </p>

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
                    {t('governorate')}
                  </Label>
                  <Select value={governorateId} onValueChange={setGovernorateId}>
                    <SelectTrigger className="w-full">
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
                </div>

                {/* City */}
                {governorateId && cities.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t('city')}</Label>
                    <Select value={cityId} onValueChange={setCityId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('cityPlaceholder')} />
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

                {/* District */}
                {cityId && districts.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t('district')}</Label>
                    <Select value={districtId} onValueChange={setDistrictId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('districtPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district.id} value={district.id}>
                            {locale === 'ar' ? district.name_ar : district.name_en}
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
                        {t('saving')}
                      </>
                    ) : (
                      t('saveButton')
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
