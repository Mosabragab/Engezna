/**
 * AI Agent Tools for Engezna Smart Assistant
 *
 * This file defines all the tools available to the AI agent for interacting
 * with the database and performing actions on behalf of the customer.
 */

import { createClient } from '@/lib/supabase/server'
import { getEmbeddingCached } from './embeddings'

// =============================================================================
// ARABIC TEXT NORMALIZATION (Client-side fallback)
// =============================================================================

/**
 * Normalize Arabic text for consistent search results
 * Handles common variations: ه↔ة, ى↔ي, أ/إ/آ→ا
 */
function normalizeArabic(text: string): string {
  return text
    .replace(/ة/g, 'ه')    // ta marbuta to heh
    .replace(/ى/g, 'ي')    // alef maqsura to ya
    .replace(/أ/g, 'ا')    // alef with hamza above
    .replace(/إ/g, 'ا')    // alef with hamza below
    .replace(/آ/g, 'ا')    // alef with madda
    .replace(/ؤ/g, 'و')    // waw with hamza
    .replace(/ئ/g, 'ي')    // ya with hamza
}

// =============================================================================
// TYPES
// =============================================================================

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  message?: string // Friendly message for the AI to use in response
  // Disambiguation for provider selection
  disambiguation_needed?: boolean
  query?: string
  providers?: Array<{
    id: string
    name_ar: string
    logo_url?: string
    rating?: number
    total_reviews?: number
    delivery_fee?: number
    estimated_delivery_time_min?: number
    item_count: number
    status: string
    previously_ordered?: boolean
    has_promotion?: boolean
    promotion_discount?: number
  }>
  total_providers?: number
  total_items?: number
  // FIX: Additional properties for enhanced search results
  sample_items?: unknown[] // Sample items when single provider found
  fallback_items?: unknown[] // Fallback items when no categories exist
  discovered_provider_id?: string // Provider ID discovered during search
  discovered_provider_name?: string // Provider name discovered during search
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required: string[]
  }
}

// Context passed to all tools
export interface ToolContext {
  customerId?: string
  providerId?: string
  cityId?: string
  governorateId?: string
  locale?: string
  // Cart context
  cartProviderId?: string
  cartItems?: Array<{
    id: string
    name: string
    quantity: number
    price: number
    variant_id?: string
  }>
  cartTotal?: number
  // Customer memory for personalization
  customerMemory?: {
    lastOrders?: Array<{
      providerId: string
      providerName: string
      items: string[]
      date: string
    }>
    favoriteItems?: string[]
    preferences?: {
      spicy?: boolean
      vegetarian?: boolean
      notes?: string[]
    }
    orderCount?: number
    lastVisit?: string
  }
}

// Helper to get effective provider ID from context
function getEffectiveProviderId(params: { provider_id?: string }, context: ToolContext): string | undefined {
  // Priority: explicit param > cart provider > page context provider
  return params.provider_id || context.cartProviderId || context.providerId
}

// =============================================================================
// TOOL DEFINITIONS (for OpenAI/Claude function calling)
// =============================================================================

export const AGENT_TOOLS: ToolDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 🍽️ MENU TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'get_provider_categories',
    description: 'الحصول على أقسام المنيو لتاجر معين (بيتزا، مشروبات، حلويات، إلخ)',
    parameters: {
      type: 'object',
      properties: {
        provider_id: {
          type: 'string',
          description: 'معرف التاجر'
        }
      },
      required: ['provider_id']
    }
  },
  {
    name: 'get_menu_items',
    description: 'الحصول على المنتجات من المنيو، يمكن تصفيتها حسب القسم أو البحث بالاسم',
    parameters: {
      type: 'object',
      properties: {
        provider_id: {
          type: 'string',
          description: 'معرف التاجر'
        },
        category_id: {
          type: 'string',
          description: 'معرف القسم (اختياري)'
        },
        search_query: {
          type: 'string',
          description: 'كلمة البحث (اختياري)'
        },
        limit: {
          type: 'number',
          description: 'عدد النتائج (اختياري، الافتراضي 20)'
        }
      },
      required: ['provider_id']
    }
  },
  {
    name: 'get_item_details',
    description: 'الحصول على تفاصيل منتج معين بما في ذلك الأحجام والإضافات',
    parameters: {
      type: 'object',
      properties: {
        item_id: {
          type: 'string',
          description: 'معرف المنتج'
        }
      },
      required: ['item_id']
    }
  },
  {
    name: 'get_item_addons',
    description: 'الحصول على الإضافات المتاحة لتاجر معين (جبنة إضافية، صوص، إلخ)',
    parameters: {
      type: 'object',
      properties: {
        provider_id: {
          type: 'string',
          description: 'معرف التاجر'
        }
      },
      required: ['provider_id']
    }
  },
  {
    name: 'search_menu',
    description: 'البحث في المنيو - يدور في اسم المنتج والوصف واسم القسم (مثال: "حلويات" هيجيب كل منتجات قسم الحلويات)',
    parameters: {
      type: 'object',
      properties: {
        provider_id: {
          type: 'string',
          description: 'معرف التاجر (اختياري - لو مش موجود هيبحث في كل التجار)'
        },
        query: {
          type: 'string',
          description: 'كلمة البحث (اسم المنتج أو اسم القسم مثل: بيتزا، حلويات، مشروبات)'
        },
        city_id: {
          type: 'string',
          description: 'معرف المدينة للبحث في تجار معينين'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'check_item_availability',
    description: 'التحقق من توفر منتج معين',
    parameters: {
      type: 'object',
      properties: {
        item_id: {
          type: 'string',
          description: 'معرف المنتج'
        }
      },
      required: ['item_id']
    }
  },
  {
    name: 'add_to_cart',
    description: 'إضافة منتج للسلة - استخدمها لما العميل يقول "ضيف" أو "أضف" أو "عايز أطلب"',
    parameters: {
      type: 'object',
      properties: {
        item_id: {
          type: 'string',
          description: 'معرف المنتج'
        },
        item_name: {
          type: 'string',
          description: 'اسم المنتج'
        },
        provider_id: {
          type: 'string',
          description: 'معرف التاجر'
        },
        price: {
          type: 'number',
          description: 'سعر المنتج'
        },
        quantity: {
          type: 'number',
          description: 'الكمية (اختياري، الافتراضي 1)'
        },
        variant_id: {
          type: 'string',
          description: 'معرف الحجم/النوع (اختياري)'
        },
        variant_name: {
          type: 'string',
          description: 'اسم الحجم/النوع (اختياري)'
        }
      },
      required: ['item_id', 'item_name', 'provider_id', 'price']
    }
  },
  {
    name: 'remove_from_cart',
    description: 'إزالة منتج من السلة - استخدمها لما العميل يقول "شيل" أو "الغي" أو "امسح" منتج معين',
    parameters: {
      type: 'object',
      properties: {
        item_name: {
          type: 'string',
          description: 'اسم المنتج المطلوب إزالته'
        },
        quantity: {
          type: 'number',
          description: 'الكمية المطلوب إزالتها (اختياري - لو مش موجود يشيل كله)'
        }
      },
      required: ['item_name']
    }
  },
  {
    name: 'update_cart_quantity',
    description: 'تعديل كمية منتج في السلة - استخدمها لما العميل يقول "زود" أو "نقص" أو "خليهم X"',
    parameters: {
      type: 'object',
      properties: {
        item_name: {
          type: 'string',
          description: 'اسم المنتج'
        },
        new_quantity: {
          type: 'number',
          description: 'الكمية الجديدة المطلوبة'
        },
        change: {
          type: 'number',
          description: 'التغيير في الكمية (+2 للزيادة، -1 للنقص)'
        }
      },
      required: ['item_name']
    }
  },
  {
    name: 'clear_cart',
    description: 'تفريغ السلة بالكامل - استخدمها لما العميل يقول "امسح السلة" أو "فضي السلة"',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_cart_summary',
    description: 'عرض محتويات السلة الحالية - استخدمها لما العميل يقول "ايه في السلة" أو "كام الحساب"',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 🏪 PROVIDER TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'get_provider_info',
    description: 'الحصول على معلومات تاجر معين (الاسم، العنوان، التقييم، إلخ)',
    parameters: {
      type: 'object',
      properties: {
        provider_id: {
          type: 'string',
          description: 'معرف التاجر'
        }
      },
      required: ['provider_id']
    }
  },
  {
    name: 'check_provider_open',
    description: 'التحقق إذا كان التاجر مفتوح الآن',
    parameters: {
      type: 'object',
      properties: {
        provider_id: {
          type: 'string',
          description: 'معرف التاجر'
        }
      },
      required: ['provider_id']
    }
  },
  {
    name: 'get_delivery_info',
    description: 'الحصول على معلومات التوصيل (رسوم التوصيل، الحد الأدنى، الوقت المتوقع) - لو مفيش provider_id هيستخدم تاجر السلة',
    parameters: {
      type: 'object',
      properties: {
        provider_id: {
          type: 'string',
          description: 'معرف التاجر (اختياري - لو مش موجود هيستخدم تاجر السلة)'
        }
      },
      required: []
    }
  },
  {
    name: 'search_providers',
    description: 'البحث عن تجار في منطقة معينة',
    parameters: {
      type: 'object',
      properties: {
        city_id: {
          type: 'string',
          description: 'معرف المدينة'
        },
        category: {
          type: 'string',
          description: 'نوع التاجر (مطعم، كافيه، سوبر ماركت، إلخ)',
          enum: ['restaurant_cafe', 'coffee_patisserie', 'grocery', 'vegetables_fruits']
        },
        search_query: {
          type: 'string',
          description: 'كلمة البحث (اختياري)'
        }
      },
      required: ['city_id']
    }
  },
  {
    name: 'lookup_provider',
    description: 'البحث عن تاجر بالاسم والحصول على معرفه - استخدمها لما العميل يختار تاجر معين بالاسم (مثال: "الصفا", "سلطان بيتزا")',
    parameters: {
      type: 'object',
      properties: {
        provider_name: {
          type: 'string',
          description: 'اسم التاجر المطلوب البحث عنه'
        },
        city_id: {
          type: 'string',
          description: 'معرف المدينة (اختياري)'
        }
      },
      required: ['provider_name']
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 🛒 ORDER TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'get_order_status',
    description: 'الحصول على حالة طلب معين',
    parameters: {
      type: 'object',
      properties: {
        order_id: {
          type: 'string',
          description: 'معرف الطلب أو رقم الطلب'
        }
      },
      required: ['order_id']
    }
  },
  {
    name: 'get_order_history',
    description: 'الحصول على تاريخ الطلبات للعميل',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'عدد الطلبات (اختياري، الافتراضي 10)'
        },
        status: {
          type: 'string',
          description: 'فلترة حسب الحالة (اختياري)',
          enum: ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']
        }
      },
      required: []
    }
  },
  {
    name: 'track_order',
    description: 'تتبع طلب معين والحصول على تفاصيل التوصيل',
    parameters: {
      type: 'object',
      properties: {
        order_id: {
          type: 'string',
          description: 'معرف الطلب'
        }
      },
      required: ['order_id']
    }
  },
  {
    name: 'cancel_order',
    description: 'إلغاء طلب (فقط لو لسه في حالة pending)',
    parameters: {
      type: 'object',
      properties: {
        order_id: {
          type: 'string',
          description: 'معرف الطلب'
        },
        reason: {
          type: 'string',
          description: 'سبب الإلغاء'
        }
      },
      required: ['order_id']
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 👤 CUSTOMER TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'get_customer_addresses',
    description: 'الحصول على عناوين العميل المحفوظة',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_favorites',
    description: 'الحصول على التجار المفضلين للعميل',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 🎁 PROMOTIONS TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'get_provider_promotions',
    description: 'الحصول على كل العروض المتاحة - يرجع 3 أنواع: (1) أكواد الخصم promo_codes زي WELCOME30, SAVE20 (2) عروض التاجر promotions زي خصم نهاية الأسبوع (3) المنتجات المخفضة discounted_products. لو مفيش provider_id هيجيب أكواد الخصم العامة بس',
    parameters: {
      type: 'object',
      properties: {
        provider_id: {
          type: 'string',
          description: 'معرف التاجر (اختياري - لو مش موجود هيستخدم تاجر السلة)'
        }
      },
      required: []
    }
  },
  {
    name: 'validate_promo_code',
    description: 'التحقق من صلاحية كود خصم',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'كود الخصم'
        },
        provider_id: {
          type: 'string',
          description: 'معرف التاجر (اختياري)'
        },
        order_total: {
          type: 'number',
          description: 'إجمالي الطلب'
        }
      },
      required: ['code']
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ⭐ REVIEWS TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'get_provider_reviews',
    description: 'الحصول على تقييمات تاجر معين',
    parameters: {
      type: 'object',
      properties: {
        provider_id: {
          type: 'string',
          description: 'معرف التاجر'
        },
        limit: {
          type: 'number',
          description: 'عدد التقييمات (اختياري، الافتراضي 5)'
        }
      },
      required: ['provider_id']
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 🎫 SUPPORT TOOLS
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'create_support_ticket',
    description: 'إنشاء تذكرة دعم فني',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'نوع المشكلة',
          enum: ['payment', 'delivery', 'quality', 'provider_issue', 'account', 'other']
        },
        subject: {
          type: 'string',
          description: 'عنوان المشكلة'
        },
        description: {
          type: 'string',
          description: 'وصف المشكلة'
        },
        order_id: {
          type: 'string',
          description: 'معرف الطلب المتعلق (اختياري)'
        }
      },
      required: ['type', 'subject', 'description']
    }
  },
  {
    name: 'escalate_to_human',
    description: 'تحويل المحادثة لموظف دعم بشري',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'سبب التحويل'
        }
      },
      required: ['reason']
    }
  }
]

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

export async function executeAgentTool(
  toolName: string,
  params: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const supabase = await createClient()

  try {
    switch (toolName) {
      // ─────────────────────────────────────────────────────────────────────
      // 🍽️ MENU TOOLS
      // ─────────────────────────────────────────────────────────────────────
      case 'get_provider_categories': {
        const { provider_id: param_provider_id } = params as { provider_id?: string }

        // ═══════════════════════════════════════════════════════════════════
        // FIX #3: Use context provider_id as fallback
        // This enables "show menu categories" after provider discovery
        // ═══════════════════════════════════════════════════════════════════
        const effectiveProviderId = param_provider_id || context.providerId || context.cartProviderId

        if (!effectiveProviderId) {
          return {
            success: false,
            error: 'missing_provider_id',
            message: 'محتاج أعرف انت في أي مطعم عشان أجيب الأقسام. اختار مطعم الأول!'
          }
        }

        console.log('[get_provider_categories] Using provider:', effectiveProviderId)

        const { data, error } = await supabase
          .from('provider_categories')
          .select('id, name_ar, name_en, description_ar, icon, display_order')
          .eq('provider_id', effectiveProviderId)
          .eq('is_active', true)
          .order('display_order')

        if (error) throw error

        // ═══════════════════════════════════════════════════════════════════
        // FIX #3 CONTINUED: Fallback to showing items if no categories exist
        // Some providers don't have categories, so show items directly
        // ═══════════════════════════════════════════════════════════════════
        if (!data || data.length === 0) {
          console.log('[get_provider_categories] No categories found, fetching items directly')

          const { data: items, error: itemsError } = await supabase
            .from('menu_items')
            .select(`
              id, name_ar, name_en, description_ar, price, original_price,
              image_url, is_available, has_stock, has_variants, pricing_type
            `)
            .eq('provider_id', effectiveProviderId)
            .eq('is_available', true)
            .order('display_order')
            .limit(15)

          if (itemsError) throw itemsError

          return {
            success: true,
            data: [],
            message: 'المطعم ده مش عنده أقسام، بس لقيتلك أصناف مباشرة:',
            fallback_items: items
          }
        }

        return { success: true, data }
      }

      case 'get_menu_items': {
        const { provider_id: param_provider_id, category_id, search_query, limit = 20 } = params as {
          provider_id?: string
          category_id?: string
          search_query?: string
          limit?: number
        }

        // ═══════════════════════════════════════════════════════════════════
        // FIX #2: Use context provider_id as fallback
        // This enables "show menu" after provider discovery without explicit ID
        // ═══════════════════════════════════════════════════════════════════
        const effectiveProviderId = param_provider_id || context.providerId || context.cartProviderId

        if (!effectiveProviderId) {
          return {
            success: false,
            error: 'missing_provider_id',
            message: 'محتاج أعرف انت في أي مطعم عشان أجيب المنيو. اختار مطعم الأول!'
          }
        }

        console.log('[get_menu_items] Using provider:', {
          param: param_provider_id,
          context: context.providerId,
          cart: context.cartProviderId,
          effective: effectiveProviderId
        })

        let query = supabase
          .from('menu_items')
          .select(`
            id, name_ar, name_en, description_ar, price, original_price,
            image_url, is_available, has_stock, has_variants, pricing_type, category_id
          `)
          .eq('provider_id', effectiveProviderId)
          .eq('is_available', true)
          .order('display_order')
          .limit(limit)

        if (category_id) {
          query = query.eq('category_id', category_id)
        }

        if (search_query) {
          query = query.ilike('name_ar', `%${search_query}%`)
        }

        const { data, error } = await query
        if (error) throw error

        // Fetch variants for items that have them
        const itemsWithVariants = data?.filter(item => item.has_variants) || []
        if (itemsWithVariants.length > 0) {
          const { data: variants } = await supabase
            .from('product_variants')
            .select('id, product_id, name_ar, price, is_default, variant_type')
            .in('product_id', itemsWithVariants.map(i => i.id))
            .eq('is_available', true)
            .order('display_order')

          // Attach variants to items
          const itemsMap = new Map(data?.map(item => [item.id, { ...item, variants: [] as typeof variants }]))
          variants?.forEach(variant => {
            const item = itemsMap.get(variant.product_id)
            if (item) {
              item.variants?.push(variant)
            }
          })
          return { success: true, data: Array.from(itemsMap.values()) }
        }

        return { success: true, data }
      }

      case 'get_item_details': {
        const { item_id } = params as { item_id: string }

        const { data: item, error } = await supabase
          .from('menu_items')
          .select(`
            id, name_ar, name_en, description_ar, description_en, price, original_price,
            image_url, is_available, has_stock, has_variants, pricing_type,
            is_vegetarian, is_spicy, calories, preparation_time_min,
            combo_contents_ar, serves_count,
            provider_id, category_id
          `)
          .eq('id', item_id)
          .single()

        if (error) throw error

        // Get variants if item has them
        let variants = null
        if (item?.has_variants) {
          const { data: v } = await supabase
            .from('product_variants')
            .select('id, name_ar, name_en, price, original_price, is_default, variant_type')
            .eq('product_id', item_id)
            .eq('is_available', true)
            .order('display_order')
          variants = v
        }

        // Get addons for the provider
        const { data: addons } = await supabase
          .from('store_addons')
          .select('id, name_ar, name_en, price, addon_group')
          .eq('provider_id', item?.provider_id)
          .eq('is_active', true)
          .order('display_order')

        return { success: true, data: { ...item, variants, addons } }
      }

      case 'get_item_addons': {
        const { provider_id } = params as { provider_id: string }
        const { data, error } = await supabase
          .from('store_addons')
          .select('id, name_ar, name_en, price, addon_group')
          .eq('provider_id', provider_id)
          .eq('is_active', true)
          .order('addon_group', { ascending: true })
          .order('display_order')

        if (error) throw error
        return { success: true, data }
      }

      case 'search_menu': {
        const { provider_id, query, city_id } = params as {
          provider_id?: string
          query: string
          city_id?: string
        }

        // CRITICAL: Log search parameters at entry point
        console.log('[search_menu] === SEARCH STARTED ===', {
          query,
          provider_id_param: provider_id,
          city_id_param: city_id,
          context_cityId: context.cityId,
          context_providerId: context.providerId,
          context_cartProviderId: context.cartProviderId
        })

        // NOTE: Arabic normalization is handled by the DB function (normalize_arabic)
        // Don't normalize here as fallback ILIKE queries need the original text

        // ═══════════════════════════════════════════════════════════════════
        // FIX #4: Detect English/Latin text and use vector search
        // This helps with queries like "quatro formag" → "بيتزا فور تشيز"
        // ═══════════════════════════════════════════════════════════════════
        const isLatinText = /^[a-zA-Z0-9\s]+$/.test(query.trim())
        let queryEmbedding: number[] | null = null

        if (isLatinText) {
          console.log('[search_menu] Latin text detected, generating embedding for semantic search')
          try {
            queryEmbedding = await getEmbeddingCached(query)
          } catch (embeddingError) {
            console.error('[search_menu] Failed to generate embedding:', embeddingError)
            // Continue with text search as fallback
          }
        }

        // Helper function to fetch variants for items
        const fetchVariantsForItems = async (items: Array<{ id: string; has_variants: boolean | null }>) => {
          const itemsWithVariants = items.filter(item => item.has_variants)
          if (itemsWithVariants.length === 0) return items

          const { data: variants } = await supabase
            .from('product_variants')
            .select('id, product_id, name_ar, price, original_price, is_default, variant_type')
            .in('product_id', itemsWithVariants.map(i => i.id))
            .eq('is_available', true)
            .order('display_order')

          // Attach variants to items
          const itemsMap = new Map(items.map(item => [item.id, { ...item, variants: [] as typeof variants }]))
          variants?.forEach(variant => {
            const item = itemsMap.get(variant.product_id)
            if (item) {
              item.variants?.push(variant)
            }
          })
          return Array.from(itemsMap.values())
        }

        // Helper function to find categories matching the query
        const findMatchingCategoryIds = async (searchQuery: string, providerIds?: string[]): Promise<string[]> => {
          let categoryQuery = supabase
            .from('provider_categories')
            .select('id')
            .eq('is_active', true)
            .ilike('name_ar', `%${searchQuery}%`)

          if (providerIds && providerIds.length > 0) {
            categoryQuery = categoryQuery.in('provider_id', providerIds)
          }

          const { data: categories } = await categoryQuery.limit(20)
          return categories?.map(c => c.id) || []
        }

        // Use effective provider ID from context if not explicitly provided
        const effectiveProviderId = getEffectiveProviderId({ provider_id }, context)
        const effectiveCityId = city_id || context.cityId

        // ═══════════════════════════════════════════════════════════════════
        // Try Hybrid Search first (uses fuzzy matching + keyword matching + semantic)
        // Falls back to simple search if function doesn't exist
        // ═══════════════════════════════════════════════════════════════════

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let hybridResults: any[] | null = null
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let hybridError: any = null

          // FIX #4 CONTINUED: Use hybrid_search_menu with embedding for Latin text
          if (queryEmbedding) {
            console.log('[search_menu] Using hybrid_search_menu with embedding')
            const result = await supabase
              .rpc('hybrid_search_menu', {
                p_query: query,
                p_query_embedding: JSON.stringify(queryEmbedding),
                p_provider_id: effectiveProviderId || null,
                p_city_id: effectiveCityId || null,
                p_limit: 15
              })
            hybridResults = result.data
            hybridError = result.error
          } else {
            // Use simple_search_menu for Arabic text (fuzzy + keyword)
            const result = await supabase
              .rpc('simple_search_menu', {
                p_query: query,
                p_provider_id: effectiveProviderId || null,
                p_city_id: effectiveCityId || null,
                p_limit: 15
              })
            hybridResults = result.data
            hybridError = result.error
          }

          // Log for debugging - ENHANCED
          console.log('[search_menu] === HYBRID SEARCH RESULT ===', {
            query,
            hybridError: hybridError?.message,
            resultCount: hybridResults?.length || 0,
            effectiveCityId,
            contextCityId: context.cityId,
            cityIdParam: city_id,
            firstResults: hybridResults?.slice(0, 3).map((r: { name_ar: string; provider_name: string }) => ({
              item: r.name_ar,
              provider: r.provider_name
            }))
          })

          if (!hybridError && hybridResults && hybridResults.length > 0) {
            // Transform results to expected format
            const formattedResults = hybridResults.map((item: {
              id: string
              name_ar: string
              name_en: string
              description_ar: string
              price: number
              original_price: number
              image_url: string
              has_variants: boolean
              provider_id: string
              provider_name: string
              category_name: string
              match_score: number
            }) => ({
              id: item.id,
              name_ar: item.name_ar,
              price: item.price,
              original_price: item.original_price,
              image_url: item.image_url,
              has_variants: item.has_variants,
              provider_id: item.provider_id,
              providers: { id: item.provider_id, name_ar: item.provider_name },
              provider_categories: { name_ar: item.category_name }
            }))

            // ═══════════════════════════════════════════════════════════════════
            // PROVIDER FIRST: If no provider selected, guide user to select first
            // ═══════════════════════════════════════════════════════════════════
            if (!effectiveProviderId) {
              // Group by provider
              const providerMap = new Map<string, { name: string; count: number }>()
              formattedResults.forEach((item: { provider_id: string; providers: { name_ar: string } }) => {
                const existing = providerMap.get(item.provider_id)
                if (existing) {
                  existing.count++
                } else {
                  providerMap.set(item.provider_id, { name: item.providers.name_ar, count: 1 })
                }
              })

              const uniqueProviders = Array.from(providerMap.entries()).map(([id, info]) => ({
                id,
                name_ar: info.name,
                item_count: info.count,
                status: 'open' as const  // Default status for hybrid search results
              }))

              // ALWAYS do PROVIDER FIRST - even with 1 provider
              // BUT also include sample items so AI can show them immediately
              const message = uniqueProviders.length === 1
                ? `لقيت "${query}" في ${uniqueProviders[0].name_ar}! تحب تشوف المنيو بتاعهم؟`
                : `لقيت "${query}" في ${uniqueProviders.length} مكان! تفضل تطلب من مين؟`

              // ═══════════════════════════════════════════════════════════════════
              // FIX #1: Include sample items when single provider found
              // This allows AI to show items immediately without another search
              // ═══════════════════════════════════════════════════════════════════
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let sampleItems: any[] = []
              if (uniqueProviders.length === 1) {
                // Get top 5 items from this provider for immediate display
                const providerId = uniqueProviders[0].id
                const providerItems = formattedResults.filter(
                  (item: { provider_id: string }) => item.provider_id === providerId
                ).slice(0, 5)
                sampleItems = await fetchVariantsForItems(providerItems) as any[]
              }

              return {
                success: true,
                disambiguation_needed: true,
                query: query,
                message,
                providers: uniqueProviders,
                total_providers: uniqueProviders.length,
                total_items: formattedResults.length,
                // FIX #1 CONTINUED: Include sample items and discovered provider
                sample_items: sampleItems.length > 0 ? sampleItems : undefined,
                discovered_provider_id: uniqueProviders.length === 1 ? uniqueProviders[0].id : undefined,
                discovered_provider_name: uniqueProviders.length === 1 ? uniqueProviders[0].name_ar : undefined
              }
            }

            // If provider is selected, return items directly
            const itemsWithVariants = await fetchVariantsForItems(formattedResults)

            // Check if results are from a different provider
            const fromDifferentProvider = effectiveProviderId &&
              formattedResults.every((item: { provider_id: string }) => item.provider_id !== effectiveProviderId)

            return {
              success: true,
              data: itemsWithVariants,
              message: fromDifferentProvider
                ? 'مش لاقي في التاجر الحالي، بس لقيت في تجار تانيين'
                : undefined
            }
          }
        } catch {
          // Hybrid search function might not exist yet, fall back to standard search
          console.log('[search_menu] Hybrid search not available, using fallback')
        }

        // ═══════════════════════════════════════════════════════════════════
        // Fallback: Standard ilike search
        // ═══════════════════════════════════════════════════════════════════

        if (effectiveProviderId) {
          // Search within a specific provider (from param, cart, or page context)
          // IMPROVED: Search in name, description, AND category name

          // First find categories matching the query
          const matchingCategoryIds = await findMatchingCategoryIds(query, [effectiveProviderId])

          // Build search query
          let searchQuery = supabase
            .from('menu_items')
            .select(`
              id, name_ar, price, original_price, image_url, has_variants, provider_id, category_id,
              providers(id, name_ar)
            `)
            .eq('provider_id', effectiveProviderId)
            .eq('is_available', true)

          // Search by name/description OR by matching category
          // NOTE: Use * instead of % for Supabase JS client wildcards
          if (matchingCategoryIds.length > 0) {
            // Use raw filter to combine OR conditions across different columns
            searchQuery = searchQuery.or(`name_ar.ilike.*${query}*,description_ar.ilike.*${query}*,category_id.in.(${matchingCategoryIds.join(',')})`)
          } else {
            searchQuery = searchQuery.or(`name_ar.ilike.*${query}*,description_ar.ilike.*${query}*`)
          }

          const { data, error } = await searchQuery.limit(15)

          if (error) throw error

          // If found results in current provider, fetch variants and return
          if (data && data.length > 0) {
            const itemsWithVariants = await fetchVariantsForItems(data)
            return { success: true, data: itemsWithVariants }
          }

          // FALLBACK: No results in current provider, search globally
          // Get active providers in the city
          let providersQuery = supabase
            .from('providers')
            .select('id, name_ar')
            .in('status', ['open', 'closed', 'temporarily_paused'])
            .neq('id', effectiveProviderId) // Exclude current provider (already searched)

          if (effectiveCityId) {
            providersQuery = providersQuery.eq('city_id', effectiveCityId)
          }

          const { data: otherProviders } = await providersQuery.limit(50)

          if (otherProviders?.length) {
            // Find categories matching the query in other providers
            const globalCategoryIds = await findMatchingCategoryIds(query, otherProviders.map(p => p.id))

            let globalSearchQuery = supabase
              .from('menu_items')
              .select(`
                id, name_ar, price, original_price, image_url, has_variants, provider_id, category_id,
                providers(id, name_ar)
              `)
              .in('provider_id', otherProviders.map(p => p.id))
              .eq('is_available', true)

            if (globalCategoryIds.length > 0) {
              globalSearchQuery = globalSearchQuery.or(`name_ar.ilike.*${query}*,description_ar.ilike.*${query}*,category_id.in.(${globalCategoryIds.join(',')})`)
            } else {
              globalSearchQuery = globalSearchQuery.or(`name_ar.ilike.*${query}*,description_ar.ilike.*${query}*`)
            }

            const { data: globalData, error: globalError } = await globalSearchQuery.limit(15)

            if (!globalError && globalData && globalData.length > 0) {
              const itemsWithVariants = await fetchVariantsForItems(globalData)
              return {
                success: true,
                data: itemsWithVariants,
                message: 'مش لاقي في التاجر الحالي، بس لقيت في تجار تانيين'
              }
            }
          }

          return {
            success: true,
            data: [],
            message: 'مش لاقي نتائج للمنتج ده'
          }
        } else {
          // ═══════════════════════════════════════════════════════════════════
          // SMART PROVIDER SELECTION: Don't overwhelm with results from many providers
          // If query matches items in 3+ providers, ask user to choose provider first
          // ═══════════════════════════════════════════════════════════════════

          // CRITICAL DEBUG: Log at very start of fallback
          console.log('[search_menu] === FALLBACK START ===', {
            query,
            effectiveCityId,
            effectiveProviderId,
            contextCityId: context.cityId,
            cityIdParam: city_id
          })

          // First get active providers in the city with full details for smart suggestions
          let providersQuery = supabase
            .from('providers')
            .select('id, name_ar, logo_url, rating, total_reviews, delivery_fee, estimated_delivery_time_min, category, status')
            .in('status', ['open', 'closed', 'temporarily_paused'])

          // RE-ENABLED city filter - was causing issues when disabled
          if (effectiveCityId) {
            providersQuery = providersQuery.eq('city_id', effectiveCityId)
            console.log('[search_menu] City filter ENABLED:', effectiveCityId)
          } else {
            console.log('[search_menu] ⚠️ No city_id - searching ALL cities!')
          }

          const { data: providers, error: providersError } = await providersQuery.limit(50)

          // Log for debugging
          console.log('[search_menu] Fallback - providers found:', {
            providerCount: providers?.length || 0,
            providerIds: providers?.slice(0, 3).map(p => p.id),
            providersError: providersError?.message
          })

          if (!providers?.length) {
            return {
              success: true,
              data: [],
              message: 'مفيش تجار متاحين في المنطقة دي'
            }
          }

          // Find categories matching the query across all providers
          const allCategoryIds = await findMatchingCategoryIds(query, providers.map(p => p.id))

          // ═══════════════════════════════════════════════════════════════════
          // PHASE 1: Count items per provider to decide disambiguation
          // ═══════════════════════════════════════════════════════════════════

          // Build the search filter - NOTE: Use * instead of % for Supabase JS client wildcards
          const searchFilter = allCategoryIds.length > 0
            ? `name_ar.ilike.*${query}*,description_ar.ilike.*${query}*,category_id.in.(${allCategoryIds.join(',')})`
            : `name_ar.ilike.*${query}*,description_ar.ilike.*${query}*`

          // DEBUG: First check if ANY items exist for these providers (no filters)
          const { data: allItemsCheck } = await supabase
            .from('menu_items')
            .select('id, name_ar, is_available')
            .in('provider_id', providers.map(p => p.id))
            .limit(5)

          console.log('[search_menu] DEBUG - Raw items check (no filter):', {
            query,
            foundAnyItems: allItemsCheck?.length || 0,
            samples: allItemsCheck?.map(i => `${i.name_ar}(${i.is_available})`)
          })

          // Log the search filter
          console.log('[search_menu] Fallback - searching with filter:', {
            searchFilter,
            query,
            providerCount: providers.length
          })

          // Try simpler approach - use ilike directly instead of .or()
          const { data: itemCounts, error: itemsError } = await supabase
            .from('menu_items')
            .select('provider_id, name_ar')
            .in('provider_id', providers.map(p => p.id))
            .eq('is_available', true)
            .ilike('name_ar', `%${query}%`)

          // Log what we found
          console.log('[search_menu] Fallback - ilike result:', {
            itemCount: itemCounts?.length || 0,
            itemsError: itemsError?.message,
            sampleItems: itemCounts?.slice(0, 3).map(i => i.name_ar)
          })

          // Log items result
          console.log('[search_menu] Fallback - items result:', {
            itemCount: itemCounts?.length || 0,
            itemsError: itemsError?.message
          })

          // Group by provider and count
          const providerItemCounts = new Map<string, number>()
          itemCounts?.forEach(item => {
            const count = providerItemCounts.get(item.provider_id) || 0
            providerItemCounts.set(item.provider_id, count + 1)
          })

          // Get providers that have matching items
          const providersWithItems = providers.filter(p => providerItemCounts.has(p.id))
          const totalItems = itemCounts?.length || 0

          console.log('[search_menu] Fallback - final result:', {
            providersWithItems: providersWithItems.length,
            totalItems
          })

          // ═══════════════════════════════════════════════════════════════════
          // DECISION: ALWAYS guide user to provider first!
          // Even with 1 provider - confirm before showing all items
          // ═══════════════════════════════════════════════════════════════════

          if (providersWithItems.length === 0) {
            // No providers have this item
            return {
              success: true,
              data: [],
              message: 'مش لاقي نتائج لبحثك'
            }
          }

          // Always do provider selection when no provider context
          // Get promotions for these providers (to highlight deals)
          const { data: promotions } = await supabase
            .from('provider_promotions')
            .select('provider_id, title_ar, discount_percentage')
            .in('provider_id', providersWithItems.map(p => p.id))
            .eq('is_active', true)
            .gte('end_date', new Date().toISOString())
            .limit(20)

          // Map promotions to providers
          const providerPromotions = new Map<string, { title: string; discount: number }>()
          promotions?.forEach(promo => {
            if (!providerPromotions.has(promo.provider_id)) {
              providerPromotions.set(promo.provider_id, {
                title: promo.title_ar,
                discount: promo.discount_percentage
              })
            }
          })

          // Check customer memory for previous orders (prioritize familiar providers)
          const previousProviderIds = context.customerMemory?.lastOrders?.map(o => o.providerId) || []

          // Sort providers by: previous orders > rating > item count
          const sortedProviders = providersWithItems
            .map(p => ({
              ...p,
              item_count: providerItemCounts.get(p.id) || 0,
              has_promotion: providerPromotions.has(p.id),
              promotion: providerPromotions.get(p.id),
              previously_ordered: previousProviderIds.includes(p.id)
            }))
            .sort((a, b) => {
              // Previous orders first
              if (a.previously_ordered && !b.previously_ordered) return -1
              if (!a.previously_ordered && b.previously_ordered) return 1
              // Then by rating
              return (b.rating || 0) - (a.rating || 0)
            })
            .slice(0, 5) // Top 5 providers

          // ═══════════════════════════════════════════════════════════════════
          // ALWAYS return disambiguation - guide user to provider first!
          // Special case: 1 provider gets a simpler message
          // ═══════════════════════════════════════════════════════════════════

          const message = providersWithItems.length === 1
            ? `لقيت "${query}" في ${sortedProviders[0].name_ar}! تحب تشوف المنيو بتاعهم؟`
            : `لقيت "${query}" في ${providersWithItems.length} مكان! تفضل تطلب من مين؟`

          // Return disambiguation response
          return {
            success: true,
            disambiguation_needed: true,
            query: query, // Save original query for context
            message,
            providers: sortedProviders.map(p => ({
              id: p.id,
              name_ar: p.name_ar,
              logo_url: p.logo_url,
              rating: p.rating,
              total_reviews: p.total_reviews,
              delivery_fee: p.delivery_fee,
              estimated_delivery_time_min: p.estimated_delivery_time_min,
              item_count: p.item_count,
              status: p.status,
              previously_ordered: p.previously_ordered,
              has_promotion: p.has_promotion,
              promotion_discount: p.promotion?.discount
            })),
            total_providers: providersWithItems.length,
            total_items: totalItems
          }
        }
      }

      case 'check_item_availability': {
        const { item_id } = params as { item_id: string }
        const { data, error } = await supabase
          .from('menu_items')
          .select('id, name_ar, is_available, has_stock, stock_notes')
          .eq('id', item_id)
          .single()

        if (error) throw error

        const isAvailable = data?.is_available && (data?.has_stock !== false)
        return {
          success: true,
          data: {
            available: isAvailable,
            item: data,
            message: isAvailable
              ? 'المنتج متاح'
              : data?.stock_notes || 'المنتج غير متاح حالياً'
          }
        }
      }

      case 'add_to_cart': {
        const {
          item_id,
          item_name,
          provider_id: param_provider_id,
          price,
          quantity = 1,
          variant_id,
          variant_name
        } = params as {
          item_id: string
          item_name: string
          provider_id: string
          price: number
          quantity?: number
          variant_id?: string
          variant_name?: string
        }

        // ═══════════════════════════════════════════════════════════════
        // FALLBACK: Use context provider_id if AI forgot to pass it
        // Priority: explicit param > cart provider > page context provider
        // ═══════════════════════════════════════════════════════════════
        const provider_id = param_provider_id || context.cartProviderId || context.providerId

        // ═══════════════════════════════════════════════════════════════
        // DETAILED LOGGING: Track why add_to_cart fails
        // ═══════════════════════════════════════════════════════════════
        console.log('[add_to_cart] Request:', {
          item_id,
          item_name,
          param_provider_id,
          provider_id,
          price,
          quantity,
          variant_id,
          variant_name,
          contextProviderId: context.providerId,
          contextCartProviderId: context.cartProviderId,
          usedFallback: !param_provider_id && !!provider_id
        })

        // ═══════════════════════════════════════════════════════════════
        // VALIDATE REQUIRED PARAMS
        // ═══════════════════════════════════════════════════════════════
        if (!item_id || item_id === 'undefined' || item_id === 'null') {
          console.error('[add_to_cart] Missing item_id:', item_id)
          return {
            success: false,
            error: 'missing_item_id',
            message: `مش عارف أضيف "${item_name}" للسلة. ابحث عن المنتج تاني واستخدم الـ ID الصحيح.`
          }
        }

        if (!provider_id || provider_id === 'undefined' || provider_id === 'null') {
          console.error('[add_to_cart] Missing provider_id (no fallback available):', param_provider_id)
          return {
            success: false,
            error: 'missing_provider_id',
            message: `مش عارف أضيف "${item_name}" للسلة. ابحث عن المنتج تاني.`
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // PRE-EXECUTION GUARDS: Validate before adding to cart
        // ═══════════════════════════════════════════════════════════════

        // 1. Check item availability and stock (also check has_variants)
        const { data: item, error: itemError } = await supabase
          .from('menu_items')
          .select('id, name_ar, is_available, has_stock, stock_notes, price, provider_id, has_variants')
          .eq('id', item_id)
          .single()

        if (itemError) {
          console.error('[add_to_cart] Database error:', itemError)
          return {
            success: false,
            error: 'db_error',
            message: `حصل مشكلة في قاعدة البيانات. جرب تاني.`
          }
        }

        if (!item) {
          console.error('[add_to_cart] Item not found:', item_id)
          return {
            success: false,
            error: 'item_not_found',
            message: `المنتج "${item_name}" مش موجود بالـ ID ده. ابحث عن المنتج تاني.`
          }
        }

        if (!item.is_available) {
          return {
            success: false,
            error: 'المنتج غير متاح',
            message: `للأسف ${item.name_ar} مش متاح دلوقتي 😕`
          }
        }

        // SAFETY CHECK: Validate provider_id matches item's actual provider
        if (item.provider_id !== provider_id) {
          console.error('[add_to_cart] Provider mismatch!', {
            item_provider: item.provider_id,
            requested_provider: provider_id
          })
          return {
            success: false,
            error: 'provider_mismatch',
            message: `المنتج "${item.name_ar}" مش من المطعم ده. ابحث عن المنتج تاني واستخدم الـ provider_id الصحيح.`
          }
        }

        // SAFETY CHECK: Price sanity (prevent obviously wrong prices)
        if (price <= 0 || price > 50000) {
          console.error('[add_to_cart] Invalid price:', price)
          return {
            success: false,
            error: 'invalid_price',
            message: `السعر ${price} مش صحيح. ابحث عن المنتج تاني للحصول على السعر الصحيح.`
          }
        }

        if (item.has_stock === false) {
          return {
            success: false,
            error: 'المنتج نفذ من المخزون',
            message: item.stock_notes || `للأسف ${item.name_ar} خلص 😕 عايز حاجة تانية؟`
          }
        }

        // 1.5 CRITICAL: If product has variants but no variant_id provided, fetch available variants
        if (item.has_variants && !variant_id) {
          // Fetch available variants to show to the agent
          const { data: variants } = await supabase
            .from('product_variants')
            .select('id, name_ar, price')
            .eq('product_id', item_id)
            .eq('is_available', true)
            .order('display_order')

          const variantsList = variants?.map(v => `• ${v.name_ar}: ${v.price} ج.م (id: ${v.id})`).join('\n') || ''

          return {
            success: false,
            error: 'variant_required',
            message: `المنتج ده عنده أحجام مختلفة! اسأل العميل يختار:\n${variantsList}\n\nلازم تستخدم variant_id من القائمة دي.`
          }
        }

        // 2. Check provider status
        const { data: provider, error: providerError } = await supabase
          .from('providers')
          .select('id, name_ar, status')
          .eq('id', provider_id)
          .single()

        if (providerError || !provider) {
          return {
            success: false,
            error: 'التاجر غير موجود',
            message: 'مش لاقي المطعم ده'
          }
        }

        if (provider.status !== 'open') {
          const statusMessages: Record<string, string> = {
            closed: `للأسف ${provider.name_ar} مغلق دلوقتي 😕`,
            temporarily_paused: `${provider.name_ar} متوقف مؤقتاً، جرب بعدين`,
            on_vacation: `${provider.name_ar} في إجازة حالياً`
          }
          return {
            success: false,
            error: 'المطعم مغلق',
            message: statusMessages[provider.status] || 'المطعم مش متاح دلوقتي'
          }
        }

        // 3. Validate variant if specified - AND SMART CORRECTION
        let corrected_variant_id = variant_id
        let corrected_variant_price = price

        if (variant_id && item.has_variants) {
          const { data: variant, error: variantError } = await supabase
            .from('product_variants')
            .select('id, name_ar, is_available, price')
            .eq('id', variant_id)
            .single()

          if (variantError || !variant) {
            return {
              success: false,
              error: 'الحجم غير موجود',
              message: 'الحجم ده مش موجود، اختار حجم تاني'
            }
          }

          if (!variant.is_available) {
            return {
              success: false,
              error: 'الحجم غير متاح',
              message: 'الحجم ده مش متاح دلوقتي، اختار حجم تاني'
            }
          }

          // ═══════════════════════════════════════════════════════════════
          // SMART CORRECTION: If variant_name doesn't match variant_id, find correct one
          // This fixes AI mistakes where it confirms "عادي" but passes "سوبر" variant_id
          // ═══════════════════════════════════════════════════════════════
          if (variant_name && variant.name_ar !== variant_name) {
            console.log('[add_to_cart] Variant mismatch detected!', {
              requested_name: variant_name,
              actual_name: variant.name_ar,
              variant_id
            })

            // Find the correct variant by name
            const { data: correctVariant } = await supabase
              .from('product_variants')
              .select('id, name_ar, price, is_available')
              .eq('product_id', item_id)
              .eq('is_available', true)
              .ilike('name_ar', `%${variant_name}%`)
              .single()

            if (correctVariant) {
              console.log('[add_to_cart] Auto-corrected variant:', {
                from: { id: variant_id, name: variant.name_ar, price: variant.price },
                to: { id: correctVariant.id, name: correctVariant.name_ar, price: correctVariant.price }
              })
              corrected_variant_id = correctVariant.id
              corrected_variant_price = correctVariant.price
            } else {
              console.log('[add_to_cart] Could not find variant matching name:', variant_name)
            }
          } else {
            // Use the correct price from the variant (in case AI passed wrong price)
            corrected_variant_price = variant.price
          }
        }

        // 4. Check cart conflict (different provider)
        if (context.cartProviderId && context.cartProviderId !== provider_id) {
          return {
            success: false,
            error: 'cart_conflict',
            message: `السلة فيها منتجات من تاجر تاني. عايز تفضي السلة وتبدأ من ${provider.name_ar}؟`
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // All checks passed - Return cart action for frontend
        // ═══════════════════════════════════════════════════════════════

        return {
          success: true,
          data: {
            cart_action: {
              type: 'ADD_ITEM',
              provider_id,
              menu_item_id: item_id,
              menu_item_name_ar: item_name,
              quantity,
              unit_price: corrected_variant_price,  // Use corrected price
              variant_id: corrected_variant_id,      // Use corrected variant
              variant_name_ar: variant_name
            },
            message: `تم إضافة ${quantity}x ${item_name} للسلة`
          }
        }
      }

      case 'remove_from_cart': {
        const { item_name, quantity } = params as {
          item_name: string
          quantity?: number
        }

        // Return a cart action for the frontend to process
        return {
          success: true,
          data: {
            cart_action: {
              type: 'REMOVE_ITEM',
              provider_id: '',
              menu_item_id: '',
              menu_item_name_ar: item_name,
              quantity: quantity || 0, // 0 means remove all
              unit_price: 0
            },
            message: quantity
              ? `تم إزالة ${quantity}x ${item_name} من السلة`
              : `تم إزالة ${item_name} من السلة`
          }
        }
      }

      case 'update_cart_quantity': {
        const { item_name, new_quantity, change } = params as {
          item_name: string
          new_quantity?: number
          change?: number
        }

        // Determine the action type based on parameters
        if (new_quantity !== undefined && new_quantity <= 0) {
          // If new quantity is 0 or negative, remove the item
          return {
            success: true,
            data: {
              cart_action: {
                type: 'REMOVE_ITEM',
                provider_id: '',
                menu_item_id: '',
                menu_item_name_ar: item_name,
                quantity: 0,
                unit_price: 0
              },
              message: `تم إزالة ${item_name} من السلة`
            }
          }
        }

        return {
          success: true,
          data: {
            cart_action: {
              type: 'UPDATE_QUANTITY',
              provider_id: '',
              menu_item_id: '',
              menu_item_name_ar: item_name,
              quantity: new_quantity || 0,
              quantity_change: change || 0,
              unit_price: 0
            },
            message: new_quantity
              ? `تم تعديل كمية ${item_name} إلى ${new_quantity}`
              : change && change > 0
                ? `تم زيادة ${item_name} بـ ${change}`
                : `تم تقليل ${item_name} بـ ${Math.abs(change || 0)}`
          }
        }
      }

      case 'clear_cart': {
        return {
          success: true,
          data: {
            cart_action: {
              type: 'CLEAR_CART',
              provider_id: '',
              menu_item_id: '',
              menu_item_name_ar: '',
              quantity: 0,
              unit_price: 0
            },
            message: 'تم تفريغ السلة بالكامل'
          }
        }
      }

      case 'get_cart_summary': {
        // Return actual cart data from context
        const cartItems = context.cartItems || []
        const cartTotal = context.cartTotal || 0

        if (cartItems.length === 0) {
          return {
            success: true,
            data: {
              items: [],
              total: 0,
              count: 0,
              message: 'السلة فاضية'
            }
          }
        }

        return {
          success: true,
          data: {
            items: cartItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.quantity * item.price
            })),
            total: cartTotal,
            count: cartItems.length,
            provider_id: context.cartProviderId,
            message: `السلة فيها ${cartItems.length} صنف بإجمالي ${cartTotal} ج.م`
          }
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // 🏪 PROVIDER TOOLS
      // ─────────────────────────────────────────────────────────────────────
      case 'get_provider_info': {
        const { provider_id } = params as { provider_id: string }
        const { data, error } = await supabase
          .from('providers')
          .select(`
            id, name_ar, name_en, description_ar, logo_url, cover_image_url,
            phone, address_ar, status, rating, total_reviews, total_orders,
            min_order_amount, delivery_fee, estimated_delivery_time_min,
            business_hours, category
          `)
          .eq('id', provider_id)
          .single()

        if (error) throw error
        return { success: true, data }
      }

      case 'check_provider_open': {
        const { provider_id } = params as { provider_id: string }
        const { data, error } = await supabase
          .from('providers')
          .select('id, name_ar, status, business_hours')
          .eq('id', provider_id)
          .single()

        if (error) throw error

        // Check if currently open based on business hours
        const now = new Date()
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const currentDay = dayNames[now.getDay()]
        const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const businessHours = data?.business_hours as any
        const todayHours = businessHours?.[currentDay]

        let isOpen = data?.status === 'open'
        let message = ''

        if (data?.status === 'closed' || data?.status === 'temporarily_paused') {
          isOpen = false
          message = data?.status === 'temporarily_paused' ? 'التاجر متوقف مؤقتاً' : 'التاجر مغلق'
        } else if (data?.status === 'on_vacation') {
          isOpen = false
          message = 'التاجر في إجازة'
        } else if (todayHours && !todayHours.is_open) {
          isOpen = false
          message = 'التاجر مغلق اليوم'
        } else if (todayHours) {
          const openTime = todayHours.open
          const closeTime = todayHours.close
          isOpen = currentTime >= openTime && currentTime <= closeTime
          message = isOpen
            ? `مفتوح حتى ${closeTime}`
            : `مغلق - يفتح الساعة ${openTime}`
        }

        return {
          success: true,
          data: {
            provider: data,
            is_open: isOpen,
            message,
            current_time: currentTime
          }
        }
      }

      case 'get_delivery_info': {
        const { provider_id } = params as { provider_id?: string }
        const effectiveProviderId = getEffectiveProviderId({ provider_id }, context)

        if (!effectiveProviderId) {
          return {
            success: false,
            error: 'محتاج أعرف المطعم الأول'
          }
        }

        const { data, error } = await supabase
          .from('providers')
          .select('id, name_ar, delivery_fee, min_order_amount, estimated_delivery_time_min, delivery_radius_km')
          .eq('id', effectiveProviderId)
          .single()

        if (error) throw error
        return {
          success: true,
          data: {
            delivery_fee: data?.delivery_fee,
            min_order_amount: data?.min_order_amount,
            estimated_time: data?.estimated_delivery_time_min,
            delivery_radius_km: data?.delivery_radius_km,
            message: `رسوم التوصيل: ${data?.delivery_fee} ج.م | الحد الأدنى: ${data?.min_order_amount} ج.م | الوقت المتوقع: ${data?.estimated_delivery_time_min} دقيقة`
          }
        }
      }

      case 'search_providers': {
        const { city_id, category, search_query } = params as {
          city_id: string
          category?: string
          search_query?: string
        }

        let query = supabase
          .from('providers')
          .select('id, name_ar, logo_url, rating, total_reviews, delivery_fee, estimated_delivery_time_min, category, status')
          .eq('city_id', city_id)
          .in('status', ['open', 'closed', 'temporarily_paused'])
          .order('rating', { ascending: false })
          .limit(20)

        if (category) {
          query = query.eq('category', category)
        }

        if (search_query) {
          query = query.ilike('name_ar', `%${search_query}%`)
        }

        const { data, error } = await query
        if (error) throw error
        return { success: true, data }
      }

      case 'lookup_provider': {
        const { provider_name, city_id } = params as {
          provider_name: string
          city_id?: string
        }

        // Use context city_id as fallback
        const effectiveCityId = city_id || context.cityId

        // Normalize the search name for better matching
        const normalizedSearchName = normalizeArabic(provider_name.trim().toLowerCase())

        // Build query - search by name with fuzzy matching
        let query = supabase
          .from('providers')
          .select('id, name_ar, name_en, logo_url, rating, category, status, city_id')
          .in('status', ['open', 'closed', 'temporarily_paused'])

        // Add city filter if available
        if (effectiveCityId) {
          query = query.eq('city_id', effectiveCityId)
        }

        const { data: providers, error } = await query

        if (error) {
          console.error('[lookup_provider] Error:', error)
          return { success: false, error: error.message }
        }

        if (!providers || providers.length === 0) {
          return {
            success: false,
            message: `مش لاقي تاجر باسم "${provider_name}"`
          }
        }

        // Find best match using normalized comparison
        const matches = providers.filter(p => {
          const normalizedProviderName = normalizeArabic(p.name_ar?.toLowerCase() || '')
          return normalizedProviderName.includes(normalizedSearchName) ||
                 normalizedSearchName.includes(normalizedProviderName) ||
                 p.name_ar?.toLowerCase().includes(provider_name.toLowerCase()) ||
                 provider_name.toLowerCase().includes(p.name_ar?.toLowerCase() || '')
        })

        if (matches.length === 0) {
          // Try partial match
          const partialMatches = providers.filter(p => {
            const words = provider_name.split(/\s+/)
            return words.some(word =>
              normalizeArabic(p.name_ar?.toLowerCase() || '').includes(normalizeArabic(word.toLowerCase()))
            )
          })

          if (partialMatches.length === 1) {
            const provider = partialMatches[0]
            console.log('[lookup_provider] Found by partial match:', provider.name_ar, provider.id)
            return {
              success: true,
              data: {
                provider_id: provider.id,
                provider_name: provider.name_ar,
                category: provider.category,
                status: provider.status
              },
              // Return as discovered provider for context persistence
              discovered_provider_id: provider.id,
              discovered_provider_name: provider.name_ar,
              message: `لقيت "${provider.name_ar}"`
            }
          } else if (partialMatches.length > 1) {
            return {
              success: true,
              disambiguation_needed: true,
              providers: partialMatches.map(p => ({
                id: p.id,
                name_ar: p.name_ar,
                logo_url: p.logo_url,
                rating: p.rating,
                item_count: 0,
                status: p.status
              })),
              message: `لقيت ${partialMatches.length} تجار ممكن يكونوا اللي تقصدهم`
            }
          }

          return {
            success: false,
            message: `مش لاقي تاجر باسم "${provider_name}". ممكن تقولي الاسم تاني؟`
          }
        }

        // Return the best match (first one, or only one if exact)
        const provider = matches[0]
        console.log('[lookup_provider] Found:', provider.name_ar, provider.id)

        return {
          success: true,
          data: {
            provider_id: provider.id,
            provider_name: provider.name_ar,
            category: provider.category,
            status: provider.status
          },
          // Return as discovered provider for context persistence
          discovered_provider_id: provider.id,
          discovered_provider_name: provider.name_ar,
          message: matches.length === 1
            ? `لقيت "${provider.name_ar}"`
            : `لقيت "${provider.name_ar}" - لو مش ده تقصده قولي`
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // 🛒 ORDER TOOLS
      // ─────────────────────────────────────────────────────────────────────
      case 'get_order_status': {
        const { order_id } = params as { order_id: string }

        // Try to find by ID or order number
        let query = supabase
          .from('orders')
          .select(`
            id, order_number, status, total, delivery_fee, subtotal, discount,
            payment_method, payment_status, created_at, estimated_delivery_time,
            provider_id, providers(name_ar)
          `)

        // Check if it looks like a UUID or an order number
        if (order_id.startsWith('ENG-')) {
          query = query.eq('order_number', order_id)
        } else {
          query = query.eq('id', order_id)
        }

        const { data, error } = await query.single()
        if (error) throw error

        const statusMessages: Record<string, string> = {
          pending: 'في انتظار قبول التاجر',
          accepted: 'تم قبول الطلب',
          preparing: 'جاري التحضير',
          ready: 'الطلب جاهز',
          out_for_delivery: 'في الطريق إليك',
          delivered: 'تم التوصيل',
          cancelled: 'ملغي',
          rejected: 'مرفوض'
        }

        return {
          success: true,
          data: {
            ...data,
            status_message: statusMessages[data?.status] || data?.status
          }
        }
      }

      case 'get_order_history': {
        const { limit = 10, status } = params as { limit?: number; status?: string }

        if (!context.customerId) {
          return { success: false, error: 'يجب تسجيل الدخول لعرض الطلبات' }
        }

        let query = supabase
          .from('orders')
          .select(`
            id, order_number, status, total, created_at,
            providers(id, name_ar, logo_url)
          `)
          .eq('customer_id', context.customerId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query
        if (error) throw error
        return { success: true, data }
      }

      case 'track_order': {
        const { order_id } = params as { order_id: string }
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id, order_number, status, created_at,
            accepted_at, preparing_at, ready_at, out_for_delivery_at, delivered_at,
            estimated_delivery_time, actual_delivery_time,
            delivery_address, delivery_instructions,
            providers(name_ar, phone)
          `)
          .eq('id', order_id)
          .single()

        if (error) throw error

        // Build timeline
        const timeline = [
          { status: 'pending', label: 'تم استلام الطلب', time: data?.created_at },
          { status: 'accepted', label: 'تم قبول الطلب', time: data?.accepted_at },
          { status: 'preparing', label: 'جاري التحضير', time: data?.preparing_at },
          { status: 'ready', label: 'الطلب جاهز', time: data?.ready_at },
          { status: 'out_for_delivery', label: 'في الطريق إليك', time: data?.out_for_delivery_at },
          { status: 'delivered', label: 'تم التوصيل', time: data?.delivered_at }
        ].filter(step => step.time)

        return { success: true, data: { ...data, timeline } }
      }

      case 'cancel_order': {
        const { order_id, reason } = params as { order_id: string; reason?: string }

        if (!context.customerId) {
          return { success: false, error: 'يجب تسجيل الدخول لإلغاء الطلب' }
        }

        // First check if order can be cancelled
        const { data: order, error: fetchError } = await supabase
          .from('orders')
          .select('id, status, customer_id')
          .eq('id', order_id)
          .single()

        if (fetchError) throw fetchError

        if (order?.customer_id !== context.customerId) {
          return { success: false, error: 'لا يمكنك إلغاء طلب لا يخصك' }
        }

        if (order?.status !== 'pending') {
          return { success: false, error: 'لا يمكن إلغاء الطلب بعد قبوله من التاجر' }
        }

        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason || 'إلغاء من العميل',
            cancelled_by: 'customer'
          })
          .eq('id', order_id)

        if (updateError) throw updateError

        return { success: true, data: { message: 'تم إلغاء الطلب بنجاح' } }
      }

      // ─────────────────────────────────────────────────────────────────────
      // 👤 CUSTOMER TOOLS
      // ─────────────────────────────────────────────────────────────────────
      case 'get_customer_addresses': {
        if (!context.customerId) {
          return { success: false, error: 'يجب تسجيل الدخول لعرض العناوين' }
        }

        const { data, error } = await supabase
          .from('customer_addresses')
          .select(`
            id, label, address_line, building_number, floor_number, apartment_number,
            landmark, latitude, longitude, is_default,
            governorates(name_ar),
            cities(name_ar)
          `)
          .eq('user_id', context.customerId)
          .order('is_default', { ascending: false })

        if (error) throw error
        return { success: true, data }
      }

      case 'get_favorites': {
        if (!context.customerId) {
          return { success: false, error: 'يجب تسجيل الدخول لعرض المفضلة' }
        }

        const { data, error } = await supabase
          .from('favorites')
          .select(`
            id, created_at,
            providers(id, name_ar, logo_url, rating, total_reviews, category, status)
          `)
          .eq('user_id', context.customerId)
          .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
      }

      // ─────────────────────────────────────────────────────────────────────
      // 🎁 PROMOTIONS TOOLS
      // ─────────────────────────────────────────────────────────────────────
      case 'get_provider_promotions': {
        const { provider_id } = params as { provider_id?: string }
        const effectiveProviderId = getEffectiveProviderId({ provider_id }, context)

        const now = new Date().toISOString()

        // ═══════════════════════════════════════════════════════════════════
        // 1. Get PROMO CODES (admin-issued discount codes)
        // Fetch codes that are either global OR applicable to this provider
        // ═══════════════════════════════════════════════════════════════════
        const { data: promoCodes } = await supabase
          .from('promo_codes')
          .select('id, code, description_ar, discount_type, discount_value, min_order_amount, max_discount_amount, first_order_only, applicable_providers')
          .eq('is_active', true)
          .lte('valid_from', now)
          .gte('valid_until', now)

        // Filter promo codes: global (no providers specified) OR includes this provider
        const applicablePromoCodes = promoCodes?.filter(code => {
          if (!code.applicable_providers || code.applicable_providers.length === 0) {
            return true // Global code
          }
          return effectiveProviderId && code.applicable_providers.includes(effectiveProviderId)
        }).map(code => ({
          code: code.code,
          description: code.description_ar,
          discount_type: code.discount_type,
          discount_value: code.discount_value,
          min_order: code.min_order_amount,
          max_discount: code.max_discount_amount,
          first_order_only: code.first_order_only
        })) || []

        // ═══════════════════════════════════════════════════════════════════
        // 2. Get PROVIDER PROMOTIONS (campaigns from the provider)
        // If provider_id exists: get from that provider
        // If no provider_id: get from ALL providers (show what's available!)
        // ═══════════════════════════════════════════════════════════════════
        let promotions: Array<{
          id: string
          name_ar: string
          name_en: string
          type: string
          discount_value: number
          min_order_amount: number | null
          max_discount: number | null
          provider_name?: string
        }> = []

        // Build promotions query - with or without provider filter
        let promotionsQuery = supabase
          .from('promotions')
          .select('id, name_ar, name_en, type, discount_value, min_order_amount, max_discount, start_date, end_date, provider_id, providers(name_ar)')
          .eq('is_active', true)
          .limit(effectiveProviderId ? 10 : 5)

        if (effectiveProviderId) {
          promotionsQuery = promotionsQuery.eq('provider_id', effectiveProviderId)
        }

        const { data: promotionsData } = await promotionsQuery

        // Filter by dates manually to handle NULL values
        promotions = (promotionsData || []).filter(promo => {
          // If start_date is set, check it's not in the future
          if (promo.start_date && promo.start_date > now) {
            return false
          }
          // If end_date is set, check it hasn't passed
          if (promo.end_date && promo.end_date < now) {
            return false
          }
          return true
        }).map(promo => {
          // Extract provider name
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const providers = promo.providers as any
          const providerName = providers?.name_ar || (Array.isArray(providers) ? providers[0]?.name_ar : undefined)

          return {
            id: promo.id,
            name_ar: promo.name_ar,
            name_en: promo.name_en,
            type: promo.type,
            discount_value: promo.discount_value,
            min_order_amount: promo.min_order_amount,
            max_discount: promo.max_discount,
            provider_name: providerName
          }
        })

        // ═══════════════════════════════════════════════════════════════════
        // 3. Get DISCOUNTED PRODUCTS (original_price > price)
        // If provider_id exists: get from that provider only
        // If no provider_id: get from ALL providers (global discounts)
        // ═══════════════════════════════════════════════════════════════════
        let productsWithDiscount: Array<{
          id: string
          name_ar: string
          price: number
          original_price: number
          discount_percentage: number
          provider_name?: string
        }> = []

        // Build query for discounted products
        let discountQuery = supabase
          .from('menu_items')
          .select('id, name_ar, price, original_price, image_url, has_variants, provider_id, providers(name_ar)')
          .eq('is_available', true)
          .not('original_price', 'is', null)
          .gt('original_price', 0)
          .order('original_price', { ascending: false })
          .limit(effectiveProviderId ? 10 : 5) // Limit to 5 if global search

        // Filter by provider if specified
        if (effectiveProviderId) {
          discountQuery = discountQuery.eq('provider_id', effectiveProviderId)
        }

        const { data: discountedProducts } = await discountQuery

        productsWithDiscount = discountedProducts?.filter(p =>
          p.original_price && p.price && p.original_price > p.price
        ).map(p => {
          // Extract provider name - handle both object and array types from Supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const providers = p.providers as any
          const providerName = providers?.name_ar || (Array.isArray(providers) ? providers[0]?.name_ar : undefined)

          return {
            id: p.id,
            name_ar: p.name_ar,
            price: p.price,
            original_price: p.original_price!,
            discount_percentage: Math.round(((p.original_price! - p.price) / p.original_price!) * 100),
            provider_name: providerName
          }
        }) || []

        // ═══════════════════════════════════════════════════════════════════
        // 4. Build response with all three sources
        // ═══════════════════════════════════════════════════════════════════
        const hasPromoCodes = applicablePromoCodes.length > 0
        const hasPromotions = promotions.length > 0
        const hasDiscountedProducts = productsWithDiscount.length > 0

        if (!hasPromoCodes && !hasPromotions && !hasDiscountedProducts) {
          return {
            success: true,
            data: { promo_codes: [], promotions: [], discounted_products: [] },
            message: 'مفيش عروض متاحة حالياً 😕'
          }
        }

        // Build message
        const messageParts: string[] = []
        if (hasPromoCodes) {
          messageParts.push(`🎟️ ${applicablePromoCodes.length} كود خصم متاح`)
        }
        if (hasPromotions) {
          messageParts.push(`🎁 ${promotions.length} عرض من التاجر`)
        }
        if (hasDiscountedProducts) {
          messageParts.push(`💰 ${productsWithDiscount.length} منتج عليه خصم`)
        }

        return {
          success: true,
          data: {
            promo_codes: applicablePromoCodes,
            promotions: promotions,
            discounted_products: productsWithDiscount
          },
          message: `لقيتلك عروض! ${messageParts.join(' • ')}`
        }
      }

      case 'validate_promo_code': {
        const { code, provider_id, order_total } = params as {
          code: string
          provider_id?: string
          order_total?: number
        }

        const now = new Date().toISOString()

        const { data: promo, error } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', code.toUpperCase())
          .eq('is_active', true)
          .lte('valid_from', now)
          .gte('valid_until', now)
          .single()

        if (error || !promo) {
          return { success: false, error: 'كود الخصم غير صالح أو منتهي الصلاحية' }
        }

        // Check usage limit
        if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
          return { success: false, error: 'تم استنفاد عدد مرات استخدام هذا الكود' }
        }

        // Check minimum order amount
        if (promo.min_order_amount && order_total && order_total < promo.min_order_amount) {
          return { success: false, error: `الحد الأدنى للطلب ${promo.min_order_amount} ج.م` }
        }

        // Check if provider-specific
        if (promo.applicable_providers?.length > 0 && provider_id) {
          if (!promo.applicable_providers.includes(provider_id)) {
            return { success: false, error: 'هذا الكود غير صالح لهذا التاجر' }
          }
        }

        // Check first order only
        if (promo.first_order_only && context.customerId) {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', context.customerId)
            .eq('status', 'delivered')

          if (count && count > 0) {
            return { success: false, error: 'هذا الكود للطلب الأول فقط' }
          }
        }

        // Calculate discount
        let discount = 0
        if (promo.discount_type === 'percentage') {
          discount = order_total ? (order_total * promo.discount_value / 100) : 0
          if (promo.max_discount_amount && discount > promo.max_discount_amount) {
            discount = promo.max_discount_amount
          }
        } else {
          discount = promo.discount_value
        }

        return {
          success: true,
          data: {
            valid: true,
            promo,
            discount,
            message: `تم تطبيق الخصم: ${discount} ج.م`
          }
        }
      }

      // ─────────────────────────────────────────────────────────────────────
      // ⭐ REVIEWS TOOLS
      // ─────────────────────────────────────────────────────────────────────
      case 'get_provider_reviews': {
        const { provider_id, limit = 5 } = params as { provider_id: string; limit?: number }
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            id, rating, comment, created_at, provider_response, provider_response_at,
            profiles(full_name)
          `)
          .eq('provider_id', provider_id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) throw error
        return { success: true, data }
      }

      // ─────────────────────────────────────────────────────────────────────
      // 🎫 SUPPORT TOOLS
      // ─────────────────────────────────────────────────────────────────────
      case 'create_support_ticket': {
        const { type, subject, description, order_id } = params as {
          type: string
          subject: string
          description: string
          order_id?: string
        }

        if (!context.customerId) {
          return { success: false, error: 'يجب تسجيل الدخول لإنشاء تذكرة دعم' }
        }

        const { data, error } = await supabase
          .from('support_tickets')
          .insert({
            user_id: context.customerId,
            type,
            subject,
            description,
            order_id,
            source: 'customer_app',
            status: 'open',
            priority: 'medium'
          })
          .select('id, ticket_number')
          .single()

        if (error) throw error
        return {
          success: true,
          data: {
            ...data,
            message: `تم إنشاء تذكرة الدعم رقم ${data?.ticket_number}. سيتواصل معك فريق الدعم قريباً.`
          }
        }
      }

      case 'escalate_to_human': {
        const { reason } = params as { reason: string }

        // In a real implementation, this would:
        // 1. Create a support ticket
        // 2. Notify support team via real-time
        // 3. Transfer the chat to a human agent

        return {
          success: true,
          data: {
            escalated: true,
            message: 'جاري تحويلك لموظف خدمة العملاء. سيتواصل معك في أقرب وقت.',
            reason
          }
        }
      }

      default:
        return { success: false, error: 'مش عارف أعمل الحاجة دي' }
    }
  } catch (error) {
    console.error(`[Agent Tool Error] ${toolName}:`, error)
    // Never expose raw error messages to the AI - use friendly messages instead
    // This prevents the AI from saying "حصل خطأ تقني" to users
    return {
      success: true, // Mark as success but with empty data so AI doesn't say "error"
      data: null,
      message: 'مش لاقي نتائج دلوقتي'
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format tool result for AI response
 */
export function formatToolResultForAI(toolName: string, result: ToolResult): string {
  if (!result.success) {
    return `خطأ في ${toolName}: ${result.error}`
  }
  return JSON.stringify(result.data, null, 2)
}

/**
 * Get tools available for a specific context
 */
export function getAvailableTools(context: ToolContext): ToolDefinition[] {
  // All tools are available, but some require authentication
  const authRequiredTools = [
    'get_customer_addresses',
    'get_favorites',
    'get_order_history',
    'cancel_order',
    'create_support_ticket'
  ]

  if (!context.customerId) {
    return AGENT_TOOLS.filter(tool => !authRequiredTools.includes(tool.name))
  }

  return AGENT_TOOLS
}

// =============================================================================
// CUSTOMER INSIGHTS FUNCTIONS
// =============================================================================

/**
 * Customer Insights Interface
 */
export interface CustomerInsights {
  preferences: {
    spicy?: boolean
    vegetarian?: boolean
    preferred_cuisines?: string[]
    delivery_notes?: string[]
    favorite_items?: string[]
    dietary_restrictions?: string[]
  }
  conversation_style: {
    customer_type?: 'decisive' | 'indecisive' | 'deal_seeker' | 'detail_oriented'
    communication_preference?: 'brief' | 'detailed'
    language_style?: 'franco_arab' | 'arabic' | 'mixed'
  }
  insights_count: number
  last_updated: string
}

/**
 * Load customer insights from database
 */
export async function loadCustomerInsights(customerId: string): Promise<CustomerInsights | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_insights')
    .select('preferences, conversation_style, insights_count, last_updated')
    .eq('user_id', customerId)
    .single()

  if (error || !data) {
    console.log('[loadCustomerInsights] No insights found for customer:', customerId)
    return null
  }

  return {
    preferences: data.preferences || {},
    conversation_style: data.conversation_style || {},
    insights_count: data.insights_count || 0,
    last_updated: data.last_updated
  }
}

/**
 * Save or update customer insights
 */
export async function saveCustomerInsights(
  customerId: string,
  insights: Partial<CustomerInsights>
): Promise<boolean> {
  const supabase = await createClient()

  // First, try to get existing insights
  const { data: existing } = await supabase
    .from('user_insights')
    .select('id, preferences, conversation_style, insights_count')
    .eq('user_id', customerId)
    .single()

  if (existing) {
    // Merge with existing insights
    const mergedPreferences = {
      ...existing.preferences,
      ...insights.preferences
    }
    const mergedConversationStyle = {
      ...existing.conversation_style,
      ...insights.conversation_style
    }

    const { error } = await supabase
      .from('user_insights')
      .update({
        preferences: mergedPreferences,
        conversation_style: mergedConversationStyle,
        insights_count: (existing.insights_count || 0) + 1,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', customerId)

    if (error) {
      console.error('[saveCustomerInsights] Update error:', error)
      return false
    }
  } else {
    // Create new insights record
    const { error } = await supabase
      .from('user_insights')
      .insert({
        user_id: customerId,
        preferences: insights.preferences || {},
        conversation_style: insights.conversation_style || {},
        insights_count: 1,
        last_updated: new Date().toISOString()
      })

    if (error) {
      console.error('[saveCustomerInsights] Insert error:', error)
      return false
    }
  }

  console.log('[saveCustomerInsights] Saved insights for customer:', customerId)
  return true
}

/**
 * Analyze conversation to extract customer insights
 * This is called after each conversation to learn from the interaction
 */
export function analyzeConversationForInsights(
  messages: Array<{ role: string; content: string }>,
  toolResults: Array<{ toolName: string; result: ToolResult }>
): Partial<CustomerInsights> {
  const insights: Partial<CustomerInsights> = {
    preferences: {},
    conversation_style: {}
  }

  // Analyze messages for customer type
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase())
  const allUserText = userMessages.join(' ')

  // Detect customer type based on behavior
  const changeCount = userMessages.filter(m =>
    m.includes('غير') || m.includes('بدل') || m.includes('مش عايز')
  ).length

  const questionCount = userMessages.filter(m =>
    m.includes('؟') || m.includes('ايه') || m.includes('كام')
  ).length

  const dealKeywords = ['عرض', 'خصم', 'أرخص', 'توفير']
  const dealMentions = dealKeywords.filter(k => allUserText.includes(k)).length

  if (changeCount >= 2) {
    insights.conversation_style!.customer_type = 'indecisive'
  } else if (dealMentions >= 2) {
    insights.conversation_style!.customer_type = 'deal_seeker'
  } else if (questionCount >= 3) {
    insights.conversation_style!.customer_type = 'detail_oriented'
  } else {
    insights.conversation_style!.customer_type = 'decisive'
  }

  // Detect communication preference
  const avgMessageLength = userMessages.length > 0
    ? userMessages.reduce((acc, m) => acc + m.length, 0) / userMessages.length
    : 0

  if (avgMessageLength < 20) {
    insights.conversation_style!.communication_preference = 'brief'
  } else {
    insights.conversation_style!.communication_preference = 'detailed'
  }

  // Detect Franco-Arab usage
  const francoArabPattern = /[a-zA-Z].*[2357689]|[2357689].*[a-zA-Z]/
  const usesFrancoArab = userMessages.some(m => francoArabPattern.test(m))
  if (usesFrancoArab) {
    insights.conversation_style!.language_style = 'franco_arab'
  } else if (userMessages.some(m => /[a-zA-Z]/.test(m))) {
    insights.conversation_style!.language_style = 'mixed'
  } else {
    insights.conversation_style!.language_style = 'arabic'
  }

  // Detect food preferences from search queries and orders
  const spicyKeywords = ['حراق', 'شطة', 'حار', 'spicy']
  const vegetarianKeywords = ['خضار', 'نباتي', 'سلطة', 'vegetarian']

  if (spicyKeywords.some(k => allUserText.includes(k))) {
    insights.preferences!.spicy = true
  }
  if (vegetarianKeywords.some(k => allUserText.includes(k))) {
    insights.preferences!.vegetarian = true
  }

  // Extract favorite items from cart actions
  const addedItems = toolResults
    .filter(t => t.toolName === 'add_to_cart' && t.result.success)
    .map(t => {
      const data = t.result.data as { cart_action?: { menu_item_name_ar?: string } }
      return data?.cart_action?.menu_item_name_ar
    })
    .filter(Boolean) as string[]

  if (addedItems.length > 0) {
    insights.preferences!.favorite_items = addedItems
  }

  return insights
}
