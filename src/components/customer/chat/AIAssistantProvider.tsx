/**
 * AIAssistantProvider - Wrapper component to add AI chat to pages
 */

'use client'

import { useState, useEffect } from 'react'
import { ChatFAB } from './ChatFAB'
import { SmartAssistant } from './SmartAssistant'
import { createClient } from '@/lib/supabase/client'
import { useGuestLocation } from '@/lib/hooks/useGuestLocation'

interface AIAssistantProviderProps {
  children: React.ReactNode
}

export function AIAssistantProvider({ children }: AIAssistantProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [userId, setUserId] = useState<string | undefined>()
  const { location: guestLocation } = useGuestLocation()
  const governorateId = guestLocation.governorateId
  const cityId = guestLocation.cityId

  // Get current user
  useEffect(() => {
    const supabase = createClient()

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <>
      {children}

      {/* AI Chat FAB */}
      <ChatFAB
        onClick={() => setIsOpen(!isOpen)}
        isOpen={isOpen}
      />

      {/* AI Chat Modal */}
      <SmartAssistant
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userId={userId}
        cityId={cityId || undefined}
        governorateId={governorateId || undefined}
      />
    </>
  )
}

export default AIAssistantProvider
