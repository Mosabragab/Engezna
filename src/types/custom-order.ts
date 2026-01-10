/**
 * Custom Order System Types
 * نظام الطلب المفتوح - أنواع TypeScript
 *
 * @version 2.1
 * @date January 2026
 *
 * This file contains all TypeScript types for the Custom Order system,
 * matching the SQL migration: 20260109000001_custom_order_system.sql
 */

import type { Json } from './database';

// ============================================================================
// ENUMS - Custom Order Specific
// ============================================================================

/**
 * Provider operation mode
 * وضع تشغيل المتجر
 */
export type OperationMode = 'standard' | 'custom' | 'hybrid';

/**
 * Custom order input types
 * أنواع مدخلات الطلب المفتوح
 */
export type CustomOrderInputType = 'text' | 'voice' | 'image' | 'mixed';

/**
 * Custom order request status
 * حالة طلب التسعير
 */
export type CustomRequestStatus =
  | 'pending'           // بانتظار التسعير
  | 'priced'            // تم التسعير
  | 'customer_approved' // العميل وافق
  | 'customer_rejected' // العميل رفض
  | 'expired'           // انتهت المهلة
  | 'cancelled';        // ألغي (تم اختيار تاجر آخر)

/**
 * Item availability status
 * حالة توفر الصنف
 */
export type ItemAvailabilityStatus =
  | 'available'    // متوفر
  | 'unavailable'  // غير متوفر
  | 'partial'      // متوفر جزئياً
  | 'substituted'; // تم استبداله

/**
 * Broadcast status for triple broadcast system
 * حالة البث الثلاثي
 */
export type BroadcastStatus =
  | 'active'     // نشط - في انتظار التسعير
  | 'completed'  // مكتمل - تم اختيار فائز
  | 'expired'    // منتهي - انتهت المهلة
  | 'cancelled'; // ملغي - ألغاه العميل

/**
 * Pricing status for custom orders
 * حالة التسعير للطلب
 */
export type PricingStatus =
  | 'awaiting_pricing'  // بانتظار التسعير
  | 'pricing_sent'      // التسعير مرسل للعميل
  | 'pricing_approved'  // العميل وافق على التسعير
  | 'pricing_rejected'  // العميل رفض التسعير
  | 'pricing_expired';  // انتهت مهلة الموافقة

/**
 * Order flow type
 * نوع مسار الطلب
 */
export type OrderFlow = 'standard' | 'custom';

/**
 * Item source in order_items
 * مصدر الصنف
 */
export type ItemSource = 'menu' | 'custom';

// ============================================================================
// SETTINGS TYPES
// ============================================================================

/**
 * Custom order settings stored in provider.custom_order_settings JSONB
 * إعدادات الطلب المفتوح
 */
export interface CustomOrderSettings {
  accepts_text: boolean;
  accepts_voice: boolean;
  accepts_image: boolean;
  max_items_per_order: number;
  pricing_timeout_hours: number;
  customer_approval_timeout_hours: number;
  auto_cancel_after_hours: number;
  show_price_history: boolean;
}

/**
 * Default custom order settings
 */
export const DEFAULT_CUSTOM_ORDER_SETTINGS: CustomOrderSettings = {
  accepts_text: true,
  accepts_voice: true,
  accepts_image: true,
  max_items_per_order: 50,
  pricing_timeout_hours: 24,
  customer_approval_timeout_hours: 2,
  auto_cancel_after_hours: 48,
  show_price_history: true,
};

// ============================================================================
// DATABASE TYPES - Matching SQL Tables
// ============================================================================

/**
 * custom_order_broadcasts table
 * جدول البث الثلاثي
 */
export interface CustomOrderBroadcast {
  id: string;
  customer_id: string;
  provider_ids: string[];
  winning_order_id: string | null;

  // Original input
  original_input_type: CustomOrderInputType;
  original_text: string | null;
  voice_url: string | null;
  image_urls: string[] | null;
  transcribed_text: string | null;
  customer_notes: string | null;

  // Delivery info
  delivery_address_id: string | null;
  delivery_address: Json | null;
  order_type: 'delivery' | 'pickup';

  // Status
  status: BroadcastStatus;
  pricing_deadline: string;
  expires_at: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * custom_order_requests table
 * جدول طلبات التسعير
 */
export interface CustomOrderRequest {
  id: string;
  broadcast_id: string | null;
  order_id: string | null;
  provider_id: string;

  // Input type
  input_type: CustomOrderInputType;

  // Copied from broadcast
  original_text: string | null;
  voice_url: string | null;
  image_urls: string[] | null;
  transcribed_text: string | null;
  customer_notes: string | null;

  // Status
  status: CustomRequestStatus;

  // Pricing summary
  items_count: number;
  subtotal: number;
  delivery_fee: number;
  total: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  priced_at: string | null;
  responded_at: string | null;
  pricing_expires_at: string | null;
}

/**
 * custom_order_items table
 * جدول الأصناف المسعرة
 */
export interface CustomOrderItem {
  id: string;
  request_id: string;
  order_id: string | null;

  // Original customer text (preserved, never edited)
  original_customer_text: string | null;

  // Merchant-entered details (editable for invoice accuracy)
  item_name_ar: string;
  item_name_en: string | null;
  description_ar: string | null;
  description_en: string | null;

  // Quantity & Pricing
  unit_type: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;

  // Availability
  availability_status: ItemAvailabilityStatus;

  // Substitute item (when original unavailable)
  substitute_name_ar: string | null;
  substitute_name_en: string | null;
  substitute_description: string | null;
  substitute_quantity: number | null;
  substitute_unit_type: string | null;
  substitute_unit_price: number | null;
  substitute_total_price: number | null;

  // Merchant notes
  merchant_notes: string | null;

  // Display order
  display_order: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * custom_order_price_history table
 * جدول تاريخ الأسعار - لميزة "تم شراؤه مسبقاً"
 */
export interface CustomOrderPriceHistory {
  id: string;
  provider_id: string;
  customer_id: string;

  // Item identification
  item_name_normalized: string;
  item_name_ar: string;
  item_name_en: string | null;

  // Pricing info
  unit_type: string | null;
  unit_price: number;
  quantity: number;
  total_price: number | null;

  // Source reference
  order_id: string | null;
  request_id: string | null;
  custom_item_id: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// EXTENDED TYPES - With Relations
// ============================================================================

/**
 * Provider with custom order settings (extended)
 */
export interface ProviderWithCustomSettings {
  id: string;
  name_ar: string;
  name_en: string;
  logo_url: string | null;
  phone: string;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
  rating: number;
  operation_mode: OperationMode;
  custom_order_settings: CustomOrderSettings;
}

/**
 * Broadcast with all requests (for comparison view)
 */
export interface BroadcastWithRequests extends CustomOrderBroadcast {
  requests: CustomOrderRequestWithProvider[];
}

/**
 * Request with provider details
 */
export interface CustomOrderRequestWithProvider extends CustomOrderRequest {
  provider: {
    id: string;
    name_ar: string;
    name_en: string;
    logo_url: string | null;
    rating: number;
    delivery_fee: number;
  };
}

/**
 * Request with items (for pricing view)
 */
export interface CustomOrderRequestWithItems extends CustomOrderRequest {
  items: CustomOrderItem[];
  provider: {
    id: string;
    name_ar: string;
    name_en: string;
    logo_url: string | null;
  };
  broadcast: {
    original_text: string | null;
    voice_url: string | null;
    image_urls: string[] | null;
    transcribed_text: string | null;
    customer_notes: string | null;
    customer: {
      id: string;
      full_name: string;
      phone: string | null;
    };
  };
}

/**
 * Price history item for merchant UI
 */
export interface PriceHistoryItem {
  id: string;
  item_name_ar: string;
  item_name_en: string | null;
  unit_type: string | null;
  unit_price: number;
  last_ordered_at: string;
}

// ============================================================================
// DRAFT TYPES - For localStorage (v2.1)
// ============================================================================

/**
 * Custom order draft stored in localStorage
 * مسودة الطلب المحفوظة
 */
export interface CustomOrderDraft {
  providerId: string;
  providerName: string;
  inputType: CustomOrderInputType;
  text?: string;
  voiceCacheId?: string;  // Reference to IndexedDB
  imageDataUrls?: string[];  // Base64 for small previews
  notes?: string;
  savedAt: number;  // Unix timestamp
}

/**
 * Voice recording cached in IndexedDB
 */
export interface CachedVoiceRecording {
  id: string;
  blob: Blob;
  providerId: string;
  timestamp: number;
  status: 'pending' | 'uploaded' | 'failed';
  retryCount: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Create broadcast request payload
 */
export interface CreateBroadcastPayload {
  providerIds: string[];
  inputType: CustomOrderInputType;
  text?: string;
  voiceUrl?: string;
  imageUrls?: string[];
  notes?: string;
  deliveryAddressId?: string;
  orderType: 'delivery' | 'pickup';
}

/**
 * Create broadcast response
 */
export interface CreateBroadcastResponse {
  success: boolean;
  broadcast?: CustomOrderBroadcast;
  requests?: CustomOrderRequest[];
  error?: string;
}

/**
 * Submit pricing payload (merchant)
 */
export interface SubmitPricingPayload {
  requestId: string;
  items: Omit<CustomOrderItem, 'id' | 'request_id' | 'order_id' | 'created_at' | 'updated_at'>[];
  deliveryFee: number;
}

/**
 * Submit pricing response
 */
export interface SubmitPricingResponse {
  success: boolean;
  request?: CustomOrderRequest;
  order?: {
    id: string;
    order_number: string;
    total: number;
  };
  error?: string;
}

/**
 * Approve pricing payload (customer)
 */
export interface ApprovePricingPayload {
  orderId: string;
  broadcastId: string;
}

/**
 * Approve pricing response
 */
export interface ApprovePricingResponse {
  success: boolean;
  order?: {
    id: string;
    order_number: string;
    status: string;
    total: number;
  };
  cancelledOrders?: string[];
  error?: string;
}

/**
 * Get broadcast status response (for comparison view)
 */
export interface BroadcastStatusResponse {
  success: boolean;
  broadcast?: BroadcastWithRequests;
  error?: string;
}

/**
 * Price history response (for merchant)
 */
export interface PriceHistoryResponse {
  success: boolean;
  items?: PriceHistoryItem[];
  error?: string;
}

// ============================================================================
// UI COMPONENT PROPS TYPES
// ============================================================================

/**
 * Props for CustomOrderInterface component
 */
export interface CustomOrderInterfaceProps {
  provider: ProviderWithCustomSettings;
  onSubmit: (order: CreateBroadcastPayload) => Promise<void>;
  onCancel: () => void;
}

/**
 * Props for TextOrderInput component
 */
export interface TextOrderInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Props for VoiceOrderInput component
 */
export interface VoiceOrderInputProps {
  onRecordingComplete: (blob: Blob, transcription?: string) => void;
  onError: (error: string) => void;
  maxDuration?: number;
  disabled?: boolean;
}

/**
 * Props for ImageOrderInput component
 */
export interface ImageOrderInputProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

/**
 * Props for ActiveCartBanner component
 */
export interface ActiveCartBannerProps {
  cartProvider: {
    name: string;
    itemCount: number;
  };
  onViewCart: () => void;
  onDismiss: () => void;
}

/**
 * Props for MerchantSelector component (Triple Broadcast)
 */
export interface MerchantSelectorProps {
  providers: ProviderWithCustomSettings[];
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelection?: number;
}

/**
 * Props for PricingReview component (customer)
 */
export interface PricingReviewProps {
  request: CustomOrderRequestWithItems;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  loading?: boolean;
}

/**
 * Props for BroadcastComparison component
 */
export interface BroadcastComparisonProps {
  broadcast: BroadcastWithRequests;
  onSelectProvider: (orderId: string) => Promise<void>;
  loading?: boolean;
}

/**
 * Props for PricingNotepad component (merchant)
 */
export interface PricingNotepadProps {
  request: CustomOrderRequestWithItems;
  priceHistory: PriceHistoryItem[];
  onSubmitPricing: (items: Omit<CustomOrderItem, 'id' | 'request_id' | 'order_id' | 'created_at' | 'updated_at'>[], deliveryFee: number) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Props for PricingItemRow component
 */
export interface PricingItemRowProps {
  item: Partial<CustomOrderItem>;
  originalText?: string;
  priceHistory?: PriceHistoryItem;
  onUpdate: (item: Partial<CustomOrderItem>) => void;
  onUseCustomerText: () => void;
  onUsePreviousPrice: () => void;
  onMarkUnavailable: () => void;
  onAddSubstitute: () => void;
  onRemove: () => void;
}

// ============================================================================
// FINANCIAL TYPES
// ============================================================================

/**
 * Custom order financial breakdown
 */
export interface CustomOrderFinancials {
  productSubtotal: number;      // Sum of priced items
  deliveryFee: number;          // From provider settings
  customerTotal: number;        // subtotal + deliveryFee

  commissionRate: number;       // 5-7% tiered
  platformCommission: number;   // subtotal * rate

  merchantPayout: number;       // subtotal - commission + deliveryFee
}

/**
 * Calculate financials for custom order
 */
export function calculateCustomOrderFinancials(
  items: CustomOrderItem[],
  deliveryFee: number,
  commissionRate: number
): CustomOrderFinancials {
  const productSubtotal = items.reduce((sum, item) => {
    if (item.availability_status === 'substituted' && item.substitute_total_price) {
      return sum + item.substitute_total_price;
    }
    if (item.availability_status === 'available') {
      return sum + item.total_price;
    }
    return sum;
  }, 0);

  const platformCommission = productSubtotal * commissionRate;

  return {
    productSubtotal,
    deliveryFee,
    customerTotal: productSubtotal + deliveryFee,
    commissionRate,
    platformCommission,
    merchantPayout: productSubtotal - platformCommission + deliveryFee,
  };
}

// ============================================================================
// FEATURE TOGGLES
// ============================================================================

/**
 * Provider features based on operation mode
 */
export interface ProviderFeatures {
  // Tab visibility in dashboard
  showOrdersTab: boolean;        // Standard orders
  showPricingTab: boolean;       // Custom order pricing
  showProductsTab: boolean;      // Menu management

  // Customer interface mode
  customerInterface: 'menu' | 'custom-order' | 'both';

  // Default tab when opening dashboard
  defaultTab: 'orders' | 'pricing-orders' | 'dashboard';
}

/**
 * Get provider features based on operation mode
 */
export function getProviderFeatures(mode: OperationMode): ProviderFeatures {
  switch (mode) {
    case 'standard':
      return {
        showOrdersTab: true,
        showPricingTab: false,
        showProductsTab: true,
        customerInterface: 'menu',
        defaultTab: 'orders',
      };
    case 'custom':
      return {
        showOrdersTab: false,
        showPricingTab: true,
        showProductsTab: false,
        customerInterface: 'custom-order',
        defaultTab: 'pricing-orders',
      };
    case 'hybrid':
      return {
        showOrdersTab: true,
        showPricingTab: true,
        showProductsTab: true,
        customerInterface: 'both',
        defaultTab: 'dashboard',
      };
  }
}

// ============================================================================
// UNIT TYPES - Common units for pricing
// ============================================================================

/**
 * Common unit types for custom orders
 */
export const UNIT_TYPES = [
  { value: 'kg', labelAr: 'كيلو', labelEn: 'Kg' },
  { value: 'gram', labelAr: 'جرام', labelEn: 'Gram' },
  { value: 'piece', labelAr: 'قطعة', labelEn: 'Piece' },
  { value: 'box', labelAr: 'علبة', labelEn: 'Box' },
  { value: 'carton', labelAr: 'كرتونة', labelEn: 'Carton' },
  { value: 'pack', labelAr: 'عبوة', labelEn: 'Pack' },
  { value: 'bottle', labelAr: 'زجاجة', labelEn: 'Bottle' },
  { value: 'liter', labelAr: 'لتر', labelEn: 'Liter' },
  { value: 'bag', labelAr: 'كيس', labelEn: 'Bag' },
  { value: 'dozen', labelAr: 'دستة', labelEn: 'Dozen' },
  { value: 'bundle', labelAr: 'حزمة', labelEn: 'Bundle' },
] as const;

export type UnitType = typeof UNIT_TYPES[number]['value'];

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum providers for triple broadcast
 */
export const MAX_BROADCAST_PROVIDERS = 3;

/**
 * Maximum images per custom order
 */
export const MAX_ORDER_IMAGES = 5;

/**
 * Maximum voice recording duration (seconds)
 */
export const MAX_VOICE_DURATION_SECONDS = 120;

/**
 * Draft expiry hours
 */
export const DRAFT_EXPIRY_HOURS = 72;

/**
 * Storage key prefix for drafts
 */
export const DRAFT_KEY_PREFIX = 'custom_order_draft_';
