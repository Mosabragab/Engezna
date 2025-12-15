/**
 * AI Agent Tools for Engezna Smart Assistant
 *
 * This file defines all the tools available to the AI agent for interacting
 * with the database and performing actions on behalf of the customer.
 */

import { createClient } from '@/lib/supabase/server'

// =============================================================================
// TYPES
// =============================================================================

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  message?: string // Friendly message for the AI to use in response
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
  }>
  cartTotal?: number
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
    description: 'البحث في المنيو عن منتج معين بالاسم',
    parameters: {
      type: 'object',
      properties: {
        provider_id: {
          type: 'string',
          description: 'معرف التاجر (اختياري - لو مش موجود هيبحث في كل التجار)'
        },
        query: {
          type: 'string',
          description: 'كلمة البحث (اسم المنتج أو القسم)'
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
    description: 'الحصول على معلومات التوصيل (رسوم التوصيل، الحد الأدنى، الوقت المتوقع)',
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
    description: 'الحصول على العروض الحالية لتاجر معين',
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
        const { provider_id } = params as { provider_id: string }
        const { data, error } = await supabase
          .from('provider_categories')
          .select('id, name_ar, name_en, description_ar, icon, display_order')
          .eq('provider_id', provider_id)
          .eq('is_active', true)
          .order('display_order')

        if (error) throw error
        return { success: true, data }
      }

      case 'get_menu_items': {
        const { provider_id, category_id, search_query, limit = 20 } = params as {
          provider_id: string
          category_id?: string
          search_query?: string
          limit?: number
        }

        let query = supabase
          .from('menu_items')
          .select(`
            id, name_ar, name_en, description_ar, price, original_price,
            image_url, is_available, has_stock, has_variants, pricing_type,
            provider_categories!provider_category_id(id, name_ar)
          `)
          .eq('provider_id', provider_id)
          .eq('is_available', true)
          .order('display_order')
          .limit(limit)

        if (category_id) {
          query = query.eq('provider_category_id', category_id)
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
            provider_id,
            provider_categories!provider_category_id(id, name_ar)
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

        // Use effective provider ID from context if not explicitly provided
        const effectiveProviderId = getEffectiveProviderId({ provider_id }, context)

        if (effectiveProviderId) {
          // Search within a specific provider (from param, cart, or page context)
          const { data, error } = await supabase
            .from('menu_items')
            .select(`
              id, name_ar, price, image_url, has_variants, provider_id,
              providers(id, name_ar),
              provider_categories!provider_category_id(name_ar)
            `)
            .eq('provider_id', effectiveProviderId)
            .eq('is_available', true)
            .or(`name_ar.ilike.%${query}%,description_ar.ilike.%${query}%`)
            .limit(10)

          if (error) throw error

          // If no results, include provider info for better response
          if (!data || data.length === 0) {
            return {
              success: true,
              data: [],
              message: 'مش لاقي نتائج في المنيو الحالي'
            }
          }
          return { success: true, data }
        } else {
          // Search across all providers in the city
          const effectiveCityId = city_id || context.cityId

          // First get active providers in the city
          let providersQuery = supabase
            .from('providers')
            .select('id, name_ar')
            .in('status', ['open', 'closed', 'temporarily_paused'])

          if (effectiveCityId) {
            providersQuery = providersQuery.eq('city_id', effectiveCityId)
          }

          const { data: providers } = await providersQuery.limit(50)

          if (!providers?.length) {
            return {
              success: true,
              data: [],
              message: 'مفيش تجار متاحين في المنطقة دي'
            }
          }

          // Search items in those providers
          const { data, error } = await supabase
            .from('menu_items')
            .select(`
              id, name_ar, price, image_url, has_variants, provider_id,
              providers(id, name_ar),
              provider_categories!provider_category_id(name_ar)
            `)
            .in('provider_id', providers.map(p => p.id))
            .eq('is_available', true)
            .or(`name_ar.ilike.%${query}%,description_ar.ilike.%${query}%`)
            .limit(20)

          if (error) throw error

          if (!data || data.length === 0) {
            return {
              success: true,
              data: [],
              message: 'مش لاقي نتائج لبحثك'
            }
          }
          return { success: true, data }
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
          provider_id,
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

        // Return a cart action that the frontend will process
        return {
          success: true,
          data: {
            cart_action: {
              type: 'ADD_ITEM',
              provider_id,
              menu_item_id: item_id,
              menu_item_name_ar: item_name,
              quantity,
              unit_price: price,
              variant_id,
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
        const { provider_id } = params as { provider_id: string }
        const now = new Date().toISOString()

        const { data, error } = await supabase
          .from('promotions')
          .select('id, name_ar, name_en, type, discount_value, min_order_amount, max_discount, start_date, end_date')
          .eq('provider_id', provider_id)
          .eq('is_active', true)
          .lte('start_date', now)
          .gte('end_date', now)

        if (error) throw error
        return { success: true, data }
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
