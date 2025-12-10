'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatNumber, formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  Megaphone,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Pin,
  PinOff,
  Calendar,
  User as UserIcon,
  X,
  Save,
  AlertCircle,
  Trash2,
  Edit,
  Users,
  Bell,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type AnnouncementType = 'urgent' | 'important' | 'info'

interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  created_by: string | null
  target_audience: 'all' | 'specific' | 'by_role'
  target_admin_ids: string[] | null
  target_role: string | null
  is_pinned: boolean
  require_read_confirmation: boolean
  attachments: any | null
  read_by: string[] | null
  scheduled_at: string | null
  expires_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  creator?: { full_name: string | null; email: string | null } | null
}

type FilterType = 'all' | AnnouncementType
type FilterStatus = 'all' | 'active' | 'scheduled' | 'expired'

const typeConfig: Record<AnnouncementType, { label: { ar: string; en: string }; color: string; bgColor: string }> = {
  urgent: {
    label: { ar: 'عاجل', en: 'Urgent' },
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
  },
  important: {
    label: { ar: 'مهم', en: 'Important' },
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-200',
  },
  info: {
    label: { ar: 'إعلامي', en: 'Info' },
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-200',
  },
}

export default function AdminAnnouncementsPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const { toggle: toggleSidebar } = useAdminSidebar()

  const [user, setUser] = useState<User | null>(null)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as AnnouncementType,
    is_pinned: false,
    require_read_confirmation: false,
    expires_at: '',
  })

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null)

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pinned: 0,
    unread: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterAnnouncements()
  }, [announcements, searchQuery, typeFilter, statusFilter])

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

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id, role')
          .eq('user_id', user.id)
          .single()

        if (adminUser) {
          setCurrentAdminId(adminUser.id)
          if (adminUser.role === 'super_admin') {
            setIsSuperAdmin(true)
          }
        }

        await loadAnnouncements(supabase)
      }
    }

    setLoading(false)
  }

  async function loadAnnouncements(supabase: ReturnType<typeof createClient>) {
    const { data: announcementsData, error } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading announcements:', error)
      return
    }

    // Load creator names
    const announcementsWithCreators = await Promise.all(
      (announcementsData || []).map(async (announcement) => {
        let creator = null

        if (announcement.created_by) {
          const { data: creatorAdmin } = await supabase
            .from('admin_users')
            .select('user_id')
            .eq('id', announcement.created_by)
            .single()

          if (creatorAdmin) {
            const { data: creatorProfile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', creatorAdmin.user_id)
              .single()
            creator = creatorProfile
          }
        }

        return { ...announcement, creator }
      })
    )

    setAnnouncements(announcementsWithCreators)
    calculateStats(announcementsWithCreators, currentAdminId)
  }

  function calculateStats(data: Announcement[], adminId: string | null) {
    const now = new Date()

    const stats = {
      total: data.length,
      active: data.filter(a => {
        if (a.expires_at && new Date(a.expires_at) < now) return false
        if (a.scheduled_at && new Date(a.scheduled_at) > now) return false
        return true
      }).length,
      pinned: data.filter(a => a.is_pinned).length,
      unread: adminId ? data.filter(a => !a.read_by?.includes(adminId)).length : 0,
    }
    setStats(stats)
  }

  function filterAnnouncements() {
    let filtered = [...announcements]
    const now = new Date()

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(query) ||
        a.content?.toLowerCase().includes(query)
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.type === typeFilter)
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(a => {
          if (a.expires_at && new Date(a.expires_at) < now) return false
          if (a.scheduled_at && new Date(a.scheduled_at) > now) return false
          return true
        })
      } else if (statusFilter === 'scheduled') {
        filtered = filtered.filter(a => a.scheduled_at && new Date(a.scheduled_at) > now)
      } else if (statusFilter === 'expired') {
        filtered = filtered.filter(a => a.expires_at && new Date(a.expires_at) < now)
      }
    }

    setFilteredAnnouncements(filtered)
  }

  function isUnread(announcement: Announcement): boolean {
    if (!currentAdminId) return false
    return !announcement.read_by?.includes(currentAdminId)
  }

  function getStatus(announcement: Announcement): { label: { ar: string; en: string }; color: string } {
    const now = new Date()

    if (announcement.expires_at && new Date(announcement.expires_at) < now) {
      return { label: { ar: 'منتهي', en: 'Expired' }, color: 'text-slate-500 bg-slate-100' }
    }
    if (announcement.scheduled_at && new Date(announcement.scheduled_at) > now) {
      return { label: { ar: 'مجدول', en: 'Scheduled' }, color: 'text-purple-700 bg-purple-100' }
    }
    return { label: { ar: 'نشط', en: 'Active' }, color: 'text-green-700 bg-green-100' }
  }

  async function markAsRead(announcement: Announcement) {
    if (!currentAdminId || announcement.read_by?.includes(currentAdminId)) return

    const supabase = createClient()
    const newReadBy = [...(announcement.read_by || []), currentAdminId]

    await supabase
      .from('announcements')
      .update({ read_by: newReadBy })
      .eq('id', announcement.id)

    setAnnouncements(prev => prev.map(a =>
      a.id === announcement.id ? { ...a, read_by: newReadBy } : a
    ))
  }

  async function togglePin(announcement: Announcement) {
    const supabase = createClient()

    await supabase
      .from('announcements')
      .update({ is_pinned: !announcement.is_pinned })
      .eq('id', announcement.id)

    await loadAnnouncements(supabase)
  }

  function openCreateModal() {
    setEditingAnnouncement(null)
    setFormData({
      title: '',
      content: '',
      type: 'info',
      is_pinned: false,
      require_read_confirmation: false,
      expires_at: '',
    })
    setFormError('')
    setShowModal(true)
  }

  function openEditModal(announcement: Announcement) {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      is_pinned: announcement.is_pinned,
      require_read_confirmation: announcement.require_read_confirmation,
      expires_at: announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : '',
    })
    setFormError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.title || !formData.content) {
      setFormError(locale === 'ar' ? 'العنوان والمحتوى مطلوبان' : 'Title and content are required')
      return
    }

    setFormLoading(true)
    setFormError('')
    const supabase = createClient()

    const data = {
      title: formData.title,
      content: formData.content,
      type: formData.type,
      is_pinned: formData.is_pinned,
      require_read_confirmation: formData.require_read_confirmation,
      expires_at: formData.expires_at || null,
      target_audience: 'all' as const,
    }

    if (editingAnnouncement) {
      const { error } = await supabase
        .from('announcements')
        .update(data)
        .eq('id', editingAnnouncement.id)

      if (error) {
        console.error('Error updating announcement:', error)
        setFormError(locale === 'ar' ? 'حدث خطأ أثناء التحديث' : 'Error updating')
        setFormLoading(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('announcements')
        .insert({
          ...data,
          created_by: currentAdminId,
          published_at: new Date().toISOString(),
          read_by: [],
        })

      if (error) {
        console.error('Error creating announcement:', error)
        setFormError(locale === 'ar' ? 'حدث خطأ أثناء الإنشاء' : 'Error creating')
        setFormLoading(false)
        return
      }
    }

    await loadAnnouncements(supabase)
    setShowModal(false)
    setFormLoading(false)
  }

  async function handleDelete() {
    if (!announcementToDelete) return

    setFormLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementToDelete.id)

    if (error) {
      console.error('Error deleting announcement:', error)
      setFormLoading(false)
      return
    }

    await loadAnnouncements(supabase)
    setShowDeleteModal(false)
    setAnnouncementToDelete(null)
    setFormLoading(false)
  }

  function openDeleteModal(announcement: Announcement) {
    setAnnouncementToDelete(announcement)
    setShowDeleteModal(true)
  }

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <div className="flex-1 p-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent mx-auto mt-20"></div>
        </div>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'الإعلانات والتعميمات' : 'Announcements'}
          onMenuClick={toggleSidebar}
        />
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
        title={locale === 'ar' ? 'الإعلانات والتعميمات' : 'Announcements'}
        onMenuClick={toggleSidebar}
      />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Megaphone className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total, locale)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">{locale === 'ar' ? 'نشطة' : 'Active'}</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatNumber(stats.active, locale)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-3 mb-2">
                <Pin className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-700">{locale === 'ar' ? 'مثبتة' : 'Pinned'}</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{formatNumber(stats.pinned, locale)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-700">{locale === 'ar' ? 'غير مقروءة' : 'Unread'}</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{formatNumber(stats.unread, locale)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث في الإعلانات...' : 'Search announcements...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as FilterType)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
                <option value="urgent">{locale === 'ar' ? 'عاجل' : 'Urgent'}</option>
                <option value="important">{locale === 'ar' ? 'مهم' : 'Important'}</option>
                <option value="info">{locale === 'ar' ? 'إعلامي' : 'Info'}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
                <option value="active">{locale === 'ar' ? 'نشطة' : 'Active'}</option>
                <option value="scheduled">{locale === 'ar' ? 'مجدولة' : 'Scheduled'}</option>
                <option value="expired">{locale === 'ar' ? 'منتهية' : 'Expired'}</option>
              </select>

              <Button
                variant="outline"
                onClick={() => {
                  const supabase = createClient()
                  loadAnnouncements(supabase)
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>

              {isSuperAdmin && (
                <Button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-4 h-4" />
                  {locale === 'ar' ? 'إعلان جديد' : 'New Announcement'}
                </Button>
              )}
            </div>
          </div>

          {/* Announcements List */}
          <div className="space-y-4">
            {filteredAnnouncements.length > 0 ? (
              filteredAnnouncements.map((announcement) => {
                const status = getStatus(announcement)
                const unread = isUnread(announcement)
                const readCount = announcement.read_by?.length || 0

                return (
                  <div
                    key={announcement.id}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden ${announcement.is_pinned ? 'ring-2 ring-amber-300' : ''} ${typeConfig[announcement.type]?.bgColor || 'border-slate-200'}`}
                  >
                    {/* Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {announcement.is_pinned && (
                              <Pin className="w-4 h-4 text-amber-600" />
                            )}
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig[announcement.type]?.color} ${typeConfig[announcement.type]?.bgColor}`}>
                              {typeConfig[announcement.type]?.label[locale === 'ar' ? 'ar' : 'en']}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                              {status.label[locale === 'ar' ? 'ar' : 'en']}
                            </span>
                            {unread && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500 text-white">
                                {locale === 'ar' ? 'جديد' : 'New'}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900 text-lg">{announcement.title}</h3>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="mt-3 prose prose-slate prose-sm max-w-none">
                        <p className="text-slate-600 whitespace-pre-wrap line-clamp-3">{announcement.content}</p>
                      </div>

                      {/* Meta */}
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        {announcement.creator && (
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4" />
                            <span>{announcement.creator.full_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(announcement.created_at, locale)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          <span>{readCount} {locale === 'ar' ? 'شاهدوا' : 'viewed'}</span>
                        </div>
                        {announcement.expires_at && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{locale === 'ar' ? 'ينتهي:' : 'Expires:'} {formatDate(announcement.expires_at, locale)}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAnnouncement(announcement)
                            markAsRead(announcement)
                          }}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          {locale === 'ar' ? 'عرض' : 'View'}
                        </Button>
                        {isSuperAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePin(announcement)}
                              className="flex items-center gap-2"
                            >
                              {announcement.is_pinned ? (
                                <><PinOff className="w-4 h-4" />{locale === 'ar' ? 'إلغاء التثبيت' : 'Unpin'}</>
                              ) : (
                                <><Pin className="w-4 h-4" />{locale === 'ar' ? 'تثبيت' : 'Pin'}</>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(announcement)}
                              className="flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              {locale === 'ar' ? 'تعديل' : 'Edit'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteModal(announcement)}
                              className="flex items-center gap-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              {locale === 'ar' ? 'حذف' : 'Delete'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Megaphone className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">
                  {locale === 'ar' ? 'لا توجد إعلانات' : 'No announcements found'}
                </p>
              </div>
            )}
          </div>
      </main>

      {/* View Announcement Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig[selectedAnnouncement.type]?.color} ${typeConfig[selectedAnnouncement.type]?.bgColor}`}>
                  {typeConfig[selectedAnnouncement.type]?.label[locale === 'ar' ? 'ar' : 'en']}
                </span>
                {selectedAnnouncement.is_pinned && <Pin className="w-4 h-4 text-amber-600" />}
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-4">{selectedAnnouncement.title}</h2>

            <div className="prose prose-slate max-w-none mb-6">
              <p className="whitespace-pre-wrap">{selectedAnnouncement.content}</p>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500 border-t border-slate-200 pt-4">
              {selectedAnnouncement.creator && (
                <span>{locale === 'ar' ? 'بواسطة:' : 'By:'} {selectedAnnouncement.creator.full_name}</span>
              )}
              <span>{formatDate(selectedAnnouncement.created_at, locale)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {editingAnnouncement
                  ? (locale === 'ar' ? 'تعديل الإعلان' : 'Edit Announcement')
                  : (locale === 'ar' ? 'إعلان جديد' : 'New Announcement')
                }
              </h2>
              <button
                onClick={() => setShowModal(false)}
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
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'العنوان' : 'Title'} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={locale === 'ar' ? 'عنوان الإعلان' : 'Announcement title'}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'النوع' : 'Type'}
                </label>
                <div className="flex gap-4">
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type"
                        checked={formData.type === key}
                        onChange={() => setFormData({ ...formData, type: key as AnnouncementType })}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-slate-700">{config.label[locale === 'ar' ? 'ar' : 'en']}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'المحتوى' : 'Content'} *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder={locale === 'ar' ? 'محتوى الإعلان' : 'Announcement content'}
                  rows={6}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Expires At */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'تاريخ الانتهاء (اختياري)' : 'Expiry Date (optional)'}
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_pinned}
                    onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700">
                    {locale === 'ar' ? 'تثبيت في أعلى القائمة' : 'Pin to top'}
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.require_read_confirmation}
                    onChange={(e) => setFormData({ ...formData, require_read_confirmation: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700">
                    {locale === 'ar' ? 'طلب تأكيد القراءة' : 'Require read confirmation'}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 me-2" />
                    {editingAnnouncement
                      ? (locale === 'ar' ? 'حفظ' : 'Save')
                      : (locale === 'ar' ? 'نشر' : 'Publish')
                    }
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && announcementToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'حذف الإعلان' : 'Delete Announcement'}
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-center text-slate-600">
                {locale === 'ar'
                  ? `هل أنت متأكد من حذف الإعلان "${announcementToDelete.title}"؟`
                  : `Are you sure you want to delete "${announcementToDelete.title}"?`
                }
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'حذف' : 'Delete'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
