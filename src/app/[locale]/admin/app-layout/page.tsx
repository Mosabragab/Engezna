'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import {
  useSDUIAdmin,
  type HomepageSection,
  type SDUIPageType,
  type LayoutVersion,
  type SectionAnalytics,
} from '@/hooks/sdui';
import {
  Layout,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  GripVertical,
  Settings,
  Smartphone,
  Monitor,
  ExternalLink,
  History,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Home,
  Gift,
  UserPlus,
  Store,
  RotateCcw,
  Trash2,
  X,
  Clock,
  GitCompare,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  MousePointerClick,
  CreditCard,
} from 'lucide-react';

// Page configurations
const PAGE_CONFIGS: {
  id: SDUIPageType;
  icon: React.ElementType;
  label: { ar: string; en: string };
  previewPath: string;
}[] = [
  {
    id: 'homepage',
    icon: Home,
    label: { ar: 'الصفحة الرئيسية', en: 'Homepage' },
    previewPath: '',
  },
  {
    id: 'offers',
    icon: Gift,
    label: { ar: 'صفحة العروض', en: 'Offers Page' },
    previewPath: '/offers',
  },
  {
    id: 'welcome',
    icon: UserPlus,
    label: { ar: 'صفحة الترحيب', en: 'Welcome Page' },
    previewPath: '/welcome',
  },
  {
    id: 'providers',
    icon: Store,
    label: { ar: 'صفحة مقدمي الخدمات', en: 'Providers Page' },
    previewPath: '/providers',
  },
];

// Section type icons
const sectionIcons: Record<string, string> = {
  // Homepage
  hero_search: '🔍',
  address_selector: '📍',
  delivery_mode: '🚚',
  offers_carousel: '🎁',
  categories: '📂',
  reorder: '🔄',
  top_rated: '⭐',
  nearby: '📌',
  featured_products: '✨',
  custom_html: '📝',
  announcement: '📢',
  // Offers
  offers_hero: '🎁',
  promo_codes: '🏷️',
  free_delivery: '🚚',
  flash_deals: '⚡',
  category_offers: '📂',
  // Welcome
  welcome_hero: '🏠',
  welcome_categories: '📂',
  welcome_features: '✨',
  welcome_steps: '📋',
  welcome_governorates: '🗺️',
  welcome_cta: '🚀',
  welcome_partners: '🤝',
  // Providers
  providers_header: '🏪',
  providers_search: '🔍',
  providers_categories: '📂',
  providers_filters: '⚙️',
  providers_grid: '📦',
};

interface ExtendedSection extends HomepageSection {
  is_visible?: boolean;
}

export default function AppLayoutPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const { toggle: toggleSidebar } = useAdminSidebar();

  // User state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active page tab
  const [activePage, setActivePage] = useState<SDUIPageType>('homepage');

  // Fetch user on mount
  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    }
    getUser();
  }, []);

  // Fetch payment settings on mount
  useEffect(() => {
    async function loadPaymentSettings() {
      const supabase = createClient();
      const { data } = await supabase
        .from('platform_settings')
        .select('allow_card_payment')
        .single();

      if (data) {
        setAllowCardPayment(data.allow_card_payment ?? true);
      }
      setLoadingPaymentSettings(false);
    }
    loadPaymentSettings();
  }, []);

  const {
    sections: fetchedSections,
    isLoading,
    isSaving,
    error,
    refetch,
    toggleVisibility,
    reorderSections,
    createPreviewDraft,
    saveLayoutVersion,
    fetchVersionHistory,
    rollbackToVersion,
    deleteVersion,
    compareVersions,
    fetchAnalytics,
  } = useSDUIAdmin({ page: activePage });

  // Local state for drag & drop
  const [localSections, setLocalSections] = useState<ExtendedSection[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);

  // Version history state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<LayoutVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<LayoutVersion | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Analytics state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<SectionAnalytics[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Payment settings state
  const [allowCardPayment, setAllowCardPayment] = useState(true);
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(true);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [paymentSettingsSuccess, setPaymentSettingsSuccess] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Sync fetched sections with local state
  useEffect(() => {
    setLocalSections(fetchedSections as ExtendedSection[]);
    setHasChanges(false);
    setPreviewUrl(null);
  }, [fetchedSections]);

  // Drag handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const newSections = [...localSections];
    const draggedItem = newSections[dragItem.current];
    newSections.splice(dragItem.current, 1);
    newSections.splice(dragOverItem.current, 0, draggedItem);

    const reordered = newSections.map((s, idx) => ({
      ...s,
      display_order: idx + 1,
    }));

    setLocalSections(reordered);
    setHasChanges(true);

    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Toggle section visibility
  const handleToggleVisibility = async (sectionId: string) => {
    const section = localSections.find((s) => s.id === sectionId);
    if (!section) return;

    const newVisibility = !(section as any).is_visible;

    setLocalSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, is_visible: newVisibility } : s))
    );

    try {
      await toggleVisibility(sectionId, newVisibility);
    } catch (err) {
      setLocalSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, is_visible: !newVisibility } : s))
      );
    }
  };

  // Save order changes
  const handleSaveOrder = async () => {
    if (!hasChanges) return;

    try {
      const newOrder = localSections.map((s, idx) => ({
        id: s.id,
        order: idx + 1,
      }));

      await reorderSections(newOrder);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  // Create preview
  const handleCreatePreview = async () => {
    try {
      const token = await createPreviewDraft(localSections);
      const pageConfig = PAGE_CONFIGS.find((p) => p.id === activePage);
      const url = `${window.location.origin}/${locale}${pageConfig?.previewPath || ''}?preview=${token}`;
      setPreviewUrl(url);
      window.open(url, '_blank', 'width=430,height=800,scrollbars=yes');
    } catch (err) {
      console.error('Failed to create preview:', err);
    }
  };

  // Save version
  const handleSaveVersion = async () => {
    setSavingVersion(true);
    try {
      const pageConfig = PAGE_CONFIGS.find((p) => p.id === activePage);
      await saveLayoutVersion(
        `${pageConfig?.label[isRTL ? 'ar' : 'en']} - ${new Date().toLocaleString(locale)}`
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save version:', err);
    } finally {
      setSavingVersion(false);
    }
  };

  // Move section
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localSections.length) return;

    const newSections = [...localSections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];

    const reordered = newSections.map((s, idx) => ({
      ...s,
      display_order: idx + 1,
    }));

    setLocalSections(reordered);
    setHasChanges(true);
  };

  // Load version history
  const handleLoadVersionHistory = async () => {
    setShowVersionHistory(true);
    setLoadingVersions(true);
    try {
      const versionHistory = await fetchVersionHistory();
      setVersions(versionHistory);
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  // Rollback to version
  const handleRollback = async (versionId: string) => {
    if (
      !confirm(
        isRTL
          ? 'هل أنت متأكد من استعادة هذه النسخة؟'
          : 'Are you sure you want to rollback to this version?'
      )
    ) {
      return;
    }
    setIsRollingBack(true);
    try {
      await rollbackToVersion(versionId);
      setShowVersionHistory(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to rollback:', err);
    } finally {
      setIsRollingBack(false);
    }
  };

  // Delete version
  const handleDeleteVersion = async (versionId: string) => {
    if (
      !confirm(
        isRTL ? 'هل أنت متأكد من حذف هذه النسخة؟' : 'Are you sure you want to delete this version?'
      )
    ) {
      return;
    }
    try {
      await deleteVersion(versionId);
      setVersions((prev) => prev.filter((v) => v.id !== versionId));
    } catch (err) {
      console.error('Failed to delete version:', err);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Load analytics
  const handleLoadAnalytics = async () => {
    setShowAnalytics(true);
    setLoadingAnalytics(true);
    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Save payment settings
  const handleSavePaymentSettings = async (newValue: boolean) => {
    setSavingPaymentSettings(true);
    setPaymentSettingsSuccess(false);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('platform_settings')
        .update({
          allow_card_payment: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (await supabase.from('platform_settings').select('id').single()).data?.id);

      if (!error) {
        setAllowCardPayment(newValue);
        setPaymentSettingsSuccess(true);
        setTimeout(() => setPaymentSettingsSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save payment settings:', err);
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        user={user}
        title={isRTL ? 'تخطيط التطبيق' : 'App Layout'}
        onMenuClick={toggleSidebar}
      />

      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Layout className="w-6 h-6" />
                {isRTL ? 'تخطيط التطبيق' : 'App Layout'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isRTL
                  ? 'تحكم في ترتيب وإظهار أقسام صفحات التطبيق'
                  : 'Control the order and visibility of app page sections'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={refetch} disabled={isSaving}>
                <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>

              <Button variant="outline" size="sm" onClick={handleCreatePreview} disabled={isSaving}>
                <Eye className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'معاينة' : 'Preview'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveVersion}
                disabled={savingVersion}
              >
                {savingVersion ? (
                  <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                ) : (
                  <Save className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                )}
                {isRTL ? 'حفظ نسخة' : 'Save Version'}
              </Button>

              <Button variant="outline" size="sm" onClick={handleLoadVersionHistory}>
                <History className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'سجل الإصدارات' : 'Version History'}
              </Button>

              <Button variant="outline" size="sm" onClick={handleLoadAnalytics}>
                <BarChart3 className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'التحليلات' : 'Analytics'}
              </Button>

              {hasChanges && (
                <Button size="sm" onClick={handleSaveOrder} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  ) : (
                    <Save className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  )}
                  {isRTL ? 'حفظ الترتيب' : 'Save Order'}
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          {saveSuccess && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              {isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully'}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
        </div>

        {/* Page Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-xl">
            {PAGE_CONFIGS.map((page) => {
              const Icon = page.icon;
              const isActive = activePage === page.id;
              return (
                <button
                  key={page.id}
                  onClick={() => setActivePage(page.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{page.label[isRTL ? 'ar' : 'en']}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sections List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">
                  {isRTL ? 'أقسام الصفحة' : 'Page Sections'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {isRTL ? 'اسحب لتغيير الترتيب' : 'Drag to reorder sections'}
                </p>
              </div>

              {isLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : localSections.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Layout className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{isRTL ? 'لا توجد أقسام لهذه الصفحة' : 'No sections found for this page'}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {localSections.map((section, index) => (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={() => handleDragEnter(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-move ${
                        (section as any).is_visible === false ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-5 h-5" />
                        </div>

                        <div className="text-2xl">{sectionIcons[section.section_type] || '📦'}</div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900">
                            {isRTL ? section.title_ar : section.title_en}
                          </h3>
                          <p className="text-sm text-gray-500">{section.section_key}</p>
                        </div>

                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveSection(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveSection(index, 'down')}
                            disabled={index === localSections.length - 1}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleToggleVisibility(section.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            (section as any).is_visible !== false
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {(section as any).is_visible !== false ? (
                            <Eye className="w-5 h-5" />
                          ) : (
                            <EyeOff className="w-5 h-5" />
                          )}
                        </button>

                        <button
                          onClick={() =>
                            setExpandedSection(expandedSection === section.id ? null : section.id)
                          }
                          className="p-2 rounded-lg hover:bg-gray-100"
                        >
                          <Settings className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>

                      {expandedSection === section.id && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                {isRTL ? 'الإعدادات' : 'Config'}
                              </h4>
                              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-32">
                                {JSON.stringify(section.config, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                {isRTL ? 'المحتوى' : 'Content'}
                              </h4>
                              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-32">
                                {JSON.stringify(section.content, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{isRTL ? 'المعاينة' : 'Preview'}</h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-2 rounded ${
                      previewDevice === 'mobile' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-2 rounded ${
                      previewDevice === 'desktop' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div
                  className={`bg-gray-900 rounded-2xl p-2 mx-auto ${
                    previewDevice === 'mobile' ? 'max-w-[280px]' : 'max-w-full'
                  }`}
                >
                  <div className="bg-white rounded-xl overflow-hidden aspect-[9/16]">
                    <div className="p-2 space-y-2 overflow-auto h-full">
                      {localSections
                        .filter((s) => (s as any).is_visible !== false)
                        .map((section) => (
                          <div
                            key={section.id}
                            className="bg-gray-100 rounded-lg p-2 text-xs flex items-center gap-2"
                          >
                            <span>{sectionIcons[section.section_type]}</span>
                            <span className="truncate">
                              {isRTL ? section.title_ar : section.title_en}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {previewUrl && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(previewUrl, '_blank')}
                    >
                      <ExternalLink className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {isRTL ? 'فتح المعاينة الكاملة' : 'Open Full Preview'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Help Card */}
            <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h3 className="font-medium text-blue-900 mb-2">{isRTL ? '💡 نصائح' : '💡 Tips'}</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  {isRTL
                    ? '• استخدم التبويبات للتبديل بين الصفحات'
                    : '• Use tabs to switch between pages'}
                </li>
                <li>{isRTL ? '• اسحب الأقسام لتغيير ترتيبها' : '• Drag sections to reorder'}</li>
                <li>{isRTL ? '• اضغط على العين لإظهار/إخفاء' : '• Click eye icon to show/hide'}</li>
                <li>{isRTL ? '• احفظ نسخة للرجوع إليها لاحقاً' : '• Save version for rollback'}</li>
              </ul>
            </div>

            {/* Payment Settings Card */}
            <div className="mt-4 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900">
                  {isRTL ? 'إعدادات الدفع' : 'Payment Settings'}
                </h3>
              </div>

              {loadingPaymentSettings ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          allowCardPayment
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {isRTL ? 'الدفع الإلكتروني' : 'Online Payment'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {isRTL
                            ? 'تفعيل/تعطيل الدفع بالبطاقة في صفحة الدفع'
                            : 'Enable/disable card payment in checkout'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSavePaymentSettings(!allowCardPayment)}
                      disabled={savingPaymentSettings}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        allowCardPayment ? 'bg-primary' : 'bg-gray-300'
                      } ${savingPaymentSettings ? 'opacity-50' : ''}`}
                    >
                      {savingPaymentSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin absolute left-1/2 -translate-x-1/2 text-white" />
                      ) : (
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            allowCardPayment
                              ? isRTL
                                ? 'translate-x-1'
                                : 'translate-x-6'
                              : isRTL
                                ? 'translate-x-6'
                                : 'translate-x-1'
                          }`}
                        />
                      )}
                    </button>
                  </label>

                  {paymentSettingsSuccess && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      {isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully'}
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    {isRTL
                      ? '* عند التعطيل، سيظهر فقط خيار الدفع عند الاستلام في صفحة الدفع'
                      : '* When disabled, only Cash on Delivery option will appear in checkout'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">
                  {isRTL ? 'سجل الإصدارات' : 'Version History'}
                </h2>
              </div>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4">
              {loadingVersions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{isRTL ? 'لا توجد نسخ محفوظة' : 'No saved versions found'}</p>
                  <p className="text-sm mt-2">
                    {isRTL
                      ? 'اضغط على "حفظ نسخة" لحفظ التخطيط الحالي'
                      : 'Click "Save Version" to save the current layout'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version, index) => {
                    const sectionsForPage = (version.sections_snapshot as any[]).filter(
                      (s) => s.page === activePage
                    );
                    return (
                      <div
                        key={version.id}
                        className={`border rounded-xl p-4 transition-all ${
                          selectedVersion?.id === version.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900 truncate">
                                {version.version_name ||
                                  `${isRTL ? 'نسخة' : 'Version'} #${version.version_number}`}
                              </h3>
                              {index === 0 && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  {isRTL ? 'الأحدث' : 'Latest'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(version.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Layout className="w-3.5 h-3.5" />
                                {sectionsForPage.length} {isRTL ? 'قسم' : 'sections'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setSelectedVersion(
                                  selectedVersion?.id === version.id ? null : version
                                )
                              }
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                              title={isRTL ? 'عرض التفاصيل' : 'View details'}
                            >
                              <GitCompare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRollback(version.id)}
                              disabled={isRollingBack}
                              className="p-2 rounded-lg hover:bg-blue-100 transition-colors text-blue-600 hover:text-blue-700 disabled:opacity-50"
                              title={isRTL ? 'استعادة' : 'Rollback'}
                            >
                              {isRollingBack ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteVersion(version.id)}
                              className="p-2 rounded-lg hover:bg-red-100 transition-colors text-red-500 hover:text-red-600"
                              title={isRTL ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded version details */}
                        {selectedVersion?.id === version.id && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              {isRTL ? 'أقسام هذه النسخة:' : 'Sections in this version:'}
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {sectionsForPage.map((section: any) => (
                                <div
                                  key={section.section_key}
                                  className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2"
                                >
                                  <span>{sectionIcons[section.section_type] || '📦'}</span>
                                  <span className="truncate">
                                    {isRTL ? section.title_ar : section.title_en}
                                  </span>
                                  {!section.is_visible && (
                                    <EyeOff className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  )}
                                </div>
                              ))}
                            </div>
                            {sectionsForPage.length === 0 && (
                              <p className="text-sm text-gray-500 italic">
                                {isRTL
                                  ? 'لا توجد أقسام لهذه الصفحة في هذه النسخة'
                                  : 'No sections for this page in this version'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                {isRTL
                  ? 'اضغط على زر الاستعادة لإرجاع التخطيط إلى نسخة سابقة'
                  : 'Click the rollback button to restore a previous layout version'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">
                  {isRTL ? 'تحليلات الأقسام' : 'Section Analytics'}
                </h2>
              </div>
              <button
                onClick={() => setShowAnalytics(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4">
              {loadingAnalytics ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : analytics.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>{isRTL ? 'لا توجد بيانات تحليلات بعد' : 'No analytics data yet'}</p>
                  <p className="text-sm mt-2">
                    {isRTL
                      ? 'ستظهر البيانات هنا بعد تفاعل المستخدمين مع الأقسام'
                      : 'Data will appear here after users interact with sections'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="text-sm text-blue-600 mb-1">
                        {isRTL ? 'إجمالي المشاهدات' : 'Total Views'}
                      </div>
                      <div className="text-2xl font-bold text-blue-700">
                        {analytics.reduce((sum, a) => sum + a.total_views, 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="text-sm text-green-600 mb-1">
                        {isRTL ? 'إجمالي النقرات' : 'Total Clicks'}
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        {analytics.reduce((sum, a) => sum + a.total_clicks, 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <div className="text-sm text-purple-600 mb-1">
                        {isRTL ? 'متوسط النقرات' : 'Avg Click Rate'}
                      </div>
                      <div className="text-2xl font-bold text-purple-700">
                        {(
                          analytics.reduce((sum, a) => sum + a.click_rate, 0) / analytics.length ||
                          0
                        ).toFixed(1)}
                        %
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                      <div className="text-sm text-orange-600 mb-1">
                        {isRTL ? 'عدد الأقسام' : 'Sections'}
                      </div>
                      <div className="text-2xl font-bold text-orange-700">{analytics.length}</div>
                    </div>
                  </div>

                  {/* Section Analytics Table */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-start p-3 text-sm font-medium text-gray-600">
                            {isRTL ? 'القسم' : 'Section'}
                          </th>
                          <th className="text-center p-3 text-sm font-medium text-gray-600">
                            {isRTL ? 'المشاهدات' : 'Views'}
                          </th>
                          <th className="text-center p-3 text-sm font-medium text-gray-600">
                            {isRTL ? 'النقرات' : 'Clicks'}
                          </th>
                          <th className="text-center p-3 text-sm font-medium text-gray-600">
                            {isRTL ? 'معدل النقر' : 'CTR'}
                          </th>
                          <th className="text-center p-3 text-sm font-medium text-gray-600">
                            {isRTL ? 'الاتجاه' : 'Trend'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analytics.map((item) => (
                          <tr key={item.section_key} className="hover:bg-gray-50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">
                                  {sectionIcons[item.section_key] || '📦'}
                                </span>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {item.section_key.replace(/_/g, ' ')}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {item.top_device && (
                                      <span className="inline-flex items-center gap-1">
                                        <Monitor className="w-3 h-3" />
                                        {item.top_device}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center gap-1 text-gray-700">
                                <Eye className="w-4 h-4 text-gray-400" />
                                {item.total_views.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="inline-flex items-center gap-1 text-gray-700">
                                <MousePointerClick className="w-4 h-4 text-gray-400" />
                                {item.total_clicks.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-sm font-medium ${
                                  item.click_rate >= 5
                                    ? 'bg-green-100 text-green-700'
                                    : item.click_rate >= 2
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {item.click_rate}%
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {item.trend_direction === 'up' && (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <TrendingUp className="w-4 h-4" />
                                </span>
                              )}
                              {item.trend_direction === 'down' && (
                                <span className="inline-flex items-center gap-1 text-red-500">
                                  <TrendingDown className="w-4 h-4" />
                                </span>
                              )}
                              {item.trend_direction === 'stable' && (
                                <span className="inline-flex items-center gap-1 text-gray-400">
                                  <Minus className="w-4 h-4" />
                                </span>
                              )}
                              {item.trend_direction === 'new' && (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                  {isRTL ? 'جديد' : 'New'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                {isRTL
                  ? 'البيانات تعرض آخر 30 يوم - يتم تحديثها يومياً'
                  : 'Data shows last 30 days - updated daily'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
