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
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MapPin, Plus, Loader2, Check, Trash2, Edit, Star, Navigation } from 'lucide-react'
import { LocationPicker } from '@/components/maps/LocationPicker'

type Address = {
  id: string
  label: string
  address_line1: string
  address_line2: string | null
  city: string
  area: string | null
  governorate_id: string | null
  city_id: string | null
  district_id: string | null // DEPRECATED - use GPS coordinates instead
  building: string | null
  floor: string | null
  apartment: string | null
  landmark: string | null
  phone: string | null
  delivery_instructions: string | null
  is_default: boolean
  latitude: number | null
  longitude: number | null
}

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

// District type removed - GPS coordinates are now used instead

export default function AddressesPage() {
  const locale = useLocale()
  const t = useTranslations('profile.addresses')
  const tForm = useTranslations('profile.addressForm')
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Cascading location data
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])

  // Form fields
  const [label, setLabel] = useState('')
  const [governorateId, setGovernorateId] = useState('')
  const [cityId, setCityId] = useState('')
  // GPS location
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [addressLine1, setAddressLine1] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [apartment, setApartment] = useState('')
  const [landmark, setLandmark] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  useEffect(() => {
    if (governorateId) {
      loadCities(governorateId)
    } else {
      setCities([])
    }
  }, [governorateId])

  async function checkAuthAndLoadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/profile/addresses`)
      return
    }

    setUserId(user.id)
    setAuthLoading(false)

    await loadAddresses(user.id)
    await loadGovernorates()
  }

  async function loadAddresses(uid: string) {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', uid)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setAddresses(data)
    }

    setLoading(false)
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

  function openAddDialog() {
    resetForm()
    setEditingAddress(null)
    setDialogOpen(true)
  }

  async function openEditDialog(address: Address) {
    setEditingAddress(address)
    setLabel(address.label)
    setAddressLine1(address.address_line1)
    setBuilding(address.building || '')
    setFloor(address.floor || '')
    setApartment(address.apartment || '')
    setLandmark(address.landmark || '')
    setPhone(address.phone || '')
    setDeliveryInstructions(address.delivery_instructions || '')
    setIsDefault(address.is_default)

    // Load GPS location if exists
    if (address.latitude && address.longitude) {
      setLocation({ lat: address.latitude, lng: address.longitude })
    } else {
      setLocation(null)
    }

    // Load cities for editing
    if (address.governorate_id) {
      setGovernorateId(address.governorate_id)
      await loadCities(address.governorate_id)

      if (address.city_id) {
        setCityId(address.city_id)
      }
    }

    setDialogOpen(true)
  }

  function resetForm() {
    setLabel('')
    setGovernorateId('')
    setCityId('')
    setLocation(null)
    setAddressLine1('')
    setBuilding('')
    setFloor('')
    setApartment('')
    setLandmark('')
    setPhone('')
    setDeliveryInstructions('')
    setIsDefault(false)
  }

  async function handleSaveAddress() {
    if (!userId) return

    if (!label || !addressLine1) {
      setMessage({ type: 'error', text: tForm('error') })
      return
    }

    setSaving(true)
    setMessage(null)

    const supabase = createClient()

    // Get city name from selected city
    const selectedCity = cities.find(c => c.id === cityId)
    const cityName = selectedCity ? (locale === 'ar' ? selectedCity.name_ar : selectedCity.name_en) : ''

    const addressData = {
      user_id: userId,
      label,
      address_line1: addressLine1,
      address_line2: null,
      city: cityName,
      area: null, // Districts deprecated - use GPS instead
      governorate_id: governorateId || null,
      city_id: cityId || null,
      district_id: null, // DEPRECATED - always null
      building: building || null,
      floor: floor || null,
      apartment: apartment || null,
      landmark: landmark || null,
      phone: phone || null,
      delivery_instructions: deliveryInstructions || null,
      is_default: isDefault,
      // GPS coordinates
      latitude: location?.lat || null,
      longitude: location?.lng || null,
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true)
    }

    let error
    if (editingAddress) {
      // Update existing
      const result = await supabase
        .from('addresses')
        .update(addressData)
        .eq('id', editingAddress.id)

      error = result.error
    } else {
      // Insert new
      const result = await supabase
        .from('addresses')
        .insert(addressData)

      error = result.error
    }

    if (error) {
      setMessage({ type: 'error', text: tForm('error') })
    } else {
      setMessage({ type: 'success', text: tForm('saved') })
      setDialogOpen(false)
      resetForm()
      if (userId) await loadAddresses(userId)
      setTimeout(() => setMessage(null), 3000)
    }

    setSaving(false)
  }

  async function handleDelete(addressId: string) {
    if (!userId || !confirm(t('confirmDelete'))) return

    const supabase = createClient()
    const { error } = await supabase
      .from('addresses')
      .update({ is_active: false })
      .eq('id', addressId)

    if (error) {
      setMessage({ type: 'error', text: t('deleteError') })
    } else {
      setMessage({ type: 'success', text: t('deleteSuccess') })
      await loadAddresses(userId)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  async function handleSetDefault(addressId: string) {
    if (!userId) return

    const supabase = createClient()

    // Unset all defaults
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true)

    // Set new default
    await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', addressId)

    await loadAddresses(userId)
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {t('title')}
          </h1>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addNew')}
          </Button>
        </div>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 p-4 mb-4 rounded-lg ${message.type === 'success' ? 'bg-[#DCFCE7] text-[#22C55E]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
            {message.type === 'success' && <Check className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Addresses List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : addresses.length === 0 ? (
          <Card className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('noAddresses')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('addFirst')}
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addNew')}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <Card key={address.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-gray-900">
                        {address.label}
                      </h3>
                      {address.is_default && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                          {t('default')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {address.address_line1}
                    </p>
                    {address.city && (
                      <p className="text-sm text-gray-600">
                        {address.area && `${address.area}, `}{address.city}
                      </p>
                    )}
                    {address.phone && (
                      <p className="text-sm text-gray-600 mt-1" dir="ltr">
                        {address.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!address.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                        title={t('setDefault')}
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(address)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? tForm('editTitle') : tForm('addTitle')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Label */}
              <div className="space-y-2">
                <Label htmlFor="label">{tForm('label')}</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={tForm('labelPlaceholder')}
                />
              </div>

              {/* Governorate */}
              <div className="space-y-2">
                <Label>{tForm('governorate')}</Label>
                <Select value={governorateId} onValueChange={(value) => {
                  setGovernorateId(value)
                  setCityId('')
                  setLocation(null) // Reset GPS location when governorate changes
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={tForm('governoratePlaceholder')} />
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
              {governorateId && (
                <div className="space-y-2">
                  <Label>{tForm('city')}</Label>
                  <Select value={cityId} onValueChange={setCityId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tForm('cityPlaceholder')} />
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

              {/* GPS Location Picker */}
              {cityId && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    {locale === 'ar' ? 'حدد موقعك على الخريطة' : 'Set your location on map'}
                  </Label>
                  <LocationPicker
                    value={location}
                    onChange={(coords, address) => {
                      setLocation(coords)
                      // Auto-fill address if empty
                      if (address && !addressLine1) {
                        setAddressLine1(address)
                      }
                    }}
                    placeholder={locale === 'ar' ? 'ابحث عن موقعك أو استخدم GPS' : 'Search for location or use GPS'}
                    disabled={saving}
                  />
                  {!location && (
                    <p className="text-xs text-amber-600">
                      {locale === 'ar' ? '📍 تحديد الموقع يساعد في توصيل طلبك بشكل أسرع' : '📍 Setting location helps deliver your order faster'}
                    </p>
                  )}
                </div>
              )}

              {/* Address Line 1 */}
              <div className="space-y-2">
                <Label htmlFor="addressLine1">{tForm('addressLine1')}</Label>
                <Input
                  id="addressLine1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder={tForm('addressLine1Placeholder')}
                />
              </div>

              {/* Building, Floor, Apartment - Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="building">{tForm('building')}</Label>
                  <Input
                    id="building"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder={tForm('buildingPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">{tForm('floor')}</Label>
                  <Input
                    id="floor"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder={tForm('floorPlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apartment">{tForm('apartment')}</Label>
                  <Input
                    id="apartment"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    placeholder={tForm('apartmentPlaceholder')}
                  />
                </div>
              </div>

              {/* Landmark */}
              <div className="space-y-2">
                <Label htmlFor="landmark">{tForm('landmark')}</Label>
                <Input
                  id="landmark"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder={tForm('landmarkPlaceholder')}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">{tForm('phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={tForm('phonePlaceholder')}
                  dir="ltr"
                />
              </div>

              {/* Delivery Instructions */}
              <div className="space-y-2">
                <Label htmlFor="deliveryInstructions">{tForm('deliveryInstructions')}</Label>
                <Textarea
                  id="deliveryInstructions"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder={tForm('deliveryInstructionsPlaceholder')}
                  rows={3}
                />
              </div>

              {/* Is Default */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  {tForm('isDefault')}
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                {tForm('cancel')}
              </Button>
              <Button onClick={handleSaveAddress} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {tForm('saving')}
                  </>
                ) : (
                  tForm('saveButton')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </CustomerLayout>
  )
}
