'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import { X, ShoppingCart, Trash2, Loader2, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VoiceOrderButton } from './VoiceOrderButton'
import { useVoiceOrder, VoiceOrderMessage, CartItem } from '@/hooks/customer/useVoiceOrder'

interface VoiceOrderChatProps {
  isOpen: boolean
  onClose: () => void
  onAddToCart?: (items: CartItem[]) => void
}

export function VoiceOrderChat({ isOpen, onClose, onAddToCart }: VoiceOrderChatProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    messages,
    isProcessing,
    pendingCartItems,
    processTranscript,
    confirmOrder,
    cancelPendingItems,
    startNewConversation,
  } = useVoiceOrder()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Start conversation when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startNewConversation()
    }
  }, [isOpen, messages.length, startNewConversation])

  const handleTranscript = (transcript: string) => {
    processTranscript(transcript)
  }

  const handleConfirmOrder = async () => {
    const success = await confirmOrder()
    if (success && onAddToCart) {
      onAddToCart(pendingCartItems)
    }
  }

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} ${locale === 'ar' ? 'جنيه' : 'EGP'}`
  }

  const calculateTotal = () => {
    return pendingCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center">
      <div
        className={cn(
          'bg-white w-full max-w-lg h-[75vh] sm:h-[600px] sm:rounded-2xl rounded-t-2xl flex flex-col shadow-2xl mb-16 sm:mb-0',
          isRTL ? 'font-arabic' : ''
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                {locale === 'ar' ? 'المساعد الصوتي' : 'Voice Assistant'}
              </h2>
              <p className="text-xs text-slate-500">
                {locale === 'ar' ? 'اطلب بصوتك' : 'Order with your voice'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} locale={locale} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Pending Cart Items */}
        {pendingCartItems.length > 0 && (
          <div className="border-t border-slate-100 p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                {locale === 'ar' ? 'عناصر الطلب' : 'Order Items'}
              </h3>
              <button
                onClick={cancelPendingItems}
                className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pendingCartItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white rounded-lg p-2 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {locale === 'ar' ? item.productNameAr || item.productName : item.productName}
                    </span>
                    <span className="text-slate-500 mx-1">×</span>
                    <span>{item.quantity}</span>
                  </div>
                  <span className="text-primary font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
              <span className="font-semibold">
                {locale === 'ar' ? 'الإجمالي:' : 'Total:'}
              </span>
              <span className="text-lg font-bold text-primary">
                {formatPrice(calculateTotal())}
              </span>
            </div>

            <button
              onClick={handleConfirmOrder}
              disabled={isProcessing}
              className="w-full mt-3 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  {locale === 'ar' ? 'إضافة للسلة' : 'Add to Cart'}
                </>
              )}
            </button>
          </div>
        )}

        {/* Voice Input Area */}
        <div className="border-t border-slate-100 p-4 bg-white rounded-b-2xl">
          <div className="flex flex-col items-center">
            <VoiceOrderButton
              onTranscript={handleTranscript}
              isProcessing={isProcessing}
              size="lg"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Message Bubble Component
function MessageBubble({ message, locale }: { message: VoiceOrderMessage; locale: string }) {
  const isAssistant = message.role === 'assistant'
  const isRTL = locale === 'ar'

  return (
    <div
      className={cn(
        'flex gap-2',
        isAssistant ? '' : 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isAssistant ? 'bg-primary/10' : 'bg-slate-100'
        )}
      >
        {isAssistant ? (
          <Bot className="w-4 h-4 text-primary" />
        ) : (
          <User className="w-4 h-4 text-slate-500" />
        )}
      </div>

      {/* Message */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5',
          isAssistant
            ? 'bg-slate-100 text-slate-900 rounded-tl-sm'
            : 'bg-primary text-white rounded-tr-sm',
          isRTL && isAssistant && 'rounded-tl-2xl rounded-tr-sm',
          isRTL && !isAssistant && 'rounded-tr-2xl rounded-tl-sm'
        )}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">
              {locale === 'ar' ? 'جاري التفكير...' : 'Thinking...'}
            </span>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  )
}
