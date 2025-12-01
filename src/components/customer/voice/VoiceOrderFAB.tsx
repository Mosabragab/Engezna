'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Mic } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VoiceOrderChat } from './VoiceOrderChat'
import { useCart, MenuItem, Provider } from '@/lib/store/cart'
import { CartItem } from '@/hooks/customer/useVoiceOrder'

interface VoiceOrderFABProps {
  className?: string
}

export function VoiceOrderFAB({ className }: VoiceOrderFABProps) {
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const addItem = useCart((state) => state.addItem)

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

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95',
          'bottom-20 end-4 sm:bottom-6 sm:end-6', // Position above bottom nav on mobile
          className
        )}
        aria-label={locale === 'ar' ? 'اطلب بصوتك' : 'Order with voice'}
      >
        <Mic className="w-6 h-6" />

        {/* Pulse Animation */}
        <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
      </button>

      {/* Tooltip on hover - Desktop only */}
      <div
        className={cn(
          'fixed z-40 hidden sm:block',
          'bottom-6 end-24',
          'bg-slate-900 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg',
          'opacity-0 pointer-events-none transition-opacity group-hover:opacity-100',
          isOpen && 'hidden'
        )}
      >
        {locale === 'ar' ? 'اطلب بصوتك 🎤' : 'Order with voice 🎤'}
      </div>

      {/* Voice Order Chat Modal */}
      <VoiceOrderChat
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAddToCart={handleAddToCart}
      />
    </>
  )
}
