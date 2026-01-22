'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ProviderLayout } from '@/components/provider';
import { ACTIVE_PROVIDER_STATUSES } from '@/types/database';
import {
  BANNER_GRADIENTS,
  ADMIN_COLOR_OPTIONS_GROUPED,
  COLOR_CATEGORY_LABELS,
} from '@/constants/colors';
import {
  Image as ImageIcon,
  Calendar,
  Clock,
  Check,
  X,
  MapPin,
  AlertCircle,
  Loader2,
  Upload,
  Eye,
  Megaphone,
  FileImage,
  Info,
  Sparkles,
  Timer,
  CheckCircle2,
  XCircle,
  HourglassIcon,
  Trash2,
  Edit2,
} from 'lucide-react';


type DurationType = '1_day' | '3_days' | '1_week' | '1_month';
type ImagePosition = 'start' | 'end' | 'center';
type ImageSize = 'small' | 'medium' | 'large';

// Unified image size configuration - relative to banner height for consistency
// These settings match the customer-facing carousel for accurate preview
const IMAGE_SIZE_CONFIG: Record<
  ImageSize,
  {
    label_ar: string;
    label_en: string;
    maxHeight: string;
    maxWidth: string;
  }
> = {
  small: {
    label_ar: 'صغير',
    label_en: 'Small',
    maxHeight: '45%',
    maxWidth: '25%',
  },
  medium: {
    label_ar: 'وسط',
    label_en: 'Medium',
    maxHeight: '55%',
    maxWidth: '30%',
  },
  large: {
    label_ar: 'كبير',
    label_en: 'Large',
    maxHeight: '65%',
    maxWidth: '35%',
  },
};

type BannerStatus = {
  has_active_banner: boolean;
  has_pending_banner: boolean;
  has_rejected_banner: boolean;
  current_banner_id: string | null;
  current_banner_status: 'pending' | 'approved' | 'rejected' | 'cancelled' | null;
  current_banner_starts_at: string | null;
  current_banner_ends_at: string | null;
};

type Banner = {
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
  approval_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type Provider = {
  id: string;
  name_ar: string;
  name_en: string;
  governorate_id: string | null;
  city_id: string | null;
};

type Location = {
  governorate_name_ar: string;
  governorate_name_en: string;
  city_name_ar: string | null;
  city_name_en: string | null;
};

const DURATION_OPTIONS: {
  value: DurationType;
  label_ar: string;
  label_en: string;
  days: number;
}[] = [
  { value: '1_day', label_ar: 'يوم واحد', label_en: '1 Day', days: 1 },
  { value: '3_days', label_ar: '3 أيام', label_en: '3 Days', days: 3 },
  { value: '1_week', label_ar: 'أسبوع', label_en: '1 Week', days: 7 },
  { value: '1_month', label_ar: 'شهر', label_en: '1 Month', days: 30 },
];

// Helper function for text color on gradient
function getContrastTextColor(hexColor: string): 'light' | 'dark' {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? 'dark' : 'light';
}

const defaultFormData = {
  title_ar: '',
  title_en: '',
  description_ar: '',
  description_en: '',
  badge_text_ar: '',
  badge_text_en: '',
  cta_text_ar: 'اطلب الآن',
  cta_text_en: 'Order Now',
  image_url: '',
  gradient_start: '#009DE0',
  gradient_end: '#0077B6',
  duration_type: '1_week' as DurationType,
  starts_at: '',
  image_position: 'end' as ImagePosition,
  image_size: 'medium' as ImageSize,
};

export default function ProviderBannerPage() {
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [bannerStatus, setBannerStatus] = useState<BannerStatus | null>(null);
  const [currentBanner, setCurrentBanner] = useState<Banner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [dateWarning, setDateWarning] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    // Check if start date is less than 3 days from now
    if (formData.starts_at) {
      const startDate = new Date(formData.starts_at);
      const now = new Date();
      const daysDiff = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 3) {
        setDateWarning(
          locale === 'ar'
            ? 'ملاحظة: يُفضل طلب الموافقة قبل 3 أيام على الأقل من تاريخ البدء لضمان المراجعة في الوقت المناسب.'
            : "Note: It's recommended to request approval at least 3 days before start date to ensure timely review."
        );
      } else {
        setDateWarning(null);
      }
    }
  }, [formData.starts_at, locale]);

  const checkAuthAndLoad = async () => {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/banner`);
      return;
    }

    // Get provider with location
    const { data: providerData } = await supabase
      .from('providers')
      .select('id, name_ar, name_en, governorate_id, city_id, status')
      .eq('owner_id', user.id)
      .limit(1);

    const providerRecord = providerData?.[0];
    if (!providerRecord || !ACTIVE_PROVIDER_STATUSES.includes(providerRecord.status)) {
      router.push(`/${locale}/provider`);
      return;
    }

    setProvider(providerRecord);

    // Load location names
    if (providerRecord.governorate_id) {
      const { data: govData } = await supabase
        .from('governorates')
        .select('name_ar, name_en')
        .eq('id', providerRecord.governorate_id)
        .single();

      let cityData = null;
      if (providerRecord.city_id) {
        const { data } = await supabase
          .from('cities')
          .select('name_ar, name_en')
          .eq('id', providerRecord.city_id)
          .single();
        cityData = data;
      }

      setLocation({
        governorate_name_ar: govData?.name_ar || '',
        governorate_name_en: govData?.name_en || '',
        city_name_ar: cityData?.name_ar || null,
        city_name_en: cityData?.name_en || null,
      });
    }

    // Check banner status
    const { data: statusData } = await supabase.rpc('get_provider_banner_status', {
      p_provider_id: providerRecord.id,
    });

    if (statusData && statusData.length > 0) {
      setBannerStatus(statusData[0]);

      // If there's an active or pending banner, load its details
      if (statusData[0].current_banner_id) {
        const { data: bannerData } = await supabase
          .from('homepage_banners')
          .select('*')
          .eq('id', statusData[0].current_banner_id)
          .single();

        if (bannerData) {
          setCurrentBanner(bannerData);
        }
      }
    }

    // Set default start date to 3 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    setFormData((prev) => ({
      ...prev,
      starts_at: defaultDate.toISOString().split('T')[0],
    }));

    setLoading(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!file || !provider) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert(locale === 'ar' ? 'نوع الملف غير مدعوم' : 'Unsupported file type');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert(locale === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 2MB)' : 'File too large (max 2MB)');
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `provider-banners/${provider.id}-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('public-assets').getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (error) {
      console.error('Upload error:', error);
      alert(locale === 'ar' ? 'حدث خطأ أثناء رفع الصورة' : 'Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!provider) return;

    if (!formData.title_ar || !formData.title_en || !formData.starts_at) {
      alert(locale === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      // Calculate end date based on duration
      const startDate = new Date(formData.starts_at);
      const durationDays =
        DURATION_OPTIONS.find((d) => d.value === formData.duration_type)?.days || 7;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);

      const bannerData = {
        title_ar: formData.title_ar,
        title_en: formData.title_en,
        description_ar: formData.description_ar || null,
        description_en: formData.description_en || null,
        badge_text_ar: formData.badge_text_ar || null,
        badge_text_en: formData.badge_text_en || null,
        cta_text_ar: formData.cta_text_ar || null,
        cta_text_en: formData.cta_text_en || null,
        image_url: formData.image_url || null,
        gradient_start: formData.gradient_start,
        gradient_end: formData.gradient_end,
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        duration_type: formData.duration_type,
        provider_id: provider.id,
        governorate_id: provider.governorate_id,
        city_id: provider.city_id,
        approval_status: 'pending',
        submitted_at: new Date().toISOString(),
        is_active: false, // Will be activated when approved
        banner_type: 'customer',
        has_glassmorphism: true,
        image_position: formData.image_position,
        image_size: formData.image_size,
        display_order: 999, // Will be ordered by duration priority
      };

      if (isEditing && editingBannerId) {
        // Update existing rejected banner and reset to pending
        const { error } = await supabase
          .from('homepage_banners')
          .update({
            ...bannerData,
            rejection_reason: null, // Clear rejection reason
            reviewed_at: null, // Clear reviewed timestamp
            reviewed_by: null, // Clear reviewer
          })
          .eq('id', editingBannerId);

        if (error) throw error;
      } else {
        // Create new banner
        const { error } = await supabase.from('homepage_banners').insert(bannerData);

        if (error) throw error;
      }

      // Reload status
      await checkAuthAndLoad();
      setShowForm(false);
      setFormData(defaultFormData);
      setIsEditing(false);
      setEditingBannerId(null);
    } catch (error) {
      console.error('Save error:', error);
      alert(locale === 'ar' ? 'حدث خطأ أثناء حفظ البانر' : 'Error saving banner');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelBanner = async () => {
    if (!currentBanner) return;

    if (!confirm(locale === 'ar' ? 'هل تريد إلغاء هذا البانر؟' : 'Cancel this banner?')) return;

    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('homepage_banners')
        .update({ approval_status: 'cancelled', is_active: false })
        .eq('id', currentBanner.id);

      if (error) throw error;

      await checkAuthAndLoad();
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  // Load rejected banner data into form for editing
  const loadBannerForEditing = () => {
    if (!currentBanner) return;

    // Set default start date to 3 days from now for resubmission
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);

    setFormData({
      title_ar: currentBanner.title_ar || '',
      title_en: currentBanner.title_en || '',
      description_ar: currentBanner.description_ar || '',
      description_en: currentBanner.description_en || '',
      badge_text_ar: currentBanner.badge_text_ar || '',
      badge_text_en: currentBanner.badge_text_en || '',
      cta_text_ar: currentBanner.cta_text_ar || 'اطلب الآن',
      cta_text_en: currentBanner.cta_text_en || 'Order Now',
      image_url: currentBanner.image_url || '',
      gradient_start: currentBanner.gradient_start || '#009DE0',
      gradient_end: currentBanner.gradient_end || '#0077B6',
      duration_type: currentBanner.duration_type || '1_week',
      starts_at: defaultDate.toISOString().split('T')[0],
      image_position: (currentBanner as any).image_position || 'end',
      image_size: (currentBanner as any).image_size || 'medium',
    });
    setIsEditing(true);
    setEditingBannerId(currentBanner.id);
    setShowForm(true);
  };

  // Provider can create banner if:
  // - No active banner AND no pending banner
  // - OR has a rejected/cancelled banner (can try again)
  const canCreateBanner = !bannerStatus?.has_active_banner && !bannerStatus?.has_pending_banner;
  const hasRejectedBanner =
    currentBanner?.approval_status === 'rejected' || currentBanner?.approval_status === 'cancelled';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <ProviderLayout
      pageTitle={{ ar: 'بانر العروض', en: 'Promotional Banner' }}
      pageSubtitle={{
        ar: 'أعلن عن عروضك للعملاء في مدينتك',
        en: 'Advertise your offers to customers in your city',
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Location Info */}
        {location && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-600">
                  {locale === 'ar'
                    ? 'البانر سيظهر لعملاء:'
                    : 'Banner will be shown to customers in:'}
                </p>
                <p className="font-semibold text-slate-900">
                  {locale === 'ar'
                    ? `${location.city_name_ar || location.governorate_name_ar}${location.city_name_ar ? ` - ${location.governorate_name_ar}` : ''}`
                    : `${location.city_name_en || location.governorate_name_en}${location.city_name_en ? ` - ${location.governorate_name_en}` : ''}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Banner Status */}
        {currentBanner && (
          <Card className="bg-white border-slate-200 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                {locale === 'ar' ? 'البانر الحالي' : 'Current Banner'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                {currentBanner.approval_status === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                    <HourglassIcon className="w-4 h-4" />
                    {locale === 'ar' ? 'في انتظار الموافقة' : 'Pending Approval'}
                  </span>
                )}
                {currentBanner.approval_status === 'approved' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    {locale === 'ar' ? 'تمت الموافقة' : 'Approved'}
                  </span>
                )}
                {currentBanner.approval_status === 'rejected' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                    <XCircle className="w-4 h-4" />
                    {locale === 'ar' ? 'مرفوض' : 'Rejected'}
                  </span>
                )}
                {currentBanner.approval_status === 'cancelled' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
                    <XCircle className="w-4 h-4" />
                    {locale === 'ar' ? 'ملغي' : 'Cancelled'}
                  </span>
                )}
              </div>

              {/* Banner Preview */}
              <div
                className="relative overflow-hidden rounded-xl aspect-[16/9]"
                style={{
                  background: `linear-gradient(135deg, ${currentBanner.gradient_start} 0%, ${currentBanner.gradient_end} 100%)`,
                }}
              >
                <div className="absolute -top-10 -end-10 w-32 h-32 bg-white/10 rounded-full blur-sm" />
                <div className="absolute -bottom-6 -start-6 w-24 h-24 bg-white/10 rounded-full blur-sm" />

                <div className="relative z-10 h-full p-4 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    {currentBanner.badge_text_ar && (
                      <div className="inline-block mb-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg px-2.5 py-1">
                        <span className="text-white font-bold text-xs">
                          {locale === 'ar'
                            ? currentBanner.badge_text_ar
                            : currentBanner.badge_text_en}
                        </span>
                      </div>
                    )}
                    <h3 className="text-white font-bold text-base mb-1">
                      {locale === 'ar' ? currentBanner.title_ar : currentBanner.title_en}
                    </h3>
                    {currentBanner.description_ar && (
                      <p className="text-white/85 text-xs mb-2 line-clamp-2">
                        {locale === 'ar'
                          ? currentBanner.description_ar
                          : currentBanner.description_en}
                      </p>
                    )}
                    {currentBanner.cta_text_ar && (
                      <button className="bg-white text-slate-900 font-semibold px-3 py-1.5 rounded-lg text-xs">
                        {locale === 'ar' ? currentBanner.cta_text_ar : currentBanner.cta_text_en}
                      </button>
                    )}
                  </div>

                  {currentBanner.image_url && (
                    <div className="w-20 h-20 flex-shrink-0 relative">
                      <Image
                        src={currentBanner.image_url}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-contain drop-shadow-xl"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formatDate(currentBanner.starts_at)} -{' '}
                    {currentBanner.ends_at ? formatDate(currentBanner.ends_at) : '∞'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Timer className="w-4 h-4" />
                  <span>
                    {
                      DURATION_OPTIONS.find((d) => d.value === currentBanner.duration_type)?.[
                        locale === 'ar' ? 'label_ar' : 'label_en'
                      ]
                    }
                  </span>
                </div>
              </div>

              {/* Rejection/Cancellation Reason */}
              {(currentBanner.approval_status === 'rejected' ||
                currentBanner.approval_status === 'cancelled') &&
                currentBanner.rejection_reason && (
                  <div
                    className={`p-3 ${currentBanner.approval_status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'} border rounded-lg`}
                  >
                    <p
                      className={`text-sm ${currentBanner.approval_status === 'rejected' ? 'text-red-700' : 'text-slate-700'}`}
                    >
                      <strong>
                        {locale === 'ar'
                          ? currentBanner.approval_status === 'rejected'
                            ? 'سبب الرفض:'
                            : 'سبب الإلغاء:'
                          : currentBanner.approval_status === 'rejected'
                            ? 'Rejection Reason:'
                            : 'Cancellation Reason:'}
                      </strong>{' '}
                      {currentBanner.rejection_reason}
                    </p>
                  </div>
                )}

              {/* Cancel Button (for pending only) */}
              {currentBanner.approval_status === 'pending' && (
                <Button
                  variant="outline"
                  onClick={handleCancelBanner}
                  className="text-red-500 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 me-2" />
                  {locale === 'ar' ? 'إلغاء الطلب' : 'Cancel Request'}
                </Button>
              )}

              {/* Edit or Create New Banner Button (for rejected/cancelled) */}
              {hasRejectedBanner && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <Button onClick={loadBannerForEditing} className="w-full">
                    <Edit2 className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'تعديل وإعادة الإرسال' : 'Edit and Resubmit'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingBannerId(null);
                      setFormData(defaultFormData);
                      // Reset start date to 3 days from now
                      const defaultDate = new Date();
                      defaultDate.setDate(defaultDate.getDate() + 3);
                      setFormData((prev) => ({
                        ...prev,
                        starts_at: defaultDate.toISOString().split('T')[0],
                      }));
                      setShowForm(true);
                    }}
                    className="w-full border-slate-300"
                  >
                    <Sparkles className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'إنشاء بانر جديد' : 'Create New Banner'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Banner Section */}
        {canCreateBanner && !showForm && (
          <Card className="bg-white border-slate-200">
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {locale === 'ar' ? 'أنشئ بانر لعروضك' : 'Create a Banner for Your Offers'}
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                {locale === 'ar'
                  ? 'اعرض عروضك الخاصة لعملاء مدينتك على الصفحة الرئيسية. يتم مراجعة البانر من قبل الإدارة قبل نشره.'
                  : 'Showcase your special offers to customers in your city on the homepage. Banners are reviewed by admin before publishing.'}
              </p>
              <Button onClick={() => setShowForm(true)} size="lg">
                <Sparkles className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'إنشاء بانر جديد' : 'Create New Banner'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Banner Form */}
        {showForm && (
          <Card className="bg-white border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                {isEditing ? (
                  <Edit2 className="w-5 h-5 text-primary" />
                ) : (
                  <Sparkles className="w-5 h-5 text-primary" />
                )}
                {isEditing
                  ? locale === 'ar'
                    ? 'تعديل البانر'
                    : 'Edit Banner'
                  : locale === 'ar'
                    ? 'بانر جديد'
                    : 'New Banner'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Edit Mode Notice */}
              {isEditing && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
                  <Edit2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">
                      {locale === 'ar' ? 'تعديل البانر المرفوض' : 'Editing Rejected Banner'}
                    </p>
                    <p>
                      {locale === 'ar'
                        ? 'يمكنك تعديل البانر وإعادة إرساله للمراجعة. سيتم إرسال البانر للإدارة للموافقة عليه مرة أخرى.'
                        : 'You can edit the banner and resubmit it for review. The banner will be sent to admin for approval again.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Title AR/EN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'العنوان (عربي) *' : 'Title (Arabic) *'}
                  </label>
                  <Input
                    value={formData.title_ar}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    className="bg-white border-slate-200"
                    placeholder={
                      locale === 'ar' ? 'مثال: عرض نهاية الأسبوع' : 'e.g., Weekend Offer'
                    }
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'العنوان (إنجليزي) *' : 'Title (English) *'}
                  </label>
                  <Input
                    value={formData.title_en}
                    onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                    className="bg-white border-slate-200"
                    placeholder="e.g., Weekend Offer"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Description AR/EN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                  </label>
                  <Input
                    value={formData.description_ar}
                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                    className="bg-white border-slate-200"
                    placeholder={
                      locale === 'ar' ? 'خصم 30% على جميع المنتجات' : '30% off all products'
                    }
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                  </label>
                  <Input
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    className="bg-white border-slate-200"
                    placeholder="30% off all products"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Badge AR/EN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'نص الشارة (عربي)' : 'Badge Text (Arabic)'}
                  </label>
                  <Input
                    value={formData.badge_text_ar}
                    onChange={(e) => setFormData({ ...formData, badge_text_ar: e.target.value })}
                    className="bg-white border-slate-200"
                    placeholder={locale === 'ar' ? 'خصم 30%' : '30% OFF'}
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'نص الشارة (إنجليزي)' : 'Badge Text (English)'}
                  </label>
                  <Input
                    value={formData.badge_text_en}
                    onChange={(e) => setFormData({ ...formData, badge_text_en: e.target.value })}
                    className="bg-white border-slate-200"
                    placeholder="30% OFF"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* CTA AR/EN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'نص الزر (عربي)' : 'Button Text (Arabic)'}
                  </label>
                  <Input
                    value={formData.cta_text_ar}
                    onChange={(e) => setFormData({ ...formData, cta_text_ar: e.target.value })}
                    className="bg-white border-slate-200"
                    placeholder="اطلب الآن"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'نص الزر (إنجليزي)' : 'Button Text (English)'}
                  </label>
                  <Input
                    value={formData.cta_text_en}
                    onChange={(e) => setFormData({ ...formData, cta_text_en: e.target.value })}
                    className="bg-white border-slate-200"
                    placeholder="Order Now"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'صورة المنتج (اختياري)' : 'Product Image (Optional)'}
                </label>
                <div className="relative border-2 border-dashed rounded-xl p-6 text-center transition-colors border-slate-300 hover:border-primary">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-sm text-slate-600">
                        {locale === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
                      </p>
                    </div>
                  ) : formData.image_url ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-24 h-24 relative">
                        <Image
                          src={formData.image_url}
                          alt="Preview"
                          fill
                          sizes="96px"
                          className="object-contain rounded-lg bg-slate-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        {locale === 'ar' ? 'إزالة الصورة' : 'Remove Image'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 mb-1">
                        {locale === 'ar' ? 'اسحب الصورة هنا أو' : 'Drag image here or'}
                      </p>
                      <label className="cursor-pointer">
                        <span className="text-sm text-primary font-medium hover:underline">
                          {locale === 'ar' ? 'اضغط للاختيار' : 'click to browse'}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                        />
                      </label>
                      <p className="text-xs text-slate-400 mt-2">
                        PNG, JPG, WebP - {locale === 'ar' ? 'الحد الأقصى 2MB' : 'Max 2MB'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Image Position */}
              {formData.image_url && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'موقع الصورة' : 'Image Position'}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'end', label_ar: 'يسار', label_en: 'Left' },
                      { value: 'center', label_ar: 'وسط', label_en: 'Center' },
                      { value: 'start', label_ar: 'يمين', label_en: 'Right' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            image_position: option.value as ImagePosition,
                          })
                        }
                        className={`
                          flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all
                          ${
                            formData.image_position === option.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-200 hover:border-slate-300'
                          }
                        `}
                      >
                        {locale === 'ar' ? option.label_ar : option.label_en}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Size */}
              {formData.image_url && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'حجم الصورة' : 'Image Size'}
                  </label>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large'] as ImageSize[]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setFormData({ ...formData, image_size: size })}
                        className={`
                          flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all
                          ${
                            formData.image_size === size
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-200 hover:border-slate-300'
                          }
                        `}
                      >
                        {locale === 'ar'
                          ? IMAGE_SIZE_CONFIG[size].label_ar
                          : IMAGE_SIZE_CONFIG[size].label_en}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Gradient Colors */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'لون الخلفية' : 'Background Color'}
                </label>
                <div className="space-y-3">
                  {(['primary', 'accent', 'cool', 'special'] as const).map((category) => (
                    <div key={category}>
                      <p className="text-xs text-slate-500 mb-1.5">
                        {locale === 'ar'
                          ? COLOR_CATEGORY_LABELS[category].ar
                          : COLOR_CATEGORY_LABELS[category].en}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ADMIN_COLOR_OPTIONS_GROUPED[category].map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                gradient_start: color.start,
                                gradient_end: color.end,
                              })
                            }
                            className={`
                              group relative px-3 py-1.5 rounded-full text-xs font-medium transition-all
                              hover:scale-105 shadow-sm
                              ${
                                formData.gradient_start === color.start &&
                                formData.gradient_end === color.end
                                  ? 'ring-2 ring-offset-2 ring-primary scale-105'
                                  : ''
                              }
                            `}
                            style={{
                              background: `linear-gradient(135deg, ${color.start} 0%, ${color.end} 100%)`,
                            }}
                          >
                            <span className="relative z-10 text-white drop-shadow-md font-semibold">
                              {locale === 'ar' ? color.nameAr : color.nameEn}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'مدة العرض *' : 'Duration *'}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, duration_type: option.value })}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-center
                        ${
                          formData.duration_type === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      <Timer className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-sm font-medium">
                        {locale === 'ar' ? option.label_ar : option.label_en}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'تاريخ البداية *' : 'Start Date *'}
                </label>
                <Input
                  type="date"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  className="bg-white border-slate-200"
                  min={new Date().toISOString().split('T')[0]}
                />
                {dateWarning && (
                  <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{dateWarning}</p>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {locale === 'ar' ? 'معاينة البانر' : 'Banner Preview'}
                </label>
                <div
                  className="relative overflow-hidden rounded-xl aspect-[16/9]"
                  style={{
                    background: `linear-gradient(135deg, ${formData.gradient_start} 0%, ${formData.gradient_end} 100%)`,
                  }}
                >
                  <div className="absolute -top-10 -end-10 w-32 h-32 bg-white/10 rounded-full blur-sm" />
                  <div className="absolute -bottom-6 -start-6 w-24 h-24 bg-white/10 rounded-full blur-sm" />

                  {/* Center Position Layout */}
                  {formData.image_position === 'center' ? (
                    <div className="relative z-10 h-full p-4 flex flex-col items-center justify-center text-center">
                      {formData.image_url && (
                        <div
                          className="flex-shrink-0 mb-2 relative"
                          style={{
                            height: IMAGE_SIZE_CONFIG[formData.image_size].maxHeight,
                            width: '40%',
                            maxWidth: '40%',
                          }}
                        >
                          <Image
                            src={formData.image_url}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 40vw, 200px"
                            className="object-contain drop-shadow-xl"
                          />
                        </div>
                      )}
                      {formData.badge_text_ar && (
                        <div className="inline-block mb-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg px-2.5 py-1">
                          <span className="text-white font-bold text-xs">
                            {locale === 'ar' ? formData.badge_text_ar : formData.badge_text_en}
                          </span>
                        </div>
                      )}
                      <h3 className="text-white font-bold text-base mb-1">
                        {(locale === 'ar' ? formData.title_ar : formData.title_en) ||
                          (locale === 'ar' ? 'عنوان العرض' : 'Offer Title')}
                      </h3>
                      {formData.description_ar && (
                        <p className="text-white/85 text-xs mb-2 line-clamp-1">
                          {locale === 'ar' ? formData.description_ar : formData.description_en}
                        </p>
                      )}
                      {formData.cta_text_ar && (
                        <button className="bg-white text-slate-900 font-semibold px-3 py-1.5 rounded-lg text-xs">
                          {locale === 'ar' ? formData.cta_text_ar : formData.cta_text_en}
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Left/Right Position Layout */
                    <div
                      className={`
                      relative z-10 h-full p-4 flex items-center justify-between gap-3
                      ${formData.image_position === 'start' ? 'flex-row-reverse' : 'flex-row'}
                    `}
                    >
                      <div
                        className={`flex-1 ${formData.image_position === 'start' ? 'text-end' : 'text-start'}`}
                      >
                        {formData.badge_text_ar && (
                          <div className="inline-block mb-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg px-2.5 py-1">
                            <span className="text-white font-bold text-xs">
                              {locale === 'ar' ? formData.badge_text_ar : formData.badge_text_en}
                            </span>
                          </div>
                        )}
                        <h3 className="text-white font-bold text-base mb-1">
                          {(locale === 'ar' ? formData.title_ar : formData.title_en) ||
                            (locale === 'ar' ? 'عنوان العرض' : 'Offer Title')}
                        </h3>
                        {formData.description_ar && (
                          <p className="text-white/85 text-xs mb-2 line-clamp-2">
                            {locale === 'ar' ? formData.description_ar : formData.description_en}
                          </p>
                        )}
                        {formData.cta_text_ar && (
                          <button className="bg-white text-slate-900 font-semibold px-3 py-1.5 rounded-lg text-xs">
                            {locale === 'ar' ? formData.cta_text_ar : formData.cta_text_en}
                          </button>
                        )}
                      </div>

                      {formData.image_url ? (
                        <div
                          className="flex-shrink-0 relative"
                          style={{
                            height: IMAGE_SIZE_CONFIG[formData.image_size].maxHeight,
                            width: IMAGE_SIZE_CONFIG[formData.image_size].maxWidth,
                            maxWidth: IMAGE_SIZE_CONFIG[formData.image_size].maxWidth,
                          }}
                        >
                          <Image
                            src={formData.image_url}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 30vw, 150px"
                            className="object-contain drop-shadow-xl"
                          />
                        </div>
                      ) : (
                        <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 bg-white/10 rounded-xl flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-white/50" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Info Notice */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">
                    {locale === 'ar' ? 'ملاحظة هامة' : 'Important Note'}
                  </p>
                  <p>
                    {locale === 'ar'
                      ? 'سيتم مراجعة البانر من قبل الإدارة قبل نشره. يُفضل تقديم الطلب قبل 3 أيام على الأقل من تاريخ البدء المطلوب.'
                      : "The banner will be reviewed by admin before publishing. It's recommended to submit the request at least 3 days before the desired start date."}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    saving || !formData.title_ar || !formData.title_en || !formData.starts_at
                  }
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      {locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 me-2" />
                      {isEditing
                        ? locale === 'ar'
                          ? 'إعادة الإرسال للمراجعة'
                          : 'Resubmit for Review'
                        : locale === 'ar'
                          ? 'إرسال للمراجعة'
                          : 'Submit for Review'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData(defaultFormData);
                    setIsEditing(false);
                    setEditingBannerId(null);
                  }}
                  className="border-slate-300"
                >
                  <X className="w-4 h-4 me-2" />
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cannot create notice */}
        {!canCreateBanner && !currentBanner && (
          <Card className="bg-white border-slate-200">
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-slate-600">
                {locale === 'ar'
                  ? 'لديك بانر نشط أو قيد المراجعة. يمكنك إنشاء بانر جديد بعد انتهاء البانر الحالي.'
                  : 'You have an active or pending banner. You can create a new one after the current banner expires.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ProviderLayout>
  );
}
