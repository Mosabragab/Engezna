/**
 * SmartAssistant - Main AI Chat Modal Component
 *
 * Architecture: "Sandwich Layout" for mobile
 * - Full-screen overlay (fixed inset-0) on mobile
 * - Fixed header at top
 * - Fixed input at bottom with safe-area-inset
 * - Message list as only scrollable area
 * - Uses 100dvh for proper mobile browser handling
 * - Disables body scroll when open
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

// Custom hook to disable body scroll when chat is open
function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return

    // Save current scroll position and body style
    const scrollY = window.scrollY
    const originalStyle = window.getComputedStyle(document.body).overflow

    // Lock body scroll
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      // Restore body scroll
      document.body.style.overflow = originalStyle
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [isLocked])
}

// Custom hook for Visual Viewport API - handles mobile keyboard
function useVisualViewport() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const handleResize = () => {
      // Calculate keyboard height from visual viewport
      const heightDiff = window.innerHeight - viewport.height
      const keyboardOpen = heightDiff > 150 // 150px threshold

      setKeyboardHeight(keyboardOpen ? heightDiff : 0)
      setIsKeyboardOpen(keyboardOpen)
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

  return { keyboardHeight, isKeyboardOpen }
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Lock body scroll when chat is open (mobile)
  useBodyScrollLock(isOpen)

  // Visual Viewport API for keyboard handling
  const { keyboardHeight, isKeyboardOpen } = useVisualViewport()

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

  // Scroll to bottom on new messages
  useEffect(() => {
    // Use requestAnimationFrame for smoother scroll timing
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [messages, streamingContent])

  // Scroll to bottom when keyboard opens
  useEffect(() => {
    if (isKeyboardOpen) {
      // Small delay to let the viewport settle
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [isKeyboardOpen])

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
          {/* Backdrop - covers everything including BottomNav */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-[60]"
          />

          {/* Chat Modal - Sandwich Layout on Mobile */}
          {/* z-[70] to appear above BottomNavigation (z-50) */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'fixed z-[70] bg-white flex flex-col',
              // MOBILE: Full screen overlay with safe areas
              'inset-0 h-[100dvh]',
              // Safe area insets for all sides (notch, home indicator, curved edges)
              'pt-[env(safe-area-inset-top,0px)]',
              'pb-[env(safe-area-inset-bottom,0px)]',
              'pl-[env(safe-area-inset-left,0px)]',
              'pr-[env(safe-area-inset-right,0px)]',
              // DESKTOP: Floating modal with rounded corners (no safe areas needed)
              'md:inset-auto md:bottom-24 md:left-6 md:w-[400px] md:h-[600px] md:max-h-[80vh]',
              'md:rounded-2xl md:shadow-2xl',
              'md:pt-0 md:pb-0 md:pl-0 md:pr-0'
            )}
          >
            {/* ===== HEADER (Fixed at Top) ===== */}
            <header
              className={cn(
                'shrink-0 flex items-center justify-between bg-primary text-white',
                'px-4 py-3',
                // Minimize header when keyboard is open
                isKeyboardOpen && 'py-2 md:py-3'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'bg-white/20 rounded-full flex items-center justify-center transition-all duration-200',
                    isKeyboardOpen ? 'w-8 h-8 md:w-10 md:h-10' : 'w-10 h-10'
                  )}
                >
                  <Sparkles className={cn(
                    'transition-all duration-200',
                    isKeyboardOpen ? 'w-4 h-4 md:w-5 md:h-5' : 'w-5 h-5'
                  )} />
                </div>
                <div>
                  <h3 className={cn(
                    'font-bold transition-all duration-200',
                    isKeyboardOpen ? 'text-xs md:text-sm' : 'text-sm'
                  )}>
                    مساعد إنجزنا الذكي
                  </h3>
                  {/* Hide subtitle when keyboard is open */}
                  <p className={cn(
                    'text-xs text-white/80 transition-all duration-200',
                    isKeyboardOpen && 'hidden md:block'
                  )}>
                    دردش واطلب
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Cart button */}
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
            </header>

            {/* Quick Actions */}
            <QuickActionsBar
              actions={DEFAULT_QUICK_ACTIONS}
              onActionClick={sendQuickAction}
              disabled={isLoading}
            />

            {/* ===== MESSAGES (Scrollable Area - Only This Section Scrolls) ===== */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth overscroll-contain"
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

            {/* ===== INPUT (Fixed at Bottom) ===== */}
            {/* Safe area is now handled by the container */}
            <div className="shrink-0 border-t bg-white p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="اكتب طلبك هنا... مثال: عايز 2 برجر و بيبسي"
                  className={cn(
                    'flex-1 px-4 py-3 bg-gray-100 rounded-full',
                    // IMPORTANT: text-base (16px) prevents iOS auto-zoom on focus
                    'text-base md:text-sm',
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
