'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TextChat } from './TextChat'
import { useCart, MenuItem, Provider } from '@/lib/store/cart'
import { CartItem } from '@/hooks/customer/useVoiceOrder'

interface ChatFABProps {
  className?: string
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  showFAB?: boolean
}

export function ChatFAB({
  className,
  isOpen: externalIsOpen,
  onOpenChange,
  showFAB = true
}: ChatFABProps) {
  const locale = useLocale()
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const addItem = useCart((state) => state.addItem)

  // Show tooltip for new users
  useEffect(() => {
    const seen = localStorage.getItem('engezna_chat_tooltip_seen')
    if (!seen) {
      const timer = setTimeout(() => setShowTooltip(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Use external state if provided, otherwise use internal
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value)
    } else {
      setInternalIsOpen(value)
    }
  }

  const handleAddToCart = (items: CartItem[]) => {
    if (items.length === 0) return

    // Create provider object from first item
    const firstItem = items[0]
    const provider: Provider = {
      id: firstItem.providerId,
      name_ar: firstItem.providerNameAr || firstItem.providerName,
      name_en: firstItem.providerName,
      delivery_fee: 0, // Will be updated when loading provider details
      min_order_amount: 0,
      estimated_delivery_time_min: 30,
    }

    items.forEach((item) => {
      const menuItem: MenuItem = {
        id: item.productId,
        provider_id: item.providerId,
        name_ar: item.productNameAr || item.productName,
        name_en: item.productName,
        description_ar: null,
        description_en: null,
        price: item.price,
        image_url: null,
        is_available: true,
        is_vegetarian: false,
        is_spicy: false,
        preparation_time_min: 15,
      }

      // Add each item with its quantity
      for (let i = 0; i < item.quantity; i++) {
        addItem(menuItem, provider)
      }
    })

    // Close the chat after adding to cart
    setIsOpen(false)
  }

  const handleClick = () => {
    setShowTooltip(false)
    localStorage.setItem('engezna_chat_tooltip_seen', 'true')
    setIsOpen(true)
  }

  return (
    <>
      {/* Floating Action Button - only show if showFAB is true */}
      {showFAB && (
        <>
          {/* Tooltip for new users */}
          {showTooltip && !isOpen && (
            <div className="fixed z-40 bottom-36 end-4 sm:bottom-24 sm:end-6 animate-bounce">
              <div className="bg-slate-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg">
                {locale === 'ar' ? '💬 دردش واطلب!' : '💬 Chat & Order!'}
              </div>
              <div className="absolute -bottom-2 end-5 w-0 h-0 border-x-8 border-t-8 border-transparent border-t-slate-900" />
            </div>
          )}

          <button
            onClick={handleClick}
            className={cn(
              'fixed z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95',
              'bottom-20 end-4 sm:bottom-6 sm:end-6', // Position above bottom nav on mobile
              className
            )}
            aria-label={locale === 'ar' ? 'دردش واطلب' : 'Chat and Order'}
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Text Chat Modal */}
      <TextChat
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAddToCart={handleAddToCart}
      />
    </>
  )
}

// Keep backward compatibility export
export { ChatFAB as VoiceOrderFAB }
