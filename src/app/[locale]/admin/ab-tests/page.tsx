'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import {
  useSDUIAdmin,
  type ABTest,
  type ABTestVariant,
  type ABTestResult,
  type SDUIPageType,
} from '@/hooks/sdui';
import {
  FlaskConical,
  Plus,
  Play,
  Pause,
  Trash2,
  Eye,
  Settings,
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Percent,
} from 'lucide-react';

const PAGE_OPTIONS: { id: SDUIPageType; label: { ar: string; en: string } }[] = [
  { id: 'homepage', label: { ar: 'الصفحة الرئيسية', en: 'Homepage' } },
  { id: 'offers', label: { ar: 'صفحة العروض', en: 'Offers Page' } },
  { id: 'welcome', label: { ar: 'صفحة الترحيب', en: 'Welcome Page' } },
  { id: 'providers', label: { ar: 'صفحة مقدمي الخدمات', en: 'Providers Page' } },
];

export default function ABTestsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Page state
  const [selectedPage, setSelectedPage] = useState<SDUIPageType>('homepage');
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [testVariants, setTestVariants] = useState<Record<string, ABTestVariant[]>>({});
  const [testResults, setTestResults] = useState<Record<string, ABTestResult[]>>({});

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New test form
  const [newTest, setNewTest] = useState<{
    name: string;
    description: string;
    section_key: string;
    traffic_percentage: number;
    goal_type: ABTest['goal_type'];
  }>({
    name: '',
    description: '',
    section_key: '',
    traffic_percentage: 100,
    goal_type: 'click',
  });

  const {
    sections,
    fetchABTests,
    createABTest,
    updateABTest,
    deleteABTest,
    fetchABTestVariants,
    createABTestVariant,
    getABTestResults,
  } = useSDUIAdmin({ page: selectedPage });

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

  // Fetch tests when page changes
  useEffect(() => {
    loadTests();
  }, [selectedPage, fetchABTests]);

  const loadTests = async () => {
    setLoading(true);
    try {
      const data = await fetchABTests();
      setTests(data);
    } catch (err) {
      console.error('Failed to load tests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load variants and results for a test
  const loadTestDetails = async (testId: string) => {
    try {
      const [variants, results] = await Promise.all([
        fetchABTestVariants(testId),
        getABTestResults(testId),
      ]);
      setTestVariants((prev: Record<string, ABTestVariant[]>) => ({ ...prev, [testId]: variants }));
      setTestResults((prev: Record<string, ABTestResult[]>) => ({ ...prev, [testId]: results }));
    } catch (err) {
      console.error('Failed to load test details:', err);
    }
  };

  // Toggle test expansion
  const toggleExpanded = async (testId: string) => {
    if (expandedTest === testId) {
      setExpandedTest(null);
    } else {
      setExpandedTest(testId);
      if (!testVariants[testId]) {
        await loadTestDetails(testId);
      }
    }
  };

  // Create new test
  const handleCreateTest = async () => {
    setSaving(true);
    setError(null);
    try {
      const testId = await createABTest({
        ...newTest,
        page: selectedPage,
        status: 'draft',
        starts_at: null,
        ends_at: null,
        goal_section_key: null,
      });

      // Create default variants (Control + Variant A)
      await createABTestVariant({
        test_id: testId,
        name: isRTL ? 'التحكم' : 'Control',
        is_control: true,
        weight: 50,
        section_config: null,
        section_content: null,
      });

      await createABTestVariant({
        test_id: testId,
        name: isRTL ? 'المتغير أ' : 'Variant A',
        is_control: false,
        weight: 50,
        section_config: null,
        section_content: null,
      });

      setShowCreateModal(false);
      setNewTest({
        name: '',
        description: '',
        section_key: '',
        traffic_percentage: 100,
        goal_type: 'click',
      });
      await loadTests();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Update test status
  const handleStatusChange = async (testId: string, status: ABTest['status']) => {
    try {
      await updateABTest(testId, { status });
      setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, status } : t)));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Delete test
  const handleDeleteTest = async (testId: string) => {
    if (
      !confirm(
        isRTL ? 'هل أنت متأكد من حذف هذا الاختبار؟' : 'Are you sure you want to delete this test?'
      )
    ) {
      return;
    }
    try {
      await deleteABTest(testId);
      setTests((prev) => prev.filter((t) => t.id !== testId));
    } catch (err) {
      console.error('Failed to delete test:', err);
    }
  };

  // Get status badge
  const getStatusBadge = (status: ABTest['status']) => {
    switch (status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {isRTL ? 'قيد التشغيل' : 'Running'}
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            {isRTL ? 'متوقف' : 'Paused'}
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {isRTL ? 'مكتمل' : 'Completed'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {isRTL ? 'مسودة' : 'Draft'}
          </span>
        );
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
        title={isRTL ? 'اختبارات A/B' : 'A/B Tests'}
        onMenuClick={toggleSidebar}
      />

      <main className="p-4 md:p-6 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FlaskConical className="w-6 h-6" />
                {isRTL ? 'اختبارات A/B' : 'A/B Tests'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isRTL
                  ? 'إنشاء وإدارة اختبارات A/B لتحسين تجربة المستخدم'
                  : 'Create and manage A/B tests to optimize user experience'}
              </p>
            </div>

            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'اختبار جديد' : 'New Test'}
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

        {/* Tests List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : tests.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FlaskConical className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {isRTL ? 'لا توجد اختبارات لهذه الصفحة' : 'No tests for this page'}
              </p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {isRTL ? 'إنشاء اختبار' : 'Create Test'}
              </Button>
            </div>
          ) : (
            tests.map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Test Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{test.name}</h3>
                        {getStatusBadge(test.status)}
                      </div>
                      {test.description && (
                        <p className="text-sm text-gray-500">{test.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {test.section_key || (isRTL ? 'كل الأقسام' : 'All sections')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Percent className="w-4 h-4" />
                          {test.traffic_percentage}% {isRTL ? 'حركة المرور' : 'traffic'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {test.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(test.id, 'running')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {test.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(test.id, 'paused')}
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {test.status === 'paused' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(test.id, 'running')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => toggleExpanded(test.id)}>
                        {expandedTest === test.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => handleDeleteTest(test.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTest === test.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    {!testVariants[test.id] ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">
                          {isRTL ? 'المتغيرات والنتائج' : 'Variants & Results'}
                        </h4>

                        <div className="grid gap-3">
                          {testResults[test.id]?.map((result) => {
                            const variant = testVariants[test.id]?.find(
                              (v) => v.id === result.variant_id
                            );
                            return (
                              <div
                                key={result.variant_id}
                                className={`bg-white rounded-lg p-4 border ${
                                  result.is_control ? 'border-blue-200' : 'border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{result.variant_name}</span>
                                      {result.is_control && (
                                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                          {isRTL ? 'تحكم' : 'Control'}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-500">
                                        {variant?.weight}%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                      <div className="text-gray-500">
                                        {isRTL ? 'مشاهدات' : 'Views'}
                                      </div>
                                      <div className="font-semibold">{result.views}</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-gray-500">
                                        {isRTL ? 'تحويلات' : 'Conversions'}
                                      </div>
                                      <div className="font-semibold">{result.conversions}</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-gray-500">
                                        {isRTL ? 'معدل التحويل' : 'CVR'}
                                      </div>
                                      <div className="font-semibold">{result.conversion_rate}%</div>
                                    </div>
                                    {!result.is_control && (
                                      <div className="text-center">
                                        <div className="text-gray-500">
                                          {isRTL ? 'التحسن' : 'Improvement'}
                                        </div>
                                        <div
                                          className={`font-semibold ${
                                            result.improvement_vs_control > 0
                                              ? 'text-green-600'
                                              : result.improvement_vs_control < 0
                                                ? 'text-red-500'
                                                : 'text-gray-500'
                                          }`}
                                        >
                                          {result.improvement_vs_control > 0 && '+'}
                                          {result.improvement_vs_control}%
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {isRTL ? 'إنشاء اختبار A/B جديد' : 'Create New A/B Test'}
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
                  {isRTL ? 'اسم الاختبار' : 'Test Name'}
                </label>
                <input
                  type="text"
                  value={newTest.name}
                  onChange={(e) => setNewTest((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder={isRTL ? 'مثال: اختبار زر الشراء' : 'e.g., Buy Button Test'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={newTest.description}
                  onChange={(e) => setNewTest((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'القسم المستهدف' : 'Target Section'}
                </label>
                <select
                  value={newTest.section_key}
                  onChange={(e) => setNewTest((prev) => ({ ...prev, section_key: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">{isRTL ? 'كل الأقسام' : 'All Sections'}</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.section_key}>
                      {isRTL ? section.title_ar : section.title_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'نسبة حركة المرور' : 'Traffic Percentage'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTest.traffic_percentage}
                  onChange={(e) =>
                    setNewTest((prev) => ({
                      ...prev,
                      traffic_percentage: parseInt(e.target.value) || 100,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'نوع الهدف' : 'Goal Type'}
                </label>
                <select
                  value={newTest.goal_type}
                  onChange={(e) =>
                    setNewTest((prev) => ({
                      ...prev,
                      goal_type: e.target.value as ABTest['goal_type'],
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="click">{isRTL ? 'نقرة' : 'Click'}</option>
                  <option value="conversion">{isRTL ? 'تحويل' : 'Conversion'}</option>
                  <option value="engagement">{isRTL ? 'تفاعل' : 'Engagement'}</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={handleCreateTest} disabled={saving || !newTest.name}>
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
