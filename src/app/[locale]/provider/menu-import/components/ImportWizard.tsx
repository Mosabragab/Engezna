'use client'

import { useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Upload, CheckSquare, Save, CheckCircle2 } from 'lucide-react'
import { UploadStep } from './steps/UploadStep'
import { ReviewStep } from './steps/ReviewStep'
import { ConfirmStep } from './steps/ConfirmStep'
import type { BusinessCategoryCode } from '@/lib/constants/categories'
import type {
  ExtractedCategory,
  ExtractedAddon,
  AnalysisWarning,
  AnalysisStatistics,
} from '@/types/menu-import'

interface ImportWizardProps {
  providerId: string
  businessType: BusinessCategoryCode
  providerName: string
}

type WizardStep = 1 | 2 | 3 | 4

interface WizardState {
  step: WizardStep
  importId: string | null
  analysisResult: {
    categories: ExtractedCategory[]
    addons: ExtractedAddon[]
    warnings: AnalysisWarning[]
    statistics: AnalysisStatistics
  } | null
  editedCategories: ExtractedCategory[]
  editedAddons: ExtractedAddon[]
  isSaving: boolean
  error: string | null
  saveResults: {
    categoriesCreated: number
    productsCreated: number
    variantsCreated: number
  } | null
}

const initialState: WizardState = {
  step: 1,
  importId: null,
  analysisResult: null,
  editedCategories: [],
  editedAddons: [],
  isSaving: false,
  error: null,
  saveResults: null,
}

export function ImportWizard({ providerId, businessType, providerName }: ImportWizardProps) {
  const locale = useLocale()
  const router = useRouter()

  const [state, setState] = useState<WizardState>(initialState)

  // Step definitions
  const steps = [
    {
      number: 1,
      title: locale === 'ar' ? 'رفع الملف' : 'Upload File',
      icon: Upload,
    },
    {
      number: 2,
      title: locale === 'ar' ? 'مراجعة' : 'Review',
      icon: CheckSquare,
    },
    {
      number: 3,
      title: locale === 'ar' ? 'حفظ' : 'Save',
      icon: Save,
    },
    {
      number: 4,
      title: locale === 'ar' ? 'تم!' : 'Done!',
      icon: CheckCircle2,
    },
  ]

  // Handle Excel upload completion - goes directly to review
  const handleUploadComplete = useCallback((
    categories: ExtractedCategory[],
    addons: ExtractedAddon[],
    importId: string
  ) => {
    const totalProducts = categories.reduce((sum, cat) => sum + cat.products.length, 0)
    const productsWithVariants = categories.reduce(
      (sum, cat) => sum + cat.products.filter(p => p.variants && p.variants.length > 0).length,
      0
    )

    setState(prev => ({
      ...prev,
      importId,
      analysisResult: {
        categories,
        addons,
        warnings: [],
        statistics: {
          total_categories: categories.length,
          total_products: totalProducts,
          products_single_price: totalProducts - productsWithVariants,
          products_with_variants: productsWithVariants,
          products_need_review: categories.reduce(
            (sum, cat) => sum + cat.products.filter(p => p.needs_review).length,
            0
          ),
          average_confidence: 1.0,
          addons_found: addons.length,
        },
      },
      editedCategories: categories,
      editedAddons: addons,
      step: 2,
      error: null,
    }))
  }, [])

  // Handle review completion
  const handleReviewComplete = useCallback((
    categories: ExtractedCategory[],
    addons: ExtractedAddon[]
  ) => {
    setState(prev => ({
      ...prev,
      editedCategories: categories,
      editedAddons: addons,
      step: 3,
      error: null,
    }))
  }, [])

  // Handle save completion
  const handleSaveComplete = useCallback((results: {
    categoriesCreated: number
    productsCreated: number
    variantsCreated: number
  }) => {
    setState(prev => ({
      ...prev,
      saveResults: results,
      step: 4,
      isSaving: false,
      error: null,
    }))
  }, [])

  // Handle save error
  const handleSaveError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      isSaving: false,
      error,
    }))
  }, [])

  // Go back to previous step
  const handleBack = useCallback(() => {
    setState(prev => {
      if (prev.step === 1) return prev
      return {
        ...prev,
        step: (prev.step - 1) as WizardStep,
        error: null,
      }
    })
  }, [])

  // Reset wizard
  const handleReset = useCallback(() => {
    setState(initialState)
  }, [])

  // Navigate to products page
  const handleFinish = useCallback(() => {
    router.push(`/${locale}/provider/products`)
  }, [router, locale])

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = state.step === step.number
            const isCompleted = state.step > step.number
            const isLast = index === steps.length - 1

            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 text-center max-w-[80px] ${
                      isActive ? 'text-primary font-medium' : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                      isCompleted ? 'bg-green-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{state.error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {state.step === 1 && (
          <UploadStep
            providerId={providerId}
            businessType={businessType}
            onComplete={handleUploadComplete}
          />
        )}

        {state.step === 2 && (
          <ReviewStep
            categories={state.editedCategories}
            addons={state.editedAddons}
            warnings={state.analysisResult?.warnings || []}
            statistics={state.analysisResult?.statistics || null}
            onComplete={handleReviewComplete}
            onBack={handleBack}
          />
        )}

        {state.step === 3 && (
          <ConfirmStep
            providerId={providerId}
            importId={state.importId!}
            categories={state.editedCategories}
            addons={state.editedAddons}
            onComplete={handleSaveComplete}
            onError={handleSaveError}
            onBack={handleBack}
          />
        )}

        {state.step === 4 && state.saveResults && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {locale === 'ar' ? 'تم بنجاح!' : 'Success!'}
            </h2>

            <p className="text-slate-600 mb-6">
              {locale === 'ar'
                ? 'تم استيراد المنتجات بنجاح'
                : 'Products have been imported successfully'}
            </p>

            {/* Results Summary */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 inline-block">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {state.saveResults.categoriesCreated}
                  </div>
                  <div className="text-xs text-slate-500">
                    {locale === 'ar' ? 'أقسام' : 'Categories'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {state.saveResults.productsCreated}
                  </div>
                  <div className="text-xs text-slate-500">
                    {locale === 'ar' ? 'منتجات' : 'Products'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {state.saveResults.variantsCreated}
                  </div>
                  <div className="text-xs text-slate-500">
                    {locale === 'ar' ? 'أحجام/خيارات' : 'Variants'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {locale === 'ar' ? 'استيراد ملف آخر' : 'Import Another File'}
              </button>
              <button
                onClick={handleFinish}
                className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
              >
                {locale === 'ar' ? 'عرض المنتجات' : 'View Products'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
