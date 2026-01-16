'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { formatDateTime, formatCurrency } from '@/lib/utils/formatters';
import {
  ArrowLeft,
  ArrowRight,
  Radio,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Mic,
  Image as ImageIcon,
  Timer,
  Users,
  Store,
  Play,
  Pause,
  Volume2,
  Package,
  Receipt,
  Truck,
  Phone,
  MapPin,
  Scale,
  MessageSquare,
  Flag,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BroadcastStatus, CustomOrderInputType, CustomOrderItem } from '@/types/custom-order';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface BroadcastDetails {
  id: string;
  customer_id: string;
  provider_ids: string[];
  original_input_type: CustomOrderInputType;
  original_text: string | null;
  voice_url: string | null;
  image_urls: string[] | null;
  transcribed_text: string | null;
  customer_notes: string | null;
  delivery_address: any;
  status: BroadcastStatus;
  pricing_deadline: string;
  expires_at: string;
  created_at: string;
  completed_at: string | null;
  winning_order_id: string | null;
  customer: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  requests: RequestDetails[];
}

interface RequestDetails {
  id: string;
  provider_id: string;
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  items_count: number;
  priced_at: string | null;
  responded_at: string | null;
  provider: {
    id: string;
    name_ar: string;
    name_en: string;
    logo_url: string | null;
    phone: string | null;
  } | null;
  items: CustomOrderItem[];
  order?: {
    id: string;
    order_number: string;
    status: string;
  } | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminCustomOrderDetailPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const broadcastId = params.id as string;
  const isRTL = locale === 'ar';

  const { toggle: toggleSidebar } = useAdminSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [broadcast, setBroadcast] = useState<BroadcastDetails | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Load broadcast data
  const loadBroadcast = useCallback(async () => {
    setDataLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('custom_order_broadcasts')
      .select(
        `
        *,
        customer:profiles!custom_order_broadcasts_customer_id_fkey(
          id,
          full_name,
          phone,
          email
        ),
        requests:custom_order_requests(
          *,
          provider:providers(
            id,
            name_ar,
            name_en,
            logo_url,
            phone
          ),
          items:custom_order_items(*),
          order:orders(
            id,
            order_number,
            status
          )
        )
      `
      )
      .eq('id', broadcastId)
      .single();

    if (!error && data) {
      const transformed: BroadcastDetails = {
        ...data,
        customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
        requests: (data.requests || []).map((r: any) => ({
          ...r,
          provider: Array.isArray(r.provider) ? r.provider[0] : r.provider,
          order: Array.isArray(r.order) ? r.order[0] : r.order,
        })),
      };
      setBroadcast(transformed);

      // Auto-select winning request or first priced one
      const winningRequest = transformed.requests.find((r) => r.status === 'customer_approved');
      const pricedRequest = transformed.requests.find((r) => r.status === 'priced');
      setSelectedRequest(
        winningRequest?.id || pricedRequest?.id || transformed.requests[0]?.id || null
      );
    }

    setDataLoading(false);
  }, [broadcastId]);

  // Check authentication
  const checkAuth = useCallback(async () => {
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
        setLoading(false);
        loadBroadcast();
        return;
      }
    }

    setLoading(false);
  }, [loadBroadcast]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Get input type icon
  const getInputIcon = (type: CustomOrderInputType) => {
    switch (type) {
      case 'voice':
        return <Mic className="w-5 h-5" />;
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string, size: 'sm' | 'md' = 'sm') => {
    const configs: Record<string, { icon: any; label: string; className: string }> = {
      active: {
        icon: Radio,
        label: isRTL ? 'نشط' : 'Active',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      },
      completed: {
        icon: CheckCircle2,
        label: isRTL ? 'مكتمل' : 'Completed',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      },
      expired: {
        icon: XCircle,
        label: isRTL ? 'منتهي' : 'Expired',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
      },
      cancelled: {
        icon: XCircle,
        label: isRTL ? 'ملغي' : 'Cancelled',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      },
      pending: {
        icon: Clock,
        label: isRTL ? 'بانتظار التسعير' : 'Pending',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      },
      priced: {
        icon: Receipt,
        label: isRTL ? 'تم التسعير' : 'Priced',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      },
      customer_approved: {
        icon: CheckCircle2,
        label: isRTL ? 'تمت الموافقة' : 'Approved',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      },
      customer_rejected: {
        icon: XCircle,
        label: isRTL ? 'مرفوض' : 'Rejected',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      },
    };

    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    const sizeClass = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${config.className}`}
      >
        <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />
        {config.label}
      </span>
    );
  };

  // Selected request data
  const selectedRequestData = broadcast?.requests.find((r) => r.id === selectedRequest);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {isRTL ? 'غير مصرح' : 'Unauthorized'}
          </h1>
        </div>
      </div>
    );
  }

  if (dataLoading || !broadcast || !user) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <AdminHeader
        user={user}
        title={isRTL ? 'تفاصيل الطلب المفتوح' : 'Custom Order Details'}
        onMenuClick={toggleSidebar}
      />

      <div className="p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/admin/custom-orders`)}
          className="mb-4"
        >
          {isRTL ? <ArrowRight className="w-4 h-4 me-2" /> : <ArrowLeft className="w-4 h-4 me-2" />}
          {isRTL ? 'العودة للقائمة' : 'Back to List'}
        </Button>

        {/* Header Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getStatusBadge(broadcast.status, 'md')}
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  ID: {broadcast.id.slice(0, 8)}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {broadcast.customer?.full_name || (isRTL ? 'عميل' : 'Customer')}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                {broadcast.customer?.phone && (
                  <a
                    href={`tel:${broadcast.customer.phone}`}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <Phone className="w-4 h-4" />
                    {broadcast.customer.phone}
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDateTime(broadcast.created_at, locale)}
                </span>
              </div>
            </div>

            <div className="text-end">
              <div className="flex items-center gap-2 justify-end mb-2">
                {getInputIcon(broadcast.original_input_type)}
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {broadcast.original_input_type === 'voice'
                    ? isRTL
                      ? 'طلب صوتي'
                      : 'Voice Order'
                    : broadcast.original_input_type === 'image'
                      ? isRTL
                        ? 'طلب بالصور'
                        : 'Image Order'
                      : isRTL
                        ? 'طلب نصي'
                        : 'Text Order'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {broadcast.requests.length} {isRTL ? 'تجار' : 'merchants'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Customer Order */}
          <div className="space-y-6">
            {/* Original Request */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <h2 className="font-semibold text-amber-800 dark:text-amber-300">
                    {isRTL ? 'طلب العميل الأصلي' : 'Original Customer Request'}
                  </h2>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {isRTL
                    ? 'هذا هو ما طلبه العميل - للمقارنة مع الفاتورة'
                    : 'This is what the customer requested - for dispute resolution'}
                </p>
              </div>

              <div className="p-4 space-y-4">
                {/* Voice Recording */}
                {broadcast.voice_url && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-12 h-12 bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center justify-center"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ms-0.5" />
                        )}
                      </button>
                      <div>
                        <p className="font-medium text-purple-700 dark:text-purple-300">
                          {isRTL ? 'تسجيل صوتي' : 'Voice Recording'}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          {isRTL ? 'اضغط للاستماع' : 'Click to play'}
                        </p>
                      </div>
                    </div>
                    {/* Hidden audio element */}
                    <audio
                      id="voice-player"
                      src={broadcast.voice_url}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Images */}
                {broadcast.image_urls && broadcast.image_urls.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {isRTL ? 'الصور المرفقة' : 'Attached Images'}
                    </p>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {broadcast.image_urls.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 ${
                            currentImageIndex === idx
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    {broadcast.image_urls[currentImageIndex] && (
                      <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img
                          src={broadcast.image_urls[currentImageIndex]}
                          alt=""
                          className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Text */}
                {(broadcast.original_text || broadcast.transcribed_text) && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {broadcast.transcribed_text
                        ? isRTL
                          ? 'النص المحول من الصوت'
                          : 'Transcribed Text'
                        : isRTL
                          ? 'نص الطلب'
                          : 'Order Text'}
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-slate-700 dark:text-slate-300">
                      {broadcast.transcribed_text || broadcast.original_text}
                    </div>
                  </div>
                )}

                {/* Customer Notes */}
                {broadcast.customer_notes && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                      {isRTL ? 'ملاحظات العميل' : 'Customer Notes'}
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      {broadcast.customer_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Merchant Responses */}
          <div className="space-y-6">
            {/* Request Selector */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                {isRTL ? 'استجابات التجار' : 'Merchant Responses'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {broadcast.requests.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedRequest(req.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedRequest === req.id
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    {req.provider?.name_ar || req.provider_id.slice(0, 6)}
                    {req.status === 'customer_approved' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Request Details */}
            {selectedRequestData && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 border-b border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h2 className="font-semibold text-blue-800 dark:text-blue-300">
                        {isRTL ? 'الفاتورة النهائية' : 'Final Invoice'}
                      </h2>
                    </div>
                    {getStatusBadge(selectedRequestData.status)}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {selectedRequestData.provider?.name_ar || (isRTL ? 'تاجر' : 'Merchant')}
                  </p>
                </div>

                <div className="p-4">
                  {/* Items */}
                  {selectedRequestData.items && selectedRequestData.items.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {selectedRequestData.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className={`p-3 rounded-xl ${
                            item.availability_status === 'unavailable'
                              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                              : item.availability_status === 'substituted'
                                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                                : 'bg-slate-50 dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-200">
                                {item.item_name_ar}
                              </p>
                              {item.original_customer_text &&
                                item.original_customer_text !== item.item_name_ar && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {isRTL ? 'طلب العميل:' : 'Customer requested:'}{' '}
                                    {item.original_customer_text}
                                  </p>
                                )}
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {item.quantity} x {item.unit_price?.toFixed(2)}{' '}
                                {isRTL ? 'ج.م' : 'EGP'}
                              </p>
                            </div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.total_price?.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                            </p>
                          </div>

                          {item.availability_status === 'substituted' &&
                            item.substitute_name_ar && (
                              <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                                <p className="text-xs text-amber-700 dark:text-amber-400 mb-1">
                                  {isRTL ? 'البديل المقترح:' : 'Substitute:'}
                                </p>
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                  {item.substitute_name_ar} -{' '}
                                  {item.substitute_total_price?.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                                </p>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      {selectedRequestData.status === 'pending'
                        ? isRTL
                          ? 'لم يتم التسعير بعد'
                          : 'Not priced yet'
                        : isRTL
                          ? 'لا توجد أصناف'
                          : 'No items'}
                    </div>
                  )}

                  {/* Totals */}
                  {selectedRequestData.status !== 'pending' && (
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          {isRTL ? 'المجموع' : 'Subtotal'}
                        </span>
                        <span className="font-medium">
                          {selectedRequestData.subtotal?.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          {isRTL ? 'التوصيل' : 'Delivery'}
                        </span>
                        <span className="font-medium">
                          {selectedRequestData.delivery_fee?.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-700 pt-2">
                        <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                        <span className="text-primary">
                          {selectedRequestData.total?.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Admin Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                {isRTL ? 'إجراءات الإدارة' : 'Admin Actions'}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4 me-2" />
                  {isRTL ? 'إرسال رسالة للعميل' : 'Message Customer'}
                </Button>
                <Button variant="outline" size="sm">
                  <Store className="w-4 h-4 me-2" />
                  {isRTL ? 'التواصل مع التاجر' : 'Contact Merchant'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Flag className="w-4 h-4 me-2" />
                  {isRTL ? 'فتح نزاع' : 'Open Dispute'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
