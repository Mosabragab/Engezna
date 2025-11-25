'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/shared/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Home,
  Building,
  Check,
  Loader2,
} from 'lucide-react'

type Profile = {
  id: string
  email: string | null
  phone: string | null
  full_name: string
  avatar_url: string | null
}

type Address = {
  id: string
  user_id: string
  label: string | null
  address_line1: string
  address_line2: string | null
  city: string | null
  area: string | null
  building: string | null
  floor: string | null
  apartment: string | null
  landmark: string | null
  phone: string | null
  delivery_instructions: string | null
  is_default: boolean
  is_active: boolean
}

export default function ProfilePage() {
  const locale = useLocale()
  const t = useTranslations('profile')
  const router = useRouter()
  // Auth state
  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressesLoading, setAddressesLoading] = useState(true)

  // Address modal state
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [addressForm, setAddressForm] = useState({
    label: '',
    address_line1: '',
    address_line2: '',
    city: 'بني سويف',
    area: '',
    building: '',
    floor: '',
    apartment: '',
    landmark: '',
    phone: '',
    delivery_instructions: '',
    is_default: false,
  })
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressMessage, setAddressMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load profile data
  const loadProfile = useCallback(async (uid: string) => {
    const supabase = createClient()

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single()

    if (data) {
      setProfile(data)
      setFullName(data.full_name || '')
      setPhone(data.phone || '')
    }
  }, [])

  // Load addresses data
  const loadAddresses = useCallback(async (uid: string) => {
    setAddressesLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', uid)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (data) {
      setAddresses(data)
    }
    setAddressesLoading(false)
  }, [])

  // Check auth and load data
  useEffect(() => {
    async function checkAuthAndLoadData() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push(`/${locale}/auth/login?redirect=/profile`)
        return
      }

      setUserId(user.id)
      setAuthLoading(false)

      // Load profile
      await loadProfile(user.id)

      // Load addresses
      await loadAddresses(user.id)
    }

    checkAuthAndLoadData()
  }, [locale, router, loadProfile, loadAddresses])

  async function handleSaveProfile() {
    if (!userId) return

    setProfileSaving(true)
    setProfileMessage(null)

    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone || null,
      })
      .eq('id', userId)

    if (error) {
      setProfileMessage({ type: 'error', text: t('personalInfo.error') })
    } else {
      setProfileMessage({ type: 'success', text: t('personalInfo.saved') })
      // Clear message after 3 seconds
      setTimeout(() => setProfileMessage(null), 3000)
    }

    setProfileSaving(false)
  }

  function openAddressModal(address?: Address) {
    if (address) {
      setEditingAddress(address)
      setAddressForm({
        label: address.label || '',
        address_line1: address.address_line1 || '',
        address_line2: address.address_line2 || '',
        city: address.city || 'بني سويف',
        area: address.area || '',
        building: address.building || '',
        floor: address.floor || '',
        apartment: address.apartment || '',
        landmark: address.landmark || '',
        phone: address.phone || '',
        delivery_instructions: address.delivery_instructions || '',
        is_default: address.is_default || false,
      })
    } else {
      setEditingAddress(null)
      setAddressForm({
        label: '',
        address_line1: '',
        address_line2: '',
        city: 'بني سويف',
        area: '',
        building: '',
        floor: '',
        apartment: '',
        landmark: '',
        phone: '',
        delivery_instructions: '',
        is_default: addresses.length === 0, // First address is default
      })
    }
    setAddressMessage(null)
    setShowAddressModal(true)
  }

  async function handleSaveAddress() {
    if (!userId) return

    setAddressSaving(true)
    setAddressMessage(null)

    const supabase = createClient()

    // If setting as default, unset other defaults first
    if (addressForm.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
    }

    const addressData = {
      user_id: userId,
      label: addressForm.label || null,
      address_line1: addressForm.address_line1,
      address_line2: addressForm.address_line2 || null,
      city: addressForm.city || null,
      area: addressForm.area || null,
      building: addressForm.building || null,
      floor: addressForm.floor || null,
      apartment: addressForm.apartment || null,
      landmark: addressForm.landmark || null,
      phone: addressForm.phone || null,
      delivery_instructions: addressForm.delivery_instructions || null,
      is_default: addressForm.is_default,
      is_active: true,
    }

    let error

    if (editingAddress) {
      const result = await supabase
        .from('addresses')
        .update(addressData)
        .eq('id', editingAddress.id)
      error = result.error
    } else {
      const result = await supabase
        .from('addresses')
        .insert(addressData)
      error = result.error
    }

    if (error) {
      setAddressMessage({ type: 'error', text: t('addressForm.error') })
    } else {
      setAddressMessage({ type: 'success', text: t('addressForm.saved') })
      await loadAddresses(userId)
      setTimeout(() => {
        setShowAddressModal(false)
        setAddressMessage(null)
      }, 1000)
    }

    setAddressSaving(false)
  }

  async function handleDeleteAddress(addressId: string) {
    if (!userId) return

    if (!confirm(t('addresses.confirmDelete'))) return

    const supabase = createClient()

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('addresses')
      .update({ is_active: false })
      .eq('id', addressId)

    if (!error) {
      await loadAddresses(userId)
    }
  }

  async function handleSetDefaultAddress(addressId: string) {
    if (!userId) return

    const supabase = createClient()

    // Unset all defaults first
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId)

    // Set new default
    await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', addressId)

    await loadAddresses(userId)
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header showBack backHref={`/${locale}`} />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header showBack backHref={`/${locale}`} />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t('title')}
        </h1>

        {/* Personal Information Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {t('personalInfo.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                {t('personalInfo.email')}
              </Label>
              <Input
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">
                {t('personalInfo.fullName')}
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('personalInfo.fullNamePlaceholder')}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {t('personalInfo.phone')}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('personalInfo.phonePlaceholder')}
                dir="ltr"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveProfile}
                disabled={profileSaving}
              >
                {profileSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('personalInfo.saving')}
                  </>
                ) : (
                  t('personalInfo.saveButton')
                )}
              </Button>

              {profileMessage && (
                <span className={`text-sm ${profileMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {profileMessage.type === 'success' && <Check className="w-4 h-4 inline mr-1" />}
                  {profileMessage.text}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Addresses Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {t('addresses.title')}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAddressModal()}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('addresses.addNew')}
            </Button>
          </CardHeader>
          <CardContent>
            {addressesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">{t('addresses.noAddresses')}</p>
                <p className="text-sm text-muted-foreground">{t('addresses.addFirst')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`p-4 rounded-lg border ${
                      address.is_default
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Label and Default Badge */}
                        <div className="flex items-center gap-2 mb-1">
                          {address.label === 'المنزل' || address.label?.toLowerCase() === 'home' ? (
                            <Home className="w-4 h-4 text-primary" />
                          ) : address.label === 'العمل' || address.label?.toLowerCase() === 'work' ? (
                            <Building className="w-4 h-4 text-primary" />
                          ) : (
                            <MapPin className="w-4 h-4 text-primary" />
                          )}
                          <span className="font-medium">
                            {address.label || (locale === 'ar' ? 'عنوان' : 'Address')}
                          </span>
                          {address.is_default && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {t('addresses.default')}
                            </span>
                          )}
                        </div>

                        {/* Address Details */}
                        <p className="text-sm text-muted-foreground truncate">
                          {address.address_line1}
                          {address.area && `, ${address.area}`}
                          {address.city && `, ${address.city}`}
                        </p>

                        {/* Building/Floor/Apartment */}
                        {(address.building || address.floor || address.apartment) && (
                          <p className="text-xs text-muted-foreground">
                            {address.building && `${locale === 'ar' ? 'مبنى' : 'Building'} ${address.building}`}
                            {address.floor && ` - ${locale === 'ar' ? 'دور' : 'Floor'} ${address.floor}`}
                            {address.apartment && ` - ${locale === 'ar' ? 'شقة' : 'Apt'} ${address.apartment}`}
                          </p>
                        )}

                        {/* Phone */}
                        {address.phone && (
                          <p className="text-xs text-muted-foreground mt-1" dir="ltr">
                            {address.phone}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {!address.is_default && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultAddress(address.id)}
                            title={t('addresses.setDefault')}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAddressModal(address)}
                          title={t('addresses.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAddress(address.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          title={t('addresses.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Address Modal */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? t('addressForm.editTitle') : t('addressForm.addTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Label */}
            <div className="space-y-2">
              <Label htmlFor="addressLabel">{t('addressForm.label')}</Label>
              <Input
                id="addressLabel"
                value={addressForm.label}
                onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                placeholder={t('addressForm.labelPlaceholder')}
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">{t('addressForm.city')}</Label>
              <Input
                id="city"
                value={addressForm.city}
                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                placeholder={t('addressForm.cityPlaceholder')}
              />
            </div>

            {/* Area */}
            <div className="space-y-2">
              <Label htmlFor="area">{t('addressForm.area')}</Label>
              <Input
                id="area"
                value={addressForm.area}
                onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                placeholder={t('addressForm.areaPlaceholder')}
              />
            </div>

            {/* Address Line 1 */}
            <div className="space-y-2">
              <Label htmlFor="addressLine1">{t('addressForm.addressLine1')}</Label>
              <Input
                id="addressLine1"
                value={addressForm.address_line1}
                onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                placeholder={t('addressForm.addressLine1Placeholder')}
              />
            </div>

            {/* Building, Floor, Apartment - Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="building">{t('addressForm.building')}</Label>
                <Input
                  id="building"
                  value={addressForm.building}
                  onChange={(e) => setAddressForm({ ...addressForm, building: e.target.value })}
                  placeholder={t('addressForm.buildingPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">{t('addressForm.floor')}</Label>
                <Input
                  id="floor"
                  value={addressForm.floor}
                  onChange={(e) => setAddressForm({ ...addressForm, floor: e.target.value })}
                  placeholder={t('addressForm.floorPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apartment">{t('addressForm.apartment')}</Label>
                <Input
                  id="apartment"
                  value={addressForm.apartment}
                  onChange={(e) => setAddressForm({ ...addressForm, apartment: e.target.value })}
                  placeholder={t('addressForm.apartmentPlaceholder')}
                />
              </div>
            </div>

            {/* Landmark */}
            <div className="space-y-2">
              <Label htmlFor="landmark">{t('addressForm.landmark')}</Label>
              <Input
                id="landmark"
                value={addressForm.landmark}
                onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                placeholder={t('addressForm.landmarkPlaceholder')}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="addressPhone">{t('addressForm.phone')}</Label>
              <Input
                id="addressPhone"
                type="tel"
                value={addressForm.phone}
                onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                placeholder={t('addressForm.phonePlaceholder')}
                dir="ltr"
              />
            </div>

            {/* Delivery Instructions */}
            <div className="space-y-2">
              <Label htmlFor="deliveryInstructions">{t('addressForm.deliveryInstructions')}</Label>
              <Textarea
                id="deliveryInstructions"
                value={addressForm.delivery_instructions}
                onChange={(e) => setAddressForm({ ...addressForm, delivery_instructions: e.target.value })}
                placeholder={t('addressForm.deliveryInstructionsPlaceholder')}
                rows={2}
              />
            </div>

            {/* Is Default Switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault">{t('addressForm.isDefault')}</Label>
              <Switch
                id="isDefault"
                checked={addressForm.is_default}
                onCheckedChange={(checked) => setAddressForm({ ...addressForm, is_default: checked })}
              />
            </div>

            {/* Message */}
            {addressMessage && (
              <p className={`text-sm ${addressMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {addressMessage.type === 'success' && <Check className="w-4 h-4 inline mr-1" />}
                {addressMessage.text}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSaveAddress}
                disabled={addressSaving || !addressForm.address_line1}
                className="flex-1"
              >
                {addressSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t('addressForm.saving')}
                  </>
                ) : (
                  t('addressForm.saveButton')
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddressModal(false)}
              >
                {t('addressForm.cancel')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
