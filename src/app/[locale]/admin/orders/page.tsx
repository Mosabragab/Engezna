'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Bell,
  ChevronDown,
  Search,
  Eye,
  RefreshCw,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  HeadphonesIcon,
  Activity,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Order {
  id: string
  order_number: string
  status: string
  total: number
  subtotal: number
  delivery_fee: number
  platform_commission: number
  payment_method: string
  payment_status: string
  created_at: string
  delivered_at: string | null
  customer: { id: string; full_name: string; phone: string } | null
  provider: { id: string; name_ar: string; name_en: string } | null
}

type FilterStatus = 'all' | 'pending' | 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'rejected'

export default function AdminOrdersPage() {
  const locale = useLocale()
  const pathname = usePathname()
  const isRTL = locale === 'ar'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchQuery, statusFilter, dateFilter])

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
        await loadOrders(supabase)
      }
    }

    setLoading(false)
  }

  async function loadOrders(supabase: ReturnType<typeof createClient>) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total,
        subtotal,
        delivery_fee,
        platform_commission,
        payment_method,
        payment_status,
        created_at,
        delivered_at,
        customer:profiles!orders_customer_id_fkey(id, full_name, phone),
        provider:providers(id, name_ar, name_en)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setOrders(data as unknown as Order[])

      const pending = data.filter(o => o.status === 'pending').length
      const inProgress = data.filter(o => ['accepted', 'preparing', 'ready', 'out_for_delivery'].includes(o.status)).length
      const delivered = data.filter(o => o.status === 'delivered').length
      const cancelled = data.filter(o => ['cancelled', 'rejected'].includes(o.status)).length
      const totalRevenue = data.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0)

      setStats({
        total: data.length,
        pending,
        inProgress,
        delivered,
        cancelled,
        totalRevenue,
      })
    }
  }

  function filterOrders() {
    let filtered = [...orders]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(query) ||
        o.customer?.full_name?.toLowerCase().includes(query) ||
        o.customer?.phone?.includes(query) ||
        (locale === 'ar' ? o.provider?.name_ar : o.provider?.name_en)?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter)
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.created_at)
        return orderDate.toDateString() === filterDate.toDateString()
      })
    }

    setFilteredOrders(filtered)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = `/${locale}`
  }

  const navItems = [
    { icon: Home, label: locale === 'ar' ? 'الرئيسية' : 'Dashboard', path: `/${locale}/admin` },
    { icon: Store, label: locale === 'ar' ? 'المتاجر' : 'Providers', path: `/${locale}/admin/providers` },
    { icon: ShoppingBag, label: locale === 'ar' ? 'الطلبات' : 'Orders', path: `/${locale}/admin/orders`, active: true },
    { icon: Users, label: locale === 'ar' ? 'العملاء' : 'Customers', path: `/${locale}/admin/customers` },
    { icon: Wallet, label: locale === 'ar' ? 'المالية' : 'Finance', path: `/${locale}/admin/finance` },
    { icon: BarChart3, label: locale === 'ar' ? 'التحليلات' : 'Analytics', path: `/${locale}/admin/analytics` },
    { icon: HeadphonesIcon, label: locale === 'ar' ? 'الدعم' : 'Support', path: `/${locale}/admin/support` },
    { icon: Activity, label: locale === 'ar' ? 'سجل النشاط' : 'Activity Log', path: `/${locale}/admin/activity-log` },
    { icon: Settings, label: locale === 'ar' ? 'الإعدادات' : 'Settings', path: `/${locale}/admin/settings` },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'accepted': case 'preparing': return 'bg-blue-100 text-blue-700'
      case 'ready': return 'bg-cyan-100 text-cyan-700'
      case 'out_for_delivery': return 'bg-purple-100 text-purple-700'
      case 'cancelled': case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'accepted': case 'preparing': return <Package className="w-4 h-4" />
      case 'ready': return <Package className="w-4 h-4" />
      case 'out_for_delivery': return <Truck className="w-4 h-4" />
      case 'cancelled': case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pending: { ar: 'معلق', en: 'Pending' },
      accepted: { ar: 'مقبول', en: 'Accepted' },
      preparing: { ar: 'قيد التحضير', en: 'Preparing' },
      ready: { ar: 'جاهز', en: 'Ready' },
      out_for_delivery: { ar: 'في الطريق', en: 'Out for Delivery' },
      delivered: { ar: 'تم التسليم', en: 'Delivered' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
      rejected: { ar: 'مرفوض', en: 'Rejected' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

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
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700">
                <Menu className="w-6 h-6" />
              </button>
            </div>

            <div className="hidden md:flex items-center justify-center flex-1">
              <h2 className="text-lg font-semibold text-slate-800">
                {locale === 'ar' ? 'إدارة الطلبات' : 'Orders Management'}
              </h2>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg">
                <Bell className="w-5 h-5" />
              </button>
              <div className="relative" onMouseEnter={() => setAccountMenuOpen(true)} onMouseLeave={() => setAccountMenuOpen(false)}>
                <button className="flex items-center gap-2 p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-sm text-red-600">{user?.email?.charAt(0).toUpperCase()}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {accountMenuOpen && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-full pt-2 w-56 z-50`}>
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 py-2">
                      <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="w-4 h-4" />
                        {locale === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBag className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-700">{locale === 'ar' ? 'معلق' : 'Pending'}</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-700">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">{locale === 'ar' ? 'مكتمل' : 'Delivered'}</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{stats.delivered}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{stats.cancelled}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-emerald-700">{locale === 'ar' ? 'الإيرادات' : 'Revenue'}</span>
              </div>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(stats.totalRevenue)} {locale === 'ar' ? 'ج.م' : 'EGP'}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث برقم الطلب أو اسم العميل...' : 'Search by order number or customer...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="pending">{locale === 'ar' ? 'معلق' : 'Pending'}</option>
                <option value="accepted">{locale === 'ar' ? 'مقبول' : 'Accepted'}</option>
                <option value="preparing">{locale === 'ar' ? 'قيد التحضير' : 'Preparing'}</option>
                <option value="ready">{locale === 'ar' ? 'جاهز' : 'Ready'}</option>
                <option value="out_for_delivery">{locale === 'ar' ? 'في الطريق' : 'Out for Delivery'}</option>
                <option value="delivered">{locale === 'ar' ? 'تم التسليم' : 'Delivered'}</option>
                <option value="cancelled">{locale === 'ar' ? 'ملغي' : 'Cancelled'}</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              />

              <Button
                variant="outline"
                onClick={() => {
                  const supabase = createClient()
                  loadOrders(supabase)
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'رقم الطلب' : 'Order #'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'العميل' : 'Customer'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المتجر' : 'Provider'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'العمولة' : 'Commission'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الدفع' : 'Payment'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'عرض' : 'View'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-slate-900">#{order.order_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{order.customer?.full_name || '-'}</p>
                            <p className="text-xs text-slate-500">{order.customer?.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {locale === 'ar' ? order.provider?.name_ar : order.provider?.name_en}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-900">{formatCurrency(order.total)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{formatCurrency(order.platform_commission || 0)} {locale === 'ar' ? 'ج.م' : 'EGP'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-slate-600 capitalize">{order.payment_method}</p>
                            <span className={`text-xs ${order.payment_status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                              {order.payment_status === 'completed' ? (locale === 'ar' ? 'مدفوع' : 'Paid') : (locale === 'ar' ? 'معلق' : 'Pending')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">{formatDateTime(order.created_at)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link href={`/${locale}/admin/orders/${order.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4 text-slate-500" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد طلبات مطابقة' : 'No matching orders found'}
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
