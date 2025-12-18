'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { useCart } from '@/lib/store/cart'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import { CustomerLayout } from '@/components/customer/layout'
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
  Tag,
  X,
  Loader2,
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

// District interface kept for backward compatibility with saved addresses
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

interface PromoCode {
  id: string
  code: string
  description_ar: string | null
  description_en: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  max_discount_amount: number | null
  min_order_amount: number
  usage_limit: number | null
  usage_count: number
  per_user_limit: number
  valid_from: string
  valid_until: string
  is_active: boolean
  applicable_categories: string[] | null
  applicable_providers: string[] | null
  first_order_only: boolean
}

export default function CheckoutPage() {
  const locale = useLocale()
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const { cart, provider, getSubtotal, getTotal, clearCart, _hasHydrated } = useCart()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderPlaced, setOrderPlaced] = useState(false) // Prevent redirect after order is placed

  // User information
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')

  // Promo code
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null)
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null)
  const [promoCodeLoading, setPromoCodeLoading] = useState(false)
  const [discountAmount, setDiscountAmount] = useState(0)

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
    // Don't redirect if order was just placed (cart cleared after success)
    if (orderPlaced) return

    // Redirect if cart is empty
    if (!cart || cart.length === 0) {
      router.push(`/${locale}/providers`)
      return
    }

    // Load user data if authenticated
    if (user && isAuthenticated) {
      loadUserData()
      loadSavedAddresses()
      loadGovernorates()
    } else if (!authLoading && !isAuthenticated) {
      // Load governorates for guest users too
      loadGovernorates()
      setAddressMode('new')
      setLoadingAddresses(false)
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

  // Promo code validation
  const handleApplyPromoCode = async () => {
    // Debug logging for mobile troubleshooting
    console.log('handleApplyPromoCode called', {
      promoCodeInput,
      hasUser: !!user,
      hasProvider: !!provider,
      hasHydrated: _hasHydrated,
      userId: user?.id,
      providerId: provider?.id
    })

    if (!promoCodeInput.trim()) {
      setPromoCodeError(locale === 'ar' ? 'يرجى إدخال كود الخصم' : 'Please enter a promo code')
      return
    }

    // Wait for hydration if not ready yet
    if (!_hasHydrated) {
      setPromoCodeError(locale === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...')
      return
    }

    if (!user) {
      setPromoCodeError(locale === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first')
      return
    }

    if (!provider) {
      setPromoCodeError(locale === 'ar' ? 'يرجى إضافة منتجات للسلة أولاً' : 'Please add items to cart first')
      return
    }

    setPromoCodeLoading(true)
    setPromoCodeError(null)

    try {
      const supabase = createClient()
      const code = promoCodeInput.trim().toUpperCase()
      const now = new Date()

      console.log('Attempting to fetch promo code:', code, 'at', now.toISOString())

      // Fetch the promo code using ilike for case-insensitive match
      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', code)
        .maybeSingle()

      console.log('Promo code fetch result:', { promoCode, error })

      if (error) {
        console.error('Supabase error:', error)
        setPromoCodeError(
          locale === 'ar'
            ? `خطأ في الاستعلام: ${error.message}`
            : `Query error: ${error.message}`
        )
        return
      }

      if (!promoCode) {
        setPromoCodeError(
          locale === 'ar'
            ? 'كود غير موجود'
            : 'Promo code not found'
        )
        return
      }

      // Check if active
      if (!promoCode.is_active) {
        setPromoCodeError(
          locale === 'ar'
            ? 'هذا الكود غير مفعل'
            : 'This promo code is not active'
        )
        return
      }

      // Check date validity
      const validFrom = new Date(promoCode.valid_from)
      const validUntil = new Date(promoCode.valid_until)

      if (now < validFrom) {
        setPromoCodeError(
          locale === 'ar'
            ? 'هذا الكود لم يبدأ بعد'
            : 'This promo code is not valid yet'
        )
        return
      }

      if (now > validUntil) {
        setPromoCodeError(
          locale === 'ar'
            ? 'انتهت صلاحية هذا الكود'
            : 'This promo code has expired'
        )
        return
      }

      const subtotal = getSubtotal()

      // Check minimum order amount
      if (subtotal < promoCode.min_order_amount) {
        setPromoCodeError(
          locale === 'ar'
            ? `الحد الأدنى للطلب لاستخدام هذا الكود: ${promoCode.min_order_amount} ج.م`
            : `Minimum order for this code: ${promoCode.min_order_amount} EGP`
        )
        return
      }

      // Check usage limit
      if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
        setPromoCodeError(
          locale === 'ar'
            ? 'تم استنفاد الحد الأقصى لاستخدام هذا الكود'
            : 'This promo code has reached its usage limit'
        )
        return
      }

      // Check per-user limit
      const { count: userUsageCount } = await supabase
        .from('promo_code_usage')
        .select('*', { count: 'exact', head: true })
        .eq('promo_code_id', promoCode.id)
        .eq('user_id', user.id)

      if (userUsageCount && userUsageCount >= promoCode.per_user_limit) {
        setPromoCodeError(
          locale === 'ar'
            ? 'لقد استخدمت هذا الكود بالفعل'
            : 'You have already used this promo code'
        )
        return
      }

      // Check first order only
      if (promoCode.first_order_only) {
        const { count: orderCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', user.id)
          .not('status', 'eq', 'cancelled')

        if (orderCount && orderCount > 0) {
          setPromoCodeError(
            locale === 'ar'
              ? 'هذا الكود متاح للطلب الأول فقط'
              : 'This code is valid for first order only'
          )
          return
        }
      }

      // Check applicable categories
      if (promoCode.applicable_categories && promoCode.applicable_categories.length > 0) {
        if (!promoCode.applicable_categories.includes(provider.category)) {
          setPromoCodeError(
            locale === 'ar'
              ? 'هذا الكود غير متاح لهذا النوع من المتاجر'
              : 'This code is not valid for this store type'
          )
          return
        }
      }

      // Check applicable providers
      if (promoCode.applicable_providers && promoCode.applicable_providers.length > 0) {
        if (!promoCode.applicable_providers.includes(provider.id)) {
          setPromoCodeError(
            locale === 'ar'
              ? 'هذا الكود غير متاح لهذا المتجر'
              : 'This code is not valid for this store'
          )
          return
        }
      }

      // Calculate discount
      let discount = 0
      if (promoCode.discount_type === 'percentage') {
        discount = (subtotal * promoCode.discount_value) / 100
        if (promoCode.max_discount_amount && discount > promoCode.max_discount_amount) {
          discount = promoCode.max_discount_amount
        }
      } else {
        discount = promoCode.discount_value
      }

      // Ensure discount doesn't exceed subtotal
      discount = Math.min(discount, subtotal)

      setAppliedPromoCode(promoCode)
      setDiscountAmount(discount)
      setPromoCodeInput('')
    } catch (err) {
      console.error('Error applying promo code:', err)
      setPromoCodeError(
        locale === 'ar'
          ? 'حدث خطأ أثناء التحقق من الكود'
          : 'An error occurred while validating the code'
      )
    } finally {
      setPromoCodeLoading(false)
    }
  }

  const handleRemovePromoCode = () => {
    setAppliedPromoCode(null)
    setDiscountAmount(0)
    setPromoCodeError(null)
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
      // New address - districts deprecated, using GPS instead
      const selectedGov = governorates.find(g => g.id === selectedGovernorateId)
      const selectedCity = cities.find(c => c.id === selectedCityId)

      return {
        // Geographic hierarchy with IDs and names
        governorate_id: selectedGovernorateId || null,
        governorate_ar: selectedGov?.name_ar || null,
        governorate_en: selectedGov?.name_en || null,
        city_id: selectedCityId || null,
        city_ar: selectedCity?.name_ar || null,
        city_en: selectedCity?.name_en || null,
        district_id: null, // DEPRECATED - always null for new addresses
        district_ar: null,
        district_en: null,
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

  // Validate Egyptian phone number format
  const validatePhoneNumber = (phoneNumber: string): boolean => {
    // Egyptian phone numbers: 01XXXXXXXXX (11 digits starting with 01)
    // Accepts formats: 01XXXXXXXXX, +201XXXXXXXXX, 00201XXXXXXXXX
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '')
    const egyptPhoneRegex = /^(\+20|0020|0)?1[0125]\d{8}$/
    return egyptPhoneRegex.test(cleanPhone)
  }

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      setError(locale === 'ar' ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name')
      return false
    }

    if (!phone.trim()) {
      setError(locale === 'ar' ? 'يرجى إدخال رقم الهاتف' : 'Please enter your phone number')
      return false
    }

    if (!validatePhoneNumber(phone)) {
      setError(
        locale === 'ar'
          ? 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01XXXXXXXXX)'
          : 'Please enter a valid Egyptian phone number (e.g., 01XXXXXXXXX)'
      )
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
    // Check if user is authenticated - redirect to login if not
    if (!isAuthenticated || !user) {
      router.push(`/${locale}/auth/login?redirect=/checkout`)
      return
    }

    if (!provider) return

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

      // Calculate final total with discount
      const finalTotal = subtotal + (provider.delivery_fee || 0) - discountAmount

      // Calculate platform commission on actual revenue (subtotal minus discount, excluding delivery fee)
      const commissionRate = provider.commission_rate || 6.0
      const platformCommission = ((subtotal - discountAmount) * commissionRate) / 100

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
          discount: discountAmount,
          total: finalTotal,
          platform_commission: platformCommission,
          payment_method: paymentMethod,
          payment_status: 'pending',
          delivery_address: deliveryAddressJson,
          customer_notes: additionalNotes || null,
          estimated_delivery_time: estimatedDeliveryTime,
          promo_code: appliedPromoCode?.code || null,
        })
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error:', orderError)
        throw orderError
      }

      // Record promo code usage if applied
      if (appliedPromoCode) {
        await supabase.from('promo_code_usage').insert({
          promo_code_id: appliedPromoCode.id,
          user_id: user.id,
          order_id: order.id,
          discount_amount: discountAmount,
        })

        // Increment promo code usage count
        await supabase
          .from('promo_codes')
          .update({ usage_count: appliedPromoCode.usage_count + 1 })
          .eq('id', appliedPromoCode.id)
      }

      // Create order items - use variant price if selected, otherwise base price
      const orderItems = cart.map((item) => {
        const itemPrice = item.selectedVariant?.price ?? item.menuItem.price
        const variantName = item.selectedVariant
          ? ` (${item.selectedVariant.name_ar})`
          : ''
        const variantNameEn = item.selectedVariant
          ? ` (${item.selectedVariant.name_en || item.selectedVariant.name_ar})`
          : ''

        return {
          order_id: order.id,
          menu_item_id: item.menuItem.id,
          item_name_ar: item.menuItem.name_ar + variantName,
          item_name_en: item.menuItem.name_en + variantNameEn,
          item_price: itemPrice,
          quantity: item.quantity,
          unit_price: itemPrice,
          total_price: itemPrice * item.quantity,
          variant_id: item.selectedVariant?.id || null,
          variant_name_ar: item.selectedVariant?.name_ar || null,
          variant_name_en: item.selectedVariant?.name_en || null,
        }
      })

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Order items error:', itemsError)
        throw itemsError
      }

      // Mark order as placed to prevent useEffect from redirecting
      setOrderPlaced(true)

      // Clear cart and redirect to confirmation page
      clearCart()
      router.push(`/${locale}/orders/${order.id}/confirmation`)
    } catch (err) {
      console.error('Order placement error:', err)

      // Check if error is due to RLS policy (banned customer)
      const errorMessage = err instanceof Error ? err.message : String(err)
      const isRLSError = errorMessage.includes('row-level security') ||
                         errorMessage.includes('violates row-level security policy') ||
                         (err as { code?: string })?.code === '42501'

      if (isRLSError) {
        setError(
          locale === 'ar'
            ? 'عذراً، حسابك محظور ولا يمكنك إنشاء طلبات جديدة. يرجى التواصل مع خدمة عملاء إنجزنا للمساعدة.'
            : 'Sorry, your account is suspended and you cannot create new orders. Please contact Engezna customer service for assistance.'
        )
      } else {
        setError(
          locale === 'ar'
            ? 'حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.'
            : 'An error occurred while placing your order. Please try again.'
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while auth is loading or cart is hydrating
  // Also show loading if order was placed (navigating to confirmation)
  if (authLoading || !_hasHydrated || orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Cart empty check is handled by useEffect redirect
  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const subtotal = getSubtotal()
  const deliveryFee = provider?.delivery_fee || 0
  const total = subtotal + deliveryFee - discountAmount

  return (
    <CustomerLayout
      headerTitle={locale === 'ar' ? 'إتمام الطلب' : 'Checkout'}
      showBackButton={true}
      showBottomNav={true}
    >
      <div className="px-4 py-4 pb-32">
        <div className="max-w-4xl mx-auto">

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
                      {/* Geographic Hierarchy - Districts removed, using GPS instead */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Card className="lg:sticky lg:top-24">
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

                  {/* Promo Code Section */}
                  <div className="pb-4 border-b">
                    <Label className="text-sm font-medium mb-2 block">
                      <Tag className="w-4 h-4 inline-block me-1" />
                      {locale === 'ar' ? 'كود الخصم' : 'Promo Code'}
                    </Label>

                    {appliedPromoCode ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-700">{appliedPromoCode.code}</span>
                          </div>
                          <p className="text-sm text-green-600 mt-1">
                            {appliedPromoCode.discount_type === 'percentage'
                              ? `${appliedPromoCode.discount_value}% ${locale === 'ar' ? 'خصم' : 'off'}`
                              : `${appliedPromoCode.discount_value} ${locale === 'ar' ? 'ج.م خصم' : 'EGP off'}`}
                            {appliedPromoCode.max_discount_amount && ` (${locale === 'ar' ? 'الحد الأقصى' : 'max'} ${appliedPromoCode.max_discount_amount} ${locale === 'ar' ? 'ج.م' : 'EGP'})`}
                          </p>
                        </div>
                        <button
                          onClick={handleRemovePromoCode}
                          className="text-red-500 hover:text-red-700 p-1"
                          title={locale === 'ar' ? 'إزالة الكود' : 'Remove code'}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                          placeholder={locale === 'ar' ? 'أدخل الكود' : 'Enter code'}
                          disabled={promoCodeLoading}
                          className="flex-1"
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyPromoCode()}
                        />
                        <Button
                          onClick={handleApplyPromoCode}
                          disabled={promoCodeLoading || !promoCodeInput.trim()}
                          variant="outline"
                          size="default"
                        >
                          {promoCodeLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            locale === 'ar' ? 'تطبيق' : 'Apply'
                          )}
                        </Button>
                      </div>
                    )}

                    {promoCodeError && (
                      <p className="text-sm text-destructive mt-2">{promoCodeError}</p>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                      <span>{subtotal.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{locale === 'ar' ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                      <span>{deliveryFee.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{locale === 'ar' ? 'الخصم' : 'Discount'}</span>
                        <span>-{discountAmount.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
                      <span className="text-primary">{total.toFixed(2)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>

                  {/* Login Prompt for Guests */}
                  {!isAuthenticated && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center mb-3">
                      <p className="text-xs text-blue-700">
                        {locale === 'ar'
                          ? 'يجب تسجيل الدخول لإكمال الطلب'
                          : 'You need to login to complete your order'}
                      </p>
                    </div>
                  )}

                  {/* Place Order Button - Matching cart button style */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isLoading}
                    className="w-full bg-primary text-white rounded-lg py-3 font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>
                      {isLoading
                        ? locale === 'ar'
                          ? 'جاري تقديم الطلب...'
                          : 'Placing Order...'
                        : !isAuthenticated
                        ? locale === 'ar'
                          ? 'تسجيل الدخول لإكمال الطلب'
                          : 'Login to Complete Order'
                        : locale === 'ar'
                        ? 'تأكيد الطلب'
                        : 'Confirm Order'}
                    </span>
                    {!isLoading && (
                      <span className="bg-white/20 px-2.5 py-0.5 rounded-md text-sm">
                        {total.toFixed(0)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                      </span>
                    )}
                  </button>

                  {provider && subtotal < provider.min_order_amount && (
                    <div className="bg-card-bg-warning text-warning text-xs rounded-lg px-3 py-1.5 mt-2 text-center">
                      {locale === 'ar'
                        ? `أضف ${(provider.min_order_amount - subtotal).toFixed(0)} ج.م للوصول للحد الأدنى`
                        : `Add ${(provider.min_order_amount - subtotal).toFixed(0)} EGP to reach minimum order`}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  )
}
