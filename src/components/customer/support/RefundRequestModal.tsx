'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  AlertTriangle,
  Package,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  Camera,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'

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
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'wrong_items',
    label_ar: 'أصناف خاطئة',
    label_en: 'Wrong items',
    icon: RefreshCw,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'quality_issue',
    label_ar: 'مشكلة في الجودة',
    label_en: 'Quality issue',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-600',
  },
  {
    id: 'never_received',
    label_ar: 'لم أستلم الطلب',
    label_en: 'Never received',
    icon: Package,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 'other',
    label_ar: 'مشكلة أخرى',
    label_en: 'Other issue',
    icon: HelpCircle,
    color: 'bg-slate-100 text-slate-600',
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
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedIssue, setSelectedIssue] = useState<string>('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mount check for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setSelectedIssue('')
      setDescription('')
      setImages([])
      setImagePreviews([])
      setError('')
    }
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleIssueSelect = (issueId: string) => {
    console.log('Selected issue:', issueId)
    setSelectedIssue(issueId)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length > 5) {
      setError(isArabic ? 'الحد الأقصى 5 صور' : 'Maximum 5 images allowed')
      return
    }
    setImages(prev => [...prev, ...files])
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
    if (!description.trim()) {
      setError(isArabic ? 'يرجى وصف المشكلة' : 'Please describe the issue')
      return
    }

    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Upload images if any (skip if bucket doesn't exist)
      const imageUrls: string[] = []
      for (const image of images) {
        try {
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
        } catch {
          // Continue without images if storage fails
          console.log('Image upload skipped - bucket may not exist')
        }
      }

      // Use the RPC function which bypasses RLS
      const { data: refundId, error: rpcError } = await supabase.rpc('create_customer_refund_request', {
        p_order_id: order.id,
        p_amount: order.total,
        p_reason: description,
        p_issue_type: selectedIssue,
        p_evidence_images: imageUrls.length > 0 ? imageUrls : null
      })

      if (rpcError) {
        console.error('RPC error:', rpcError)
        // Fallback to direct insert if RPC doesn't exist
        const { error: insertError } = await supabase.from('refunds').insert({
          order_id: order.id,
          customer_id: order.customer_id,
          provider_id: order.provider_id,
          amount: order.total,
          reason: selectedIssue,
          reason_ar: description,
          issue_type: selectedIssue,
          evidence_images: imageUrls.length > 0 ? imageUrls : null,
          status: 'pending',
          request_source: 'customer',
          provider_action: 'pending',
          confirmation_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        })

        if (insertError) throw insertError
      }

      // Create support ticket
      try {
        await supabase.from('support_tickets').insert({
          user_id: order.customer_id,
          provider_id: order.provider_id,
          order_id: order.id,
          type: 'refund',
          subject: `طلب استرداد - ${order.order_number}`,
          description: description,
          priority: 'high',
          status: 'open'
        })
      } catch {
        // Support ticket is optional, continue if fails
        console.log('Support ticket creation skipped')
      }

      // Create provider notification
      try {
        await supabase.from('provider_notifications').insert({
          provider_id: order.provider_id,
          type: 'new_refund_request',
          title_ar: 'طلب استرداد جديد',
          title_en: 'New Refund Request',
          message_ar: `لديك طلب استرداد جديد للطلب #${order.order_number}`,
          message_en: `You have a new refund request for order #${order.order_number}`,
          data: {
            order_id: order.id,
            order_number: order.order_number,
            amount: order.total,
            issue_type: selectedIssue
          }
        })
      } catch {
        // Notification is optional
        console.log('Provider notification skipped')
      }

      setStep(3)
      onSuccess?.()
    } catch (err) {
      console.error('Error submitting refund:', err)
      setError(isArabic ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : 'Error occurred, please try again')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999]"
      style={{ isolation: 'isolate' }}
    >
      {/* Dark Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Orange Header */}
          <div
            className="text-white p-4 flex-shrink-0"
            style={{ backgroundColor: '#f97316' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">
                    {isArabic ? 'طلب مساعدة' : 'Get Help'}
                  </h2>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {isArabic ? `طلب #${order.order_number}` : `Order #${order.order_number}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Steps Indicator */}
          {step < 3 && (
            <div className="px-4 py-3 border-b flex-shrink-0" style={{ backgroundColor: '#f8fafc' }}>
              <div className="flex items-center justify-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: step >= 1 ? '#f97316' : '#e2e8f0',
                    color: step >= 1 ? '#ffffff' : '#64748b'
                  }}
                >1</div>
                <div
                  className="w-8 h-1 rounded"
                  style={{ backgroundColor: step >= 2 ? '#f97316' : '#e2e8f0' }}
                />
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: step >= 2 ? '#f97316' : '#e2e8f0',
                    color: step >= 2 ? '#ffffff' : '#64748b'
                  }}
                >2</div>
              </div>
              <div className="flex justify-between mt-2 text-xs px-2" style={{ color: '#64748b' }}>
                <span>{isArabic ? 'نوع المشكلة' : 'Issue Type'}</span>
                <span>{isArabic ? 'التفاصيل' : 'Details'}</span>
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4">

            {/* STEP 1: Issue Selection */}
            {step === 1 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-4 text-center">
                  {isArabic ? 'ما هي المشكلة؟' : 'What is the issue?'}
                </h3>

                <div className="space-y-3">
                  {ISSUE_TYPES.map((issue) => {
                    const Icon = issue.icon
                    const isSelected = selectedIssue === issue.id

                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => handleIssueSelect(issue.id)}
                        className="w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all"
                        style={{
                          borderColor: isSelected ? '#f97316' : '#e2e8f0',
                          backgroundColor: isSelected ? '#fff7ed' : '#ffffff'
                        }}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${issue.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="flex-1 text-right font-medium" style={{ color: '#0f172a' }}>
                          {isArabic ? issue.label_ar : issue.label_en}
                        </span>
                        <div
                          className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                          style={{
                            borderColor: isSelected ? '#f97316' : '#cbd5e1',
                            backgroundColor: isSelected ? '#f97316' : 'transparent'
                          }}
                        >
                          {isSelected && (
                            <svg className="w-4 h-4" fill="white" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-900 mb-2">
                    {isArabic ? 'وصف المشكلة *' : 'Describe the issue *'}
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isArabic ? 'اشرح المشكلة بالتفصيل...' : 'Explain the issue in detail...'}
                    className="min-h-[120px] resize-none"
                    dir={isArabic ? 'rtl' : 'ltr'}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-900 mb-2">
                    {isArabic ? 'صور للإثبات (اختياري)' : 'Evidence photos (optional)'}
                  </label>

                  <div className="flex flex-wrap gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {images.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-orange-400 hover:text-orange-500"
                      >
                        <Camera className="w-6 h-6" />
                        <span className="text-xs mt-1">{isArabic ? 'إضافة' : 'Add'}</span>
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

                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{isArabic ? 'إجمالي الطلب' : 'Order Total'}</span>
                    <span className="font-bold text-slate-900">
                      {order.total.toFixed(2)} {isArabic ? 'ج.م' : 'EGP'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Success */}
            {step === 3 && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {isArabic ? 'تم إرسال طلبك' : 'Request Submitted'}
                </h3>
                <p className="text-slate-600 mb-4">
                  {isArabic
                    ? 'سيتم مراجعة طلبك خلال 24 ساعة'
                    : 'Your request will be reviewed within 24 hours'}
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t bg-white flex-shrink-0">
            {step === 1 && (
              <button
                type="button"
                onClick={() => {
                  if (selectedIssue) {
                    setStep(2)
                  } else {
                    setError(isArabic ? 'يرجى اختيار نوع المشكلة' : 'Please select an issue type')
                  }
                }}
                disabled={!selectedIssue}
                className="w-full py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#f97316' }}
              >
                {isArabic ? 'التالي' : 'Next'}
              </button>
            )}

            {step === 2 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl font-semibold border border-slate-300"
                >
                  {isArabic ? 'السابق' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !description.trim()}
                  className="flex-1 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#f97316' }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isArabic ? 'إرسال' : 'Submit')}
                </button>
              </div>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold text-white"
                style={{ backgroundColor: '#22c55e' }}
              >
                {isArabic ? 'تم' : 'Done'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Use Portal to render outside the current DOM hierarchy
  return createPortal(modalContent, document.body)
}

export default RefundRequestModal
