'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AdminSidebarContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
  close: () => void
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined)

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  // Start closed for mobile, CSS handles desktop visibility
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Check if we're on a large screen and should show sidebar by default
  useEffect(() => {
    setIsMounted(true)
    // On large screens (lg: 1024px+), sidebar is always visible via CSS
    // This state only controls mobile sidebar visibility
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    if (mediaQuery.matches) {
      setIsOpen(true)
    }
  }, [])

  const toggle = () => setIsOpen(prev => !prev)
  const close = () => {
    // Only close on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsOpen(false)
    }
  }

  return (
    <AdminSidebarContext.Provider value={{ isOpen, setIsOpen, toggle, close }}>
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
