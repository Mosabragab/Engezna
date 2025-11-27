'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/shared/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Mail, Phone, Loader2, Check, Info } from 'lucide-react'

type Profile = {
  id: string
  email: string | null
  phone: string | null
  full_name: string
}

export default function AccountPage() {
  const locale = useLocale()
  const t = useTranslations('settings.account')
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  // Split name fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    checkAuthAndLoadProfile()
  }, [])

  async function checkAuthAndLoadProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/profile/account`)
      return
    }

    setUserId(user.id)
    setAuthLoading(false)

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)

      // Split full_name into first and last
      const parts = (profileData.full_name || '').trim().split(' ')
      if (parts.length > 0) {
        setFirstName(parts[0])
        setLastName(parts.slice(1).join(' '))
      }

      setPhone(profileData.phone || '')
    }
  }

  async function handleSave() {
    if (!userId) return

    setSaving(true)
    setMessage(null)

    // Combine first + last name into full_name
    const full_name = `${firstName.trim()} ${lastName.trim()}`.trim()

    if (!full_name) {
      setMessage({ type: 'error', text: t('error') })
      setSaving(false)
      return
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name,
        phone: phone || null,
      })
      .eq('id', userId)

    if (error) {
      setMessage({ type: 'error', text: t('error') })
    } else {
      setMessage({ type: 'success', text: t('saved') })
      setTimeout(() => setMessage(null), 3000)
    }

    setSaving(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showBack backHref={`/${locale}/profile`} />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBack backHref={`/${locale}/profile`} backLabel={t('title')} />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t('title')}
        </h1>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                {t('email')}
              </Label>
              <Input
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{t('emailInfo')}</span>
              </div>
            </div>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">
                {t('firstName')}
              </Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('firstNamePlaceholder')}
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">
                {t('lastName')}
              </Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('lastNamePlaceholder')}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {t('phone')}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('phonePlaceholder')}
                dir="ltr"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
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
              <div className={`flex items-center gap-2 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message.type === 'success' && <Check className="w-4 h-4" />}
                <span>{message.text}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
