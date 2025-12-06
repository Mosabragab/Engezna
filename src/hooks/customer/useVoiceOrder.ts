'use client'

import { useState, useCallback } from 'react'
import { useLocale } from 'next-intl'

export type MessageRole = 'user' | 'assistant' | 'system'

export interface VoiceOrderMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  isLoading?: boolean
}

export interface CartItem {
  productId: string
  productName: string
  productNameAr: string
  providerId: string
  providerName: string
  providerNameAr: string
  quantity: number
  price: number
  notes?: string
}

export interface VoiceOrderState {
  messages: VoiceOrderMessage[]
  isProcessing: boolean
  pendingCartItems: CartItem[]
  currentProviderId?: string
  currentProviderName?: string
  error: string | null
}

export function useVoiceOrder() {
  const locale = useLocale()
  const [state, setState] = useState<VoiceOrderState>({
    messages: [],
    isProcessing: false,
    pendingCartItems: [],
    error: null,
  })

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const addMessage = useCallback((role: MessageRole, content: string, isLoading = false) => {
    const newMessage: VoiceOrderMessage = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      isLoading,
    }

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }))

    return newMessage.id
  }, [])

  const updateMessage = useCallback((id: string, updates: Partial<VoiceOrderMessage>) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }))
  }, [])

  const removeMessage = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.filter((msg) => msg.id !== id),
    }))
  }, [])

  const clearMessages = useCallback(() => {
    setState((prev) => ({
      ...prev,
      messages: [],
      pendingCartItems: [],
      currentProviderId: undefined,
      currentProviderName: undefined,
    }))
  }, [])

  const processTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return

    // Add user message
    addMessage('user', transcript)

    // Add loading message from assistant
    const loadingId = addMessage('assistant', '', true)

    setState((prev) => ({ ...prev, isProcessing: true, error: null }))

    try {
      const response = await fetch('/api/voice-order/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          locale,
          conversationHistory: state.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentProviderId: state.currentProviderId,
        }),
      })

      if (!response.ok) {
        throw new Error('Processing failed')
      }

      const data = await response.json()

      // Update the loading message with the actual response
      updateMessage(loadingId, {
        content: data.response,
        isLoading: false,
      })

      // Update state with any cart items or provider info
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        pendingCartItems: data.cartItems || prev.pendingCartItems,
        currentProviderId: data.providerId || prev.currentProviderId,
        currentProviderName: data.providerName || prev.currentProviderName,
      }))

      return data
    } catch (error) {
      console.error('Error processing voice order:', error)

      // Remove loading message and add error message
      removeMessage(loadingId)

      const errorMessage = locale === 'ar'
        ? 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.'
        : 'Sorry, there was an error processing your request. Please try again.'

      addMessage('assistant', errorMessage)

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: 'Processing failed',
      }))
    }
  }, [locale, state.messages, state.currentProviderId, addMessage, updateMessage, removeMessage])

  const confirmOrder = useCallback(async () => {
    if (state.pendingCartItems.length === 0) return false

    setState((prev) => ({ ...prev, isProcessing: true }))

    try {
      // Add items to cart using the cart store
      // This would integrate with the existing useCartStore
      const response = await fetch('/api/voice-order/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: state.pendingCartItems,
          locale,
        }),
      })

      if (!response.ok) {
        throw new Error('Order confirmation failed')
      }

      const confirmMessage = locale === 'ar'
        ? 'تم إضافة الطلب إلى السلة بنجاح! 🎉'
        : 'Order added to cart successfully! 🎉'

      addMessage('assistant', confirmMessage)

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        pendingCartItems: [],
      }))

      return true
    } catch (error) {
      console.error('Error confirming order:', error)

      const errorMessage = locale === 'ar'
        ? 'عذراً، حدث خطأ في تأكيد الطلب. يرجى المحاولة مرة أخرى.'
        : 'Sorry, there was an error confirming your order. Please try again.'

      addMessage('assistant', errorMessage)

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: 'Confirmation failed',
      }))

      return false
    }
  }, [state.pendingCartItems, locale, addMessage])

  const cancelPendingItems = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pendingCartItems: [],
    }))

    const cancelMessage = locale === 'ar'
      ? 'تم إلغاء الطلب. كيف يمكنني مساعدتك؟'
      : 'Order cancelled. How can I help you?'

    addMessage('assistant', cancelMessage)
  }, [locale, addMessage])

  const startNewConversation = useCallback(() => {
    clearMessages()

    const welcomeMessage = locale === 'ar'
      ? 'مرحباً! 👋 أنا مساعد إنجزنا الذكي. اكتب لي ماذا تريد أن تطلب اليوم؟\n\nمثال: "عايز 2 شاورما فراخ من مطعم الأمير"'
      : 'Hello! 👋 I\'m Engezna\'s smart assistant. Tell me what you\'d like to order today?\n\nExample: "I want 2 chicken shawarma from Al-Ameer restaurant"'

    addMessage('assistant', welcomeMessage)
  }, [locale, clearMessages, addMessage])

  return {
    ...state,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    processTranscript,
    confirmOrder,
    cancelPendingItems,
    startNewConversation,
  }
}
