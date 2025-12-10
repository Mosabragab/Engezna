'use client'

import React from 'react'
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
  ClipboardList,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  Eye,
  MessageSquare,
  Calendar,
  User as UserIcon,
  FileText,
  Tag,
  Filter,
  ChevronRight,
  Bell,
  X,
  Save,
  Link as LinkIcon,
  Paperclip,
  Send,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type TaskStatus = 'new' | 'accepted' | 'in_progress' | 'pending' | 'completed' | 'cancelled'
type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'
type TaskType = 'provider_review' | 'dispute' | 'support' | 'report' | 'financial' | 'investigation' | 'other'

interface Task {
  id: string
  task_number: string
  title: string
  description: string | null
  type: TaskType | null
  priority: TaskPriority
  status: TaskStatus
  progress_percentage: number
  created_by: string | null
  assigned_to: string | null
  deadline: string | null
  reminder_before: string | null
  auto_escalate: boolean
  requires_approval: boolean
  related_provider_id: string | null
  related_order_id: string | null
  related_ticket_id: string | null
  related_customer_id: string | null
  attachments: any | null
  accepted_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  creator?: { full_name: string | null; email: string | null } | null
  assignee?: { full_name: string | null; email: string | null } | null
}

type FilterStatus = 'all' | TaskStatus
type FilterPriority = 'all' | TaskPriority

// Status config with colors and labels
const statusConfig: Record<TaskStatus, { label: { ar: string; en: string }; color: string; icon: React.ElementType }> = {
  new: { label: { ar: 'جديدة', en: 'New' }, color: 'bg-blue-100 text-blue-700', icon: Clock },
  accepted: { label: { ar: 'تم القبول', en: 'Accepted' }, color: 'bg-cyan-100 text-cyan-700', icon: CheckCircle2 },
  in_progress: { label: { ar: 'قيد التنفيذ', en: 'In Progress' }, color: 'bg-yellow-100 text-yellow-700', icon: Play },
  pending: { label: { ar: 'في انتظار', en: 'Pending' }, color: 'bg-orange-100 text-orange-700', icon: Pause },
  completed: { label: { ar: 'مكتملة', en: 'Completed' }, color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: { ar: 'ملغاة', en: 'Cancelled' }, color: 'bg-red-100 text-red-700', icon: XCircle },
}

const priorityConfig: Record<TaskPriority, { label: { ar: string; en: string }; color: string }> = {
  urgent: { label: { ar: 'عاجلة', en: 'Urgent' }, color: 'bg-red-500 text-white' },
  high: { label: { ar: 'عالية', en: 'High' }, color: 'bg-orange-500 text-white' },
  medium: { label: { ar: 'متوسطة', en: 'Medium' }, color: 'bg-yellow-500 text-white' },
  low: { label: { ar: 'منخفضة', en: 'Low' }, color: 'bg-green-500 text-white' },
}

const typeConfig: Record<TaskType, { label: { ar: string; en: string } }> = {
  provider_review: { label: { ar: 'مراجعة متاجر', en: 'Provider Review' } },
  dispute: { label: { ar: 'حل نزاعات', en: 'Dispute Resolution' } },
  support: { label: { ar: 'دعم فني', en: 'Support' } },
  report: { label: { ar: 'تقارير', en: 'Reports' } },
  financial: { label: { ar: 'مالية', en: 'Financial' } },
  investigation: { label: { ar: 'تحقيق', en: 'Investigation' } },
  other: { label: { ar: 'أخرى', en: 'Other' } },
}

export default function AdminTasksPage() {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const { toggle: toggleSidebar } = useAdminSidebar()

  const [user, setUser] = useState<User | null>(null)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all')
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all')

  // Create task modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [supervisors, setSupervisors] = useState<{ id: string; full_name: string | null }[]>([])
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'other' as TaskType,
    priority: 'medium' as TaskPriority,
    assigned_to: '',
    deadline: '',
    requires_approval: false,
    auto_escalate: false,
  })

  // Update task modal
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [updateData, setUpdateData] = useState({
    status: '' as TaskStatus | '',
    progress_percentage: 0,
    comment: '',
  })

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    completedToday: 0,
    overdue: 0,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterTasks()
  }, [tasks, searchQuery, statusFilter, priorityFilter, viewMode, currentAdminId])

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

        // Get admin_user record
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

        await loadTasks(supabase)
        await loadSupervisors(supabase)
      }
    }

    setLoading(false)
  }

  async function loadTasks(supabase: ReturnType<typeof createClient>) {
    const { data: tasksData, error } = await supabase
      .from('admin_tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading tasks:', error)
      return
    }

    // Load creator and assignee names
    const tasksWithUsers = await Promise.all(
      (tasksData || []).map(async (task) => {
        let creator = null
        let assignee = null

        if (task.created_by) {
          const { data: creatorAdmin } = await supabase
            .from('admin_users')
            .select('user_id')
            .eq('id', task.created_by)
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

        if (task.assigned_to) {
          const { data: assigneeAdmin } = await supabase
            .from('admin_users')
            .select('user_id')
            .eq('id', task.assigned_to)
            .single()

          if (assigneeAdmin) {
            const { data: assigneeProfile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', assigneeAdmin.user_id)
              .single()
            assignee = assigneeProfile
          }
        }

        return { ...task, creator, assignee }
      })
    )

    setTasks(tasksWithUsers)
    calculateStats(tasksWithUsers)
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
            .select('full_name')
            .eq('id', admin.user_id)
            .single()

          return {
            id: admin.id,
            full_name: profile?.full_name || null,
          }
        })
      )
      setSupervisors(supervisorsList)
    }
  }

  function calculateStats(data: Task[]) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const stats = {
      total: data.length,
      active: data.filter(t => ['new', 'accepted', 'in_progress'].includes(t.status)).length,
      pending: data.filter(t => t.status === 'pending').length,
      completedToday: data.filter(t => {
        if (t.status !== 'completed' || !t.completed_at) return false
        return new Date(t.completed_at) >= today
      }).length,
      overdue: data.filter(t => {
        if (['completed', 'cancelled'].includes(t.status)) return false
        if (!t.deadline) return false
        return new Date(t.deadline) < now
      }).length,
    }
    setStats(stats)
  }

  function filterTasks() {
    let filtered = [...tasks]

    // Filter by view mode (all vs my tasks)
    if (viewMode === 'my' && currentAdminId) {
      filtered = filtered.filter(t => t.assigned_to === currentAdminId)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.title?.toLowerCase().includes(query) ||
        t.task_number?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter)
    }

    setFilteredTasks(filtered)
  }

  function isOverdue(task: Task): boolean {
    if (['completed', 'cancelled'].includes(task.status)) return false
    if (!task.deadline) return false
    return new Date(task.deadline) < new Date()
  }

  function getTimeRemaining(deadline: string): string {
    const now = new Date()
    const dl = new Date(deadline)
    const diff = dl.getTime() - now.getTime()

    if (diff < 0) {
      const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60))
      const days = Math.floor(hours / 24)
      if (days > 0) {
        return locale === 'ar' ? `متأخرة بـ ${days} يوم` : `${days} days overdue`
      }
      return locale === 'ar' ? `متأخرة بـ ${hours} ساعة` : `${hours} hours overdue`
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return locale === 'ar' ? `متبقي ${days} يوم` : `${days} days remaining`
    }
    return locale === 'ar' ? `متبقي ${hours} ساعة` : `${hours} hours remaining`
  }

  async function handleCreateTask() {
    if (!formData.title || !formData.assigned_to) {
      setFormError(locale === 'ar' ? 'العنوان والمشرف مطلوبان' : 'Title and assignee are required')
      return
    }

    setFormLoading(true)
    setFormError('')
    const supabase = createClient()

    const { error } = await supabase
      .from('admin_tasks')
      .insert({
        title: formData.title,
        description: formData.description || null,
        type: formData.type,
        priority: formData.priority,
        created_by: currentAdminId,
        assigned_to: formData.assigned_to,
        deadline: formData.deadline || null,
        requires_approval: formData.requires_approval,
        auto_escalate: formData.auto_escalate,
        status: 'new',
        progress_percentage: 0,
      })

    if (error) {
      console.error('Error creating task:', error)
      setFormError(locale === 'ar' ? 'حدث خطأ أثناء إنشاء المهمة' : 'Error creating task')
      setFormLoading(false)
      return
    }

    await loadTasks(supabase)
    setShowCreateModal(false)
    setFormData({
      title: '',
      description: '',
      type: 'other',
      priority: 'medium',
      assigned_to: '',
      deadline: '',
      requires_approval: false,
      auto_escalate: false,
    })
    setFormLoading(false)
  }

  async function handleAcceptTask(task: Task) {
    setFormLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('admin_tasks')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (!error) {
      // Log the task update
      await supabase
        .from('task_updates')
        .insert({
          task_id: task.id,
          admin_id: currentAdminId,
          update_type: 'status_change',
          new_status: 'accepted',
          comment: locale === 'ar' ? 'تم قبول المهمة' : 'Task accepted',
        })

      await loadTasks(supabase)
    }
    setFormLoading(false)
  }

  function openUpdateModal(task: Task) {
    setSelectedTask(task)
    setUpdateData({
      status: task.status,
      progress_percentage: task.progress_percentage,
      comment: '',
    })
    setShowUpdateModal(true)
  }

  async function handleUpdateTask() {
    if (!selectedTask) return

    setFormLoading(true)
    setFormError('')
    const supabase = createClient()

    const updates: any = {}

    if (updateData.status && updateData.status !== selectedTask.status) {
      updates.status = updateData.status
      if (updateData.status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
    }

    if (updateData.progress_percentage !== selectedTask.progress_percentage) {
      updates.progress_percentage = updateData.progress_percentage
      // Auto-update status based on progress
      if (updateData.progress_percentage > 0 && updateData.progress_percentage < 100 && selectedTask.status === 'accepted') {
        updates.status = 'in_progress'
      } else if (updateData.progress_percentage === 100) {
        updates.status = 'completed'
        updates.completed_at = new Date().toISOString()
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('admin_tasks')
        .update(updates)
        .eq('id', selectedTask.id)

      if (error) {
        console.error('Error updating task:', error)
        setFormError(locale === 'ar' ? 'حدث خطأ أثناء تحديث المهمة' : 'Error updating task')
        setFormLoading(false)
        return
      }

      // Log the update
      await supabase
        .from('task_updates')
        .insert({
          task_id: selectedTask.id,
          admin_id: currentAdminId,
          update_type: updateData.status !== selectedTask.status ? 'status_change' : 'progress',
          new_status: updates.status || null,
          progress_percentage: updateData.progress_percentage,
          comment: updateData.comment || null,
        })

      await loadTasks(supabase)
    }

    setShowUpdateModal(false)
    setSelectedTask(null)
    setFormLoading(false)
  }

  async function handleStartTask(task: Task) {
    setFormLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('admin_tasks')
      .update({
        status: 'in_progress',
        progress_percentage: task.progress_percentage > 0 ? task.progress_percentage : 10,
      })
      .eq('id', task.id)

    if (!error) {
      await supabase
        .from('task_updates')
        .insert({
          task_id: task.id,
          admin_id: currentAdminId,
          update_type: 'status_change',
          new_status: 'in_progress',
          comment: locale === 'ar' ? 'بدأ العمل على المهمة' : 'Started working on task',
        })

      await loadTasks(supabase)
    }
    setFormLoading(false)
  }

  async function handleCompleteTask(task: Task) {
    setFormLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('admin_tasks')
      .update({
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id)

    if (!error) {
      await supabase
        .from('task_updates')
        .insert({
          task_id: task.id,
          admin_id: currentAdminId,
          update_type: 'status_change',
          new_status: 'completed',
          progress_percentage: 100,
          comment: locale === 'ar' ? 'تم إكمال المهمة' : 'Task completed',
        })

      await loadTasks(supabase)
    }
    setFormLoading(false)
  }

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
        </div>
      </>
    )
  }

  if (!user || !isAdmin) {
    return (
      <>
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'إدارة المهام' : 'Tasks Management'}
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
        title={locale === 'ar' ? 'إدارة المهام' : 'Tasks Management'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <ClipboardList className="w-5 h-5 text-slate-600" />
                <span className="text-sm text-slate-600">{locale === 'ar' ? 'الإجمالي' : 'Total'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total, locale)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <Play className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-700">{locale === 'ar' ? 'نشطة' : 'Active'}</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{formatNumber(stats.active, locale)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-3 mb-2">
                <Pause className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-orange-700">{locale === 'ar' ? 'معلقة' : 'Pending'}</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">{formatNumber(stats.pending, locale)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">{locale === 'ar' ? 'مكتملة اليوم' : 'Completed Today'}</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{formatNumber(stats.completedToday, locale)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-700">{locale === 'ar' ? 'متأخرة' : 'Overdue'}</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{formatNumber(stats.overdue, locale)}</p>
            </div>
          </div>

          {/* View Toggle & Filters */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
            {/* View Toggle */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={viewMode === 'all' ? 'default' : 'outline'}
                onClick={() => setViewMode('all')}
                className={viewMode === 'all' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {locale === 'ar' ? 'كل المهام' : 'All Tasks'}
              </Button>
              <Button
                variant={viewMode === 'my' ? 'default' : 'outline'}
                onClick={() => setViewMode('my')}
                className={viewMode === 'my' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {locale === 'ar' ? 'مهامي' : 'My Tasks'}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                <input
                  type="text"
                  placeholder={locale === 'ar' ? 'بحث بالعنوان أو الرقم...' : 'Search by title or number...'}
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
                <option value="new">{locale === 'ar' ? 'جديدة' : 'New'}</option>
                <option value="accepted">{locale === 'ar' ? 'تم القبول' : 'Accepted'}</option>
                <option value="in_progress">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                <option value="pending">{locale === 'ar' ? 'معلقة' : 'Pending'}</option>
                <option value="completed">{locale === 'ar' ? 'مكتملة' : 'Completed'}</option>
                <option value="cancelled">{locale === 'ar' ? 'ملغاة' : 'Cancelled'}</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as FilterPriority)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{locale === 'ar' ? 'كل الأولويات' : 'All Priorities'}</option>
                <option value="urgent">{locale === 'ar' ? 'عاجلة' : 'Urgent'}</option>
                <option value="high">{locale === 'ar' ? 'عالية' : 'High'}</option>
                <option value="medium">{locale === 'ar' ? 'متوسطة' : 'Medium'}</option>
                <option value="low">{locale === 'ar' ? 'منخفضة' : 'Low'}</option>
              </select>

              <Button
                variant="outline"
                onClick={() => {
                  const supabase = createClient()
                  loadTasks(supabase)
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>

              {isSuperAdmin && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-4 h-4" />
                  {locale === 'ar' ? 'مهمة جديدة' : 'New Task'}
                </Button>
              )}
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const StatusIcon = statusConfig[task.status]?.icon || Clock
                const overdue = isOverdue(task)

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-xl border shadow-sm overflow-hidden ${overdue ? 'border-red-300' : 'border-slate-200'}`}
                  >
                    {/* Task Header */}
                    <div className="p-4 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-mono text-slate-500">#{task.task_number}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[task.priority]?.color}`}>
                              {priorityConfig[task.priority]?.label[locale === 'ar' ? 'ar' : 'en']}
                            </span>
                            {overdue && (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {locale === 'ar' ? 'متأخرة' : 'Overdue'}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[task.status]?.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig[task.status]?.label[locale === 'ar' ? 'ar' : 'en']}
                        </span>
                      </div>
                    </div>

                    {/* Task Details */}
                    <div className="p-4 bg-slate-50">
                      <div className="flex flex-wrap gap-4 text-sm">
                        {task.assignee && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <UserIcon className="w-4 h-4 text-slate-400" />
                            <span>{locale === 'ar' ? 'مُسندة إلى:' : 'Assigned to:'}</span>
                            <span className="font-medium text-slate-900">{task.assignee.full_name}</span>
                          </div>
                        )}
                        {task.deadline && (
                          <div className={`flex items-center gap-2 ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                            <Calendar className="w-4 h-4" />
                            <span>{locale === 'ar' ? 'الموعد:' : 'Due:'}</span>
                            <span className="font-medium">{formatDate(task.deadline, locale)}</span>
                            <span className="text-xs">({getTimeRemaining(task.deadline)})</span>
                          </div>
                        )}
                        {task.type && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Tag className="w-4 h-4 text-slate-400" />
                            <span>{typeConfig[task.type]?.label[locale === 'ar' ? 'ar' : 'en']}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      {task.status === 'in_progress' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-500">{locale === 'ar' ? 'التقدم' : 'Progress'}</span>
                            <span className="text-xs font-medium text-slate-700">{task.progress_percentage}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${task.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        <Link href={`/${locale}/admin/tasks/${task.id}`}>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            {locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                          </Button>
                        </Link>

                        {/* Accept Task - only for new tasks assigned to current user */}
                        {task.status === 'new' && task.assigned_to === currentAdminId && (
                          <Button
                            size="sm"
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                            onClick={() => handleAcceptTask(task)}
                            disabled={formLoading}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {locale === 'ar' ? 'قبول المهمة' : 'Accept Task'}
                          </Button>
                        )}

                        {/* Start Task - for accepted tasks */}
                        {task.status === 'accepted' && task.assigned_to === currentAdminId && (
                          <Button
                            size="sm"
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleStartTask(task)}
                            disabled={formLoading}
                          >
                            <Play className="w-4 h-4" />
                            {locale === 'ar' ? 'بدء العمل' : 'Start Work'}
                          </Button>
                        )}

                        {/* Update Progress - for in-progress tasks */}
                        {task.status === 'in_progress' && task.assigned_to === currentAdminId && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-2"
                              onClick={() => openUpdateModal(task)}
                            >
                              <RefreshCw className="w-4 h-4" />
                              {locale === 'ar' ? 'تحديث التقدم' : 'Update Progress'}
                            </Button>
                            <Button
                              size="sm"
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                              onClick={() => handleCompleteTask(task)}
                              disabled={formLoading}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {locale === 'ar' ? 'إكمال' : 'Complete'}
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
                <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">
                  {locale === 'ar' ? 'لا توجد مهام مطابقة' : 'No matching tasks found'}
                </p>
              </div>
            )}
          </div>
        </main>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'إنشاء مهمة جديدة' : 'Create New Task'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
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
                  placeholder={locale === 'ar' ? 'عنوان المهمة' : 'Task title'}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={locale === 'ar' ? 'وصف تفصيلي للمهمة' : 'Detailed task description'}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'النوع' : 'Type'}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskType })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    {Object.entries(typeConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label[locale === 'ar' ? 'ar' : 'en']}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'الأولوية' : 'Priority'}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label[locale === 'ar' ? 'ar' : 'en']}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'تعيين إلى' : 'Assign To'} *
                </label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">{locale === 'ar' ? 'اختر المشرف' : 'Select supervisor'}</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || s.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'الموعد النهائي' : 'Deadline'}
                </label>
                <input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.requires_approval}
                    onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700">
                    {locale === 'ar' ? 'يتطلب موافقة المدير على النتيجة' : 'Requires manager approval on completion'}
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.auto_escalate}
                    onChange={(e) => setFormData({ ...formData, auto_escalate: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700">
                    {locale === 'ar' ? 'تصعيد تلقائي عند التأخر' : 'Auto-escalate when overdue'}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleCreateTask}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'إرسال' : 'Send'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Update Task Modal */}
      {showUpdateModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'تحديث المهمة' : 'Update Task'}
              </h2>
              <button
                onClick={() => { setShowUpdateModal(false); setSelectedTask(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">#{selectedTask.task_number}</p>
              <p className="font-medium text-slate-900">{selectedTask.title}</p>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Progress Slider */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'نسبة الإنجاز' : 'Progress'}: {updateData.progress_percentage}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={updateData.progress_percentage}
                  onChange={(e) => setUpdateData({ ...updateData, progress_percentage: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Status Change */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'تغيير الحالة' : 'Change Status'}
                </label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData({ ...updateData, status: e.target.value as TaskStatus })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="in_progress">{locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
                  <option value="pending">{locale === 'ar' ? 'في انتظار' : 'Pending'}</option>
                  <option value="completed">{locale === 'ar' ? 'مكتملة' : 'Completed'}</option>
                </select>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'تعليق (اختياري)' : 'Comment (optional)'}
                </label>
                <textarea
                  value={updateData.comment}
                  onChange={(e) => setUpdateData({ ...updateData, comment: e.target.value })}
                  placeholder={locale === 'ar' ? 'أضف تعليقاً على التحديث...' : 'Add a comment about this update...'}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowUpdateModal(false); setSelectedTask(null); }}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleUpdateTask}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'حفظ التحديث' : 'Save Update'}
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
