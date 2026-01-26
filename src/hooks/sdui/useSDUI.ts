'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

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
  | 'announcement';

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

const DEFAULT_SECTIONS: HomepageSection[] = [
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

// =============================================================================
// Cache Utilities (Layer 2: LocalStorage)
// =============================================================================

const CACHE_KEY = 'engezna_sdui_sections';
const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

interface CachedData {
  sections: HomepageSection[];
  timestamp: number;
  version: string;
}

function getCachedSections(): HomepageSection[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedData = JSON.parse(cached);

    // Check if cache is expired
    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data.sections;
  } catch {
    return null;
  }
}

function setCachedSections(sections: HomepageSection[]): void {
  if (typeof window === 'undefined') return;

  try {
    const data: CachedData = {
      sections,
      timestamp: Date.now(),
      version: '1.0',
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function clearCache(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore
  }
}

// =============================================================================
// Main Hook
// =============================================================================

interface UseSDUIOptions {
  userRole?: string;
  governorateId?: string | null;
  cityId?: string | null;
  previewToken?: string | null; // For preview mode
}

export function useSDUI(options: UseSDUIOptions = {}) {
  const { userRole = 'guest', governorateId = null, cityId = null, previewToken = null } = options;

  const [state, setState] = useState<SDUIState>({
    sections: DEFAULT_SECTIONS, // Start with defaults (Layer 1)
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
      const { data, error } = await supabase.rpc('get_homepage_sections', {
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
        setCachedSections(sections);

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
  }, [userRole, governorateId, cityId, previewToken]);

  // Initial load: Try cache first (Layer 2), then fetch from server (Layer 3)
  useEffect(() => {
    mounted.current = true;

    // Try cache first
    const cached = getCachedSections();
    if (cached && cached.length > 0) {
      setState({
        sections: cached.sort((a, b) => a.display_order - b.display_order),
        isLoading: true, // Still loading to get fresh data
        isFromCache: true,
        error: null,
        lastUpdated: null,
      });
    }

    // Fetch from server (will update if different)
    fetchSections();

    return () => {
      mounted.current = false;
    };
  }, [fetchSections]);

  // Refetch function for manual refresh
  const refetch = useCallback(() => {
    clearCache();
    setState((prev) => ({ ...prev, isLoading: true }));
    fetchSections();
  }, [fetchSections]);

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

  return {
    ...state,
    refetch,
    getSection,
    isSectionVisible,
    getSectionConfig,
    getSectionContent,
    clearCache,
  };
}

// =============================================================================
// Admin Hook for Managing Sections
// =============================================================================

export function useSDUIAdmin() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sections (including hidden)
  const fetchAllSections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      setSections(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  const reorderSections = useCallback(async (newOrder: { id: string; order: number }[]) => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('reorder_homepage_sections', {
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
  }, []);

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
