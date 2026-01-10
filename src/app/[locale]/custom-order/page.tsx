'use client'

import { useEffect, useState, Suspense } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CustomOrderInterface } from '@/components/custom-order'
import { CustomerHeader } from '@/components/customer/layout'
import { ArrowRight, ArrowLeft, Store, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { ProviderWithCustomSettings, CreateBroadcastPayload } from '@/types/custom-order'
import { createCustomerBroadcastService } from '@/lib/orders/broadcast-service'

function CustomOrderPageContent() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const router = useRouter()
  const searchParams = useSearchParams()
  const providerId = searchParams.get('provider')

  const [provider, setProvider] = useState<ProviderWithCustomSettings | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Fetch provider and user data
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCustomerId(user.id)
      } else {
        // Redirect to login if not authenticated
        router.push(`/${locale}/auth/login?redirect=${encodeURIComponent(`/${locale}/custom-order?provider=${providerId}`)}`)
        return
      }

      // Get provider if ID provided
      if (providerId) {
        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select('*')
          .eq('id', providerId)
          .single()

        if (providerError || !providerData) {
          setError(isRTL ? 'المتجر غير موجود' : 'Provider not found')
        } else if (providerData.operation_mode !== 'custom' && providerData.operation_mode !== 'hybrid') {
          setError(isRTL ? 'هذا المتجر لا يدعم الطلب المفتوح' : 'This provider does not support custom orders')
        } else {
          setProvider(providerData as ProviderWithCustomSettings)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [providerId, locale, router, isRTL])

  // Handle order submission
  const handleSubmit = async (payload: CreateBroadcastPayload) => {
    if (!customerId) {
      setError(isRTL ? 'يرجى تسجيل الدخول' : 'Please login first')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const broadcastService = createCustomerBroadcastService(supabase, customerId)

      const result = await broadcastService.createBroadcast(payload)

      if (result.success && result.broadcastId) {
        // Navigate to the review page
        router.push(`/${locale}/orders/custom-review/${result.broadcastId}`)
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (err) {
      console.error('Error creating broadcast:', err)
      setError(
        isRTL
          ? 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.'
          : 'Error submitting order. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    if (providerId) {
      router.push(`/${locale}/providers/${providerId}`)
    } else {
      router.push(`/${locale}/providers`)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !provider) {
    return (
      <div className="min-h-screen bg-slate-50">
        <CustomerHeader />
        <div className="flex flex-col items-center justify-center p-8 mt-20">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {isRTL ? 'حدث خطأ' : 'Error'}
          </h2>
          <p className="text-slate-500 text-center mb-6">{error}</p>
          <Link
            href={`/${locale}/providers`}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <Store className="w-5 h-5" />
            {isRTL ? 'تصفح المتاجر' : 'Browse Providers'}
          </Link>
        </div>
      </div>
    )
  }

  // No provider selected - show provider selection or error
  if (!provider) {
    return (
      <div className="min-h-screen bg-slate-50">
        <CustomerHeader />
        <div className="flex flex-col items-center justify-center p-8 mt-20">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {isRTL ? 'اختر متجراً' : 'Select a Provider'}
          </h2>
          <p className="text-slate-500 text-center mb-6">
            {isRTL
              ? 'يرجى اختيار متجر يدعم الطلب المفتوح للبدء'
              : 'Please select a provider that supports custom orders to begin'}
          </p>
          <Link
            href={`/${locale}/providers`}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            <Store className="w-5 h-5" />
            {isRTL ? 'تصفح المتاجر' : 'Browse Providers'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={handleCancel}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            {isRTL ? (
              <ArrowRight className="w-5 h-5 text-slate-600" />
            ) : (
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            )}
          </button>
          <h1 className="flex-1 text-center font-semibold text-slate-800">
            {isRTL ? 'طلب مفتوح' : 'Custom Order'}
          </h1>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        <CustomOrderInterface
          provider={provider}
          customerId={customerId || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          className="h-full"
        />
      </div>
    </div>
  )
}

export default function CustomOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    }>
      <CustomOrderPageContent />
    </Suspense>
  )
}
