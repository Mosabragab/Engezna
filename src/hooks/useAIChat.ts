/**
 * useAIChat Hook - React Hook for AI Smart Assistant
 * Handles streaming responses and cart integration
 * Uses Zustand store for persistent messages across navigation
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useCart, type MenuItem, type Provider, type ProductVariant } from '@/lib/store/cart'
import {
  useChatStore,
  createWelcomeMessage,
  generateId,
  type StoredChatMessage,
} from '@/lib/store/chat'
import type { ChatMessage, ChatProduct } from '@/types/chat'

// API Request/Response types for new implementation
interface ChatAPIRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  customer_id?: string
  city_id: string
  selected_provider_id?: string
  selected_provider_category?: string
  selected_category?: string // User's chosen category (restaurant_cafe, grocery, etc.)
  memory?: Record<string, unknown>
  cart_provider_id?: string // Provider ID of items in cart (for conflict detection)
  cart_provider_name?: string // Provider name for user-friendly messages
}

interface QuickReply {
  title: string
  payload: string
}

interface CartAction {
  type: 'ADD_ITEM' | 'CLEAR_AND_ADD' | 'CLEAR_CART' // CLEAR_AND_ADD clears cart first, then adds; CLEAR_CART just clears
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
  cart_actions?: CartAction[] // Multiple cart actions (e.g., "Add All" from reorder)
  selected_provider_id?: string
  selected_provider_category?: string
  selected_category?: string
  memory?: Record<string, unknown>
  navigate_to?: string // Signal to navigate to a specific route
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
  pendingNavigation: string | null // Route to navigate to (component should handle and clear)

  // Actions
  sendMessage: (message: string) => Promise<void>
  sendQuickAction: (action: string, payload?: string) => Promise<void>
  addToCartFromChat: (product: ChatProduct, quantity?: number) => void
  clearChat: () => void
  retryLastMessage: () => Promise<void>
  clearPendingNavigation: () => void
}

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const { userId, cityId, governorateId, customerName } = options

  // Use Zustand store for persistent messages
  const {
    messages,
    addMessage,
    setMessages,
    clearMessages,
    selectedProviderId,
    selectedProviderCategory,
    selectedCategory,
    memory,
    setSelectedProviderId,
    setSelectedProviderCategory,
    setSelectedCategory,
    setMemory,
  } = useChatStore()

  // Local state for UI
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastUserMessageRef = useRef<string>('')
  const isInitializedRef = useRef(false)

  // Rehydrate store on client side (needed because skipHydration: true)
  useEffect(() => {
    useChatStore.persist.rehydrate()
    setIsHydrated(true)
  }, [])

  // Initialize with welcome message if empty (after hydration) - runs only once
  useEffect(() => {
    if (isHydrated && !isInitializedRef.current) {
      isInitializedRef.current = true
      // Check messages from store after rehydration
      const currentMessages = useChatStore.getState().messages
      if (currentMessages.length === 0) {
        setMessages([createWelcomeMessage(customerName)])
      }
    }
  }, [isHydrated, customerName, setMessages])

  // Cart store
  const { addItem: cartAddItem, cart: cartItems, clearCart, provider: cartProvider } = useCart()

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
    const userMessage: StoredChatMessage = {
      id: generateId(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    }

    addMessage(userMessage)
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

      // Get cart provider info for conflict detection
      const cartProviderId = cartItems.length > 0 ? cartProvider?.id : undefined
      const cartProviderName = cartItems.length > 0 ? cartProvider?.name_ar : undefined

      const requestBody: ChatAPIRequest = {
        messages: conversationHistory,
        customer_id: userId,
        city_id: cityId || '',
        selected_provider_id: selectedProviderId,
        selected_provider_category: selectedProviderCategory,
        selected_category: selectedCategory,
        memory,
        cart_provider_id: cartProviderId,
        cart_provider_name: cartProviderName,
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
      // Always update these values (even if undefined to clear them)
      if (data.selected_provider_id !== undefined) {
        setSelectedProviderId(data.selected_provider_id || undefined)
      }
      if (data.selected_provider_category !== undefined) {
        setSelectedProviderCategory(data.selected_provider_category || undefined)
      }
      if (data.selected_category !== undefined) {
        setSelectedCategory(data.selected_category || undefined)
      }
      // Memory must be updated to preserve pending_item, pending_variant, awaiting_quantity
      if (data.memory !== undefined) {
        setMemory(data.memory)
      }

      // Handle navigation request (component should handle actual navigation)
      if (data.navigate_to) {
        setPendingNavigation(data.navigate_to)
      }

      // Helper function to process a single cart action
      const processCartAction = (action: CartAction, shouldClearFirst: boolean = false) => {
        // Handle CLEAR_CART - just clear the cart, don't add anything
        if (action.type === 'CLEAR_CART') {
          clearCart()
          return
        }

        // If CLEAR_AND_ADD or shouldClearFirst, clear the cart first
        if (action.type === 'CLEAR_AND_ADD' || shouldClearFirst) {
          clearCart()
        }

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

      // Handle multiple cart actions (e.g., "Add All" from reorder)
      if (data.cart_actions && Array.isArray(data.cart_actions) && data.cart_actions.length > 0) {
        // Check if first action is CLEAR_AND_ADD - only clear once
        const shouldClearFirst = data.cart_actions[0]?.type === 'CLEAR_AND_ADD'
        data.cart_actions.forEach((action, index) => {
          processCartAction(action, index === 0 && shouldClearFirst)
        })
      }
      // Handle single cart action (backward compatibility)
      else if (data.cart_action && (data.cart_action.type === 'ADD_ITEM' || data.cart_action.type === 'CLEAR_AND_ADD' || data.cart_action.type === 'CLEAR_CART')) {
        processCartAction(data.cart_action)
      }

      // Convert quick_replies to suggestions format
      const suggestions = data.quick_replies?.map(qr => qr.title) || []

      // Add assistant message
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        suggestions,
        quickReplies: data.quick_replies,
      })

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }

      console.error('Chat error:', err)
      const errorMessage = err instanceof Error ? err.message : 'حصلت مشكلة'
      setError(errorMessage)

      // Add error message
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: `عذراً، ${errorMessage}. ممكن تجرب تاني؟ 🙏`,
        timestamp: new Date(),
        suggestions: ['🔄 جرب تاني', '🏠 الرئيسية'],
      })
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingContent('')
    }
  }, [isLoading, messages, userId, cityId, selectedProviderId, selectedProviderCategory, selectedCategory, memory, cartAddItem, cartItems, cartProvider, clearCart, addMessage, setSelectedProviderId, setSelectedProviderCategory, setMemory])

  /**
   * Send quick action
   * Handles both title-based actions and payload-based actions
   * Displays the title to user but sends payload to API
   */
  const sendQuickAction = useCallback(async (action: string, payload?: string) => {
    if (isLoading) return

    let displayText = action
    let messageToSend = payload || action

    // Find payload from last message's quickReplies
    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop()
    const quickReplies = (lastAssistantMessage as ChatMessage & { quickReplies?: QuickReply[] })?.quickReplies
    // Check both by title AND by payload
    const matchingReply = quickReplies?.find(qr => qr.title === action || qr.payload === action)

    if (matchingReply) {
      displayText = matchingReply.title
      messageToSend = matchingReply.payload
    } else {
      // Map QuickActionsBar actions (payload → display text)
      const quickActionLabels: Record<string, string> = {
        'reorder_last': '🔄 إعادة آخر طلب',
        'show_promotions': '🔥 العروض',
        'show_popular': '⭐ الأكثر طلباً',
        'show_nearby': '📍 الأقرب',
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
        '🔥 العروض': 'show_promotions',
        '📋 شوف المنيو': selectedProviderId ? `provider:${selectedProviderId}` : 'مرحبا',
        '🔍 ابحث': 'search',
      }

      // If action is a QuickActionsBar payload, use its label for display
      if (quickActionLabels[action]) {
        displayText = quickActionLabels[action]
        messageToSend = action // The payload is already correct
      } else {
        messageToSend = actionMessages[action] || action
      }
    }

    // Store last message for retry
    lastUserMessageRef.current = displayText

    // Handle navigate: payloads directly (don't send to API)
    if (messageToSend.startsWith('navigate:')) {
      const navigatePath = messageToSend.replace('navigate:', '')
      console.log('🚀 [NAVIGATE] Direct navigation to:', navigatePath)
      setPendingNavigation(navigatePath)
      return // Don't proceed with API call
    }

    // Cancel any ongoing request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    // Add user message with DISPLAY text (not the payload)
    const userMessage: StoredChatMessage = {
      id: generateId(),
      role: 'user',
      content: displayText,
      timestamp: new Date(),
    }

    addMessage(userMessage)
    setIsLoading(true)
    setError(null)

    try {
      // Build conversation history for API (use display text in history)
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = messages
        .filter(m => m.id !== 'welcome' && (m.role === 'user' || m.role === 'assistant'))
        .slice(-10)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      // Add current message with PAYLOAD for API
      conversationHistory.push({ role: 'user', content: messageToSend })

      // Parse category payload and update selected_category
      let categoryToSend = selectedCategory
      if (messageToSend.startsWith('category:')) {
        const categoryCode = messageToSend.replace('category:', '')
        setSelectedCategory(categoryCode)
        categoryToSend = categoryCode
      }

      // Get cart provider info for conflict detection
      const cartProviderId = cartItems.length > 0 ? cartProvider?.id : undefined
      const cartProviderName = cartItems.length > 0 ? cartProvider?.name_ar : undefined

      const requestBody: ChatAPIRequest = {
        messages: conversationHistory,
        customer_id: userId,
        city_id: cityId || '',
        selected_provider_id: selectedProviderId,
        selected_provider_category: selectedProviderCategory,
        selected_category: categoryToSend,
        memory,
        cart_provider_id: cartProviderId,
        cart_provider_name: cartProviderName,
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

      const data: ChatAPIResponse = await response.json()

      // Update conversation state from response
      // Always update these values (even if undefined to clear them)
      if (data.selected_provider_id !== undefined) {
        setSelectedProviderId(data.selected_provider_id || undefined)
      }
      if (data.selected_provider_category !== undefined) {
        setSelectedProviderCategory(data.selected_provider_category || undefined)
      }
      if (data.selected_category !== undefined) {
        setSelectedCategory(data.selected_category || undefined)
      }
      // Memory must be updated to preserve pending_item, pending_variant, awaiting_quantity
      if (data.memory !== undefined) {
        setMemory(data.memory)
      }

      // Handle navigation request (component should handle actual navigation)
      if (data.navigate_to) {
        setPendingNavigation(data.navigate_to)
      }

      // Helper function to process a single cart action
      const processCartAction = (action: CartAction, shouldClearFirst: boolean = false) => {
        // Handle CLEAR_CART - just clear the cart, don't add anything
        if (action.type === 'CLEAR_CART') {
          clearCart()
          return
        }

        // If CLEAR_AND_ADD or shouldClearFirst, clear the cart first
        if (action.type === 'CLEAR_AND_ADD' || shouldClearFirst) {
          clearCart()
        }

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

        for (let i = 0; i < action.quantity; i++) {
          cartAddItem(menuItem, provider, action.variant_id ? {
            id: action.variant_id,
            variant_type: 'size' as const,
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

      // Handle multiple cart actions (e.g., "Add All" from reorder)
      if (data.cart_actions && Array.isArray(data.cart_actions) && data.cart_actions.length > 0) {
        const shouldClearFirst = data.cart_actions[0]?.type === 'CLEAR_AND_ADD'
        data.cart_actions.forEach((action, index) => {
          processCartAction(action, index === 0 && shouldClearFirst)
        })
      }
      // Handle single cart action (backward compatibility)
      else if (data.cart_action && (data.cart_action.type === 'ADD_ITEM' || data.cart_action.type === 'CLEAR_AND_ADD' || data.cart_action.type === 'CLEAR_CART')) {
        processCartAction(data.cart_action)
      }

      // Convert quick_replies to suggestions format
      const suggestions = data.quick_replies?.map(qr => qr.title) || []

      // Add assistant message
      addMessage({
        id: generateId(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        suggestions,
        quickReplies: data.quick_replies,
      })

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      console.error('Chat error:', err)
      const errorMessage = err instanceof Error ? err.message : 'حصلت مشكلة'
      setError(errorMessage)

      addMessage({
        id: generateId(),
        role: 'assistant',
        content: `عذراً، ${errorMessage}. ممكن تجرب تاني؟ 🙏`,
        timestamp: new Date(),
        suggestions: ['🔄 جرب تاني', '🏠 الرئيسية'],
      })
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, userId, cityId, selectedProviderId, selectedProviderCategory, selectedCategory, memory, cartAddItem, cartItems, cartProvider, clearCart, addMessage, setSelectedProviderId, setSelectedProviderCategory, setSelectedCategory, setMemory])

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
    addMessage({
      id: generateId(),
      role: 'assistant',
      content: `تمام! 🎉 ضفت ${quantity}x ${product.name_ar} للسلة.\n\nتحب تضيف حاجة تانية؟`,
      timestamp: new Date(),
      suggestions: ['🛒 اذهب للسلة', '➕ أضف المزيد', '🏠 الرئيسية'],
    })
  }, [cartAddItem, addMessage])

  /**
   * Clear chat history
   */
  const clearChat = useCallback(() => {
    abortControllerRef.current?.abort()
    // Use store's clearMessages which resets everything and adds welcome message
    clearMessages()
    setMessages([createWelcomeMessage(customerName)])
    setError(null)
    setStreamingContent('')
  }, [customerName, clearMessages, setMessages])

  /**
   * Retry last message
   */
  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      // Remove the last error message if exists
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.content.includes('عذراً') || lastMsg?.content.includes('مشكلة')) {
        setMessages(messages.slice(0, -1))
      }

      await sendMessage(lastUserMessageRef.current)
    }
  }, [sendMessage, messages, setMessages])

  /**
   * Clear pending navigation (after component handles navigation)
   */
  const clearPendingNavigation = useCallback(() => {
    setPendingNavigation(null)
  }, [])

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    streamingContent,
    pendingNavigation,
    sendMessage,
    sendQuickAction,
    addToCartFromChat,
    clearChat,
    retryLastMessage,
    clearPendingNavigation,
  }
}

export default useAIChat
