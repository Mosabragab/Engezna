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
  Upload,
  Link as LinkIcon,
  Users,
  Store,
  Info,
  FileImage,
} from 'lucide-react';

// Helper function to calculate color luminance and determine if text should be dark or light
function getContrastTextColor(hexColor: string): 'light' | 'dark' {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? 'dark' : 'light';
}

function getGradientTextColor(startColor: string, endColor: string): 'light' | 'dark' {
  const startLuminance = getContrastTextColor(startColor);
  const endLuminance = getContrastTextColor(endColor);
  if (startLuminance === 'dark' || endLuminance === 'dark') {
    return 'dark';
  }
  return 'light';
}

// Import banner color palette
import {
  BANNER_GRADIENTS,
  ADMIN_COLOR_OPTIONS_GROUPED,
  COLOR_CATEGORY_LABELS,
  getBannerGradient,
  findGradientByColors,
} from '@/constants/colors';

// Pastel Color Presets (Soft colors for light backgrounds)
const PASTEL_PRESETS = [
  { name: { ar: 'كريمي دافئ', en: 'Warm Cream' }, start: '#FEF3C7', end: '#FEF9C3' },
  { name: { ar: 'بيج ناعم', en: 'Soft Beige' }, start: '#F5EBDC', end: '#EDE0CD' },
  { name: { ar: 'نعناعي ناعم', en: 'Soft Mint' }, start: '#D1FAE5', end: '#A7F3D0' },
  { name: { ar: 'وردي ناعم', en: 'Soft Rose' }, start: '#FFE4E6', end: '#FECDD3' },
  { name: { ar: 'خوخي', en: 'Soft Peach' }, start: '#FFEDD5', end: '#FED7AA' },
  { name: { ar: 'زهري ناعم', en: 'Soft Pink' }, start: '#FCE7F3', end: '#FBCFE8' },
  { name: { ar: 'لافندر ناعم', en: 'Soft Lavender' }, start: '#EDE9FE', end: '#DDD6FE' },
  { name: { ar: 'فيروزي ناعم', en: 'Soft Teal' }, start: '#CCFBF1', end: '#99F6E4' },
  { name: { ar: 'عنبري ناعم', en: 'Soft Amber' }, start: '#FEF3C7', end: '#FDE68A' },
  { name: { ar: 'سماوي ناعم', en: 'Soft Sky' }, start: '#E0F2FE', end: '#BAE6FD' },
];

import { motion, AnimatePresence, Reorder } from 'framer-motion';

export const dynamic = 'force-dynamic';

interface HomepageBanner {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  background_color: string | null;
  gradient_start: string | null;
  gradient_end: string | null;
  badge_text_ar: string | null;
  badge_text_en: string | null;
  has_glassmorphism: boolean;
  cta_text_ar: string | null;
  cta_text_en: string | null;
  link_url: string | null;
  link_type: string | null;
  link_id: string | null;
  image_position: 'start' | 'end' | 'center';
  image_size: ImageSize;
  is_countdown_active: boolean;
  countdown_end_time: string | null;
  display_order: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  governorate_id: string | null;
  city_id: string | null;
  banner_type: 'customer' | 'partner';
  approval_status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | null;
  rejection_reason?: string | null;
  provider_id?: string | null;
}

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface City {
  id: string;
  name_ar: string;
  name_en: string;
  governorate_id: string;
  is_active: boolean;
}

type FilterStatus =
  | 'all'
  | 'active'
  | 'inactive'
  | 'expired'
  | 'scheduled'
  | 'pending'
  | 'rejected';

type ImagePosition = 'start' | 'end' | 'center';
type ImageSize = 'small' | 'medium' | 'large';

// Image sizes using fixed pixel values for consistent display
const IMAGE_SIZE_CONFIG: Record<
  ImageSize,
  { label_ar: string; label_en: string; containerClass: string; imgClass: string }
> = {
  small: {
    label_ar: 'صغير',
    label_en: 'Small',
    containerClass: 'w-20 h-20 sm:w-24 sm:h-24',
    imgClass: 'max-w-full max-h-full object-contain',
  },
  medium: {
    label_ar: 'وسط',
    label_en: 'Medium',
    containerClass: 'w-28 h-28 sm:w-32 sm:h-32',
    imgClass: 'max-w-full max-h-full object-contain',
  },
  large: {
    label_ar: 'كبير',
    label_en: 'Large',
    containerClass: 'w-36 h-36 sm:w-40 sm:h-40',
    imgClass: 'max-w-full max-h-full object-contain',
  },
};

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
  image_size: 'medium' as ImageSize,
  is_countdown_active: false,
  countdown_end_time: '',
  is_active: true,
  starts_at: new Date().toISOString().split('T')[0],
  ends_at: '',
  governorate_id: '' as string,
  city_id: '' as string,
};

// Live Preview Component
function BannerPreview({
  data,
  locale,
  viewMode,
}: {
  data: typeof defaultFormData & { image_position: ImagePosition; image_size: ImageSize };
  locale: string;
  viewMode: 'mobile' | 'desktop';
}) {
  const title = locale === 'ar' ? data.title_ar : data.title_en;
  const description = locale === 'ar' ? data.description_ar : data.description_en;
  const badgeText = locale === 'ar' ? data.badge_text_ar : data.badge_text_en;
  const ctaText = locale === 'ar' ? data.cta_text_ar : data.cta_text_en;

  const gradientStyle = {
    background: `linear-gradient(135deg, ${data.gradient_start} 0%, ${data.gradient_end} 100%)`,
  };

  // Determine text color based on background brightness
  const textMode = getGradientTextColor(data.gradient_start, data.gradient_end);
  const isDarkText = textMode === 'dark';

  // Dynamic text color classes
  const textColorClass = isDarkText ? 'text-slate-800' : 'text-white';
  const textColorSecondary = isDarkText ? 'text-slate-600' : 'text-white/85';
  const badgeBgClass = isDarkText
    ? data.has_glassmorphism
      ? 'bg-slate-800/15 backdrop-blur-md border border-slate-800/20'
      : 'bg-slate-800/20'
    : data.has_glassmorphism
      ? 'bg-white/20 backdrop-blur-md border border-white/30'
      : 'bg-white/25';
  const badgeTextClass = isDarkText ? 'text-slate-800' : 'text-white';
  const decorativeCircleClass = isDarkText ? 'bg-slate-800/5' : 'bg-white/10';
  const ctaButtonClass = isDarkText
    ? 'bg-slate-800 text-white hover:bg-slate-700'
    : 'bg-white text-slate-900 hover:bg-white/95';
  const countdownBgClass = isDarkText ? 'bg-slate-800/10' : 'bg-white/20';
  const countdownTextClass = isDarkText ? 'text-slate-700' : 'text-white/90';
  const placeholderIconClass = isDarkText ? 'text-slate-800/30' : 'text-white/50';
  const placeholderBgClass = isDarkText ? 'bg-slate-800/5' : 'bg-white/10';

  const imageOnStart = data.image_position === 'start';
  const imageOnCenter = data.image_position === 'center';
  const sizeConfig = IMAGE_SIZE_CONFIG[data.image_size];

  return (
    <div
      className={`
        ${viewMode === 'mobile' ? 'w-[280px]' : 'w-full max-w-[400px]'}
        mx-auto
      `}
    >
      <div className="relative overflow-hidden rounded-2xl aspect-[16/9]" style={gradientStyle}>
        {/* Decorative Circles */}
        <div
          className={`absolute -top-10 -end-10 w-32 h-32 ${decorativeCircleClass} rounded-full blur-sm`}
        />
        <div
          className={`absolute -bottom-6 -start-6 w-24 h-24 ${decorativeCircleClass} rounded-full blur-sm`}
        />

        {/* Center Position Layout */}
        {imageOnCenter ? (
          <div className="relative z-10 h-full p-4 flex flex-col items-center justify-center text-center">
            {data.image_url && (
              <div className={`${sizeConfig.containerClass} flex-shrink-0 mb-2`}>
                <img
                  src={data.image_url}
                  alt=""
                  className={`${sizeConfig.imgClass} object-contain drop-shadow-xl`}
                />
              </div>
            )}
            {badgeText && (
              <div className={`inline-block mb-1 ${badgeBgClass} rounded-lg px-2.5 py-1`}>
                <span className={`${badgeTextClass} font-bold text-xs`}>{badgeText}</span>
              </div>
            )}
            <h3 className={`${textColorClass} font-bold text-base mb-1 leading-tight`}>
              {title || (locale === 'ar' ? 'عنوان العرض' : 'Offer Title')}
            </h3>
            {description && (
              <p className={`${textColorSecondary} text-xs mb-2 line-clamp-1`}>{description}</p>
            )}
            {ctaText && (
              <button className={`${ctaButtonClass} font-semibold px-3 py-1.5 rounded-lg text-xs`}>
                {ctaText}
              </button>
            )}
          </div>
        ) : (
          /* Left/Right Position Layout */
          <div
            className={`
            relative z-10 h-full p-4
            flex ${imageOnStart ? 'flex-row-reverse' : 'flex-row'}
            items-center justify-between gap-3
          `}
          >
            <div className={`flex-1 ${imageOnStart ? 'text-end' : 'text-start'}`}>
              {/* Badge */}
              {badgeText && (
                <div className={`inline-block mb-2 ${badgeBgClass} rounded-lg px-2.5 py-1`}>
                  <span className={`${badgeTextClass} font-bold text-xs`}>
                    {badgeText || (locale === 'ar' ? 'شارة' : 'Badge')}
                  </span>
                </div>
              )}

              {/* Title */}
              <h3 className={`${textColorClass} font-bold text-base mb-1 leading-tight`}>
                {title || (locale === 'ar' ? 'عنوان العرض' : 'Offer Title')}
              </h3>

              {/* Description */}
              {description && (
                <p className={`${textColorSecondary} text-xs mb-2 line-clamp-2`}>{description}</p>
              )}

              {/* Countdown */}
              {data.is_countdown_active && (
                <div className={`flex items-center gap-1 ${countdownTextClass} text-xs mb-2`}>
                  <Clock className="w-3 h-3" />
                  <span className={`${countdownBgClass} rounded px-1`}>00</span>:
                  <span className={`${countdownBgClass} rounded px-1`}>00</span>:
                  <span className={`${countdownBgClass} rounded px-1`}>00</span>
                </div>
              )}

              {/* CTA Button */}
              {ctaText && (
                <button
                  className={`${ctaButtonClass} font-semibold px-3 py-1.5 rounded-lg text-xs`}
                >
                  {ctaText}
                </button>
              )}
            </div>

            {/* Product Image */}
            {data.image_url ? (
              <div className={`${sizeConfig.containerClass} flex-shrink-0`}>
                <img
                  src={data.image_url}
                  alt=""
                  className={`${sizeConfig.imgClass} object-contain drop-shadow-xl`}
                />
              </div>
            ) : (
              <div
                className={`${sizeConfig.containerClass} flex-shrink-0 ${placeholderBgClass} rounded-xl flex items-center justify-center`}
              >
                <ImageIcon className={`w-8 h-8 ${placeholderIconClass}`} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminBannersPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Banner type selector
  const [bannerType, setBannerType] = useState<'customer' | 'partner'>('customer');

  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [filteredBanners, setFilteredBanners] = useState<HomepageBanner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HomepageBanner | null>(null);
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState(defaultFormData);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload');

  // Location targeting state
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    expired: 0,
  });

  useEffect(() => {
    checkAuth();
    loadLocations();
  }, []);

  useEffect(() => {
    filterBanners();
  }, [banners, searchQuery, statusFilter]);

  // Reload banners when banner type changes
  useEffect(() => {
    if (isAdmin) {
      loadBanners();
    }
  }, [bannerType, isAdmin]);

  // Filter cities when governorate changes
  useEffect(() => {
    if (formData.governorate_id) {
      setFilteredCities(cities.filter((c) => c.governorate_id === formData.governorate_id));
    } else {
      setFilteredCities([]);
    }
    // Reset city when governorate changes
    if (formData.city_id) {
      const cityBelongsToGovernorate = cities.some(
        (c) => c.id === formData.city_id && c.governorate_id === formData.governorate_id
      );
      if (!cityBelongsToGovernorate) {
        setFormData((prev) => ({ ...prev, city_id: '' }));
      }
    }
  }, [formData.governorate_id, cities]);

  async function loadLocations() {
    const supabase = createClient();
    const [govResult, cityResult] = await Promise.all([
      supabase.from('governorates').select('*').eq('is_active', true).order('name_ar'),
      supabase.from('cities').select('*').eq('is_active', true).order('name_ar'),
    ]);
    setGovernorates(govResult.data || []);
    setCities(cityResult.data || []);
  }

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
        await loadBanners();
      }
    }

    setLoading(false);
  }

  async function loadBanners() {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('homepage_banners')
        .select('*')
        .eq('banner_type', bannerType)
        .order('display_order', { ascending: true });

      if (error) {
        setBanners([]);
        return;
      }

      setBanners(data || []);

      // Calculate stats
      const now = new Date();
      const active = (data || []).filter(
        (b) =>
          b.is_active && new Date(b.starts_at) <= now && (!b.ends_at || new Date(b.ends_at) >= now)
      ).length;
      const scheduled = (data || []).filter(
        (b) => b.is_active && new Date(b.starts_at) > now
      ).length;
      const expired = (data || []).filter((b) => b.ends_at && new Date(b.ends_at) < now).length;

      setStats({
        total: (data || []).length,
        active,
        scheduled,
        expired,
      });
    } catch {
      setBanners([]);
    }
  }

  function filterBanners() {
    let filtered = [...banners];
    const now = new Date();

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title_ar?.toLowerCase().includes(query) ||
          b.title_en?.toLowerCase().includes(query) ||
          b.description_ar?.toLowerCase().includes(query) ||
          b.description_en?.toLowerCase().includes(query)
      );
    }

    switch (statusFilter) {
      case 'active':
        filtered = filtered.filter(
          (b) =>
            b.is_active &&
            new Date(b.starts_at) <= now &&
            (!b.ends_at || new Date(b.ends_at) >= now)
        );
        break;
      case 'inactive':
        filtered = filtered.filter(
          (b) => !b.is_active && b.approval_status !== 'rejected' && b.approval_status !== 'pending'
        );
        break;
      case 'expired':
        filtered = filtered.filter((b) => b.ends_at && new Date(b.ends_at) < now);
        break;
      case 'scheduled':
        filtered = filtered.filter((b) => b.is_active && new Date(b.starts_at) > now);
        break;
      case 'pending':
        filtered = filtered.filter((b) => b.approval_status === 'pending');
        break;
      case 'rejected':
        filtered = filtered.filter(
          (b) => b.approval_status === 'rejected' || b.approval_status === 'cancelled'
        );
        break;
    }

    setFilteredBanners(filtered);
  }

  async function handleSaveBanner() {
    setIsSaving(true);
    const supabase = createClient();

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
        image_size: formData.image_size,
        is_countdown_active: formData.is_countdown_active,
        countdown_end_time:
          formData.is_countdown_active && formData.countdown_end_time
            ? new Date(formData.countdown_end_time).toISOString()
            : null,
        is_active: formData.is_active,
        starts_at: new Date(formData.starts_at).toISOString(),
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        governorate_id: formData.governorate_id || null,
        city_id: formData.city_id || null,
        banner_type: bannerType,
      };

      if (editingBanner) {
        // Update existing
        const { error } = await supabase
          .from('homepage_banners')
          .update(bannerData)
          .eq('id', editingBanner.id);

        if (error) throw error;
      } else {
        // Create new
        const maxOrder =
          banners.length > 0 ? Math.max(...banners.map((b) => b.display_order)) + 1 : 0;

        const { error } = await supabase.from('homepage_banners').insert({
          ...bannerData,
          display_order: maxOrder,
          created_by: user?.id,
        });

        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingBanner(null);
      resetForm();
      await loadBanners();

      // Show success message
      const message = editingBanner
        ? locale === 'ar'
          ? 'تم حفظ التعديلات بنجاح'
          : 'Changes saved successfully'
        : locale === 'ar'
          ? 'تم إنشاء البانر بنجاح'
          : 'Banner created successfully';
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      alert(locale === 'ar' ? 'حدث خطأ أثناء حفظ البانر' : 'Error saving banner');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(banner: HomepageBanner) {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('homepage_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);

      if (error) throw error;
      await loadBanners();
    } catch {
      // Error handled silently
    }
  }

  async function handleDelete(bannerId: string) {
    if (
      !confirm(
        locale === 'ar'
          ? 'هل أنت متأكد من حذف هذا البانر؟'
          : 'Are you sure you want to delete this banner?'
      )
    ) {
      return;
    }

    const supabase = createClient();

    try {
      const { error } = await supabase.from('homepage_banners').delete().eq('id', bannerId);

      if (error) throw error;
      await loadBanners();
    } catch {
      // Error handled silently
    }
  }

  async function handleReorder(newOrder: HomepageBanner[]) {
    setBanners(newOrder);

    const supabase = createClient();

    // Update display_order for all banners
    try {
      const updates = newOrder.map((banner, index) => ({
        id: banner.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('homepage_banners')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    } catch {
      // Reload on error
      await loadBanners();
    }
  }

  function resetForm() {
    setFormData(defaultFormData);
    setUploadMode('upload');
  }

  // Handle image upload
  async function handleImageUpload(file: File) {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert(
        locale === 'ar'
          ? 'نوع الملف غير مدعوم. استخدم PNG, JPG, WebP, أو GIF'
          : 'Unsupported file type. Use PNG, JPG, WebP, or GIF'
      );
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert(
        locale === 'ar' ? 'حجم الملف كبير جداً. الحد الأقصى 2MB' : 'File too large. Maximum 2MB'
      );
      return;
    }

    setIsUploading(true);

    try {
      const supabase = createClient();

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `banner-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage.from('public-assets').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) {
        // If bucket doesn't exist, show helpful message
        if (error.message.includes('bucket') || error.message.includes('not found')) {
          alert(
            locale === 'ar'
              ? 'يرجى إنشاء bucket باسم "public-assets" في Supabase Storage أولاً'
              : 'Please create a bucket named "public-assets" in Supabase Storage first'
          );
        } else {
          throw error;
        }
        return;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('public-assets').getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
    } catch (error) {
      console.error('Upload error:', error);
      alert(locale === 'ar' ? 'حدث خطأ أثناء رفع الصورة' : 'Error uploading image');
    } finally {
      setIsUploading(false);
    }
  }

  // Handle drag and drop
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function openEditModal(banner: HomepageBanner) {
    setEditingBanner(banner);
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
      image_position: banner.image_position || 'end',
      image_size: banner.image_size || 'medium',
      is_countdown_active: banner.is_countdown_active,
      countdown_end_time: banner.countdown_end_time
        ? new Date(banner.countdown_end_time).toISOString().slice(0, 16)
        : '',
      is_active: banner.is_active,
      starts_at: new Date(banner.starts_at).toISOString().split('T')[0],
      ends_at: banner.ends_at ? new Date(banner.ends_at).toISOString().split('T')[0] : '',
      governorate_id: banner.governorate_id || '',
      city_id: banner.city_id || '',
    });
    setShowCreateModal(true);
  }

  const getStatusBadge = (banner: HomepageBanner) => {
    const now = new Date();
    const startsAt = new Date(banner.starts_at);
    const endsAt = banner.ends_at ? new Date(banner.ends_at) : null;

    if (endsAt && endsAt < now) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
          <Calendar className="w-3 h-3" />
          {locale === 'ar' ? 'منتهي' : 'Expired'}
        </span>
      );
    }

    if (startsAt > now) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
          <Clock className="w-3 h-3" />
          {locale === 'ar' ? 'مجدول' : 'Scheduled'}
        </span>
      );
    }

    if (!banner.is_active) {
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          {locale === 'ar' ? 'غير مفعل' : 'Inactive'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" />
        {locale === 'ar' ? 'نشط' : 'Active'}
      </span>
    );
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
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'بانرات الصفحة الرئيسية' : 'Homepage Banners'}
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
              <button
                onClick={() => setSuccessMessage(null)}
                className="ms-2 hover:bg-white/20 rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Banner Type Selector Tabs */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 me-2">
              {locale === 'ar' ? 'نوع البانر:' : 'Banner Type:'}
            </span>
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setBannerType('customer')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${
                    bannerType === 'customer'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }
                `}
              >
                <Users className="w-4 h-4" />
                {locale === 'ar' ? 'بانرات العملاء' : 'Customer Banners'}
              </button>
              <button
                onClick={() => setBannerType('partner')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${
                    bannerType === 'partner'
                      ? 'bg-[#00C27A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }
                `}
              >
                <Store className="w-4 h-4" />
                {locale === 'ar' ? 'بانرات الشركاء' : 'Partner Banners'}
              </button>
            </div>
            <span className="text-xs text-slate-500 ms-auto">
              {bannerType === 'customer'
                ? locale === 'ar'
                  ? 'تظهر في الصفحة الرئيسية للعملاء'
                  : 'Shown on customer homepage'
                : locale === 'ar'
                  ? 'تظهر في صفحة الشركاء'
                  : 'Shown on partner landing page'}
            </span>
          </div>
        </div>

        {/* Provider Banners Approvals Link */}
        <Link href={`/${locale}/admin/banners/approvals`} className="block mb-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 hover:border-amber-300 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">
                    {locale === 'ar' ? 'طلبات بانرات التجار' : 'Provider Banner Requests'}
                  </h3>
                  <p className="text-sm text-amber-700">
                    {locale === 'ar'
                      ? 'مراجعة طلبات البانرات من التجار'
                      : 'Review banner requests from providers'}
                  </p>
                </div>
              </div>
              <div
                className={`p-2 rounded-lg bg-amber-100 group-hover:bg-amber-200 transition-colors ${isRTL ? 'rotate-180' : ''}`}
              >
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <ImageIcon className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'إجمالي البانرات' : 'Total Banners'}
              </span>
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
              <span className="text-sm text-blue-700">
                {locale === 'ar' ? 'مجدول' : 'Scheduled'}
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{stats.scheduled}</p>
          </div>
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-300">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              <span className="text-sm text-slate-600">
                {locale === 'ar' ? 'منتهي' : 'Expired'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-700">{stats.expired}</p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
              />
              <input
                type="text"
                placeholder={
                  locale === 'ar' ? 'بحث بالعنوان أو الوصف...' : 'Search by title or description...'
                }
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
              <option value="pending">
                {locale === 'ar' ? 'في انتظار الموافقة' : 'Pending Approval'}
              </option>
              <option value="rejected">
                {locale === 'ar' ? 'مرفوض/ملغي' : 'Rejected/Cancelled'}
              </option>
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
                resetForm();
                setEditingBanner(null);
                setShowCreateModal(true);
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
                        <img src={banner.image_url} alt="" className="w-10 h-10 object-contain" />
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
                  <div className="flex-shrink-0">{getStatusBadge(banner)}</div>

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
                      title={
                        banner.is_active
                          ? locale === 'ar'
                            ? 'إلغاء التفعيل'
                            : 'Deactivate'
                          : locale === 'ar'
                            ? 'تفعيل'
                            : 'Activate'
                      }
                    >
                      {banner.is_active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
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
                  resetForm();
                  setEditingBanner(null);
                  setShowCreateModal(true);
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
                    ? locale === 'ar'
                      ? 'تعديل البانر'
                      : 'Edit Banner'
                    : locale === 'ar'
                      ? 'إنشاء بانر جديد'
                      : 'Create New Banner'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingBanner(null);
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
                          onChange={(e) =>
                            setFormData({ ...formData, description_ar: e.target.value })
                          }
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
                          onChange={(e) =>
                            setFormData({ ...formData, description_en: e.target.value })
                          }
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
                          onChange={(e) =>
                            setFormData({ ...formData, badge_text_ar: e.target.value })
                          }
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
                          onChange={(e) =>
                            setFormData({ ...formData, badge_text_en: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="30% OFF"
                        />
                      </div>
                    </div>

                    {/* Image Upload / URL */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar'
                          ? 'صورة المنتج (PNG مفرغ مفضل)'
                          : 'Product Image (Transparent PNG preferred)'}
                      </label>

                      {/* Toggle between Upload and URL */}
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setUploadMode('upload')}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            uploadMode === 'upload'
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Upload className="w-4 h-4" />
                          {locale === 'ar' ? 'رفع' : 'Upload'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadMode('url')}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            uploadMode === 'url'
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <LinkIcon className="w-4 h-4" />
                          {locale === 'ar' ? 'رابط' : 'URL'}
                        </button>
                      </div>

                      {uploadMode === 'upload' ? (
                        <div
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          className={`
                            relative border-2 border-dashed rounded-xl p-6 text-center transition-colors
                            ${isUploading ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary'}
                          `}
                        >
                          {isUploading ? (
                            <div className="flex flex-col items-center gap-2">
                              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                              <p className="text-sm text-slate-600">
                                {locale === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
                              </p>
                            </div>
                          ) : formData.image_url ? (
                            <div className="flex flex-col items-center gap-3">
                              <img
                                src={formData.image_url}
                                alt="Preview"
                                className="w-20 h-20 object-contain rounded-lg bg-slate-100"
                              />
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
                                  accept="image/png,image/jpeg,image/webp,image/gif"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(file);
                                  }}
                                />
                              </label>
                              <p className="text-xs text-slate-400 mt-2">
                                PNG, JPG, WebP, GIF -{' '}
                                {locale === 'ar' ? 'الحد الأقصى 2MB' : 'Max 2MB'}
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <input
                          type="url"
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
                          placeholder="https://example.com/pizza.png"
                        />
                      )}

                      {/* Image Specifications Guide */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileImage className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                              <Info className="w-4 h-4" />
                              {locale === 'ar'
                                ? 'مواصفات الصورة المثالية'
                                : 'Optimal Image Specifications'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="space-y-1.5">
                                <p className="text-blue-800">
                                  <span className="font-medium">
                                    {locale === 'ar' ? 'النوع:' : 'Type:'}
                                  </span>{' '}
                                  <span className="text-blue-600">
                                    PNG{' '}
                                    {locale === 'ar'
                                      ? '(مفرغ الخلفية)'
                                      : '(transparent background)'}
                                  </span>
                                </p>
                                <p className="text-blue-800">
                                  <span className="font-medium">
                                    {locale === 'ar' ? 'الأبعاد:' : 'Dimensions:'}
                                  </span>{' '}
                                  <span className="text-blue-600">
                                    400x400 px {locale === 'ar' ? 'أو أكبر' : 'or larger'}
                                  </span>
                                </p>
                                <p className="text-blue-800">
                                  <span className="font-medium">
                                    {locale === 'ar' ? 'الحجم:' : 'Size:'}
                                  </span>{' '}
                                  <span className="text-blue-600">
                                    {locale === 'ar' ? 'أقل من 2MB' : 'Less than 2MB'}
                                  </span>
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-blue-800">
                                  <span className="font-medium">
                                    {locale === 'ar' ? 'النسبة:' : 'Aspect Ratio:'}
                                  </span>{' '}
                                  <span className="text-blue-600">
                                    1:1 {locale === 'ar' ? '(مربع)' : '(square)'}
                                  </span>
                                </p>
                                <p className="text-blue-800">
                                  <span className="font-medium">
                                    {locale === 'ar' ? 'الصيغ:' : 'Formats:'}
                                  </span>{' '}
                                  <span className="text-blue-600">PNG, JPG, WebP, GIF</span>
                                </p>
                                <p className="text-blue-800">
                                  <span className="font-medium">
                                    {locale === 'ar' ? 'الدقة:' : 'Resolution:'}
                                  </span>{' '}
                                  <span className="text-blue-600">72-150 DPI</span>
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <p className="text-xs text-blue-700">
                                {locale === 'ar'
                                  ? 'نصيحة: استخدم صور منتجات بخلفية شفافة (PNG) للحصول على أفضل نتيجة. يمكنك استخدام أدوات مثل remove.bg لإزالة الخلفية.'
                                  : 'Tip: Use product images with transparent background (PNG) for best results. You can use tools like remove.bg to remove backgrounds.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gradient Colors */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'ألوان التدرج' : 'Gradient Colors'}
                      </label>

                      {/* Pastel Colors Section */}
                      <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs font-medium text-slate-600 mb-2">
                          {locale === 'ar'
                            ? 'ألوان الباستيل (خلفيات فاتحة)'
                            : 'Pastel Colors (Light backgrounds)'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {PASTEL_PRESETS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  gradient_start: preset.start,
                                  gradient_end: preset.end,
                                })
                              }
                              className={`
                                group relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                                border hover:scale-105
                                ${
                                  formData.gradient_start === preset.start &&
                                  formData.gradient_end === preset.end
                                    ? 'border-primary ring-2 ring-primary/30'
                                    : 'border-slate-200 hover:border-slate-300'
                                }
                              `}
                              style={{
                                background: `linear-gradient(135deg, ${preset.start} 0%, ${preset.end} 100%)`,
                              }}
                            >
                              <span className="relative z-10 text-slate-700 drop-shadow-sm">
                                {locale === 'ar' ? preset.name.ar : preset.name.en}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vibrant Colors Section */}
                      <div className="space-y-3 mb-4">
                        <p className="text-xs font-medium text-slate-600">
                          {locale === 'ar'
                            ? 'الألوان الزاهية (للعروض والترويج)'
                            : 'Vibrant Colors (For offers & promotions)'}
                        </p>
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

                      {/* Custom Color Pickers */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">
                            {locale === 'ar' ? 'بداية' : 'Start'}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData.gradient_start}
                              onChange={(e) =>
                                setFormData({ ...formData, gradient_start: e.target.value })
                              }
                              className="w-10 h-9 border border-slate-200 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={formData.gradient_start}
                              onChange={(e) =>
                                setFormData({ ...formData, gradient_start: e.target.value })
                              }
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary font-mono text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">
                            {locale === 'ar' ? 'نهاية' : 'End'}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData.gradient_end}
                              onChange={(e) =>
                                setFormData({ ...formData, gradient_end: e.target.value })
                              }
                              className="w-10 h-9 border border-slate-200 rounded-lg cursor-pointer"
                            />
                            <input
                              type="text"
                              value={formData.gradient_end}
                              onChange={(e) =>
                                setFormData({ ...formData, gradient_end: e.target.value })
                              }
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Image Position & Size */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    {/* Glassmorphism */}
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.has_glassmorphism}
                          onChange={(e) =>
                            setFormData({ ...formData, has_glassmorphism: e.target.checked })
                          }
                          className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-slate-700">
                          {locale === 'ar' ? 'تأثير الزجاج على الشارة' : 'Glassmorphism on Badge'}
                        </span>
                      </label>
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
                          onChange={(e) =>
                            setFormData({ ...formData, cta_text_ar: e.target.value })
                          }
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
                          onChange={(e) =>
                            setFormData({ ...formData, cta_text_en: e.target.value })
                          }
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
                          <option value="promo">
                            {locale === 'ar' ? 'كود خصم' : 'Promo Code'}
                          </option>
                          <option value="external">
                            {locale === 'ar' ? 'رابط خارجي' : 'External'}
                          </option>
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
                            onChange={(e) =>
                              setFormData({ ...formData, is_countdown_active: e.target.checked })
                            }
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
                            onChange={(e) =>
                              setFormData({ ...formData, countdown_end_time: e.target.value })
                            }
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

                    {/* Location Targeting */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <h4 className="font-medium text-slate-800 mb-3">
                        {locale === 'ar' ? 'استهداف الموقع الجغرافي' : 'Location Targeting'}
                      </h4>
                      <p className="text-xs text-slate-500 mb-3">
                        {locale === 'ar'
                          ? 'حدد المحافظة والمدينة لإظهار البانر لعملاء منطقة معينة فقط. اتركه فارغاً لإظهاره للجميع.'
                          : 'Select governorate and city to show this banner only to customers in that area. Leave empty to show to everyone.'}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {locale === 'ar' ? 'المحافظة' : 'Governorate'}
                          </label>
                          <select
                            value={formData.governorate_id}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                governorate_id: e.target.value,
                                city_id: '',
                              })
                            }
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary bg-white"
                          >
                            <option value="">{locale === 'ar' ? 'كل مصر' : 'All Egypt'}</option>
                            {governorates.map((gov) => (
                              <option key={gov.id} value={gov.id}>
                                {locale === 'ar' ? gov.name_ar : gov.name_en}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {locale === 'ar' ? 'المدينة' : 'City'}
                          </label>
                          <select
                            value={formData.city_id}
                            onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                            disabled={!formData.governorate_id}
                          >
                            <option value="">
                              {formData.governorate_id
                                ? locale === 'ar'
                                  ? 'كل مدن المحافظة'
                                  : 'All cities in governorate'
                                : locale === 'ar'
                                  ? 'اختر المحافظة أولاً'
                                  : 'Select governorate first'}
                            </option>
                            {filteredCities.map((city) => (
                              <option key={city.id} value={city.id}>
                                {locale === 'ar' ? city.name_ar : city.name_en}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {/* Location targeting indicator */}
                      {formData.governorate_id && (
                        <div className="mt-3 text-xs text-primary flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {formData.city_id
                            ? locale === 'ar'
                              ? `سيظهر فقط لعملاء ${filteredCities.find((c) => c.id === formData.city_id)?.name_ar || ''}`
                              : `Will show only to customers in ${filteredCities.find((c) => c.id === formData.city_id)?.name_en || ''}`
                            : locale === 'ar'
                              ? `سيظهر لكل عملاء ${governorates.find((g) => g.id === formData.governorate_id)?.name_ar || ''}`
                              : `Will show to all customers in ${governorates.find((g) => g.id === formData.governorate_id)?.name_en || ''}`}
                        </div>
                      )}
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
                          ? locale === 'ar'
                            ? 'عرض الموبايل'
                            : 'Mobile View'
                          : locale === 'ar'
                            ? 'عرض الديسكتوب'
                            : 'Desktop View'}
                      </p>
                      <BannerPreview data={formData} locale={locale} viewMode={previewMode} />
                    </div>

                    {/* Quick Tips */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
                        {locale === 'ar' ? 'نصائح' : 'Tips'}
                      </h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>
                          •{' '}
                          {locale === 'ar'
                            ? 'استخدم صور PNG مفرغة للمنتجات'
                            : 'Use transparent PNG for products'}
                        </li>
                        <li>
                          •{' '}
                          {locale === 'ar'
                            ? 'الألوان الموصى بها: #009DE0, #0088CC, #0077B6'
                            : 'Recommended colors: #009DE0, #0088CC, #0077B6'}
                        </li>
                        <li>
                          •{' '}
                          {locale === 'ar'
                            ? 'نسبة الصورة المثالية 16:9'
                            : 'Optimal aspect ratio is 16:9'}
                        </li>
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
                    setShowCreateModal(false);
                    setEditingBanner(null);
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
                    ? locale === 'ar'
                      ? 'حفظ التعديلات'
                      : 'Save Changes'
                    : locale === 'ar'
                      ? 'إنشاء البانر'
                      : 'Create Banner'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
