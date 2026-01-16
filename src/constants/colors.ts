/**
 * Engezna Banner Color Palette
 *
 * Complete color system for banners, social media, and marketing materials.
 * Each color includes gradient start/end values and glass effect settings.
 *
 * @version 2.0.0
 * @lastUpdated 2025-12-19
 */

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface BannerGradient {
  id: string;
  nameAr: string;
  nameEn: string;
  start: string;
  end: string;
  category: 'primary' | 'accent' | 'cool' | 'special';
  usage: string[];
  contrastColor: string;
}

export interface GlassEffect {
  background: string;
  backdropFilter: string;
  border: string;
  boxShadow: string;
  borderRadius: string;
}

// ============================================================
// GLASS EFFECT SETTINGS
// ============================================================

export const GLASS_EFFECT: GlassEffect = {
  background: 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  borderRadius: '16px',
};

export const GLASS_EFFECT_LIGHT: GlassEffect = {
  background: 'rgba(255, 255, 255, 0.25)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  borderRadius: '12px',
};

// ============================================================
// BANNER GRADIENTS - COMPLETE PALETTE (12 Colors)
// ============================================================

export const BANNER_GRADIENTS: Record<string, BannerGradient> = {
  // --- PRIMARY COLORS ---
  engeznaBlue: {
    id: 'engezna-blue',
    nameAr: 'أزرق إنجزنا',
    nameEn: 'Engezna Blue',
    start: '#009DE0',
    end: '#0077B6',
    category: 'primary',
    usage: ['main-branding', 'chat-to-order', 'platform-intro'],
    contrastColor: '#009DE0',
  },
  mint: {
    id: 'mint',
    nameAr: 'نعناعي',
    nameEn: 'Mint Green',
    start: '#10B981',
    end: '#059669',
    category: 'primary',
    usage: ['free-delivery', 'success', 'speed', 'fast-delivery'],
    contrastColor: '#059669',
  },
  purple: {
    id: 'purple',
    nameAr: 'بنفسجي',
    nameEn: 'Purple Lavender',
    start: '#8B5CF6',
    end: '#7C3AED',
    category: 'primary',
    usage: ['merchants', 'zero-commission', 'premium'],
    contrastColor: '#7C3AED',
  },

  // --- ACCENT COLORS ---
  amber: {
    id: 'amber',
    nameAr: 'عنبري',
    nameEn: 'Amber Gold',
    start: '#F59E0B',
    end: '#D97706',
    category: 'accent',
    usage: ['daily-deals', 'discounts', 'nearest-store'],
    contrastColor: '#D97706',
  },
  orange: {
    id: 'orange',
    nameAr: 'برتقالي',
    nameEn: 'Vibrant Orange',
    start: '#F97316',
    end: '#EA580C',
    category: 'accent',
    usage: ['order-management', 'alerts', 'energy'],
    contrastColor: '#EA580C',
  },
  pink: {
    id: 'pink',
    nameAr: 'زهري',
    nameEn: 'Warm Pink',
    start: '#EC4899',
    end: '#DB2777',
    category: 'accent',
    usage: ['community', 'local-support', 'from-your-people'],
    contrastColor: '#DB2777',
  },

  // --- COOL COLORS ---
  cyan: {
    id: 'cyan',
    nameAr: 'سماوي',
    nameEn: 'Cyan',
    start: '#06B6D4',
    end: '#0891B2',
    category: 'cool',
    usage: ['business-growth', 'expansion', 'merchants'],
    contrastColor: '#0891B2',
  },
  teal: {
    id: 'teal',
    nameAr: 'فيروزي',
    nameEn: 'Teal',
    start: '#14B8A6',
    end: '#0D9488',
    category: 'cool',
    usage: ['partnership', 'trust', 'engezna-family'],
    contrastColor: '#0D9488',
  },
  indigo: {
    id: 'indigo',
    nameAr: 'نيلي',
    nameEn: 'Indigo',
    start: '#6366F1',
    end: '#4F46E5',
    category: 'cool',
    usage: ['technology', 'innovation', 'reserved'],
    contrastColor: '#4F46E5',
  },

  // --- SPECIAL COLORS ---
  red: {
    id: 'red',
    nameAr: 'أحمر',
    nameEn: 'Alert Red',
    start: '#EF4444',
    end: '#DC2626',
    category: 'special',
    usage: ['limited-offer', 'ending-soon', 'urgent'],
    contrastColor: '#DC2626',
  },
  rose: {
    id: 'rose',
    nameAr: 'وردي',
    nameEn: 'Rose',
    start: '#F43F5E',
    end: '#E11D48',
    category: 'special',
    usage: ['special-events', 'holidays', 'ramadan'],
    contrastColor: '#E11D48',
  },
  slate: {
    id: 'slate',
    nameAr: 'رمادي',
    nameEn: 'Slate Dark',
    start: '#475569',
    end: '#334155',
    category: 'special',
    usage: ['professional', 'information', 'neutral'],
    contrastColor: '#334155',
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get CSS gradient string for a banner color
 */
export const getBannerGradient = (colorId: string, angle: number = 135): string => {
  const color = Object.values(BANNER_GRADIENTS).find((c) => c.id === colorId);
  if (!color) return `linear-gradient(${angle}deg, #009DE0, #0077B6)`;
  return `linear-gradient(${angle}deg, ${color.start} 0%, ${color.end} 100%)`;
};

/**
 * Get glass effect CSS properties as object
 */
export const getGlassEffectStyle = (
  variant: 'default' | 'light' = 'default'
): React.CSSProperties => {
  const effect = variant === 'light' ? GLASS_EFFECT_LIGHT : GLASS_EFFECT;
  return {
    background: effect.background,
    backdropFilter: effect.backdropFilter,
    WebkitBackdropFilter: effect.backdropFilter,
    border: effect.border,
    boxShadow: effect.boxShadow,
    borderRadius: effect.borderRadius,
  };
};

/**
 * Get colors by category
 */
export const getColorsByCategory = (category: BannerGradient['category']): BannerGradient[] => {
  return Object.values(BANNER_GRADIENTS).filter((c) => c.category === category);
};

/**
 * Get color by usage tag
 */
export const getColorByUsage = (usage: string): BannerGradient | undefined => {
  return Object.values(BANNER_GRADIENTS).find((c) => c.usage.includes(usage));
};

/**
 * Find gradient by start and end colors
 */
export const findGradientByColors = (start: string, end: string): BannerGradient | undefined => {
  return Object.values(BANNER_GRADIENTS).find(
    (c) =>
      c.start.toLowerCase() === start.toLowerCase() && c.end.toLowerCase() === end.toLowerCase()
  );
};

// ============================================================
// ADMIN PANEL COLOR OPTIONS (For dropdown/buttons)
// ============================================================

export const ADMIN_COLOR_OPTIONS = Object.values(BANNER_GRADIENTS).map((color) => ({
  value: color.id,
  labelAr: color.nameAr,
  labelEn: color.nameEn,
  start: color.start,
  end: color.end,
  category: color.category,
}));

// Grouped options for better UX
export const ADMIN_COLOR_OPTIONS_GROUPED = {
  primary: getColorsByCategory('primary'),
  accent: getColorsByCategory('accent'),
  cool: getColorsByCategory('cool'),
  special: getColorsByCategory('special'),
};

// Category labels
export const COLOR_CATEGORY_LABELS = {
  primary: { ar: 'الألوان الأساسية', en: 'Primary Colors' },
  accent: { ar: 'ألوان العروض', en: 'Accent Colors' },
  cool: { ar: 'ألوان باردة', en: 'Cool Colors' },
  special: { ar: 'ألوان خاصة', en: 'Special Colors' },
};
