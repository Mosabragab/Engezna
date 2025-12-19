'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import { PermissionsProvider } from '@/lib/permissions/use-permissions'
import { AdminSidebarProvider, useAdminSidebar } from '@/components/admin/AdminSidebarContext'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { createClient } from '@/lib/supabase/client'

interface AdminLayoutInnerProps {
  children: React.ReactNode
}

function AdminLayoutInner({ children }: AdminLayoutInnerProps) {
  const pathname = usePathname()
  const { isOpen, close, hasMounted } = useAdminSidebar()
  const [pendingProviders, setPendingProviders] = useState(0)
  const [openTickets, setOpenTickets] = useState(0)
  const [pendingBannerApprovals, setPendingBannerApprovals] = useState(0)

  // Check if current page is login page - don't show sidebar
  const isLoginPage = pathname?.includes('/admin/login')

  useEffect(() => {
    // Don't load badge counts on login page
    if (isLoginPage) return

    loadBadgeCounts()
    // Refresh badge counts every 60 seconds
    const interval = setInterval(loadBadgeCounts, 60000)
    return () => clearInterval(interval)
  }, [isLoginPage])

  async function loadBadgeCounts() {
    try {
      const supabase = createClient()

      // Get pending providers count
      const { count: providersCount, error: providersError } = await supabase
        .from('providers')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_approval', 'incomplete'])

      if (!providersError) {
        setPendingProviders(providersCount || 0)
      }

      // Get open tickets count (if support_tickets table exists)
      const { count: ticketsCount, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')

      if (!ticketsError) {
        setOpenTickets(ticketsCount || 0)
      }

      // Get pending banner approvals count (banners created by providers)
      const { count: bannerApprovalsCount, error: bannerApprovalsError } = await supabase
        .from('homepage_banners')
        .select('*', { count: 'exact', head: true })
        .not('provider_id', 'is', null)
        .eq('approval_status', 'pending')

      if (!bannerApprovalsError) {
        setPendingBannerApprovals(bannerApprovalsCount || 0)
      }
    } catch {
      // Silently fail for badge counts - not critical
    }
  }

  // Login page - render without sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - rendered at layout level, persists across page navigations */}
      <AdminSidebar
        isOpen={isOpen}
        onClose={close}
        pendingProviders={pendingProviders}
        openTickets={openTickets}
        pendingBannerApprovals={pendingBannerApprovals}
        hasMounted={hasMounted}
      />

      {/* Main content area - pages render here */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PermissionsProvider>
      <AdminSidebarProvider>
        <AdminLayoutInner>
          {children}
        </AdminLayoutInner>
      </AdminSidebarProvider>
    </PermissionsProvider>
  )
}
