'use client'

import { PermissionsProvider } from '@/lib/permissions/use-permissions'
import { AdminSidebarProvider } from '@/components/admin/AdminSidebarContext'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PermissionsProvider>
      <AdminSidebarProvider>
        {children}
      </AdminSidebarProvider>
    </PermissionsProvider>
  )
}
