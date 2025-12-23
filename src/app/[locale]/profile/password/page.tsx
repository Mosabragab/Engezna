'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, Loader2, Check, AlertCircle } from 'lucide-react'

type Profile = {
  id: string
  email: string | null
}

export default function PasswordPage() {
  const locale = useLocale()
  const t = useTranslations('settings.password')
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const checkAuthAndLoadProfile = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/profile/password`)
      return
    }

    setUserId(user.id)
    setAuthLoading(false)

    // Load profile for email
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
    }
  }, [locale, router])

  useEffect(() => {
    checkAuthAndLoadProfile()
  }, [checkAuthAndLoadProfile])

  useEffect(() => {
    // Clear validation error when inputs change
    setValidationError(null)
  }, [currentPassword, newPassword, confirmPassword])

  async function handleUpdatePassword() {
    if (!userId || !profile?.email) return

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setValidationError(t('error'))
      return
    }

    if (newPassword.length < 8) {
      setValidationError(t('passwordTooShort'))
      return
    }

    if (newPassword !== confirmPassword) {
      setValidationError(t('passwordMismatch'))
      return
    }

    setSaving(true)
    setMessage(null)
    setValidationError(null)

    const supabase = createClient()

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: currentPassword,
    })

    if (signInError) {
      setValidationError(t('wrongPassword'))
      setSaving(false)
      return
    }

    // Update password using Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setMessage({ type: 'error', text: t('error') })
    } else {
      setMessage({ type: 'success', text: t('saved') })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        setMessage(null)
      }, 3000)
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
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                {t('currentPassword')}
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('currentPasswordPlaceholder')}
              />
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">
                {t('newPassword')}
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('newPasswordPlaceholder')}
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t('confirmPassword')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmPasswordPlaceholder')}
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
                onClick={handleUpdatePassword}
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
