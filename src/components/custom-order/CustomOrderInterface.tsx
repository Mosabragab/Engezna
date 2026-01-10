'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  FileText,
  Mic,
  Image as ImageIcon,
  Send,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// Child components
import { TextOrderInput } from './TextOrderInput'
import { VoiceOrderInput } from './VoiceOrderInput'
import { ImageOrderInput } from './ImageOrderInput'
import { MerchantSelector } from './MerchantSelector'
import { ActiveCartBanner, ActiveCartNotice } from './ActiveCartBanner'
import { NotepadOrderInput, OrderItem, itemsToText, textToItems } from './NotepadOrderInput'

// Services & hooks
import { useDraftManager } from '@/lib/offline/draft-manager'
import { useCart } from '@/lib/store/cart'
import { createClient } from '@/lib/supabase/client'
import { createCustomerBroadcastService } from '@/lib/orders/broadcast-service'
import { createCustomOrderStorageService } from '@/lib/storage/custom-order-storage'

// Types
import type {
  CustomOrderInterfaceProps,
  ProviderWithCustomSettings,
  CustomOrderInputType,
  CreateBroadcastPayload,
} from '@/types/custom-order'
import { MAX_BROADCAST_PROVIDERS } from '@/types/custom-order'

interface ExtendedCustomOrderInterfaceProps extends CustomOrderInterfaceProps {
  className?: string
  availableProviders?: ProviderWithCustomSettings[]
  customerId?: string
}

type InputTab = 'text' | 'voice' | 'image'

export function CustomOrderInterface({
  provider,
  onSubmit,
  onCancel,
  className,
  availableProviders = [],
  customerId,
}: ExtendedCustomOrderInterfaceProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const router = useRouter()

  // Input state
  const [activeTab, setActiveTab] = useState<InputTab>('text')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { id: crypto.randomUUID(), text: '' }
  ])
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [notes, setNotes] = useState('')

  // Convert items to text for submission
  const textInput = itemsToText(orderItems)

  // Provider selection (for broadcast)
  const [selectedProviders, setSelectedProviders] = useState<string[]>(
    provider ? [provider.id] : []
  )

  // UI state
  const [step, setStep] = useState<'input' | 'providers' | 'review'>('input')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDraftBanner, setShowDraftBanner] = useState(false)

  // Cart state for ActiveCartBanner
  const cart = useCart()
  const hasActiveCart = cart.cart.length > 0
  const activeCartProvider = cart.provider

  // Draft management
  const { draft, saveDraft, deleteDraft, startAutoSave, hasDraft } = useDraftManager(
    provider?.id || 'general',
    provider?.name_ar || 'General'
  )

  // Determine accepted input types
  const acceptedTypes = useMemo(() => {
    const settings = provider?.custom_order_settings
    return {
      text: settings?.accepts_text ?? true,
      voice: settings?.accepts_voice ?? true,
      image: settings?.accepts_image ?? true,
    }
  }, [provider?.custom_order_settings])

  // Load draft on mount
  useEffect(() => {
    if (draft) {
      setShowDraftBanner(true)
      // Don't auto-restore - let user decide
    }
  }, [draft])

  // Start auto-save
  useEffect(() => {
    startAutoSave(() => {
      const text = itemsToText(orderItems)
      if (!text && !voiceBlob && images.length === 0) {
        return null
      }

      return {
        providerId: provider?.id || 'general',
        providerName: provider?.name_ar || 'General',
        inputType: determineInputType(),
        text: text || undefined,
        imageDataUrls: images.length > 0 ? [] : undefined, // Would need to convert to data URLs
        notes: notes || undefined,
      }
    })
  }, [orderItems, voiceBlob, images, notes, provider, startAutoSave])

  // Restore draft
  const handleRestoreDraft = () => {
    if (draft) {
      if (draft.text) {
        setOrderItems(textToItems(draft.text))
      }
      if (draft.notes) setNotes(draft.notes)
      // Voice and images need special handling (IndexedDB/base64)
      setShowDraftBanner(false)
    }
  }

  // Discard draft
  const handleDiscardDraft = () => {
    deleteDraft()
    setShowDraftBanner(false)
  }

  // Determine input type based on what's filled
  const determineInputType = (): CustomOrderInputType => {
    const hasText = textInput.trim().length > 0
    const hasVoice = voiceBlob !== null
    const hasImages = images.length > 0

    if (hasText && (hasVoice || hasImages)) return 'mixed'
    if (hasVoice) return 'voice'
    if (hasImages) return 'image'
    return 'text'
  }

  // Check if form has content
  const hasContent = useMemo(() => {
    return textInput.trim().length > 0 || voiceBlob !== null || images.length > 0
  }, [textInput, voiceBlob, images])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as InputTab)
  }

  // Handle voice recording complete
  const handleVoiceComplete = (blob: Blob) => {
    setVoiceBlob(blob)
  }

  // Handle voice error
  const handleVoiceError = (errorMsg: string) => {
    setError(errorMsg)
  }

  // Navigate to cart
  const handleViewCart = () => {
    router.push(`/${locale}/cart`)
  }

  // Proceed to provider selection
  const handleProceedToProviders = () => {
    if (!hasContent) {
      setError(isRTL ? 'يرجى إدخال طلبك' : 'Please enter your order')
      return
    }
    setError(null)
    setStep('providers')
  }

  // Back to input
  const handleBackToInput = () => {
    setStep('input')
  }

  // Proceed to review
  const handleProceedToReview = () => {
    if (selectedProviders.length === 0) {
      setError(isRTL ? 'يرجى اختيار متجر واحد على الأقل' : 'Please select at least one merchant')
      return
    }
    setError(null)
    setStep('review')
  }

  // Submit order
  const handleSubmit = async () => {
    if (!customerId) {
      setError(isRTL ? 'يرجى تسجيل الدخول' : 'Please login')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const storageService = createCustomOrderStorageService(supabase)

      let voiceUrl: string | undefined
      let imageUrls: string[] | undefined

      // Upload voice if exists
      if (voiceBlob) {
        // Generate a temporary broadcast ID for storage
        const tempId = crypto.randomUUID()
        const result = await storageService.uploadVoice(tempId, voiceBlob)
        if (result.url) {
          voiceUrl = result.url
        }
      }

      // Upload images if exist
      if (images.length > 0) {
        const tempId = crypto.randomUUID()
        const result = await storageService.uploadBroadcastImages(tempId, images)
        if (result.urls) {
          imageUrls = result.urls
        }
      }

      // Create payload
      const payload: CreateBroadcastPayload = {
        providerIds: selectedProviders,
        inputType: determineInputType(),
        text: textInput || undefined,
        voiceUrl,
        imageUrls,
        notes: notes || undefined,
        orderType: 'delivery', // TODO: Add pickup option
      }

      // Submit via parent callback
      await onSubmit(payload)

      // Clear draft on success
      deleteDraft()

      // Clear cart if needed
      if (hasActiveCart) {
        cart.clearCart()
      }
    } catch (err) {
      console.error('Error submitting order:', err)
      setError(
        isRTL
          ? 'حدث خطأ أثناء إرسال الطلب'
          : 'Error submitting order'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Available providers for selection (filter to custom mode only)
  const selectableProviders = useMemo(() => {
    if (availableProviders.length > 0) {
      return availableProviders.filter(
        (p) => p.operation_mode === 'custom' || p.operation_mode === 'hybrid'
      )
    }
    // If only single provider mode
    if (provider) {
      return [provider]
    }
    return []
  }, [availableProviders, provider])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Active Cart Banner */}
      {hasActiveCart && activeCartProvider && step === 'input' && (
        <ActiveCartBanner
          cartProvider={{
            name: isRTL ? activeCartProvider.name_ar : activeCartProvider.name_en,
            itemCount: cart.getItemCount(),
          }}
          onViewCart={handleViewCart}
          onDismiss={() => {}} // User can't dismiss, just for awareness
          position="top"
          variant="full"
        />
      )}

      {/* Draft Restore Banner */}
      <AnimatePresence>
        {showDraftBanner && draft && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-primary/5 border-b border-primary/20 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">
                  {isRTL ? 'مسودة محفوظة' : 'Draft found'}
                </p>
                <p className="text-xs text-slate-500">
                  {isRTL
                    ? `تم الحفظ ${new Date(draft.savedAt).toLocaleString(locale)}`
                    : `Saved ${new Date(draft.savedAt).toLocaleString(locale)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleRestoreDraft}
                  className="gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isRTL ? 'استعادة' : 'Restore'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDiscardDraft}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Input */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 space-y-4"
            >
              {/* Provider Header */}
              {provider && (
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden">
                    {provider.logo_url ? (
                      <img
                        src={provider.logo_url}
                        alt={isRTL ? provider.name_ar : provider.name_en}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        🏪
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-800">
                      {isRTL ? provider.name_ar : provider.name_en}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {isRTL ? 'طلب خاص' : 'Custom Order'}
                    </p>
                  </div>
                </div>
              )}

              {/* Input Tabs */}
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="w-full grid grid-cols-3">
                  {acceptedTypes.text && (
                    <TabsTrigger value="text" className="gap-1.5">
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {isRTL ? 'نص' : 'Text'}
                      </span>
                    </TabsTrigger>
                  )}
                  {acceptedTypes.voice && (
                    <TabsTrigger value="voice" className="gap-1.5">
                      <Mic className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {isRTL ? 'صوت' : 'Voice'}
                      </span>
                    </TabsTrigger>
                  )}
                  {acceptedTypes.image && (
                    <TabsTrigger value="image" className="gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {isRTL ? 'صور' : 'Images'}
                      </span>
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="mt-4">
                  {acceptedTypes.text && (
                    <TabsContent value="text">
                      <NotepadOrderInput
                        items={orderItems}
                        onItemsChange={setOrderItems}
                        disabled={isSubmitting}
                        maxItems={50}
                      />
                    </TabsContent>
                  )}

                  {acceptedTypes.voice && (
                    <TabsContent value="voice">
                      <VoiceOrderInput
                        providerId={provider?.id || 'general'}
                        onRecordingComplete={handleVoiceComplete}
                        onError={handleVoiceError}
                        disabled={isSubmitting}
                      />
                    </TabsContent>
                  )}

                  {acceptedTypes.image && (
                    <TabsContent value="image">
                      <ImageOrderInput
                        images={images}
                        onImagesChange={setImages}
                        disabled={isSubmitting}
                      />
                    </TabsContent>
                  )}
                </div>
              </Tabs>

              {/* Notes Field */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {isRTL ? 'ملاحظات إضافية (اختياري)' : 'Additional notes (optional)'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isRTL
                      ? 'مثال: أريد الأصناف الطازجة فقط...'
                      : 'Example: I want fresh items only...'
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl resize-none h-20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: Provider Selection */}
          {step === 'providers' && (
            <motion.div
              key="providers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4"
            >
              <MerchantSelector
                providers={selectableProviders}
                selected={selectedProviders}
                onSelectionChange={setSelectedProviders}
                maxSelection={MAX_BROADCAST_PROVIDERS}
              />
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 space-y-4"
            >
              {/* Order Details Card */}
              <div className="bg-white border-2 border-primary/20 rounded-2xl overflow-hidden">
                <div className="bg-primary/5 px-4 py-3 border-b border-primary/10">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {isRTL ? 'تفاصيل طلبك' : 'Your Order Details'}
                  </h3>
                </div>

                <div className="p-4 space-y-4">
                  {/* Text Content */}
                  {textInput && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        {isRTL ? 'محتوى الطلب:' : 'Order content:'}
                      </p>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-slate-800 whitespace-pre-wrap">{textInput}</p>
                      </div>
                    </div>
                  )}

                  {/* Voice Recording */}
                  {voiceBlob && !textInput && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        {isRTL ? 'تسجيل صوتي:' : 'Voice recording:'}
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                          <Mic className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-amber-800">
                            {isRTL ? 'تم تسجيل رسالة صوتية' : 'Voice message recorded'}
                          </p>
                          <p className="text-xs text-amber-600">
                            {isRTL ? 'سيتم إرسالها للتجار' : 'Will be sent to merchants'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Images */}
                  {images.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">
                        {isRTL ? `الصور المرفقة (${images.length}):` : `Attached images (${images.length}):`}
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {images.map((img, idx) => (
                          <div
                            key={idx}
                            className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 border-slate-200"
                          >
                            <img
                              src={typeof img === 'string' ? img : URL.createObjectURL(img)}
                              alt={`Image ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {notes && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        {isRTL ? 'ملاحظات إضافية:' : 'Additional notes:'}
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <p className="text-sm text-blue-800">{notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Providers */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  {isRTL
                    ? `سيتم إرسال الطلب إلى ${selectedProviders.length} متاجر`
                    : `Order will be sent to ${selectedProviders.length} merchants`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedProviders.map((id, index) => {
                    const p = selectableProviders.find((p) => p.id === id)
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm"
                      >
                        <span className="w-5 h-5 bg-primary text-white rounded-full text-xs flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        {isRTL ? p?.name_ar : p?.name_en}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Info about triple broadcast */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-emerald-700">
                    {isRTL
                      ? 'أول متجر يقدم تسعير سيفوز بالطلب. يمكنك مقارنة الأسعار واختيار الأفضل!'
                      : 'First merchant to price wins! You can compare prices and choose the best.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 pb-2"
          >
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-100 bg-white">
        {step === 'input' && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={handleProceedToProviders}
              className="flex-1 gap-2"
              disabled={!hasContent || isSubmitting}
            >
              {isRTL ? 'التالي' : 'Next'}
            </Button>
          </div>
        )}

        {step === 'providers' && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleBackToInput}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isRTL ? 'رجوع' : 'Back'}
            </Button>
            <Button
              onClick={handleProceedToReview}
              className="flex-1 gap-2"
              disabled={selectedProviders.length === 0 || isSubmitting}
            >
              {isRTL ? 'مراجعة' : 'Review'}
            </Button>
          </div>
        )}

        {step === 'review' && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setStep('providers')}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isRTL ? 'رجوع' : 'Back'}
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isRTL ? 'جارٍ الإرسال...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {isRTL ? 'إرسال الطلب' : 'Send Order'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
