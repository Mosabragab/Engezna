'use client'

import { ReactNode } from 'react'
import { PermissionsProvider } from '@/lib/permissions/use-permissions'

interface AdminLayoutProps {
  children: ReactNode
}

/**
 * Admin Layout Wrapper
 * يوفر PermissionsProvider لجميع صفحات لوحة التحكم
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <PermissionsProvider>
      {children}
    </PermissionsProvider>
  )
}
