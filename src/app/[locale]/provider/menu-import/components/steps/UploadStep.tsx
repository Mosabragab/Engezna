'use client'

import { useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import {
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Upload,
  Settings,
  Eye,
  ArrowLeft,
  ArrowRight,
  Check,
} from 'lucide-react'
import type { BusinessCategoryCode } from '@/lib/constants/categories'
import type { ExtractedCategory, ExtractedAddon } from '@/types/menu-import'
import {
  readExcelFile,
  detectColumns,
  transformExcelData,
  applyManualMapping,
  getColumnTypeOptions,
  type DetectionResult,
  type ParsedExcelData,
} from '@/lib/utils/excel-import'

interface UploadStepProps {
  providerId: string
  businessType: BusinessCategoryCode
  onComplete: (categories: ExtractedCategory[], addons: ExtractedAddon[], importId: string) => void
}

type WizardStep = 'upload' | 'mapping' | 'preview'

export function UploadStep({ providerId, businessType, onComplete }: UploadStepProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  // Wizard state
  const [step, setStep] = useState<WizardStep>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // File data
  const [fileName, setFileName] = useState<string>('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<(string | number | null)[][]>([])

  // Mapping state
  const [detection, setDetection] = useState<DetectionResult | null>(null)
  const [columnAssignments, setColumnAssignments] = useState<Record<number, string>>({})

  // Parsed data
  const [parsedData, setParsedData] = useState<ParsedExcelData | null>(null)

  // Handle file upload
  const handleFileSelect = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const result = await readExcelFile(file)
      setFileName(file.name)
      setHeaders(result.headers)
      setRows(result.rows)

      // Auto-detect columns
      const detected = detectColumns(result.headers)
      setDetection(detected)

      // Initialize column assignments from detection
      const initialAssignments: Record<number, string> = {}
      if (detected.mapping.category !== undefined && detected.mapping.category >= 0) {
        initialAssignments[detected.mapping.category] = 'category'
      }
      if (detected.mapping.product >= 0) {
        initialAssignments[detected.mapping.product] = 'product'
      }
      if (detected.mapping.description !== undefined && detected.mapping.description >= 0) {
        initialAssignments[detected.mapping.description] = 'description'
      }
      if (detected.mapping.name_en !== undefined && detected.mapping.name_en >= 0) {
        initialAssignments[detected.mapping.name_en] = 'name_en'
      }
      if (detected.mapping.price !== undefined && detected.mapping.price >= 0) {
        initialAssignments[detected.mapping.price] = 'price'
      }
      for (const variant of detected.mapping.variants) {
        initialAssignments[variant.column] = variant.key
      }

      setColumnAssignments(initialAssignments)
      setStep('mapping')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في قراءة الملف')
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle column assignment change
  const handleColumnChange = useCallback((columnIndex: number, value: string) => {
    setColumnAssignments((prev) => ({
      ...prev,
      [columnIndex]: value,
    }))
  }, [])

  // Apply mapping and preview
  const handleApplyMapping = useCallback(() => {
    setLoading(true)
    setError(null)

    try {
      // Apply manual mapping
      const result = applyManualMapping(headers, columnAssignments)

      if (result.mapping.product < 0) {
        setError(locale === 'ar' ? 'يجب تحديد عمود اسم المنتج' : 'Product name column is required')
        setLoading(false)
        return
      }

      // Transform data
      const parsed = transformExcelData(rows, result.mapping, result.pricingType)
      setParsedData(parsed)
      setDetection(result)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في معالجة البيانات')
    } finally {
      setLoading(false)
    }
  }, [headers, columnAssignments, rows, locale])

  // Finish and send data
  const handleFinish = useCallback(async () => {
    if (!parsedData) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Create import session
      const { data: importData, error: importError } = await supabase
        .from('menu_imports')
        .insert({
          provider_id: providerId,
          status: 'review',
          uploaded_images: [],
          extracted_data: {
            categories: parsedData.categories,
            addons: [],
            warnings: parsedData.warnings.map(w => ({ type: 'other', message: w, severity: 'low' })),
            statistics: {
              total_categories: parsedData.categories.length,
              total_products: parsedData.totalProducts,
              products_single_price: parsedData.categories.reduce(
                (sum, cat) => sum + cat.products.filter(p => p.pricing_type === 'single').length,
                0
              ),
              products_with_variants: parsedData.categories.reduce(
                (sum, cat) => sum + cat.products.filter(p => p.variants && p.variants.length > 0).length,
                0
              ),
              products_need_review: parsedData.categories.reduce(
                (sum, cat) => sum + cat.products.filter(p => p.needs_review).length,
                0
              ),
              average_confidence: 1.0,
              addons_found: 0,
            },
          },
          total_items: parsedData.totalProducts,
          reviewed_items: 0,
          products_created: 0,
          products_with_variants: 0,
          retry_count: 0,
        })
        .select()
        .single()

      if (importError || !importData) {
        throw new Error(importError?.message || 'Failed to create import session')
      }

      onComplete(parsedData.categories, [], importData.id)
    } catch (err) {
      console.error('Excel import error:', err)
      setError(
        err instanceof Error
          ? err.message
          : locale === 'ar' ? 'فشل في استيراد البيانات' : 'Failed to import data'
      )
    } finally {
      setLoading(false)
    }
  }, [parsedData, providerId, locale, onComplete])

  // Get step icon
  const getStepIcon = (s: WizardStep) => {
    switch (s) {
      case 'upload':
        return <Upload className="w-4 h-4" />
      case 'mapping':
        return <Settings className="w-4 h-4" />
      case 'preview':
        return <Eye className="w-4 h-4" />
    }
  }

  const steps: { key: WizardStep; label: string }[] = [
    { key: 'upload', label: locale === 'ar' ? 'رفع الملف' : 'Upload' },
    { key: 'mapping', label: locale === 'ar' ? 'تعيين الأعمدة' : 'Mapping' },
    { key: 'preview', label: locale === 'ar' ? 'معاينة' : 'Preview' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === step)

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {locale === 'ar' ? 'استيراد المنيو من Excel' : 'Import Menu from Excel'}
        </h2>
        <p className="text-slate-600">
          {locale === 'ar'
            ? 'ارفع ملف Excel الخاص بالمنيو وسيتم التعرف على الأعمدة تلقائياً'
            : 'Upload your Excel menu file and columns will be detected automatically'}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                index <= currentStepIndex
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {getStepIcon(s.key)}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  index < currentStepIndex ? 'bg-primary' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Step Content */}
      {step === 'upload' && (
        <div>
          <label
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              loading
                ? 'border-slate-200 bg-slate-50'
                : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleChange}
              disabled={loading}
              className="hidden"
            />

            {loading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-slate-600">
                  {locale === 'ar' ? 'جاري قراءة الملف...' : 'Reading file...'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-slate-700 font-medium mb-1">
                  {locale === 'ar'
                    ? 'اسحب الملف هنا أو انقر للاختيار'
                    : 'Drag file here or click to select'}
                </p>
                <p className="text-sm text-slate-500">.xlsx, .xls, .csv</p>
              </div>
            )}
          </label>
        </div>
      )}

      {step === 'mapping' && (
        <ColumnMappingStep
          headers={headers}
          rows={rows}
          columnAssignments={columnAssignments}
          detection={detection}
          onColumnChange={handleColumnChange}
          locale={locale}
        />
      )}

      {step === 'preview' && parsedData && (
        <PreviewStep data={parsedData} locale={locale} />
      )}

      {/* Navigation Buttons */}
      {step !== 'upload' && (
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={() => {
              if (step === 'mapping') {
                setStep('upload')
                setHeaders([])
                setRows([])
                setDetection(null)
                setFileName('')
              } else if (step === 'preview') {
                setStep('mapping')
              }
            }}
            disabled={loading}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {locale === 'ar' ? 'رجوع' : 'Back'}
          </button>

          {step === 'mapping' && (
            <button
              onClick={handleApplyMapping}
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {locale === 'ar' ? 'معاينة البيانات' : 'Preview Data'}
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {locale === 'ar' ? 'استيراد المنتجات' : 'Import Products'}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Column Mapping Sub-Step
interface ColumnMappingStepProps {
  headers: string[]
  rows: (string | number | null)[][]
  columnAssignments: Record<number, string>
  detection: DetectionResult | null
  onColumnChange: (columnIndex: number, value: string) => void
  locale: string
}

function ColumnMappingStep({
  headers,
  rows,
  columnAssignments,
  detection,
  onColumnChange,
  locale,
}: ColumnMappingStepProps) {
  const columnOptions = getColumnTypeOptions()
  const sampleRows = rows.slice(0, 3)

  // Get pricing type label
  const getPricingTypeLabel = (type: string) => {
    switch (type) {
      case 'single':
        return locale === 'ar' ? 'سعر واحد' : 'Single Price'
      case 'sizes':
        return locale === 'ar' ? 'أحجام (S/M/L)' : 'Sizes (S/M/L)'
      case 'weights':
        return locale === 'ar' ? 'أوزان' : 'Weights'
      case 'options':
        return locale === 'ar' ? 'خيارات' : 'Options'
      default:
        return type
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900 mb-1">
          {locale === 'ar' ? 'تعيين الأعمدة' : 'Column Mapping'}
        </h3>
        <p className="text-sm text-slate-600">
          {locale === 'ar'
            ? 'تحقق من تعيين الأعمدة وقم بتعديلها إذا لزم الأمر'
            : 'Verify column assignments and adjust if needed'}
        </p>

        {detection && (
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="text-slate-600">
              {locale === 'ar' ? 'نوع التسعير المكتشف:' : 'Detected pricing type:'}
            </span>
            <span className="px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
              {getPricingTypeLabel(detection.pricingType)}
            </span>
            <span className="text-slate-500">
              {locale === 'ar' ? `الدقة: ${Math.round(detection.confidence * 100)}%` : `Confidence: ${Math.round(detection.confidence * 100)}%`}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-3 py-2 text-start text-slate-600 font-medium">
                {locale === 'ar' ? 'العمود' : 'Column'}
              </th>
              <th className="px-3 py-2 text-start text-slate-600 font-medium">
                {locale === 'ar' ? 'التعيين' : 'Assignment'}
              </th>
              <th className="px-3 py-2 text-start text-slate-600 font-medium">
                {locale === 'ar' ? 'عينة' : 'Sample'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {headers.map((header, index) => (
              <tr key={index} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-200 rounded text-xs flex items-center justify-center font-mono">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="font-medium text-slate-900">{header || '(فارغ)'}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={columnAssignments[index] || 'ignore'}
                    onChange={(e) => onColumnChange(index, e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {columnOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {locale === 'ar' ? opt.label_ar : opt.label_en}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-slate-600">
                  <div className="max-w-[200px] truncate">
                    {sampleRows
                      .map((row) => row[index])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join(', ') || '-'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Suggestions */}
      {detection?.suggestions && detection.suggestions.length > 0 && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            {detection.suggestions.join(' • ')}
          </p>
        </div>
      )}
    </div>
  )
}

// Preview Sub-Step
interface PreviewStepProps {
  data: ParsedExcelData
  locale: string
}

function PreviewStep({ data, locale }: PreviewStepProps) {
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900 mb-1">
          {locale === 'ar' ? 'معاينة البيانات' : 'Data Preview'}
        </h3>
        <p className="text-sm text-slate-600">
          {locale === 'ar'
            ? 'راجع البيانات المستخرجة قبل الاستيراد'
            : 'Review extracted data before importing'}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-blue-700">{data.categories.length}</div>
          <div className="text-xs text-blue-600">
            {locale === 'ar' ? 'أقسام' : 'Categories'}
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-green-700">{data.totalProducts}</div>
          <div className="text-xs text-green-600">
            {locale === 'ar' ? 'منتجات' : 'Products'}
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-amber-700">{data.warnings.length}</div>
          <div className="text-xs text-amber-600">
            {locale === 'ar' ? 'تنبيهات' : 'Warnings'}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800 mb-2">
            {locale === 'ar' ? 'تنبيهات:' : 'Warnings:'}
          </p>
          <ul className="text-sm text-amber-700 space-y-1">
            {data.warnings.slice(0, 5).map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
            {data.warnings.length > 5 && (
              <li className="text-amber-600">
                {locale === 'ar'
                  ? `و ${data.warnings.length - 5} تنبيهات أخرى...`
                  : `And ${data.warnings.length - 5} more...`}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Categories Preview */}
      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
        {data.categories.map((category, catIndex) => (
          <div key={catIndex} className="border-b border-slate-100 last:border-b-0">
            <div className="bg-slate-50 px-4 py-2 font-medium text-slate-900 flex items-center justify-between">
              <span>{category.name_ar}</span>
              <span className="text-sm text-slate-500">
                {category.products.length} {locale === 'ar' ? 'منتج' : 'products'}
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {category.products.slice(0, 3).map((product, prodIndex) => (
                <div key={prodIndex} className="px-4 py-2 flex items-center justify-between">
                  <span className="text-slate-700">{product.name_ar}</span>
                  <span className="text-primary font-medium">
                    {product.pricing_type === 'single'
                      ? `${product.price} ج.م`
                      : `${product.variants?.length || 0} ${locale === 'ar' ? 'خيارات' : 'options'}`}
                  </span>
                </div>
              ))}
              {category.products.length > 3 && (
                <div className="px-4 py-2 text-sm text-slate-500 text-center">
                  {locale === 'ar'
                    ? `و ${category.products.length - 3} منتجات أخرى...`
                    : `And ${category.products.length - 3} more products...`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
