/**
 * Types for AI Menu Import System - Engezna Platform
 * Updated: December 2025
 */

import type { BusinessCategoryCode } from '@/lib/constants/categories'

// Import Status
export type ImportStatus =
  | 'uploading'
  | 'processing'
  | 'review'
  | 'saving'
  | 'completed'
  | 'failed'
  | 'cancelled'

// Pricing Types
export type PricingType = 'single' | 'sizes' | 'weights' | 'options'
export type VariantType = 'size' | 'weight' | 'option'

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

// Extracted Data Types
export interface ExtractedCategory {
  id?: string
  name_ar: string
  name_en: string | null
  icon: string | null
  display_order: number
  products: ExtractedProduct[]
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
  pricing_type: PricingType
  price: number | null
  original_price: number | null
  variants: ExtractedVariant[] | null
  combo_contents_ar: string | null
  serves_count: number | null
  is_popular: boolean
  is_spicy: boolean
  is_vegetarian: boolean
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
}

export interface ExtractedAddon {
  id?: string
  name_ar: string
  name_en: string | null
  price: number
  group: string | null
}

// Analysis Results
export interface AnalysisWarning {
  type: 'unclear_price' | 'possible_duplicate' | 'missing_category' | 'low_confidence' | 'other'
  product_name?: string
  products?: string[]
  message: string
  severity: 'low' | 'medium' | 'high'
  suggested_action?: string
}

export interface AnalysisStatistics {
  total_categories: number
  total_products: number
  products_single_price: number
  products_with_variants: number
  products_need_review: number
  average_confidence: number
  addons_found: number
}

// Menu Import Session
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

// Wizard State
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

// Database Types
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

export interface DBProductVariant {
  id: string
  product_id: string
  variant_type: VariantType
  name_ar: string
  name_en: string | null
  price: number
  original_price: number | null
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

// API Response Types
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

// Helper function types
export interface ProductWithVariants {
  id: string
  name_ar: string
  name_en: string
  price: number
  has_variants: boolean
  pricing_type: PricingType
  variants: DBProductVariant[]
}
