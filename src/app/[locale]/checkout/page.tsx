'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { useCart } from '@/lib/store/cart'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  MapPin,
  Phone,
  User,
  ShoppingCart,
  CreditCard,
  Wallet,
  Home,
  Building2,
  ChevronDown,
  Plus,
  Check,
} from 'lucide-react'

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

interface District {
  id: string
  city_id: string | null
  name_ar: string
  name_en: string
}

interface SavedAddress {
  id: string
  label: string
  address_line1: string
  address_line2: string | null
  city: string
  area: string | null
  governorate_id: string | null
  city_id: string | null
  district_id: string | null
  building: string | null
  floor: string | null
  apartment: string | null
  landmark: string | null
  phone: string | null
  delivery_instructions: string | null
  is_default: boolean
  governorate?: Governorate | null
  city_ref?: City | null
  district?: District | null
}

export default function CheckoutPage() {
  const locale = useLocale()
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { cart, provider, getSubtotal, getTotal, clearCart } = useCart()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // User information
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')

  // Address mode: 'saved' or 'new'
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>('saved')

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [loadingAddresses, setLoadingAddresses] = useState(true)

  // New address fields
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])

  const [selectedGovernorateId, setSelectedGovernorateId] = useState<string>('')
  const [selectedCityId, setSelectedCityId] = useState<string>('')
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('')

  const [addressLine1, setAddressLine1] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [apartment, setApartment] = useState('')
  const [landmark, setLandmark] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push(`/${locale}/auth/login?redirect=/checkout`)
      return
    }

    // Redirect if cart is empty
    if (!cart || cart.length === 0) {
      router.push(`/${locale}/providers`)
      return
    }

    // Load user data if authenticated
    if (user) {
      loadUserData()
      loadSavedAddresses()
      loadGovernorates()
    }
  }, [authLoading, isAuthenticated, cart, user])

  // Load cities when governorate changes
  useEffect(() => {
    if (selectedGovernorateId) {
      loadCities(selectedGovernorateId)
      setSelectedCityId('')
      setSelectedDistrictId('')
      setDistricts([])
    } else {
      setCities([])
      setDistricts([])
    }
  }, [selectedGovernorateId])

  // Load districts when city changes
  useEffect(() => {
    if (selectedCityId) {
      loadDistricts(selectedCityId)
      setSelectedDistrictId('')
    } else {
      setDistricts([])
    }
  }, [selectedCityId])

  const loadUserData = async () => {
    if (!user) return

    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()

    if (data) {
      setFullName(data.full_name || '')
      setPhone(data.phone || '')
    }
  }

  const loadSavedAddresses = async () => {
    if (!user) return
    setLoadingAddresses(true)

    const supabase = createClient()
    const { data } = await supabase
      .from('addresses')
      .select(`
        *,
        governorate:governorates(id, name_ar, name_en),
        city_ref:cities(id, name_ar, name_en),
        district:districts(id, name_ar, name_en)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })

    if (data && data.length > 0) {
      setSavedAddresses(data as SavedAddress[])
      // Auto-select default address
      const defaultAddr = data.find(a => a.is_default)
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id)
      } else {
        setSelectedAddressId(data[0].id)
      }
      setAddressMode('saved')
    } else {
      setAddressMode('new')
    }

    setLoadingAddresses(false)
  }

  const loadGovernorates = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('governorates')
      .select('id, name_ar, name_en')
      .eq('is_active', true)
      .order('name_ar')

    if (data) {
      setGovernorates(data)
    }
  }

  const loadCities = async (governorateId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('cities')
      .select('id, governorate_id, name_ar, name_en')
      .eq('governorate_id', governorateId)
      .eq('is_active', true)
      .order('name_ar')

    if (data) {
      setCities(data)
    }
  }

  const loadDistricts = async (cityId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('districts')
      .select('id, city_id, name_ar, name_en')
      .eq('city_id', cityId)
      .eq('is_active', true)
      .order('name_ar')

    if (data) {
      setDistricts(data)
    }
  }

  const getSelectedAddress = (): SavedAddress | null => {
    if (addressMode === 'saved' && selectedAddressId) {
      return savedAddresses.find(a => a.id === selectedAddressId) || null
    }
    return null
  }

  const buildDeliveryAddressJson = () => {
    if (addressMode === 'saved') {
      const addr = getSelectedAddress()
      if (!addr) return null

      return {
        // Geographic hierarchy with IDs and names
        governorate_id: addr.governorate_id,
        governorate_ar: addr.governorate?.name_ar || null,
        governorate_en: addr.governorate?.name_en || null,
        city_id: addr.city_id,
        city_ar: addr.city_ref?.name_ar || addr.city || null,
        city_en: addr.city_ref?.name_en || null,
        district_id: addr.district_id,
        district_ar: addr.district?.name_ar || addr.area || null,
        district_en: addr.district?.name_en || null,
        // Address details
        address: addr.address_line1,
        address_line1: addr.address_line1,
        address_line2: addr.address_line2,
        building: addr.building,
        floor: addr.floor,
        apartment: addr.apartment,
        landmark: addr.landmark,
        // Contact
        phone: phone || addr.phone,
        full_name: fullName,
        delivery_instructions: deliveryInstructions || addr.delivery_instructions,
        notes: additionalNotes || null,
        // Source reference
        address_id: addr.id,
      }
    } else {
      // New address
      const selectedGov = governorates.find(g => g.id === selectedGovernorateId)
      const selectedCity = cities.find(c => c.id === selectedCityId)
      const selectedDist = districts.find(d => d.id === selectedDistrictId)

      return {
        // Geographic hierarchy with IDs and names
        governorate_id: selectedGovernorateId || null,
        governorate_ar: selectedGov?.name_ar || null,
        governorate_en: selectedGov?.name_en || null,
        city_id: selectedCityId || null,
        city_ar: selectedCity?.name_ar || null,
        city_en: selectedCity?.name_en || null,
        district_id: selectedDistrictId || null,
        district_ar: selectedDist?.name_ar || null,
        district_en: selectedDist?.name_en || null,
        // Address details
        address: addressLine1,
        address_line1: addressLine1,
        building: building || null,
        floor: floor || null,
        apartment: apartment || null,
        landmark: landmark || null,
        // Contact
        phone: phone,
        full_name: fullName,
        delivery_instructions: deliveryInstructions || null,
        notes: additionalNotes || null,
      }
    }
  }

  const validateForm = (): boolean => {
    if (!fullName || !phone) {
      setError(locale === 'ar' ? 'يرجى ملء الاسم ورقم الهاتف' : 'Please fill name and phone')
      return false
    }

    if (addressMode === 'saved') {
      if (!selectedAddressId) {
        setError(locale === 'ar' ? 'يرجى اختيار عنوان التوصيل' : 'Please select a delivery address')
        return false
      }
    } else {
      if (!selectedGovernorateId || !selectedCityId || !addressLine1) {
        setError(locale === 'ar' ? 'يرجى ملء المحافظة والمدينة والعنوان' : 'Please fill governorate, city and address')
        return false
      }
    }

    return true
  }

  const handlePlaceOrder = async () => {
    if (!user || !provider) return

    if (!validateForm()) return

    // Check minimum order amount
    const subtotal = getSubtotal()
    if (subtotal < provider.min_order_amount) {
      setError(
        locale === 'ar'
          ? `الحد الأدنى للطلب هو ${provider.min_order_amount} ج.م`
          : `Minimum order amount is ${provider.min_order_amount} EGP`
      )
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Calculate platform commission
      const commissionRate = provider.commission_rate || 6.0
      const platformCommission = (subtotal * commissionRate) / 100

      // Build delivery address JSONB with full geographic data
      const deliveryAddressJson = buildDeliveryAddressJson()

      // Calculate estimated delivery time
      const estimatedDeliveryTime = new Date(
        Date.now() + (provider.estimated_delivery_time_min || 30) * 60 * 1000
      ).toISOString()

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          provider_id: provider.id,
          status: 'pending',
          subtotal: subtotal,
          delivery_fee: provider.delivery_fee,
          discount: 0,
          total: getTotal(),
          platform_commission: platformCommission,
          payment_method: paymentMethod,
          payment_status: 'pending',
          delivery_address: deliveryAddressJson,
          customer_notes: additionalNotes || null,
          estimated_delivery_time: estimatedDeliveryTime,
        })
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error:', orderError)
        throw orderError
      }

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuItem.id,
        item_name_ar: item.menuItem.name_ar,
        item_name_en: item.menuItem.name_en,
        item_price: item.menuItem.price,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        total_price: item.menuItem.price * item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Order items error:', itemsError)
        throw itemsError
      }

      // Clear cart and redirect
      clearCart()
      router.push(`/${locale}/orders/${order.id}/confirmation`)
    } catch (err) {
      console.error('Order placement error:', err)
      setError(
        locale === 'ar'
          ? 'حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.'
          : 'An error occurred while placing your order. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || !cart || cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const subtotal = getSubtotal()
  const total = getTotal()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/providers/${provider?.id}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <span>{locale === 'ar' ? 'رجوع' : 'Back'}</span>
            </Link>
            <Link href={`/${locale}`} className="text-xl font-bold text-primary">
              {locale === 'ar' ? 'إنجزنا' : 'Engezna'}
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">
            {locale === 'ar' ? 'إتمام الطلب' : 'Checkout'}
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {locale === 'ar' ? 'معلومات العميل' : 'Customer Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">
                      {locale === 'ar' ? 'الاسم الكامل' : 'Full Name'} *
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={locale === 'ar' ? 'أدخل اسمك' : 'Enter your name'}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">
                      {locale === 'ar' ? 'رقم الهاتف' : 'Phone Number'} *
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={locale === 'ar' ? 'أدخل رقم هاتفك' : 'Enter your phone'}
                      disabled={isLoading}
                      dir="ltr"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {locale === 'ar' ? 'عنوان التوصيل' : 'Delivery Address'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Address Mode Tabs */}
                  {savedAddresses.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setAddressMode('saved')}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                          addressMode === 'saved'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Home className="w-4 h-4" />
                        {locale === 'ar' ? 'عناويني المحفوظة' : 'Saved Addresses'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddressMode('new')}
                        className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                          addressMode === 'new'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        {locale === 'ar' ? 'عنوان جديد' : 'New Address'}
                      </button>
                    </div>
                  )}

                  {/* Saved Addresses List */}
                  {addressMode === 'saved' && (
                    <div className="space-y-3">
                      {loadingAddresses ? (
                        <div className="text-center py-4 text-muted-foreground">
                          {locale === 'ar' ? 'جاري تحميل العناوين...' : 'Loading addresses...'}
                        </div>
                      ) : savedAddresses.length > 0 ? (
                        savedAddresses.map((addr) => (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-start ${
                              selectedAddressId === addr.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedAddressId === addr.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                              }`}>
                                {selectedAddressId === addr.id && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold">{addr.label}</span>
                                  {addr.is_default && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                      {locale === 'ar' ? 'افتراضي' : 'Default'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {addr.address_line1}
                                  {addr.building && `, ${locale === 'ar' ? 'مبنى' : 'Bldg'} ${addr.building}`}
                                  {addr.floor && `, ${locale === 'ar' ? 'طابق' : 'Floor'} ${addr.floor}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {addr.district?.name_ar || addr.area}
                                  {addr.city_ref && `, ${locale === 'ar' ? addr.city_ref.name_ar : addr.city_ref.name_en}`}
                                  {addr.governorate && `, ${locale === 'ar' ? addr.governorate.name_ar : addr.governorate.name_en}`}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          {locale === 'ar' ? 'لا توجد عناوين محفوظة' : 'No saved addresses'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* New Address Form */}
                  {addressMode === 'new' && (
                    <div className="space-y-4">
                      {/* Geographic Hierarchy */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Governorate */}
                        <div>
                          <Label>{locale === 'ar' ? 'المحافظة' : 'Governorate'} *</Label>
                          <div className="relative">
                            <select
                              value={selectedGovernorateId}
                              onChange={(e) => setSelectedGovernorateId(e.target.value)}
                              className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background text-sm appearance-none cursor-pointer"
                              disabled={isLoading}
                            >
                              <option value="">{locale === 'ar' ? 'اختر المحافظة' : 'Select Governorate'}</option>
                              {governorates.map((gov) => (
                                <option key={gov.id} value={gov.id}>
                                  {locale === 'ar' ? gov.name_ar : gov.name_en}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        {/* City */}
                        <div>
                          <Label>{locale === 'ar' ? 'المدينة' : 'City'} *</Label>
                          <div className="relative">
                            <select
                              value={selectedCityId}
                              onChange={(e) => setSelectedCityId(e.target.value)}
                              className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background text-sm appearance-none cursor-pointer"
                              disabled={isLoading || !selectedGovernorateId}
                            >
                              <option value="">{locale === 'ar' ? 'اختر المدينة' : 'Select City'}</option>
                              {cities.map((city) => (
                                <option key={city.id} value={city.id}>
                                  {locale === 'ar' ? city.name_ar : city.name_en}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>

                        {/* District */}
                        <div>
                          <Label>{locale === 'ar' ? 'المنطقة/الحي' : 'District'}</Label>
                          <div className="relative">
                            <select
                              value={selectedDistrictId}
                              onChange={(e) => setSelectedDistrictId(e.target.value)}
                              className="w-full h-10 px-3 py-2 border border-input rounded-md bg-background text-sm appearance-none cursor-pointer"
                              disabled={isLoading || !selectedCityId || districts.length === 0}
                            >
                              <option value="">{locale === 'ar' ? 'اختر المنطقة' : 'Select District'}</option>
                              {districts.map((dist) => (
                                <option key={dist.id} value={dist.id}>
                                  {locale === 'ar' ? dist.name_ar : dist.name_en}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Street Address */}
                      <div>
                        <Label>{locale === 'ar' ? 'العنوان التفصيلي' : 'Street Address'} *</Label>
                        <Input
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          placeholder={locale === 'ar' ? 'اسم الشارع والرقم' : 'Street name and number'}
                          disabled={isLoading}
                        />
                      </div>

                      {/* Building Details */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>{locale === 'ar' ? 'المبنى' : 'Building'}</Label>
                          <Input
                            value={building}
                            onChange={(e) => setBuilding(e.target.value)}
                            placeholder={locale === 'ar' ? 'رقم المبنى' : 'Building #'}
                            disabled={isLoading}
                          />
                        </div>
                        <div>
                          <Label>{locale === 'ar' ? 'الطابق' : 'Floor'}</Label>
                          <Input
                            value={floor}
                            onChange={(e) => setFloor(e.target.value)}
                            placeholder={locale === 'ar' ? 'الطابق' : 'Floor'}
                            disabled={isLoading}
                          />
                        </div>
                        <div>
                          <Label>{locale === 'ar' ? 'الشقة' : 'Apartment'}</Label>
                          <Input
                            value={apartment}
                            onChange={(e) => setApartment(e.target.value)}
                            placeholder={locale === 'ar' ? 'رقم الشقة' : 'Apt #'}
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {/* Landmark */}
                      <div>
                        <Label>{locale === 'ar' ? 'علامة مميزة' : 'Landmark'}</Label>
                        <Input
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder={locale === 'ar' ? 'بجوار أو أمام...' : 'Near or in front of...'}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  {/* Delivery Instructions */}
                  <div>
                    <Label>
                      {locale === 'ar' ? 'تعليمات التوصيل' : 'Delivery Instructions'} ({locale === 'ar' ? 'اختياري' : 'optional'})
                    </Label>
                    <Textarea
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      placeholder={locale === 'ar' ? 'أي تعليمات خاصة للتوصيل' : 'Any special delivery instructions'}
                      disabled={isLoading}
                      rows={2}
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <Label>
                      {locale === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'} ({locale === 'ar' ? 'اختياري' : 'optional'})
                    </Label>
                    <Textarea
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder={locale === 'ar' ? 'أي ملاحظات أخرى' : 'Any other notes'}
                      disabled={isLoading}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    {locale === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    disabled={isLoading}
                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5" />
                      <div className="text-start">
                        <div className="font-semibold">
                          {locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {locale === 'ar' ? 'ادفع نقداً عند استلام طلبك' : 'Pay cash when you receive your order'}
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={true}
                    className="w-full p-4 rounded-lg border-2 border-border opacity-50 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5" />
                      <div className="text-start">
                        <div className="font-semibold">
                          {locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {locale === 'ar' ? 'قريباً' : 'Coming Soon'}
                        </div>
                      </div>
                    </div>
                  </button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    {locale === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Provider Info */}
                  {provider && (
                    <div className="pb-4 border-b">
                      <p className="font-semibold">
                        {locale === 'ar' ? provider.name_ar : provider.name_en}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {provider.estimated_delivery_time_min} {locale === 'ar' ? 'دقيقة' : 'min'}
                      </p>
                    </div>
                  )}

                  {/* Cart Items */}
                  <div className="space-y-3 pb-4 border-b">
                    {cart.map((item) => (
                      <div key={item.menuItem.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">
                            {item.quantity}x {locale === 'ar' ? item.menuItem.name_ar : item.menuItem.name_en}
                          </p>
                        </div>
                        <p className="font-semibold">
                          {(item.menuItem.price * item.quantity).toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                      <span>{subtotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                      <span>{provider?.delivery_fee.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="text-primary">{total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading
                      ? locale === 'ar'
                        ? 'جاري تقديم الطلب...'
                        : 'Placing Order...'
                      : locale === 'ar'
                      ? 'تأكيد الطلب'
                      : 'Confirm Order'}
                  </Button>

                  {provider && subtotal < provider.min_order_amount && (
                    <p className="text-sm text-destructive text-center">
                      {locale === 'ar'
                        ? `الحد الأدنى للطلب: ${provider.min_order_amount} ج.م`
                        : `Minimum order: ${provider.min_order_amount} EGP`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
