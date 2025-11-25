'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { 
  Shield,
  Users,
  Store,
  BarChart3,
  Settings,
  LogOut,
  Home
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center bg-slate-900 p-8 rounded-2xl border border-slate-800">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-white">
            {locale === 'ar' ? 'لوحة الإدارة' : 'Admin Dashboard'}
          </h1>
          <p className="text-slate-400 mb-6">
            {locale === 'ar' ? 'يجب تسجيل الدخول كمسؤول' : 'Admin login required'}
          </p>
          <Link href={`/${locale}/auth/login`}>
            <Button size="lg" className="bg-red-600 hover:bg-red-700">
              {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{locale === 'ar' ? 'إنجزنا' : 'Engezna'}</h1>
              <p className="text-xs text-slate-400">{locale === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}`}>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                <Home className="w-4 h-4 mr-2" />
                {locale === 'ar' ? 'الموقع' : 'Site'}
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {locale === 'ar' ? 'خروج' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            {locale === 'ar' ? 'مرحباً، مسؤول' : 'Welcome, Admin'} 👋
          </h2>
          <p className="text-slate-400">
            {locale === 'ar' ? 'إدارة منصة إنجزنا' : 'Manage Engezna Platform'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <Users className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-2xl font-bold">0</h3>
            <p className="text-slate-400 text-sm">{locale === 'ar' ? 'المستخدمين' : 'Users'}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <Store className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="text-2xl font-bold">4</h3>
            <p className="text-slate-400 text-sm">{locale === 'ar' ? 'المتاجر' : 'Stores'}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <BarChart3 className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-2xl font-bold">0</h3>
            <p className="text-slate-400 text-sm">{locale === 'ar' ? 'الطلبات' : 'Orders'}</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <Settings className="w-8 h-8 text-orange-400 mb-3" />
            <h3 className="text-2xl font-bold">Active</h3>
            <p className="text-slate-400 text-sm">{locale === 'ar' ? 'حالة النظام' : 'System Status'}</p>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-2xl p-6 border border-red-800/50">
          <h3 className="font-bold text-red-300 mb-2">
            🚀 {locale === 'ar' ? 'قريباً!' : 'Coming Soon!'}
          </h3>
          <p className="text-slate-300 text-sm">
            {locale === 'ar' 
              ? 'لوحة الإدارة الكاملة قيد التطوير. ستتمكن من إدارة المستخدمين والمتاجر والطلبات.'
              : 'Full admin dashboard is under development. You will be able to manage users, stores, and orders.'}
          </p>
        </div>
      </main>
    </div>
  )
}
