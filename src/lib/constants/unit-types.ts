/**
 * Unit Types Configuration
 *
 * This file defines all supported units of measurement for products.
 * Units are categorized into:
 * - Divisible: Allow fractional quantities (kg, liter)
 * - Non-divisible: Only whole numbers (piece, bottle)
 */

export interface UnitTypeConfig {
  id: string;
  name_ar: string;
  name_en: string;
  symbol_ar: string;
  symbol_en: string;
  divisible: boolean;
  min: number;
  step: number;
  presets: number[];
  category: 'weight' | 'volume' | 'count' | 'portion';
}

export const UNIT_TYPES: Record<string, UnitTypeConfig> = {
  // ═══════════════════════════════════════════════════════════════
  // WEIGHT UNITS - وحدات الوزن
  // ═══════════════════════════════════════════════════════════════

  kg: {
    id: 'kg',
    name_ar: 'كيلوجرام',
    name_en: 'Kilogram',
    symbol_ar: 'كيلو',
    symbol_en: 'kg',
    divisible: true,
    min: 0.25,
    step: 0.25,
    presets: [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3],
    category: 'weight',
  },

  gram: {
    id: 'gram',
    name_ar: 'جرام',
    name_en: 'Gram',
    symbol_ar: 'جرام',
    symbol_en: 'g',
    divisible: true,
    min: 50,
    step: 50,
    presets: [50, 100, 150, 200, 250, 300, 500],
    category: 'weight',
  },

  // ═══════════════════════════════════════════════════════════════
  // VOLUME UNITS - وحدات الحجم
  // ═══════════════════════════════════════════════════════════════

  liter: {
    id: 'liter',
    name_ar: 'لتر',
    name_en: 'Liter',
    symbol_ar: 'لتر',
    symbol_en: 'L',
    divisible: true,
    min: 0.25,
    step: 0.25,
    presets: [0.25, 0.5, 1, 1.5, 2, 3],
    category: 'volume',
  },

  ml: {
    id: 'ml',
    name_ar: 'مللي',
    name_en: 'Milliliter',
    symbol_ar: 'مل',
    symbol_en: 'ml',
    divisible: true,
    min: 100,
    step: 50,
    presets: [100, 200, 250, 300, 500],
    category: 'volume',
  },

  // ═══════════════════════════════════════════════════════════════
  // COUNT UNITS - وحدات العد (غير قابلة للتجزئة)
  // ═══════════════════════════════════════════════════════════════

  piece: {
    id: 'piece',
    name_ar: 'قطعة',
    name_en: 'Piece',
    symbol_ar: 'قطعة',
    symbol_en: 'pc',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4, 5, 6],
    category: 'count',
  },

  bottle: {
    id: 'bottle',
    name_ar: 'زجاجة',
    name_en: 'Bottle',
    symbol_ar: 'زجاجة',
    symbol_en: 'btl',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4, 6],
    category: 'count',
  },

  box: {
    id: 'box',
    name_ar: 'علبة',
    name_en: 'Box',
    symbol_ar: 'علبة',
    symbol_en: 'box',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4, 5],
    category: 'count',
  },

  can: {
    id: 'can',
    name_ar: 'علبة صفيح',
    name_en: 'Can',
    symbol_ar: 'علبة',
    symbol_en: 'can',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4, 6],
    category: 'count',
  },

  bag: {
    id: 'bag',
    name_ar: 'كيس',
    name_en: 'Bag',
    symbol_ar: 'كيس',
    symbol_en: 'bag',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4, 5],
    category: 'count',
  },

  bundle: {
    id: 'bundle',
    name_ar: 'حزمة',
    name_en: 'Bundle',
    symbol_ar: 'حزمة',
    symbol_en: 'bdl',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4, 5],
    category: 'count',
  },

  pack: {
    id: 'pack',
    name_ar: 'باكيت',
    name_en: 'Pack',
    symbol_ar: 'باكيت',
    symbol_en: 'pack',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4, 5],
    category: 'count',
  },

  carton: {
    id: 'carton',
    name_ar: 'كرتونة',
    name_en: 'Carton',
    symbol_ar: 'كرتونة',
    symbol_en: 'ctn',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3],
    category: 'count',
  },

  dozen: {
    id: 'dozen',
    name_ar: 'دستة',
    name_en: 'Dozen',
    symbol_ar: 'دستة',
    symbol_en: 'dz',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3],
    category: 'count',
  },

  // ═══════════════════════════════════════════════════════════════
  // PORTION UNITS - وحدات الوجبات (غير قابلة للتجزئة)
  // ═══════════════════════════════════════════════════════════════

  plate: {
    id: 'plate',
    name_ar: 'طبق',
    name_en: 'Plate',
    symbol_ar: 'طبق',
    symbol_en: 'plate',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4],
    category: 'portion',
  },

  meal: {
    id: 'meal',
    name_ar: 'وجبة',
    name_en: 'Meal',
    symbol_ar: 'وجبة',
    symbol_en: 'meal',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4],
    category: 'portion',
  },

  sandwich: {
    id: 'sandwich',
    name_ar: 'ساندوتش',
    name_en: 'Sandwich',
    symbol_ar: 'ساندوتش',
    symbol_en: 'sndw',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4, 5],
    category: 'portion',
  },

  cup: {
    id: 'cup',
    name_ar: 'كوب',
    name_en: 'Cup',
    symbol_ar: 'كوب',
    symbol_en: 'cup',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3],
    category: 'portion',
  },

  bowl: {
    id: 'bowl',
    name_ar: 'طبق عميق',
    name_en: 'Bowl',
    symbol_ar: 'طبق',
    symbol_en: 'bowl',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3],
    category: 'portion',
  },

  tray: {
    id: 'tray',
    name_ar: 'صينية',
    name_en: 'Tray',
    symbol_ar: 'صينية',
    symbol_en: 'tray',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2],
    category: 'portion',
  },

  roll: {
    id: 'roll',
    name_ar: 'رول',
    name_en: 'Roll',
    symbol_ar: 'رول',
    symbol_en: 'roll',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4],
    category: 'portion',
  },

  slice: {
    id: 'slice',
    name_ar: 'شريحة',
    name_en: 'Slice',
    symbol_ar: 'شريحة',
    symbol_en: 'slice',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4, 6],
    category: 'portion',
  },

  portion: {
    id: 'portion',
    name_ar: 'حصة',
    name_en: 'Portion',
    symbol_ar: 'حصة',
    symbol_en: 'ptn',
    divisible: false,
    min: 1,
    step: 1,
    presets: [1, 2, 3, 4],
    category: 'portion',
  },
} as const;

export type UnitType = keyof typeof UNIT_TYPES;

/**
 * Get units grouped by category
 */
export function getUnitsByCategory(): Record<string, UnitTypeConfig[]> {
  const grouped: Record<string, UnitTypeConfig[]> = {
    weight: [],
    volume: [],
    count: [],
    portion: [],
  };

  Object.values(UNIT_TYPES).forEach((unit) => {
    grouped[unit.category].push(unit);
  });

  return grouped;
}

/**
 * Get unit configuration by ID
 */
export function getUnitConfig(unitId: string): UnitTypeConfig | null {
  return UNIT_TYPES[unitId] || null;
}

/**
 * Format quantity with unit
 */
export function formatQuantityWithUnit(
  quantity: number,
  unitId: string,
  locale: 'ar' | 'en' = 'ar'
): string {
  const unit = UNIT_TYPES[unitId];
  if (!unit) return `${quantity}`;

  const symbol = locale === 'ar' ? unit.symbol_ar : unit.symbol_en;

  // Format fractional quantities nicely
  if (unit.divisible && quantity < 1) {
    if (quantity === 0.25) return locale === 'ar' ? `ربع ${symbol}` : `¼ ${symbol}`;
    if (quantity === 0.5) return locale === 'ar' ? `نص ${symbol}` : `½ ${symbol}`;
    if (quantity === 0.75) return locale === 'ar' ? `ثلاثة أرباع ${symbol}` : `¾ ${symbol}`;
  }

  // Format mixed numbers
  if (unit.divisible && quantity > 1 && quantity % 1 !== 0) {
    const whole = Math.floor(quantity);
    const fraction = quantity - whole;
    if (fraction === 0.5) {
      return locale === 'ar' ? `${whole} ونص ${symbol}` : `${whole}½ ${symbol}`;
    }
  }

  return `${quantity} ${symbol}`;
}

/**
 * Format quantity for display (shorthand)
 */
export function formatQuantityShort(quantity: number): string {
  if (quantity === 0.25) return '¼';
  if (quantity === 0.5) return '½';
  if (quantity === 0.75) return '¾';
  if (quantity === 1.5) return '1½';
  if (quantity === 2.5) return '2½';
  return quantity.toString();
}

/**
 * Calculate price based on quantity and unit price
 */
export function calculateUnitPrice(unitPrice: number, quantity: number): number {
  return Math.round(unitPrice * quantity * 100) / 100;
}

/**
 * Validate quantity against unit constraints
 */
export function validateQuantity(
  quantity: number,
  unitId: string
): { valid: boolean; error?: string } {
  const unit = UNIT_TYPES[unitId];
  if (!unit) {
    return { valid: false, error: 'Unknown unit type' };
  }

  if (quantity < unit.min) {
    return {
      valid: false,
      error: `Minimum quantity is ${unit.min} ${unit.symbol_en}`,
    };
  }

  if (!unit.divisible && quantity % 1 !== 0) {
    return {
      valid: false,
      error: `${unit.name_en} must be a whole number`,
    };
  }

  if (unit.divisible && (quantity * 100) % (unit.step * 100) !== 0) {
    return {
      valid: false,
      error: `Quantity must be in increments of ${unit.step}`,
    };
  }

  return { valid: true };
}

/**
 * Default units for common product categories
 */
export const DEFAULT_UNITS_BY_CATEGORY: Record<string, UnitType> = {
  // Vegetables & Fruits
  خضار: 'kg',
  فاكهة: 'kg',
  فواكه: 'kg',
  vegetables: 'kg',
  fruits: 'kg',

  // Meat & Poultry
  لحوم: 'kg',
  دواجن: 'kg',
  meat: 'kg',
  poultry: 'kg',

  // Drinks
  مشروبات: 'bottle',
  عصائر: 'bottle',
  drinks: 'bottle',
  beverages: 'bottle',

  // Restaurant
  مطعم: 'piece',
  وجبات: 'meal',
  restaurant: 'piece',
  meals: 'meal',

  // Bakery
  مخبوزات: 'piece',
  حلويات: 'piece',
  bakery: 'piece',
  sweets: 'piece',

  // Default
  default: 'piece',
};

/**
 * Get suggested unit for a category name
 */
export function getSuggestedUnit(categoryName: string): UnitType {
  const normalizedName = categoryName.toLowerCase().trim();

  for (const [key, unit] of Object.entries(DEFAULT_UNITS_BY_CATEGORY)) {
    if (normalizedName.includes(key.toLowerCase())) {
      return unit;
    }
  }

  return 'piece';
}
