'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { ImportWizard } from './components/ImportWizard'
import { ArrowRight, ArrowLeft, Loader2, FileUp } from 'lucide-react'
import Link from 'next/link'
import type { BusinessCategoryCode } from '@/lib/constants/categories'

interface Provider {
  id: string
  name_ar: string
  name_en: string
  category: BusinessCategoryCode
  status: string
}

export default function MenuImportPage() {
  const locale = useLocale()
  const router = useRouter()
  const isRTL = locale === 'ar'

  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndLoadProvider()
  }, [])

  async function checkAuthAndLoadProvider() {
    const supabase = createClient()

    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push(`/${locale}/provider/login`)
        return
      }

      // Load provider data
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('id, name_ar, name_en, category, status')
        .eq('owner_id', user.id)
        .single()

      if (providerError || !providerData) {
        setError(locale === 'ar' ? 'لم يتم العثور على المتجر' : 'Store not found')
        setLoading(false)
        return
      }

      // Check if provider is approved
      if (!['open', 'closed', 'temporarily_paused', 'on_vacation'].includes(providerData.status)) {
        setError(
          locale === 'ar'
            ? 'يجب أن يكون المتجر معتمداً لاستخدام هذه الميزة'
            : 'Store must be approved to use this feature'
        )
        setLoading(false)
        return
      }

      setProvider(providerData as Provider)
    } catch {
      setError(locale === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-600">
            {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !provider) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {locale === 'ar' ? 'خطأ' : 'Error'}
          </h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href={`/${locale}/provider`}
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {locale === 'ar' ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/provider/products`}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {isRTL ? (
                <ArrowRight className="w-5 h-5 text-slate-600" />
              ) : (
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              )}
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">
                  {locale === 'ar' ? 'استيراد المنتجات' : 'Import Products'}
                </h1>
                <p className="text-sm text-slate-500">
                  {locale === 'ar' ? provider.name_ar : provider.name_en}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <ImportWizard
          providerId={provider.id}
          businessType={provider.category}
          providerName={locale === 'ar' ? provider.name_ar : provider.name_en}
        />
      </main>
    </div>
  )
}
