'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { MessageCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SmartAssistant } from '@/components/customer/chat/SmartAssistant'
import { createClient } from '@/lib/supabase/client'

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
  const [userId, setUserId] = useState<string | undefined>()
  const [cityId, setCityId] = useState<string | undefined>()
  const [governorateId, setGovernorateId] = useState<string | undefined>()
  const [customerName, setCustomerName] = useState<string | undefined>()

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          setUserId(user.id)

          // Fetch profile for name and city
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, city_id, governorate_id')
            .eq('id', user.id)
            .single()

          if (profile) {
            setCustomerName(profile.full_name?.split(' ')[0])
            setCityId(profile.city_id)
            setGovernorateId(profile.governorate_id)
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
  }, [])

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
            <Sparkles className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Smart Assistant Modal - NEW SYSTEM */}
      <SmartAssistant
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userId={userId}
        cityId={cityId}
        governorateId={governorateId}
        customerName={customerName}
      />
    </>
  )
}

// Keep backward compatibility export
export { ChatFAB as VoiceOrderFAB }
