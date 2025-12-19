'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  Image as ImageIcon,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Calendar,
  Smartphone,
  Monitor,
  X,
  Save,
  Clock,
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'

export const dynamic = 'force-dynamic'

interface HomepageBanner {
  id: string
  title_ar: string
  title_en: string
  description_ar: string | null
  description_en: string | null
  image_url: string | null
  background_color: string | null
  gradient_start: string | null
  gradient_end: string | null
  badge_text_ar: string | null
  badge_text_en: string | null
  has_glassmorphism: boolean
  cta_text_ar: string | null
  cta_text_en: string | null
  link_url: string | null
  link_type: string | null
  link_id: string | null
  image_position: 'start' | 'end' | 'background'
  is_countdown_active: boolean
  countdown_end_time: string | null
  display_order: number
  is_active: boolean
  starts_at: string
  ends_at: string | null
  created_at: string
}

type FilterStatus = 'all' | 'active' | 'inactive' | 'expired' | 'scheduled'

type ImagePosition = 'start' | 'end' | 'background'

const defaultFormData = {
  title_ar: '',
  title_en: '',
  description_ar: '',
  description_en: '',
  image_url: '',
  gradient_start: '#009DE0',
  gradient_end: '#0077B6',
  badge_text_ar: '',
  badge_text_en: '',
  has_glassmorphism: true,
  cta_text_ar: 'اطلب الآن',
  cta_text_en: 'Order Now',
  link_url: '',
  link_type: 'category',
  image_position: 'end' as ImagePosition,
  is_countdown_active: false,
  countdown_end_time: '',
  is_active: true,
  starts_at: new Date().toISOString().split('T')[0],
  ends_at: '',
}

// Live Preview Component
function BannerPreview({
  data,
  locale,
  viewMode,
}: {
  data: typeof defaultFormData & { image_position: ImagePosition }
  locale: string
  viewMode: 'mobile' | 'desktop'
}) {
  const title = locale === 'ar' ? data.title_ar : data.title_en
  const description = locale === 'ar' ? data.description_ar : data.description_en
  const badgeText = locale === 'ar' ? data.badge_text_ar : data.badge_text_en
  const ctaText = locale === 'ar' ? data.cta_text_ar : data.cta_text_en

  const gradientStyle = {
    background: `linear-gradient(135deg, ${data.gradient_start} 0%, ${data.gradient_end} 100%)`,
  }

  const imageOnStart = data.image_position === 'start'
  const imageOnBackground = data.image_position === 'background'

  return (
    <div
      className={`
        ${viewMode === 'mobile' ? 'w-[280px]' : 'w-full max-w-[400px]'}
        mx-auto
      `}
    >
      <div
        className="relative overflow-hidden rounded-2xl aspect-[16/9]"
        style={gradientStyle}
      >
        {/* Background Image */}
        {imageOnBackground && data.image_url && (
          <div className="absolute inset-0">
            <img
              src={data.image_url}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        {/* Decorative Circles */}
        <div className="absolute -top-10 -end-10 w-32 h-32 bg-white/10 rounded-full blur-sm" />
        <div className="absolute -bottom-6 -start-6 w-24 h-24 bg-white/10 rounded-full blur-sm" />

        {/* Content */}
        <div className={`
          relative z-10 h-full p-4
          flex ${imageOnStart ? 'flex-row-reverse' : 'flex-row'}
          items-center justify-between gap-3
        `}>
          <div className={`flex-1 ${imageOnStart ? 'text-end' : 'text-start'}`}>
            {/* Badge */}
            {badgeText && (
              <div className={`
                inline-block mb-2
                ${data.has_glassmorphism
                  ? 'bg-white/20 backdrop-blur-md border border-white/30'
                  : 'bg-white/25'
                }
                rounded-lg px-2.5 py-1
              `}>
                <span className="text-white font-bold text-xs">
                  {badgeText || (locale === 'ar' ? 'شارة' : 'Badge')}
                </span>
              </div>
            )}

            {/* Title */}
            <h3 className="text-white font-bold text-base mb-1 leading-tight">
              {title || (locale === 'ar' ? 'عنوان العرض' : 'Offer Title')}
            </h3>

            {/* Description */}
            {description && (
              <p className="text-white/85 text-xs mb-2 line-clamp-2">
                {description}
              </p>
            )}

            {/* Countdown */}
            {data.is_countdown_active && (
              <div className="flex items-center gap-1 text-white/90 text-xs mb-2">
                <Clock className="w-3 h-3" />
                <span className="bg-white/20 rounded px-1">00</span>:
                <span className="bg-white/20 rounded px-1">00</span>:
                <span className="bg-white/20 rounded px-1">00</span>
              </div>
            )}

            {/* CTA Button */}
            {ctaText && (
              <button className="bg-white text-slate-900 font-semibold px-3 py-1.5 rounded-lg text-xs">
                {ctaText}
              </button>
            )}
          </div>

          {/* Product Image */}
          {!imageOnBackground && data.image_url && (
            <div className="w-20 h-20 flex-shrink-0">
              <img
                src={data.image_url}
                alt=""
                className="w-full h-full object-contain drop-shadow-xl"
              />
            </div>
          )}

          {/* Placeholder when no image */}
          {!imageOnBackground && !data.image_url && (
            <div className="w-20 h-20 flex-shrink-0 bg-white/10 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white/50" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminBannersPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const { toggle: toggleSidebar } = useAdminSidebar()

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [banners, setBanners] = useState<HomepageBanner[]>([])
  const [filteredBanners, setFilteredBanners] = useState<HomepageBanner[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState<HomepageBanner | null>(null)
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile')
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState(defaultFormData)

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    expired: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterBanners()
  }, [banners, searchQuery, statusFilter])

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
        await loadBanners()
      }
    }

    setLoading(false)
  }

  async function loadBanners() {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('homepage_banners')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) {
        setBanners([])
        return
      }

      setBanners(data || [])

      // Calculate stats
      const now = new Date()
      const active = (data || []).filter(b =>
        b.is_active &&
        new Date(b.starts_at) <= now &&
        (!b.ends_at || new Date(b.ends_at) >= now)
      ).length
      const scheduled = (data || []).filter(b =>
        b.is_active && new Date(b.starts_at) > now
      ).length
      const expired = (data || []).filter(b =>
        b.ends_at && new Date(b.ends_at) < now
      ).length

      setStats({
        total: (data || []).length,
        active,
        scheduled,
        expired,
      })
    } catch {
      setBanners([])
    }
  }

  function filterBanners() {
    let filtered = [...banners]
    const now = new Date()

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(b =>
        b.title_ar?.toLowerCase().includes(query) ||
        b.title_en?.toLowerCase().includes(query) ||
        b.description_ar?.toLowerCase().includes(query) ||
        b.description_en?.toLowerCase().includes(query)
      )
    }

    switch (statusFilter) {
      case 'active':
        filtered = filtered.filter(b =>
          b.is_active &&
          new Date(b.starts_at) <= now &&
          (!b.ends_at || new Date(b.ends_at) >= now)
        )
        break
      case 'inactive':
        filtered = filtered.filter(b => !b.is_active)
        break
      case 'expired':
        filtered = filtered.filter(b => b.ends_at && new Date(b.ends_at) < now)
        break
      case 'scheduled':
        filtered = filtered.filter(b => b.is_active && new Date(b.starts_at) > now)
        break
    }

    setFilteredBanners(filtered)
  }

  async function handleSaveBanner() {
    setIsSaving(true)
    const supabase = createClient()

    try {
      const bannerData = {
        title_ar: formData.title_ar,
        title_en: formData.title_en,
        description_ar: formData.description_ar || null,
        description_en: formData.description_en || null,
        image_url: formData.image_url || null,
        gradient_start: formData.gradient_start,
        gradient_end: formData.gradient_end,
        badge_text_ar: formData.badge_text_ar || null,
        badge_text_en: formData.badge_text_en || null,
        has_glassmorphism: formData.has_glassmorphism,
        cta_text_ar: formData.cta_text_ar || null,
        cta_text_en: formData.cta_text_en || null,
        link_url: formData.link_url || null,
        link_type: formData.link_type,
        image_position: formData.image_position,
        is_countdown_active: formData.is_countdown_active,
        countdown_end_time: formData.is_countdown_active && formData.countdown_end_time
          ? new Date(formData.countdown_end_time).toISOString()
          : null,
        is_active: formData.is_active,
        starts_at: new Date(formData.starts_at).toISOString(),
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
      }

      if (editingBanner) {
        // Update existing
        const { error } = await supabase
          .from('homepage_banners')
          .update(bannerData)
          .eq('id', editingBanner.id)

        if (error) throw error
      } else {
        // Create new
        const maxOrder = banners.length > 0
          ? Math.max(...banners.map(b => b.display_order)) + 1
          : 0

        const { error } = await supabase
          .from('homepage_banners')
          .insert({
            ...bannerData,
            display_order: maxOrder,
            created_by: user?.id,
          })

        if (error) throw error
      }

      setShowCreateModal(false)
      setEditingBanner(null)
      resetForm()
      await loadBanners()
    } catch (error) {
      alert(locale === 'ar' ? 'حدث خطأ أثناء حفظ البانر' : 'Error saving banner')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleActive(banner: HomepageBanner) {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('homepage_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id)

      if (error) throw error
      await loadBanners()
    } catch {
      // Error handled silently
    }
  }

  async function handleDelete(bannerId: string) {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا البانر؟' : 'Are you sure you want to delete this banner?')) {
      return
    }

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('homepage_banners')
        .delete()
        .eq('id', bannerId)

      if (error) throw error
      await loadBanners()
    } catch {
      // Error handled silently
    }
  }

  async function handleReorder(newOrder: HomepageBanner[]) {
    setBanners(newOrder)

    const supabase = createClient()

    // Update display_order for all banners
    try {
      const updates = newOrder.map((banner, index) => ({
        id: banner.id,
        display_order: index,
      }))

      for (const update of updates) {
        await supabase
          .from('homepage_banners')
          .update({ display_order: update.display_order })
          .eq('id', update.id)
      }
    } catch {
      // Reload on error
      await loadBanners()
    }
  }

  function resetForm() {
    setFormData(defaultFormData)
  }

  function openEditModal(banner: HomepageBanner) {
    setEditingBanner(banner)
    setFormData({
      title_ar: banner.title_ar,
      title_en: banner.title_en,
      description_ar: banner.description_ar || '',
      description_en: banner.description_en || '',
      image_url: banner.image_url || '',
      gradient_start: banner.gradient_start || '#009DE0',
      gradient_end: banner.gradient_end || '#0077B6',
      badge_text_ar: banner.badge_text_ar || '',
      badge_text_en: banner.badge_text_en || '',
      has_glassmorphism: banner.has_glassmorphism,
      cta_text_ar: banner.cta_text_ar || 'اطلب الآن',
      cta_text_en: banner.cta_text_en || 'Order Now',
      link_url: banner.link_url || '',
      link_type: banner.link_type || 'category',
      image_position: banner.image_position,
      is_countdown_active: banner.is_countdown_active,
      countdown_end_time: banner.countdown_end_time
        ? new Date(banner.countdown_end_time).toISOString().slice(0, 16)
        : '',
      is_active: banner.is_active,
      starts_at: new Date(banner.starts_at).toISOString().split('T')[0],
      ends_at: banner.ends_at
        ? new Date(banner.ends_at).toISOString().split('T')[0]
        : '',
    })
    setShowCreateModal(true)
  }

  const getStatusBadge = (banner: HomepageBanner) => {
    const now = new Date()
    const startsAt = new Date(banner.starts_at)
    const endsAt = banner.ends_at ? new Date(banner.ends_at) : null

    if (endsAt && endsAt < now) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
          <Calendar className="w-3 h-3" />
          {locale === 'ar' ? 'منتهي' : 'Expired'}
        </span>
      )
    }

    if (startsAt > now) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
          <Clock className="w-3 h-3" />
          {locale === 'ar' ? 'مجدول' : 'Scheduled'}
        </span>
      )
    }

    if (!banner.is_active) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          {locale === 'ar' ? 'غير مفعل' : 'Inactive'}
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" />
        {locale === 'ar' ? 'نشط' : 'Active'}
      </span>
    )
  }

  if (loading) {
    return (
      <>
        <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="h-8 bg-slate-200 rounded animate-pulse w-48"></div>
        </div>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
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
              {locale === 'ar' ? 'بانرات الصفحة الرئيسية' : 'Homepage Banners'}
            </h1>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <Link href={`/${locale}/auth/login`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
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
        title={locale === 'ar' ? 'بانرات الصفحة الرئيسية' : 'Homepage Banners'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <ImageIcon className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">{locale === 'ar' ? 'إجمالي البانرات' : 'Total Banners'}</span>
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
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">{locale === 'ar' ? 'مجدول' : 'Scheduled'}</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.scheduled}</p>
          </div>
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-300">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">{locale === 'ar' ? 'منتهي' : 'Expired'}</span>
            </div>
            <p className="text-2xl font-bold text-slate-700">{stats.expired}</p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث بالعنوان أو الوصف...' : 'Search by title or description...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary`}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="all">{locale === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="active">{locale === 'ar' ? 'نشط' : 'Active'}</option>
              <option value="inactive">{locale === 'ar' ? 'غير مفعل' : 'Inactive'}</option>
              <option value="scheduled">{locale === 'ar' ? 'مجدول' : 'Scheduled'}</option>
              <option value="expired">{locale === 'ar' ? 'منتهي' : 'Expired'}</option>
            </select>

            <Button
              variant="outline"
              onClick={() => loadBanners()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>

            <Button
              onClick={() => {
                resetForm()
                setEditingBanner(null)
                setShowCreateModal(true)
              }}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {locale === 'ar' ? 'بانر جديد' : 'New Banner'}
            </Button>
          </div>
        </div>

        {/* Banners List with Drag & Drop */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-600">
              {locale === 'ar'
                ? 'اسحب البانرات لإعادة ترتيبها. الترتيب يحدد ظهورها على الصفحة الرئيسية.'
                : 'Drag banners to reorder. Order determines display on homepage.'}
            </p>
          </div>

          {filteredBanners.length > 0 ? (
            <Reorder.Group
              axis="y"
              values={filteredBanners}
              onReorder={handleReorder}
              className="divide-y divide-slate-100"
            >
              {filteredBanners.map((banner) => (
                <Reorder.Item
                  key={banner.id}
                  value={banner}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="w-5 h-5 text-slate-400 flex-shrink-0" />

                  {/* Preview Thumbnail */}
                  <div
                    className="w-32 h-18 rounded-lg overflow-hidden flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${banner.gradient_start || '#009DE0'} 0%, ${banner.gradient_end || '#0077B6'} 100%)`,
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center p-2">
                      {banner.image_url ? (
                        <img
                          src={banner.image_url}
                          alt=""
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-white/50" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">
                      {locale === 'ar' ? banner.title_ar : banner.title_en}
                    </h3>
                    <p className="text-sm text-slate-500 truncate">
                      {locale === 'ar' ? banner.description_ar : banner.description_en}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    {getStatusBadge(banner)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(banner)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      title={locale === 'ar' ? 'تعديل' : 'Edit'}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      title={banner.is_active ? (locale === 'ar' ? 'إلغاء التفعيل' : 'Deactivate') : (locale === 'ar' ? 'تفعيل' : 'Activate')}
                    >
                      {banner.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title={locale === 'ar' ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          ) : (
            <div className="px-4 py-12 text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">
                {locale === 'ar' ? 'لا توجد بانرات' : 'No banners found'}
              </p>
              <Button
                onClick={() => {
                  resetForm()
                  setEditingBanner(null)
                  setShowCreateModal(true)
                }}
                className="mt-4"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                {locale === 'ar' ? 'إنشاء بانر جديد' : 'Create New Banner'}
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-5xl my-8 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingBanner
                    ? (locale === 'ar' ? 'تعديل البانر' : 'Edit Banner')
                    : (locale === 'ar' ? 'إنشاء بانر جديد' : 'Create New Banner')
                  }
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingBanner(null)
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col lg:flex-row">
                {/* Form Section */}
                <div className="flex-1 p-6 overflow-y-auto max-h-[70vh] lg:max-h-none lg:overflow-visible">
                  <div className="space-y-4">
                    {/* Title AR/EN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'العنوان (عربي) *' : 'Title (Arabic) *'}
                        </label>
                        <input
                          type="text"
                          value={formData.title_ar}
                          onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="عرض بيتزا السلطان"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'العنوان (إنجليزي) *' : 'Title (English) *'}
                        </label>
                        <input
                          type="text"
                          value={formData.title_en}
                          onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="Sultan Pizza Offer"
                        />
                      </div>
                    </div>

                    {/* Description AR/EN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                        </label>
                        <input
                          type="text"
                          value={formData.description_ar}
                          onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="خصم ٣٠٪ على جميع البيتزا"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                        </label>
                        <input
                          type="text"
                          value={formData.description_en}
                          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="30% off all pizzas"
                        />
                      </div>
                    </div>

                    {/* Badge AR/EN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'نص الشارة (عربي)' : 'Badge Text (Arabic)'}
                        </label>
                        <input
                          type="text"
                          value={formData.badge_text_ar}
                          onChange={(e) => setFormData({ ...formData, badge_text_ar: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="خصم ٣٠٪"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'نص الشارة (إنجليزي)' : 'Badge Text (English)'}
                        </label>
                        <input
                          type="text"
                          value={formData.badge_text_en}
                          onChange={(e) => setFormData({ ...formData, badge_text_en: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="30% OFF"
                        />
                      </div>
                    </div>

                    {/* Image URL */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {locale === 'ar' ? 'رابط صورة المنتج (PNG مفرغ مفضل)' : 'Product Image URL (Transparent PNG preferred)'}
                      </label>
                      <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="https://example.com/pizza.png"
                      />
                    </div>

                    {/* Gradient Colors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'لون التدرج (بداية)' : 'Gradient Start'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={formData.gradient_start}
                            onChange={(e) => setFormData({ ...formData, gradient_start: e.target.value })}
                            className="w-12 h-10 border border-slate-200 rounded-lg cursor-pointer"
                          />
                          <input
                            type="text"
                            value={formData.gradient_start}
                            onChange={(e) => setFormData({ ...formData, gradient_start: e.target.value })}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'لون التدرج (نهاية)' : 'Gradient End'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={formData.gradient_end}
                            onChange={(e) => setFormData({ ...formData, gradient_end: e.target.value })}
                            className="w-12 h-10 border border-slate-200 rounded-lg cursor-pointer"
                          />
                          <input
                            type="text"
                            value={formData.gradient_end}
                            onChange={(e) => setFormData({ ...formData, gradient_end: e.target.value })}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Image Position & Glassmorphism */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'موقع الصورة' : 'Image Position'}
                        </label>
                        <select
                          value={formData.image_position}
                          onChange={(e) => setFormData({ ...formData, image_position: e.target.value as any })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                        >
                          <option value="end">{locale === 'ar' ? 'نهاية (يمين/يسار)' : 'End (Right/Left)'}</option>
                          <option value="start">{locale === 'ar' ? 'بداية (يسار/يمين)' : 'Start (Left/Right)'}</option>
                          <option value="background">{locale === 'ar' ? 'خلفية كاملة' : 'Full Background'}</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.has_glassmorphism}
                            onChange={(e) => setFormData({ ...formData, has_glassmorphism: e.target.checked })}
                            className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm text-slate-700">
                            {locale === 'ar' ? 'تأثير الزجاج على الشارة' : 'Glassmorphism on Badge'}
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* CTA Text AR/EN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'نص الزر (عربي)' : 'CTA Text (Arabic)'}
                        </label>
                        <input
                          type="text"
                          value={formData.cta_text_ar}
                          onChange={(e) => setFormData({ ...formData, cta_text_ar: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="اطلب الآن"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'نص الزر (إنجليزي)' : 'CTA Text (English)'}
                        </label>
                        <input
                          type="text"
                          value={formData.cta_text_en}
                          onChange={(e) => setFormData({ ...formData, cta_text_en: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="Order Now"
                        />
                      </div>
                    </div>

                    {/* Link URL & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'رابط الوجهة' : 'Link URL'}
                        </label>
                        <input
                          type="text"
                          value={formData.link_url}
                          onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="/providers?category=restaurants"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'نوع الرابط' : 'Link Type'}
                        </label>
                        <select
                          value={formData.link_type}
                          onChange={(e) => setFormData({ ...formData, link_type: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                        >
                          <option value="category">{locale === 'ar' ? 'فئة' : 'Category'}</option>
                          <option value="provider">{locale === 'ar' ? 'متجر' : 'Provider'}</option>
                          <option value="promo">{locale === 'ar' ? 'كود خصم' : 'Promo Code'}</option>
                          <option value="external">{locale === 'ar' ? 'رابط خارجي' : 'External'}</option>
                        </select>
                      </div>
                    </div>

                    {/* Countdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.is_countdown_active}
                            onChange={(e) => setFormData({ ...formData, is_countdown_active: e.target.checked })}
                            className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                          />
                          <span className="text-sm text-slate-700">
                            {locale === 'ar' ? 'تفعيل العداد التنازلي' : 'Enable Countdown Timer'}
                          </span>
                        </label>
                      </div>
                      {formData.is_countdown_active && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {locale === 'ar' ? 'نهاية العداد' : 'Countdown End'}
                          </label>
                          <input
                            type="datetime-local"
                            value={formData.countdown_end_time}
                            onChange={(e) => setFormData({ ...formData, countdown_end_time: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      )}
                    </div>

                    {/* Schedule */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'يبدأ من' : 'Starts At'}
                        </label>
                        <input
                          type="date"
                          value={formData.starts_at}
                          onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {locale === 'ar' ? 'ينتهي في (اختياري)' : 'Ends At (Optional)'}
                        </label>
                        <input
                          type="date"
                          value={formData.ends_at}
                          onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Is Active */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="is_active" className="text-sm text-slate-700">
                        {locale === 'ar' ? 'تفعيل البانر' : 'Activate Banner'}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Live Preview Section */}
                <div className="lg:w-96 bg-slate-50 p-6 border-t lg:border-t-0 lg:border-s border-slate-200">
                  <div className="sticky top-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900">
                        {locale === 'ar' ? 'معاينة مباشرة' : 'Live Preview'}
                      </h3>
                      <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200">
                        <button
                          onClick={() => setPreviewMode('mobile')}
                          className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-primary text-white' : 'text-slate-500'}`}
                        >
                          <Smartphone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPreviewMode('desktop')}
                          className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-primary text-white' : 'text-slate-500'}`}
                        >
                          <Monitor className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Preview Container */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-3 text-center">
                        {previewMode === 'mobile'
                          ? (locale === 'ar' ? 'عرض الموبايل' : 'Mobile View')
                          : (locale === 'ar' ? 'عرض الديسكتوب' : 'Desktop View')
                        }
                      </p>
                      <BannerPreview
                        data={formData}
                        locale={locale}
                        viewMode={previewMode}
                      />
                    </div>

                    {/* Quick Tips */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
                        {locale === 'ar' ? 'نصائح' : 'Tips'}
                      </h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• {locale === 'ar' ? 'استخدم صور PNG مفرغة للمنتجات' : 'Use transparent PNG for products'}</li>
                        <li>• {locale === 'ar' ? 'الألوان الموصى بها: #009DE0, #0088CC, #0077B6' : 'Recommended colors: #009DE0, #0088CC, #0077B6'}</li>
                        <li>• {locale === 'ar' ? 'نسبة الصورة المثالية 16:9' : 'Optimal aspect ratio is 16:9'}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-200 flex gap-3 justify-end bg-white">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingBanner(null)
                  }}
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleSaveBanner}
                  disabled={!formData.title_ar || !formData.title_en || isSaving}
                  className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingBanner
                    ? (locale === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                    : (locale === 'ar' ? 'إنشاء البانر' : 'Create Banner')
                  }
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
