'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Loader2, Check, AlertCircle } from 'lucide-react'

type Profile = {
  id: string
  email: string | null
}

export default function EmailPage() {
  const locale = useLocale()
  const t = useTranslations('settings.email')
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoadProfile()
  }, [])

  useEffect(() => {
    // Clear validation error when inputs change
    setValidationError(null)
  }, [newEmail, confirmEmail, password])

  async function checkAuthAndLoadProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/profile/email`)
      return
    }

    setUserId(user.id)
    setAuthLoading(false)

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
    }
  }

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  async function handleUpdateEmail() {
    if (!userId) return

    // Validation
    if (!newEmail || !confirmEmail || !password) {
      setValidationError(t('error'))
      return
    }

    if (!validateEmail(newEmail)) {
      setValidationError(t('invalidEmail'))
      return
    }

    if (newEmail !== confirmEmail) {
      setValidationError(t('emailMismatch'))
      return
    }

    if (newEmail === profile?.email) {
      setValidationError(t('error'))
      return
    }

    setSaving(true)
    setMessage(null)
    setValidationError(null)

    const supabase = createClient()

    // Supabase requires re-authentication before email change
    // First verify the password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || '',
      password: password,
    })

    if (signInError) {
      setValidationError(t('error'))
      setSaving(false)
      return
    }

    // Update email using Supabase Auth
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    })

    if (error) {
      setMessage({ type: 'error', text: t('error') })
    } else {
      setMessage({ type: 'success', text: t('saved') })
      setNewEmail('')
      setConfirmEmail('')
      setPassword('')

      // Update profile table
      await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', userId)

      setTimeout(() => {
        setMessage(null)
      }, 5000)
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {t('title')}
        </h1>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Current Email (Read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                {t('currentEmail')}
              </Label>
              <Input
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
            </div>

            {/* New Email */}
            <div className="space-y-2">
              <Label htmlFor="newEmail">
                {t('newEmail')}
              </Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t('newEmailPlaceholder')}
                dir="ltr"
              />
            </div>

            {/* Confirm Email */}
            <div className="space-y-2">
              <Label htmlFor="confirmEmail">
                {t('confirmEmail')}
              </Label>
              <Input
                id="confirmEmail"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={t('confirmEmailPlaceholder')}
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                {t('password')}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
              />
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleUpdateEmail}
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

            {/* Success Message */}
            {message && message.type === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <Check className="w-4 h-4" />
                <span>{message.text}</span>
              </div>
            )}

            {/* Error Message */}
            {message && message.type === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{message.text}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </CustomerLayout>
  )
}
