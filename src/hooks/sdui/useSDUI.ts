'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

export type SDUIPageType =
  | 'homepage'
  | 'offers'
  | 'welcome'
  | 'providers'
  | 'search_results'
  | 'provider_dashboard';

export interface LayoutVersion {
  id: string;
  version_number: number;
  version_name: string | null;
  sections_snapshot: HomepageSection[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export type HomepageSectionType =
  | 'hero_search'
  | 'address_selector'
  | 'offers_carousel'
  | 'categories'
  | 'reorder'
  | 'top_rated'
  | 'nearby'
  | 'featured_products'
  | 'custom_html'
  | 'announcement'
  // Offers page sections
  | 'offers_hero'
  | 'promo_codes'
  | 'free_delivery'
  | 'flash_deals'
  | 'category_offers'
  // Welcome page sections
  | 'welcome_hero'
  | 'welcome_categories'
  | 'welcome_features'
  | 'welcome_steps'
  | 'welcome_governorates'
  | 'welcome_cta'
  | 'welcome_partners'
  // Providers page sections
  | 'providers_header'
  | 'providers_search'
  | 'providers_categories'
  | 'providers_filters'
  | 'providers_grid'
  // Provider dashboard sections
  | 'dashboard_stats'
  | 'dashboard_orders'
  | 'dashboard_revenue'
  | 'dashboard_menu'
  | 'dashboard_reviews'
  | 'dashboard_notifications'
  // Search results page sections
  | 'search_header'
  | 'search_input'
  | 'search_tabs'
  | 'search_stores'
  | 'search_products'
  | 'search_suggestions'
  | 'search_empty'
  // Custom content sections
  | 'custom_html'
  | 'custom_banner';

export interface HomepageSection {
  id: string;
  page?: SDUIPageType;
  section_type: HomepageSectionType;
  section_key: string;
  title_ar: string;
  title_en: string;
  config: Record<string, any>;
  content: Record<string, any>;
  display_order: number;
  is_visible?: boolean;
}

export interface SDUIState {
  sections: HomepageSection[];
  isLoading: boolean;
  isFromCache: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface SectionAnalytics {
  section_key: string;
  page: string;
  total_views: number;
  total_clicks: number;
  click_rate: number;
  unique_devices: number;
  top_device: string | null;
  trend_direction: 'up' | 'down' | 'stable' | 'new';
}

export interface DailyAnalytics {
  event_date: string;
  views: number;
  clicks: number;
  interactions: number;
}

export interface ABTest {
  id: string;
  name: string;
  description: string | null;
  page: string;
  section_key: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed';
  traffic_percentage: number;
  starts_at: string | null;
  ends_at: string | null;
  goal_type: 'click' | 'conversion' | 'engagement' | 'custom';
  goal_section_key: string | null;
  created_at: string;
}

export interface ABTestVariant {
  id: string;
  test_id: string;
  name: string;
  is_control: boolean;
  weight: number;
  section_config: Record<string, any> | null;
  section_content: Record<string, any> | null;
  views: number;
  conversions: number;
}

export interface ABTestResult {
  variant_id: string;
  variant_name: string;
  is_control: boolean;
  views: number;
  conversions: number;
  conversion_rate: number;
  improvement_vs_control: number;
  is_winner: boolean;
}

// =============================================================================
// Default Sections (Layer 1: Fallback - always available)
// =============================================================================

const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  {
    id: 'default-hero',
    section_type: 'hero_search',
    section_key: 'hero_search',
    title_ar: 'البحث',
    title_en: 'Search',
    config: { showAIButton: false },
    content: {
      ar: { placeholder: 'ابحث عن مطعم أو منتج...' },
      en: { placeholder: 'Search for restaurant or product...' },
    },
    display_order: 1,
  },
  {
    id: 'default-address',
    section_type: 'address_selector',
    section_key: 'address_selector',
    title_ar: 'اختيار العنوان',
    title_en: 'Address Selector',
    config: {},
    content: {},
    display_order: 2,
  },
  {
    id: 'default-offers',
    section_type: 'offers_carousel',
    section_key: 'offers_carousel',
    title_ar: 'العروض والخصومات',
    title_en: 'Offers & Discounts',
    config: { autoplay: true, autoplayInterval: 5000, showDots: true, showViewAll: true },
    content: {
      ar: { viewAllText: 'عرض الكل' },
      en: { viewAllText: 'View All' },
    },
    display_order: 3,
  },
  {
    id: 'default-categories',
    section_type: 'categories',
    section_key: 'categories',
    title_ar: 'الأقسام',
    title_en: 'Categories',
    config: { columns: 4, showLabels: true },
    content: {},
    display_order: 4,
  },
  {
    id: 'default-reorder',
    section_type: 'reorder',
    section_key: 'reorder',
    title_ar: 'أعد طلبك السابق',
    title_en: 'Reorder',
    config: {},
    content: {
      ar: { title: 'أعد طلبك السابق', buttonText: 'اطلب مرة أخرى' },
      en: { title: 'Reorder', buttonText: 'Order Again' },
    },
    display_order: 5,
  },
  {
    id: 'default-top-rated',
    section_type: 'top_rated',
    section_key: 'top_rated',
    title_ar: 'الأعلى تقييماً',
    title_en: 'Top Rated',
    config: { maxItems: 6, showRating: true, showDeliveryFee: true },
    content: {
      ar: { title: 'الأعلى تقييماً', viewAllText: 'عرض الكل' },
      en: { title: 'Top Rated', viewAllText: 'View All' },
    },
    display_order: 6,
  },
  {
    id: 'default-nearby',
    section_type: 'nearby',
    section_key: 'nearby',
    title_ar: 'القريبون منك',
    title_en: 'Nearby',
    config: { maxItems: 6, showDistance: true },
    content: {
      ar: { title: 'القريبون منك', viewAllText: 'عرض الكل' },
      en: { title: 'Nearby', viewAllText: 'View All' },
    },
    display_order: 7,
  },
];

const DEFAULT_OFFERS_SECTIONS: HomepageSection[] = [
  {
    id: 'default-offers-hero',
    section_type: 'offers_hero',
    section_key: 'offers_hero',
    title_ar: 'العرض المميز',
    title_en: 'Featured Offer',
    config: { showCode: true },
    content: {
      ar: {
        badge: 'عرض اليوم',
        title: 'خصم 50% على أول طلب!',
        description: 'استخدم الكود WELCOME50 واحصل على خصم 50% على طلبك الأول',
        code: 'WELCOME50',
        buttonText: 'اطلب الآن',
      },
      en: {
        badge: "Today's Deal",
        title: '50% OFF First Order!',
        description: 'Use code WELCOME50 and get 50% off your first order',
        code: 'WELCOME50',
        buttonText: 'Order Now',
      },
    },
    display_order: 1,
  },
  {
    id: 'default-promo-codes',
    section_type: 'promo_codes',
    section_key: 'promo_codes',
    title_ar: 'أكواد الخصم',
    title_en: 'Promo Codes',
    config: { maxItems: 5, showExpiry: true },
    content: {
      ar: { title: 'أكواد الخصم' },
      en: { title: 'Discount Codes' },
    },
    display_order: 2,
  },
  {
    id: 'default-free-delivery',
    section_type: 'free_delivery',
    section_key: 'free_delivery',
    title_ar: 'توصيل مجاني',
    title_en: 'Free Delivery',
    config: { maxItems: 6, showRating: true },
    content: {
      ar: { title: 'توصيل مجاني' },
      en: { title: 'Free Delivery' },
    },
    display_order: 3,
  },
];

const DEFAULT_WELCOME_SECTIONS: HomepageSection[] = [
  {
    id: 'default-welcome-hero',
    section_type: 'welcome_hero',
    section_key: 'welcome_hero',
    title_ar: 'الصفحة الرئيسية',
    title_en: 'Hero Section',
    config: { showLogo: true, showLoginLink: true },
    content: {
      ar: {
        title: 'عايز تطلب؟ إنجزنا!',
        subtitle: 'لتلبية احتياجات بيتك اليومية من أقرب تاجر - بدون رسوم خدمة',
        ctaText: 'اختر موقعك للبدء',
      },
      en: {
        title: 'Want to order? Engezna!',
        subtitle: 'For your daily home essentials from the nearest merchant - no service fees',
        ctaText: 'Select Your Location to Start',
      },
    },
    display_order: 1,
  },
  {
    id: 'default-welcome-categories',
    section_type: 'welcome_categories',
    section_key: 'welcome_categories',
    title_ar: 'ماذا نقدم',
    title_en: 'What We Offer',
    config: { columns: 5 },
    content: {},
    display_order: 2,
  },
  {
    id: 'default-welcome-features',
    section_type: 'welcome_features',
    section_key: 'welcome_features',
    title_ar: 'مميزات إنجزنا',
    title_en: 'Why Engezna',
    config: { columns: 3 },
    content: {
      ar: { title: 'ليه إنجزنا؟' },
      en: { title: 'Why Engezna?' },
    },
    display_order: 3,
  },
  {
    id: 'default-welcome-steps',
    section_type: 'welcome_steps',
    section_key: 'welcome_steps',
    title_ar: 'كيف يعمل',
    title_en: 'How It Works',
    config: { showNumbers: true },
    content: {
      ar: { title: 'كيف يعمل؟' },
      en: { title: 'How It Works' },
    },
    display_order: 4,
  },
  {
    id: 'default-welcome-governorates',
    section_type: 'welcome_governorates',
    section_key: 'welcome_governorates',
    title_ar: 'المحافظات المتاحة',
    title_en: 'Available Governorates',
    config: {},
    content: {
      ar: { title: 'متاحين في' },
      en: { title: 'Available In' },
    },
    display_order: 5,
  },
  {
    id: 'default-welcome-cta',
    section_type: 'welcome_cta',
    section_key: 'welcome_cta',
    title_ar: 'ابدأ الآن',
    title_en: 'Start Now',
    config: { showButton: true },
    content: {
      ar: { title: 'جاهز تبدأ؟', buttonText: 'اختر موقعك الآن' },
      en: { title: 'Ready to Start?', buttonText: 'Select Your Location Now' },
    },
    display_order: 6,
  },
];

const DEFAULT_PROVIDERS_SECTIONS: HomepageSection[] = [
  {
    id: 'default-providers-header',
    section_type: 'providers_header',
    section_key: 'providers_header',
    title_ar: 'رأس صفحة مقدمي الخدمات',
    title_en: 'Providers Page Header',
    config: { showLocation: true, showBackButton: true },
    content: {
      ar: { title: 'مقدمو الخدمات' },
      en: { title: 'Service Providers' },
    },
    display_order: 1,
  },
  {
    id: 'default-providers-search',
    section_type: 'providers_search',
    section_key: 'providers_search',
    title_ar: 'شريط البحث',
    title_en: 'Search Bar',
    config: { showFilters: true, showVoiceSearch: false },
    content: {
      ar: { placeholder: 'ابحث عن مطعم أو محل...' },
      en: { placeholder: 'Search for restaurant or store...' },
    },
    display_order: 2,
  },
  {
    id: 'default-providers-categories',
    section_type: 'providers_categories',
    section_key: 'providers_categories',
    title_ar: 'فلترة بالفئات',
    title_en: 'Category Filter',
    config: { scrollable: true, showAll: true },
    content: {
      ar: { allLabel: 'الكل' },
      en: { allLabel: 'All' },
    },
    display_order: 3,
  },
  {
    id: 'default-providers-filters',
    section_type: 'providers_filters',
    section_key: 'providers_filters',
    title_ar: 'فلاتر سريعة',
    title_en: 'Quick Filters',
    config: { showOpenNow: true, showOffers: true, showFreeDelivery: true, showRating: true },
    content: {
      ar: {
        openNow: 'مفتوح الآن',
        offers: 'عروض',
        freeDelivery: 'توصيل مجاني',
        topRated: 'الأعلى تقييماً',
      },
      en: {
        openNow: 'Open Now',
        offers: 'Offers',
        freeDelivery: 'Free Delivery',
        topRated: 'Top Rated',
      },
    },
    display_order: 4,
  },
  {
    id: 'default-providers-grid',
    section_type: 'providers_grid',
    section_key: 'providers_grid',
    title_ar: 'قائمة مقدمي الخدمات',
    title_en: 'Providers Grid',
    config: { columns: 2, showRating: true, showDeliveryFee: true, showDeliveryTime: true },
    content: {
      ar: { noResults: 'لا توجد نتائج', loading: 'جاري التحميل...' },
      en: { noResults: 'No results found', loading: 'Loading...' },
    },
    display_order: 5,
  },
];

function getDefaultSections(page: SDUIPageType): HomepageSection[] {
  switch (page) {
    case 'offers':
      return DEFAULT_OFFERS_SECTIONS;
    case 'welcome':
      return DEFAULT_WELCOME_SECTIONS;
    case 'providers':
      return DEFAULT_PROVIDERS_SECTIONS;
    case 'homepage':
    default:
      return DEFAULT_HOMEPAGE_SECTIONS;
  }
}

// =============================================================================
// Cache Utilities (Layer 2: LocalStorage)
// =============================================================================

const CACHE_KEY_PREFIX = 'engezna_sdui_';
const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

interface CachedData {
  sections: HomepageSection[];
  timestamp: number;
  version: string;
}

function getCacheKey(page: SDUIPageType): string {
  return `${CACHE_KEY_PREFIX}${page}`;
}

function getCachedSections(page: SDUIPageType = 'homepage'): HomepageSection[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(getCacheKey(page));
    if (!cached) return null;

    const data: CachedData = JSON.parse(cached);

    // Check if cache is expired
    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(getCacheKey(page));
      return null;
    }

    return data.sections;
  } catch {
    return null;
  }
}

function setCachedSections(sections: HomepageSection[], page: SDUIPageType = 'homepage'): void {
  if (typeof window === 'undefined') return;

  try {
    const data: CachedData = {
      sections,
      timestamp: Date.now(),
      version: '1.0',
    };
    localStorage.setItem(getCacheKey(page), JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function clearCache(page?: SDUIPageType): void {
  if (typeof window === 'undefined') return;
  try {
    if (page) {
      localStorage.removeItem(getCacheKey(page));
    } else {
      // Clear all SDUI caches
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_KEY_PREFIX));
      keys.forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // Ignore
  }
}

// =============================================================================
// Main Hook
// =============================================================================

interface UseSDUIOptions {
  page?: SDUIPageType;
  userRole?: string;
  governorateId?: string | null;
  cityId?: string | null;
  previewToken?: string | null; // For preview mode
  deviceType?: 'mobile' | 'desktop' | 'tablet' | null; // For device targeting
  isNewUser?: boolean | null; // For user behavior targeting
}

// Detect device type
function detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Check if user is new (first visit)
function checkIsNewUser(): boolean {
  if (typeof window === 'undefined') return true;
  const visited = localStorage.getItem('engezna_visited');
  if (!visited) {
    localStorage.setItem('engezna_visited', Date.now().toString());
    return true;
  }
  return false;
}

export function useSDUI(options: UseSDUIOptions = {}) {
  const {
    page = 'homepage',
    userRole = 'guest',
    governorateId = null,
    cityId = null,
    previewToken = null,
    deviceType: providedDeviceType = null,
    isNewUser: providedIsNewUser = null,
  } = options;

  // Auto-detect device type and user status if not provided
  const [autoDeviceType, setAutoDeviceType] = useState<'mobile' | 'desktop' | 'tablet'>('desktop');
  const [autoIsNewUser, setAutoIsNewUser] = useState<boolean | null>(null);

  useEffect(() => {
    setAutoDeviceType(detectDeviceType());
    setAutoIsNewUser(checkIsNewUser());

    // Update device type on resize
    const handleResize = () => setAutoDeviceType(detectDeviceType());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const deviceType = providedDeviceType || autoDeviceType;
  const isNewUser = providedIsNewUser ?? autoIsNewUser;

  const [state, setState] = useState<SDUIState>({
    sections: getDefaultSections(page), // Start with defaults (Layer 1)
    isLoading: true,
    isFromCache: false,
    error: null,
    lastUpdated: null,
  });

  const fetchInProgress = useRef(false);
  const mounted = useRef(true);

  // Fetch sections from server (Layer 3)
  const fetchSections = useCallback(async () => {
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;

    try {
      const supabase = createClient();

      // If preview mode, fetch draft
      if (previewToken) {
        const { data: draft, error: draftError } = await supabase
          .from('homepage_section_drafts')
          .select('draft_data')
          .eq('preview_token', previewToken)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (!draftError && draft?.draft_data) {
          const sections = draft.draft_data as HomepageSection[];
          if (mounted.current) {
            setState({
              sections: sections.sort((a, b) => a.display_order - b.display_order),
              isLoading: false,
              isFromCache: false,
              error: null,
              lastUpdated: new Date(),
            });
          }
          return;
        }
      }

      // Fetch from database using the function
      const { data, error } = await supabase.rpc('get_page_sections', {
        p_page: page,
        p_user_role: userRole,
        p_governorate_id: governorateId,
        p_city_id: cityId,
        p_device_type: deviceType,
        p_is_new_user: isNewUser,
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const sections = data as HomepageSection[];

        // Update cache
        setCachedSections(sections, page);

        if (mounted.current) {
          setState({
            sections: sections.sort((a, b) => a.display_order - b.display_order),
            isLoading: false,
            isFromCache: false,
            error: null,
            lastUpdated: new Date(),
          });
        }
      } else {
        // No sections from server, keep current state (could be cache or default)
        if (mounted.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
          }));
        }
      }
    } catch (error: any) {
      console.error('SDUI fetch error:', error);

      if (mounted.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Failed to load sections',
        }));
      }
    } finally {
      fetchInProgress.current = false;
    }
  }, [page, userRole, governorateId, cityId, previewToken, deviceType, isNewUser]);

  // Initial load: Try cache first (Layer 2), then fetch from server (Layer 3)
  useEffect(() => {
    mounted.current = true;

    // Try cache first
    const cached = getCachedSections(page);
    if (cached && cached.length > 0) {
      setState({
        sections: cached.sort((a, b) => a.display_order - b.display_order),
        isLoading: true, // Still loading to get fresh data
        isFromCache: true,
        error: null,
        lastUpdated: null,
      });
    } else {
      // Reset to defaults when page changes
      setState({
        sections: getDefaultSections(page),
        isLoading: true,
        isFromCache: false,
        error: null,
        lastUpdated: null,
      });
    }

    // Fetch from server (will update if different)
    fetchSections();

    return () => {
      mounted.current = false;
    };
  }, [page, fetchSections]);

  // Refetch function for manual refresh
  const refetch = useCallback(() => {
    clearCache(page);
    setState((prev) => ({ ...prev, isLoading: true }));
    fetchSections();
  }, [page, fetchSections]);

  // Get section by key
  const getSection = useCallback(
    (key: string): HomepageSection | undefined => {
      return state.sections.find((s) => s.section_key === key);
    },
    [state.sections]
  );

  // Check if section is visible
  const isSectionVisible = useCallback(
    (key: string): boolean => {
      const section = getSection(key);
      return section !== undefined;
    },
    [getSection]
  );

  // Get section config
  const getSectionConfig = useCallback(
    <T extends Record<string, any>>(key: string, defaultConfig: T): T => {
      const section = getSection(key);
      return section ? { ...defaultConfig, ...section.config } : defaultConfig;
    },
    [getSection]
  );

  // Get section content by locale
  const getSectionContent = useCallback(
    (key: string, locale: 'ar' | 'en'): Record<string, string> => {
      const section = getSection(key);
      return section?.content?.[locale] || {};
    },
    [getSection]
  );

  // Memoized clearCache for current page
  const clearCurrentCache = useCallback(() => clearCache(page), [page]);

  // Track section event (view, click, interaction)
  const trackSectionEvent = useCallback(
    async (
      sectionKey: string,
      eventType: 'view' | 'click' | 'interaction',
      options?: {
        deviceType?: 'mobile' | 'desktop' | 'tablet';
        governorateId?: string;
        cityId?: string;
      }
    ) => {
      try {
        const supabase = createClient();

        // Detect device type if not provided
        let deviceType = options?.deviceType;
        if (!deviceType && typeof window !== 'undefined') {
          const width = window.innerWidth;
          deviceType = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
        }

        await supabase.rpc('track_section_event', {
          p_section_key: sectionKey,
          p_page: page,
          p_event_type: eventType,
          p_device_type: deviceType,
          p_user_type: userRole,
          p_governorate_id: options?.governorateId || governorateId,
          p_city_id: options?.cityId || cityId,
        });
      } catch (error) {
        // Silently fail - analytics shouldn't break the app
        console.debug('Analytics tracking error:', error);
      }
    },
    [page, userRole, governorateId, cityId]
  );

  return {
    ...state,
    page,
    refetch,
    getSection,
    isSectionVisible,
    getSectionConfig,
    getSectionContent,
    clearCache: clearCurrentCache,
    trackSectionEvent,
  };
}

// =============================================================================
// Admin Hook for Managing Sections
// =============================================================================

interface UseSDUIAdminOptions {
  page?: SDUIPageType;
}

export function useSDUIAdmin(options: UseSDUIAdminOptions = {}) {
  const { page = 'homepage' } = options;

  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sections (including hidden) for the specified page
  const fetchAllSections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('page', page)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setSections(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchAllSections();
  }, [fetchAllSections]);

  // Update section visibility
  const toggleVisibility = useCallback(async (sectionId: string, isVisible: boolean) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('homepage_sections')
        .update({ is_visible: isVisible })
        .eq('id', sectionId);

      if (error) throw error;

      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, is_visible: isVisible } : s))
      );
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Reorder sections
  const reorderSections = useCallback(
    async (newOrder: { id: string; order: number }[]) => {
      setIsSaving(true);
      try {
        const supabase = createClient();
        const { error } = await supabase.rpc('reorder_page_sections', {
          p_page: page,
          p_section_orders: newOrder,
        });

        if (error) throw error;

        // Update local state
        setSections((prev) => {
          const updated = [...prev];
          newOrder.forEach(({ id, order }) => {
            const section = updated.find((s) => s.id === id);
            if (section) section.display_order = order;
          });
          return updated.sort((a, b) => a.display_order - b.display_order);
        });
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [page]
  );

  // Update section config
  const updateSectionConfig = useCallback(
    async (sectionId: string, config: Record<string, any>) => {
      setIsSaving(true);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('homepage_sections')
          .update({ config })
          .eq('id', sectionId);

        if (error) throw error;

        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, config } : s)));
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Update section content
  const updateSectionContent = useCallback(
    async (
      sectionId: string,
      content: { ar?: Record<string, string>; en?: Record<string, string> }
    ) => {
      setIsSaving(true);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('homepage_sections')
          .update({ content })
          .eq('id', sectionId);

        if (error) throw error;

        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, content } : s)));
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Create new section
  const createSection = useCallback(
    async (
      sectionData: Omit<HomepageSection, 'id' | 'display_order'> & { display_order?: number }
    ) => {
      setIsSaving(true);
      try {
        const supabase = createClient();

        // Get max display_order
        const { data: maxOrder } = await supabase
          .from('homepage_sections')
          .select('display_order')
          .eq('page', page)
          .order('display_order', { ascending: false })
          .limit(1)
          .single();

        const newOrder = (maxOrder?.display_order || 0) + 1;

        const { data, error } = await supabase
          .from('homepage_sections')
          .insert({
            ...sectionData,
            page,
            display_order: sectionData.display_order ?? newOrder,
          })
          .select()
          .single();

        if (error) throw error;

        setSections((prev) => [...prev, data].sort((a, b) => a.display_order - b.display_order));
        return data;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [page]
  );

  // Update section
  const updateSection = useCallback(
    async (sectionId: string, updates: Partial<HomepageSection>) => {
      setIsSaving(true);
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('homepage_sections')
          .update(updates)
          .eq('id', sectionId);

        if (error) throw error;

        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)));
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Delete section
  const deleteSection = useCallback(async (sectionId: string) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('homepage_sections').delete().eq('id', sectionId);

      if (error) throw error;

      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Create preview draft
  const createPreviewDraft = useCallback(
    async (sectionsData: HomepageSection[]): Promise<string> => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('homepage_section_drafts')
        .insert({
          draft_data: sectionsData,
          created_by: user.id,
        })
        .select('preview_token')
        .single();

      if (error) throw error;

      return data.preview_token;
    },
    []
  );

  // Save layout version
  const saveLayoutVersion = useCallback(async (versionName?: string) => {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('save_homepage_layout_version', {
      p_version_name: versionName || null,
    });

    if (error) throw error;

    return data;
  }, []);

  // Fetch version history
  const fetchVersionHistory = useCallback(async (): Promise<LayoutVersion[]> => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('homepage_layout_versions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return data || [];
  }, []);

  // Rollback to a specific version
  const rollbackToVersion = useCallback(
    async (versionId: string) => {
      setIsSaving(true);
      try {
        const supabase = createClient();

        // Get the version snapshot
        const { data: version, error: versionError } = await supabase
          .from('homepage_layout_versions')
          .select('sections_snapshot')
          .eq('id', versionId)
          .single();

        if (versionError) throw versionError;

        const snapshot = version.sections_snapshot as HomepageSection[];

        // Delete current sections for this page
        const { error: deleteError } = await supabase
          .from('homepage_sections')
          .delete()
          .eq('page', page);

        if (deleteError) throw deleteError;

        // Insert sections from snapshot
        const sectionsToInsert = snapshot
          .filter((s: any) => s.page === page)
          .map((s: any) => ({
            ...s,
            id: undefined, // Let DB generate new IDs
          }));

        if (sectionsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('homepage_sections')
            .insert(sectionsToInsert);

          if (insertError) throw insertError;
        }

        // Clear cache and refetch
        clearCache(page);
        await fetchAllSections();

        return true;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [page, fetchAllSections]
  );

  // Delete a version
  const deleteVersion = useCallback(async (versionId: string) => {
    const supabase = createClient();

    const { error } = await supabase.from('homepage_layout_versions').delete().eq('id', versionId);

    if (error) throw error;
  }, []);

  // Compare two versions and return differences
  const compareVersions = useCallback(
    (
      version1: HomepageSection[],
      version2: HomepageSection[]
    ): {
      added: HomepageSection[];
      removed: HomepageSection[];
      modified: { before: HomepageSection; after: HomepageSection }[];
    } => {
      const v1Map = new Map(version1.map((s) => [s.section_key, s]));
      const v2Map = new Map(version2.map((s) => [s.section_key, s]));

      const added: HomepageSection[] = [];
      const removed: HomepageSection[] = [];
      const modified: { before: HomepageSection; after: HomepageSection }[] = [];

      // Find added and modified
      version2.forEach((s) => {
        const oldSection = v1Map.get(s.section_key);
        if (!oldSection) {
          added.push(s);
        } else if (JSON.stringify(oldSection) !== JSON.stringify(s)) {
          modified.push({ before: oldSection, after: s });
        }
      });

      // Find removed
      version1.forEach((s) => {
        if (!v2Map.has(s.section_key)) {
          removed.push(s);
        }
      });

      return { added, removed, modified };
    },
    []
  );

  // Fetch section analytics
  const fetchAnalytics = useCallback(
    async (startDate?: Date, endDate?: Date): Promise<SectionAnalytics[]> => {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('get_section_analytics', {
        p_page: page,
        p_start_date: startDate?.toISOString().split('T')[0] || null,
        p_end_date: endDate?.toISOString().split('T')[0] || null,
      });

      if (error) throw error;

      return data || [];
    },
    [page]
  );

  // Fetch daily analytics for a specific section
  const fetchDailyAnalytics = useCallback(
    async (sectionKey: string, days: number = 30): Promise<DailyAnalytics[]> => {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('get_section_daily_analytics', {
        p_section_key: sectionKey,
        p_page: page,
        p_days: days,
      });

      if (error) throw error;

      return data || [];
    },
    [page]
  );

  // =========================================================================
  // A/B Testing Functions
  // =========================================================================

  // Fetch all A/B tests for this page
  const fetchABTests = useCallback(async (): Promise<ABTest[]> => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('sdui_ab_tests')
      .select('*')
      .eq('page', page)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  }, [page]);

  // Create new A/B test
  const createABTest = useCallback(
    async (test: Omit<ABTest, 'id' | 'created_at'>): Promise<string> => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('sdui_ab_tests')
        .insert({
          ...test,
          created_by: user?.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    },
    []
  );

  // Update A/B test
  const updateABTest = useCallback(async (testId: string, updates: Partial<ABTest>) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('sdui_ab_tests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', testId);

    if (error) throw error;
  }, []);

  // Delete A/B test
  const deleteABTest = useCallback(async (testId: string) => {
    const supabase = createClient();

    const { error } = await supabase.from('sdui_ab_tests').delete().eq('id', testId);

    if (error) throw error;
  }, []);

  // Fetch variants for a test
  const fetchABTestVariants = useCallback(async (testId: string): Promise<ABTestVariant[]> => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('sdui_ab_test_variants')
      .select('*')
      .eq('test_id', testId)
      .order('is_control', { ascending: false });

    if (error) throw error;

    return data || [];
  }, []);

  // Create variant
  const createABTestVariant = useCallback(
    async (variant: Omit<ABTestVariant, 'id' | 'views' | 'conversions'>): Promise<string> => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('sdui_ab_test_variants')
        .insert(variant)
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    },
    []
  );

  // Update variant
  const updateABTestVariant = useCallback(
    async (variantId: string, updates: Partial<ABTestVariant>) => {
      const supabase = createClient();

      const { error } = await supabase
        .from('sdui_ab_test_variants')
        .update(updates)
        .eq('id', variantId);

      if (error) throw error;
    },
    []
  );

  // Delete variant
  const deleteABTestVariant = useCallback(async (variantId: string) => {
    const supabase = createClient();

    const { error } = await supabase.from('sdui_ab_test_variants').delete().eq('id', variantId);

    if (error) throw error;
  }, []);

  // Get A/B test results
  const getABTestResults = useCallback(async (testId: string): Promise<ABTestResult[]> => {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('get_ab_test_results', {
      p_test_id: testId,
    });

    if (error) throw error;

    return data || [];
  }, []);

  return {
    sections,
    page,
    isLoading,
    isSaving,
    error,
    refetch: fetchAllSections,
    toggleVisibility,
    reorderSections,
    updateSectionConfig,
    updateSectionContent,
    createSection,
    updateSection,
    deleteSection,
    createPreviewDraft,
    saveLayoutVersion,
    fetchVersionHistory,
    rollbackToVersion,
    deleteVersion,
    compareVersions,
    fetchAnalytics,
    fetchDailyAnalytics,
    // A/B Testing
    fetchABTests,
    createABTest,
    updateABTest,
    deleteABTest,
    fetchABTestVariants,
    createABTestVariant,
    updateABTestVariant,
    deleteABTestVariant,
    getABTestResults,
  };
}
