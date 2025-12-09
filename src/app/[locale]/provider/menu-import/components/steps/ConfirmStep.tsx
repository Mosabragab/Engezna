'use client'

import { useEffect, useState, useRef } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Package,
  Layers,
  ListChecks,
} from 'lucide-react'
import type { ExtractedCategory, ExtractedAddon } from '@/types/menu-import'

interface ConfirmStepProps {
  importId: string
  providerId: string
  categories: ExtractedCategory[]
  addons: ExtractedAddon[]
  onComplete: (results: {
    categoriesCreated: number
    productsCreated: number
    variantsCreated: number
  }) => void
  onError: (error: string) => void
  onBack: () => void
}

interface SaveResult {
  success: boolean
  categoriesCreated: number
  productsCreated: number
  variantsCreated: number
  addonsCreated: number
  error?: string
}

const SAVING_MESSAGES = {
  ar: [
    'جاري حفظ الأقسام...',
    'جاري إنشاء المنتجات...',
    'جاري حفظ خيارات الأسعار...',
    'جاري إنهاء الاستيراد...',
  ],
  en: [
    'Saving categories...',
    'Creating products...',
    'Saving price variants...',
    'Finalizing import...',
  ],
}

export function ConfirmStep({
  importId,
  providerId,
  categories,
  addons,
  onComplete,
  onError,
  onBack,
}: ConfirmStepProps) {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'
  const messages = SAVING_MESSAGES[locale === 'ar' ? 'ar' : 'en']

  const [status, setStatus] = useState<'saving' | 'success' | 'error'>('saving')
  const [currentMessage, setCurrentMessage] = useState(0)
  const [result, setResult] = useState<SaveResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hasStarted = useRef(false)

  // Rotate messages while saving
  useEffect(() => {
    if (status !== 'saving') return

    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % messages.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [status, messages.length])

  // Start saving
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    saveToDatabase()
  }, [])

  async function saveToDatabase() {
    try {
      setStatus('saving')
      setErrorMessage(null)

      // Filter out deleted items
      const filteredCategories = categories
        .filter(cat => !cat.isDeleted)
        .map(cat => ({
          ...cat,
          products: cat.products.filter(prod => !prod.isDeleted),
        }))

      const response = await fetch('/api/menu-import/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          importId,
          providerId,
          categories: filteredCategories,
          addons: addons,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save menu')
      }

      setResult(data)
      setStatus('success')
      onComplete({
        categoriesCreated: data.categoriesCreated,
        productsCreated: data.productsCreated,
        variantsCreated: data.variantsCreated,
      })
    } catch (err) {
      console.error('Save error:', err)
      setStatus('error')
      setErrorMessage(
        err instanceof Error
          ? err.message
          : locale === 'ar'
          ? 'فشل في حفظ البيانات'
          : 'Failed to save data'
      )
      onError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function handleRetry() {
    hasStarted.current = false
    await saveToDatabase()
  }

  const goToProducts = () => {
    router.push(`/${locale}/provider/products`)
  }

  const startNewImport = () => {
    router.push(`/${locale}/provider/menu-import`)
    router.refresh()
  }

  return (
    <div className="p-8">
      {/* Saving State */}
      {status === 'saving' && (
        <div className="text-center">
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
            <div className="absolute inset-3 bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'جاري حفظ المنيو' : 'Saving Menu'}
          </h2>

          <p className="text-slate-600 h-6 transition-opacity duration-300">
            {messages[currentMessage]}
          </p>

          <div className="flex justify-center gap-2 mt-6">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl max-w-md mx-auto">
            <p className="text-sm text-blue-700">
              {locale === 'ar'
                ? 'يتم الآن إنشاء الأقسام والمنتجات في قاعدة البيانات. لا تغلق هذه الصفحة.'
                : 'Creating categories and products in the database. Please do not close this page.'}
            </p>
          </div>
        </div>
      )}

      {/* Success State */}
      {status === 'success' && result && (
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'تم الاستيراد بنجاح!' : 'Import Successful!'}
          </h2>

          <p className="text-slate-600 mb-6">
            {locale === 'ar'
              ? 'تم إضافة المنيو الخاص بك بنجاح'
              : 'Your menu has been added successfully'}
          </p>

          {/* Results Summary */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {result.categoriesCreated}
              </div>
              <div className="text-xs text-blue-600">
                {locale === 'ar' ? 'أقسام' : 'Categories'}
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-700">
                {result.productsCreated}
              </div>
              <div className="text-xs text-green-600">
                {locale === 'ar' ? 'منتجات' : 'Products'}
              </div>
            </div>

            <div className="bg-purple-50 rounded-xl p-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <ListChecks className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {result.variantsCreated}
              </div>
              <div className="text-xs text-purple-600">
                {locale === 'ar' ? 'خيارات' : 'Variants'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={startNewImport}
              className="px-6 py-3 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'استيراد جديد' : 'New Import'}
            </button>

            <button
              onClick={goToProducts}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {locale === 'ar' ? 'عرض المنتجات' : 'View Products'}
              {isRTL ? (
                <ArrowLeft className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'حدث خطأ' : 'An Error Occurred'}
          </h2>

          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            {errorMessage ||
              (locale === 'ar'
                ? 'فشل في حفظ البيانات. يرجى المحاولة مرة أخرى.'
                : 'Failed to save data. Please try again.')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onBack}
              className="px-6 py-3 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              {isRTL ? (
                <ArrowRight className="w-4 h-4" />
              ) : (
                <ArrowLeft className="w-4 h-4" />
              )}
              {locale === 'ar' ? 'رجوع للمراجعة' : 'Back to Review'}
            </button>

            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
