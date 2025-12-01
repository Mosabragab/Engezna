'use client'

import { ReactNode } from 'react'
import { CustomerHeader } from './CustomerHeader'
import { BottomNavigation } from './BottomNavigation'

interface CustomerLayoutProps {
  children: ReactNode
  showHeader?: boolean
  showBottomNav?: boolean
  headerTitle?: string
  showBackButton?: boolean
  transparentHeader?: boolean
}

export function CustomerLayout({
  children,
  showHeader = true,
  showBottomNav = true,
  headerTitle,
  showBackButton = false,
  transparentHeader = false,
}: CustomerLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {showHeader && (
        <CustomerHeader
          title={headerTitle}
          showBackButton={showBackButton}
          transparent={transparentHeader}
        />
      )}

      {/* Main Content */}
      <main className={`${showBottomNav ? 'pb-20' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && <BottomNavigation />}
    </div>
  )
}
