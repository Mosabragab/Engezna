'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  Plus,
  Send,
  X,
  FileText,
  Mic,
  Image as ImageIcon,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Volume2,
  Copy,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PricingItemRow } from './PricingItemRow'
import { PricingSummary } from './PricingSummary'
import type {
  CustomOrderItem,
  CustomOrderRequestWithItems,
  PriceHistoryItem,
  ItemAvailabilityStatus,
} from '@/types/custom-order'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface PricingNotepadProps {
  request: CustomOrderRequestWithItems
  priceHistory?: PriceHistoryItem[]
  onSubmitPricing: (
    items: Omit<CustomOrderItem, 'id' | 'request_id' | 'order_id' | 'created_at' | 'updated_at'>[],
    deliveryFee: number
  ) => Promise<void>
  onCancel: () => void
  loading?: boolean
  className?: string
}

type ItemFormData = Partial<CustomOrderItem> & {
  tempId: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function createEmptyItem(): ItemFormData {
  return {
    tempId: generateTempId(),
    item_name_ar: '',
    item_name_en: null,
    quantity: 1,
    unit_type: 'piece',
    unit_price: 0,
    total_price: 0,
    availability_status: 'available',
    display_order: 0,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Customer Order Panel
// ═══════════════════════════════════════════════════════════════════════════════

interface CustomerOrderPanelProps {
  request: CustomOrderRequestWithItems
  onCopyText: (text: string) => void
}

function CustomerOrderPanel({ request, onCopyText }: CustomerOrderPanelProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Get display text
  const displayText = request.original_text || request.transcribed_text || ''
  const hasVoice = !!request.voice_url
  const hasImages = request.image_urls && request.image_urls.length > 0

  // Parse text into items (split by newlines or common separators)
  const textItems = displayText
    .split(/[\n,،]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Handle audio playback
  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
              {isRTL ? 'طلب العميل' : 'Customer Order'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {request.input_type === 'text' && (
              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {isRTL ? 'نص' : 'Text'}
              </span>
            )}
            {request.input_type === 'voice' && (
              <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Mic className="w-3 h-3" />
                {isRTL ? 'صوت' : 'Voice'}
              </span>
            )}
            {request.input_type === 'image' && (
              <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {isRTL ? 'صور' : 'Images'}
              </span>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="font-medium">{request.broadcast?.customer?.full_name}</span>
          {request.broadcast?.customer?.phone && (
            <span className="ms-2">({request.broadcast.customer.phone})</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Voice Player */}
        {hasVoice && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAudio}
                className="w-12 h-12 bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ms-0.5" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {isRTL ? 'تسجيل صوتي' : 'Voice Recording'}
                  </span>
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                  {isRTL ? 'اضغط للاستماع' : 'Click to listen'}
                </p>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={request.voice_url || ''}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        {/* Images */}
        {hasImages && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isRTL ? 'الصور المرفقة' : 'Attached Images'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {request.image_urls?.map((url, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    'aspect-square rounded-lg overflow-hidden border-2 transition-all',
                    currentImageIndex === index
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  )}
                >
                  <img
                    src={url}
                    alt={`${isRTL ? 'صورة' : 'Image'} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            {/* Larger preview of selected image */}
            {request.image_urls?.[currentImageIndex] && (
              <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img
                  src={request.image_urls[currentImageIndex]}
                  alt={`${isRTL ? 'معاينة' : 'Preview'}`}
                  className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900"
                />
              </div>
            )}
          </div>
        )}

        {/* Text Items */}
        {displayText && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isRTL ? 'قائمة الطلب' : 'Order List'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {textItems.length} {isRTL ? 'عناصر' : 'items'}
              </span>
            </div>

            <div className="space-y-2">
              {textItems.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span className="w-6 h-6 bg-primary/10 dark:bg-primary/20 text-primary rounded-md flex items-center justify-center text-xs font-medium shrink-0">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-slate-700 dark:text-slate-300 text-sm">
                    {item}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onCopyText(item)}
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 transition-opacity"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Notes */}
        {request.customer_notes && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {isRTL ? 'ملاحظات العميل' : 'Customer Notes'}
              </span>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {request.customer_notes}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function PricingNotepad({
  request,
  priceHistory = [],
  onSubmitPricing,
  onCancel,
  loading = false,
  className,
}: PricingNotepadProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  // State
  const [items, setItems] = useState<ItemFormData[]>(() => {
    // Initialize with existing items or empty
    if (request.items && request.items.length > 0) {
      return request.items.map((item) => ({
        ...item,
        tempId: generateTempId(),
      }))
    }
    return [createEmptyItem()]
  })
  const [deliveryFee, setDeliveryFee] = useState(request.delivery_fee || 0)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Price history lookup
  const getPriceHistoryForItem = useCallback(
    (itemName: string): PriceHistoryItem | null => {
      if (!itemName) return null
      const normalized = itemName.toLowerCase().trim()
      return (
        priceHistory.find(
          (h) =>
            h.item_name_ar.toLowerCase().includes(normalized) ||
            normalized.includes(h.item_name_ar.toLowerCase())
        ) || null
      )
    },
    [priceHistory]
  )

  // Item management
  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()])
  }, [])

  const updateItem = useCallback((index: number, updates: Partial<ItemFormData>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    )
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Copy customer text to new item
  const handleCopyCustomerText = useCallback((text: string) => {
    const newItem = createEmptyItem()
    newItem.item_name_ar = text
    newItem.original_customer_text = text
    setItems((prev) => [...prev, newItem])
  }, [])

  // Calculate totals
  const validItems = items.filter(
    (item) => item.item_name_ar && item.availability_status !== 'unavailable'
  )
  const subtotal = validItems.reduce((sum, item) => {
    if (item.availability_status === 'substituted' && item.substitute_total_price) {
      return sum + item.substitute_total_price
    }
    return sum + (item.total_price || 0)
  }, 0)
  const total = subtotal + deliveryFee

  // Validation
  const isValid = items.some(
    (item) => item.item_name_ar && item.quantity && item.unit_price
  )

  // Submit handling
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const submitItems = items
        .filter((item) => item.item_name_ar)
        .map((item, index) => ({
          original_customer_text: item.original_customer_text || null,
          item_name_ar: item.item_name_ar!,
          item_name_en: item.item_name_en || null,
          description_ar: item.description_ar || null,
          description_en: item.description_en || null,
          unit_type: item.unit_type || null,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total_price: item.total_price || 0,
          availability_status: item.availability_status || 'available',
          substitute_name_ar: item.substitute_name_ar || null,
          substitute_name_en: item.substitute_name_en || null,
          substitute_description: item.substitute_description || null,
          substitute_quantity: item.substitute_quantity || null,
          substitute_unit_type: item.substitute_unit_type || null,
          substitute_unit_price: item.substitute_unit_price || null,
          substitute_total_price: item.substitute_total_price || null,
          merchant_notes: item.merchant_notes || null,
          display_order: index,
        }))

      await onSubmitPricing(submitItems, deliveryFee)
      setShowConfirmDialog(false)
    } catch (error) {
      console.error('Failed to submit pricing:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Reset form
  const handleReset = () => {
    setItems([createEmptyItem()])
    setDeliveryFee(request.delivery_fee || 0)
  }

  return (
    <div className={cn('flex flex-col lg:flex-row gap-4 h-full', className)}>
      {/* Left Panel - Customer Order */}
      <div className="lg:w-2/5 xl:w-1/3 h-[300px] lg:h-full">
        <CustomerOrderPanel request={request} onCopyText={handleCopyCustomerText} />
      </div>

      {/* Right Panel - Pricing Form */}
      <div className="lg:w-3/5 xl:w-2/3 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {isRTL ? 'جدول التسعير' : 'Pricing Table'}
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              ({items.length} {isRTL ? 'صنف' : 'items'})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={loading || submitting}
              className="gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              {isRTL ? 'إعادة' : 'Reset'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={loading || submitting}
            >
              <X className="w-4 h-4 me-1" />
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <PricingItemRow
                key={item.tempId}
                index={index}
                item={item}
                priceHistory={getPriceHistoryForItem(item.item_name_ar || '')}
                onUpdate={(updates) => updateItem(index, updates)}
                onRemove={() => removeItem(index)}
                disabled={loading || submitting}
                autoFocus={index === items.length - 1 && items.length > 1}
              />
            ))}
          </AnimatePresence>

          {/* Add Item Button */}
          <motion.button
            type="button"
            onClick={addItem}
            disabled={loading || submitting}
            className={cn(
              'w-full p-4 rounded-xl border-2 border-dashed transition-all',
              'flex items-center justify-center gap-2',
              'text-slate-500 hover:text-primary hover:border-primary',
              'dark:text-slate-400 dark:hover:text-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">
              {isRTL ? 'إضافة صنف جديد' : 'Add New Item'}
            </span>
          </motion.button>
        </div>

        {/* Summary */}
        <PricingSummary
          items={items as CustomOrderItem[]}
          deliveryFee={deliveryFee}
          onDeliveryFeeChange={setDeliveryFee}
          showMerchantPayout={true}
        />

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <Clock className="w-4 h-4 inline-block me-1" />
            {isRTL ? 'المهلة: ' : 'Deadline: '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {request.pricing_expires_at
                ? new Date(request.pricing_expires_at).toLocaleTimeString(locale)
                : '-'}
            </span>
          </div>

          <Button
            type="button"
            onClick={() => setShowConfirmDialog(true)}
            disabled={!isValid || loading || submitting}
            className="gap-2 px-6"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isRTL ? 'إرسال التسعيرة' : 'Send Quote'}
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {isRTL ? 'تأكيد إرسال التسعيرة' : 'Confirm Quote Submission'}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? 'هل أنت متأكد من إرسال هذه التسعيرة للعميل؟ لا يمكن التراجع بعد الإرسال.'
                : 'Are you sure you want to send this quote to the customer? This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                {isRTL ? 'عدد الأصناف' : 'Items'}
              </span>
              <span className="font-medium">{validItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                {isRTL ? 'المجموع' : 'Subtotal'}
              </span>
              <span className="font-medium">
                {subtotal.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                {isRTL ? 'التوصيل' : 'Delivery'}
              </span>
              <span className="font-medium">
                {deliveryFee.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
              </span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between">
              <span className="font-semibold">
                {isRTL ? 'الإجمالي' : 'Total'}
              </span>
              <span className="font-bold text-primary">
                {total.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={submitting}
            >
              {isRTL ? 'مراجعة' : 'Review'}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isRTL ? 'تأكيد الإرسال' : 'Confirm & Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PricingNotepad
