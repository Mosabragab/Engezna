'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, AdminSidebar } from '@/components/admin'
import { formatNumber } from '@/lib/utils/formatters'
import {
  Shield,
  MapPin,
  Building,
  Map,
  Home,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  X,
  Save,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Governorate {
  id: string
  name_ar: string
  name_en: string
  is_active: boolean
  created_at: string
  cities_count?: number
}

interface City {
  id: string
  governorate_id: string
  name_ar: string
  name_en: string
  is_active: boolean
  created_at: string
  districts_count?: number
}

interface District {
  id: string
  governorate_id: string
  city_id: string | null
  name_ar: string
  name_en: string
  is_active: boolean
  created_at: string
}

type ViewLevel = 'governorates' | 'cities' | 'districts'
type ModalType = 'add' | 'edit' | null

export default function AdminLocationsPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])

  const [viewLevel, setViewLevel] = useState<ViewLevel>('governorates')
  const [selectedGovernorate, setSelectedGovernorate] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Modal states
  const [modalType, setModalType] = useState<ModalType>(null)
  const [editItem, setEditItem] = useState<Governorate | City | District | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    governorate_id: '',
    city_id: '',
    is_active: true,
  })

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteItem, setDeleteItem] = useState<{ type: ViewLevel; item: Governorate | City | District } | null>(null)

  const [stats, setStats] = useState({
    totalGovernorates: 0,
    activeGovernorates: 0,
    totalCities: 0,
    activeCities: 0,
    totalDistricts: 0,
    activeDistricts: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [governorates, cities, districts])

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
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (adminUser?.role === 'super_admin') {
          setIsSuperAdmin(true)
        }

        await loadLocations(supabase)
      }
    }

    setLoading(false)
  }

  async function loadLocations(supabase: ReturnType<typeof createClient>) {
    // Load governorates
    const { data: govData } = await supabase
      .from('governorates')
      .select('*')
      .order('name_ar')

    // Load cities
    const { data: cityData } = await supabase
      .from('cities')
      .select('*')
      .order('name_ar')

    // Load districts
    const { data: districtData } = await supabase
      .from('districts')
      .select('*')
      .order('name_ar')

    const govs = govData || []
    const citiesList = cityData || []
    const districtsList = districtData || []

    // Calculate counts
    const govsWithCounts = govs.map(g => ({
      ...g,
      cities_count: citiesList.filter(c => c.governorate_id === g.id).length,
    }))

    const citiesWithCounts = citiesList.map(c => ({
      ...c,
      districts_count: districtsList.filter(d => d.city_id === c.id).length,
    }))

    setGovernorates(govsWithCounts)
    setCities(citiesWithCounts)
    setDistricts(districtsList)
  }

  function calculateStats() {
    setStats({
      totalGovernorates: governorates.length,
      activeGovernorates: governorates.filter(g => g.is_active).length,
      totalCities: cities.length,
      activeCities: cities.filter(c => c.is_active).length,
      totalDistricts: districts.length,
      activeDistricts: districts.filter(d => d.is_active).length,
    })
  }

  function getFilteredItems() {
    let items: (Governorate | City | District)[] = []

    if (viewLevel === 'governorates') {
      items = governorates
    } else if (viewLevel === 'cities') {
      items = selectedGovernorate
        ? cities.filter(c => c.governorate_id === selectedGovernorate)
        : cities
    } else {
      items = selectedCity
        ? districts.filter(d => d.city_id === selectedCity)
        : selectedGovernorate
        ? districts.filter(d => d.governorate_id === selectedGovernorate)
        : districts
    }

    // Filter by active status
    if (!showInactive) {
      items = items.filter(i => i.is_active)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      items = items.filter(i =>
        i.name_ar.toLowerCase().includes(query) ||
        i.name_en.toLowerCase().includes(query)
      )
    }

    return items
  }

  function openAddModal() {
    setFormData({
      name_ar: '',
      name_en: '',
      governorate_id: selectedGovernorate || '',
      city_id: selectedCity || '',
      is_active: true,
    })
    setFormError('')
    setEditItem(null)
    setModalType('add')
  }

  function openEditModal(item: Governorate | City | District) {
    setFormData({
      name_ar: item.name_ar,
      name_en: item.name_en,
      governorate_id: 'governorate_id' in item ? item.governorate_id : '',
      city_id: 'city_id' in item && item.city_id ? item.city_id : '',
      is_active: item.is_active,
    })
    setFormError('')
    setEditItem(item)
    setModalType('edit')
  }

  function openDeleteModal(type: ViewLevel, item: Governorate | City | District) {
    setDeleteItem({ type, item })
    setShowDeleteModal(true)
  }

  async function handleSave() {
    if (!formData.name_ar || !formData.name_en) {
      setFormError(locale === 'ar' ? 'الاسمان بالعربية والإنجليزية مطلوبان' : 'Both Arabic and English names are required')
      return
    }

    setFormLoading(true)
    setFormError('')
    const supabase = createClient()

    try {
      if (viewLevel === 'governorates') {
        if (modalType === 'add') {
          const { error } = await supabase
            .from('governorates')
            .insert({
              name_ar: formData.name_ar,
              name_en: formData.name_en,
              is_active: formData.is_active,
            })
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('governorates')
            .update({
              name_ar: formData.name_ar,
              name_en: formData.name_en,
              is_active: formData.is_active,
            })
            .eq('id', editItem!.id)
          if (error) throw error
        }
      } else if (viewLevel === 'cities') {
        if (!formData.governorate_id) {
          setFormError(locale === 'ar' ? 'المحافظة مطلوبة' : 'Governorate is required')
          setFormLoading(false)
          return
        }

        if (modalType === 'add') {
          const { error } = await supabase
            .from('cities')
            .insert({
              name_ar: formData.name_ar,
              name_en: formData.name_en,
              governorate_id: formData.governorate_id,
              is_active: formData.is_active,
            })
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('cities')
            .update({
              name_ar: formData.name_ar,
              name_en: formData.name_en,
              governorate_id: formData.governorate_id,
              is_active: formData.is_active,
            })
            .eq('id', editItem!.id)
          if (error) throw error
        }
      } else if (viewLevel === 'districts') {
        if (!formData.governorate_id) {
          setFormError(locale === 'ar' ? 'المحافظة مطلوبة' : 'Governorate is required')
          setFormLoading(false)
          return
        }

        if (modalType === 'add') {
          const { error } = await supabase
            .from('districts')
            .insert({
              name_ar: formData.name_ar,
              name_en: formData.name_en,
              governorate_id: formData.governorate_id,
              city_id: formData.city_id || null,
              is_active: formData.is_active,
            })
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('districts')
            .update({
              name_ar: formData.name_ar,
              name_en: formData.name_en,
              governorate_id: formData.governorate_id,
              city_id: formData.city_id || null,
              is_active: formData.is_active,
            })
            .eq('id', editItem!.id)
          if (error) throw error
        }
      }

      await loadLocations(supabase)
      setModalType(null)
    } catch (error: any) {
      console.error('Error saving:', error)
      setFormError(locale === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving')
    }

    setFormLoading(false)
  }

  async function handleDelete() {
    if (!deleteItem) return

    setFormLoading(true)
    const supabase = createClient()

    try {
      const tableName = deleteItem.type === 'governorates' ? 'governorates' : deleteItem.type === 'cities' ? 'cities' : 'districts'
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', deleteItem.item.id)

      if (error) throw error

      await loadLocations(supabase)
      setShowDeleteModal(false)
      setDeleteItem(null)
    } catch (error: any) {
      console.error('Error deleting:', error)
      setFormError(locale === 'ar' ? 'لا يمكن حذف هذا العنصر - قد يكون مرتبطاً ببيانات أخرى' : 'Cannot delete - may be linked to other data')
    }

    setFormLoading(false)
  }

  async function handleToggleActive(type: ViewLevel, item: Governorate | City | District) {
    const supabase = createClient()
    const tableName = type === 'governorates' ? 'governorates' : type === 'cities' ? 'cities' : 'districts'

    await supabase
      .from(tableName)
      .update({ is_active: !item.is_active })
      .eq('id', item.id)

    await loadLocations(supabase)
  }

  const filteredItems = getFilteredItems()

  const getViewLevelLabel = (level: ViewLevel) => {
    const labels: Record<ViewLevel, { ar: string; en: string; icon: React.ElementType }> = {
      governorates: { ar: 'المحافظات', en: 'Governorates', icon: Building },
      cities: { ar: 'المدن', en: 'Cities', icon: Map },
      districts: { ar: 'الأحياء', en: 'Districts', icon: Home },
    }
    return labels[level]
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
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'إدارة المواقع الجغرافية' : 'Location Management'}
          subtitle={locale === 'ar' ? 'المحافظات والمدن والأحياء' : 'Governorates, Cities & Districts'}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Building className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'المحافظات' : 'Governorates'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {formatNumber(stats.activeGovernorates, locale)} / {formatNumber(stats.totalGovernorates, locale)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Map className="w-5 h-5 text-green-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'المدن' : 'Cities'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {formatNumber(stats.activeCities, locale)} / {formatNumber(stats.totalCities, locale)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-2">
                <Home className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'الأحياء' : 'Districts'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {formatNumber(stats.activeDistricts, locale)} / {formatNumber(stats.totalDistricts, locale)}
              </p>
            </div>
          </div>

          {/* Breadcrumb & View Level */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => { setViewLevel('governorates'); setSelectedGovernorate(null); setSelectedCity(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                viewLevel === 'governorates' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building className="w-4 h-4" />
              {locale === 'ar' ? 'المحافظات' : 'Governorates'}
            </button>

            {selectedGovernorate && (
              <>
                <ChevronRight className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
                <button
                  onClick={() => { setViewLevel('cities'); setSelectedCity(null); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                    viewLevel === 'cities' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Map className="w-4 h-4" />
                  {locale === 'ar' ? governorates.find(g => g.id === selectedGovernorate)?.name_ar : governorates.find(g => g.id === selectedGovernorate)?.name_en}
                </button>
              </>
            )}

            {selectedCity && (
              <>
                <ChevronRight className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
                <button
                  onClick={() => setViewLevel('districts')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                    viewLevel === 'districts' ? 'bg-red-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  {locale === 'ar' ? cities.find(c => c.id === selectedCity)?.name_ar : cities.find(c => c.id === selectedCity)?.name_en}
                </button>
              </>
            )}
          </div>

          {/* Filters & Actions */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-slate-600">
                  {locale === 'ar' ? 'عرض غير النشطة' : 'Show inactive'}
                </span>
              </label>

              <Button
                variant="outline"
                onClick={() => {
                  const supabase = createClient()
                  loadLocations(supabase)
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>

              {isSuperAdmin && (
                <Button
                  onClick={openAddModal}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-4 h-4" />
                  {locale === 'ar' ? 'إضافة' : 'Add'} {getViewLevelLabel(viewLevel)[locale === 'ar' ? 'ar' : 'en'].slice(0, -2) || getViewLevelLabel(viewLevel)[locale === 'ar' ? 'ar' : 'en']}
                </Button>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}
                    </th>
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}
                    </th>
                    {viewLevel === 'governorates' && (
                      <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                        {locale === 'ar' ? 'المدن' : 'Cities'}
                      </th>
                    )}
                    {viewLevel === 'cities' && (
                      <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                        {locale === 'ar' ? 'الأحياء' : 'Districts'}
                      </th>
                    )}
                    <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                      {locale === 'ar' ? 'الحالة' : 'Status'}
                    </th>
                    {isSuperAdmin && (
                      <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                        {locale === 'ar' ? 'إجراءات' : 'Actions'}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              if (viewLevel === 'governorates') {
                                setSelectedGovernorate(item.id)
                                setViewLevel('cities')
                              } else if (viewLevel === 'cities') {
                                setSelectedCity(item.id)
                                setViewLevel('districts')
                              }
                            }}
                            className="font-medium text-slate-900 hover:text-red-600 flex items-center gap-2"
                          >
                            {item.name_ar}
                            {viewLevel !== 'districts' && <ChevronRight className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.name_en}</td>
                        {viewLevel === 'governorates' && (
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600">
                              {formatNumber((item as Governorate).cities_count || 0, locale)} {locale === 'ar' ? 'مدينة' : 'cities'}
                            </span>
                          </td>
                        )}
                        {viewLevel === 'cities' && (
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-600">
                              {formatNumber((item as City).districts_count || 0, locale)} {locale === 'ar' ? 'حي' : 'districts'}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          {item.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3" />
                              {locale === 'ar' ? 'نشط' : 'Active'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3" />
                              {locale === 'ar' ? 'غير نشط' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleToggleActive(viewLevel, item)}
                                title={item.is_active ? (locale === 'ar' ? 'إلغاء التفعيل' : 'Deactivate') : (locale === 'ar' ? 'تفعيل' : 'Activate')}
                              >
                                {item.is_active ? (
                                  <EyeOff className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <Eye className="w-4 h-4 text-green-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openEditModal(item)}
                              >
                                <Edit className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openDeleteModal(viewLevel, item)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isSuperAdmin ? 5 : 4} className="px-4 py-12 text-center">
                        <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">
                          {locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}
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

      {/* Add/Edit Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {modalType === 'add'
                  ? (locale === 'ar' ? 'إضافة ' : 'Add ') + getViewLevelLabel(viewLevel)[locale === 'ar' ? 'ar' : 'en'].slice(0, -2)
                  : (locale === 'ar' ? 'تعديل ' : 'Edit ') + getViewLevelLabel(viewLevel)[locale === 'ar' ? 'ar' : 'en'].slice(0, -2)
                }
              </h2>
              <button
                onClick={() => setModalType(null)}
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'} *
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  dir="ltr"
                />
              </div>

              {(viewLevel === 'cities' || viewLevel === 'districts') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'المحافظة' : 'Governorate'} *
                  </label>
                  <select
                    value={formData.governorate_id}
                    onChange={(e) => setFormData({ ...formData, governorate_id: e.target.value, city_id: '' })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">{locale === 'ar' ? 'اختر المحافظة' : 'Select governorate'}</option>
                    {governorates.map(g => (
                      <option key={g.id} value={g.id}>
                        {locale === 'ar' ? g.name_ar : g.name_en}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {viewLevel === 'districts' && formData.governorate_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'المدينة (اختياري)' : 'City (optional)'}
                  </label>
                  <select
                    value={formData.city_id}
                    onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">{locale === 'ar' ? 'بدون مدينة' : 'No city'}</option>
                    {cities.filter(c => c.governorate_id === formData.governorate_id).map(c => (
                      <option key={c.id} value={c.id}>
                        {locale === 'ar' ? c.name_ar : c.name_en}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">
                  {locale === 'ar' ? 'نشط' : 'Active'}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setModalType(null)}
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
                    {locale === 'ar' ? 'حفظ' : 'Save'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
              </h2>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteItem(null); }}
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

            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-center text-slate-600">
                {locale === 'ar'
                  ? `هل أنت متأكد من حذف "${deleteItem.item.name_ar}"؟`
                  : `Are you sure you want to delete "${deleteItem.item.name_en}"?`
                }
              </p>
              <p className="text-center text-sm text-slate-500 mt-2">
                {locale === 'ar'
                  ? 'لا يمكن التراجع عن هذا الإجراء'
                  : 'This action cannot be undone'
                }
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowDeleteModal(false); setDeleteItem(null); setFormError(''); }}
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
    </div>
  )
}
