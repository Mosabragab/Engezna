/**
 * Types for Product Import System - Engezna Platform
 * Updated: December 2025
 *
 * Supports multiple pricing types:
 * - fixed: Single fixed price (sandwiches, drinks)
 * - per_unit: Price per unit with quantity (vegetables by kg)
 * - variants: Multiple options with different prices (pizza sizes, kebab weights)
 */

import type { BusinessCategoryCode } from '@/lib/constants/categories'
import type { PricingType, VariantType } from '@/lib/constants/pricing-types'
import type { UnitType } from '@/lib/constants/unit-types'

// Re-export types for convenience
export type { PricingType, VariantType } from '@/lib/constants/pricing-types'
export type { UnitType } from '@/lib/constants/unit-types'

// Import Status
export type ImportStatus =
  | 'uploading'
  | 'processing'
  | 'review'
  | 'saving'
  | 'completed'
  | 'failed'
  | 'cancelled'

// Uploaded Image
export interface UploadedImage {
  id: string
  file?: File
  previewUrl: string
  storagePath: string
  publicUrl: string
  originalName: string
  sizeBytes: number
  mimeType: string
  uploadedAt: string
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTED DATA TYPES (from Excel import)
// ═══════════════════════════════════════════════════════════════

export interface ExtractedCategory {
  id?: string
  name_ar: string
  name_en: string | null
  icon: string | null
  display_order: number
  products: ExtractedProduct[]
  // Pricing type for all products in this category (can be overridden per product)
  default_pricing_type?: PricingType
  default_unit_type?: UnitType
  default_variant_type?: VariantType
  // UI state
  isConfirmed?: boolean
  isEdited?: boolean
  isDeleted?: boolean
}

export interface ExtractedProduct {
  id?: string
  name_ar: string
  name_en: string | null
  description_ar: string | null

  // ═══════════════════════════════════════════════════════════════
  // PRICING CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Pricing type determines how the product is priced
   * - 'fixed': Single price, quantity is whole numbers only
   * - 'per_unit': Price per unit × quantity (can be fractional for kg/liter)
   * - 'variants': Choose one option from predefined list
   */
  pricing_type: PricingType

  /**
   * For 'variants' pricing type, this specifies the variant category
   * - 'size': Small/Medium/Large (pizza)
   * - 'weight': Quarter/Half/Kilo (kebab)
   * - 'option': Generic options
   * - 'coffee_weight': 100g/250g/500g (coffee beans)
   */
  variant_type?: VariantType | null

  /**
   * For 'fixed' pricing: The single price
   * For 'per_unit' pricing: The price per unit (e.g., price per kg)
   */
  price: number | null

  /**
   * Original price before discount (for showing crossed-out price)
   */
  original_price: number | null

  // ═══════════════════════════════════════════════════════════════
  // UNIT CONFIGURATION (for 'per_unit' pricing)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Unit type for 'per_unit' pricing
   * Examples: 'kg', 'gram', 'liter', 'piece', 'plate', etc.
   */
  unit_type?: UnitType | null

  /**
   * Minimum order quantity
   * For kg: might be 0.25 (quarter kilo)
   * For pieces: usually 1
   */
  min_quantity?: number

  /**
   * Quantity increment step
   * For kg: 0.25 (can order 0.25, 0.5, 0.75, 1, etc.)
   * For pieces: 1
   */
  quantity_step?: number

  // ═══════════════════════════════════════════════════════════════
  // VARIANTS (for 'variants' pricing)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Array of variant options
   * Each variant has its own price
   */
  variants: ExtractedVariant[] | null

  // ═══════════════════════════════════════════════════════════════
  // OTHER PRODUCT PROPERTIES
  // ═══════════════════════════════════════════════════════════════

  combo_contents_ar: string | null
  serves_count: number | null
  is_popular: boolean
  is_spicy: boolean
  is_vegetarian: boolean

  // Product image
  image_url?: string | null

  // Import metadata
  confidence: number
  needs_review: boolean
  source_note: string | null

  // UI state
  isConfirmed?: boolean
  isEdited?: boolean
  isDeleted?: boolean
}

export interface ExtractedVariant {
  id?: string
  name_ar: string
  name_en?: string
  price: number
  original_price?: number
  is_default: boolean
  display_order?: number
  /**
   * For weight variants: the multiplier relative to base unit
   * e.g., for "نص كيلو": multiplier = 0.5
   * This helps with calculations
   */
  multiplier?: number
}

export interface ExtractedAddon {
  id?: string
  name_ar: string
  name_en: string | null
  price: number
  group: string | null
}

// ═══════════════════════════════════════════════════════════════
// ANALYSIS RESULTS
// ═══════════════════════════════════════════════════════════════

export interface AnalysisWarning {
  type: 'unclear_price' | 'possible_duplicate' | 'missing_category' | 'low_confidence' | 'pricing_type_unclear' | 'other'
  product_name?: string
  products?: string[]
  message: string
  severity: 'low' | 'medium' | 'high'
  suggested_action?: string
}

export interface AnalysisStatistics {
  total_categories: number
  total_products: number
  products_fixed_price: number
  products_per_unit: number
  products_with_variants: number
  products_need_review: number
  average_confidence: number
  addons_found: number
  // Legacy fields for backwards compatibility
  products_single_price?: number
}

// ═══════════════════════════════════════════════════════════════
// MENU IMPORT SESSION
// ═══════════════════════════════════════════════════════════════

export interface MenuImport {
  id: string
  provider_id: string
  status: ImportStatus
  uploaded_images: UploadedImage[]
  ai_raw_response?: object
  ai_model_used?: string
  ai_processing_time_ms?: number
  ai_tokens_used?: {
    input: number
    output: number
  }
  extracted_data: {
    categories: ExtractedCategory[]
    addons: ExtractedAddon[]
    warnings: AnalysisWarning[]
    statistics: AnalysisStatistics
  }
  total_items: number
  reviewed_items: number
  final_data?: {
    categories: ExtractedCategory[]
    addons: ExtractedAddon[]
  }
  saved_category_ids: string[]
  saved_product_ids: string[]
  products_created: number
  products_with_variants: number
  created_at: string
  updated_at: string
  processing_started_at?: string
  processing_completed_at?: string
  review_started_at?: string
  completed_at?: string
  error_message?: string
  error_details?: object
  retry_count?: number
}

// ═══════════════════════════════════════════════════════════════
// WIZARD STATE
// ═══════════════════════════════════════════════════════════════

export interface ImportWizardState {
  step: 1 | 2 | 3 | 4 | 5
  importId?: string
  providerId: string
  businessType: BusinessCategoryCode
  uploadedImages: UploadedImage[]
  analysisResult?: {
    categories: ExtractedCategory[]
    addons: ExtractedAddon[]
    warnings: AnalysisWarning[]
    statistics: AnalysisStatistics
  }
  editedCategories: ExtractedCategory[]
  editedAddons: ExtractedAddon[]
  isSaving: boolean
  isProcessing: boolean
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// DATABASE TYPES
// ═══════════════════════════════════════════════════════════════

export interface DBProviderCategory {
  id: string
  provider_id: string
  name_ar: string
  name_en: string | null
  description_ar: string | null
  description_en: string | null
  icon: string | null
  display_order: number
  is_active: boolean
  import_id: string | null
  created_at: string
  updated_at: string
}

export interface DBMenuItem {
  id: string
  provider_id: string
  category_id: string
  name_ar: string
  name_en: string | null
  description_ar: string | null
  description_en: string | null

  // Pricing fields
  pricing_type: PricingType
  variant_type: VariantType | null
  price: number | null
  original_price: number | null

  // Unit fields (for per_unit pricing)
  unit_type: UnitType | null
  unit_price: number | null
  min_quantity: number
  quantity_step: number

  // Other fields
  image_url: string | null
  is_available: boolean
  is_popular: boolean
  is_spicy: boolean
  is_vegetarian: boolean
  display_order: number

  // Metadata
  import_id: string | null
  created_at: string
  updated_at: string
}

export interface DBProductVariant {
  id: string
  product_id: string
  variant_type: VariantType
  name_ar: string
  name_en: string | null
  price: number
  original_price: number | null
  multiplier: number | null
  is_default: boolean
  display_order: number
  is_available: boolean
  metadata: object | null
  created_at: string
  updated_at: string
}

export interface DBMenuImport {
  id: string
  provider_id: string
  status: ImportStatus
  uploaded_images: UploadedImage[]
  ai_raw_response: object | null
  ai_model_used: string | null
  ai_processing_time_ms: number | null
  ai_tokens_used: object | null
  extracted_data: object
  total_items: number
  reviewed_items: number
  final_data: object | null
  saved_category_ids: string[] | null
  saved_product_ids: string[] | null
  products_created: number
  products_with_variants: number
  created_at: string
  updated_at: string
  processing_started_at: string | null
  processing_completed_at: string | null
  review_started_at: string | null
  completed_at: string | null
  error_message: string | null
  error_details: object | null
  retry_count: number
}

// ═══════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface MenuAnalysisResponse {
  success: boolean
  importId: string
  data?: {
    categories: ExtractedCategory[]
    addons: ExtractedAddon[]
    warnings: AnalysisWarning[]
    statistics: AnalysisStatistics
  }
  error?: string
  processingTimeMs?: number
}

export interface MenuSaveResponse {
  success: boolean
  categoriesCreated: number
  productsCreated: number
  variantsCreated: number
  addonsCreated: number
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════════════════════

export interface ProductWithVariants {
  id: string
  name_ar: string
  name_en: string
  price: number
  has_variants: boolean
  pricing_type: PricingType
  variant_type: VariantType | null
  unit_type: UnitType | null
  unit_price: number | null
  min_quantity: number
  quantity_step: number
  variants: DBProductVariant[]
}

// ═══════════════════════════════════════════════════════════════
// CART TYPES (for customer-facing)
// ═══════════════════════════════════════════════════════════════

export interface CartItem {
  id: string
  productId: string
  productName: string
  productNameEn?: string

  // Pricing info
  pricingType: PricingType

  // For 'variants' pricing
  variantId?: string
  variantName?: string

  // For 'per_unit' pricing
  unitType?: UnitType
  unitName?: string

  // Quantities and prices
  quantity: number
  unitPrice: number
  totalPrice: number
}

// Example cart items for reference:
// {
//   id: '1',
//   productId: 'pizza-1',
//   productName: 'بيتزا مارجريتا',
//   pricingType: 'variants',
//   variantId: 'medium',
//   variantName: 'وسط',
//   quantity: 1,
//   unitPrice: 100,
//   totalPrice: 100
// }
// {
//   id: '2',
//   productId: 'tomato-1',
//   productName: 'طماطم',
//   pricingType: 'per_unit',
//   unitType: 'kg',
//   unitName: 'كيلو',
//   quantity: 0.5,
//   unitPrice: 25,
//   totalPrice: 12.50
// }
// {
//   id: '3',
//   productId: 'shawarma-1',
//   productName: 'شاورما فراخ',
//   pricingType: 'fixed',
//   quantity: 2,
//   unitPrice: 35,
//   totalPrice: 70
// }
