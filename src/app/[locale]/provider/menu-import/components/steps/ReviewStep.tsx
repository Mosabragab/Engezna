'use client'

import { useState, useMemo } from 'react'
import { useLocale } from 'next-intl'
import {
  Check,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Plus,
  ArrowLeft,
  ArrowRight,
  Package,
  Layers,
} from 'lucide-react'
import type {
  ExtractedCategory,
  ExtractedProduct,
  ExtractedAddon,
  AnalysisWarning,
  AnalysisStatistics,
} from '@/types/menu-import'

interface ReviewStepProps {
  categories: ExtractedCategory[]
  addons: ExtractedAddon[]
  warnings: AnalysisWarning[]
  statistics: AnalysisStatistics | null
  onComplete: (categories: ExtractedCategory[], addons: ExtractedAddon[]) => void
  onBack: () => void
}

export function ReviewStep({
  categories: initialCategories,
  addons: initialAddons,
  warnings,
  statistics,
  onComplete,
  onBack,
}: ReviewStepProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  // Local state for editing
  const [categories, setCategories] = useState<ExtractedCategory[]>(initialCategories)
  const [addons, setAddons] = useState<ExtractedAddon[]>(initialAddons)

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(initialCategories.map((_, i) => `cat-${i}`))
  )
  const [editingProduct, setEditingProduct] = useState<{
    categoryIndex: number
    productIndex: number
  } | null>(null)
  const [editingCategory, setEditingCategory] = useState<number | null>(null)

  // Calculate review progress
  const reviewProgress = useMemo(() => {
    let total = 0
    let confirmed = 0

    categories.forEach(cat => {
      if (!cat.isDeleted) {
        cat.products.forEach(prod => {
          if (!prod.isDeleted) {
            total++
            if (prod.isConfirmed || prod.isEdited) confirmed++
          }
        })
      }
    })

    return { total, confirmed, percentage: total > 0 ? Math.round((confirmed / total) * 100) : 0 }
  }, [categories])

  const toggleCategory = (index: number) => {
    const key = `cat-${index}`
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedCategories(newExpanded)
  }

  const confirmProduct = (categoryIndex: number, productIndex: number) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].products[productIndex].isConfirmed = true
    setCategories(newCategories)
  }

  const deleteProduct = (categoryIndex: number, productIndex: number) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].products[productIndex].isDeleted = true
    setCategories(newCategories)
  }

  const restoreProduct = (categoryIndex: number, productIndex: number) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].products[productIndex].isDeleted = false
    setCategories(newCategories)
  }

  const deleteCategory = (categoryIndex: number) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].isDeleted = true
    setCategories(newCategories)
  }

  const restoreCategory = (categoryIndex: number) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].isDeleted = false
    setCategories(newCategories)
  }

  const updateProduct = (
    categoryIndex: number,
    productIndex: number,
    updates: Partial<ExtractedProduct>
  ) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].products[productIndex] = {
      ...newCategories[categoryIndex].products[productIndex],
      ...updates,
      isEdited: true,
    }
    setCategories(newCategories)
  }

  const updateCategory = (categoryIndex: number, updates: Partial<ExtractedCategory>) => {
    const newCategories = [...categories]
    newCategories[categoryIndex] = {
      ...newCategories[categoryIndex],
      ...updates,
      isEdited: true,
    }
    setCategories(newCategories)
  }

  const confirmAllInCategory = (categoryIndex: number) => {
    const newCategories = [...categories]
    newCategories[categoryIndex].products.forEach(prod => {
      if (!prod.isDeleted) {
        prod.isConfirmed = true
      }
    })
    newCategories[categoryIndex].isConfirmed = true
    setCategories(newCategories)
  }

  const handleConfirm = () => {
    onComplete(categories, addons)
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    return `${price.toFixed(2)} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50'
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="p-6">
      {/* Header with Stats */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {locale === 'ar' ? 'مراجعة البيانات المستخرجة' : 'Review Extracted Data'}
        </h2>
        <p className="text-slate-600 text-sm">
          {locale === 'ar'
            ? 'راجع البيانات وقم بتعديلها إذا لزم الأمر، ثم قم بتأكيدها'
            : 'Review the data and edit if necessary, then confirm'}
        </p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-700">{statistics.total_categories}</div>
            <div className="text-sm text-blue-600">
              {locale === 'ar' ? 'أقسام' : 'Categories'}
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-700">{statistics.total_products}</div>
            <div className="text-sm text-green-600">
              {locale === 'ar' ? 'منتجات' : 'Products'}
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-purple-700">{statistics.products_with_variants}</div>
            <div className="text-sm text-purple-600">
              {locale === 'ar' ? 'بأحجام متعددة' : 'With Variants'}
            </div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-700">
              {Math.round(statistics.average_confidence * 100)}%
            </div>
            <div className="text-sm text-orange-600">
              {locale === 'ar' ? 'متوسط الدقة' : 'Avg. Confidence'}
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">
              {locale === 'ar' ? 'تنبيهات' : 'Warnings'}
            </h3>
          </div>
          <ul className="space-y-1">
            {warnings.slice(0, 5).map((warning, i) => (
              <li key={i} className="text-sm text-amber-700">
                • {warning.message}
              </li>
            ))}
            {warnings.length > 5 && (
              <li className="text-sm text-amber-600 font-medium">
                {locale === 'ar'
                  ? `و ${warnings.length - 5} تنبيهات أخرى...`
                  : `And ${warnings.length - 5} more warnings...`}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Review Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-600">
            {locale === 'ar' ? 'تقدم المراجعة' : 'Review Progress'}
          </span>
          <span className="text-sm font-medium text-slate-700">
            {reviewProgress.confirmed}/{reviewProgress.total} ({reviewProgress.percentage}%)
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${reviewProgress.percentage}%` }}
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-4 mb-6">
        {categories.map((category, catIndex) => (
          <div
            key={catIndex}
            className={`border rounded-xl overflow-hidden transition-all ${
              category.isDeleted
                ? 'bg-slate-50 border-slate-200 opacity-60'
                : 'bg-white border-slate-200'
            }`}
          >
            {/* Category Header */}
            <div
              className={`p-4 flex items-center justify-between cursor-pointer ${
                category.isDeleted ? 'bg-slate-100' : 'bg-slate-50'
              }`}
              onClick={() => !category.isDeleted && toggleCategory(catIndex)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                {editingCategory === catIndex ? (
                  <input
                    type="text"
                    value={category.name_ar}
                    onChange={e => updateCategory(catIndex, { name_ar: e.target.value })}
                    onBlur={() => setEditingCategory(null)}
                    onKeyDown={e => e.key === 'Enter' && setEditingCategory(null)}
                    className="px-2 py-1 border rounded text-lg font-semibold"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <div>
                    <h3 className={`font-semibold ${category.isDeleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {category.name_ar}
                      {category.name_en && (
                        <span className="text-slate-500 font-normal text-sm mx-2">
                          ({category.name_en})
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {category.products.filter(p => !p.isDeleted).length}{' '}
                      {locale === 'ar' ? 'منتج' : 'products'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!category.isDeleted && (
                  <>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        confirmAllInCategory(catIndex)
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title={locale === 'ar' ? 'تأكيد الكل' : 'Confirm All'}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setEditingCategory(catIndex)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={locale === 'ar' ? 'تعديل' : 'Edit'}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        deleteCategory(catIndex)
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={locale === 'ar' ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {category.isDeleted && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      restoreCategory(catIndex)
                    }}
                    className="px-3 py-1 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                  >
                    {locale === 'ar' ? 'استعادة' : 'Restore'}
                  </button>
                )}
                {!category.isDeleted && (
                  expandedCategories.has(`cat-${catIndex}`) ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )
                )}
              </div>
            </div>

            {/* Products List */}
            {!category.isDeleted && expandedCategories.has(`cat-${catIndex}`) && (
              <div className="divide-y divide-slate-100">
                {category.products.map((product, prodIndex) => (
                  <ProductRow
                    key={prodIndex}
                    product={product}
                    isEditing={
                      editingProduct?.categoryIndex === catIndex &&
                      editingProduct?.productIndex === prodIndex
                    }
                    locale={locale}
                    onConfirm={() => confirmProduct(catIndex, prodIndex)}
                    onDelete={() => deleteProduct(catIndex, prodIndex)}
                    onRestore={() => restoreProduct(catIndex, prodIndex)}
                    onEdit={() => setEditingProduct({ categoryIndex: catIndex, productIndex: prodIndex })}
                    onSave={() => setEditingProduct(null)}
                    onUpdate={updates => updateProduct(catIndex, prodIndex, updates)}
                    formatPrice={formatPrice}
                    getConfidenceColor={getConfidenceColor}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Addons Section */}
      {addons.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">
            {locale === 'ar' ? 'الإضافات المستخرجة' : 'Extracted Add-ons'}
          </h3>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap gap-2">
              {addons.map((addon, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg"
                >
                  <Plus className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">{addon.name_ar}</span>
                  <span className="text-sm text-primary font-medium">
                    +{formatPrice(addon.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {locale === 'ar' ? 'رجوع' : 'Back'}
        </button>

        <button
          onClick={handleConfirm}
          className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-2"
        >
          {locale === 'ar' ? 'تأكيد وحفظ' : 'Confirm & Save'}
          {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

// Product Row Component
interface ProductRowProps {
  product: ExtractedProduct
  isEditing: boolean
  locale: string
  onConfirm: () => void
  onDelete: () => void
  onRestore: () => void
  onEdit: () => void
  onSave: () => void
  onUpdate: (updates: Partial<ExtractedProduct>) => void
  formatPrice: (price: number | null) => string
  getConfidenceColor: (confidence: number) => string
}

function ProductRow({
  product,
  isEditing,
  locale,
  onConfirm,
  onDelete,
  onRestore,
  onEdit,
  onSave,
  onUpdate,
  formatPrice,
  getConfidenceColor,
}: ProductRowProps) {
  if (product.isDeleted) {
    return (
      <div className="p-4 bg-slate-50 flex items-center justify-between">
        <span className="text-slate-400 line-through">{product.name_ar}</span>
        <button
          onClick={onRestore}
          className="px-3 py-1 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
        >
          {locale === 'ar' ? 'استعادة' : 'Restore'}
        </button>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="p-4 bg-blue-50">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">
                {locale === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'}
              </label>
              <input
                type="text"
                value={product.name_ar}
                onChange={e => onUpdate({ name_ar: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">
                {locale === 'ar' ? 'الاسم بالإنجليزي' : 'English Name'}
              </label>
              <input
                type="text"
                value={product.name_en || ''}
                onChange={e => onUpdate({ name_en: e.target.value || null })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {product.pricing_type === 'single' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">
                  {locale === 'ar' ? 'السعر' : 'Price'}
                </label>
                <input
                  type="number"
                  value={product.price || ''}
                  onChange={e => onUpdate({ price: parseFloat(e.target.value) || null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">
                  {locale === 'ar' ? 'السعر الأصلي' : 'Original Price'}
                </label>
                <input
                  type="number"
                  value={product.original_price || ''}
                  onChange={e => onUpdate({ original_price: parseFloat(e.target.value) || null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder={locale === 'ar' ? 'اختياري' : 'Optional'}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-600 mb-1 block">
              {locale === 'ar' ? 'الوصف' : 'Description'}
            </label>
            <textarea
              value={product.description_ar || ''}
              onChange={e => onUpdate({ description_ar: e.target.value || null })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onSave}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
            >
              {locale === 'ar' ? 'حفظ' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${
        product.isConfirmed || product.isEdited ? 'bg-green-50/50' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
          <Package className="w-4 h-4 text-slate-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 truncate">
              {product.name_ar}
            </span>
            {(product.isConfirmed || product.isEdited) && (
              <Check className="w-4 h-4 text-green-600 shrink-0" />
            )}
            {product.needs_review && (
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
          </div>

          {product.description_ar && (
            <p className="text-sm text-slate-500 truncate">{product.description_ar}</p>
          )}

          <div className="flex items-center gap-2 mt-1">
            {product.pricing_type === 'single' ? (
              <span className="text-sm font-semibold text-primary">
                {formatPrice(product.price)}
              </span>
            ) : (
              <span className="text-sm text-slate-600">
                {product.variants?.length || 0}{' '}
                {locale === 'ar' ? 'خيارات' : 'options'}
              </span>
            )}

            <span
              className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(product.confidence)}`}
            >
              {Math.round(product.confidence * 100)}%
            </span>

            {product.is_popular && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                {locale === 'ar' ? 'شائع' : 'Popular'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!product.isConfirmed && !product.isEdited && (
          <button
            onClick={onConfirm}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title={locale === 'ar' ? 'تأكيد' : 'Confirm'}
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onEdit}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title={locale === 'ar' ? 'تعديل' : 'Edit'}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title={locale === 'ar' ? 'حذف' : 'Delete'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
