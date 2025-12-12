/**
 * useAIChat Hook - React Hook for AI Smart Assistant
 * Handles streaming responses and cart integration
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useCart, type MenuItem, type Provider, type ProductVariant } from '@/lib/store/cart'
import type { ChatMessage, ChatProduct, ChatAPIRequest, DEFAULT_QUICK_ACTIONS } from '@/types/chat'

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export interface UseAIChatOptions {
  userId?: string
  cityId?: string
  governorateId?: string
}

export interface UseAIChatReturn {
  // State
  messages: ChatMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: string | null
  streamingContent: string

  // Actions
  sendMessage: (message: string) => Promise<void>
  sendQuickAction: (action: string) => Promise<void>
  addToCartFromChat: (product: ChatProduct, quantity?: number) => void
  clearChat: () => void
  retryLastMessage: () => Promise<void>
}

// Welcome message
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `مرحباً! 👋 أنا مساعد إنجزنا الذكي.

اكتب لي ماذا تريد أن تطلب اليوم؟

مثال: "عايز 2 شاورما فراخ من مطعم الأمير"`,
  timestamp: new Date(),
  suggestions: [
    '🔥 العروض',
    '⭐ الأكثر طلباً',
    '🔄 آخر طلب',
    '🍕 بيتزا',
  ],
}

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const { userId, cityId, governorateId } = options

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastUserMessageRef = useRef<string>('')

  // Cart store
  const { addItem: cartAddItem } = useCart()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  /**
   * Send message to AI
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    // Store last message for retry
    lastUserMessageRef.current = message

    // Cancel any ongoing request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setIsStreaming(false)
    setError(null)
    setStreamingContent('')

    try {
      const requestBody: ChatAPIRequest = {
        message: message.trim(),
        conversationHistory: messages.filter(m => m.id !== 'welcome').slice(-10),
        userId,
        cityId,
        governorateId,
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'فشل في الاتصال بالسيرفر')
      }

      // Check if streaming response
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('text/event-stream')) {
        // Handle streaming
        setIsStreaming(true)
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error('No response body')

        let fullContent = ''
        let finalMessage: ChatMessage | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.chunk) {
                  fullContent += data.chunk
                  setStreamingContent(fullContent)
                }

                if (data.done && data.message) {
                  finalMessage = data.message
                }

                if (data.error) {
                  throw new Error(data.error)
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }

        // Add final message
        if (finalMessage) {
          setMessages(prev => [...prev, {
            ...finalMessage,
            timestamp: new Date(finalMessage.timestamp),
          }])
        } else if (fullContent) {
          // Fallback if no final message
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'assistant',
            content: fullContent,
            timestamp: new Date(),
          }])
        }
      } else {
        // Handle non-streaming response (for special cases)
        const data = await response.json()
        if (data.success && data.message) {
          setMessages(prev => [...prev, {
            ...data.message,
            timestamp: new Date(data.message.timestamp),
          }])
        } else {
          throw new Error(data.error || 'Unknown error')
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }

      console.error('Chat error:', err)
      const errorMessage = err instanceof Error ? err.message : 'حصلت مشكلة'
      setError(errorMessage)

      // Add error message
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `عذراً، ${errorMessage}. ممكن تجرب تاني؟ 🙏`,
        timestamp: new Date(),
        suggestions: ['🔄 جرب تاني', '🏠 الرئيسية'],
      }])
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingContent('')
    }
  }, [isLoading, messages, userId, cityId, governorateId])

  /**
   * Send quick action
   */
  const sendQuickAction = useCallback(async (action: string) => {
    // Map quick action to message
    const actionMessages: Record<string, string> = {
      'reorder_last': 'عايز أكرر آخر طلب',
      'show_promotions': 'ورني العروض',
      'show_popular': 'إيه الأكثر طلباً؟',
      'show_nearby': 'إيه أقرب مطاعم؟',
      '🔥 العروض': 'ورني العروض',
      '⭐ الأكثر طلباً': 'إيه الأكثر طلباً؟',
      '🔄 آخر طلب': 'عايز أكرر آخر طلب',
      '🍕 بيتزا': 'عايز بيتزا',
      '🍔 برجر': 'عايز برجر',
      '🌯 شاورما': 'عايز شاورما',
      '☕ مشروبات': 'عايز مشروبات',
      '🔄 جرب تاني': lastUserMessageRef.current || 'مرحبا',
      '🏠 الرئيسية': 'مرحبا',
    }

    const message = actionMessages[action] || action
    await sendMessage(message)
  }, [sendMessage])

  /**
   * Add product to cart from chat
   */
  const addToCartFromChat = useCallback((product: ChatProduct, quantity: number = 1) => {
    // Convert ChatProduct to MenuItem format
    const menuItem: MenuItem = {
      id: product.id,
      provider_id: product.provider_id,
      name_ar: product.name_ar,
      name_en: product.name_en || product.name_ar,
      description_ar: product.description_ar,
      description_en: null,
      price: product.price,
      original_price: product.original_price,
      image_url: product.image_url,
      is_available: true,
      is_vegetarian: false,
      is_spicy: false,
      preparation_time_min: 15,
      has_variants: product.has_variants,
    }

    // Create minimal provider object
    const provider: Provider = {
      id: product.provider_id,
      name_ar: product.provider_name_ar,
      name_en: product.provider_name_en || product.provider_name_ar,
      delivery_fee: 0, // Will be fetched properly in checkout
      min_order_amount: 0,
      estimated_delivery_time_min: 30,
    }

    // Add to cart
    for (let i = 0; i < quantity; i++) {
      cartAddItem(menuItem, provider)
    }

    // Add confirmation message
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'assistant',
      content: `تمام! 🎉 ضفت ${quantity}x ${product.name_ar} للسلة.\n\nتحب تضيف حاجة تانية؟`,
      timestamp: new Date(),
      suggestions: ['🛒 اذهب للسلة', '➕ أضف المزيد', '🏠 الرئيسية'],
    }])
  }, [cartAddItem])

  /**
   * Clear chat history
   */
  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort()
    setMessages([WELCOME_MESSAGE])
    setError(null)
    setStreamingContent('')
  }, [])

  /**
   * Retry last message
   */
  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      // Remove the last error message if exists
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1]
        if (lastMsg?.content.includes('عذراً') || lastMsg?.content.includes('مشكلة')) {
          return prev.slice(0, -1)
        }
        return prev
      })

      await sendMessage(lastUserMessageRef.current)
    }
  }, [sendMessage])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    streamingContent,
    sendMessage,
    sendQuickAction,
    addToCartFromChat,
    clearChat,
    retryLastMessage,
  }
}

export default useAIChat
