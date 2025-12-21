/**
 * Types for AI Smart Assistant Chat System
 */

// Intent Types - ما يريده المستخدم
export type IntentType =
  | 'search_product'      // بحث عن منتج "عايز بيتزا"
  | 'search_provider'     // بحث عن مطعم "فين سلطان بيتزا"
  | 'browse_category'     // تصفح فئة "عايز أشوف المطاعم"
  | 'compare'             // مقارنة "مين أحسن في البرجر"
  | 'reorder'             // إعادة طلب "زي المرة اللي فاتت"
  | 'get_recommendations' // اقتراحات "اقترح عليا حاجة"
  | 'add_to_order'        // إضافة للطلب "ضيف كمان 2 كولا"
  | 'modify_order'        // تعديل "غير الكمية لـ 3"
  | 'confirm_order'       // تأكيد "تمام كده"
  | 'cancel_order'        // إلغاء "مش عايز"
  | 'ask_question'        // سؤال "إيه ساعات العمل"
  | 'greeting'            // تحية "السلام عليكم"
  | 'thanks'              // شكر "شكراً"
  | 'unclear'             // غير واضح

// Parsed Intent من GPT
export interface ParsedIntent {
  type: IntentType
  confidence: number
  entities: {
    products?: string[]
    providers?: string[]
    quantities?: number[]
    categories?: string[]
    priceRange?: { min?: number; max?: number }
    attributes?: string[] // ["حار", "نباتي", "بدون بصل"]
    sortBy?: 'price' | 'rating' | 'delivery_time' | 'distance'
  }
}

// Message في المحادثة
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  // بيانات إضافية من الـ AI
  intent?: ParsedIntent
  actions?: ChatAction[]
  products?: ChatProduct[]
  providers?: ChatProvider[]
  orderDraft?: OrderDraft
  suggestions?: string[]
  comparison?: ProviderComparison
}

// Actions يمكن للمساعد تنفيذها
export type ChatAction =
  | 'show_products'
  | 'show_providers'
  | 'show_comparison'
  | 'add_to_cart'
  | 'show_cart'
  | 'confirm_order'
  | 'ask_clarification'
  | 'show_order_history'
  | 'show_promotions'

// منتج مبسط للعرض في الدردشة
export interface ChatProduct {
  id: string
  name_ar: string
  name_en: string | null
  description_ar: string | null
  price: number
  original_price: number | null
  image_url: string | null
  provider_id: string
  provider_name_ar: string
  provider_name_en: string | null
  rating?: number
  has_variants?: boolean
  variants?: ChatProductVariant[]
}

export interface ChatProductVariant {
  id: string
  name_ar: string
  name_en: string | null
  price: number
  is_default: boolean
}

// مزود مبسط للعرض في الدردشة
export interface ChatProvider {
  id: string
  name_ar: string
  name_en: string | null
  logo_url: string | null
  category: string | null
  rating: number
  reviews_count: number
  delivery_time_min: number
  delivery_fee: number
  min_order_amount: number
  is_open: boolean
  distance?: number
}

// مقارنة بين المزودين
export interface ProviderComparison {
  product_name: string
  providers: {
    provider: ChatProvider
    product: ChatProduct
    score: number // 0-100
    badges: ('cheapest' | 'best_rated' | 'fastest' | 'closest')[]
  }[]
  recommendation: {
    provider_id: string
    reason_ar: string
    reason_en: string
  }
}

// مسودة الطلب
export interface OrderDraft {
  items: OrderDraftItem[]
  provider: {
    id: string
    name_ar: string
    name_en: string | null
  }
  subtotal: number
  delivery_fee: number
  discount: number
  total: number
}

export interface OrderDraftItem {
  product_id: string
  product_name_ar: string
  product_name_en: string | null
  quantity: number
  price: number
  variant?: {
    id: string
    name_ar: string
    price: number
  }
  total: number
}

// سياق العميل للـ AI
export interface CustomerContext {
  customer: {
    id: string
    name: string
    city_id: string | null
    city_name: string | null
    governorate_id: string | null
    governorate_name: string | null
  } | null
  orderHistory: {
    recentOrders: RecentOrder[]
    favoriteProducts: FavoriteProduct[]
    favoriteProviders: FavoriteProvider[]
    totalOrders: number
    averageOrderValue: number
  }
  preferences: {
    cuisineTypes: string[]
    priceRange: 'budget' | 'mid' | 'premium'
    usualOrderTime: string
    dietaryRestrictions: string[]
  }
  currentContext: {
    time: 'صباح' | 'ظهر' | 'مساء' | 'ليل'
    dayOfWeek: string
    isWeekend: boolean
  }
}

export interface RecentOrder {
  id: string
  provider_id: string
  provider_name_ar: string
  total: number
  items_count: number
  created_at: string
}

export interface FavoriteProduct {
  id: string
  name_ar: string
  provider_id: string
  provider_name_ar: string
  times_ordered: number
}

export interface FavoriteProvider {
  id: string
  name_ar: string
  category: string | null
  times_ordered: number
}

// Response من الـ API
export interface ChatAPIResponse {
  success: boolean
  message: ChatMessage
  error?: string
}

// Request للـ API
export interface ChatAPIRequest {
  message: string
  conversationHistory: ChatMessage[]
  userId?: string
  cityId?: string
  governorateId?: string
}

// Quick Actions
export interface QuickAction {
  id: string
  label_ar: string
  label_en: string
  icon: string
  action: string
  data?: Record<string, unknown>
}

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'reorder',
    label_ar: '🔄 إعادة آخر طلب',
    label_en: '🔄 Reorder Last',
    icon: '🔄',
    action: 'reorder_last',
  },
  {
    id: 'promotions',
    label_ar: '🔥 العروض',
    label_en: '🔥 Promotions',
    icon: '🔥',
    action: 'show_promotions',
  },
  {
    id: 'popular',
    label_ar: '⭐ الأكثر طلباً',
    label_en: '⭐ Most Popular',
    icon: '⭐',
    action: 'show_popular',
  },
  {
    id: 'nearby',
    label_ar: '📍 الأقرب',
    label_en: '📍 Nearest',
    icon: '📍',
    action: 'show_nearby',
  },
  {
    id: 'help',
    label_ar: '🆘 مساعدة وشكوى',
    label_en: '🆘 Help & Complaints',
    icon: '🆘',
    action: 'show_help',
  },
]
