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

interface AdminUser {
  id: string
  role: string
  assigned_regions: Array<{ governorate_id?: string; city_id?: string }>
}

function AdminLayoutInner({ children }: AdminLayoutInnerProps) {
  const pathname = usePathname()
  const { isOpen, close, hasMounted } = useAdminSidebar()
  const [pendingProviders, setPendingProviders] = useState(0)
  const [openTickets, setOpenTickets] = useState(0)
  const [pendingBannerApprovals, setPendingBannerApprovals] = useState(0)
  const [pendingRefunds, setPendingRefunds] = useState(0)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)

  // Check if current page is login page - don't show sidebar
  const isLoginPage = pathname?.includes('/admin/login')

  useEffect(() => {
    // Don't load badge counts on login page
    if (isLoginPage) return

    // First load admin user data, then badge counts
    loadAdminAndBadges()
    // Refresh badge counts every 60 seconds
    const interval = setInterval(() => loadBadgeCounts(adminUser), 60000)
    return () => clearInterval(interval)
  }, [isLoginPage])

  async function loadAdminAndBadges() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Get admin user's assigned_regions
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id, role, assigned_regions')
      .eq('user_id', user.id)
      .single()

    if (adminData) {
      setAdminUser(adminData as AdminUser)
      await loadBadgeCounts(adminData as AdminUser)
    }
  }

  async function loadBadgeCounts(admin: AdminUser | null) {
    try {
      const supabase = createClient()

      // Determine region filter
      const isSuperAdmin = admin?.role === 'super_admin'
      const assignedGovernorateIds = !isSuperAdmin && admin?.assigned_regions
        ? (admin.assigned_regions || [])
            .map(r => r.governorate_id)
            .filter(Boolean) as string[]
        : []
      const hasRegionFilter = assignedGovernorateIds.length > 0

      // Get provider IDs for the region (needed for filtering related data)
      let regionProviderIds: string[] = []
      if (hasRegionFilter) {
        const { data: regionProviders } = await supabase
          .from('providers')
          .select('id')
          .in('governorate_id', assignedGovernorateIds)
        regionProviderIds = regionProviders?.map(p => p.id) || []
      }

      // Get pending providers count (filtered by region)
      let providersQuery = supabase
        .from('providers')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_approval', 'incomplete'])

      if (hasRegionFilter) {
        providersQuery = providersQuery.in('governorate_id', assignedGovernorateIds)
      }

      const { count: providersCount, error: providersError } = await providersQuery

      if (!providersError) {
        setPendingProviders(providersCount || 0)
      }

      // Get open tickets count (filtered by provider's region)
      // If regional admin has no providers in their region, show 0
      if (hasRegionFilter && regionProviderIds.length === 0) {
        setOpenTickets(0)
      } else {
        let ticketsQuery = supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')

        if (hasRegionFilter && regionProviderIds.length > 0) {
          ticketsQuery = ticketsQuery.in('provider_id', regionProviderIds)
        }

        const { count: ticketsCount, error: ticketsError } = await ticketsQuery

        if (!ticketsError) {
          setOpenTickets(ticketsCount || 0)
        }
      }

      // Get pending banner approvals count (filtered by provider's region)
      // If regional admin has no providers in their region, show 0
      if (hasRegionFilter && regionProviderIds.length === 0) {
        setPendingBannerApprovals(0)
      } else {
        let bannersQuery = supabase
          .from('homepage_banners')
          .select('*', { count: 'exact', head: true })
          .not('provider_id', 'is', null)
          .eq('approval_status', 'pending')

        if (hasRegionFilter && regionProviderIds.length > 0) {
          bannersQuery = bannersQuery.in('provider_id', regionProviderIds)
        }

        const { count: bannerApprovalsCount, error: bannerApprovalsError } = await bannersQuery

        if (!bannerApprovalsError) {
          setPendingBannerApprovals(bannerApprovalsCount || 0)
        }
      }

      // Get pending refunds count (filtered by provider's region)
      // If regional admin has no providers in their region, show 0
      if (hasRegionFilter && regionProviderIds.length === 0) {
        setPendingRefunds(0)
      } else {
        let refundsQuery = supabase
          .from('refunds')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        if (hasRegionFilter && regionProviderIds.length > 0) {
          refundsQuery = refundsQuery.in('provider_id', regionProviderIds)
        }

        const { count: refundsCount, error: refundsError } = await refundsQuery

        if (!refundsError) {
          setPendingRefunds(refundsCount || 0)
        }
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
        pendingRefunds={pendingRefunds}
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
