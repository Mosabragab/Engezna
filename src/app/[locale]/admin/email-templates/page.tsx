'use client'

import { useLocale } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { AdminHeader, useAdminSidebar } from '@/components/admin'
import { formatDate } from '@/lib/utils/formatters'
import {
  Shield,
  Mail,
  Search,
  RefreshCw,
  Eye,
  X,
  Save,
  AlertCircle,
  Edit,
  Code,
  FileText,
  History,
  CheckCircle2,
  XCircle,
  Variable,
  Copy,
  Check,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface EmailTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  subject: string
  html_content: string
  available_variables: string[]
  is_active: boolean
  category: string
  created_at: string
  updated_at: string
}

interface TemplateVersion {
  id: string
  template_id: string
  version_number: number
  subject: string
  html_content: string
  created_at: string
  change_note: string | null
}

// Sample data for previewing templates
const sampleData: Record<string, Record<string, string | number>> = {
  'merchant-welcome': {
    merchantName: 'أحمد محمد',
    storeName: 'مطاعم',
    dashboardUrl: 'https://www.engezna.com/ar/provider/dashboard',
  },
  'store-approved': {
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    storeUrl: 'https://www.engezna.com/ar/store/el-sharq',
    dashboardUrl: 'https://www.engezna.com/ar/provider/dashboard',
  },
  'store-rejection': {
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    rejectionReason: 'الصور المقدمة غير واضحة. يرجى تقديم صور عالية الجودة للمتجر والمنتجات.',
    supportUrl: 'https://www.engezna.com/ar/provider/help',
  },
  'order-received': {
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    orderNumber: '1234',
    customerName: 'محمد علي',
    itemsCount: 3,
    formattedAmount: '285.50 ج.م',
    deliveryAddress: 'شارع التحرير، المنصورة، الدقهلية',
    orderUrl: 'https://www.engezna.com/ar/provider/orders/1234',
  },
  'settlement': {
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    formattedAmount: '15,750.50 ج.م',
    settlementId: 'STL-2024-001234',
    formattedDate: '15 يناير 2024',
    ordersCount: 47,
    period: '1 - 15 يناير 2024',
    dashboardUrl: 'https://www.engezna.com/ar/provider/dashboard/settlements',
  },
  'staff-invitation': {
    staffName: 'سارة أحمد',
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    roleName: 'كاشير',
    email: 'sara@example.com',
    inviteUrl: 'https://www.engezna.com/ar/invite/abc123',
  },
  'store-suspended': {
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    formattedDate: '15 يناير 2024',
    suspensionReason: 'تلقينا عدة شكاوى من العملاء بخصوص جودة الطعام وتأخر التوصيل.',
    supportUrl: 'https://www.engezna.com/ar/provider/help',
  },
}

const categoryLabels: Record<string, { ar: string; en: string }> = {
  merchant: { ar: 'التجار', en: 'Merchants' },
  customer: { ar: 'العملاء', en: 'Customers' },
  admin: { ar: 'الإدارة', en: 'Admin' },
  marketing: { ar: 'التسويق', en: 'Marketing' },
}

export default function AdminEmailTemplatesPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const { toggle: toggleSidebar } = useAdminSidebar()

  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)

  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<EmailTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [formData, setFormData] = useState({
    subject: '',
    html_content: '',
  })

  // Preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')

  // Version history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyTemplate, setHistoryTemplate] = useState<EmailTemplate | null>(null)
  const [versions, setVersions] = useState<TemplateVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  // Copy feedback
  const [copiedVar, setCopiedVar] = useState<string | null>(null)

  const loadTemplates = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('category')
      .order('name')

    if (error) {
      console.error('Error loading templates:', error)
      return
    }

    setTemplates(data || [])
  }, [])

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

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id, role')
          .eq('user_id', user.id)
          .single()

        if (adminUser) {
          // Check if user can edit templates
          if (['super_admin', 'admin', 'marketing_manager'].includes(adminUser.role)) {
            setCanEdit(true)
          }
        }

        await loadTemplates(supabase)
      }
    }

    setLoading(false)
  }, [loadTemplates])

  const filterTemplates = useCallback(() => {
    let filtered = [...templates]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name?.toLowerCase().includes(query) ||
        t.slug?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter)
    }

    setFilteredTemplates(filtered)
  }, [templates, searchQuery, categoryFilter])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    filterTemplates()
  }, [filterTemplates])

  function replaceVariables(html: string, variables: Record<string, string | number>): string {
    let result = html
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      result = result.replace(regex, String(value))
    }
    return result
  }

  function openPreview(template: EmailTemplate) {
    const data = sampleData[template.slug] || {}
    const html = replaceVariables(template.html_content, data)
    setPreviewHtml(html)
    setPreviewTemplate(template)
    setShowPreviewModal(true)
  }

  function openEditModal(template: EmailTemplate) {
    setEditingTemplate(template)
    setFormData({
      subject: template.subject,
      html_content: template.html_content,
    })
    setFormError('')
    setFormSuccess('')
    setShowEditModal(true)
  }

  async function openHistoryModal(template: EmailTemplate) {
    setHistoryTemplate(template)
    setVersionsLoading(true)
    setShowHistoryModal(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('email_template_versions')
      .select('*')
      .eq('template_id', template.id)
      .order('version_number', { ascending: false })

    if (!error && data) {
      setVersions(data)
    }
    setVersionsLoading(false)
  }

  async function handleSave() {
    if (!editingTemplate) return

    if (!formData.subject || !formData.html_content) {
      setFormError(locale === 'ar' ? 'الموضوع والمحتوى مطلوبان' : 'Subject and content are required')
      return
    }

    setFormLoading(true)
    setFormError('')
    setFormSuccess('')

    const supabase = createClient()

    const { error } = await supabase
      .from('email_templates')
      .update({
        subject: formData.subject,
        html_content: formData.html_content,
      })
      .eq('id', editingTemplate.id)

    if (error) {
      setFormError(locale === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving template')
      setFormLoading(false)
      return
    }

    setFormSuccess(locale === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully')
    await loadTemplates(supabase)

    setTimeout(() => {
      setShowEditModal(false)
      setFormLoading(false)
    }, 1000)
  }

  async function restoreVersion(version: TemplateVersion) {
    if (!historyTemplate) return

    const supabase = createClient()

    const { error } = await supabase
      .from('email_templates')
      .update({
        subject: version.subject,
        html_content: version.html_content,
      })
      .eq('id', historyTemplate.id)

    if (!error) {
      await loadTemplates(supabase)
      setShowHistoryModal(false)
    }
  }

  function copyVariable(variable: string) {
    navigator.clipboard.writeText(`{{${variable}}}`)
    setCopiedVar(variable)
    setTimeout(() => setCopiedVar(null), 2000)
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
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'قوالب البريد الإلكتروني' : 'Email Templates'}
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
        title={locale === 'ar' ? 'قوالب البريد الإلكتروني' : 'Email Templates'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{templates.length}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">{locale === 'ar' ? 'نشطة' : 'Active'}</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{templates.filter(t => t.is_active).length}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">{locale === 'ar' ? 'للتجار' : 'Merchants'}</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{templates.filter(t => t.category === 'merchant').length}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <Code className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-purple-700">{locale === 'ar' ? 'المتغيرات' : 'Variables'}</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {templates.reduce((acc, t) => acc + (t.available_variables?.length || 0), 0)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث في القوالب...' : 'Search templates...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="all">{locale === 'ar' ? 'كل الفئات' : 'All Categories'}</option>
              <option value="merchant">{locale === 'ar' ? 'التجار' : 'Merchants'}</option>
              <option value="customer">{locale === 'ar' ? 'العملاء' : 'Customers'}</option>
              <option value="admin">{locale === 'ar' ? 'الإدارة' : 'Admin'}</option>
              <option value="marketing">{locale === 'ar' ? 'التسويق' : 'Marketing'}</option>
            </select>

            <Button
              variant="outline"
              onClick={() => {
                const supabase = createClient()
                loadTemplates(supabase)
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${template.is_active ? 'border-slate-200' : 'border-red-200 bg-red-50'}`}
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          {categoryLabels[template.category]?.[locale === 'ar' ? 'ar' : 'en'] || template.category}
                        </span>
                        {template.is_active ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                            {locale === 'ar' ? 'نشط' : 'Active'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            {locale === 'ar' ? 'معطل' : 'Inactive'}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900">{template.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{template.description}</p>
                    </div>
                  </div>

                  {/* Slug */}
                  <div className="mb-3">
                    <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono">
                      {template.slug}
                    </code>
                  </div>

                  {/* Subject */}
                  <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">{locale === 'ar' ? 'الموضوع:' : 'Subject:'}</p>
                    <p className="text-sm text-slate-700 font-medium">{template.subject}</p>
                  </div>

                  {/* Variables */}
                  {template.available_variables && template.available_variables.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                        <Variable className="w-3 h-3" />
                        {locale === 'ar' ? 'المتغيرات المتاحة:' : 'Available variables:'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.available_variables.map((v) => (
                          <button
                            key={v}
                            onClick={() => copyVariable(v)}
                            className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded font-mono hover:bg-purple-100 flex items-center gap-1"
                          >
                            {`{{${v}}}`}
                            {copiedVar === v ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-50" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="text-xs text-slate-400 mb-3">
                    {locale === 'ar' ? 'آخر تحديث:' : 'Last updated:'} {formatDate(template.updated_at, locale)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPreview(template)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {locale === 'ar' ? 'معاينة' : 'Preview'}
                    </Button>

                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(template)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          {locale === 'ar' ? 'تعديل' : 'Edit'}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openHistoryModal(template)}
                          className="flex items-center gap-2"
                        >
                          <History className="w-4 h-4" />
                          {locale === 'ar' ? 'السجل' : 'History'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">
                {locale === 'ar' ? 'لا توجد قوالب' : 'No templates found'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {locale === 'ar' ? 'معاينة القالب' : 'Template Preview'}
                </h2>
                <p className="text-sm text-slate-500">{previewTemplate.name}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-slate-100 p-4">
              <iframe
                srcDoc={previewHtml}
                className="w-full bg-white rounded-lg shadow"
                style={{ height: '600px' }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {locale === 'ar' ? 'تعديل القالب' : 'Edit Template'}
                </h2>
                <p className="text-sm text-slate-500">{editingTemplate.name}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm">{formSuccess}</span>
                </div>
              )}

              {/* Available Variables */}
              {editingTemplate.available_variables && editingTemplate.available_variables.length > 0 && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-700 mb-2 font-medium flex items-center gap-2">
                    <Variable className="w-4 h-4" />
                    {locale === 'ar' ? 'المتغيرات المتاحة (انقر للنسخ):' : 'Available variables (click to copy):'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {editingTemplate.available_variables.map((v) => (
                      <button
                        key={v}
                        onClick={() => copyVariable(v)}
                        className="text-sm bg-white text-purple-700 px-3 py-1 rounded-lg font-mono hover:bg-purple-100 flex items-center gap-2 border border-purple-200"
                      >
                        {`{{${v}}}`}
                        {copiedVar === v ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 opacity-50" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'الموضوع' : 'Subject'} *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 font-mono text-sm"
                    dir="auto"
                  />
                </div>

                {/* HTML Content */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'محتوى HTML' : 'HTML Content'} *
                  </label>
                  <textarea
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    rows={20}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 font-mono text-xs"
                    dir="ltr"
                    style={{ tabSize: 2 }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    const data = sampleData[editingTemplate.slug] || {}
                    const html = replaceVariables(formData.html_content, data)
                    setPreviewHtml(html)
                    setPreviewTemplate(editingTemplate)
                    setShowPreviewModal(true)
                  }}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {locale === 'ar' ? 'معاينة' : 'Preview'}
                </Button>
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={formLoading}
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 me-2" />
                      {locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showHistoryModal && historyTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {locale === 'ar' ? 'سجل التعديلات' : 'Version History'}
                </h2>
                <p className="text-sm text-slate-500">{historyTemplate.name}</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {versionsLoading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : versions.length > 0 ? (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900">
                          {locale === 'ar' ? 'الإصدار' : 'Version'} #{version.version_number}
                        </span>
                        <span className="text-sm text-slate-500">
                          {formatDate(version.created_at, locale)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        <strong>{locale === 'ar' ? 'الموضوع:' : 'Subject:'}</strong> {version.subject}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreVersion(version)}
                        className="flex items-center gap-2"
                      >
                        <History className="w-4 h-4" />
                        {locale === 'ar' ? 'استعادة هذا الإصدار' : 'Restore this version'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  {locale === 'ar' ? 'لا يوجد سجل تعديلات بعد' : 'No version history yet'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
