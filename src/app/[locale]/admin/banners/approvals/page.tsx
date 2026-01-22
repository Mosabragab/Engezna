'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { formatDate } from '@/lib/utils/formatters';
import {
  Shield,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Store,
  Timer,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Ban,
  Check,
  X,
  User as UserIcon,
  Calendar,
  Megaphone,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


type DurationType = '1_day' | '3_days' | '1_week' | '1_month';

interface PendingBanner {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  gradient_start: string;
  gradient_end: string;
  badge_text_ar: string | null;
  badge_text_en: string | null;
  cta_text_ar: string | null;
  cta_text_en: string | null;
  starts_at: string;
  ends_at: string | null;
  duration_type: DurationType;
  submitted_at: string;
  provider_id: string;
  provider_name_ar: string;
  provider_name_en: string;
  provider_logo: string | null;
  governorate_name_ar: string;
  governorate_name_en: string;
  city_name_ar: string | null;
  city_name_en: string | null;
}

const DURATION_LABELS: Record<DurationType, { ar: string; en: string }> = {
  '1_day': { ar: 'يوم واحد', en: '1 Day' },
  '3_days': { ar: '3 أيام', en: '3 Days' },
  '1_week': { ar: 'أسبوع', en: '1 Week' },
  '1_month': { ar: 'شهر', en: '1 Month' },
};

export default function AdminBannerApprovalsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingBanners, setPendingBanners] = useState<PendingBanner[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedBanner, setExpandedBanner] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
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
        await loadPendingBanners();
      }
    }

    setLoading(false);
  }

  async function loadPendingBanners() {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('get_pending_banners_for_approval');

    if (error) {
      console.error('Error loading pending banners:', error);
      setPendingBanners([]);
      return;
    }

    setPendingBanners(data || []);
  }

  async function handleApprove(bannerId: string) {
    setActionLoading(bannerId);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('homepage_banners')
        .update({
          approval_status: 'approved',
          is_active: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', bannerId);

      if (error) throw error;

      setSuccessMessage(locale === 'ar' ? 'تم قبول البانر بنجاح' : 'Banner approved successfully');
      await loadPendingBanners();
    } catch (error) {
      console.error('Error approving banner:', error);
      alert(locale === 'ar' ? 'حدث خطأ أثناء قبول البانر' : 'Error approving banner');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }

  async function handleReject(bannerId: string) {
    if (!rejectReason.trim()) {
      alert(locale === 'ar' ? 'يرجى إدخال سبب الرفض' : 'Please enter rejection reason');
      return;
    }

    setActionLoading(bannerId);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('homepage_banners')
        .update({
          approval_status: 'rejected',
          is_active: false,
          rejection_reason: rejectReason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', bannerId);

      if (error) throw error;

      setSuccessMessage(locale === 'ar' ? 'تم رفض البانر' : 'Banner rejected');
      setShowRejectModal(null);
      setRejectReason('');
      await loadPendingBanners();
    } catch (error) {
      console.error('Error rejecting banner:', error);
      alert(locale === 'ar' ? 'حدث خطأ أثناء رفض البانر' : 'Error rejecting banner');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }

  async function handleCancel(bannerId: string) {
    if (!cancelReason.trim()) {
      alert(locale === 'ar' ? 'يرجى إدخال سبب الإلغاء' : 'Please enter cancellation reason');
      return;
    }

    setActionLoading(bannerId);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('homepage_banners')
        .update({
          approval_status: 'cancelled',
          is_active: false,
          rejection_reason: cancelReason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', bannerId);

      if (error) throw error;

      setSuccessMessage(locale === 'ar' ? 'تم إلغاء البانر' : 'Banner cancelled');
      setShowCancelModal(null);
      setCancelReason('');
      await loadPendingBanners();
    } catch (error) {
      console.error('Error cancelling banner:', error);
      alert(locale === 'ar' ? 'حدث خطأ أثناء إلغاء البانر' : 'Error cancelling banner');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'موافقات البانرات' : 'Banner Approvals'}
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
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'موافقات البانرات' : 'Banner Approvals'}
        onMenuClick={toggleSidebar}
      />

      {/* Success Notification */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            href={`/${locale}/admin/banners`}
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {locale === 'ar' ? 'العودة لإدارة البانرات' : 'Back to Banner Management'}
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'طلبات الموافقة على البانرات' : 'Banner Approval Requests'}
              </h1>
              <p className="text-sm text-slate-500">
                {pendingBanners.length > 0
                  ? locale === 'ar'
                    ? `${pendingBanners.length} طلب في انتظار المراجعة`
                    : `${pendingBanners.length} request(s) pending review`
                  : locale === 'ar'
                    ? 'لا توجد طلبات معلقة'
                    : 'No pending requests'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => loadPendingBanners()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {locale === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Pending Banners List */}
        {pendingBanners.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {locale === 'ar' ? 'لا توجد طلبات معلقة' : 'No Pending Requests'}
            </h3>
            <p className="text-slate-500">
              {locale === 'ar'
                ? 'جميع طلبات البانرات تم مراجعتها'
                : 'All banner requests have been reviewed'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingBanners.map((banner) => (
              <div
                key={banner.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
              >
                {/* Banner Header */}
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    {/* Provider Info */}
                    <div className="flex items-center gap-3">
                      {banner.provider_logo ? (
                        <img
                          src={banner.provider_logo}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Store className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {locale === 'ar' ? banner.provider_name_ar : banner.provider_name_en}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="w-3.5 h-3.5" />
                          {locale === 'ar'
                            ? `${banner.city_name_ar || banner.governorate_name_ar}${banner.city_name_ar ? ` - ${banner.governorate_name_ar}` : ''}`
                            : `${banner.city_name_en || banner.governorate_name_en}${banner.city_name_en ? ` - ${banner.governorate_name_en}` : ''}`}
                        </div>
                      </div>
                    </div>

                    {/* Submitted Time */}
                    <div className="text-end">
                      <span className="text-xs text-slate-400">
                        {locale === 'ar' ? 'تم الإرسال' : 'Submitted'}
                      </span>
                      <p className="text-sm text-slate-600">
                        {formatDateTime(banner.submitted_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Banner Preview */}
                <div className="p-4 bg-slate-50">
                  <div
                    className="relative overflow-hidden rounded-xl aspect-[16/9] max-w-md mx-auto"
                    style={{
                      background: `linear-gradient(135deg, ${banner.gradient_start} 0%, ${banner.gradient_end} 100%)`,
                    }}
                  >
                    <div className="absolute -top-10 -end-10 w-32 h-32 bg-white/10 rounded-full blur-sm" />
                    <div className="absolute -bottom-6 -start-6 w-24 h-24 bg-white/10 rounded-full blur-sm" />

                    <div className="relative z-10 h-full p-4 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        {banner.badge_text_ar && (
                          <div className="inline-block mb-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg px-2.5 py-1">
                            <span className="text-white font-bold text-xs">
                              {locale === 'ar' ? banner.badge_text_ar : banner.badge_text_en}
                            </span>
                          </div>
                        )}
                        <h3 className="text-white font-bold text-base mb-1">
                          {locale === 'ar' ? banner.title_ar : banner.title_en}
                        </h3>
                        {banner.description_ar && (
                          <p className="text-white/85 text-xs mb-2 line-clamp-2">
                            {locale === 'ar' ? banner.description_ar : banner.description_en}
                          </p>
                        )}
                        {banner.cta_text_ar && (
                          <button className="bg-white text-slate-900 font-semibold px-3 py-1.5 rounded-lg text-xs">
                            {locale === 'ar' ? banner.cta_text_ar : banner.cta_text_en}
                          </button>
                        )}
                      </div>

                      {banner.image_url && (
                        <div className="w-20 h-20 flex-shrink-0">
                          <img
                            src={banner.image_url}
                            alt=""
                            className="w-full h-full object-contain drop-shadow-xl"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Banner Details (Expandable) */}
                <div className="border-t border-slate-100">
                  <button
                    onClick={() =>
                      setExpandedBanner(expandedBanner === banner.id ? null : banner.id)
                    }
                    className="w-full p-3 flex items-center justify-center gap-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${expandedBanner === banner.id ? 'rotate-180' : ''}`}
                    />
                    {expandedBanner === banner.id
                      ? locale === 'ar'
                        ? 'إخفاء التفاصيل'
                        : 'Hide Details'
                      : locale === 'ar'
                        ? 'عرض التفاصيل'
                        : 'Show Details'}
                  </button>

                  <AnimatePresence>
                    {expandedBanner === banner.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400 block mb-1">
                              {locale === 'ar' ? 'تاريخ البداية' : 'Start Date'}
                            </span>
                            <span className="text-slate-700 font-medium flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {formatDateOnly(banner.starts_at)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-1">
                              {locale === 'ar' ? 'تاريخ النهاية' : 'End Date'}
                            </span>
                            <span className="text-slate-700 font-medium flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {banner.ends_at ? formatDateOnly(banner.ends_at) : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-1">
                              {locale === 'ar' ? 'المدة' : 'Duration'}
                            </span>
                            <span className="text-slate-700 font-medium flex items-center gap-1.5">
                              <Timer className="w-4 h-4" />
                              {locale === 'ar'
                                ? DURATION_LABELS[banner.duration_type]?.ar
                                : DURATION_LABELS[banner.duration_type]?.en}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-1">
                              {locale === 'ar' ? 'الأولوية' : 'Priority'}
                            </span>
                            <span className="text-slate-700 font-medium">
                              {banner.duration_type === '1_day'
                                ? '1 (' + (locale === 'ar' ? 'أعلى' : 'Highest') + ')'
                                : banner.duration_type === '3_days'
                                  ? '2'
                                  : banner.duration_type === '1_week'
                                    ? '3'
                                    : '4'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
                  <Button
                    onClick={() => handleApprove(banner.id)}
                    disabled={actionLoading === banner.id}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading === banner.id ? (
                      <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 me-2" />
                    )}
                    {locale === 'ar' ? 'قبول' : 'Approve'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectModal(banner.id)}
                    disabled={actionLoading === banner.id}
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'رفض' : 'Reject'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCancelModal(banner.id)}
                    disabled={actionLoading === banner.id}
                    className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-100"
                  >
                    <Ban className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  {locale === 'ar' ? 'رفض البانر' : 'Reject Banner'}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'سبب الرفض *' : 'Rejection Reason *'}
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                    placeholder={
                      locale === 'ar' ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'
                    }
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleReject(showRejectModal)}
                    disabled={actionLoading === showRejectModal || !rejectReason.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {actionLoading === showRejectModal ? (
                      <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 me-2" />
                    )}
                    {locale === 'ar' ? 'تأكيد الرفض' : 'Confirm Reject'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectModal(null);
                      setRejectReason('');
                    }}
                  >
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-slate-600" />
                  {locale === 'ar' ? 'إلغاء البانر' : 'Cancel Banner'}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>
                    {locale === 'ar'
                      ? 'إلغاء البانر يختلف عن الرفض. استخدم هذا الخيار إذا كان هناك سبب إداري للإلغاء.'
                      : 'Cancelling is different from rejecting. Use this option for administrative reasons.'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'سبب الإلغاء *' : 'Cancellation Reason *'}
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                    placeholder={
                      locale === 'ar' ? 'أدخل سبب الإلغاء...' : 'Enter cancellation reason...'
                    }
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleCancel(showCancelModal)}
                    disabled={actionLoading === showCancelModal || !cancelReason.trim()}
                    className="flex-1"
                  >
                    {actionLoading === showCancelModal ? (
                      <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                    ) : (
                      <Ban className="w-4 h-4 me-2" />
                    )}
                    {locale === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCancelModal(null);
                      setCancelReason('');
                    }}
                  >
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
