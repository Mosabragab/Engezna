'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar, GeoFilter, useAdminGeoFilter } from '@/components/admin'
import type { GeoFilterValue } from '@/components/admin'
import { formatDateTime } from '@/lib/utils/formatters'
import {
  Radio,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Mic,
  Image as ImageIcon,
  Timer,
  TrendingUp,
  Users,
  Store,
  Bell,
  Search,
  Filter,
  BarChart3,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BroadcastStatus, CustomOrderInputType } from '@/types/custom-order'

export const dynamic = 'force-dynamic'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface BroadcastWithDetails {
  id: string
  customer_id: string
  provider_ids: string[]
  original_input_type: CustomOrderInputType
  original_text: string | null
  voice_url: string | null
  image_urls: string[] | null
  status: BroadcastStatus
  pricing_deadline: string
  expires_at: string
  created_at: string
  completed_at: string | null
  winning_order_id: string | null
  customer: {
    id: string
    full_name: string
    phone: string | null
  } | null
  requests: {
    id: string
    provider_id: string
    status: string
    total: number
    priced_at: string | null
    provider: {
      id: string
      name_ar: string
      name_en: string
    } | null
  }[]
}

interface Stats {
  total: number
  active: number
  completed: number
  expired: number
  avgResponseTime: number
  totalValue: number
}

type FilterStatus = 'all' | 'active' | 'completed' | 'expired' | 'cancelled'

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminCustomOrdersPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [broadcasts, setBroadcasts] = useState<BroadcastWithDetails[]>([])
  const [filteredBroadcasts, setFilteredBroadcasts] = useState<BroadcastWithDetails[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const { geoFilter, setGeoFilter, isRegionalAdmin } = useAdminGeoFilter()
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    completed: 0,
    expired: 0,
    avgResponseTime: 0,
    totalValue: 0,
  })

  // Check auth
  useEffect(() => {
    checkAuth()
  }, [])

  // Filter broadcasts
  useEffect(() => {
    filterBroadcasts()
  }, [broadcasts, searchQuery, statusFilter])

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
        setLoading(false)
        loadBroadcasts()
        return
      }
    }

    setLoading(false)
  }

  async function loadBroadcasts() {
    setDataLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('custom_order_broadcasts')
      .select(`
        *,
        customer:profiles!custom_order_broadcasts_customer_id_fkey(
          id,
          full_name,
          phone
        ),
        requests:custom_order_requests(
          id,
          provider_id,
          status,
          total,
          priced_at,
          provider:providers(
            id,
            name_ar,
            name_en
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      const transformed = data.map((b: any) => ({
        ...b,
        customer: Array.isArray(b.customer) ? b.customer[0] : b.customer,
        requests: (b.requests || []).map((r: any) => ({
          ...r,
          provider: Array.isArray(r.provider) ? r.provider[0] : r.provider,
        })),
      }))
      setBroadcasts(transformed)
      calculateStats(transformed)
    }

    setDataLoading(false)
  }

  function calculateStats(data: BroadcastWithDetails[]) {
    const active = data.filter(b => b.status === 'active').length
    const completed = data.filter(b => b.status === 'completed').length
    const expired = data.filter(b => b.status === 'expired').length

    // Calculate average response time
    const pricedRequests = data.flatMap(b => b.requests).filter(r => r.priced_at)
    const totalResponseTime = pricedRequests.reduce((sum, r) => {
      const broadcast = data.find(b => b.requests.some(req => req.id === r.id))
      if (broadcast && r.priced_at) {
        const created = new Date(broadcast.created_at).getTime()
        const priced = new Date(r.priced_at).getTime()
        return sum + (priced - created)
      }
      return sum
    }, 0)
    const avgResponseTime = pricedRequests.length > 0
      ? Math.round(totalResponseTime / pricedRequests.length / 60000) // in minutes
      : 0

    // Calculate total value
    const totalValue = data.reduce((sum, b) => {
      const approvedRequest = b.requests.find(r => r.status === 'customer_approved')
      return sum + (approvedRequest?.total || 0)
    }, 0)

    setStats({
      total: data.length,
      active,
      completed,
      expired,
      avgResponseTime,
      totalValue,
    })
  }

  function filterBroadcasts() {
    let result = [...broadcasts]

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(b =>
        b.customer?.full_name?.toLowerCase().includes(query) ||
        b.customer?.phone?.includes(query) ||
        b.original_text?.toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query)
      )
    }

    setFilteredBroadcasts(result)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadBroadcasts()
    setRefreshing(false)
  }

  // Calculate time remaining
  const getTimeRemaining = (deadline: string) => {
    const now = new Date().getTime()
    const deadlineTime = new Date(deadline).getTime()
    const diff = deadlineTime - now

    if (diff <= 0) return { expired: true, text: isRTL ? 'منتهي' : 'Expired' }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return {
      expired: false,
      text: `${hours}h ${minutes}m`,
      urgent: diff < 30 * 60 * 1000,
    }
  }

  // Get input type icon
  const getInputIcon = (type: CustomOrderInputType) => {
    switch (type) {
      case 'voice':
        return <Mic className="w-4 h-4" />
      case 'image':
        return <ImageIcon className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  // Status badge
  const getStatusBadge = (status: BroadcastStatus) => {
    const configs = {
      active: {
        icon: Radio,
        label: isRTL ? 'نشط' : 'Active',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      },
      completed: {
        icon: CheckCircle2,
        label: isRTL ? 'مكتمل' : 'Completed',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      },
      expired: {
        icon: XCircle,
        label: isRTL ? 'منتهي' : 'Expired',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
      },
      cancelled: {
        icon: XCircle,
        label: isRTL ? 'ملغي' : 'Cancelled',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      },
    }
    const config = configs[status]
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAdmin || !user) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {isRTL ? 'غير مصرح' : 'Unauthorized'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {isRTL ? 'ليس لديك صلاحية للوصول لهذه الصفحة' : 'You do not have permission to access this page'}
          </p>
          <Link href={`/${locale}/admin/login`}>
            <Button>{isRTL ? 'تسجيل الدخول' : 'Login'}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AdminHeader
        user={user}
        title={isRTL ? 'مراقبة البث الثلاثي' : 'Broadcast Monitor'}
        onMenuClick={toggleSidebar}
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                <Radio className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.total}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isRTL ? 'إجمالي البثوث' : 'Total Broadcasts'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Timer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isRTL ? 'نشط الآن' : 'Active Now'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completed}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isRTL ? 'مكتمل' : 'Completed'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.expired}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isRTL ? 'منتهي' : 'Expired'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.avgResponseTime}m</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isRTL ? 'متوسط الاستجابة' : 'Avg Response'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{stats.totalValue.toFixed(0)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isRTL ? 'إجمالي القيمة' : 'Total Value'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'بحث بالعميل أو الهاتف...' : 'Search by customer or phone...'}
                className="w-full ps-10 pe-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</option>
                <option value="active">{isRTL ? 'نشط' : 'Active'}</option>
                <option value="completed">{isRTL ? 'مكتمل' : 'Completed'}</option>
                <option value="expired">{isRTL ? 'منتهي' : 'Expired'}</option>
                <option value="cancelled">{isRTL ? 'ملغي' : 'Cancelled'}</option>
              </select>
            </div>

            {/* Analytics Link */}
            <Link href={`/${locale}/admin/custom-orders/analytics`}>
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 me-2" />
                {isRTL ? 'التحليلات' : 'Analytics'}
              </Button>
            </Link>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 me-2 ${refreshing ? 'animate-spin' : ''}`} />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Broadcasts List */}
        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center">
            <Radio className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
              {isRTL ? 'لا توجد بثوث' : 'No broadcasts found'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {isRTL ? 'لم يتم العثور على بثوث تطابق معايير البحث' : 'No broadcasts match your search criteria'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredBroadcasts.map((broadcast, index) => {
                const timeRemaining = getTimeRemaining(broadcast.pricing_deadline)
                const pricedCount = broadcast.requests.filter(r => r.status === 'priced' || r.status === 'customer_approved').length
                const totalProviders = broadcast.provider_ids.length

                return (
                  <motion.div
                    key={broadcast.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden ${
                      broadcast.status === 'active' && timeRemaining.urgent
                        ? 'border-2 border-amber-400 dark:border-amber-600'
                        : ''
                    }`}
                  >
                    {/* Urgent Banner */}
                    {broadcast.status === 'active' && timeRemaining.urgent && (
                      <div className="bg-amber-50 dark:bg-amber-900/30 px-4 py-2 flex items-center gap-2 border-b border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                          {isRTL ? 'المهلة على وشك الانتهاء!' : 'Deadline approaching!'}
                        </span>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left Side */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusBadge(broadcast.status)}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                              {getInputIcon(broadcast.original_input_type)}
                              {broadcast.original_input_type}
                            </span>
                            {broadcast.status === 'active' && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                timeRemaining.urgent
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                              }`}>
                                <Timer className="w-3 h-3" />
                                {timeRemaining.text}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {broadcast.customer?.full_name || (isRTL ? 'عميل' : 'Customer')}
                              </span>
                            </div>
                            {broadcast.customer?.phone && (
                              <span className="text-slate-500 dark:text-slate-400">
                                {broadcast.customer.phone}
                              </span>
                            )}
                          </div>

                          {broadcast.original_text && (
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                              {broadcast.original_text}
                            </p>
                          )}
                        </div>

                        {/* Right Side */}
                        <div className="text-end">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                            {formatDateTime(broadcast.created_at, locale)}
                          </p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {pricedCount}/{totalProviders} {isRTL ? 'تسعيرات' : 'priced'}
                          </p>
                          <Link href={`/${locale}/admin/custom-orders/${broadcast.id}`}>
                            <Button variant="outline" size="sm" className="mt-2">
                              <Eye className="w-4 h-4 me-1" />
                              {isRTL ? 'عرض' : 'View'}
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Providers Progress */}
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 flex-wrap">
                          {broadcast.requests.map((req) => (
                            <div
                              key={req.id}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
                                req.status === 'priced' || req.status === 'customer_approved'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : req.status === 'expired'
                                  ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}
                            >
                              <Store className="w-3 h-3" />
                              {req.provider?.name_ar || req.provider_id.slice(0, 6)}
                              {req.status === 'priced' && req.total && (
                                <span className="font-medium">{req.total.toFixed(0)}</span>
                              )}
                              {req.status === 'customer_approved' && (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
