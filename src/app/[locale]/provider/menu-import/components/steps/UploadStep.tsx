'use client'

import { useState, useCallback, useRef } from 'react'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import {
  Upload,
  Image as ImageIcon,
  X,
  AlertCircle,
  Loader2,
  Camera,
  FileSpreadsheet,
} from 'lucide-react'
import type { BusinessCategoryCode } from '@/lib/constants/categories'
import type { UploadedImage, ExtractedCategory, ExtractedAddon } from '@/types/menu-import'
import { ExcelImportWizard } from '../ExcelImportWizard'

interface UploadStepProps {
  providerId: string
  businessType: BusinessCategoryCode
  onComplete: (images: UploadedImage[], importId: string) => void
  onExcelComplete?: (categories: ExtractedCategory[], addons: ExtractedAddon[], importId: string) => void
}

type ImportMode = 'images' | 'excel'

const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function UploadStep({ providerId, businessType, onComplete, onExcelComplete }: UploadStepProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importMode, setImportMode] = useState<ImportMode>('images')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    setError(null)
    const newFiles: File[] = []
    const newPreviews: string[] = []

    Array.from(selectedFiles).forEach(file => {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(
          locale === 'ar'
            ? 'نوع الملف غير مدعوم. استخدم JPEG, PNG, أو WebP'
            : 'File type not supported. Use JPEG, PNG, or WebP'
        )
        return
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(
          locale === 'ar'
            ? 'حجم الملف كبير جداً. الحد الأقصى 10MB'
            : 'File too large. Maximum size is 10MB'
        )
        return
      }

      // Check total files limit
      if (files.length + newFiles.length >= MAX_FILES) {
        setError(
          locale === 'ar'
            ? `الحد الأقصى ${MAX_FILES} صور`
            : `Maximum ${MAX_FILES} images allowed`
        )
        return
      }

      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    })

    setFiles(prev => [...prev, ...newFiles])
    setPreviews(prev => [...prev, ...newPreviews])
  }, [files.length, locale])

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // Remove a file
  const removeFile = useCallback((index: number) => {
    URL.revokeObjectURL(previews[index])
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }, [previews])

  // Upload files
  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      setError(locale === 'ar' ? 'يرجى اختيار صورة واحدة على الأقل' : 'Please select at least one image')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const supabase = createClient()

      // Create import session
      const { data: importData, error: importError } = await supabase
        .from('menu_imports')
        .insert({
          provider_id: providerId,
          status: 'uploading',
          uploaded_images: [],
          extracted_data: {
            categories: [],
            addons: [],
            warnings: [],
            statistics: {
              total_categories: 0,
              total_products: 0,
              products_single_price: 0,
              products_with_variants: 0,
              products_need_review: 0,
              average_confidence: 0,
              addons_found: 0,
            },
          },
          total_items: 0,
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

      const importId = importData.id
      const uploadedImages: UploadedImage[] = []

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileId = `${Date.now()}-${i}`
        const storagePath = `menu-imports/${providerId}/${importId}/${fileId}.${file.name.split('.').pop()}`

        const { error: uploadError } = await supabase.storage
          .from('menu-imports')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('menu-imports')
          .getPublicUrl(storagePath)

        uploadedImages.push({
          id: fileId,
          previewUrl: previews[i],
          storagePath,
          publicUrl: urlData.publicUrl,
          originalName: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
        })

        setUploadProgress(Math.round(((i + 1) / files.length) * 100))
      }

      // Update import with uploaded images
      await supabase
        .from('menu_imports')
        .update({
          uploaded_images: uploadedImages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', importId)

      onComplete(uploadedImages, importId)
    } catch (err) {
      console.error('Upload error:', err)
      setError(
        err instanceof Error
          ? err.message
          : locale === 'ar' ? 'فشل في رفع الصور' : 'Failed to upload images'
      )
    } finally {
      setUploading(false)
    }
  }, [files, previews, providerId, locale, onComplete])

  // Handle Excel import completion
  const handleExcelComplete = useCallback(async (categories: ExtractedCategory[], addons: ExtractedAddon[]) => {
    try {
      setUploading(true)
      const supabase = createClient()

      // Create import session for Excel
      const { data: importData, error: importError } = await supabase
        .from('menu_imports')
        .insert({
          provider_id: providerId,
          status: 'review', // Skip processing step for Excel
          uploaded_images: [],
          extracted_data: {
            categories,
            addons,
            warnings: [],
            statistics: {
              total_categories: categories.length,
              total_products: categories.reduce((sum, cat) => sum + cat.products.length, 0),
              products_single_price: categories.reduce(
                (sum, cat) => sum + cat.products.filter(p => p.pricing_type === 'single').length,
                0
              ),
              products_with_variants: categories.reduce(
                (sum, cat) => sum + cat.products.filter(p => p.variants && p.variants.length > 0).length,
                0
              ),
              products_need_review: categories.reduce(
                (sum, cat) => sum + cat.products.filter(p => p.needs_review).length,
                0
              ),
              average_confidence: 1.0,
              addons_found: addons.length,
            },
          },
          total_items: categories.reduce((sum, cat) => sum + cat.products.length, 0),
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

      // Call the Excel complete callback
      if (onExcelComplete) {
        onExcelComplete(categories, addons, importData.id)
      }
    } catch (err) {
      console.error('Excel import error:', err)
      setError(
        err instanceof Error
          ? err.message
          : locale === 'ar' ? 'فشل في استيراد البيانات' : 'Failed to import data'
      )
    } finally {
      setUploading(false)
    }
  }, [providerId, locale, onExcelComplete])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {locale === 'ar' ? 'استيراد المنيو' : 'Import Menu'}
        </h2>
        <p className="text-slate-600">
          {locale === 'ar'
            ? 'اختر طريقة استيراد المنيو - صور أو ملف Excel'
            : 'Choose how to import your menu - images or Excel file'}
        </p>
      </div>

      {/* Import Mode Tabs */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => setImportMode('images')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            importMode === 'images'
              ? 'bg-primary text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Camera className="w-5 h-5" />
          {locale === 'ar' ? 'صور المنيو' : 'Menu Images'}
        </button>
        <button
          onClick={() => setImportMode('excel')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
            importMode === 'excel'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          {locale === 'ar' ? 'ملف Excel' : 'Excel File'}
        </button>
      </div>

      {/* Excel Import Mode */}
      {importMode === 'excel' && (
        <ExcelImportWizard
          onComplete={handleExcelComplete}
          onCancel={() => setImportMode('images')}
        />
      )}

      {/* Image Import Mode */}
      {importMode === 'images' && (
        <>
          {/* Subtitle for images */}
          <p className="text-center text-sm text-slate-500 mb-4">
            {locale === 'ar'
              ? 'ارفع صور المنيو وسيقوم الذكاء الاصطناعي باستخراج المنتجات والأسعار'
              : 'Upload menu images and AI will extract products and prices'}
          </p>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          files.length > 0
            ? 'border-primary/30 bg-primary/5'
            : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={e => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>

          <p className="text-slate-700 font-medium mb-1">
            {locale === 'ar'
              ? 'اسحب الصور هنا أو انقر للاختيار'
              : 'Drag images here or click to select'}
          </p>

          <p className="text-sm text-slate-500">
            {locale === 'ar'
              ? `حتى ${MAX_FILES} صور - JPEG, PNG, WebP - حتى 10MB`
              : `Up to ${MAX_FILES} images - JPEG, PNG, WebP - up to 10MB`}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Preview Grid */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-900">
              {locale === 'ar' ? 'الصور المختارة' : 'Selected Images'}
              <span className="text-slate-500 font-normal ms-2">
                ({files.length}/{MAX_FILES})
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 group"
              >
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">{files[index].name}</p>
                </div>
              </div>
            ))}

            {/* Add More Button */}
            {files.length < MAX_FILES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-slate-50 transition-colors"
              >
                <Camera className="w-6 h-6 text-slate-400" />
                <span className="text-xs text-slate-500">
                  {locale === 'ar' ? 'إضافة المزيد' : 'Add More'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {locale === 'ar' ? `جاري الرفع... ${uploadProgress}%` : `Uploading... ${uploadProgress}%`}
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              {locale === 'ar' ? 'رفع وتحليل' : 'Upload & Analyze'}
            </>
          )}
        </button>
      </div>
        </>
      )}
    </div>
  )
}
