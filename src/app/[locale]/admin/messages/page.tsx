'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, AdminSidebar } from '@/components/admin'
import { formatNumber, formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  MessageSquare,
  Search,
  RefreshCw,
  Plus,
  Inbox,
  Send as SendIcon,
  Star,
  Archive,
  Paperclip,
  User as UserIcon,
  Clock,
  ChevronRight,
  X,
  Mail,
  MailOpen,
  AlertCircle,
  Users,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Message {
  id: string
  conversation_id: string
  sender_id: string | null
  recipient_ids: string[]
  subject: string | null
  body: string
  priority: 'urgent' | 'normal'
  attachments: any | null
  related_approval_id: string | null
  related_task_id: string | null
  read_by: string[] | null
  read_confirmations: any | null
  is_broadcast: boolean
  created_at: string
  // Joined data
  sender?: { full_name: string | null; email: string | null } | null
}

interface Supervisor {
  id: string
  full_name: string | null
  email: string | null
}

type ViewMode = 'inbox' | 'sent' | 'starred' | 'archived'

export default function AdminMessagesPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [user, setUser] = useState<User | null>(null)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [messages, setMessages] = useState<Message[]>([])
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('inbox')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  // Compose modal
  const [showComposeModal, setShowComposeModal] = useState(false)
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    recipients: [] as string[],
    subject: '',
    body: '',
    priority: 'normal' as 'urgent' | 'normal',
    is_broadcast: false,
  })

  const [stats, setStats] = useState({
    inbox: 0,
    unread: 0,
    sent: 0,
  })
  const [adminStatus, setAdminStatus] = useState<{
    hasAdminRecord: boolean
    isActive: boolean
    adminId: string | null
  }>({ hasAdminRecord: false, isActive: false, adminId: null })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterMessages()
  }, [messages, searchQuery, viewMode, currentAdminId])

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

        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('id, role, is_active')
          .eq('user_id', user.id)
          .single()

        if (adminError) {
          console.error('Error fetching admin user:', adminError)
        }

        if (adminUser) {
          console.log('Admin user found:', { id: adminUser.id, role: adminUser.role, is_active: adminUser.is_active })
          setAdminStatus({
            hasAdminRecord: true,
            isActive: adminUser.is_active,
            adminId: adminUser.id,
          })
          if (!adminUser.is_active) {
            console.warn('Admin user is not active - messaging may be restricted')
          }
          setCurrentAdminId(adminUser.id)
        } else {
          console.warn('No admin_users entry found for this user - messaging will not work')
          setAdminStatus({
            hasAdminRecord: false,
            isActive: false,
            adminId: null,
          })
        }

        await loadMessages(supabase)
        await loadSupervisors(supabase)
      }
    }

    setLoading(false)
  }

  async function loadMessages(supabase: ReturnType<typeof createClient>) {
    console.log('Loading messages for admin:', currentAdminId)

    const { data: messagesData, error } = await supabase
      .from('internal_messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading messages:', error)
      console.error('Error details - code:', error.code, 'message:', error.message)
      return
    }

    console.log('Messages loaded from database:', messagesData?.length || 0, 'messages')
    if (messagesData && messagesData.length > 0) {
      console.log('First message recipient_ids:', messagesData[0].recipient_ids)
    }

    // Load sender names
    const messagesWithSenders = await Promise.all(
      (messagesData || []).map(async (message) => {
        let sender = null

        if (message.sender_id) {
          const { data: senderAdmin } = await supabase
            .from('admin_users')
            .select('user_id')
            .eq('id', message.sender_id)
            .single()

          if (senderAdmin) {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', senderAdmin.user_id)
              .single()
            sender = senderProfile
          }
        }

        return { ...message, sender }
      })
    )

    setMessages(messagesWithSenders)
    calculateStats(messagesWithSenders, currentAdminId)
  }

  async function loadSupervisors(supabase: ReturnType<typeof createClient>) {
    const { data: adminUsers } = await supabase
      .from('admin_users')
      .select('id, user_id')
      .eq('is_active', true)

    if (adminUsers) {
      const supervisorsList = await Promise.all(
        adminUsers.map(async (admin) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', admin.user_id)
            .single()

          return {
            id: admin.id,
            full_name: profile?.full_name || null,
            email: profile?.email || null,
          }
        })
      )
      setSupervisors(supervisorsList)
    }
  }

  function calculateStats(data: Message[], adminId: string | null) {
    if (!adminId) return

    const inbox = data.filter(m =>
      m.recipient_ids?.includes(adminId) || m.is_broadcast
    ).length

    const unread = data.filter(m =>
      (m.recipient_ids?.includes(adminId) || m.is_broadcast) &&
      !m.read_by?.includes(adminId)
    ).length

    const sent = data.filter(m => m.sender_id === adminId).length

    setStats({ inbox, unread, sent })
  }

  function filterMessages() {
    if (!currentAdminId) return

    let filtered = [...messages]

    if (viewMode === 'inbox') {
      filtered = filtered.filter(m =>
        m.recipient_ids?.includes(currentAdminId) || m.is_broadcast
      )
    } else if (viewMode === 'sent') {
      filtered = filtered.filter(m => m.sender_id === currentAdminId)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(m =>
        m.subject?.toLowerCase().includes(query) ||
        m.body?.toLowerCase().includes(query) ||
        m.sender?.full_name?.toLowerCase().includes(query)
      )
    }

    setFilteredMessages(filtered)
  }

  function isUnread(message: Message): boolean {
    if (!currentAdminId) return false
    return !message.read_by?.includes(currentAdminId)
  }

  function getTimeSince(date: string): string {
    const now = new Date()
    const created = new Date(date)
    const diff = now.getTime() - created.getTime()

    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return locale === 'ar' ? `منذ ${days} يوم` : `${days}d ago`
    }
    if (hours > 0) {
      return locale === 'ar' ? `منذ ${hours} ساعة` : `${hours}h ago`
    }
    return locale === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes}m ago`
  }

  async function handleSendMessage() {
    // Validate sender ID exists
    if (!currentAdminId) {
      setFormError(locale === 'ar' ? 'لم يتم التعرف على حسابك. يرجى إعادة تسجيل الدخول.' : 'Your account was not recognized. Please log in again.')
      return
    }

    if (!formData.body) {
      setFormError(locale === 'ar' ? 'محتوى الرسالة مطلوب' : 'Message body is required')
      return
    }

    if (!formData.is_broadcast && formData.recipients.length === 0) {
      setFormError(locale === 'ar' ? 'اختر مستلماً واحداً على الأقل' : 'Select at least one recipient')
      return
    }

    setFormLoading(true)
    setFormError('')
    const supabase = createClient()

    const recipients = formData.is_broadcast
      ? supervisors.filter(s => s.id !== currentAdminId).map(s => s.id)
      : formData.recipients

    // Validate that we have at least one recipient
    if (recipients.length === 0) {
      setFormError(locale === 'ar' ? 'لا يوجد مستلمين متاحين' : 'No recipients available')
      setFormLoading(false)
      return
    }

    console.log('Sending message with:', { sender_id: currentAdminId, recipients, is_broadcast: formData.is_broadcast })

    const messageId = crypto.randomUUID()
    const { error } = await supabase
      .from('internal_messages')
      .insert({
        id: messageId,
        conversation_id: crypto.randomUUID(),
        sender_id: currentAdminId,
        recipient_ids: recipients,
        subject: formData.subject || null,
        body: formData.body,
        priority: formData.priority,
        is_broadcast: formData.is_broadcast,
        read_by: [],
      })

    if (error) {
      console.error('Error sending message:', error)
      console.error('Error details:', { code: error.code, message: error.message, details: error.details, hint: error.hint })

      // Show more detailed error message for debugging
      let errorMessage = locale === 'ar' ? 'حدث خطأ أثناء إرسال الرسالة' : 'Error sending message'

      // Handle specific error cases
      if (error.code === '42501' || error.message?.includes('policy')) {
        errorMessage = locale === 'ar'
          ? 'ليس لديك صلاحية لإرسال الرسائل. تأكد من أن حسابك مفعل.'
          : 'You do not have permission to send messages. Make sure your account is active.'
      } else if (error.code === '23503') {
        errorMessage = locale === 'ar'
          ? 'خطأ في البيانات: تأكد من صحة المستلمين'
          : 'Data error: Please verify the recipients'
      } else if (error.message) {
        errorMessage = `${errorMessage}: ${error.message}`
      }

      setFormError(errorMessage)
      setFormLoading(false)
      return
    }

    // Get sender name for notification
    const currentSupervisor = supervisors.find(s => s.id === currentAdminId)
    const senderName = currentSupervisor?.full_name || (locale === 'ar' ? 'مستخدم' : 'User')

    // Create notifications for all recipients
    const notifications = recipients.map(recipientId => ({
      admin_id: recipientId,
      type: 'message',
      title: locale === 'ar'
        ? `رسالة جديدة من ${senderName}`
        : `New message from ${senderName}`,
      body: formData.subject || (formData.body.length > 100 ? formData.body.substring(0, 100) + '...' : formData.body),
      related_message_id: messageId,
      is_read: false,
    }))

    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('admin_notifications')
        .insert(notifications)

      if (notifError) {
        console.error('Error creating notifications:', notifError)
        // Don't fail the whole operation if notifications fail
      }
    }

    await loadMessages(supabase)
    setShowComposeModal(false)
    setFormData({
      recipients: [],
      subject: '',
      body: '',
      priority: 'normal',
      is_broadcast: false,
    })
    setFormLoading(false)
  }

  async function markAsRead(message: Message) {
    if (!currentAdminId || message.read_by?.includes(currentAdminId)) return

    const supabase = createClient()
    const newReadBy = [...(message.read_by || []), currentAdminId]

    const { error } = await supabase
      .from('internal_messages')
      .update({ read_by: newReadBy })
      .eq('id', message.id)

    if (error) {
      console.error('Error marking message as read:', error)
      // Don't show error to user for read status - it's not critical
      return
    }

    // Update local state
    setMessages(prev => prev.map(m =>
      m.id === message.id ? { ...m, read_by: newReadBy } : m
    ))
  }

  function openMessage(message: Message) {
    setSelectedMessage(message)
    markAsRead(message)
  }

  function toggleRecipient(id: string) {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.includes(id)
        ? prev.recipients.filter(r => r !== id)
        : [...prev.recipients, id]
    }))
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
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadMessages={stats.unread}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'المراسلات الداخلية' : 'Internal Messages'}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Admin Status Warning */}
          {(!adminStatus.hasAdminRecord || !adminStatus.isActive) && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800">
                    {locale === 'ar' ? 'تحذير: مشكلة في حالة الحساب' : 'Warning: Account Status Issue'}
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {!adminStatus.hasAdminRecord
                      ? (locale === 'ar'
                          ? 'لا يوجد سجل مشرف لحسابك. يرجى التواصل مع مدير النظام لإنشاء سجل في جدول admin_users.'
                          : 'No admin record found for your account. Please contact system admin to create an admin_users entry.')
                      : (locale === 'ar'
                          ? 'حسابك غير مفعل (is_active = false). لن تتمكن من رؤية الرسائل. يرجى التواصل مع مدير النظام.'
                          : 'Your account is not active (is_active = false). You will not be able to see messages. Please contact system admin.')
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Panel - Folders & Actions */}
            <div className="w-full lg:w-64 space-y-4">
              {/* Compose Button */}
              <Button
                onClick={() => setShowComposeModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4" />
                {locale === 'ar' ? 'رسالة جديدة' : 'Compose'}
              </Button>

              {/* Folders */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => { setViewMode('inbox'); setSelectedMessage(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-start transition-colors ${viewMode === 'inbox' ? 'bg-red-50 text-red-700' : 'hover:bg-slate-50'}`}
                >
                  <Inbox className="w-5 h-5" />
                  <span className="flex-1">{locale === 'ar' ? 'الوارد' : 'Inbox'}</span>
                  {stats.unread > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {stats.unread}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setViewMode('sent'); setSelectedMessage(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-start transition-colors ${viewMode === 'sent' ? 'bg-red-50 text-red-700' : 'hover:bg-slate-50'}`}
                >
                  <SendIcon className="w-5 h-5" />
                  <span className="flex-1">{locale === 'ar' ? 'المرسل' : 'Sent'}</span>
                  <span className="text-slate-400 text-sm">{stats.sent}</span>
                </button>
              </div>

              {/* Team List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {locale === 'ar' ? 'الفريق' : 'Team'}
                </h3>
                <div className="space-y-2">
                  {supervisors.filter(s => s.id !== currentAdminId).slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                        <span className="text-slate-600 font-medium">
                          {s.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <span className="text-slate-700 truncate">{s.full_name || s.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages List / Detail View */}
            <div className="flex-1">
              {selectedMessage ? (
                // Message Detail View
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  {/* Back button & Header */}
                  <div className="p-4 border-b border-slate-200">
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
                    >
                      <ChevronRight className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
                      {locale === 'ar' ? 'العودة للقائمة' : 'Back to list'}
                    </button>

                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          {selectedMessage.subject || (locale === 'ar' ? 'بدون موضوع' : 'No subject')}
                        </h2>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                            <span className="text-slate-600 font-medium">
                              {selectedMessage.sender?.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {selectedMessage.sender?.full_name || (locale === 'ar' ? 'مجهول' : 'Unknown')}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDate(selectedMessage.created_at, locale)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {selectedMessage.priority === 'urgent' && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-500 text-white">
                          {locale === 'ar' ? 'عاجل' : 'Urgent'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="p-4">
                    <div className="prose prose-slate max-w-none whitespace-pre-wrap">
                      {selectedMessage.body}
                    </div>

                    {selectedMessage.is_broadcast && (
                      <div className="mt-4 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {locale === 'ar' ? 'رسالة عامة للجميع' : 'Broadcast to all team'}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Messages List
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Search */}
                  <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                      <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                      <input
                        type="text"
                        placeholder={locale === 'ar' ? 'بحث في الرسائل...' : 'Search messages...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                      />
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="divide-y divide-slate-100">
                    {filteredMessages.length > 0 ? (
                      filteredMessages.map((message) => {
                        const unread = isUnread(message)

                        return (
                          <button
                            key={message.id}
                            onClick={() => openMessage(message)}
                            className={`w-full text-start p-4 hover:bg-slate-50 transition-colors ${unread ? 'bg-blue-50/50' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                {unread ? (
                                  <Mail className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <MailOpen className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className={`font-medium ${unread ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {viewMode === 'sent'
                                      ? (locale === 'ar' ? 'إلى: ' : 'To: ') + (message.is_broadcast ? (locale === 'ar' ? 'الجميع' : 'Everyone') : `${message.recipient_ids?.length || 0} ${locale === 'ar' ? 'مستلم' : 'recipients'}`)
                                      : message.sender?.full_name || (locale === 'ar' ? 'مجهول' : 'Unknown')
                                    }
                                  </span>
                                  <span className="text-xs text-slate-500 flex-shrink-0">
                                    {getTimeSince(message.created_at)}
                                  </span>
                                </div>
                                <p className={`text-sm ${unread ? 'font-medium text-slate-900' : 'text-slate-600'} truncate`}>
                                  {message.subject || (locale === 'ar' ? 'بدون موضوع' : 'No subject')}
                                </p>
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {message.body}
                                </p>
                              </div>
                              {message.priority === 'urgent' && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                  !
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })
                    ) : (
                      <div className="p-12 text-center">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد رسائل' : 'No messages'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'رسالة جديدة' : 'New Message'}
              </h2>
              <button
                onClick={() => setShowComposeModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Broadcast toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_broadcast"
                  checked={formData.is_broadcast}
                  onChange={(e) => setFormData({ ...formData, is_broadcast: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                />
                <label htmlFor="is_broadcast" className="text-sm text-slate-700">
                  {locale === 'ar' ? 'إرسال للجميع (بث عام)' : 'Send to all (broadcast)'}
                </label>
              </div>

              {/* Recipients */}
              {!formData.is_broadcast && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'المستلمين' : 'Recipients'} *
                  </label>
                  <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {supervisors.filter(s => s.id !== currentAdminId).map((s) => (
                      <label key={s.id} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.recipients.includes(s.id)}
                          onChange={() => toggleRecipient(s.id)}
                          className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm text-slate-700">{s.full_name || s.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الموضوع' : 'Subject'}
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder={locale === 'ar' ? 'موضوع الرسالة' : 'Message subject'}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الأولوية' : 'Priority'}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="priority"
                      checked={formData.priority === 'normal'}
                      onChange={() => setFormData({ ...formData, priority: 'normal' })}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-slate-700">{locale === 'ar' ? 'عادية' : 'Normal'}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="priority"
                      checked={formData.priority === 'urgent'}
                      onChange={() => setFormData({ ...formData, priority: 'urgent' })}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-slate-700">{locale === 'ar' ? 'عاجلة' : 'Urgent'}</span>
                  </label>
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الرسالة' : 'Message'} *
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder={locale === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
                  rows={6}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowComposeModal(false)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSendMessage}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <SendIcon className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'إرسال' : 'Send'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
