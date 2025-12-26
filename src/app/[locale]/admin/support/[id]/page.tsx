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
  AlertTriangle,
  Info,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_type: 'customer' | 'provider' | 'admin' | 'system'
  recipient_type?: 'customer' | 'provider' | 'admin'
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

type ChatTab = 'customer' | 'provider'

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
  const [allMessages, setAllMessages] = useState<TicketMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeChat, setActiveChat] = useState<ChatTab>('customer')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Filter messages based on active chat tab
  const getFilteredMessages = useCallback(() => {
    if (activeChat === 'customer') {
      // Show messages between admin and customer
      return allMessages.filter(msg =>
        msg.sender_type === 'customer' ||
        (msg.sender_type === 'admin' && (!msg.recipient_type || msg.recipient_type === 'customer'))
      )
    } else {
      // Show messages between admin and provider
      return allMessages.filter(msg =>
        msg.sender_type === 'provider' ||
        (msg.sender_type === 'admin' && msg.recipient_type === 'provider')
      )
    }
  }, [allMessages, activeChat])

  const filteredMessages = getFilteredMessages()

  // Count unread messages for each tab
  const customerMessagesCount = allMessages.filter(msg =>
    msg.sender_type === 'customer' ||
    (msg.sender_type === 'admin' && (!msg.recipient_type || msg.recipient_type === 'customer'))
  ).length

  const providerMessagesCount = allMessages.filter(msg =>
    msg.sender_type === 'provider' ||
    (msg.sender_type === 'admin' && msg.recipient_type === 'provider')
  ).length

  const loadTicket = useCallback(async () => {
    const supabase = createClient()

    // Load ticket details
    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:profiles!support_tickets_user_id_fkey(full_name, email, phone),
        provider:providers(name_ar, name_en)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      console.error('Error loading ticket:', ticketError)
      return
    }

    // Get assignee separately if assigned_to exists
    let assigneeData = null
    if (ticketData?.assigned_to) {
      const { data: assignee } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ticketData.assigned_to)
        .single()
      assigneeData = assignee
    }

    setTicket({
      ...ticketData,
      assignee: assigneeData,
    } as SupportTicket)

    // Load all messages
    const { data: messagesData } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        sender:profiles!ticket_messages_sender_id_fkey(full_name, avatar_url)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (messagesData) {
      setAllMessages(messagesData as TicketMessage[])
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredMessages])

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
          const { data: newMsg } = await supabase
            .from('ticket_messages')
            .select(`
              *,
              sender:profiles!ticket_messages_sender_id_fkey(full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single()

          if (newMsg) {
            setAllMessages(prev => [...prev, newMsg as TicketMessage])
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

    // Try to insert with recipient_type, fall back without it if column doesn't exist
    let error = null

    // First try with recipient_type
    const result = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_type: 'admin',
        recipient_type: activeChat,
        message: newMessage.trim(),
      })

    // Handle different error types
    if (result.error) {
      // If table doesn't exist
      if (result.error.message?.includes('does not exist')) {
        console.error('ticket_messages table does not exist:', result.error)
        alert(locale === 'ar'
          ? 'جدول الرسائل غير موجود. يرجى تطبيق الـ migration أولاً.'
          : 'Messages table does not exist. Please apply the migration first.')
        setSendingMessage(false)
        return
      }
      // If recipient_type column doesn't exist, try without it
      if (result.error.message?.includes('recipient_type')) {
        const fallbackResult = await supabase
          .from('ticket_messages')
          .insert({
            ticket_id: ticketId,
            sender_id: user.id,
            sender_type: 'admin',
            message: newMessage.trim(),
          })
        error = fallbackResult.error
      } else {
        error = result.error
      }
    }

    if (error) {
      console.error('Error sending message:', error)
      alert(locale === 'ar' ? 'حدث خطأ أثناء إرسال الرسالة: ' + error.message : 'Error sending message: ' + error.message)
      setSendingMessage(false)
      return
    }

    setNewMessage('')
    await loadTicket()

    // Send notification to customer if message is to customer
    if (activeChat === 'customer' && ticket?.user_id) {
      try {
        await supabase.from('customer_notifications').insert({
          customer_id: ticket.user_id,
          type: 'support_message',
          title_ar: 'رسالة جديدة من فريق الدعم',
          title_en: 'New message from Support',
          body_ar: `رد على شكواك: ${ticket.subject}`,
          body_en: `Reply to your complaint: ${ticket.subject}`,
          related_order_id: null,
          related_provider_id: null,
          is_read: false,
        })
      } catch (notifError) {
        console.error('Error sending notification:', notifError)
      }
    }

    // Update ticket status if it was open
    if (ticket?.status === 'open') {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      await supabase
        .from('support_tickets')
        .update({
          status: 'in_progress',
          assigned_to: adminUser?.id || null,
        })
        .eq('id', ticketId)
      await loadTicket()
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
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (adminUser) {
        updateData.assigned_to = adminUser.id
      }
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)

    if (error) {
      console.error('Error updating ticket status:', error)
      alert(locale === 'ar' ? 'حدث خطأ أثناء تحديث حالة التذكرة' : 'Error updating ticket status')
    } else {
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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Ticket Info Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className={`flex items-start justify-between gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : ''}>
                  <h2 className="text-lg font-bold text-slate-900">{ticket.subject}</h2>
                  <p className="text-sm text-slate-500 mt-1">{ticket.description}</p>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
              <div className={`flex items-center gap-2 pt-3 border-t border-slate-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {ticket.status === 'open' && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleStatusChange('in_progress')}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <RefreshCw className={`w-4 h-4 animate-spin ${isRTL ? 'ml-1' : 'mr-1'}`} /> : <Clock className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />}
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
                    {actionLoading ? <RefreshCw className={`w-4 h-4 animate-spin ${isRTL ? 'ml-1' : 'mr-1'}`} /> : <CheckCircle2 className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />}
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
                    {actionLoading ? <RefreshCw className={`w-4 h-4 animate-spin ${isRTL ? 'ml-1' : 'mr-1'}`} /> : <Clock className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />}
                    {locale === 'ar' ? 'إعادة فتح' : 'Reopen'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadTicket}
                >
                  <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                  {locale === 'ar' ? 'تحديث' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Chat Tabs */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Tab Headers */}
              <div className={`flex border-b border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setActiveChat('customer')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeChat === 'customer'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-slate-600 hover:bg-slate-50'
                  } ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>{locale === 'ar' ? 'محادثة العميل' : 'Customer Chat'}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    activeChat === 'customer' ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {customerMessagesCount}
                  </span>
                </button>
                {ticket.provider && (
                  <button
                    onClick={() => setActiveChat('provider')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      activeChat === 'provider'
                        ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    } ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Store className="w-4 h-4" />
                    <span>{locale === 'ar' ? 'محادثة المزود' : 'Provider Chat'}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      activeChat === 'provider' ? 'bg-purple-200 text-purple-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {providerMessagesCount}
                    </span>
                  </button>
                )}
              </div>

              {/* Chat Header */}
              <div className={`p-3 border-b border-slate-100 ${
                activeChat === 'customer' ? 'bg-blue-50' : 'bg-purple-50'
              }`}>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {activeChat === 'customer' ? (
                    <>
                      <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-blue-700" />
                      </div>
                      <div className={isRTL ? 'text-right' : ''}>
                        <p className="font-medium text-blue-900 text-sm">{ticket.user?.full_name || '-'}</p>
                        <p className="text-xs text-blue-600">{locale === 'ar' ? 'العميل' : 'Customer'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                        <Store className="w-4 h-4 text-purple-700" />
                      </div>
                      <div className={isRTL ? 'text-right' : ''}>
                        <p className="font-medium text-purple-900 text-sm">
                          {locale === 'ar' ? ticket.provider?.name_ar : ticket.provider?.name_en}
                        </p>
                        <p className="text-xs text-purple-600">{locale === 'ar' ? 'مقدم الخدمة' : 'Provider'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="h-[350px] overflow-y-auto p-4 space-y-3 bg-slate-50">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>{locale === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}</p>
                    <p className="text-xs mt-1">
                      {activeChat === 'customer'
                        ? (locale === 'ar' ? 'ابدأ محادثة مع العميل' : 'Start a conversation with the customer')
                        : (locale === 'ar' ? 'ابدأ محادثة مع مقدم الخدمة' : 'Start a conversation with the provider')
                      }
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isAdminMessage = msg.sender_type === 'admin'
                    const messageColor = activeChat === 'customer'
                      ? (isAdminMessage ? 'bg-blue-600 text-white' : 'bg-white text-slate-900 border border-slate-200')
                      : (isAdminMessage ? 'bg-purple-600 text-white' : 'bg-white text-slate-900 border border-slate-200')

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isAdminMessage ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${messageColor}`}>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          <div className={`flex items-center gap-2 mt-1.5 text-xs ${
                            isAdminMessage
                              ? (activeChat === 'customer' ? 'text-blue-200' : 'text-purple-200')
                              : 'text-slate-400'
                          }`}>
                            <span>
                              {msg.sender?.full_name ||
                                (msg.sender_type === 'admin'
                                  ? (locale === 'ar' ? 'أنت' : 'You')
                                  : (msg.sender_type === 'customer'
                                    ? (locale === 'ar' ? 'العميل' : 'Customer')
                                    : (locale === 'ar' ? 'المزود' : 'Provider')
                                  )
                                )
                              }
                            </span>
                            <span>•</span>
                            <span>{formatDateTime(msg.created_at, locale)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              {ticket.status !== 'closed' && (
                <div className={`p-4 border-t border-slate-200 bg-white ${
                  activeChat === 'customer' ? 'border-t-blue-100' : 'border-t-purple-100'
                }`}>
                  <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={
                        activeChat === 'customer'
                          ? (locale === 'ar' ? 'اكتب رسالة للعميل...' : 'Type a message to customer...')
                          : (locale === 'ar' ? 'اكتب رسالة لمقدم الخدمة...' : 'Type a message to provider...')
                      }
                      className={`flex-1 p-3 border rounded-xl resize-none focus:ring-2 focus:border-transparent text-sm ${
                        activeChat === 'customer'
                          ? 'border-blue-200 focus:ring-blue-500'
                          : 'border-purple-200 focus:ring-purple-500'
                      } ${isRTL ? 'text-right' : ''}`}
                      rows={2}
                      dir={isRTL ? 'rtl' : 'ltr'}
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
                      className={`px-4 ${
                        activeChat === 'customer'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      {sendingMessage ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className={`font-semibold text-slate-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <UserIcon className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات العميل' : 'Customer Info'}
              </h3>
              <div className="space-y-3">
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className={isRTL ? 'text-right' : ''}>
                    <p className="font-medium text-slate-900">{ticket.user?.full_name || '-'}</p>
                    <p className="text-xs text-slate-500">{locale === 'ar' ? 'العميل' : 'Customer'}</p>
                  </div>
                </div>
                {ticket.user?.phone && (
                  <div className={`flex items-center gap-2 text-sm text-slate-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Phone className="w-4 h-4" />
                    <span dir="ltr">{ticket.user.phone}</span>
                  </div>
                )}
                {ticket.user?.email && (
                  <div className={`flex items-center gap-2 text-sm text-slate-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Mail className="w-4 h-4" />
                    <span>{ticket.user.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Provider Info */}
            {ticket.provider && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className={`font-semibold text-slate-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Store className="w-5 h-5" />
                  {locale === 'ar' ? 'معلومات المزود' : 'Provider Info'}
                </h3>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Store className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className={isRTL ? 'text-right' : ''}>
                    <p className="font-medium text-slate-900">
                      {locale === 'ar' ? ticket.provider.name_ar : ticket.provider.name_en}
                    </p>
                    <Link
                      href={`/${locale}/admin/providers/${ticket.provider_id}`}
                      className="text-xs text-purple-600 hover:underline"
                    >
                      {locale === 'ar' ? 'عرض الملف' : 'View Profile'}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className={`font-semibold text-slate-900 mb-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Info className="w-5 h-5" />
                {locale === 'ar' ? 'تفاصيل التذكرة' : 'Ticket Details'}
              </h3>
              <div className="space-y-3 text-sm">
                <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-slate-500">{locale === 'ar' ? 'رقم التذكرة' : 'Ticket #'}</span>
                  <span className="font-mono font-medium">#{ticket.ticket_number}</span>
                </div>
                <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-slate-500">{locale === 'ar' ? 'التصنيف' : 'Category'}</span>
                  <span>{ticket.category || '-'}</span>
                </div>
                <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-slate-500">{locale === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</span>
                  <span>{formatDateTime(ticket.created_at, locale)}</span>
                </div>
                {ticket.resolved_at && (
                  <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-slate-500">{locale === 'ar' ? 'تاريخ الحل' : 'Resolved'}</span>
                    <span>{formatDateTime(ticket.resolved_at, locale)}</span>
                  </div>
                )}
                {ticket.assignee && (
                  <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
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
