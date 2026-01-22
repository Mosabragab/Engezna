'use client';

import { useLocale } from 'next-intl';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar } from '@/components/admin';
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  Shield,
  MapPin,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ShoppingCart,
  DollarSign,
  Store,
  BarChart2,
  Map,
  Building,
  Home,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Target,
  Truck,
} from 'lucide-react';

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface City {
  id: string;
  governorate_id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface District {
  id: string;
  governorate_id: string;
  city_id: string | null;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface RegionStats {
  id: string;
  name_ar: string;
  name_en: string;
  type: 'governorate' | 'city' | 'district';
  ordersCount: number;
  revenue: number;
  customersCount: number;
  providersCount: number;
  avgOrderValue: number;
  growthRate: number; // percentage change from previous period
  deliveryPerformance: number; // percentage of on-time deliveries
}

type FilterPeriod = 'week' | 'month' | 'quarter' | 'year';
type ViewLevel = 'governorates' | 'cities' | 'districts';

export default function AdminRegionalAnalyticsPage() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const { toggle: toggleSidebar } = useAdminSidebar();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [regionStats, setRegionStats] = useState<RegionStats[]>([]);
  const [periodFilter, setPeriodFilter] = useState<FilterPeriod>('month');
  const [viewLevel, setViewLevel] = useState<ViewLevel>('governorates');
  const [selectedGovernorate, setSelectedGovernorate] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const [overview, setOverview] = useState({
    totalRegions: 0,
    activeRegions: 0,
    topGrowthRegion: '',
    topRevenueRegion: '',
    totalOrders: 0,
    totalRevenue: 0,
  });

  const loadLocationData = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    // Load governorates
    const { data: govData } = await supabase.from('governorates').select('*').order('name_ar');

    if (govData) setGovernorates(govData);

    // Load cities
    const { data: cityData } = await supabase.from('cities').select('*').order('name_ar');

    if (cityData) setCities(cityData);

    // Load districts
    const { data: districtData } = await supabase.from('districts').select('*').order('name_ar');

    if (districtData) setDistricts(districtData);
  }, []);

  const loadRegionData = useCallback(
    async (supabase: ReturnType<typeof createClient>) => {
      const getDateRange = (period: FilterPeriod) => {
        const start = new Date();
        switch (period) {
          case 'week':
            start.setDate(start.getDate() - 7);
            break;
          case 'month':
            start.setMonth(start.getMonth() - 1);
            break;
          case 'quarter':
            start.setMonth(start.getMonth() - 3);
            break;
          case 'year':
            start.setFullYear(start.getFullYear() - 1);
            break;
        }
        return start.toISOString();
      };

      const startDate = getDateRange(periodFilter);
      const prevStartDate = getDateRange(
        periodFilter === 'week' ? 'month' : periodFilter === 'month' ? 'quarter' : 'year'
      );

      // Get orders with address information
      const { data: ordersData } = await supabase
        .from('orders')
        .select(
          'id, total, platform_commission, created_at, status, customer_id, provider_id, delivery_address'
        )
        .gte('created_at', startDate)
        .eq('status', 'delivered');

      const orders = ordersData || [];

      // Get previous period orders for growth calculation
      const { data: prevOrdersData } = await supabase
        .from('orders')
        .select('id, total, delivery_address')
        .gte('created_at', prevStartDate)
        .lt('created_at', startDate)
        .eq('status', 'delivered');

      const prevOrders = prevOrdersData || [];

      // Get providers with location data
      const { data: providersData } = await supabase
        .from('providers')
        .select('id, governorate_id, city_id, district_id, status')
        .in('status', ['open', 'closed', 'temporarily_paused']);

      const providers = providersData || [];

      // Get customers with district information
      const { data: customersData } = await supabase
        .from('profiles')
        .select('id, district_id')
        .eq('role', 'customer');

      const customers = customersData || [];

      // Calculate stats based on view level
      let stats: RegionStats[] = [];

      // Helper function to match geographic location by ID or name
      const matchesGovernorate = (addr: any, gov: Governorate) => {
        if (!addr) return false;
        return (
          addr.governorate_id === gov.id ||
          addr.governorate_ar === gov.name_ar ||
          addr.governorate_en === gov.name_en
        );
      };

      const matchesCity = (addr: any, city: City) => {
        if (!addr) return false;
        return (
          addr.city_id === city.id || addr.city_ar === city.name_ar || addr.city_en === city.name_en
        );
      };

      const matchesDistrict = (addr: any, district: District) => {
        if (!addr) return false;
        return (
          addr.district_id === district.id ||
          addr.district_ar === district.name_ar ||
          addr.district_en === district.name_en
        );
      };

      if (viewLevel === 'governorates') {
        stats = governorates
          .map((gov) => {
            const govProviders = providers.filter((p) => p.governorate_id === gov.id);
            const govOrders = orders.filter((o) => {
              const addr = o.delivery_address as any;
              return matchesGovernorate(addr, gov);
            });
            const prevGovOrders = prevOrders.filter((o) => {
              const addr = o.delivery_address as any;
              return matchesGovernorate(addr, gov);
            });

            const ordersCount = govOrders.length;
            const revenue = govOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const prevRevenue = prevGovOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const growthRate = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

            const govCustomers = customers.filter((c) => {
              const district = districts.find((d) => d.id === c.district_id);
              return district?.governorate_id === gov.id;
            });

            return {
              id: gov.id,
              name_ar: gov.name_ar,
              name_en: gov.name_en,
              type: 'governorate' as const,
              ordersCount,
              revenue,
              customersCount: govCustomers.length,
              providersCount: govProviders.length,
              avgOrderValue: ordersCount > 0 ? revenue / ordersCount : 0,
              growthRate,
              deliveryPerformance: 95, // Placeholder - would need actual delivery tracking
            };
          })
          .filter((s) => s.ordersCount > 0 || s.providersCount > 0)
          .sort((a, b) => b.revenue - a.revenue);
      } else if (viewLevel === 'cities') {
        const filteredCities = selectedGovernorate
          ? cities.filter((c) => c.governorate_id === selectedGovernorate)
          : cities;

        stats = filteredCities
          .map((city) => {
            const cityProviders = providers.filter((p) => p.city_id === city.id);
            const cityOrders = orders.filter((o) => {
              const addr = o.delivery_address as any;
              return matchesCity(addr, city);
            });
            const prevCityOrders = prevOrders.filter((o) => {
              const addr = o.delivery_address as any;
              return matchesCity(addr, city);
            });

            const ordersCount = cityOrders.length;
            const revenue = cityOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const prevRevenue = prevCityOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const growthRate = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

            const cityCustomers = customers.filter((c) => {
              const district = districts.find((d) => d.id === c.district_id);
              return district?.city_id === city.id;
            });

            return {
              id: city.id,
              name_ar: city.name_ar,
              name_en: city.name_en,
              type: 'city' as const,
              ordersCount,
              revenue,
              customersCount: cityCustomers.length,
              providersCount: cityProviders.length,
              avgOrderValue: ordersCount > 0 ? revenue / ordersCount : 0,
              growthRate,
              deliveryPerformance: 95,
            };
          })
          .filter((s) => s.ordersCount > 0 || s.providersCount > 0)
          .sort((a, b) => b.revenue - a.revenue);
      } else if (viewLevel === 'districts') {
        let filteredDistricts = districts;
        if (selectedCity) {
          filteredDistricts = districts.filter((d) => d.city_id === selectedCity);
        } else if (selectedGovernorate) {
          filteredDistricts = districts.filter((d) => d.governorate_id === selectedGovernorate);
        }

        stats = filteredDistricts
          .map((district) => {
            const districtProviders = providers.filter((p) => p.district_id === district.id);
            const districtOrders = orders.filter((o) => {
              const addr = o.delivery_address as any;
              return matchesDistrict(addr, district);
            });
            const prevDistrictOrders = prevOrders.filter((o) => {
              const addr = o.delivery_address as any;
              return matchesDistrict(addr, district);
            });

            const ordersCount = districtOrders.length;
            const revenue = districtOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const prevRevenue = prevDistrictOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            const growthRate = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

            const districtCustomers = customers.filter((c) => c.district_id === district.id);

            return {
              id: district.id,
              name_ar: district.name_ar,
              name_en: district.name_en,
              type: 'district' as const,
              ordersCount,
              revenue,
              customersCount: districtCustomers.length,
              providersCount: districtProviders.length,
              avgOrderValue: ordersCount > 0 ? revenue / ordersCount : 0,
              growthRate,
              deliveryPerformance: 95,
            };
          })
          .filter((s) => s.ordersCount > 0 || s.providersCount > 0)
          .sort((a, b) => b.revenue - a.revenue);
      }

      setRegionStats(stats);

      // Calculate overview
      const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0);
      const totalOrders = stats.reduce((sum, s) => sum + s.ordersCount, 0);
      const topGrowth = stats.sort((a, b) => b.growthRate - a.growthRate)[0];
      const topRevenue = stats.sort((a, b) => b.revenue - a.revenue)[0];

      setOverview({
        totalRegions: stats.length,
        activeRegions: stats.filter((s) => s.ordersCount > 0).length,
        topGrowthRegion: topGrowth
          ? locale === 'ar'
            ? topGrowth.name_ar
            : topGrowth.name_en
          : '-',
        topRevenueRegion: topRevenue
          ? locale === 'ar'
            ? topRevenue.name_ar
            : topRevenue.name_en
          : '-',
        totalOrders,
        totalRevenue,
      });
    },
    [
      periodFilter,
      viewLevel,
      selectedGovernorate,
      selectedCity,
      governorates,
      cities,
      districts,
      locale,
    ]
  );

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
        await loadLocationData(supabase);
        await loadRegionData(supabase);
      }
    }

    setLoading(false);
  }, [loadLocationData, loadRegionData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAdmin) {
      const supabase = createClient();
      loadRegionData(supabase);
    }
  }, [periodFilter, viewLevel, selectedGovernorate, selectedCity, isAdmin, loadRegionData]);

  const getPeriodLabel = (period: FilterPeriod) => {
    const labels: Record<FilterPeriod, { ar: string; en: string }> = {
      week: { ar: 'أسبوع', en: 'Week' },
      month: { ar: 'شهر', en: 'Month' },
      quarter: { ar: 'ربع سنة', en: 'Quarter' },
      year: { ar: 'سنة', en: 'Year' },
    };
    return labels[period][locale === 'ar' ? 'ar' : 'en'];
  };

  const getViewLevelLabel = (level: ViewLevel) => {
    const labels: Record<ViewLevel, { ar: string; en: string; icon: React.ElementType }> = {
      governorates: { ar: 'المحافظات', en: 'Governorates', icon: Building },
      cities: { ar: 'المدن', en: 'Cities', icon: Map },
      districts: { ar: 'الأحياء', en: 'Districts', icon: Home },
    };
    return labels[level];
  };

  const handleDrillDown = (region: RegionStats) => {
    if (viewLevel === 'governorates') {
      setSelectedGovernorate(region.id);
      setViewLevel('cities');
    } else if (viewLevel === 'cities') {
      setSelectedCity(region.id);
      setViewLevel('districts');
    }
  };

  const handleBreadcrumbClick = (level: ViewLevel) => {
    if (level === 'governorates') {
      setSelectedGovernorate(null);
      setSelectedCity(null);
    } else if (level === 'cities') {
      setSelectedCity(null);
    }
    setViewLevel(level);
  };

  const getSelectedLocationName = () => {
    if (selectedCity) {
      const city = cities.find((c) => c.id === selectedCity);
      return locale === 'ar' ? city?.name_ar : city?.name_en;
    }
    if (selectedGovernorate) {
      const gov = governorates.find((g) => g.id === selectedGovernorate);
      return locale === 'ar' ? gov?.name_ar : gov?.name_en;
    }
    return null;
  };

  const maxRevenue = Math.max(...regionStats.map((s) => s.revenue), 1);

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
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
              {locale === 'ar' ? 'تحليلات المناطق الجغرافية' : 'Regional Analytics'}
            </h1>
          </div>
        </header>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? 'تحليلات المناطق الجغرافية' : 'Regional Analytics'}
        subtitle={locale === 'ar' ? 'تحليل الأداء حسب المواقع' : 'Performance analysis by location'}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto bg-slate-50">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <Link href={`/${locale}/admin/analytics`} className="text-slate-500 hover:text-slate-700">
            {locale === 'ar' ? 'التحليلات' : 'Analytics'}
          </Link>
          <ChevronRight className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
          <button
            onClick={() => handleBreadcrumbClick('governorates')}
            className={`${viewLevel === 'governorates' ? 'text-red-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {locale === 'ar' ? 'المحافظات' : 'Governorates'}
          </button>
          {selectedGovernorate && (
            <>
              <ChevronRight className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
              <button
                onClick={() => handleBreadcrumbClick('cities')}
                className={`${viewLevel === 'cities' ? 'text-red-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {locale === 'ar'
                  ? governorates.find((g) => g.id === selectedGovernorate)?.name_ar
                  : governorates.find((g) => g.id === selectedGovernorate)?.name_en}
              </button>
            </>
          )}
          {selectedCity && (
            <>
              <ChevronRight className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`} />
              <span className="text-red-600 font-medium">
                {locale === 'ar'
                  ? cities.find((c) => c.id === selectedCity)?.name_ar
                  : cities.find((c) => c.id === selectedCity)?.name_en}
              </span>
            </>
          )}
        </div>

        {/* Period Filter */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(['week', 'month', 'quarter', 'year'] as FilterPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setPeriodFilter(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                periodFilter === period
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {getPeriodLabel(period)}
            </button>
          ))}

          <div className={`${isRTL ? 'mr-auto' : 'ml-auto'}`}>
            <Button
              variant="outline"
              onClick={() => {
                const supabase = createClient();
                loadRegionData(supabase);
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {locale === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  {locale === 'ar' ? 'المناطق النشطة' : 'Active Regions'}
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {formatNumber(overview.activeRegions, locale)} /{' '}
                  {formatNumber(overview.totalRegions, locale)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  {locale === 'ar' ? 'أعلى نمو' : 'Top Growth'}
                </p>
                <p className="text-lg font-bold text-slate-900 truncate">
                  {overview.topGrowthRegion}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  {locale === 'ar' ? 'أعلى إيرادات' : 'Top Revenue'}
                </p>
                <p className="text-lg font-bold text-slate-900 truncate">
                  {overview.topRevenueRegion}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  {locale === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(overview.totalRevenue, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* View Level Selector */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              {locale === 'ar' ? 'مستوى العرض' : 'View Level'}
            </h3>
            <div className="flex gap-2">
              {(['governorates', 'cities', 'districts'] as ViewLevel[]).map((level) => {
                const config = getViewLevelLabel(level);
                const Icon = config.icon;
                return (
                  <button
                    key={level}
                    onClick={() => handleBreadcrumbClick(level)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewLevel === level
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {config[locale === 'ar' ? 'ar' : 'en']}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Regions List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                {React.createElement(getViewLevelLabel(viewLevel).icon, {
                  className: 'w-5 h-5 text-slate-600',
                })}
                {getViewLevelLabel(viewLevel)[locale === 'ar' ? 'ar' : 'en']}
                {getSelectedLocationName() && (
                  <span className="text-slate-500 font-normal">
                    {locale === 'ar' ? ' في ' : ' in '}
                    {getSelectedLocationName()}
                  </span>
                )}
              </h3>
              <span className="text-sm text-slate-500">
                {formatNumber(regionStats.length, locale)} {locale === 'ar' ? 'منطقة' : 'regions'}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {regionStats.length > 0 ? (
              regionStats.map((region, index) => (
                <div
                  key={region.id}
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => viewLevel !== 'districts' && handleDrillDown(region)}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-slate-600">
                        {formatNumber(index + 1, locale)}
                      </span>
                    </div>

                    {/* Name & Stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-900">
                          {locale === 'ar' ? region.name_ar : region.name_en}
                        </h4>
                        {viewLevel !== 'districts' && (
                          <ChevronRight
                            className={`w-4 h-4 text-slate-400 ${isRTL ? 'rotate-180' : ''}`}
                          />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {formatNumber(region.ordersCount, locale)}{' '}
                          {locale === 'ar' ? 'طلب' : 'orders'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {formatNumber(region.customersCount, locale)}{' '}
                          {locale === 'ar' ? 'عميل' : 'customers'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Store className="w-3.5 h-3.5" />
                          {formatNumber(region.providersCount, locale)}{' '}
                          {locale === 'ar' ? 'متجر' : 'providers'}
                        </span>
                      </div>
                    </div>

                    {/* Revenue Bar */}
                    <div className="w-48 hidden lg:block">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">
                          {locale === 'ar' ? 'الإيرادات' : 'Revenue'}
                        </span>
                        <span className="text-xs font-medium text-slate-700">
                          {formatCurrency(region.revenue, locale)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(region.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Growth Rate */}
                    <div
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${
                        region.growthRate > 0
                          ? 'bg-green-100 text-green-700'
                          : region.growthRate < 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {region.growthRate > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : region.growthRate < 0 ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : null}
                      {region.growthRate > 0 ? '+' : ''}
                      {formatNumber(Math.round(region.growthRate * 10) / 10, locale)}%
                    </div>

                    {/* Avg Order Value */}
                    <div className="text-end hidden md:block">
                      <p className="text-sm text-slate-500">
                        {locale === 'ar' ? 'متوسط الطلب' : 'Avg. Order'}
                      </p>
                      <p className="font-medium text-slate-900">
                        {formatCurrency(region.avgOrderValue, locale)}{' '}
                        {locale === 'ar' ? 'ج.م' : 'EGP'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">
                  {locale === 'ar'
                    ? 'لا توجد بيانات للمناطق في هذه الفترة'
                    : 'No region data for this period'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Growth Leaders */}
        {regionStats.length > 0 && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Growth Regions */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  {locale === 'ar' ? 'أعلى نمو' : 'Top Growth'}
                </h3>
              </div>
              <div className="space-y-3">
                {regionStats
                  .filter((r) => r.growthRate > 0)
                  .sort((a, b) => b.growthRate - a.growthRate)
                  .slice(0, 5)
                  .map((region, index) => (
                    <div key={region.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                          {formatNumber(index + 1, locale)}
                        </span>
                        <span className="text-slate-900">
                          {locale === 'ar' ? region.name_ar : region.name_en}
                        </span>
                      </div>
                      <span className="text-green-600 font-medium">
                        +{formatNumber(Math.round(region.growthRate * 10) / 10, locale)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Marketing Recommendations */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  {locale === 'ar' ? 'توصيات التسويق' : 'Marketing Recommendations'}
                </h3>
              </div>
              <div className="space-y-3">
                {/* High potential, low coverage */}
                {regionStats
                  .filter((r) => r.customersCount > 0 && r.providersCount < 3)
                  .slice(0, 3)
                  .map((region) => (
                    <div
                      key={region.id}
                      className="p-3 bg-purple-50 rounded-lg border border-purple-100"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Store className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-purple-900">
                          {locale === 'ar' ? region.name_ar : region.name_en}
                        </span>
                      </div>
                      <p className="text-sm text-purple-700">
                        {locale === 'ar'
                          ? `${formatNumber(region.customersCount, locale)} عميل - تحتاج المزيد من المتاجر`
                          : `${formatNumber(region.customersCount, locale)} customers - needs more providers`}
                      </p>
                    </div>
                  ))}
                {regionStats.filter((r) => r.customersCount > 0 && r.providersCount < 3).length ===
                  0 && (
                  <p className="text-slate-500 text-sm text-center py-4">
                    {locale === 'ar' ? 'لا توجد توصيات حالياً' : 'No recommendations at this time'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
