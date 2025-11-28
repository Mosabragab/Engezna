'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Save,
  RefreshCw,
  Calendar,
  Sun,
  Moon,
  Copy,
  Check,
} from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type DayHours = {
  open: string
  close: string
  is_open: boolean
}

type BusinessHours = {
  saturday: DayHours
  sunday: DayHours
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
}

const DAYS = [
  { key: 'saturday', label_ar: 'السبت', label_en: 'Saturday' },
  { key: 'sunday', label_ar: 'الأحد', label_en: 'Sunday' },
  { key: 'monday', label_ar: 'الاثنين', label_en: 'Monday' },
  { key: 'tuesday', label_ar: 'الثلاثاء', label_en: 'Tuesday' },
  { key: 'wednesday', label_ar: 'الأربعاء', label_en: 'Wednesday' },
  { key: 'thursday', label_ar: 'الخميس', label_en: 'Thursday' },
  { key: 'friday', label_ar: 'الجمعة', label_en: 'Friday' },
]

const DEFAULT_HOURS: BusinessHours = {
  saturday: { open: '09:00', close: '23:00', is_open: true },
  sunday: { open: '09:00', close: '23:00', is_open: true },
  monday: { open: '09:00', close: '23:00', is_open: true },
  tuesday: { open: '09:00', close: '23:00', is_open: true },
  wednesday: { open: '09:00', close: '23:00', is_open: true },
  thursday: { open: '09:00', close: '23:00', is_open: true },
  friday: { open: '09:00', close: '23:00', is_open: true },
}

// Time options for dropdown
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${minute}`
})

export default function StoreHoursPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [providerId, setProviderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS)
  const [copySource, setCopySource] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoadHours()
  }, [])

  const checkAuthAndLoadHours = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/store-hours`)
      return
    }

    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status, business_hours')
      .eq('owner_id', user.id)
      .limit(1)

    const provider = providerData?.[0]
    if (!provider || !['approved', 'open', 'closed', 'temporarily_paused'].includes(provider.status)) {
      router.push(`/${locale}/provider`)
      return
    }

    setProviderId(provider.id)

    // Load existing hours or use defaults
    if (provider.business_hours) {
      setBusinessHours({ ...DEFAULT_HOURS, ...provider.business_hours })
    }

    setLoading(false)
  }

  const handleToggleDay = (day: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof BusinessHours],
        is_open: !prev[day as keyof BusinessHours].is_open
      }
    }))
    setSaved(false)
  }

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day as keyof BusinessHours],
        [field]: value
      }
    }))
    setSaved(false)
  }

  const handleCopyToAll = (sourceDay: string) => {
    const sourceHours = businessHours[sourceDay as keyof BusinessHours]
    const newHours: BusinessHours = { ...businessHours }

    DAYS.forEach(day => {
      if (day.key !== sourceDay) {
        newHours[day.key as keyof BusinessHours] = { ...sourceHours }
      }
    })

    setBusinessHours(newHours)
    setCopySource(sourceDay)
    setTimeout(() => setCopySource(null), 2000)
    setSaved(false)
  }

  const handleSetAllOpen = () => {
    setBusinessHours(prev => {
      const newHours: BusinessHours = {} as BusinessHours
      DAYS.forEach(day => {
        newHours[day.key as keyof BusinessHours] = {
          ...prev[day.key as keyof BusinessHours],
          is_open: true
        }
      })
      return newHours
    })
    setSaved(false)
  }

  const handleSetAllClosed = () => {
    setBusinessHours(prev => {
      const newHours: BusinessHours = {} as BusinessHours
      DAYS.forEach(day => {
        newHours[day.key as keyof BusinessHours] = {
          ...prev[day.key as keyof BusinessHours],
          is_open: false
        }
      })
      return newHours
    })
    setSaved(false)
  }

  const handleSave = async () => {
    if (!providerId) return

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('providers')
      .update({
        business_hours: businessHours,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)

    if (error) {
      console.error('Error saving hours:', error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    if (locale === 'ar') {
      const period = hour >= 12 ? 'م' : 'ص'
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      return `${displayHour}:${minutes} ${period}`
    }
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${period}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/provider`}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
            </Link>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {locale === 'ar' ? 'ساعات العمل' : 'Store Hours'}
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Quick Actions */}
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetAllOpen}
                  className="border-[hsl(158_100%_38%/0.5)] text-deal hover:bg-[hsl(158_100%_38%/0.2)]"
                >
                  <Sun className="w-4 h-4 me-2" />
                  {locale === 'ar' ? 'فتح كل الأيام' : 'Open All Days'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetAllClosed}
                  className="border-[hsl(358_100%_68%/0.5)] text-error hover:bg-[hsl(358_100%_68%/0.2)]"
                >
                  <Moon className="w-4 h-4 me-2" />
                  {locale === 'ar' ? 'إغلاق كل الأيام' : 'Close All Days'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Days List */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {locale === 'ar' ? 'جدول العمل الأسبوعي' : 'Weekly Schedule'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {DAYS.map((day) => {
                const hours = businessHours[day.key as keyof BusinessHours]
                const isCopied = copySource === day.key

                return (
                  <div
                    key={day.key}
                    className={`p-4 rounded-lg border transition-colors ${
                      hours.is_open
                        ? 'bg-slate-50 border-slate-300'
                        : 'bg-white/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">
                          {locale === 'ar' ? day.label_ar : day.label_en}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          hours.is_open
                            ? 'bg-[hsl(158_100%_38%/0.2)] text-deal'
                            : 'bg-[hsl(358_100%_68%/0.2)] text-error'
                        }`}>
                          {hours.is_open
                            ? locale === 'ar' ? 'مفتوح' : 'Open'
                            : locale === 'ar' ? 'مغلق' : 'Closed'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyToAll(day.key)}
                          className="text-slate-400 hover:text-primary text-xs flex items-center gap-1"
                          title={locale === 'ar' ? 'نسخ لكل الأيام' : 'Copy to all days'}
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-deal" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleToggleDay(day.key)}
                          dir="ltr"
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            hours.is_open ? 'bg-primary' : 'bg-slate-400'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 shadow ${
                            hours.is_open ? 'left-[1.375rem]' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                    </div>

                    {hours.is_open && (
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="block text-xs text-slate-400 mb-1">
                            {locale === 'ar' ? 'من' : 'From'}
                          </label>
                          <select
                            value={hours.open}
                            onChange={(e) => handleTimeChange(day.key, 'open', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            {TIME_OPTIONS.map(time => (
                              <option key={`${day.key}-open-${time}`} value={time}>
                                {formatTimeDisplay(time)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="pt-5">
                          <span className="text-slate-500">—</span>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-slate-500 mb-1">
                            {locale === 'ar' ? 'إلى' : 'To'}
                          </label>
                          <select
                            value={hours.close}
                            onChange={(e) => handleTimeChange(day.key, 'close', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            {TIME_OPTIONS.map(time => (
                              <option key={`${day.key}-close-${time}`} value={time}>
                                {formatTimeDisplay(time)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 text-sm">
                {locale === 'ar' ? 'ملخص ساعات العمل' : 'Hours Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[hsl(158_100%_38%/0.1)] rounded-lg">
                  <p className="text-2xl font-bold text-deal">
                    {DAYS.filter(d => businessHours[d.key as keyof BusinessHours].is_open).length}
                  </p>
                  <p className="text-xs text-slate-500">
                    {locale === 'ar' ? 'أيام مفتوحة' : 'Open Days'}
                  </p>
                </div>
                <div className="text-center p-3 bg-[hsl(358_100%_68%/0.1)] rounded-lg">
                  <p className="text-2xl font-bold text-error">
                    {DAYS.filter(d => !businessHours[d.key as keyof BusinessHours].is_open).length}
                  </p>
                  <p className="text-xs text-slate-500">
                    {locale === 'ar' ? 'أيام مغلقة' : 'Closed Days'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 me-2 animate-spin" />
                {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : saved ? (
              <>
                <Check className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'تم الحفظ!' : 'Saved!'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
