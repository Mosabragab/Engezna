'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Upload,
  AlertTriangle,
  RefreshCw,
  Package,
  HelpCircle,
  CheckCircle2,
  Camera,
  Trash2,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Order {
  id: string
  order_number: string
  total: number
  status: string
  provider_id: string
  customer_id: string
  created_at: string
  items?: Array<{
    id: string
    item_name_ar: string
    item_name_en: string
    quantity: number
    total_price: number
  }>
}

interface RefundRequestModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  locale: string
  onSuccess?: () => void
}

const ISSUE_TYPES = [
  {
    id: 'missing_items',
    label_ar: 'أصناف ناقصة',
    label_en: 'Missing items',
    icon: Package,
    color: 'text-orange-600 bg-orange-100',
    refund_type: 'partial'
  },
  {
    id: 'wrong_items',
    label_ar: 'أصناف خاطئة',
    label_en: 'Wrong items',
    icon: RefreshCw,
    color: 'text-blue-600 bg-blue-100',
    refund_type: 'item_resend'
  },
  {
    id: 'quality_issue',
    label_ar: 'مشكلة في الجودة',
    label_en: 'Quality issue',
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-100',
    refund_type: 'full'
  },
  {
    id: 'never_received',
    label_ar: 'لم أستلم الطلب',
    label_en: 'Never received',
    icon: Package,
    color: 'text-purple-600 bg-purple-100',
    refund_type: 'full'
  },
  {
    id: 'other',
    label_ar: 'مشكلة أخرى',
    label_en: 'Other issue',
    icon: HelpCircle,
    color: 'text-slate-600 bg-slate-100',
    refund_type: 'full'
  },
]

export function RefundRequestModal({
  isOpen,
  onClose,
  order,
  locale,
  onSuccess
}: RefundRequestModalProps) {
  const isArabic = locale === 'ar'
  const isRTL = isArabic

  const [step, setStep] = useState(1)
  const [issueType, setIssueType] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 5) {
      setError(isArabic ? 'الحد الأقصى 5 صور' : 'Maximum 5 images allowed')
      return
    }

    const newImages = [...images, ...files]
    setImages(newImages)

    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!issueType) {
      setError(isArabic ? 'يرجى اختيار نوع المشكلة' : 'Please select issue type')
      return
    }

    if (!description.trim()) {
      setError(isArabic ? 'يرجى وصف المشكلة' : 'Please describe the issue')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Upload images
      const imageUrls: string[] = []
      for (const image of images) {
        const fileName = `${order.id}/${Date.now()}-${image.name}`
        const { data, error: uploadError } = await supabase.storage
          .from('refund-evidence')
          .upload(fileName, image)

        if (data && !uploadError) {
          const { data: urlData } = supabase.storage
            .from('refund-evidence')
            .getPublicUrl(fileName)
          imageUrls.push(urlData.publicUrl)
        }
      }

      // Get selected issue type details
      const selectedIssue = ISSUE_TYPES.find(t => t.id === issueType)

      // Create refund request using the helper function
      const { data: refundData, error: refundError } = await supabase.rpc(
        'create_customer_refund_request',
        {
          p_order_id: order.id,
          p_amount: order.total,
          p_reason: description,
          p_issue_type: issueType,
          p_evidence_images: imageUrls.length > 0 ? imageUrls : null
        }
      )

      if (refundError) {
        // Fallback to direct insert if function doesn't exist
        const { error: insertError } = await supabase.from('refunds').insert({
          order_id: order.id,
          customer_id: order.customer_id,
          provider_id: order.provider_id,
          amount: order.total,
          reason: issueType,
          reason_ar: description,
          issue_type: issueType,
          evidence_images: imageUrls,
          status: 'pending',
          request_source: 'customer',
          refund_type: selectedIssue?.refund_type || 'full',
          provider_action: 'pending',
          confirmation_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        })

        if (insertError) throw insertError
      }

      // Create support ticket linked to refund
      await supabase.from('support_tickets').insert({
        user_id: order.customer_id,
        provider_id: order.provider_id,
        order_id: order.id,
        type: 'quality',
        subject: `طلب استرداد - ${order.order_number}`,
        description: description,
        priority: 'high',
        status: 'open'
      })

      setStep(3) // Success step
      onSuccess?.()
    } catch (err) {
      console.error('Error submitting refund:', err)
      setError(isArabic ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : 'Error occurred, please try again')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setIssueType('')
    setDescription('')
    setImages([])
    setImagePreviews([])
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'bg-white w-full sm:w-[480px] sm:max-h-[90vh] max-h-[85vh]',
            'sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col'
          )}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">
                  {isArabic ? 'طلب مساعدة' : 'Get Help'}
                </h3>
                <p className="text-sm text-white/80">
                  {isArabic ? `الطلب #${order.order_number}` : `Order #${order.order_number}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress Steps */}
          {step < 3 && (
            <div className="px-4 py-3 bg-slate-50 border-b">
              <div className="flex items-center justify-center gap-2">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                      step >= s ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'
                    )}>
                      {s}
                    </div>
                    {s < 2 && (
                      <div className={cn(
                        'w-12 h-1 rounded',
                        step > s ? 'bg-orange-500' : 'bg-slate-200'
                      )} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>{isArabic ? 'نوع المشكلة' : 'Issue Type'}</span>
                <span>{isArabic ? 'التفاصيل' : 'Details'}</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Step 1: Select Issue Type */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h4 className="font-semibold text-slate-900">
                  {isArabic ? 'ما هي المشكلة؟' : 'What is the issue?'}
                </h4>

                <div className="space-y-3">
                  {ISSUE_TYPES.map((type) => {
                    const Icon = type.icon
                    const isSelected = issueType === type.id

                    return (
                      <div
                        key={type.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setIssueType(type.id)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setIssueType(type.id)
                          }
                        }}
                        className={cn(
                          'w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 cursor-pointer select-none',
                          isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center pointer-events-none',
                          type.color
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-start pointer-events-none">
                          <p className="font-medium text-slate-900">
                            {isArabic ? type.label_ar : type.label_en}
                          </p>
                        </div>
                        <div className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center pointer-events-none',
                          isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-300'
                        )}>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Description & Evidence */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block font-semibold text-slate-900 mb-2">
                    {isArabic ? 'وصف المشكلة *' : 'Describe the issue *'}
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isArabic
                      ? 'اشرح المشكلة بالتفصيل...'
                      : 'Explain the issue in detail...'
                    }
                    className="min-h-[120px] resize-none"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-900 mb-2">
                    {isArabic ? 'صور للإثبات (اختياري)' : 'Evidence photos (optional)'}
                  </label>
                  <p className="text-sm text-slate-500 mb-3">
                    {isArabic
                      ? 'أضف صور توضح المشكلة (حتى 5 صور)'
                      : 'Add photos showing the issue (up to 5)'
                    }
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {images.length < 5 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-colors"
                      >
                        <Camera className="w-6 h-6" />
                        <span className="text-xs mt-1">
                          {isArabic ? 'إضافة' : 'Add'}
                        </span>
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                {/* Order Summary */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <h5 className="font-medium text-slate-900 mb-2">
                    {isArabic ? 'ملخص الطلب' : 'Order Summary'}
                  </h5>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {isArabic ? 'إجمالي الطلب' : 'Order Total'}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {order.total.toFixed(2)} {isArabic ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">
                  {isArabic ? 'تم إرسال طلبك' : 'Request Submitted'}
                </h4>
                <p className="text-slate-600 mb-4">
                  {isArabic
                    ? 'سيتم مراجعة طلبك من قبل التاجر خلال 24 ساعة'
                    : 'Your request will be reviewed by the merchant within 24 hours'
                  }
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                  <p>
                    {isArabic
                      ? 'ستصلك إشعارات بتحديثات حالة طلبك. يمكنك متابعة الطلب من صفحة "تذاكر الدعم".'
                      : 'You will receive notifications about your request status. Track it from "Support Tickets" page.'
                    }
                  </p>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mt-4">
                {error}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t bg-white">
            {step === 1 && (
              <Button
                onClick={() => setStep(2)}
                disabled={!issueType}
                className="w-full bg-orange-500 hover:bg-orange-600"
                size="lg"
              >
                {isArabic ? 'التالي' : 'Next'}
                {isRTL ? (
                  <ArrowLeft className="w-4 h-4 mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 ml-2" />
                )}
              </Button>
            )}

            {step === 2 && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  size="lg"
                >
                  {isRTL ? (
                    <ArrowRight className="w-4 h-4 ml-2" />
                  ) : (
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  )}
                  {isArabic ? 'السابق' : 'Back'}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !description.trim()}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {isArabic ? 'إرسال الطلب' : 'Submit Request'}
                    </>
                  )}
                </Button>
              </div>
            )}

            {step === 3 && (
              <Button
                onClick={handleClose}
                className="w-full"
                size="lg"
              >
                {isArabic ? 'تم' : 'Done'}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default RefundRequestModal
