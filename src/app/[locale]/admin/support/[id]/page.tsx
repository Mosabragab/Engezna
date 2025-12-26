'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatDateTime } from '@/lib/utils/formatters'
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  RefreshCw,
  Send,
  User as UserIcon,
  Store,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Info,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_type: 'user' | 'admin' | 'system'
  message: string
  created_at: string
  sender?: {
    full_name: string
    avatar_url: string | null
  } | null
}

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
  provider: { name_ar: string; name_en: string } | null
  assignee: { full_name: string } | null
}

export default function AdminSupportTicketDetailPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string

  const { toggle: toggleSidebar } = useAdminSidebar()
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadTicket = useCallback(async () => {
    const supabase = createClient()

    // Load ticket details
    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey(full_name, email, phone),
        provider:providers(name_ar, name_en),
        assignee:profiles!support_tickets_assigned_to_fkey(full_name)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      console.error('Error loading ticket:', ticketError)
      return
    }

    setTicket(ticketData as SupportTicket)

    // Load messages
    const { data: messagesData } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:profiles!ticket_messages_sender_id_fkey(full_name, avatar_url)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (messagesData) {
      setMessages(messagesData as TicketMessage[])
    }
  }, [ticketId])

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
        await loadTicket()
      }
    }

    setLoading(false)
  }, [loadTicket])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription for messages
  useEffect(() => {
    if (!ticketId || !isAdmin) return

    const supabase = createClient()
    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        async (payload) => {
          // Load the new message with sender info
          const { data: newMsg } = await supabase
            .from('ticket_messages')
            .select(`
              *,
              sender:profiles!ticket_messages_sender_id_fkey(full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single()

          if (newMsg) {
            setMessages(prev => [...prev, newMsg as TicketMessage])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId, isAdmin])

  async function handleSendMessage() {
    if (!newMessage.trim() || !user) return

    setSendingMessage(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_type: 'admin',
        message: newMessage.trim(),
      })

    if (!error) {
      setNewMessage('')
      // Update ticket status to in_progress if it was open
      if (ticket?.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({
            status: 'in_progress',
            assigned_to: user.id,
          })
          .eq('id', ticketId)
        await loadTicket()
      }
    }

    setSendingMessage(false)
  }

  async function handleStatusChange(newStatus: string) {
    setActionLoading(true)
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
      await loadTicket()
    }

    setActionLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'resolved': return 'bg-green-100 text-green-700 border-green-300'
      case 'closed': return 'bg-slate-100 text-slate-700 border-slate-300'
      default: return 'bg-slate-100 text-slate-700 border-slate-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4" />
      case 'in_progress': return <Clock className="w-4 h-4" />
      case 'resolved': return <CheckCircle2 className="w-4 h-4" />
      case 'closed': return <XCircle className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
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
              {locale === 'ar' ? 'تفاصيل التذكرة' : 'Ticket Details'}
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

  if (!ticket) {
    return (
      <>
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'تفاصيل التذكرة' : 'Ticket Details'}
          onMenuClick={toggleSidebar}
        />
        <main className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'التذكرة غير موجودة' : 'Ticket Not Found'}
            </h1>
            <Link href={`/${locale}/admin/support`}>
              <Button variant="outline">
                {locale === 'ar' ? 'العودة للدعم' : 'Back to Support'}
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
        title={`#${ticket.ticket_number}`}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Back Button */}
        <div className="mb-4">
          <Link href={`/${locale}/admin/resolution-center`}>
            <Button variant="ghost" className="gap-2">
              {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {locale === 'ar' ? 'العودة لمركز النزاعات' : 'Back to Resolution Center'}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Messages */}
          <div className="lg:col-span-2 space-y-4">
            {/* Ticket Info Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{ticket.subject}</h2>
                  <p className="text-sm text-slate-500 mt-1">{ticket.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${getStatusColor(ticket.status)}`}>
                    {getStatusIcon(ticket.status)}
                    {getStatusLabel(ticket.status)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                    {getPriorityLabel(ticket.priority)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                {ticket.status === 'open' && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Clock className="w-4 h-4 mr-1" />}
                    {locale === 'ar' ? 'بدء المعالجة' : 'Start Processing'}
                  </Button>
                )}
                {ticket.status === 'in_progress' && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusChange('resolved')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                    {locale === 'ar' ? 'تم الحل' : 'Mark Resolved'}
                  </Button>
                )}
                {ticket.status === 'resolved' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <Clock className="w-4 h-4 mr-1" />}
                    {locale === 'ar' ? 'إعادة فتح' : 'Reopen'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadTicket}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  {locale === 'ar' ? 'تحديث' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {locale === 'ar' ? 'الرسائل' : 'Messages'}
                  <span className="text-sm font-normal text-slate-500">({messages.length})</span>
                </h3>
              </div>

              <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>{locale === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl p-3 ${
                          msg.sender_type === 'admin'
                            ? 'bg-blue-600 text-white'
                            : msg.sender_type === 'system'
                            ? 'bg-slate-100 text-slate-600 italic'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <div className={`flex items-center gap-2 mt-1 text-xs ${
                          msg.sender_type === 'admin' ? 'text-blue-200' : 'text-slate-500'
                        }`}>
                          <span>{msg.sender?.full_name || (msg.sender_type === 'system' ? (locale === 'ar' ? 'النظام' : 'System') : (locale === 'ar' ? 'المستخدم' : 'User'))}</span>
                          <span>•</span>
                          <span>{formatDateTime(msg.created_at, locale)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {ticket.status !== 'closed' && (
                <div className="p-4 border-t border-slate-200">
                  <div className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={locale === 'ar' ? 'اكتب رسالتك...' : 'Type your message...'}
                      className="flex-1 p-3 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {sendingMessage ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Details */}
          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات المستخدم' : 'User Info'}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{ticket.user?.full_name || '-'}</p>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'العميل' : 'Customer'}</p>
                  </div>
                </div>
                {ticket.user?.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span dir="ltr">{ticket.user.phone}</span>
                  </div>
                )}
                {ticket.user?.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span>{ticket.user.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Provider Info (if applicable) */}
            {ticket.provider && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  {locale === 'ar' ? 'المزود المعني' : 'Related Provider'}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Store className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {locale === 'ar' ? ticket.provider.name_ar : ticket.provider.name_en}
                    </p>
                    <Link
                      href={`/${locale}/admin/providers/${ticket.provider_id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {locale === 'ar' ? 'عرض الملف' : 'View Profile'}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                {locale === 'ar' ? 'تفاصيل التذكرة' : 'Ticket Details'}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{locale === 'ar' ? 'رقم التذكرة' : 'Ticket #'}</span>
                  <span className="font-mono font-medium">#{ticket.ticket_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{locale === 'ar' ? 'التصنيف' : 'Category'}</span>
                  <span>{ticket.category || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{locale === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</span>
                  <span>{formatDateTime(ticket.created_at, locale)}</span>
                </div>
                {ticket.resolved_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{locale === 'ar' ? 'تاريخ الحل' : 'Resolved'}</span>
                    <span>{formatDateTime(ticket.resolved_at, locale)}</span>
                  </div>
                )}
                {ticket.assignee && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{locale === 'ar' ? 'المسؤول' : 'Assigned To'}</span>
                    <span>{ticket.assignee.full_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
