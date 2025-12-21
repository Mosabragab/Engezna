'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  X,
  DollarSign,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  AlertTriangle,
  Loader2,
  Send,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SupportOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  locale: string
  orderId?: string
  providerId?: string
  userId?: string
  onOpenRefundModal?: () => void
}

export function SupportOptionsModal({
  isOpen,
  onClose,
  locale,
  orderId,
  providerId,
  userId,
  onOpenRefundModal,
}: SupportOptionsModalProps) {
  const router = useRouter()
  const isArabic = locale === 'ar'
  const [view, setView] = useState<'options' | 'refund_info' | 'complaint_form'>('options')
  const [complaintText, setComplaintText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleRefundClick = () => {
    if (onOpenRefundModal) {
      // If we have a refund modal handler (on order details page), use it
      onClose()
      onOpenRefundModal()
    } else {
      // Show info about how to request refund
      setView('refund_info')
    }
  }

  const handleComplaintClick = () => {
    setView('complaint_form')
  }

  const handleGoToOrders = () => {
    onClose()
    router.push(`/${locale}/orders`)
  }

  const handleSubmitComplaint = async () => {
    if (!complaintText.trim() || !userId) return

    setSubmitting(true)
    const supabase = createClient()

    try {
      // Generate ticket number
      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`

      const { error } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          user_id: userId,
          order_id: orderId || null,
          provider_id: providerId || null,
          type: 'complaint',
          subject: isArabic ? 'شكوى عامة' : 'General Complaint',
          description: complaintText,
          status: 'open',
          priority: 'medium',
        })

      if (error) throw error

      setSubmitted(true)
      setTimeout(() => {
        onClose()
        setView('options')
        setComplaintText('')
        setSubmitted(false)
      }, 2000)
    } catch (error) {
      alert(isArabic ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : 'An error occurred, please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    setView('options')
    setComplaintText('')
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#f97316',
            padding: '16px',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {view !== 'options' && (
                <button
                  onClick={handleBack}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                >
                  {isArabic ? <ChevronRight className="w-5 h-5 text-white" /> : <ChevronLeft className="w-5 h-5 text-white" />}
                </button>
              )}
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-white" />
                <h2 className="text-lg font-bold text-white">
                  {view === 'options' && (isArabic ? 'كيف يمكننا مساعدتك؟' : 'How can we help?')}
                  {view === 'refund_info' && (isArabic ? 'طلب استرداد' : 'Request Refund')}
                  {view === 'complaint_form' && (isArabic ? 'تقديم شكوى' : 'Submit Complaint')}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Options View */}
          {view === 'options' && (
            <div className="space-y-3">
              {/* Refund Option */}
              <button
                onClick={handleRefundClick}
                className="w-full p-4 bg-blue-50 border border-blue-200 rounded-2xl text-start active:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#dbeafe' }}
                  >
                    <DollarSign className="w-7 h-7" style={{ color: '#2563eb' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-base mb-1">
                      {isArabic ? 'طلب استرداد' : 'Request Refund'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {isArabic
                        ? 'استرداد أموالك لطلب به مشكلة'
                        : 'Get your money back for a problematic order'}
                    </p>
                  </div>
                  {isArabic ? (
                    <ChevronLeft className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </button>

              {/* Complaint Option */}
              <button
                onClick={handleComplaintClick}
                className="w-full p-4 bg-orange-50 border border-orange-200 rounded-2xl text-start active:bg-orange-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#ffedd5' }}
                  >
                    <MessageSquare className="w-7 h-7" style={{ color: '#ea580c' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-base mb-1">
                      {isArabic ? 'تقديم شكوى' : 'Submit Complaint'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {isArabic
                        ? 'أخبرنا عن أي مشكلة واجهتك'
                        : 'Tell us about any issue you faced'}
                    </p>
                  </div>
                  {isArabic ? (
                    <ChevronLeft className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Refund Info View */}
          {view === 'refund_info' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-2xl">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#dbeafe' }}
                  >
                    <DollarSign className="w-5 h-5" style={{ color: '#2563eb' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">
                      {isArabic ? 'كيفية طلب استرداد' : 'How to Request a Refund'}
                    </h3>
                    <ol className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                        <span>{isArabic ? 'اذهب إلى صفحة طلباتي' : 'Go to My Orders page'}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                        <span>{isArabic ? 'اختر الطلب الذي تريد استرداده' : 'Select the order you want to refund'}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                        <span>{isArabic ? 'اضغط على "هل واجهت مشكلة؟"' : 'Click on "Had an issue?"'}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                        <span>{isArabic ? 'اتبع الخطوات لتقديم طلب الاسترداد' : 'Follow the steps to submit refund request'}</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGoToOrders}
                className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: '#2563eb' }}
              >
                <ShoppingBag className="w-5 h-5" />
                {isArabic ? 'الذهاب إلى طلباتي' : 'Go to My Orders'}
              </button>
            </div>
          )}

          {/* Complaint Form View */}
          {view === 'complaint_form' && (
            <div className="space-y-4">
              {submitted ? (
                <div className="text-center py-8">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: '#dcfce7' }}
                  >
                    <MessageSquare className="w-8 h-8" style={{ color: '#16a34a' }} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">
                    {isArabic ? 'تم إرسال شكواك بنجاح' : 'Complaint submitted successfully'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {isArabic
                      ? 'سنراجعها ونتواصل معك قريباً'
                      : 'We will review and contact you soon'}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {isArabic ? 'اكتب شكواك هنا' : 'Write your complaint here'}
                    </label>
                    <textarea
                      value={complaintText}
                      onChange={(e) => setComplaintText(e.target.value)}
                      placeholder={
                        isArabic
                          ? 'وصف المشكلة التي واجهتك بالتفصيل...'
                          : 'Describe the issue you faced in detail...'
                      }
                      className="w-full p-4 border border-slate-200 rounded-xl resize-none h-32 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      dir={isArabic ? 'rtl' : 'ltr'}
                    />
                    <p className="text-xs text-slate-400 mt-1 text-end">
                      {complaintText.length}/500
                    </p>
                  </div>

                  <button
                    onClick={handleSubmitComplaint}
                    disabled={!complaintText.trim() || submitting}
                    className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#ea580c' }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {isArabic ? 'جاري الإرسال...' : 'Submitting...'}
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        {isArabic ? 'إرسال الشكوى' : 'Submit Complaint'}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Safe area padding for mobile */}
        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }} />
      </div>
    </div>
  )

  // Use portal to render outside DOM hierarchy
  if (typeof window === 'undefined') return null
  return createPortal(modalContent, document.body)
}
