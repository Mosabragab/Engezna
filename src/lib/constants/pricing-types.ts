/**
 * Pricing Types Configuration
 *
 * This file defines the different pricing strategies available for products:
 * - FIXED: Single fixed price (sandwiches, drinks)
 * - PER_UNIT: Price per unit with quantity (vegetables by kg)
 * - VARIANTS: Multiple options with different prices (pizza sizes, kebab weights)
 */

export const PRICING_TYPES = {
  /**
   * FIXED - سعر ثابت
   * Single price, quantity is whole numbers only
   * Example: Sandwich = 35 EGP, customer orders 1, 2, 3...
   */
  fixed: {
    id: 'fixed',
    name_ar: 'سعر ثابت',
    name_en: 'Fixed Price',
    description_ar: 'سعر واحد ثابت للمنتج',
    description_en: 'Single fixed price per product',
    icon: 'tag',
    allowsFractionalQuantity: false,
    requiresVariants: false,
    requiresUnit: false,
  },

  /**
   * PER_UNIT - بالوحدة
   * Price per unit × quantity
   * Quantity can be fractional for divisible units (kg, liter)
   * Example: Tomatoes = 25 EGP/kg, customer orders 0.5 kg = 12.50 EGP
   */
  per_unit: {
    id: 'per_unit',
    name_ar: 'بالوحدة',
    name_en: 'Per Unit',
    description_ar: 'السعر × الكمية (للخضار والفواكه)',
    description_en: 'Price multiplied by quantity',
    icon: 'scale',
    allowsFractionalQuantity: true, // Depends on unit type
    requiresVariants: false,
    requiresUnit: true,
  },

  /**
   * VARIANTS - خيارات
   * Choose one option from predefined list
   * Each variant has its own fixed price
   * Includes both size variants (S/M/L) and weight variants (quarter/half/kilo)
   */
  variants: {
    id: 'variants',
    name_ar: 'خيارات متعددة',
    name_en: 'Multiple Variants',
    description_ar: 'أحجام أو أوزان مختلفة بأسعار مختلفة',
    description_en: 'Different sizes or weights with different prices',
    icon: 'layers',
    allowsFractionalQuantity: false,
    requiresVariants: true,
    requiresUnit: false,
  },
} as const

export type PricingType = keyof typeof PRICING_TYPES

/**
 * Variant Types - for categorizing variants
 * Used when pricing_type is 'variants'
 */
export const VARIANT_TYPES = {
  /**
   * SIZE - أحجام
   * Small/Medium/Large variants
   * Example: Pizza sizes
   */
  size: {
    id: 'size',
    name_ar: 'أحجام',
    name_en: 'Sizes',
    description_ar: 'صغير / وسط / كبير',
    description_en: 'Small / Medium / Large',
    commonLabels: {
      ar: ['صغير', 'وسط', 'كبير', 'عائلي', 'جامبو'],
      en: ['Small', 'Medium', 'Large', 'Family', 'Jumbo'],
    },
  },

  /**
   * WEIGHT - أوزان
   * Weight-based variants (for grills, meat)
   * Example: Kebab - Quarter/Half/Kilo
   */
  weight: {
    id: 'weight',
    name_ar: 'أوزان',
    name_en: 'Weights',
    description_ar: 'ربع / نص / كيلو',
    description_en: 'Quarter / Half / Kilo',
    commonLabels: {
      ar: ['ربع', 'نص', 'ثلاثة أرباع', 'كيلو', 'كيلو ونص', '2 كيلو'],
      en: ['Quarter', 'Half', '3/4', 'Kilo', '1.5 Kilo', '2 Kilo'],
    },
  },

  /**
   * OPTION - خيارات أخرى
   * Generic options (flavors, types)
   * Example: Coffee - Espresso/Latte/Cappuccino
   */
  option: {
    id: 'option',
    name_ar: 'خيارات',
    name_en: 'Options',
    description_ar: 'خيارات متنوعة',
    description_en: 'Various options',
    commonLabels: {
      ar: [],
      en: [],
    },
  },

  /**
   * COFFEE_WEIGHT - أوزان القهوة
   * Weight variants for coffee (grams)
   * Example: Coffee beans - 100g/250g/500g/1kg
   */
  coffee_weight: {
    id: 'coffee_weight',
    name_ar: 'أوزان القهوة',
    name_en: 'Coffee Weights',
    description_ar: '100 جرام / 250 جرام / 500 جرام',
    description_en: '100g / 250g / 500g',
    commonLabels: {
      ar: ['100 جرام', '250 جرام', '500 جرام', 'كيلو'],
      en: ['100g', '250g', '500g', '1kg'],
    },
  },
} as const

export type VariantType = keyof typeof VARIANT_TYPES

/**
 * Detection patterns for auto-detecting pricing type from Excel
 */
export const PRICING_DETECTION_PATTERNS = {
  // Sheet name patterns
  sheetNames: {
    per_unit: [
      'خضار', 'فاكهة', 'فواكه', 'vegetables', 'fruits',
      'سوبر ماركت', 'supermarket', 'grocery',
    ],
    variants_weight: [
      'مشويات', 'كباب', 'لحوم', 'grills', 'meat', 'kebab',
      'أوزان', 'weights',
    ],
    variants_size: [
      'بيتزا', 'pizza', 'أحجام', 'sizes',
      'مطعم', 'restaurant',
    ],
    variants_coffee: [
      'قهوة', 'coffee', 'جرامات', 'grams',
    ],
  },

  // Column header patterns
  columnHeaders: {
    // Weight variants (kebab style)
    weight: [
      'ربع', 'نص', 'نصف', 'كيلو', 'ثلاثة أرباع',
      'quarter', 'half', 'kilo', 'kg',
      '1/4', '1/2', '3/4',
    ],
    // Size variants (pizza style)
    size: [
      'صغير', 'وسط', 'كبير', 'عائلي', 'جامبو',
      'small', 'medium', 'large', 'family', 'jumbo',
      's', 'm', 'l', 'xl',
    ],
    // Coffee weights
    coffee: [
      '100 جرام', '250 جرام', '500 جرام',
      '100g', '250g', '500g', '1kg',
      'جرام', 'gram', 'grams',
    ],
    // Unit indicators (per_unit)
    unit: [
      'الوحدة', 'unit', 'وحدة',
      'كيلو', 'كجم', 'kg', 'kilogram',
    ],
    // Single price indicators
    singlePrice: [
      'السعر', 'price', 'سعر',
    ],
  },
} as const

/**
 * Helper function to detect pricing type from sheet name
 */
export function detectPricingTypeFromSheetName(sheetName: string): {
  pricingType: PricingType
  variantType: VariantType | null
} {
  const name = sheetName.toLowerCase()

  // Check for per_unit patterns (vegetables, fruits)
  for (const pattern of PRICING_DETECTION_PATTERNS.sheetNames.per_unit) {
    if (name.includes(pattern.toLowerCase())) {
      return { pricingType: 'per_unit', variantType: null }
    }
  }

  // Check for weight variants (grills, meat)
  for (const pattern of PRICING_DETECTION_PATTERNS.sheetNames.variants_weight) {
    if (name.includes(pattern.toLowerCase())) {
      return { pricingType: 'variants', variantType: 'weight' }
    }
  }

  // Check for size variants (pizza, restaurant)
  for (const pattern of PRICING_DETECTION_PATTERNS.sheetNames.variants_size) {
    if (name.includes(pattern.toLowerCase())) {
      return { pricingType: 'variants', variantType: 'size' }
    }
  }

  // Check for coffee weights
  for (const pattern of PRICING_DETECTION_PATTERNS.sheetNames.variants_coffee) {
    if (name.includes(pattern.toLowerCase())) {
      return { pricingType: 'variants', variantType: 'coffee_weight' }
    }
  }

  // Default to fixed
  return { pricingType: 'fixed', variantType: null }
}

/**
 * Helper function to detect variant type from column headers
 */
export function detectVariantTypeFromHeaders(headers: string[]): {
  hasVariants: boolean
  variantType: VariantType | null
  variantColumns: string[]
} {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())

  // Check for weight columns
  const weightColumns = normalizedHeaders.filter(h =>
    PRICING_DETECTION_PATTERNS.columnHeaders.weight.some(p => h.includes(p.toLowerCase()))
  )
  if (weightColumns.length >= 2) {
    return {
      hasVariants: true,
      variantType: 'weight',
      variantColumns: headers.filter((_, i) =>
        PRICING_DETECTION_PATTERNS.columnHeaders.weight.some(p =>
          normalizedHeaders[i].includes(p.toLowerCase())
        )
      ),
    }
  }

  // Check for size columns
  const sizeColumns = normalizedHeaders.filter(h =>
    PRICING_DETECTION_PATTERNS.columnHeaders.size.some(p => h.includes(p.toLowerCase()))
  )
  if (sizeColumns.length >= 2) {
    return {
      hasVariants: true,
      variantType: 'size',
      variantColumns: headers.filter((_, i) =>
        PRICING_DETECTION_PATTERNS.columnHeaders.size.some(p =>
          normalizedHeaders[i].includes(p.toLowerCase())
        )
      ),
    }
  }

  // Check for coffee weight columns
  const coffeeColumns = normalizedHeaders.filter(h =>
    PRICING_DETECTION_PATTERNS.columnHeaders.coffee.some(p => h.includes(p.toLowerCase()))
  )
  if (coffeeColumns.length >= 2) {
    return {
      hasVariants: true,
      variantType: 'coffee_weight',
      variantColumns: headers.filter((_, i) =>
        PRICING_DETECTION_PATTERNS.columnHeaders.coffee.some(p =>
          normalizedHeaders[i].includes(p.toLowerCase())
        )
      ),
    }
  }

  return {
    hasVariants: false,
    variantType: null,
    variantColumns: [],
  }
}
