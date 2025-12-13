/**
 * useAIChat Hook - React Hook for AI Smart Assistant
 * Handles streaming responses and cart integration
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useCart, type MenuItem, type Provider, type ProductVariant } from '@/lib/store/cart'
import type { ChatMessage, ChatProduct } from '@/types/chat'

// API Request/Response types for new implementation
interface ChatAPIRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  customer_id?: string
  city_id: string
  selected_provider_id?: string
  selected_provider_category?: string
  memory?: Record<string, unknown>
}

interface QuickReply {
  title: string
  payload: string
}

interface CartAction {
  type: 'ADD_ITEM'
  provider_id: string
  menu_item_id: string
  menu_item_name_ar: string
  quantity: number
  unit_price: number
  variant_id?: string
  variant_name_ar?: string
}

interface ChatAPIResponse {
  reply: string
  quick_replies?: QuickReply[]
  cart_action?: CartAction
  selected_provider_id?: string
  selected_provider_category?: string
  memory?: Record<string, unknown>
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export interface UseAIChatOptions {
  userId?: string
  cityId?: string
  governorateId?: string
  customerName?: string
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
  sendQuickAction: (action: string, payload?: string) => Promise<void>
  addToCartFromChat: (product: ChatProduct, quantity?: number) => void
  clearChat: () => void
  retryLastMessage: () => Promise<void>
}

/**
 * Generate personalized welcome message
 * Provider-First Approach: Ask WHERE they want to order FROM first
 */
function createWelcomeMessage(customerName?: string): ChatMessage {
  const greeting = customerName
    ? `أهلاً ${customerName}! 👋`
    : `أهلاً بيك! 👋`

  return {
    id: 'welcome',
    role: 'assistant',
    content: `${greeting}
أنا مساعد إنجزنا الذكي، معاك عشان أساعدك تطلب أكلك المفضل بأسرع وقت.

عايز تطلب منين النهارده؟ 🏪`,
    timestamp: new Date(),
    suggestions: [
      '🍕 مطاعم وكافيهات',
      '🛒 سوبر ماركت',
      '☕ البن والحلويات',
      '🥬 خضروات وفواكه',
    ],
  }
}

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const { userId, cityId, governorateId, customerName } = options

  // State - Initialize with personalized welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage(customerName)])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')

  // Conversation state for provider-first flow
  const [selectedProviderId, setSelectedProviderId] = useState<string | undefined>()
  const [selectedProviderCategory, setSelectedProviderCategory] = useState<string | undefined>()
  const [memory, setMemory] = useState<Record<string, unknown>>({})

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

  // Update welcome message when customerName becomes available
  useEffect(() => {
    setMessages(prev => {
      // Only update if the first message is the welcome message and no other messages yet
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [createWelcomeMessage(customerName)]
      }
      return prev
    })
  }, [customerName])

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
      // Build conversation history for API (exclude welcome message, only user/assistant)
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = messages
        .filter(m => m.id !== 'welcome' && (m.role === 'user' || m.role === 'assistant'))
        .slice(-10)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      // Add current user message
      conversationHistory.push({ role: 'user', content: message.trim() })

      const requestBody: ChatAPIRequest = {
        messages: conversationHistory,
        customer_id: userId,
        city_id: cityId || '',
        selected_provider_id: selectedProviderId,
        selected_provider_category: selectedProviderCategory,
        memory,
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.reply || 'فشل في الاتصال بالسيرفر')
      }

      // Handle response (new non-streaming format)
      const data: ChatAPIResponse = await response.json()

      // Update conversation state from response
      if (data.selected_provider_id) {
        setSelectedProviderId(data.selected_provider_id)
      }
      if (data.selected_provider_category) {
        setSelectedProviderCategory(data.selected_provider_category)
      }
      if (data.memory) {
        setMemory(data.memory)
      }

      // Handle cart action if present
      if (data.cart_action && data.cart_action.type === 'ADD_ITEM') {
        const action = data.cart_action
        // Create minimal menu item and provider for cart
        const menuItem: MenuItem = {
          id: action.menu_item_id,
          provider_id: action.provider_id,
          name_ar: action.menu_item_name_ar,
          name_en: action.menu_item_name_ar,
          description_ar: null,
          description_en: null,
          price: action.unit_price,
          original_price: null,
          image_url: null,
          is_available: true,
          is_vegetarian: false,
          is_spicy: false,
          preparation_time_min: 15,
          has_variants: !!action.variant_id,
        }

        const provider: Provider = {
          id: action.provider_id,
          name_ar: '',
          name_en: '',
          delivery_fee: 0,
          min_order_amount: 0,
          estimated_delivery_time_min: 30,
        }

        // Add items to cart
        for (let i = 0; i < action.quantity; i++) {
          cartAddItem(menuItem, provider, action.variant_id ? {
            id: action.variant_id,
            variant_type: 'size' as const, // Default variant type
            name_ar: action.variant_name_ar || '',
            name_en: action.variant_name_ar || null,
            price: action.unit_price,
            original_price: null,
            is_default: false,
            display_order: 0,
            is_available: true,
          } : undefined)
        }
      }

      // Convert quick_replies to suggestions format
      const suggestions = data.quick_replies?.map(qr => qr.title) || []

      // Add assistant message
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        suggestions,
        // Store payloads for quick action handling
        quickReplies: data.quick_replies,
      }])

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
  }, [isLoading, messages, userId, cityId, selectedProviderId, selectedProviderCategory, memory, cartAddItem])

  /**
   * Send quick action
   * Handles both title-based actions and payload-based actions
   */
  const sendQuickAction = useCallback(async (action: string, payload?: string) => {
    // If payload is provided, use it directly (new system)
    if (payload) {
      await sendMessage(payload)
      return
    }

    // Find payload from last message's quickReplies
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop()
    const quickReplies = (lastAssistantMessage as ChatMessage & { quickReplies?: QuickReply[] })?.quickReplies
    const matchingReply = quickReplies?.find(qr => qr.title === action)

    if (matchingReply) {
      await sendMessage(matchingReply.payload)
      return
    }

    // Fallback: Map title to message (backwards compatibility)
    const actionMessages: Record<string, string> = {
      // Retry and navigation
      '🔄 جرب تاني': lastUserMessageRef.current || 'مرحبا',
      '🏠 الرئيسية': 'مرحبا',
      '🏠 الأقسام': 'categories',
      // Category buttons (map to payloads)
      '🍽️ مطاعم وكافيهات': 'category:restaurant_cafe',
      '🛒 سوبر ماركت': 'category:grocery',
      '🍰 البن والحلويات': 'category:coffee_patisserie',
      '🥦 خضروات وفواكه': 'category:vegetables_fruits',
      // Legacy actions
      '🔥 العروض': 'فيه عروض؟',
      '📋 شوف المنيو': selectedProviderId ? `provider:${selectedProviderId}` : 'مرحبا',
      '🔍 ابحث': 'search',
    }

    const message = actionMessages[action] || action
    await sendMessage(message)
  }, [sendMessage, messages, selectedProviderId])

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
    setMessages([createWelcomeMessage(customerName)])
    setError(null)
    setStreamingContent('')
    // Reset conversation state
    setSelectedProviderId(undefined)
    setSelectedProviderCategory(undefined)
    setMemory({})
  }, [customerName])

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
