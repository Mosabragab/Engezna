'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { formatDate } from '@/lib/utils/formatters';
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  Calendar,
  User as UserIcon,
  Tag,
  RefreshCw,
  Send,
  Save,
  X,
  MessageSquare,
  Bell,
  FileText,
} from 'lucide-react';

type TaskStatus = 'new' | 'accepted' | 'in_progress' | 'pending' | 'completed' | 'cancelled';
type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
type TaskType =
  | 'provider_review'
  | 'dispute'
  | 'support'
  | 'report'
  | 'financial'
  | 'investigation'
  | 'other';

interface TaskUpdate {
  id: string;
  admin_id: string | null;
  update_type: string;
  old_status: TaskStatus | null;
  new_status: TaskStatus | null;
  progress_percentage: number | null;
  comment: string | null;
  created_at: string;
  adminName?: string | null;
}

const statusConfig: Record<
  TaskStatus,
  { label: { ar: string; en: string }; color: string; icon: React.ElementType }
> = {
  new: { label: { ar: 'جديدة', en: 'New' }, color: 'bg-blue-100 text-blue-700', icon: Clock },
  accepted: {
    label: { ar: 'تم القبول', en: 'Accepted' },
    color: 'bg-cyan-100 text-cyan-700',
    icon: CheckCircle2,
  },
  in_progress: {
    label: { ar: 'قيد التنفيذ', en: 'In Progress' },
    color: 'bg-yellow-100 text-yellow-700',
    icon: Play,
  },
  pending: {
    label: { ar: 'في انتظار', en: 'Pending' },
    color: 'bg-orange-100 text-orange-700',
    icon: Pause,
  },
  completed: {
    label: { ar: 'مكتملة', en: 'Completed' },
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  cancelled: {
    label: { ar: 'ملغاة', en: 'Cancelled' },
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
};

const priorityConfig: Record<TaskPriority, { label: { ar: string; en: string }; color: string }> = {
  urgent: { label: { ar: 'عاجلة', en: 'Urgent' }, color: 'bg-red-500 text-white' },
  high: { label: { ar: 'عالية', en: 'High' }, color: 'bg-orange-500 text-white' },
  medium: { label: { ar: 'متوسطة', en: 'Medium' }, color: 'bg-yellow-500 text-white' },
  low: { label: { ar: 'منخفضة', en: 'Low' }, color: 'bg-green-500 text-white' },
};

const typeConfig: Record<TaskType, { label: { ar: string; en: string } }> = {
  provider_review: { label: { ar: 'مراجعة متاجر', en: 'Provider Review' } },
  dispute: { label: { ar: 'حل نزاعات', en: 'Dispute Resolution' } },
  support: { label: { ar: 'دعم فني', en: 'Support' } },
  report: { label: { ar: 'تقارير', en: 'Reports' } },
  financial: { label: { ar: 'مالية', en: 'Financial' } },
  investigation: { label: { ar: 'تحقيق', en: 'Investigation' } },
  other: { label: { ar: 'أخرى', en: 'Other' } },
};

export default function TaskDetailPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [task, setTask] = useState<any>(null);
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [creator, setCreator] = useState<{ full_name: string | null; email: string | null } | null>(
    null
  );
  const [assignee, setAssignee] = useState<{
    full_name: string | null;
    email: string | null;
  } | null>(null);
  const [ccUsers, setCcUsers] = useState<{ id: string; full_name: string | null }[]>([]);

  // Update form
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus | ''>('');
  const [newProgress, setNewProgress] = useState(0);
  const [formLoading, setFormLoading] = useState(false);

  const loadAdminProfile = useCallback(
    async (supabase: ReturnType<typeof createClient>, adminId: string) => {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('id', adminId)
        .single();
      if (adminUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', adminUser.user_id)
          .single();
        return profile;
      }
      return null;
    },
    []
  );

  const loadTask = useCallback(
    async (supabase: ReturnType<typeof createClient>) => {
      const { data: taskData, error } = await supabase
        .from('admin_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error || !taskData) return;

      setTask(taskData);
      setNewStatus(taskData.status);
      setNewProgress(taskData.progress_percentage);

      // Load creator/assignee profiles
      if (taskData.created_by) {
        const profile = await loadAdminProfile(supabase, taskData.created_by);
        setCreator(profile);
      }
      if (taskData.assigned_to) {
        const profile = await loadAdminProfile(supabase, taskData.assigned_to);
        setAssignee(profile);
      }

      // Load CC users
      if (taskData.cc_to && Array.isArray(taskData.cc_to) && taskData.cc_to.length > 0) {
        const ccList: { id: string; full_name: string | null }[] = [];
        for (const ccId of taskData.cc_to) {
          const profile = await loadAdminProfile(supabase, ccId);
          ccList.push({ id: ccId, full_name: profile?.full_name || null });
        }
        setCcUsers(ccList);
      }

      // Load task updates
      const { data: updatesData } = await supabase
        .from('task_updates')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (updatesData) {
        // Load admin names for updates
        const adminIds = [
          ...new Set(updatesData.filter((u) => u.admin_id).map((u) => u.admin_id!)),
        ];
        const nameMap = new Map<string, string>();

        if (adminIds.length > 0) {
          const { data: adminUsers } = await supabase
            .from('admin_users')
            .select('id, user_id')
            .in('id', adminIds);

          if (adminUsers) {
            const userIds = adminUsers.map((a) => a.user_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', userIds);
            if (profiles) {
              const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]));
              for (const admin of adminUsers) {
                const name = profileMap.get(admin.user_id);
                if (name) nameMap.set(admin.id, name);
              }
            }
          }
        }

        setUpdates(
          updatesData.map((u) => ({
            ...u,
            adminName: u.admin_id ? nameMap.get(u.admin_id) || null : null,
          }))
        );
      }
    },
    [taskId, loadAdminProfile]
  );

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          setIsAdmin(true);
          const { data: adminUser } = await supabase
            .from('admin_users')
            .select('id, role')
            .eq('user_id', user.id)
            .single();

          if (adminUser) {
            setCurrentAdminId(adminUser.id);
            if (adminUser.role === 'super_admin') setIsSuperAdmin(true);
          }

          await loadTask(supabase);
        }
      }
      setLoading(false);
    }
    init();
  }, [loadTask]);

  function isOverdue(): boolean {
    if (!task) return false;
    if (['completed', 'cancelled'].includes(task.status)) return false;
    if (!task.deadline) return false;
    return new Date(task.deadline) < new Date();
  }

  function getTimeRemaining(deadline: string): string {
    const now = new Date();
    const dl = new Date(deadline);
    const diff = dl.getTime() - now.getTime();

    if (diff < 0) {
      const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (days > 0) return locale === 'ar' ? `متأخرة بـ ${days} يوم` : `${days} days overdue`;
      return locale === 'ar' ? `متأخرة بـ ${hours} ساعة` : `${hours} hours overdue`;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return locale === 'ar' ? `متبقي ${days} يوم` : `${days} days remaining`;
    return locale === 'ar' ? `متبقي ${hours} ساعة` : `${hours} hours remaining`;
  }

  const canEditTask = task && (task.assigned_to === currentAdminId || isSuperAdmin);

  async function handleUpdate() {
    if (!task) return;
    setFormLoading(true);
    const supabase = createClient();

    const updates: Record<string, unknown> = {};
    if (newStatus && newStatus !== task.status) {
      updates.status = newStatus;
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      if (newStatus === 'accepted') updates.accepted_at = new Date().toISOString();
    }
    if (newProgress !== task.progress_percentage) {
      updates.progress_percentage = newProgress;
      if (newProgress === 100 && task.status !== 'completed') {
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
      }
    }

    if (Object.keys(updates).length > 0 || comment.trim()) {
      if (Object.keys(updates).length > 0) {
        await supabase.from('admin_tasks').update(updates).eq('id', task.id);
      }

      await supabase.from('task_updates').insert({
        task_id: task.id,
        admin_id: currentAdminId,
        update_type:
          newStatus !== task.status ? 'status_change' : comment.trim() ? 'comment' : 'progress',
        old_status: task.status,
        new_status: (updates.status as TaskStatus) || null,
        progress_percentage: newProgress,
        comment: comment.trim() || null,
      });

      setComment('');
      await loadTask(supabase);
    }
    setFormLoading(false);
  }

  async function handleAcceptTask() {
    if (!task) return;
    setFormLoading(true);
    const supabase = createClient();

    await supabase
      .from('admin_tasks')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', task.id);

    await supabase.from('task_updates').insert({
      task_id: task.id,
      admin_id: currentAdminId,
      update_type: 'status_change',
      new_status: 'accepted',
      comment: locale === 'ar' ? 'تم قبول المهمة' : 'Task accepted',
    });

    await loadTask(supabase);
    setFormLoading(false);
  }

  async function handleStartTask() {
    if (!task) return;
    setFormLoading(true);
    const supabase = createClient();

    await supabase
      .from('admin_tasks')
      .update({
        status: 'in_progress',
        progress_percentage: task.progress_percentage > 0 ? task.progress_percentage : 10,
      })
      .eq('id', task.id);

    await supabase.from('task_updates').insert({
      task_id: task.id,
      admin_id: currentAdminId,
      update_type: 'status_change',
      new_status: 'in_progress',
      comment: locale === 'ar' ? 'بدأ العمل على المهمة' : 'Started working on task',
    });

    await loadTask(supabase);
    setFormLoading(false);
  }

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'تفاصيل المهمة' : 'Task Details'}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <Link href={`/${locale}/auth/login`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!task) {
    return (
      <>
        <AdminHeader
          user={user}
          title={locale === 'ar' ? 'تفاصيل المهمة' : 'Task Details'}
          onMenuClick={toggleSidebar}
        />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'المهمة غير موجودة' : 'Task not found'}
            </h2>
            <Link href={`/${locale}/admin/tasks`}>
              <Button className="bg-primary hover:bg-primary/90 mt-4">
                <BackArrow className="w-4 h-4 me-2" />
                {locale === 'ar' ? 'العودة للمهام' : 'Back to Tasks'}
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const StatusIcon = statusConfig[task.status as TaskStatus]?.icon || Clock;
  const overdue = isOverdue();

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'تفاصيل المهمة' : 'Task Details'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Back Button */}
        <Link
          href={`/${locale}/admin/tasks`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary mb-4"
        >
          <BackArrow className="w-4 h-4" />
          {locale === 'ar' ? 'العودة لقائمة المهام' : 'Back to Tasks'}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Header */}
            <div
              className={`bg-white rounded-xl border shadow-sm p-6 ${overdue ? 'border-red-300' : 'border-slate-200'}`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-slate-500">#{task.task_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[task.priority as TaskPriority]?.color}`}
                    >
                      {
                        priorityConfig[task.priority as TaskPriority]?.label[
                          locale === 'ar' ? 'ar' : 'en'
                        ]
                      }
                    </span>
                    {overdue && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {locale === 'ar' ? 'متأخرة' : 'Overdue'}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">{task.title}</h1>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[task.status as TaskStatus]?.color}`}
                >
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig[task.status as TaskStatus]?.label[locale === 'ar' ? 'ar' : 'en']}
                </span>
              </div>

              {task.description && (
                <p className="text-slate-600 whitespace-pre-wrap">{task.description}</p>
              )}

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">
                    {locale === 'ar' ? 'التقدم' : 'Progress'}
                  </span>
                  <span className="text-xs font-medium text-slate-700">
                    {task.progress_percentage}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${task.progress_percentage}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              {canEditTask && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                  {task.status === 'new' && task.assigned_to === currentAdminId && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleAcceptTask}
                      disabled={formLoading}
                    >
                      <CheckCircle2 className="w-4 h-4 me-2" />
                      {locale === 'ar' ? 'قبول المهمة' : 'Accept Task'}
                    </Button>
                  )}
                  {task.status === 'accepted' && task.assigned_to === currentAdminId && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleStartTask}
                      disabled={formLoading}
                    >
                      <Play className="w-4 h-4 me-2" />
                      {locale === 'ar' ? 'بدء العمل' : 'Start Work'}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Update Form */}
            {canEditTask && !['completed', 'cancelled'].includes(task.status) && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  {locale === 'ar' ? 'تحديث المهمة' : 'Update Task'}
                </h2>

                <div className="space-y-4">
                  {/* Progress Slider */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'نسبة الإنجاز' : 'Progress'}: {newProgress}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={newProgress}
                      onChange={(e) => setNewProgress(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'تغيير الحالة' : 'Change Status'}
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                    >
                      <option value="in_progress">
                        {locale === 'ar' ? 'قيد التنفيذ' : 'In Progress'}
                      </option>
                      <option value="pending">{locale === 'ar' ? 'في انتظار' : 'Pending'}</option>
                      <option value="completed">{locale === 'ar' ? 'مكتملة' : 'Completed'}</option>
                    </select>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'تعليق' : 'Comment'}
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={locale === 'ar' ? 'أضف تعليقاً...' : 'Add a comment...'}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <Button
                    onClick={handleUpdate}
                    className="bg-primary hover:bg-primary/90"
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
            )}

            {/* Updates History */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                <MessageSquare className="w-5 h-5 inline me-2 text-slate-400" />
                {locale === 'ar' ? 'سجل التحديثات' : 'Update History'}
              </h2>

              {updates.length > 0 ? (
                <div className="space-y-4">
                  {updates.map((update) => (
                    <div
                      key={update.id}
                      className="flex gap-3 pb-4 border-b border-slate-100 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <UserIcon className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-900">
                            {update.adminName || (locale === 'ar' ? 'مشرف' : 'Admin')}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDate(update.created_at, locale)}
                          </span>
                        </div>

                        {update.update_type === 'status_change' && update.new_status && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">
                              {locale === 'ar' ? 'غيّر الحالة إلى' : 'Changed status to'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig[update.new_status]?.color}`}
                            >
                              {
                                statusConfig[update.new_status]?.label[
                                  locale === 'ar' ? 'ar' : 'en'
                                ]
                              }
                            </span>
                          </div>
                        )}

                        {update.progress_percentage !== null &&
                          update.update_type === 'progress' && (
                            <p className="text-sm text-slate-600">
                              {locale === 'ar'
                                ? `حدّث التقدم إلى ${update.progress_percentage}%`
                                : `Updated progress to ${update.progress_percentage}%`}
                            </p>
                          )}

                        {update.comment && (
                          <p className="text-sm text-slate-700 mt-1 bg-slate-50 p-2 rounded-lg">
                            {update.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  {locale === 'ar' ? 'لا توجد تحديثات بعد' : 'No updates yet'}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Task Info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                {locale === 'ar' ? 'تفاصيل المهمة' : 'Task Info'}
              </h3>

              <div className="space-y-3">
                {/* Type */}
                {task.type && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">{locale === 'ar' ? 'النوع:' : 'Type:'}</span>
                    <span className="font-medium text-slate-900">
                      {typeConfig[task.type as TaskType]?.label[locale === 'ar' ? 'ar' : 'en']}
                    </span>
                  </div>
                )}

                {/* Creator */}
                {creator && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">
                      {locale === 'ar' ? 'أنشأها:' : 'Created by:'}
                    </span>
                    <span className="font-medium text-slate-900">{creator.full_name}</span>
                  </div>
                )}

                {/* Assignee */}
                {assignee && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="w-4 h-4 text-primary" />
                    <span className="text-slate-500">
                      {locale === 'ar' ? 'مُسندة إلى:' : 'Assigned to:'}
                    </span>
                    <span className="font-medium text-slate-900">{assignee.full_name}</span>
                  </div>
                )}

                {/* CC Users */}
                {ccUsers.length > 0 && (
                  <div className="flex items-start gap-2 text-sm">
                    <Bell className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span className="text-slate-500">{locale === 'ar' ? 'نسخة إلى:' : 'CC:'}</span>
                    <div className="flex flex-wrap gap-1">
                      {ccUsers.map((u) => (
                        <span
                          key={u.id}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                        >
                          {u.full_name || u.id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deadline */}
                {task.deadline && (
                  <div
                    className={`flex items-center gap-2 text-sm ${overdue ? 'text-red-600' : ''}`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span className={overdue ? 'text-red-500' : 'text-slate-500'}>
                      {locale === 'ar' ? 'الموعد:' : 'Due:'}
                    </span>
                    <div>
                      <span className="font-medium">{formatDate(task.deadline, locale)}</span>
                      <p className="text-xs mt-0.5">{getTimeRemaining(task.deadline)}</p>
                    </div>
                  </div>
                )}

                {/* Options */}
                {task.requires_approval && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{locale === 'ar' ? 'يتطلب موافقة المدير' : 'Requires approval'}</span>
                  </div>
                )}
                {task.auto_escalate && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      {locale === 'ar' ? 'تصعيد تلقائي عند التأخر' : 'Auto-escalate on overdue'}
                    </span>
                  </div>
                )}

                {/* Dates */}
                <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{locale === 'ar' ? 'أنشئت:' : 'Created:'}</span>
                    <span>{formatDate(task.created_at, locale)}</span>
                  </div>
                  {task.accepted_at && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{locale === 'ar' ? 'قُبلت:' : 'Accepted:'}</span>
                      <span>{formatDate(task.accepted_at, locale)}</span>
                    </div>
                  )}
                  {task.completed_at && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{locale === 'ar' ? 'اكتملت:' : 'Completed:'}</span>
                      <span>{formatDate(task.completed_at, locale)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
