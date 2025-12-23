'use client'

import { useLocale } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatNumber, formatDateTime } from '@/lib/utils/formatters'
import {
  Shield,
  Search,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  HeadphonesIcon,
  User as UserIcon,
  AlertTriangle,
  Info,
  MapPin,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  user_id: string
  provider_id: string | null
  assigned_to: string | null
  user: { full_name: string; email: string; phone: string } | null
  provider: { name_ar: string; name_en: string; governorate_id?: string } | null
  assignee: { full_name: string } | null
  messages_count: number
}

interface Governorate {
  id: string
  name_ar: string
  name_en: string
}

interface AdminUser {
  id: string
  role: string
  assigned_regions: Array<{ governorate_id?: string; city_id?: string; district_id?: string }>
}

type FilterStatus = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed'
type FilterPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent'

export default function AdminSupportPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Geographic filtering state
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('all')
  const isSuperAdmin = adminUser?.role === 'super_admin'

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    urgent: 0,
  })

  const checkAuth = useCallback(async () => {
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

        // Load admin user details (for region-based filtering)
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('id, role, assigned_regions')
          .eq('user_id', user.id)
          .single()

        if (adminData) {
          setAdminUser(adminData as AdminUser)
        }

        // Load governorates for filter dropdown
        const { data: govData } = await supabase
          .from('governorates')
          .select('id, name_ar, name_en')
          .eq('is_active', true)
          .order('name_ar')

        if (govData) {
          setGovernorates(govData)
        }

        await loadTickets(supabase)
      }
    }

    setLoading(false)
  }, [])

  const filterTickets = useCallback(() => {
    let filtered = [...tickets]

    // Geographic filtering
    // Super admin: filter by selected governorate (if not 'all')
    // Regional admin: filter by their assigned regions only
    if (adminUser) {
      const assignedGovernorateIds = (adminUser.assigned_regions || [])
        .map(r => r.governorate_id)
        .filter(Boolean) as string[]

      if (adminUser.role === 'super_admin') {
        // Super admin can filter by any governorate
        if (selectedGovernorate !== 'all') {
          filtered = filtered.filter(t => t.provider?.governorate_id === selectedGovernorate)
        }
      } else if (assignedGovernorateIds.length > 0) {
        // Regional admin: only show tickets from their assigned governorates
        filtered = filtered.filter(t =>
          t.provider?.governorate_id && assignedGovernorateIds.includes(t.provider.governorate_id)
        )
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.ticket_number.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.user?.full_name?.toLowerCase().includes(query) ||
        t.user?.email?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter)
    }

    setFilteredTickets(filtered)
  }, [tickets, searchQuery, statusFilter, priorityFilter, selectedGovernorate, adminUser])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    filterTickets()
  }, [filterTickets])

  async function loadTickets(supabase: ReturnType<typeof createClient>) {
    const { data } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey(full_name, email, phone),
        provider:providers(name_ar, name_en, governorate_id),
        assignee:profiles!support_tickets_assigned_to_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      const ticketsWithCounts = await Promise.all(
        data.map(async (ticket) => {
          const { count } = await supabase
            .from('ticket_messages')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_id', ticket.id)

          return {
            ...ticket,
            messages_count: count || 0,
          }
        })
      )

      setTickets(ticketsWithCounts as SupportTicket[])

      const open = ticketsWithCounts.filter(t => t.status === 'open').length
      const inProgress = ticketsWithCounts.filter(t => t.status === 'in_progress').length
      const resolved = ticketsWithCounts.filter(t => t.status === 'resolved').length
      const urgent = ticketsWithCounts.filter(t => t.priority === 'urgent').length

      setStats({
        total: ticketsWithCounts.length,
        open,
        inProgress,
        resolved,
        urgent,
      })
    }
  }

  function filterTickets() {
    let filtered = [...tickets]

    // Geographic filtering
    // Super admin: filter by selected governorate (if not 'all')
    // Regional admin: filter by their assigned regions only
    if (adminUser) {
      const assignedGovernorateIds = (adminUser.assigned_regions || [])
        .map(r => r.governorate_id)
        .filter(Boolean) as string[]

      if (adminUser.role === 'super_admin') {
        // Super admin can filter by any governorate
        if (selectedGovernorate !== 'all') {
          filtered = filtered.filter(t => t.provider?.governorate_id === selectedGovernorate)
        }
      } else if (assignedGovernorateIds.length > 0) {
        // Regional admin: only show tickets from their assigned governorates
        filtered = filtered.filter(t =>
          t.provider?.governorate_id && assignedGovernorateIds.includes(t.provider.governorate_id)
        )
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.ticket_number.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.user?.full_name?.toLowerCase().includes(query) ||
        t.user?.email?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter)
    }

    setFilteredTickets(filtered)
  }

  async function handleStatusChange(ticketId: string, newStatus: string) {
    setActionLoading(ticketId)
    const supabase = createClient()

    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'resolved') {
      updateData.resolved_at = new Date().toISOString()
    }
    if (newStatus === 'in_progress' && user) {
      updateData.assigned_to = user.id
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)

    if (!error) {
      await loadTickets(supabase)
    }

    setActionLoading(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'resolved': return 'bg-green-100 text-green-700'
      case 'closed': return 'bg-slate-100 text-slate-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-3 h-3" />
      case 'in_progress': return <Clock className="w-3 h-3" />
      case 'resolved': return <CheckCircle2 className="w-3 h-3" />
      case 'closed': return <XCircle className="w-3 h-3" />
      default: return <Info className="w-3 h-3" />
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      open: { ar: 'مفتوح', en: 'Open' },
      in_progress: { ar: 'قيد المعالجة', en: 'In Progress' },
      resolved: { ar: 'تم الحل', en: 'Resolved' },
      closed: { ar: 'مغلق', en: 'Closed' },
    }
    return labels[status]?.[locale === 'ar' ? 'ar' : 'en'] || status
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-green-100 text-green-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      urgent: { ar: 'عاجل', en: 'Urgent' },
      high: { ar: 'عالي', en: 'High' },
      medium: { ar: 'متوسط', en: 'Medium' },
      low: { ar: 'منخفض', en: 'Low' },
    }
    return labels[priority]?.[locale === 'ar' ? 'ar' : 'en'] || priority
  }

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <main className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
        </main>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}
            </h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center bg-slate-50">
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
        </main>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}
        onMenuClick={toggleSidebar}
      />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <HeadphonesIcon className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total, locale)}</p>
            </div>
            <div className="bg-card-bg-warning rounded-xl p-4 border border-warning/30">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-warning" />
                <span className="text-sm text-warning">{locale === 'ar' ? 'مفتوح' : 'Open'}</span>
              </div>
              <p className="text-2xl font-bold text-warning">{formatNumber(stats.open, locale)}</p>
            </div>
            <div className="bg-card-bg-primary rounded-xl p-4 border border-primary/30">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary">{locale === 'ar' ? 'قيد المعالجة' : 'In Progress'}</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatNumber(stats.inProgress, locale)}</p>
            </div>
            <div className="bg-card-bg-success rounded-xl p-4 border border-success/30">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm text-success">{locale === 'ar' ? 'تم الحل' : 'Resolved'}</span>
              </div>
              <p className="text-2xl font-bold text-success">{formatNumber(stats.resolved, locale)}</p>
            </div>
            <div className="bg-card-bg-error rounded-xl p-4 border border-error/30">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-error" />
                <span className="text-sm text-error">{locale === 'ar' ? 'عاجل' : 'Urgent'}</span>
              </div>
              <p className="text-2xl font-bold text-error">{formatNumber(stats.urgent, locale)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث برقم التذكرة أو الموضوع...' : 'Search by ticket number or subject...'}
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
                <option value="open">{locale === 'ar' ? 'مفتوح' : 'Open'}</option>
                <option value="in_progress">{locale === 'ar' ? 'قيد المعالجة' : 'In Progress'}</option>
                <option value="resolved">{locale === 'ar' ? 'تم الحل' : 'Resolved'}</option>
                <option value="closed">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as FilterPriority)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الأولويات' : 'All Priority'}</option>
                <option value="urgent">{locale === 'ar' ? 'عاجل' : 'Urgent'}</option>
                <option value="high">{locale === 'ar' ? 'عالي' : 'High'}</option>
                <option value="medium">{locale === 'ar' ? 'متوسط' : 'Medium'}</option>
                <option value="low">{locale === 'ar' ? 'منخفض' : 'Low'}</option>
              </select>

              {/* Governorate Filter - Only for Super Admin */}
              {isSuperAdmin && governorates.length > 0 && (
                <div className="relative">
                  <MapPin className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
                  <select
                    value={selectedGovernorate}
                    onChange={(e) => setSelectedGovernorate(e.target.value)}
                    className={`${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 min-w-[150px]`}
                  >
                    <option value="all">{locale === 'ar' ? 'كل المحافظات' : 'All Governorates'}</option>
                    {governorates.map((gov) => (
                      <option key={gov.id} value={gov.id}>
                        {locale === 'ar' ? gov.name_ar : gov.name_en}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Show assigned region for regional admins */}
              {!isSuperAdmin && adminUser?.assigned_regions && adminUser.assigned_regions.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {locale === 'ar' ? 'منطقتك: ' : 'Your Region: '}
                    {governorates.find(g => g.id === adminUser.assigned_regions[0]?.governorate_id)?.[locale === 'ar' ? 'name_ar' : 'name_en'] || '-'}
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  const supabase = createClient()
                  loadTickets(supabase)
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'رقم التذكرة' : 'Ticket #'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الموضوع' : 'Subject'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'المستخدم' : 'User'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الأولوية' : 'Priority'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'الرسائل' : 'Messages'}</th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">{locale === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-slate-900">#{ticket.ticket_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 line-clamp-1">{ticket.subject}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{ticket.description}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{ticket.user?.full_name || '-'}</p>
                              <p className="text-xs text-slate-500">{ticket.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                            {getStatusIcon(ticket.status)}
                            {getStatusLabel(ticket.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                            {getPriorityLabel(ticket.priority)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{formatNumber(ticket.messages_count, locale)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-500">{formatDateTime(ticket.created_at, locale)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Link href={`/${locale}/admin/support/${ticket.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="w-4 h-4 text-slate-500" />
                              </Button>
                            </Link>
                            {ticket.status === 'open' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                                disabled={actionLoading === ticket.id}
                              >
                                {actionLoading === ticket.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <span className="text-xs">{locale === 'ar' ? 'بدء' : 'Start'}</span>
                                )}
                              </Button>
                            )}
                            {ticket.status === 'in_progress' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleStatusChange(ticket.id, 'resolved')}
                                disabled={actionLoading === ticket.id}
                              >
                                {actionLoading === ticket.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <span className="text-xs">{locale === 'ar' ? 'حل' : 'Resolve'}</span>
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <HeadphonesIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد تذاكر' : 'No tickets found'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
    </>
  )
}
