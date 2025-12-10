'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatNumber, formatDateTime, formatTimeAgo } from '@/lib/utils/formatters'
import {
  Shield,
  Search,
  RefreshCw,
  Activity,
  Store,
  ShoppingBag,
  Settings,
  Trash2,
  Edit,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  LogIn,
  UserPlus,
  ShoppingCart,
  CreditCard,
  MessageSquare,
  FileText,
  User as UserIcon,
  Calendar,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface ActivityLog {
  id: string
  admin_id: string
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  admin: { full_name: string; email: string } | null
}

type FilterAction = 'all' | 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'login' | 'view'
type FilterEntity = 'all' | 'provider' | 'order' | 'customer' | 'ticket' | 'settlement' | 'user'

export default function AdminActivityLogPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<FilterAction>('all')
  const [entityFilter, setEntityFilter] = useState<FilterEntity>('all')
  const [dateFilter, setDateFilter] = useState<string>('')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [logs, searchQuery, actionFilter, entityFilter, dateFilter])

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
        await loadActivityLogs()
      }
    }

    setLoading(false)
  }

  async function loadActivityLogs() {
    try {
      const response = await fetch('/api/admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', limit: 200 }),
      })
      const result = await response.json()

      if (result.success && result.data) {
        // Transform audit log entries to activity log format
        const transformedLogs = result.data.entries.map((entry: {
          id: string
          admin_id: string
          action_code: string
          entity_type: string
          entity_id: string | null
          entity_name: string | null
          old_data: Record<string, unknown> | null
          new_data: Record<string, unknown> | null
          changes: Record<string, unknown> | null
          ip_address: string | null
          created_at: string
        }) => ({
          id: entry.id,
          admin_id: entry.admin_id,
          action: entry.action_code,
          entity_type: entry.entity_type,
          entity_id: entry.entity_id,
          details: entry.changes || entry.new_data || null,
          ip_address: entry.ip_address,
          user_agent: null,
          created_at: entry.created_at,
          admin: null, // Will be null from API, but we can display admin_id
        }))
        setLogs(transformedLogs as ActivityLog[])
      }
    } catch (error) {
      console.error('Error loading activity logs:', error)
      // Fallback to direct Supabase call if API fails
      const supabase = createClient()
      const { data } = await supabase
        .from('activity_log')
        .select(`
          *,
          admin:profiles!activity_log_admin_id_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (data) {
        setLogs(data as ActivityLog[])
      }
    }
  }

  function filterLogs() {
    let filtered = [...logs]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(query) ||
        log.entity_type.toLowerCase().includes(query) ||
        log.admin?.full_name?.toLowerCase().includes(query) ||
        log.admin?.email?.toLowerCase().includes(query) ||
        log.entity_id?.toLowerCase().includes(query)
      )
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter)
    }

    if (entityFilter !== 'all') {
      filtered = filtered.filter(log => log.entity_type === entityFilter)
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter(log => {
        const logDate = new Date(log.created_at)
        return logDate.toDateString() === filterDate.toDateString()
      })
    }

    setFilteredLogs(filtered)
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="w-4 h-4 text-green-600" />
      case 'update': return <Edit className="w-4 h-4 text-blue-600" />
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />
      case 'approve': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'reject': return <XCircle className="w-4 h-4 text-red-600" />
      case 'login': return <LogIn className="w-4 h-4 text-purple-600" />
      case 'view': return <Eye className="w-4 h-4 text-slate-600" />
      default: return <Activity className="w-4 h-4 text-slate-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-700'
      case 'update': return 'bg-blue-100 text-blue-700'
      case 'delete': return 'bg-red-100 text-red-700'
      case 'approve': return 'bg-green-100 text-green-700'
      case 'reject': return 'bg-red-100 text-red-700'
      case 'login': return 'bg-purple-100 text-purple-700'
      case 'view': return 'bg-slate-100 text-slate-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      create: { ar: 'إنشاء', en: 'Create' },
      update: { ar: 'تحديث', en: 'Update' },
      delete: { ar: 'حذف', en: 'Delete' },
      approve: { ar: 'موافقة', en: 'Approve' },
      reject: { ar: 'رفض', en: 'Reject' },
      login: { ar: 'تسجيل دخول', en: 'Login' },
      view: { ar: 'عرض', en: 'View' },
    }
    return labels[action]?.[locale === 'ar' ? 'ar' : 'en'] || action
  }

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'provider': return <Store className="w-4 h-4" />
      case 'order': return <ShoppingCart className="w-4 h-4" />
      case 'customer': return <UserIcon className="w-4 h-4" />
      case 'ticket': return <MessageSquare className="w-4 h-4" />
      case 'settlement': return <CreditCard className="w-4 h-4" />
      case 'user': return <UserPlus className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getEntityLabel = (entity: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      provider: { ar: 'متجر', en: 'Provider' },
      order: { ar: 'طلب', en: 'Order' },
      customer: { ar: 'عميل', en: 'Customer' },
      ticket: { ar: 'تذكرة', en: 'Ticket' },
      settlement: { ar: 'تسوية', en: 'Settlement' },
      user: { ar: 'مستخدم', en: 'User' },
    }
    return labels[entity]?.[locale === 'ar' ? 'ar' : 'en'] || entity
  }

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
        </div>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'سجل النشاط' : 'Activity Log'}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
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
      </>
    )
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'سجل النشاط' : 'Activity Log'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث في السجل...' : 'Search activity log...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                />
              </div>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as FilterAction)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الإجراءات' : 'All Actions'}</option>
                <option value="create">{locale === 'ar' ? 'إنشاء' : 'Create'}</option>
                <option value="update">{locale === 'ar' ? 'تحديث' : 'Update'}</option>
                <option value="delete">{locale === 'ar' ? 'حذف' : 'Delete'}</option>
                <option value="approve">{locale === 'ar' ? 'موافقة' : 'Approve'}</option>
                <option value="reject">{locale === 'ar' ? 'رفض' : 'Reject'}</option>
                <option value="login">{locale === 'ar' ? 'تسجيل دخول' : 'Login'}</option>
              </select>

              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value as FilterEntity)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الكيانات' : 'All Entities'}</option>
                <option value="provider">{locale === 'ar' ? 'متجر' : 'Provider'}</option>
                <option value="order">{locale === 'ar' ? 'طلب' : 'Order'}</option>
                <option value="customer">{locale === 'ar' ? 'عميل' : 'Customer'}</option>
                <option value="ticket">{locale === 'ar' ? 'تذكرة' : 'Ticket'}</option>
                <option value="settlement">{locale === 'ar' ? 'تسوية' : 'Settlement'}</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              />

              <Button
                variant="outline"
                onClick={() => loadActivityLogs()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {locale === 'ar' ? 'آخر الأنشطة' : 'Recent Activity'}
                </h3>
                <span className="text-sm text-slate-500">
                  {formatNumber(filteredLogs.length, locale)} {locale === 'ar' ? 'سجل' : 'entries'}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{log.admin?.full_name || 'System'}</span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${getActionColor(log.action)}`}>
                            {getActionLabel(log.action)}
                          </span>
                          <span className="text-slate-500">
                            {getEntityLabel(log.entity_type)}
                          </span>
                          {log.entity_id && (
                            <span className="font-mono text-xs text-slate-400">
                              #{log.entity_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                            <pre className="whitespace-pre-wrap font-sans text-xs">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(log.created_at, locale)}
                          </span>
                          <span>{formatTimeAgo(log.created_at, locale)}</span>
                          {log.ip_address && (
                            <span>IP: {log.ip_address}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500">
                    {locale === 'ar' ? 'لا توجد أنشطة' : 'No activity found'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
    </>
  )
}
