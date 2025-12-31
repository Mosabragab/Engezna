'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { CustomerLayout } from '@/components/customer/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Mail, Phone, Loader2, Check, Info, User, Trash2, AlertTriangle } from 'lucide-react'

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

  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const checkAuthAndLoadProfile = useCallback(async () => {
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
  }, [locale, router])

  useEffect(() => {
    checkAuthAndLoadProfile()
  }, [checkAuthAndLoadProfile])

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

  async function handleDeleteAccount() {
    if (deleteConfirmText !== (locale === 'ar' ? 'حذف' : 'DELETE')) {
      return
    }

    setDeleting(true)

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        setMessage({
          type: 'error',
          text: locale === 'ar' ? 'فشل حذف الحساب. حاول مرة أخرى.' : 'Failed to delete account. Please try again.'
        })
        setDeleting(false)
        return
      }

      // Sign out and redirect to home
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = `/${locale}`
    } catch (error) {
      setMessage({
        type: 'error',
        text: locale === 'ar' ? 'حدث خطأ. حاول مرة أخرى.' : 'An error occurred. Please try again.'
      })
      setDeleting(false)
    }
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
        <h1 className="text-2xl font-bold text-foreground mb-6">
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
              <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                message.type === 'success'
                  ? 'text-[#22C55E] bg-[#DCFCE7]'
                  : 'text-[#EF4444] bg-[#FEF2F2]'
              }`}>
                {message.type === 'success' && <Check className="w-4 h-4" />}
                <span>{message.text}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Account Section */}
        <Card className="border-red-200 bg-red-50/50 mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">
                  {locale === 'ar' ? 'حذف الحساب' : 'Delete Account'}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {locale === 'ar'
                    ? 'سيتم حذف جميع بياناتك بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.'
                    : 'All your data will be permanently deleted. This action cannot be undone.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-red-300 text-red-600 hover:bg-red-100"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {locale === 'ar' ? 'حذف حسابي' : 'Delete My Account'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {locale === 'ar' ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}
              </h3>
            </div>

            <div className="space-y-4">
              <p className="text-slate-600">
                {locale === 'ar'
                  ? 'هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف:'
                  : 'This action is permanent and cannot be undone. The following will be deleted:'}
              </p>

              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>{locale === 'ar' ? 'معلومات حسابك' : 'Your account information'}</li>
                <li>{locale === 'ar' ? 'عناوين التوصيل' : 'Delivery addresses'}</li>
                <li>{locale === 'ar' ? 'المفضلات' : 'Favorites'}</li>
                <li>{locale === 'ar' ? 'سجل الإشعارات' : 'Notification history'}</li>
              </ul>

              <div className="pt-2">
                <Label className="text-sm font-medium text-slate-700">
                  {locale === 'ar'
                    ? 'اكتب "حذف" للتأكيد:'
                    : 'Type "DELETE" to confirm:'}
                </Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={locale === 'ar' ? 'حذف' : 'DELETE'}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                  }}
                  disabled={deleting}
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== (locale === 'ar' ? 'حذف' : 'DELETE') || deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {locale === 'ar' ? 'جاري الحذف...' : 'Deleting...'}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {locale === 'ar' ? 'حذف نهائياً' : 'Delete Forever'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  )
}
