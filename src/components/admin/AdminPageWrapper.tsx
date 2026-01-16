'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState, useCallback, ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { Shield, Loader2 } from 'lucide-react';

interface AdminPageWrapperProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  requireSuperAdmin?: boolean;
  pendingProviders?: number;
  openTickets?: number;
  pendingTasks?: number;
  pendingApprovals?: number;
  unreadMessages?: number;
}

/**
 * Wrapper component for admin pages that handles:
 * - Authentication check
 * - Sidebar and header rendering
 * - Loading state (inside content area, keeping sidebar visible)
 */
export function AdminPageWrapper({
  children,
  title,
  subtitle,
  requireSuperAdmin = false,
  pendingProviders = 0,
  openTickets = 0,
  pendingTasks = 0,
  pendingApprovals = 0,
  unreadMessages = 0,
}: AdminPageWrapperProps) {
  const locale = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);

        // Check if user is super_admin
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (adminUser?.role === 'super_admin') {
          setIsSuperAdmin(true);
        }
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Always render the shell with sidebar
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar - always visible */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingProviders={pendingProviders}
        openTickets={openTickets}
        pendingTasks={pendingTasks}
        pendingApprovals={pendingApprovals}
        unreadMessages={unreadMessages}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header - show with placeholder if loading */}
        {user ? (
          <AdminHeader
            user={user}
            title={title}
            subtitle={subtitle}
            onMenuClick={() => setSidebarOpen(true)}
            notificationCount={pendingProviders + openTickets}
          />
        ) : (
          <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="lg:hidden w-6 h-6 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="hidden md:flex items-center justify-center flex-1">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                  {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse" />
                <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
              </div>
            </div>
          </header>
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {loading ? (
            // Loading state inside content area
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <p className="text-slate-500">
                  {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </p>
              </div>
            </div>
          ) : !user || !isAdmin ? (
            // Unauthorized state
            <div className="flex items-center justify-center h-64">
              <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
                <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2 text-slate-900">
                  {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
                </h1>
                <p className="text-slate-600 mb-6">
                  {locale === 'ar' ? 'يجب تسجيل الدخول كمسؤول للوصول' : 'Admin access required'}
                </p>
                <Link href={`/${locale}/auth/login`}>
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
                  </Button>
                </Link>
              </div>
            </div>
          ) : requireSuperAdmin && !isSuperAdmin ? (
            // Not super admin
            <div className="flex items-center justify-center h-64">
              <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
                <Shield className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2 text-slate-900">
                  {locale === 'ar' ? 'غير مصرح' : 'Access Denied'}
                </h1>
                <p className="text-slate-600 mb-6">
                  {locale === 'ar'
                    ? 'هذه الصفحة متاحة للمدير التنفيذي فقط'
                    : 'Super admin access required'}
                </p>
                <Link href={`/${locale}/admin`}>
                  <Button size="lg" variant="outline">
                    {locale === 'ar' ? 'العودة للرئيسية' : 'Back to Dashboard'}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // Render children
            children
          )}
        </main>
      </div>
    </div>
  );
}
