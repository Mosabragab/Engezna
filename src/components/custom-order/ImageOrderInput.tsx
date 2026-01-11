'use client'

import { useState, useRef, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  Camera,
  ImagePlus,
  X,
  ZoomIn,
  Upload,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { ImageOrderInputProps } from '@/types/custom-order'
import { MAX_ORDER_IMAGES } from '@/types/custom-order'

interface ExtendedImageOrderInputProps extends ImageOrderInputProps {
  className?: string
}

interface PreviewImage {
  file: File
  dataUrl: string
}

export function ImageOrderInput({
  images,
  onImagesChange,
  maxImages = MAX_ORDER_IMAGES,
  disabled = false,
  className,
}: ExtendedImageOrderInputProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<PreviewImage[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const canAddMore = images.length < maxImages

  // Process files
  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)

      const fileArray = Array.from(files)
      const validFiles: File[] = []
      const newPreviews: PreviewImage[] = []

      for (const file of fileArray) {
        // Check file type
        if (!file.type.startsWith('image/')) {
          setError(
            isRTL
              ? 'يرجى اختيار صور فقط'
              : 'Please select images only'
          )
          continue
        }

        // Check file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError(
            isRTL
              ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت'
              : 'Image size must be less than 5MB'
          )
          continue
        }

        // Check limit
        if (images.length + validFiles.length >= maxImages) {
          setError(
            isRTL
              ? `الحد الأقصى ${maxImages} صور`
              : `Maximum ${maxImages} images`
          )
          break
        }

        validFiles.push(file)

        // Create preview
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.readAsDataURL(file)
        })

        newPreviews.push({ file, dataUrl })
      }

      if (validFiles.length > 0) {
        onImagesChange([...images, ...validFiles])
        setPreviews([...previews, ...newPreviews])
      }
    },
    [images, previews, maxImages, onImagesChange, isRTL]
  )

  // Handle file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  // Remove image
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    onImagesChange(newImages)
    setPreviews(newPreviews)
    setError(null)
  }

  // Open preview
  const openPreview = (dataUrl: string) => {
    setSelectedPreview(dataUrl)
    setPreviewOpen(true)
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative bg-white rounded-2xl border-2 border-dashed p-6 transition-all duration-200 text-center',
          isDragging
            ? 'border-primary bg-primary/5'
            : canAddMore
            ? 'border-slate-300 hover:border-primary/50'
            : 'border-slate-200 bg-slate-50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center',
              isDragging ? 'bg-primary/10' : 'bg-slate-100'
            )}
          >
            <ImagePlus
              className={cn(
                'w-8 h-8',
                isDragging ? 'text-primary' : 'text-slate-400'
              )}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700">
              {isRTL ? 'اسحب الصور هنا أو' : 'Drag images here or'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isRTL
                ? `PNG, JPG, WebP حتى 5 ميجا • الحد الأقصى ${maxImages} صور`
                : `PNG, JPG, WebP up to 5MB • Max ${maxImages} images`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || !canAddMore}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {isRTL ? 'اختر ملفات' : 'Choose Files'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || !canAddMore}
              className="gap-2"
            >
              <Camera className="w-4 h-4" />
              {isRTL ? 'التقط صورة' : 'Take Photo'}
            </Button>
          </div>
        </div>

        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Previews Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          <AnimatePresence>
            {previews.map((preview, index) => (
              <motion.div
                key={preview.dataUrl}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square group"
              >
                <img
                  src={preview.dataUrl}
                  alt={`${isRTL ? 'صورة' : 'Image'} ${index + 1}`}
                  className="w-full h-full object-cover rounded-xl border border-slate-200"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => openPreview(preview.dataUrl)}
                    className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={disabled}
                    className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Image number badge */}
                <div className="absolute top-1 start-1 w-5 h-5 bg-primary text-white text-xs font-medium rounded-md flex items-center justify-center">
                  {index + 1}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add More Button */}
          {canAddMore && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className={cn(
                'aspect-square border-2 border-dashed border-slate-300 rounded-xl',
                'flex flex-col items-center justify-center gap-1',
                'text-slate-400 hover:border-primary hover:text-primary',
                'transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs">{isRTL ? 'أضف' : 'Add'}</span>
            </motion.button>
          )}
        </div>
      )}

      {/* Counter */}
      {previews.length > 0 && (
        <p className="text-sm text-slate-500 text-center">
          {isRTL
            ? `${previews.length} من ${maxImages} صور`
            : `${previews.length} of ${maxImages} images`}
        </p>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl p-2">
          {selectedPreview && (
            <img
              src={selectedPreview}
              alt={isRTL ? 'معاينة الصورة' : 'Image preview'}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
