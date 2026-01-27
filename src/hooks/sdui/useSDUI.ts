'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

export type SDUIPageType = 'homepage' | 'offers' | 'welcome' | 'providers' | 'search';

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
  | 'providers_grid';

export interface HomepageSection {
  id: string;
  section_type: HomepageSectionType;
  section_key: string;
  title_ar: string;
  title_en: string;
  config: Record<string, any>;
  content: {
    ar?: Record<string, string>;
    en?: Record<string, string>;
  };
  display_order: number;
}

export interface SDUIState {
  sections: HomepageSection[];
  isLoading: boolean;
  isFromCache: boolean;
  error: string | null;
  lastUpdated: Date | null;
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
}

export function useSDUI(options: UseSDUIOptions = {}) {
  const {
    page = 'homepage',
    userRole = 'guest',
    governorateId = null,
    cityId = null,
    previewToken = null,
  } = options;

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
  }, [page, userRole, governorateId, cityId, previewToken]);

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

  return {
    ...state,
    page,
    refetch,
    getSection,
    isSectionVisible,
    getSectionConfig,
    getSectionContent,
    clearCache: clearCurrentCache,
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
    createPreviewDraft,
    saveLayoutVersion,
  };
}
