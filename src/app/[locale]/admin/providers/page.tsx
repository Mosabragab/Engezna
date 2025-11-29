'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Shield,
  Store,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Users,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Bell,
  User as UserIcon,
  ChevronDown,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  PauseCircle,
  PlayCircle,
  Star,
  Phone,
  MapPin,
  Calendar,
  HeadphonesIcon,
  Activity,
  MoreVertical,
  RefreshCw,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Provider {
  id: string
  name_ar: string
  name_en: string
  category: string
  status: string
  phone: string
  address_ar: string
  rating: number
  total_reviews: number
  total_orders: number
  commission_rate: number
  created_at: string
  logo_url: string | null
}

type FilterStatus = 'all' | 'open' | 'closed' | 'pending_approval' | 'temporarily_paused'

export default function AdminProvidersPage() {
  const locale = useLocale()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isRTL = locale === 'ar'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const [providers, setProviders] = useState<Provider[]>([])
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    paused: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    // Check URL params for initial filter
    const status = searchParams.get('status')
    if (status === 'pending') {
      setStatusFilter('pending_approval')
    }
  }, [searchParams])

  useEffect(() => {
    filterProviders()
  }, [providers, searchQuery, statusFilter, categoryFilter])

  async function checkAuth() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        setIsAdmin(true)
        await loadProviders(supabase)
      }
    }

    setLoading(false)
  }

  async function loadProviders(supabase: ReturnType<typeof createClient>) {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setProviders(data)

      // Calculate stats
      const active = data.filter(p => ['open', 'closed'].includes(p.status)).length
      const pending = data.filter(p => p.status === 'pending_approval').length
      const paused = data.filter(p => p.status === 'temporarily_paused').length

      setStats({
        total: data.length,
        active,
        pending,
        paused,
      })
    }
  }

  function filterProviders() {
    let filtered = [...providers]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name_ar.toLowerCase().includes(query) ||
        p.name_en.toLowerCase().includes(query) ||
        p.phone.includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter)
    }

    setFilteredProviders(filtered)
  }

  async function handleStatusChange(providerId: string, newStatus: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('providers')
      .update({ status: newStatus })
      .eq('id', providerId)

    if (!error) {
      await loadProviders(supabase)
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  const navItems = [
    { icon: Home, label: locale === 'ar' ? 'الرئيسية' : 'Dashboard', path: `/${locale}/admin` },
    { icon: Store, label: locale === 'ar' ? 'المتاجر' : 'Providers', path: `/${locale}/admin/providers`, active: true, badge: stats.pending > 0 ? stats.pending.toString() : undefined },
    { icon: ShoppingBag, label: locale === 'ar' ? 'الطلبات' : 'Orders', path: `/${locale}/admin/orders` },
    { icon: Users, label: locale === 'ar' ? 'العملاء' : 'Customers', path: `/${locale}/admin/customers` },
    { icon: Wallet, label: locale === 'ar' ? 'المالية' : 'Finance', path: `/${locale}/admin/finance` },
    { icon: BarChart3, label: locale === 'ar' ? 'التحليلات' : 'Analytics', path: `/${locale}/admin/analytics` },
    { icon: HeadphonesIcon, label: locale === 'ar' ? 'الدعم' : 'Support', path: `/${locale}/admin/support` },
    { icon: Activity, label: locale === 'ar' ? 'سجل النشاط' : 'Activity Log', path: `/${locale}/admin/activity-log` },
    { icon: Settings, label: locale === 'ar' ? 'الإعدادات' : 'Settings', path: `/${locale}/admin/settings` },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-700'
      case 'closed': return 'bg-slate-100 text-slate-700'
      case 'pending_approval': return 'bg-amber-100 text-amber-700'
      case 'temporarily_paused': return 'bg-yellow-100 text-yellow-700'
      case 'on_vacation': return 'bg-blue-100 text-blue-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      open: { ar: 'مفتوح', en: 'Open' },
      closed: { ar: 'مغلق', en: 'Closed' },
      pending_approval: { ar: 'قيد المراجعة', en: 'Pending' },
      temporarily_paused: { ar: 'متوقف مؤقتاً', en: 'Paused' },
      on_vacation: { ar: 'في إجازة', en: 'On Vacation' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      restaurant: { ar: 'مطعم', en: 'Restaurant' },
      coffee_shop: { ar: 'كافيه', en: 'Coffee Shop' },
      grocery: { ar: 'بقالة', en: 'Grocery' },
      vegetables_fruits: { ar: 'خضار وفواكه', en: 'Vegetables & Fruits' },
    }
    return labels[category]?.[locale === 'ar' ? 'ar' : 'en'] || category
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-slate-900">
            {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
          </h1>
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50
        w-64 bg-white border-${isRTL ? 'l' : 'r'} border-slate-200 shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0
        flex flex-col
      `}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/admin`} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900">{locale === 'ar' ? 'إنجزنا' : 'Engezna'}</h1>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'لوحة المشرفين' : 'Admin Panel'}</p>
              </div>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.active || pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
                {item.badge && (
                  <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} bg-red-500 text-white text-xs px-2 py-0.5 rounded-full`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700">
                <Menu className="w-6 h-6" />
              </button>
              <Link href={`/${locale}/admin`} className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </Link>
            </div>

            <div className="hidden md:flex items-center justify-center flex-1">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  {locale === 'ar' ? 'إدارة المتاجر' : 'Providers Management'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div
                className="relative"
                onMouseEnter={() => setAccountMenuOpen(true)}
                onMouseLeave={() => setAccountMenuOpen(false)}
              >
                <button className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-sm text-red-600">{user?.email?.charAt(0).toUpperCase()}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountMenuOpen && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-56 z-50`}>
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-900">{user?.email?.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                      <div className="border-t border-slate-100 pt-1">
                        <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <LogOut className="w-4 h-4" />
                          {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Store className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'إجمالي المتاجر' : 'Total Providers'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">{locale === 'ar' ? 'نشط' : 'Active'}</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{stats.active}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-700">{locale === 'ar' ? 'قيد المراجعة' : 'Pending'}</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center gap-3 mb-2">
                <PauseCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-700">{locale === 'ar' ? 'متوقف' : 'Paused'}</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{stats.paused}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="open">{locale === 'ar' ? 'مفتوح' : 'Open'}</option>
                <option value="closed">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
                <option value="pending_approval">{locale === 'ar' ? 'قيد المراجعة' : 'Pending'}</option>
                <option value="temporarily_paused">{locale === 'ar' ? 'متوقف مؤقتاً' : 'Paused'}</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
                <option value="restaurant">{locale === 'ar' ? 'مطاعم' : 'Restaurants'}</option>
                <option value="coffee_shop">{locale === 'ar' ? 'كافيهات' : 'Coffee Shops'}</option>
                <option value="grocery">{locale === 'ar' ? 'بقالة' : 'Grocery'}</option>
                <option value="vegetables_fruits">{locale === 'ar' ? 'خضار وفواكه' : 'Vegetables & Fruits'}</option>
              </select>

              {/* Refresh */}
              <Button
                variant="outline"
                onClick={() => {
                  const supabase = createClient()
                  loadProviders(supabase)
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Providers Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'المتجر' : 'Provider'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الفئة' : 'Category'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'التقييم' : 'Rating'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الطلبات' : 'Orders'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'العمولة' : 'Commission'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'تاريخ الانضمام' : 'Joined'}
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProviders.length > 0 ? (
                    filteredProviders.map((provider) => (
                      <tr key={provider.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {provider.logo_url ? (
                                <img src={provider.logo_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Store className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {locale === 'ar' ? provider.name_ar : provider.name_en}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {provider.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{getCategoryLabel(provider.category)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(provider.status)}`}>
                            {getStatusLabel(provider.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-sm text-slate-700">{provider.rating || 0}</span>
                            <span className="text-xs text-slate-400">({provider.total_reviews || 0})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{provider.total_orders || 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{provider.commission_rate}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">{formatDate(provider.created_at)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/${locale}/admin/providers/${provider.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="w-4 h-4 text-slate-500" />
                              </Button>
                            </Link>

                            {provider.status === 'pending_approval' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleStatusChange(provider.id, 'open')}
                                >
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleStatusChange(provider.id, 'rejected')}
                                >
                                  <XCircle className="w-4 h-4 text-red-500" />
                                </Button>
                              </>
                            )}

                            {['open', 'closed'].includes(provider.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleStatusChange(provider.id, 'temporarily_paused')}
                              >
                                <PauseCircle className="w-4 h-4 text-yellow-500" />
                              </Button>
                            )}

                            {provider.status === 'temporarily_paused' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleStatusChange(provider.id, 'open')}
                              >
                                <PlayCircle className="w-4 h-4 text-green-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <Store className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد متاجر مطابقة' : 'No matching providers found'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
