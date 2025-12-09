'use client'

import { useEffect, useState, useRef } from 'react'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Cpu, Loader2, AlertCircle, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react'
import type { BusinessCategoryCode } from '@/lib/constants/categories'
import type {
  ExtractedCategory,
  ExtractedAddon,
  AnalysisWarning,
  AnalysisStatistics,
} from '@/types/menu-import'

interface ProcessingStepProps {
  importId: string
  imageUrls: string[]
  businessType: BusinessCategoryCode
  onComplete: (result: {
    categories: ExtractedCategory[]
    addons: ExtractedAddon[]
    warnings: AnalysisWarning[]
    statistics: AnalysisStatistics
  }) => void
  onError: (error: string) => void
  onBack: () => void
}

const PROCESSING_MESSAGES = {
  ar: [
    'جاري تحليل الصور...',
    'قراءة النصوص والأسعار...',
    'تحديد الأقسام والمنتجات...',
    'استخراج الأحجام والخيارات...',
    'مراجعة البيانات المستخرجة...',
    'تنظيم النتائج...',
  ],
  en: [
    'Analyzing images...',
    'Reading text and prices...',
    'Identifying categories and products...',
    'Extracting sizes and options...',
    'Reviewing extracted data...',
    'Organizing results...',
  ],
}

export function ProcessingStep({
  importId,
  imageUrls,
  businessType,
  onComplete,
  onError,
  onBack,
}: ProcessingStepProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const messages = PROCESSING_MESSAGES[locale === 'ar' ? 'ar' : 'en']

  const [currentMessage, setCurrentMessage] = useState(0)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const hasStarted = useRef(false)

  // Rotate messages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % messages.length)
    }, 2500)

    return () => clearInterval(interval)
  }, [messages.length])

  // Start analysis
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    startAnalysis()
  }, [])

  async function startAnalysis() {
    try {
      setHasError(false)
      setErrorMessage(null)

      const supabase = createClient()

      // Call Supabase Edge Function (no timeout limit)
      const { data, error } = await supabase.functions.invoke('analyze-menu', {
        body: {
          imageUrls,
          businessType,
          importId,
        },
      })

      if (error) {
        throw new Error(error.message || 'Edge function error')
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Analysis failed')
      }

      // Update import status in database
      await supabase
        .from('menu_imports')
        .update({
          status: 'review',
          extracted_data: data,
          total_items: data.statistics?.total_products || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', importId)

      onComplete({
        categories: data.categories || [],
        addons: data.addons || [],
        warnings: data.warnings || [],
        statistics: data.statistics || {
          total_categories: 0,
          total_products: 0,
          products_single_price: 0,
          products_with_variants: 0,
          products_need_review: 0,
          average_confidence: 0,
          addons_found: 0,
        },
      })
    } catch (err) {
      console.error('Analysis error:', err)
      setHasError(true)
      setErrorMessage(
        err instanceof Error
          ? err.message
          : locale === 'ar' ? 'فشل في تحليل المنيو' : 'Failed to analyze menu'
      )
      onError(err instanceof Error ? err.message : 'Analysis failed')
    }
  }

  async function handleRetry() {
    setRetrying(true)
    hasStarted.current = false
    await startAnalysis()
    setRetrying(false)
  }

  return (
    <div className="p-8">
      {/* Processing Animation */}
      {!hasError && (
        <div className="text-center">
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            {/* Outer ring */}
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            {/* Spinning ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
            {/* Center icon */}
            <div className="absolute inset-3 bg-primary/10 rounded-full flex items-center justify-center">
              <Cpu className="w-10 h-10 text-primary" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'جاري تحليل المنيو' : 'Analyzing Menu'}
          </h2>

          {/* Animated Message */}
          <p className="text-slate-600 h-6 transition-opacity duration-300">
            {messages[currentMessage]}
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 rounded-xl max-w-md mx-auto">
            <p className="text-sm text-blue-700">
              {locale === 'ar'
                ? 'الذكاء الاصطناعي يقرأ المنيو ويستخرج المنتجات والأسعار. قد يستغرق هذا دقيقة أو أكثر حسب عدد الصور.'
                : 'AI is reading the menu and extracting products and prices. This may take a minute or more depending on the number of images.'}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'حدث خطأ' : 'An Error Occurred'}
          </h2>

          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            {errorMessage ||
              (locale === 'ar'
                ? 'فشل في تحليل الصور. يرجى المحاولة مرة أخرى.'
                : 'Failed to analyze images. Please try again.')}
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
              {locale === 'ar' ? 'رجوع' : 'Go Back'}
            </button>

            <button
              onClick={handleRetry}
              disabled={retrying}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {retrying ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              {locale === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
