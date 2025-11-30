'use client'

import { PermissionsProvider } from '@/lib/permissions/use-permissions'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PermissionsProvider>
      {children}
    </PermissionsProvider>
  )
}
