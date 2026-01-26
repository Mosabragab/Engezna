'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { useSDUIAdmin, type HomepageSection } from '@/hooks/sdui';
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
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

// Section type icons
const sectionIcons: Record<string, React.ReactNode> = {
  hero_search: '🔍',
  address_selector: '📍',
  offers_carousel: '🎁',
  categories: '📂',
  reorder: '🔄',
  top_rated: '⭐',
  nearby: '📌',
  featured_products: '✨',
  custom_html: '📝',
  announcement: '📢',
};

// Section type labels
const sectionLabels: Record<string, { ar: string; en: string }> = {
  hero_search: { ar: 'البحث', en: 'Search' },
  address_selector: { ar: 'اختيار العنوان', en: 'Address Selector' },
  offers_carousel: { ar: 'العروض', en: 'Offers' },
  categories: { ar: 'الأقسام', en: 'Categories' },
  reorder: { ar: 'إعادة الطلب', en: 'Reorder' },
  top_rated: { ar: 'الأعلى تقييماً', en: 'Top Rated' },
  nearby: { ar: 'القريبون', en: 'Nearby' },
  featured_products: { ar: 'منتجات مميزة', en: 'Featured Products' },
  custom_html: { ar: 'محتوى مخصص', en: 'Custom Content' },
  announcement: { ar: 'إعلان', en: 'Announcement' },
};

interface ExtendedSection extends HomepageSection {
  is_visible?: boolean;
}

export default function AdminHomepagePage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const { toggle: toggleSidebar } = useAdminSidebar();

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
  } = useSDUIAdmin();

  // Local state for drag & drop
  const [localSections, setLocalSections] = useState<ExtendedSection[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Sync fetched sections with local state
  useEffect(() => {
    if (fetchedSections.length > 0) {
      setLocalSections(fetchedSections as ExtendedSection[]);
    }
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

    // Update display_order
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

    // Update local state
    setLocalSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, is_visible: newVisibility } : s))
    );

    // Save to database
    try {
      await toggleVisibility(sectionId, newVisibility);
    } catch (err) {
      // Revert on error
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
      const url = `${window.location.origin}/${locale}?preview=${token}`;
      setPreviewUrl(url);
      setShowPreview(true);
    } catch (err) {
      console.error('Failed to create preview:', err);
    }
  };

  // Save version for rollback
  const handleSaveVersion = async () => {
    setSavingVersion(true);
    try {
      await saveLayoutVersion(`Backup - ${new Date().toLocaleString(locale)}`);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save version:', err);
    } finally {
      setSavingVersion(false);
    }
  };

  // Move section up/down
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader onMenuClick={toggleSidebar} />
        <main className="p-4 md:p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader onMenuClick={toggleSidebar} />

      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Layout className="w-6 h-6" />
                {isRTL ? 'إدارة الصفحة الرئيسية' : 'Homepage Layout'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isRTL
                  ? 'تحكم في ترتيب وإظهار أقسام الصفحة الرئيسية'
                  : 'Control the order and visibility of homepage sections'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={refetch} disabled={isSaving}>
                <RefreshCw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCreatePreview}
                disabled={isSaving}
              >
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
                  <History className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                )}
                {isRTL ? 'حفظ نسخة' : 'Save Version'}
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

          {/* Success/Error Messages */}
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

        {/* Main Content - Two Column Layout */}
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
                      {/* Drag Handle */}
                      <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      {/* Section Icon */}
                      <div className="text-2xl">{sectionIcons[section.section_type] || '📦'}</div>

                      {/* Section Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900">
                          {isRTL ? section.title_ar : section.title_en}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {isRTL
                            ? sectionLabels[section.section_type]?.ar
                            : sectionLabels[section.section_type]?.en}
                        </p>
                      </div>

                      {/* Order Buttons */}
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

                      {/* Visibility Toggle */}
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

                      {/* Settings Button */}
                      <button
                        onClick={() =>
                          setExpandedSection(expandedSection === section.id ? null : section.id)
                        }
                        className="p-2 rounded-lg hover:bg-gray-100"
                      >
                        <Settings className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>

                    {/* Expanded Settings */}
                    {expandedSection === section.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Config Display */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              {isRTL ? 'الإعدادات' : 'Config'}
                            </h4>
                            <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-32">
                              {JSON.stringify(section.config, null, 2)}
                            </pre>
                          </div>

                          {/* Content Display */}
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
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  {isRTL ? 'المعاينة' : 'Preview'}
                </h2>
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
                {/* Preview Frame */}
                <div
                  className={`bg-gray-900 rounded-2xl p-2 mx-auto ${
                    previewDevice === 'mobile' ? 'max-w-[280px]' : 'max-w-full'
                  }`}
                >
                  <div className="bg-white rounded-xl overflow-hidden aspect-[9/16]">
                    {/* Mini Preview */}
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

                {/* Open Full Preview */}
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
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {isRTL
                        ? 'الرابط صالح لمدة 24 ساعة'
                        : 'Link valid for 24 hours'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Help Card */}
            <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h3 className="font-medium text-blue-900 mb-2">
                {isRTL ? '💡 نصائح' : '💡 Tips'}
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>{isRTL ? '• اسحب الأقسام لتغيير ترتيبها' : '• Drag sections to reorder'}</li>
                <li>
                  {isRTL
                    ? '• اضغط على العين لإظهار/إخفاء القسم'
                    : '• Click eye icon to show/hide'}
                </li>
                <li>
                  {isRTL
                    ? '• استخدم المعاينة قبل الحفظ'
                    : '• Use preview before saving'}
                </li>
                <li>
                  {isRTL
                    ? '• احفظ نسخة للرجوع إليها لاحقاً'
                    : '• Save version for rollback'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Full Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">
                {isRTL ? 'معاينة الصفحة الرئيسية' : 'Homepage Preview'}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex justify-center">
              <div
                className={`bg-gray-900 rounded-3xl p-3 ${
                  previewDevice === 'mobile' ? 'w-[375px]' : 'w-full'
                }`}
              >
                <iframe
                  src={previewUrl}
                  className={`bg-white rounded-2xl ${
                    previewDevice === 'mobile' ? 'w-full h-[667px]' : 'w-full h-[600px]'
                  }`}
                  title="Preview"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
