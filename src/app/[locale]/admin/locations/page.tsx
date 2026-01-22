'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { formatNumber } from '@/lib/utils/formatters';
import {
  Shield,
  MapPin,
  Building,
  Map,
  Home,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  X,
  Save,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  BarChart3,
  Users,
  Store,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Target,
  Percent,
  DollarSign,
  Activity,
} from 'lucide-react';


interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  created_at: string;
  cities_count?: number;
  commission_override?: number | null;
}

interface City {
  id: string;
  governorate_id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  created_at: string;
  districts_count?: number;
}

interface District {
  id: string;
  governorate_id: string;
  city_id: string | null;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  created_at: string;
}

type ViewLevel = 'governorates' | 'cities' | 'districts';
type ModalType = 'add' | 'edit' | null;
type TabView = 'locations' | 'analytics';

interface GovernorateAnalytics {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  providers_count: number;
  active_providers: number;
  customers_count: number;
  orders_count: number;
  revenue: number;
  avg_order_value: number;
  cities_count: number;
  districts_count: number;
  growth_rate: number; // percentage
  readiness_score: number; // 0-100
}

export default function AdminLocationsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  // Analytics
  const [activeTab, setActiveTab] = useState<TabView>('locations');
  const [analyticsData, setAnalyticsData] = useState<GovernorateAnalytics[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [viewLevel, setViewLevel] = useState<ViewLevel>('governorates');
  const [selectedGovernorate, setSelectedGovernorate] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editItem, setEditItem] = useState<Governorate | City | District | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    governorate_id: '',
    city_id: '',
    is_active: true,
    commission_override: null as number | null,
  });
  const [selectedGovernorateToActivate, setSelectedGovernorateToActivate] = useState<string>('');
  const [selectedCityToActivate, setSelectedCityToActivate] = useState<string>('');
  const [activateAllCities, setActivateAllCities] = useState(false);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{
    type: ViewLevel;
    item: Governorate | City | District;
  } | null>(null);

  const [stats, setStats] = useState({
    totalGovernorates: 0,
    activeGovernorates: 0,
    totalCities: 0,
    activeCities: 0,
    totalDistricts: 0,
    activeDistricts: 0,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [governorates, cities, districts]);

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

        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (adminUser?.role === 'super_admin') {
          setIsSuperAdmin(true);
        }

        await loadLocations(supabase);
      }
    }

    setLoading(false);
  }

  async function loadLocations(supabase: ReturnType<typeof createClient>) {
    // Load governorates
    const { data: govData } = await supabase.from('governorates').select('*').order('name_ar');

    // Load cities
    const { data: cityData } = await supabase.from('cities').select('*').order('name_ar');

    // Load districts
    const { data: districtData } = await supabase.from('districts').select('*').order('name_ar');

    const govs = govData || [];
    const citiesList = cityData || [];
    const districtsList = districtData || [];

    // Calculate counts
    const govsWithCounts = govs.map((g) => ({
      ...g,
      cities_count: citiesList.filter((c) => c.governorate_id === g.id).length,
    }));

    const citiesWithCounts = citiesList.map((c) => ({
      ...c,
      districts_count: districtsList.filter((d) => d.city_id === c.id).length,
    }));

    setGovernorates(govsWithCounts);
    setCities(citiesWithCounts);
    setDistricts(districtsList);
  }

  function calculateStats() {
    setStats({
      totalGovernorates: governorates.length,
      activeGovernorates: governorates.filter((g) => g.is_active).length,
      totalCities: cities.length,
      activeCities: cities.filter((c) => c.is_active).length,
      totalDistricts: districts.length,
      activeDistricts: districts.filter((d) => d.is_active).length,
    });
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    const supabase = createClient();

    try {
      // Fetch all governorates
      const { data: govData } = await supabase.from('governorates').select('*').order('name_ar');

      // Fetch providers with their governorate
      const { data: providersData } = await supabase
        .from('providers')
        .select('id, governorate_id, is_active, status');

      // Fetch customers (profiles with role=customer and governorate)
      const { data: customersData } = await supabase
        .from('profiles')
        .select('id, governorate_id, role')
        .eq('role', 'customer');

      // Fetch orders with provider info
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, provider_id, total_amount, status, created_at');

      // Fetch cities
      const { data: citiesData } = await supabase.from('cities').select('id, governorate_id');

      // Fetch districts
      const { data: districtsData } = await supabase.from('districts').select('id, governorate_id');

      const govs = govData || [];
      const providers = providersData || [];
      const customers = customersData || [];
      const orders = ordersData || [];
      const citiesList = citiesData || [];
      const districtsList = districtsData || [];

      // Create provider-to-governorate mapping
      const providerToGov: Record<string, string> = {};
      providers.forEach((p) => {
        if (p.governorate_id) {
          providerToGov[p.id] = p.governorate_id;
        }
      });

      // Calculate analytics for each governorate
      const analytics: GovernorateAnalytics[] = govs.map((gov) => {
        const govProviders = providers.filter((p) => p.governorate_id === gov.id);
        const activeProviders = govProviders.filter((p) => p.is_active && p.status === 'active');
        const govCustomers = customers.filter((c) => c.governorate_id === gov.id);

        // Get orders for this governorate's providers
        const govOrders = orders.filter((o) => {
          const provGov = providerToGov[o.provider_id];
          return provGov === gov.id;
        });

        const completedOrders = govOrders.filter(
          (o) => o.status === 'completed' || o.status === 'delivered'
        );
        const revenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const avgOrderValue = completedOrders.length > 0 ? revenue / completedOrders.length : 0;

        // Calculate growth rate (orders in last 30 days vs previous 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const recentOrders = govOrders.filter(
          (o) => new Date(o.created_at) >= thirtyDaysAgo
        ).length;
        const previousOrders = govOrders.filter((o) => {
          const date = new Date(o.created_at);
          return date >= sixtyDaysAgo && date < thirtyDaysAgo;
        }).length;

        const growthRate =
          previousOrders > 0
            ? ((recentOrders - previousOrders) / previousOrders) * 100
            : recentOrders > 0
              ? 100
              : 0;

        // Calculate readiness score (0-100)
        // Factors: active providers (40%), customers (30%), orders (20%), coverage (10%)
        const providerScore = Math.min(activeProviders.length * 10, 40);
        const customerScore = Math.min(govCustomers.length * 3, 30);
        const orderScore = Math.min(completedOrders.length * 2, 20);
        const citiesCount = citiesList.filter((c) => c.governorate_id === gov.id).length;
        const districtsCount = districtsList.filter((d) => d.governorate_id === gov.id).length;
        const coverageScore = Math.min((citiesCount + districtsCount) * 2, 10);
        const readinessScore = Math.round(
          providerScore + customerScore + orderScore + coverageScore
        );

        return {
          id: gov.id,
          name_ar: gov.name_ar,
          name_en: gov.name_en,
          is_active: gov.is_active,
          providers_count: govProviders.length,
          active_providers: activeProviders.length,
          customers_count: govCustomers.length,
          orders_count: completedOrders.length,
          revenue,
          avg_order_value: avgOrderValue,
          cities_count: citiesCount,
          districts_count: districtsCount,
          growth_rate: Math.round(growthRate * 10) / 10,
          readiness_score: readinessScore,
        };
      });

      // Sort by readiness score descending
      analytics.sort((a, b) => b.readiness_score - a.readiness_score);
      setAnalyticsData(analytics);
    } catch {
      // Error handled silently
    }

    setAnalyticsLoading(false);
  }

  function getFilteredItems() {
    let items: (Governorate | City | District)[] = [];

    if (viewLevel === 'governorates') {
      items = governorates;
    } else if (viewLevel === 'cities') {
      items = selectedGovernorate
        ? cities.filter((c) => c.governorate_id === selectedGovernorate)
        : cities;
    } else {
      items = selectedCity
        ? districts.filter((d) => d.city_id === selectedCity)
        : selectedGovernorate
          ? districts.filter((d) => d.governorate_id === selectedGovernorate)
          : districts;
    }

    // Filter by active status
    if (!showInactive) {
      items = items.filter((i) => i.is_active);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (i) => i.name_ar.toLowerCase().includes(query) || i.name_en.toLowerCase().includes(query)
      );
    }

    return items;
  }

  function openAddModal() {
    setFormData({
      name_ar: '',
      name_en: '',
      governorate_id: selectedGovernorate || '',
      city_id: selectedCity || '',
      is_active: true,
      commission_override: null,
    });
    setSelectedGovernorateToActivate('');
    setSelectedCityToActivate('');
    setActivateAllCities(false);
    setFormError('');
    setEditItem(null);
    setModalType('add');
  }

  function openEditModal(item: Governorate | City | District) {
    setFormData({
      name_ar: item.name_ar,
      name_en: item.name_en,
      governorate_id: 'governorate_id' in item ? item.governorate_id : '',
      city_id: 'city_id' in item && item.city_id ? item.city_id : '',
      is_active: item.is_active,
      commission_override:
        'commission_override' in item ? (item.commission_override ?? null) : null,
    });
    setFormError('');
    setEditItem(item);
    setModalType('edit');
  }

  function openDeleteModal(type: ViewLevel, item: Governorate | City | District) {
    setDeleteItem({ type, item });
    setShowDeleteModal(true);
  }

  async function handleSave() {
    // For governorates in add mode, we activate an existing one
    if (viewLevel === 'governorates' && modalType === 'add') {
      if (!selectedGovernorateToActivate) {
        setFormError(locale === 'ar' ? 'اختر محافظة لتفعيلها' : 'Select a governorate to activate');
        return;
      }
    } else if (viewLevel === 'cities' && modalType === 'add') {
      // For cities in add mode, we activate existing ones
      if (!activateAllCities && !selectedCityToActivate) {
        setFormError(
          locale === 'ar'
            ? 'اختر مدينة لتفعيلها أو اختر تفعيل كل المدن'
            : 'Select a city to activate or choose to activate all cities'
        );
        return;
      }
      if (!formData.governorate_id) {
        setFormError(locale === 'ar' ? 'اختر المحافظة أولاً' : 'Select governorate first');
        return;
      }
    } else if (viewLevel === 'districts' && modalType === 'add') {
      // For districts, require names (manual creation)
      if (!formData.name_ar || !formData.name_en) {
        setFormError(
          locale === 'ar'
            ? 'الاسمان بالعربية والإنجليزية مطلوبان'
            : 'Both Arabic and English names are required'
        );
        return;
      }
    } else {
      // For edit mode, require names
      if (!formData.name_ar || !formData.name_en) {
        setFormError(
          locale === 'ar'
            ? 'الاسمان بالعربية والإنجليزية مطلوبان'
            : 'Both Arabic and English names are required'
        );
        return;
      }
    }

    setFormLoading(true);
    setFormError('');
    const supabase = createClient();

    try {
      if (viewLevel === 'governorates') {
        if (modalType === 'add') {
          // Activate existing governorate
          const updateData: Record<string, unknown> = { is_active: true };
          if (formData.commission_override !== null) {
            updateData.commission_override = formData.commission_override;
          }
          const { error } = await supabase
            .from('governorates')
            .update(updateData)
            .eq('id', selectedGovernorateToActivate);
          if (error) throw error;
        } else {
          const updateData: Record<string, unknown> = {
            name_ar: formData.name_ar,
            name_en: formData.name_en,
            is_active: formData.is_active,
          };
          if (formData.commission_override !== null) {
            updateData.commission_override = formData.commission_override;
          }
          const { error } = await supabase
            .from('governorates')
            .update(updateData)
            .eq('id', editItem!.id);
          if (error) throw error;
        }
      } else if (viewLevel === 'cities') {
        if (modalType === 'add') {
          if (activateAllCities) {
            // Activate ALL inactive cities in the selected governorate
            const inactiveCityIds = cities
              .filter((c) => c.governorate_id === formData.governorate_id && !c.is_active)
              .map((c) => c.id);

            if (inactiveCityIds.length > 0) {
              const { error } = await supabase
                .from('cities')
                .update({ is_active: true })
                .in('id', inactiveCityIds);
              if (error) throw error;
            }
          } else {
            // Activate single city
            const { error } = await supabase
              .from('cities')
              .update({ is_active: true })
              .eq('id', selectedCityToActivate);
            if (error) throw error;
          }
        } else {
          const { error } = await supabase
            .from('cities')
            .update({
              name_ar: formData.name_ar,
              name_en: formData.name_en,
              governorate_id: formData.governorate_id,
              is_active: formData.is_active,
            })
            .eq('id', editItem!.id);
          if (error) throw error;
        }
      } else if (viewLevel === 'districts') {
        if (!formData.governorate_id) {
          setFormError(locale === 'ar' ? 'المحافظة مطلوبة' : 'Governorate is required');
          setFormLoading(false);
          return;
        }

        if (modalType === 'add') {
          const { error } = await supabase.from('districts').insert({
            name_ar: formData.name_ar,
            name_en: formData.name_en,
            governorate_id: formData.governorate_id,
            city_id: formData.city_id || null,
            is_active: formData.is_active,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('districts')
            .update({
              name_ar: formData.name_ar,
              name_en: formData.name_en,
              governorate_id: formData.governorate_id,
              city_id: formData.city_id || null,
              is_active: formData.is_active,
            })
            .eq('id', editItem!.id);
          if (error) throw error;
        }
      }

      await loadLocations(supabase);
      setModalType(null);
    } catch (error: any) {
      const errorMsg = error?.message || error?.code || 'Unknown error';
      setFormError(
        locale === 'ar' ? 'حدث خطأ أثناء الحفظ: ' + errorMsg : 'Error saving: ' + errorMsg
      );
    }

    setFormLoading(false);
  }

  async function handleDelete() {
    if (!deleteItem) return;

    setFormLoading(true);
    const supabase = createClient();

    try {
      const tableName =
        deleteItem.type === 'governorates'
          ? 'governorates'
          : deleteItem.type === 'cities'
            ? 'cities'
            : 'districts';
      const { error } = await supabase.from(tableName).delete().eq('id', deleteItem.item.id);

      if (error) throw error;

      await loadLocations(supabase);
      setShowDeleteModal(false);
      setDeleteItem(null);
    } catch {
      setFormError(
        locale === 'ar'
          ? 'لا يمكن حذف هذا العنصر - قد يكون مرتبطاً ببيانات أخرى'
          : 'Cannot delete - may be linked to other data'
      );
    }

    setFormLoading(false);
  }

  async function handleToggleActive(type: ViewLevel, item: Governorate | City | District) {
    const supabase = createClient();
    const tableName =
      type === 'governorates' ? 'governorates' : type === 'cities' ? 'cities' : 'districts';

    try {
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) {
        alert(
          locale === 'ar'
            ? 'حدث خطأ أثناء تغيير الحالة: ' + error.message
            : 'Error changing status: ' + error.message
        );
        return;
      }

      await loadLocations(supabase);
    } catch {
      alert(locale === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    }
  }

  const filteredItems = getFilteredItems();

  const getViewLevelLabel = (level: ViewLevel) => {
    const labels: Record<
      ViewLevel,
      { ar: string; en: string; arSingular: string; enSingular: string; icon: React.ElementType }
    > = {
      governorates: {
        ar: 'المحافظات',
        en: 'Governorates',
        arSingular: 'محافظة',
        enSingular: 'Governorate',
        icon: Building,
      },
      cities: { ar: 'المدن', en: 'Cities', arSingular: 'مدينة', enSingular: 'City', icon: Map },
      districts: {
        ar: 'الأحياء',
        en: 'Districts',
        arSingular: 'حي',
        enSingular: 'District',
        icon: Home,
      },
    };
    return labels[level];
  };

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <main className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
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
              {locale === 'ar' ? 'إدارة المواقع الجغرافية' : 'Location Management'}
            </h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center bg-slate-50">
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
        </main>
      </>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'إدارة المواقع الجغرافية' : 'Location Management'}
        subtitle={
          locale === 'ar' ? 'المحافظات والمدن والأحياء' : 'Governorates, Cities & Districts'
        }
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Tabs - Super Admin Only */}
        {isSuperAdmin && (
          <div className="flex gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('locations')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'locations'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4" />
              {locale === 'ar' ? 'إدارة المواقع' : 'Location Management'}
            </button>
            <button
              onClick={() => {
                setActiveTab('analytics');
                if (analyticsData.length === 0) {
                  loadAnalytics();
                }
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'analytics'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {locale === 'ar' ? 'تحليلات التوسع' : 'Expansion Analytics'}
            </button>
          </div>
        )}

        {/* Location Management Tab */}
        {activeTab === 'locations' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <Building className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-slate-600">
                    {locale === 'ar' ? 'المحافظات' : 'Governorates'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatNumber(stats.activeGovernorates, locale)} /{' '}
                  {formatNumber(stats.totalGovernorates, locale)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <Map className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-slate-600">
                    {locale === 'ar' ? 'المدن' : 'Cities'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatNumber(stats.activeCities, locale)} /{' '}
                  {formatNumber(stats.totalCities, locale)}
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3 mb-2">
                  <Home className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-slate-600">
                    {locale === 'ar' ? 'الأحياء' : 'Districts'}
                  </span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatNumber(stats.activeDistricts, locale)} /{' '}
                  {formatNumber(stats.totalDistricts, locale)}
                </p>
              </div>
            </div>

            {/* Breadcrumb & View Level */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={() => {
                  setViewLevel('governorates');
                  setSelectedGovernorate(null);
                  setSelectedCity(null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  viewLevel === 'governorates'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Building className="w-4 h-4" />
                {locale === 'ar' ? 'المحافظات' : 'Governorates'}
              </button>

              {selectedGovernorate && (
                <>
                  <ChevronRight className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
                  <button
                    onClick={() => {
                      setViewLevel('cities');
                      setSelectedCity(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                      viewLevel === 'cities'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Map className="w-4 h-4" />
                    {locale === 'ar'
                      ? governorates.find((g) => g.id === selectedGovernorate)?.name_ar
                      : governorates.find((g) => g.id === selectedGovernorate)?.name_en}
                  </button>
                </>
              )}

              {selectedCity && (
                <>
                  <ChevronRight className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
                  <button
                    onClick={() => setViewLevel('districts')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                      viewLevel === 'districts'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    {locale === 'ar'
                      ? cities.find((c) => c.id === selectedCity)?.name_ar
                      : cities.find((c) => c.id === selectedCity)?.name_en}
                  </button>
                </>
              )}
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
                    placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-600">
                    {locale === 'ar' ? 'عرض غير النشطة' : 'Show inactive'}
                  </span>
                </label>

                <Button
                  variant="outline"
                  onClick={() => {
                    const supabase = createClient();
                    loadLocations(supabase);
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {locale === 'ar' ? 'تحديث' : 'Refresh'}
                </Button>

                {isSuperAdmin && (
                  <Button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="w-4 h-4" />
                    {viewLevel === 'governorates'
                      ? locale === 'ar'
                        ? 'تفعيل محافظة'
                        : 'Activate Governorate'
                      : viewLevel === 'cities'
                        ? locale === 'ar'
                          ? 'تفعيل مدينة'
                          : 'Activate City'
                        : locale === 'ar'
                          ? 'إضافة ' + getViewLevelLabel(viewLevel).arSingular
                          : 'Add ' + getViewLevelLabel(viewLevel).enSingular}
                  </Button>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                        {locale === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}
                      </th>
                      <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                        {locale === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'}
                      </th>
                      {viewLevel === 'governorates' && (
                        <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                          {locale === 'ar' ? 'المدن' : 'Cities'}
                        </th>
                      )}
                      {viewLevel === 'governorates' && (
                        <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                          {locale === 'ar' ? 'العمولة' : 'Commission'}
                        </th>
                      )}
                      {viewLevel === 'cities' && (
                        <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                          {locale === 'ar' ? 'الأحياء' : 'Districts'}
                        </th>
                      )}
                      <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                        {locale === 'ar' ? 'الحالة' : 'Status'}
                      </th>
                      {isSuperAdmin && (
                        <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                          {locale === 'ar' ? 'إجراءات' : 'Actions'}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.length > 0 ? (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                if (viewLevel === 'governorates') {
                                  setSelectedGovernorate(item.id);
                                  setViewLevel('cities');
                                } else if (viewLevel === 'cities') {
                                  setSelectedCity(item.id);
                                  setViewLevel('districts');
                                }
                              }}
                              className="font-medium text-slate-900 hover:text-red-600 flex items-center gap-2"
                            >
                              {item.name_ar}
                              {viewLevel !== 'districts' && (
                                <ChevronRight
                                  className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`}
                                />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.name_en}</td>
                          {viewLevel === 'governorates' && (
                            <td className="px-4 py-3">
                              <span className="text-sm text-slate-600">
                                {formatNumber((item as Governorate).cities_count || 0, locale)}{' '}
                                {locale === 'ar' ? 'مدينة' : 'cities'}
                              </span>
                            </td>
                          )}
                          {viewLevel === 'governorates' && (
                            <td className="px-4 py-3">
                              {(item as Governorate).commission_override !== null &&
                              (item as Governorate).commission_override !== undefined ? (
                                <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                  <Percent className="w-3 h-3" />
                                  {(item as Governorate).commission_override}%
                                </span>
                              ) : (
                                <span className="text-sm text-slate-400">
                                  {locale === 'ar' ? 'افتراضي (7%)' : 'Default (7%)'}
                                </span>
                              )}
                            </td>
                          )}
                          {viewLevel === 'cities' && (
                            <td className="px-4 py-3">
                              <span className="text-sm text-slate-600">
                                {formatNumber((item as City).districts_count || 0, locale)}{' '}
                                {locale === 'ar' ? 'حي' : 'districts'}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            {item.is_active ? (
                              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3" />
                                {locale === 'ar' ? 'نشط' : 'Active'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                                <XCircle className="w-3 h-3" />
                                {locale === 'ar' ? 'غير نشط' : 'Inactive'}
                              </span>
                            )}
                          </td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleToggleActive(viewLevel, item)}
                                  title={
                                    item.is_active
                                      ? locale === 'ar'
                                        ? 'إلغاء التفعيل'
                                        : 'Deactivate'
                                      : locale === 'ar'
                                        ? 'تفعيل'
                                        : 'Activate'
                                  }
                                >
                                  {item.is_active ? (
                                    <EyeOff className="w-4 h-4 text-amber-500" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-green-500" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEditModal(item)}
                                >
                                  <Edit className="w-4 h-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => openDeleteModal(viewLevel, item)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={
                            isSuperAdmin
                              ? viewLevel === 'governorates'
                                ? 6
                                : 5
                              : viewLevel === 'governorates'
                                ? 5
                                : 4
                          }
                          className="px-4 py-12 text-center"
                        >
                          <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                          <p className="text-slate-500">
                            {locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Analytics Tab - Super Admin Only */}
        {activeTab === 'analytics' && isSuperAdmin && (
          <div className="space-y-6">
            {/* Analytics Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {locale === 'ar' ? 'تحليلات المحافظات' : 'Governorate Analytics'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {locale === 'ar'
                    ? 'بيانات تساعدك على اتخاذ قرارات التوسع'
                    : 'Data to help you make expansion decisions'}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={loadAnalytics}
                disabled={analyticsLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                {locale === 'ar' ? 'تحديث' : 'Refresh'}
              </Button>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <Store className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-slate-600">
                        {locale === 'ar' ? 'إجمالي مقدمي الخدمات' : 'Total Providers'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(
                        analyticsData.reduce((sum, g) => sum + g.providers_count, 0),
                        locale
                      )}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-slate-600">
                        {locale === 'ar' ? 'إجمالي العملاء' : 'Total Customers'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(
                        analyticsData.reduce((sum, g) => sum + g.customers_count, 0),
                        locale
                      )}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <ShoppingBag className="w-5 h-5 text-purple-600" />
                      <span className="text-sm text-slate-600">
                        {locale === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(
                        analyticsData.reduce((sum, g) => sum + g.orders_count, 0),
                        locale
                      )}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-5 h-5 text-amber-600" />
                      <span className="text-sm text-slate-600">
                        {locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(
                        analyticsData.reduce((sum, g) => sum + g.revenue, 0),
                        locale
                      )}{' '}
                      {locale === 'ar' ? 'ج.م' : 'EGP'}
                    </p>
                  </div>
                </div>

                {/* Governorate Rankings */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-red-600" />
                      {locale === 'ar'
                        ? 'ترتيب المحافظات حسب جاهزية التوسع'
                        : 'Governorate Ranking by Expansion Readiness'}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-start px-4 py-3 text-sm font-medium text-slate-600">
                            {locale === 'ar' ? 'المحافظة' : 'Governorate'}
                          </th>
                          <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                            <div className="flex items-center justify-center gap-1">
                              <Target className="w-4 h-4" />
                              {locale === 'ar' ? 'الجاهزية' : 'Readiness'}
                            </div>
                          </th>
                          <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                            <div className="flex items-center justify-center gap-1">
                              <Store className="w-4 h-4" />
                              {locale === 'ar' ? 'مقدمي الخدمات' : 'Providers'}
                            </div>
                          </th>
                          <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="w-4 h-4" />
                              {locale === 'ar' ? 'العملاء' : 'Customers'}
                            </div>
                          </th>
                          <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                            <div className="flex items-center justify-center gap-1">
                              <ShoppingBag className="w-4 h-4" />
                              {locale === 'ar' ? 'الطلبات' : 'Orders'}
                            </div>
                          </th>
                          <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                            <div className="flex items-center justify-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {locale === 'ar' ? 'الإيرادات' : 'Revenue'}
                            </div>
                          </th>
                          <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                            <div className="flex items-center justify-center gap-1">
                              <Activity className="w-4 h-4" />
                              {locale === 'ar' ? 'النمو' : 'Growth'}
                            </div>
                          </th>
                          <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">
                            {locale === 'ar' ? 'الحالة' : 'Status'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analyticsData.map((gov, index) => (
                          <tr key={gov.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    index < 3
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {index + 1}
                                </span>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {locale === 'ar' ? gov.name_ar : gov.name_en}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatNumber(gov.cities_count, locale)}{' '}
                                    {locale === 'ar' ? 'مدينة' : 'cities'} •{' '}
                                    {formatNumber(gov.districts_count, locale)}{' '}
                                    {locale === 'ar' ? 'حي' : 'districts'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center">
                                <div className="w-16">
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={`text-xs font-bold ${
                                        gov.readiness_score >= 70
                                          ? 'text-green-600'
                                          : gov.readiness_score >= 40
                                            ? 'text-amber-600'
                                            : 'text-red-600'
                                      }`}
                                    >
                                      {gov.readiness_score}%
                                    </span>
                                  </div>
                                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        gov.readiness_score >= 70
                                          ? 'bg-green-500'
                                          : gov.readiness_score >= 40
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                      }`}
                                      style={{ width: `${gov.readiness_score}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-medium text-slate-900">
                                  {formatNumber(gov.providers_count, locale)}
                                </span>
                                <span className="text-xs text-green-600">
                                  ({formatNumber(gov.active_providers, locale)}{' '}
                                  {locale === 'ar' ? 'نشط' : 'active'})
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-medium text-slate-900">
                                {formatNumber(gov.customers_count, locale)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-medium text-slate-900">
                                {formatNumber(gov.orders_count, locale)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-medium text-slate-900">
                                  {formatNumber(gov.revenue, locale)}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {locale === 'ar' ? 'متوسط' : 'avg'}:{' '}
                                  {formatNumber(Math.round(gov.avg_order_value), locale)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div
                                className={`inline-flex items-center gap-1 text-sm font-medium ${
                                  gov.growth_rate > 0
                                    ? 'text-green-600'
                                    : gov.growth_rate < 0
                                      ? 'text-red-600'
                                      : 'text-slate-500'
                                }`}
                              >
                                {gov.growth_rate > 0 ? (
                                  <TrendingUp className="w-4 h-4" />
                                ) : gov.growth_rate < 0 ? (
                                  <TrendingDown className="w-4 h-4" />
                                ) : null}
                                {gov.growth_rate > 0 ? '+' : ''}
                                {gov.growth_rate}%
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {gov.is_active ? (
                                <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {locale === 'ar' ? 'نشط' : 'Active'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                                  <XCircle className="w-3 h-3" />
                                  {locale === 'ar' ? 'غير نشط' : 'Inactive'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expansion Recommendations */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    {locale === 'ar' ? 'توصيات التوسع' : 'Expansion Recommendations'}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* High Potential */}
                    {analyticsData.filter((g) => !g.is_active && g.readiness_score >= 30).length >
                      0 && (
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          {locale === 'ar' ? 'محافظات واعدة للتفعيل' : 'Promising for Activation'}
                        </h4>
                        <ul className="space-y-1">
                          {analyticsData
                            .filter((g) => !g.is_active && g.readiness_score >= 30)
                            .slice(0, 3)
                            .map((g) => (
                              <li
                                key={g.id}
                                className="text-sm text-slate-600 flex items-center justify-between"
                              >
                                <span>{locale === 'ar' ? g.name_ar : g.name_en}</span>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  {g.readiness_score}%
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Needs Development */}
                    {analyticsData.filter((g) => g.is_active && g.readiness_score < 40).length >
                      0 && (
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {locale === 'ar' ? 'تحتاج تطوير' : 'Needs Development'}
                        </h4>
                        <ul className="space-y-1">
                          {analyticsData
                            .filter((g) => g.is_active && g.readiness_score < 40)
                            .slice(0, 3)
                            .map((g) => (
                              <li
                                key={g.id}
                                className="text-sm text-slate-600 flex items-center justify-between"
                              >
                                <span>{locale === 'ar' ? g.name_ar : g.name_en}</span>
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                  {g.readiness_score}%
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {/* Top Performers */}
                    {analyticsData.filter((g) => g.is_active && g.readiness_score >= 70).length >
                      0 && (
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          {locale === 'ar' ? 'الأفضل أداءً' : 'Top Performers'}
                        </h4>
                        <ul className="space-y-1">
                          {analyticsData
                            .filter((g) => g.is_active && g.readiness_score >= 70)
                            .slice(0, 3)
                            .map((g) => (
                              <li
                                key={g.id}
                                className="text-sm text-slate-600 flex items-center justify-between"
                              >
                                <span>{locale === 'ar' ? g.name_ar : g.name_en}</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  {g.readiness_score}%
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Readiness Score Legend */}
                  <div className="mt-4 pt-4 border-t border-blue-100">
                    <p className="text-xs text-slate-500 mb-2">
                      {locale === 'ar'
                        ? 'معادلة الجاهزية: مقدمي خدمات (40%) + عملاء (30%) + طلبات (20%) + تغطية جغرافية (10%)'
                        : 'Readiness Formula: Providers (40%) + Customers (30%) + Orders (20%) + Geographic Coverage (10%)'}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        {locale === 'ar' ? '70%+ ممتاز' : '70%+ Excellent'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        {locale === 'ar' ? '40-69% متوسط' : '40-69% Moderate'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        {locale === 'ar' ? 'أقل من 40% يحتاج تطوير' : 'Below 40% Needs Work'}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {viewLevel === 'governorates' && modalType === 'add'
                  ? locale === 'ar'
                    ? 'تفعيل محافظة'
                    : 'Activate Governorate'
                  : viewLevel === 'cities' && modalType === 'add'
                    ? locale === 'ar'
                      ? 'تفعيل مدينة'
                      : 'Activate City'
                    : modalType === 'add'
                      ? locale === 'ar'
                        ? 'إضافة ' + getViewLevelLabel(viewLevel).arSingular
                        : 'Add ' + getViewLevelLabel(viewLevel).enSingular
                      : locale === 'ar'
                        ? 'تعديل ' + getViewLevelLabel(viewLevel).arSingular
                        : 'Edit ' + getViewLevelLabel(viewLevel).enSingular}
              </h2>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Governorate Selection Dropdown - For activating existing governorates */}
              {viewLevel === 'governorates' && modalType === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'اختر المحافظة لتفعيلها' : 'Select Governorate to Activate'}{' '}
                    *
                  </label>
                  <select
                    value={selectedGovernorateToActivate}
                    onChange={(e) => setSelectedGovernorateToActivate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">
                      {locale === 'ar' ? 'اختر المحافظة...' : 'Select governorate...'}
                    </option>
                    {governorates
                      .filter((g) => !g.is_active)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {locale === 'ar' ? g.name_ar : g.name_en}
                        </option>
                      ))}
                  </select>
                  {governorates.filter((g) => !g.is_active).length === 0 && (
                    <p className="mt-2 text-sm text-amber-600">
                      {locale === 'ar'
                        ? 'جميع المحافظات مفعّلة بالفعل'
                        : 'All governorates are already activated'}
                    </p>
                  )}
                </div>
              )}

              {/* City Selection Dropdown - For activating existing cities */}
              {viewLevel === 'cities' && modalType === 'add' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {locale === 'ar' ? 'المحافظة' : 'Governorate'} *
                    </label>
                    <select
                      value={formData.governorate_id}
                      onChange={(e) => {
                        setFormData({ ...formData, governorate_id: e.target.value });
                        setSelectedCityToActivate('');
                      }}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">
                        {locale === 'ar' ? 'اختر المحافظة...' : 'Select governorate...'}
                      </option>
                      {governorates
                        .filter((g) => g.is_active)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {locale === 'ar' ? g.name_ar : g.name_en}
                          </option>
                        ))}
                    </select>
                  </div>

                  {formData.governorate_id && (
                    <>
                      {/* Activate All Cities Option */}
                      {cities.filter(
                        (c) => c.governorate_id === formData.governorate_id && !c.is_active
                      ).length > 1 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activateAllCities}
                              onChange={(e) => {
                                setActivateAllCities(e.target.checked);
                                if (e.target.checked) {
                                  setSelectedCityToActivate('');
                                }
                              }}
                              className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-blue-800">
                                {locale === 'ar' ? 'تفعيل كل المدن' : 'Activate All Cities'}
                              </span>
                              <span className="text-xs text-blue-600">
                                {locale === 'ar'
                                  ? `تفعيل ${cities.filter((c) => c.governorate_id === formData.governorate_id && !c.is_active).length} مدينة دفعة واحدة`
                                  : `Activate ${cities.filter((c) => c.governorate_id === formData.governorate_id && !c.is_active).length} cities at once`}
                              </span>
                            </div>
                          </label>
                        </div>
                      )}

                      {/* Single City Selection - Hidden when activating all */}
                      {!activateAllCities && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            {locale === 'ar' ? 'اختر المدينة لتفعيلها' : 'Select City to Activate'}{' '}
                            *
                          </label>
                          <select
                            value={selectedCityToActivate}
                            onChange={(e) => setSelectedCityToActivate(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                          >
                            <option value="">
                              {locale === 'ar' ? 'اختر المدينة...' : 'Select city...'}
                            </option>
                            {cities
                              .filter(
                                (c) => c.governorate_id === formData.governorate_id && !c.is_active
                              )
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {locale === 'ar' ? c.name_ar : c.name_en}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {cities.filter(
                        (c) => c.governorate_id === formData.governorate_id && !c.is_active
                      ).length === 0 && (
                        <p className="mt-2 text-sm text-amber-600">
                          {locale === 'ar'
                            ? 'جميع مدن هذه المحافظة مفعّلة بالفعل'
                            : 'All cities in this governorate are already activated'}
                        </p>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Name fields - Not shown when adding governorate or city (we're activating existing) */}
              {!(viewLevel === 'governorates' && modalType === 'add') &&
                !(viewLevel === 'cities' && modalType === 'add') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'} *
                      </label>
                      <input
                        type="text"
                        value={formData.name_ar}
                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                        dir="rtl"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {locale === 'ar' ? 'الاسم بالإنجليزية' : 'English Name'} *
                      </label>
                      <input
                        type="text"
                        value={formData.name_en}
                        onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                        dir="ltr"
                      />
                    </div>
                  </>
                )}

              {(viewLevel === 'cities' || viewLevel === 'districts') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'المحافظة' : 'Governorate'} *
                  </label>
                  <select
                    value={formData.governorate_id}
                    onChange={(e) =>
                      setFormData({ ...formData, governorate_id: e.target.value, city_id: '' })
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">
                      {locale === 'ar' ? 'اختر المحافظة' : 'Select governorate'}
                    </option>
                    {governorates.map((g) => (
                      <option key={g.id} value={g.id}>
                        {locale === 'ar' ? g.name_ar : g.name_en}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {viewLevel === 'districts' && formData.governorate_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'المدينة (اختياري)' : 'City (optional)'}
                  </label>
                  <select
                    value={formData.city_id}
                    onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">{locale === 'ar' ? 'بدون مدينة' : 'No city'}</option>
                    {cities
                      .filter((c) => c.governorate_id === formData.governorate_id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {locale === 'ar' ? c.name_ar : c.name_en}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Commission Override - Only for Governorates */}
              {viewLevel === 'governorates' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {locale === 'ar' ? 'نسبة العمولة الخاصة (%)' : 'Custom Commission Rate (%)'}
                  </label>
                  <div className="relative">
                    <Percent
                      className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`}
                    />
                    <input
                      type="number"
                      value={formData.commission_override ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          commission_override:
                            e.target.value === '' ? null : parseFloat(e.target.value),
                        })
                      }
                      className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500`}
                      placeholder={
                        locale === 'ar'
                          ? 'اتركه فارغاً للنسبة الافتراضية (7%)'
                          : 'Leave empty for default rate (7%)'
                      }
                      min="0"
                      max="7"
                      step="0.5"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {locale === 'ar'
                      ? 'الحد الأقصى 7%. اتركه فارغاً لاستخدام النسبة الافتراضية للمنصة.'
                      : 'Max 7%. Leave empty to use platform default rate.'}
                  </p>
                </div>
              )}

              {/* Active/Inactive Toggle - More Prominent (hidden when activating governorate or city) */}
              {!(viewLevel === 'governorates' && modalType === 'add') &&
                !(viewLevel === 'cities' && modalType === 'add') && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">
                          {locale === 'ar' ? 'حالة التفعيل' : 'Activation Status'}
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          {formData.is_active
                            ? locale === 'ar'
                              ? 'سيكون مرئياً للمستخدمين'
                              : 'Will be visible to users'
                            : locale === 'ar'
                              ? 'لن يكون مرئياً للمستخدمين'
                              : 'Will not be visible to users'}
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.is_active}
                        dir="ltr"
                        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                          formData.is_active ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                            formData.is_active ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div
                      className={`mt-2 flex items-center gap-2 text-sm ${formData.is_active ? 'text-green-600' : 'text-slate-500'}`}
                    >
                      {formData.is_active ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{locale === 'ar' ? 'مفعّل' : 'Activated'}</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>{locale === 'ar' ? 'غير مفعّل' : 'Deactivated'}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setModalType(null)}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {(viewLevel === 'governorates' && modalType === 'add') ||
                    (viewLevel === 'cities' && modalType === 'add') ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 me-2" />
                        {viewLevel === 'cities' && activateAllCities
                          ? locale === 'ar'
                            ? 'تفعيل الكل'
                            : 'Activate All'
                          : locale === 'ar'
                            ? 'تفعيل'
                            : 'Activate'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 me-2" />
                        {locale === 'ar' ? 'حفظ' : 'Save'}
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {locale === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteItem(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{formError}</span>
              </div>
            )}

            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-center text-slate-600">
                {locale === 'ar'
                  ? `هل أنت متأكد من حذف "${deleteItem.item.name_ar}"؟`
                  : `Are you sure you want to delete "${deleteItem.item.name_en}"?`}
              </p>
              <p className="text-center text-sm text-slate-500 mt-2">
                {locale === 'ar'
                  ? 'لا يمكن التراجع عن هذا الإجراء'
                  : 'This action cannot be undone'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteItem(null);
                  setFormError('');
                }}
                className="flex-1"
                disabled={formLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={formLoading}
              >
                {formLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'حذف' : 'Delete'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
