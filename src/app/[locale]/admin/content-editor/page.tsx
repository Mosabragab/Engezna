'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar, RichTextEditor, BannerDesigner } from '@/components/admin';
import { useSDUIAdmin, type SDUIPageType, type HomepageSection } from '@/hooks/sdui';
import {
  FileText,
  Image,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  X,
  Paintbrush,
  Type,
} from 'lucide-react';

type ContentType = 'html' | 'banner';

interface ContentSection {
  id: string;
  section_key: string;
  title_ar: string;
  title_en: string;
  content_type: ContentType;
  html_content?: string;
  banner_config?: any;
  is_visible: boolean;
}

const PAGE_OPTIONS: { id: SDUIPageType; label: { ar: string; en: string } }[] = [
  { id: 'homepage', label: { ar: 'الصفحة الرئيسية', en: 'Homepage' } },
  { id: 'offers', label: { ar: 'صفحة العروض', en: 'Offers Page' } },
  { id: 'welcome', label: { ar: 'صفحة الترحيب', en: 'Welcome Page' } },
  { id: 'providers', label: { ar: 'صفحة مقدمي الخدمات', en: 'Providers Page' } },
];

export default function ContentEditorPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Page state
  const [selectedPage, setSelectedPage] = useState<SDUIPageType>('homepage');
  const [contentSections, setContentSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New section form
  const [newSection, setNewSection] = useState({
    title_ar: '',
    title_en: '',
    section_key: '',
    content_type: 'html' as ContentType,
  });

  const { sections, updateSection, createSection, deleteSection, toggleVisibility } = useSDUIAdmin({
    page: selectedPage,
  });

  // Fetch user
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

  // Load content sections from SDUI sections
  useEffect(() => {
    setLoading(true);
    // Filter sections that are custom_html or custom_banner type
    const customSections = sections
      .filter((s) => s.section_type === 'custom_html' || s.section_type === 'custom_banner')
      .map((s) => ({
        id: s.id,
        section_key: s.section_key,
        title_ar: s.title_ar,
        title_en: s.title_en,
        content_type: (s.section_type === 'custom_banner' ? 'banner' : 'html') as ContentType,
        html_content: s.content?.html || '',
        banner_config: s.content?.banner_config,
        is_visible: s.is_visible ?? true,
      }));
    setContentSections(customSections);
    setLoading(false);
  }, [sections]);

  // Create new section
  const handleCreateSection = async () => {
    if (!newSection.title_ar || !newSection.section_key) {
      setError(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createSection({
        section_type: newSection.content_type === 'banner' ? 'custom_banner' : 'custom_html',
        section_key: newSection.section_key,
        title_ar: newSection.title_ar,
        title_en: newSection.title_en || newSection.title_ar,
        config: {},
        content:
          newSection.content_type === 'banner'
            ? {
                banner_config: {
                  width: 800,
                  height: 400,
                  backgroundColor: '#f3f4f6',
                  elements: [],
                },
              }
            : { html: '' },
        is_visible: true,
      } as Omit<HomepageSection, 'id' | 'display_order'>);

      setShowCreateModal(false);
      setNewSection({ title_ar: '', title_en: '', section_key: '', content_type: 'html' });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save content
  const handleSaveContent = async (
    sectionId: string,
    contentType: ContentType,
    content: string | any
  ) => {
    setSaving(true);
    setError(null);
    try {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) throw new Error('Section not found');

      await updateSection(sectionId, {
        content:
          contentType === 'banner'
            ? { ...section.content, banner_config: content }
            : { ...section.content, html: content },
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete section
  const handleDeleteSection = async (sectionId: string) => {
    if (
      !confirm(
        isRTL ? 'هل أنت متأكد من حذف هذا القسم؟' : 'Are you sure you want to delete this section?'
      )
    ) {
      return;
    }

    try {
      await deleteSection(sectionId);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Toggle visibility
  const handleToggleVisibility = async (sectionId: string) => {
    const section = contentSections.find((s) => s.id === sectionId);
    if (!section) return;

    try {
      await toggleVisibility(sectionId, !section.is_visible);
      setContentSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, is_visible: !s.is_visible } : s))
      );
    } catch (err: any) {
      setError(err.message);
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
        title={isRTL ? 'محرر المحتوى' : 'Content Editor'}
        onMenuClick={toggleSidebar}
      />

      <main className="p-4 md:p-6 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6" />
                {isRTL ? 'محرر المحتوى' : 'Content Editor'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isRTL
                  ? 'إنشاء وتحرير محتوى HTML مخصص والبانرات'
                  : 'Create and edit custom HTML content and banners'}
              </p>
            </div>

            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'قسم جديد' : 'New Section'}
            </Button>
          </div>

          {/* Messages */}
          {success && (
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

        {/* Page Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-xl">
            {PAGE_OPTIONS.map((page) => (
              <button
                key={page.id}
                onClick={() => setSelectedPage(page.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedPage === page.id
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {page.label[isRTL ? 'ar' : 'en']}
              </button>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : contentSections.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {isRTL
                  ? 'لا توجد أقسام محتوى مخصص لهذه الصفحة'
                  : 'No custom content sections for this page'}
              </p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'إنشاء قسم' : 'Create Section'}
              </Button>
            </div>
          ) : (
            contentSections.map((section) => (
              <div
                key={section.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Section Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {section.content_type === 'banner' ? (
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Paintbrush className="w-5 h-5 text-purple-600" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Type className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {isRTL ? section.title_ar : section.title_en}
                        </h3>
                        <p className="text-sm text-gray-500">{section.section_key}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleVisibility(section.id)}
                      >
                        {section.is_visible ? (
                          <Eye className="w-4 h-4 text-green-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setExpandedSection(expandedSection === section.id ? null : section.id)
                        }
                      >
                        {expandedSection === section.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => handleDeleteSection(section.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content Editor */}
                {expandedSection === section.id && (
                  <div className="p-4 bg-gray-50">
                    {section.content_type === 'html' ? (
                      <div className="space-y-4">
                        <RichTextEditor
                          content={section.html_content || ''}
                          onChange={(content) => {
                            setContentSections((prev) =>
                              prev.map((s) =>
                                s.id === section.id ? { ...s, html_content: content } : s
                              )
                            );
                          }}
                          locale={locale as 'ar' | 'en'}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              handleSaveContent(section.id, 'html', section.html_content || '')
                            }
                            disabled={saving}
                          >
                            {saving && (
                              <Loader2
                                className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`}
                              />
                            )}
                            <Save className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {isRTL ? 'حفظ المحتوى' : 'Save Content'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <BannerDesigner
                          initialConfig={section.banner_config}
                          onChange={(config) => {
                            setContentSections((prev) =>
                              prev.map((s) =>
                                s.id === section.id ? { ...s, banner_config: config } : s
                              )
                            );
                          }}
                          locale={locale as 'ar' | 'en'}
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() =>
                              handleSaveContent(section.id, 'banner', section.banner_config)
                            }
                            disabled={saving}
                          >
                            {saving && (
                              <Loader2
                                className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`}
                              />
                            )}
                            <Save className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {isRTL ? 'حفظ البانر' : 'Save Banner'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create Section Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {isRTL ? 'إنشاء قسم محتوى جديد' : 'Create New Content Section'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'نوع المحتوى' : 'Content Type'}
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewSection((prev) => ({ ...prev, content_type: 'html' }))}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      newSection.content_type === 'html'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Type className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <div className="text-sm font-medium">{isRTL ? 'HTML مخصص' : 'Custom HTML'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {isRTL ? 'نص منسق وصور' : 'Rich text and images'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSection((prev) => ({ ...prev, content_type: 'banner' }))}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      newSection.content_type === 'banner'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Paintbrush className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <div className="text-sm font-medium">
                      {isRTL ? 'بانر مرئي' : 'Visual Banner'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {isRTL ? 'تصميم بصري' : 'Visual design'}
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'العنوان (عربي)' : 'Title (Arabic)'} *
                </label>
                <input
                  type="text"
                  value={newSection.title_ar}
                  onChange={(e) => setNewSection((prev) => ({ ...prev, title_ar: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder={isRTL ? 'مثال: بانر ترويجي' : 'e.g., Promotional Banner'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'العنوان (إنجليزي)' : 'Title (English)'}
                </label>
                <input
                  type="text"
                  value={newSection.title_en}
                  onChange={(e) => setNewSection((prev) => ({ ...prev, title_en: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="e.g., Promotional Banner"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'مفتاح القسم' : 'Section Key'} *
                </label>
                <input
                  type="text"
                  value={newSection.section_key}
                  onChange={(e) =>
                    setNewSection((prev) => ({
                      ...prev,
                      section_key: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
                  placeholder="promo_banner_1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isRTL
                    ? 'مفتاح فريد للقسم (بدون مسافات)'
                    : 'Unique key for the section (no spaces)'}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleCreateSection}
                disabled={saving || !newSection.title_ar || !newSection.section_key}
              >
                {saving && (
                  <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                )}
                {isRTL ? 'إنشاء' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
