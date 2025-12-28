'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AdminSidebarContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
  close: () => void
  hasMounted: boolean // To prevent CSS transition on initial render
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined)

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  // Start closed for mobile, CSS handles desktop visibility
  const [isOpen, setIsOpen] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  // Initialize sidebar state based on screen size
  const initializeSidebar = useCallback(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    if (mediaQuery.matches) {
      setIsOpen(true)
    }
  }, [])

  // Check if we're on a large screen and should show sidebar by default
  useEffect(() => {
    // On large screens (lg: 1024px+), sidebar is always visible via CSS
    // This state only controls mobile sidebar visibility
    initializeSidebar()

    // Delay setting hasMounted to allow initial state to settle without animation
    requestAnimationFrame(() => {
      setHasMounted(true)
    })
  }, [initializeSidebar])

  // Listen for auth state changes to re-initialize sidebar
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Re-initialize sidebar state when user signs in
        // This ensures sidebar is visible after login navigation
        initializeSidebar()
      }
    })

    return () => subscription.unsubscribe()
  }, [initializeSidebar])

  const toggle = () => setIsOpen(prev => !prev)
  const close = () => {
    // Only close on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsOpen(false)
    }
  }

  return (
    <AdminSidebarContext.Provider value={{ isOpen, setIsOpen, toggle, close, hasMounted }}>
      {children}
    </AdminSidebarContext.Provider>
  )
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext)
  if (context === undefined) {
    throw new Error('useAdminSidebar must be used within an AdminSidebarProvider')
  }
  return context
}
