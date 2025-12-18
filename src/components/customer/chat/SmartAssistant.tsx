/**
 * SmartAssistant - Main AI Chat Modal Component
 *
 * Features:
 * - Dynamic Viewport Height (dvh) for proper mobile keyboard handling
 * - Visual Viewport API for keyboard-aware positioning
 * - Auto-scroll to latest message
 * - Minimized header when input is focused (mobile)
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, Sparkles, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAIChat } from '@/hooks/useAIChat'
import { MessageBubble } from './MessageBubble'
import { QuickActionsBar } from './QuickActionsBar'
import { DEFAULT_QUICK_ACTIONS } from '@/types/chat'
import type { ChatProduct } from '@/types/chat'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/store/cart'
import { createClient } from '@/lib/supabase/client'

// Custom hook for Visual Viewport API - handles mobile keyboard
function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const handleResize = () => {
      const newHeight = viewport.height
      setViewportHeight(newHeight)

      // Detect keyboard by comparing visual viewport to window height
      // Keyboard is open if visual viewport is significantly smaller
      const heightDiff = window.innerHeight - newHeight
      setIsKeyboardOpen(heightDiff > 150) // 150px threshold for keyboard
    }

    // Initial measurement
    handleResize()

    viewport.addEventListener('resize', handleResize)
    viewport.addEventListener('scroll', handleResize)

    return () => {
      viewport.removeEventListener('resize', handleResize)
      viewport.removeEventListener('scroll', handleResize)
    }
  }, [])

  return { viewportHeight, isKeyboardOpen }
}

interface SmartAssistantProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  cityId?: string
  governorateId?: string
  customerName?: string // Can be passed directly if already available
  providerContext?: {    // Provider context when opened from provider page
    id: string
    name: string
  }
}

export function SmartAssistant({
  isOpen,
  onClose,
  userId,
  cityId,
  governorateId,
  customerName: propCustomerName,
  providerContext,
}: SmartAssistantProps) {
  const [inputValue, setInputValue] = useState('')
  const [customerName, setCustomerName] = useState<string | undefined>(propCustomerName)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Visual Viewport API for keyboard handling
  const { viewportHeight, isKeyboardOpen } = useVisualViewport()

  // Fetch customer name if userId is available and customerName not provided
  useEffect(() => {
    if (userId && !propCustomerName) {
      const fetchCustomerName = async () => {
        try {
          const supabase = createClient()
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single()

          if (profile?.full_name) {
            // Extract first name for friendly greeting
            const firstName = profile.full_name.split(' ')[0]
            setCustomerName(firstName)
          }
        } catch (error) {
          // Error handled silently
        }
      }
      fetchCustomerName()
    }
  }, [userId, propCustomerName])

  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    pendingNavigation,
    sendMessage,
    sendQuickAction,
    addToCartFromChat,
    clearChat,
    clearPendingNavigation,
  } = useAIChat({ userId, cityId, governorateId, customerName, providerContext })

  // Handle navigation requests from chat
  useEffect(() => {
    if (pendingNavigation) {
      // Close the chat modal first
      onClose()
      // Navigate after a short delay to allow modal to close
      setTimeout(() => {
        router.push(pendingNavigation)
        clearPendingNavigation()
      }, 100)
    }
  }, [pendingNavigation, router, onClose, clearPendingNavigation])

  const { getItemCount } = useCart()
  const cartCount = getItemCount()

  // Scroll to bottom on new messages or keyboard state change
  useEffect(() => {
    // Use requestAnimationFrame for smoother scroll timing
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [messages, streamingContent])

  // Scroll to bottom when keyboard opens (ensures input stays visible)
  useEffect(() => {
    if (isKeyboardOpen && isInputFocused) {
      // Small delay to let the viewport settle
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [isKeyboardOpen, isInputFocused])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle send
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const message = inputValue
    setInputValue('')
    await sendMessage(message)
  }, [inputValue, isLoading, sendMessage])

  // Handle Enter key
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    sendQuickAction(suggestion)
  }, [sendQuickAction])

  // Handle add to cart
  const handleAddToCart = useCallback((product: ChatProduct) => {
    addToCartFromChat(product, 1)
  }, [addToCartFromChat])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
          />

          {/* Chat Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed z-50 bg-white rounded-2xl shadow-2xl',
              'flex flex-col overflow-hidden',
              // Mobile: use dvh for proper keyboard handling
              'inset-x-2 bottom-20 top-20',
              // When keyboard is open on mobile, adjust positioning
              isKeyboardOpen && 'bottom-2 top-2',
              // Desktop: positioned bottom-left
              'md:inset-auto md:bottom-24 md:left-6 md:w-[400px] md:h-[600px] md:max-h-[80vh]'
            )}
            style={{
              // Use Visual Viewport height on mobile when keyboard is open
              ...(isKeyboardOpen && viewportHeight && typeof window !== 'undefined' && window.innerWidth < 768
                ? { height: `${viewportHeight - 16}px`, top: '8px', bottom: 'auto' }
                : {})
            }}
          >
            {/* Header - minimized when keyboard is open on mobile */}
            <div
              className={cn(
                'flex items-center justify-between bg-primary text-white transition-all duration-200',
                // Normal state
                'px-4 py-3',
                // Minimized state when keyboard is open (mobile only)
                isKeyboardOpen && isInputFocused && 'py-2 md:py-3'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'bg-white/20 rounded-full flex items-center justify-center transition-all duration-200',
                    // Normal size
                    'w-10 h-10',
                    // Minimized when keyboard is open
                    isKeyboardOpen && isInputFocused && 'w-8 h-8 md:w-10 md:h-10'
                  )}
                >
                  <Sparkles className={cn(
                    'transition-all duration-200',
                    'w-5 h-5',
                    isKeyboardOpen && isInputFocused && 'w-4 h-4 md:w-5 md:h-5'
                  )} />
                </div>
                <div>
                  <h3
                    className={cn(
                      'font-bold transition-all duration-200',
                      'text-sm',
                      isKeyboardOpen && isInputFocused && 'text-xs md:text-sm'
                    )}
                  >
                    مساعد إنجزنا الذكي
                  </h3>
                  {/* Hide subtitle when minimized */}
                  <p
                    className={cn(
                      'text-xs text-white/80 transition-all duration-200',
                      isKeyboardOpen && isInputFocused && 'hidden md:block'
                    )}
                  >
                    دردش واطلب
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Cart button - navigates to cart page, not checkout */}
                {cartCount > 0 && (
                  <Link href="/ar/cart">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 relative"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                        {cartCount}
                      </span>
                    </Button>
                  </Link>
                )}

                {/* Clear chat */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearChat}
                  className="text-white hover:bg-white/20"
                  title="مسح المحادثة"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                {/* Close */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActionsBar
              actions={DEFAULT_QUICK_ACTIONS}
              onActionClick={sendQuickAction}
              disabled={isLoading}
            />

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth"
            >
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onSuggestionClick={handleSuggestionClick}
                  onAddToCart={handleAddToCart}
                  isStreaming={isStreaming && index === messages.length - 1}
                  streamingContent={
                    isStreaming && index === messages.length - 1
                      ? streamingContent
                      : undefined
                  }
                />
              ))}

              {/* Streaming indicator */}
              {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                <MessageBubble
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                  }}
                  isStreaming={true}
                  streamingContent={streamingContent}
                />
              )}

              {/* Loading indicator */}
              {isLoading && !isStreaming && (
                <div className="flex items-center gap-2 text-gray-500 px-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">جاري الكتابة...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t bg-white p-3 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="اكتب طلبك هنا... مثال: عايز 2 برجر و بيبسي"
                  className={cn(
                    'flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm',
                    'placeholder:text-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30',
                    'disabled:opacity-50'
                  )}
                  disabled={isLoading}
                  dir="rtl"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="rounded-full w-12 h-12 p-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 rotate-180" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SmartAssistant
