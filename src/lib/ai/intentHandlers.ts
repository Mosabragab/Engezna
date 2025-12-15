/**
 * Intent Handlers
 * Each handler processes a specific user intent
 * Clean separation of concerns - no regex patterns!
 */

import { createClient } from '@/lib/supabase/server'
import { normalizeArabic, filterByNormalizedArabic } from './normalizeArabic'
import {
  getCartEmptyMessage,
  getCartClearedMessage,
  getCancelResponse,
  randomChoice,
} from './responsePersonality'

// Types
export interface CartItemInfo {
  name_ar: string
  quantity: number
  unit_price: number
  variant_name_ar?: string
}

export interface IntentContext {
  city_id?: string
  selected_provider_id?: string
  cart_provider_id?: string
  cart_provider_name?: string
  cart_items?: CartItemInfo[]
  memory?: Record<string, unknown>
}

export interface IntentResult {
  reply: string
  quick_replies: Array<{ title: string; payload: string }>
  cart_action?: {
    type: 'ADD_ITEM' | 'CLEAR_AND_ADD' | 'CLEAR_CART' | 'REMOVE_ITEM'
    provider_id: string
    menu_item_id: string
    menu_item_name_ar: string
    quantity: number
    unit_price: number
    variant_id?: string
    variant_name_ar?: string
  }
  selected_provider_id?: string | null
  selected_category?: string | null
  memory?: Record<string, unknown>
}

/**
 * Handle cart inquiry intent
 * "ايه في السلة"، "عندي ايه"، "السلة فيها ايه"
 */
export function handleCartInquiry(context: IntentContext): IntentResult {
  const { cart_items, cart_provider_id, selected_provider_id, memory } = context

  if (!cart_items || cart_items.length === 0) {
    return {
      reply: getCartEmptyMessage(),
      quick_replies: [
        { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
        { title: '🛒 سوبر ماركت', payload: 'category:grocery' },
        { title: '🏠 الأقسام', payload: 'categories' },
      ],
      selected_provider_id,
      memory,
    }
  }

  let cartSummary = '🛒 **السلة الحالية:**\n\n'
  let total = 0

  for (const item of cart_items) {
    const variantText = item.variant_name_ar ? ` (${item.variant_name_ar})` : ''
    const itemTotal = item.quantity * item.unit_price
    total += itemTotal
    cartSummary += `• ${item.quantity}x ${item.name_ar}${variantText} - ${itemTotal} ج.م\n`
  }

  cartSummary += `\n💰 **الإجمالي: ${total} ج.م**`

  return {
    reply: cartSummary,
    quick_replies: [
      { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
      { title: '➕ أضف صنف آخر', payload: cart_provider_id ? `add_more:${cart_provider_id}` : 'categories' },
      { title: '🗑️ امسح السلة', payload: 'clear_cart' },
    ],
    selected_provider_id,
    memory,
  }
}

/**
 * Handle clear cart intent
 * "امسح السلة"، "فضي الكارت"، "الغي الطلب كله"
 */
export function handleClearCart(context: IntentContext): IntentResult {
  return {
    reply: getCartClearedMessage(),
    quick_replies: [
      { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
      { title: '🛒 سوبر ماركت', payload: 'category:supermarket' },
      { title: '🏠 الأقسام', payload: 'categories' },
    ],
    cart_action: {
      type: 'CLEAR_CART',
      provider_id: '',
      menu_item_id: '',
      menu_item_name_ar: '',
      quantity: 0,
      unit_price: 0,
    },
    selected_provider_id: null,
    selected_category: null,
    memory: {
      pending_item: undefined,
      pending_variant: undefined,
      pending_quantity: undefined,
      awaiting_quantity: false,
      awaiting_confirmation: false,
      current_provider: undefined,
    },
  }
}

/**
 * Handle remove item intent
 * "امسح البيتزا"، "شيل الكولا"، "الغي البرجر من السلة"
 * "شيل واحدة بس"، "نقص 2 بيتزا" - supports partial removal with quantity
 */
export function handleRemoveItem(
  productName: string | undefined,
  context: IntentContext,
  quantityToRemove?: number  // undefined = remove all, number = remove specific quantity
): IntentResult {
  const { cart_items, cart_provider_id, selected_provider_id, memory } = context

  if (!cart_items || cart_items.length === 0) {
    return {
      reply: 'السلة فاضية أصلاً! 🛒 تحب تطلب حاجة؟',
      quick_replies: [
        { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
        { title: '🛒 سوبر ماركت', payload: 'category:supermarket' },
      ],
      selected_provider_id,
      memory,
    }
  }

  if (!productName) {
    // Ask which item to remove
    const cartItemsList = cart_items.map(item => `• ${item.name_ar}`).join('\n')
    return {
      reply: `أنهي صنف تحب امسحه من السلة؟ 🤔\n\n${cartItemsList}`,
      quick_replies: cart_items.slice(0, 3).map(item => ({
        title: `🗑️ ${item.name_ar}`,
        payload: `remove_item:${item.name_ar}`,
      })),
      selected_provider_id,
      memory,
    }
  }

  // Find the item in cart using fuzzy matching
  const normalizedSearch = normalizeArabic(productName)
  const matchedItem = cart_items.find(item => {
    const normalizedName = normalizeArabic(item.name_ar)
    return normalizedName.includes(normalizedSearch) ||
           normalizedSearch.includes(normalizedName) ||
           // Also match if the search term is contained in the item name
           item.name_ar.includes(productName)
  })

  if (matchedItem) {
    // Determine if partial or complete removal
    const currentQty = matchedItem.quantity
    const removeAll = !quantityToRemove || quantityToRemove >= currentQty
    const actualRemoveQty = removeAll ? currentQty : quantityToRemove

    // Build appropriate response message
    let replyMessage: string
    if (removeAll) {
      replyMessage = `تمام! ✅ شلت ${matchedItem.name_ar} من السلة.\n\nتحب تكمل طلبك ولا تضيف حاجة تانية؟`
    } else {
      const remaining = currentQty - actualRemoveQty
      replyMessage = `تمام! ✅ شلت ${actualRemoveQty} من ${matchedItem.name_ar} (فاضل ${remaining} في السلة).\n\nتحب تكمل طلبك ولا تضيف حاجة تانية؟`
    }

    return {
      reply: replyMessage,
      quick_replies: [
        { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
        { title: '➕ أضف صنف آخر', payload: cart_provider_id ? `add_more:${cart_provider_id}` : 'categories' },
      ],
      cart_action: {
        type: 'REMOVE_ITEM',
        provider_id: cart_provider_id || '',
        menu_item_id: '',
        menu_item_name_ar: matchedItem.name_ar,
        quantity: actualRemoveQty, // How many to remove (0 or >= current = remove all)
        unit_price: 0,
      },
      selected_provider_id,
      memory,
    }
  }

  // Item not found in cart
  return {
    reply: `مش لاقي "${productName}" في السلة 🤔\n\nتحب تشوف اللي في السلة؟`,
    quick_replies: [
      { title: '🛒 شوف السلة', payload: 'cart_inquiry' },
      { title: '🗑️ امسح كل السلة', payload: 'clear_cart' },
    ],
    selected_provider_id,
    memory,
  }
}

/**
 * Handle cancel intent
 * "لا مش عايز"، "الغي"، "رجعني"
 */
export function handleCancel(context: IntentContext): IntentResult {
  const { cart_items, cart_provider_id, selected_provider_id, memory } = context

  const hasCartItems = cart_items && cart_items.length > 0
  const hasSelectedItem = memory?.selected_item_id
  const hasSelectedVariant = memory?.selected_variant_id
  const hasSelectedProvider = memory?.current_provider || selected_provider_id

  let reply = ''
  let quick_replies: Array<{ title: string; payload: string }> = []
  const updatedMemory = { ...memory }
  let keepProviderId = selected_provider_id

  if (hasSelectedVariant) {
    reply = getCancelResponse('variant')
    updatedMemory.selected_variant_id = undefined
    quick_replies = [
      { title: '↩️ اختار حجم تاني', payload: `item:${hasSelectedItem}` },
      { title: '📋 شوف المنيو', payload: hasSelectedProvider ? `provider:${typeof hasSelectedProvider === 'object' ? (hasSelectedProvider as {id: string}).id : hasSelectedProvider}` : 'categories' },
    ]
  } else if (hasSelectedItem) {
    reply = getCancelResponse('item')
    updatedMemory.selected_item_id = undefined
    quick_replies = [
      { title: '📋 شوف المنيو', payload: hasSelectedProvider ? `provider:${typeof hasSelectedProvider === 'object' ? (hasSelectedProvider as {id: string}).id : hasSelectedProvider}` : 'categories' },
    ]
  } else if (hasSelectedProvider) {
    if (hasCartItems) {
      reply = getCancelResponse('provider_with_cart')
      quick_replies = [
        { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
        { title: '➕ أضف صنف آخر', payload: cart_provider_id ? `add_more:${cart_provider_id}` : 'categories' },
      ]
      keepProviderId = cart_provider_id || (typeof hasSelectedProvider === 'object' ? (hasSelectedProvider as {id: string}).id : hasSelectedProvider as string)
    } else {
      reply = getCancelResponse('provider')
      updatedMemory.current_provider = undefined
      keepProviderId = undefined
      quick_replies = [
        { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
        { title: '🛒 سوبر ماركت', payload: 'category:supermarket' },
      ]
    }
  } else {
    if (hasCartItems) {
      reply = getCancelResponse('nothing_with_cart')
      quick_replies = [
        { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
        { title: '➕ أضف صنف آخر', payload: cart_provider_id ? `add_more:${cart_provider_id}` : 'categories' },
      ]
      keepProviderId = cart_provider_id
    } else {
      reply = getCancelResponse('nothing')
      quick_replies = [
        { title: '🏠 الأقسام', payload: 'categories' },
        { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
      ]
    }
  }

  return {
    reply,
    quick_replies,
    selected_provider_id: keepProviderId,
    memory: updatedMemory,
  }
}

/**
 * Handle delivery info intent
 * "بكام التوصيل"، "الدليفري كام"، "في توصيل"
 */
export async function handleDeliveryInfo(context: IntentContext): Promise<IntentResult> {
  const { cart_provider_id, selected_provider_id, cart_provider_name, memory } = context

  // Check all possible provider contexts - cart_provider_id is most reliable
  const providerId = cart_provider_id || selected_provider_id || (memory?.current_provider as { id: string } | undefined)?.id

  console.log('🚚 [DELIVERY_INFO] providerId:', providerId, 'cart_provider_id:', cart_provider_id, 'selected_provider_id:', selected_provider_id)

  if (providerId) {
    try {
      const supabase = await createClient()

      const { data: provider, error } = await supabase
        .from('providers')
        .select('name_ar, delivery_fee, min_order_amount, estimated_delivery_time_min')
        .eq('id', providerId)
        .single()

      if (error) {
        console.error('🚚 [DELIVERY_INFO] Supabase error:', error)
      }

      if (provider) {
        let deliveryInfo = `🚚 **معلومات التوصيل من ${provider.name_ar}:**\n\n`

        if (provider.delivery_fee === 0 || provider.delivery_fee === null) {
          deliveryInfo += '✅ التوصيل مجاني!\n'
        } else {
          deliveryInfo += `💰 رسوم التوصيل: ${provider.delivery_fee} ج.م\n`
        }

        if (provider.min_order_amount) {
          deliveryInfo += `📦 الحد الأدنى للطلب: ${provider.min_order_amount} ج.م\n`
        }

        if (provider.estimated_delivery_time_min) {
          deliveryInfo += `⏱️ وقت التوصيل المتوقع: ${provider.estimated_delivery_time_min} دقيقة\n`
        }

        return {
          reply: deliveryInfo,
          quick_replies: [
            { title: '📋 شوف المنيو', payload: `provider:${providerId}` },
            { title: '🛒 السلة', payload: 'cart_inquiry' },
          ],
          selected_provider_id: providerId,
          memory,
        }
      }

      // Provider ID exists but not found in database - use cart_provider_name if available
      if (cart_provider_name) {
        return {
          reply: `🚚 للأسف مش لاقي تفاصيل التوصيل لـ ${cart_provider_name} دلوقتي.\n\nتحب تكمل طلبك أو تشوف السلة؟`,
          quick_replies: [
            { title: '🛒 السلة', payload: 'cart_inquiry' },
            { title: '🏠 الأقسام', payload: 'categories' },
          ],
          selected_provider_id: providerId,
          memory,
        }
      }
    } catch (err) {
      console.error('🚚 [DELIVERY_INFO] Error fetching provider:', err)
    }
  }

  // No provider context
  return {
    reply: '🚚 رسوم التوصيل بتختلف من مكان للتاني.\n\nاختار مطعم أو متجر وهقولك تفاصيل التوصيل بتاعه 👇',
    quick_replies: [
      { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
      { title: '🛒 سوبر ماركت', payload: 'category:supermarket' },
    ],
    selected_provider_id,
    memory,
  }
}

/**
 * Handle greeting intent
 * "مرحبا"، "ازيك"، "صباح الخير"
 */
export function handleGreeting(context: IntentContext): IntentResult {
  const hour = new Date().getHours()
  let greeting = 'أهلاً وسهلاً! 👋'

  if (hour >= 5 && hour < 12) {
    greeting = 'صباح الخير! ☀️'
  } else if (hour >= 12 && hour < 17) {
    greeting = 'مساء الخير! 🌤️'
  } else {
    greeting = 'مساء النور! 🌙'
  }

  return {
    reply: `${greeting}\n\nأنا مساعد إنجزنا، معاك عشان أساعدك تطلب أكلك المفضل.\n\nعايز تطلب منين النهارده؟`,
    quick_replies: [
      { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
      { title: '🛒 سوبر ماركت', payload: 'category:grocery' },
      { title: '🔥 العروض', payload: 'show_promotions' },
    ],
    selected_provider_id: context.selected_provider_id,
    memory: context.memory,
  }
}

/**
 * Handle thanks intent
 * "شكرا"، "تسلم"، "الله يعطيك العافية"
 */
export function handleThanks(context: IntentContext): IntentResult {
  const responses = [
    'العفو! 😊 في خدمتك دايماً',
    'تسلم! 🙏 لو محتاج أي حاجة تانية أنا هنا',
    'الشكر لله! 😄 يلا نكمل؟',
  ]

  return {
    reply: randomChoice(responses),
    quick_replies: [
      { title: '🛒 السلة', payload: 'cart_inquiry' },
      { title: '🏠 الأقسام', payload: 'categories' },
    ],
    selected_provider_id: context.selected_provider_id,
    memory: context.memory,
  }
}

/**
 * Handle confirm intent
 * "اه"، "تمام"، "اكيد"، "موافق"
 */
export function handleConfirm(context: IntentContext): IntentResult | null {
  const { memory } = context

  // If awaiting confirmation for adding to cart
  if (memory?.awaiting_confirmation && memory?.pending_item) {
    // Return null to let the main handler process the confirmation
    return null
  }

  // Generic confirmation without context
  return {
    reply: 'تمام! 👍 تحب تعمل إيه دلوقتي؟',
    quick_replies: [
      { title: '🛒 السلة', payload: 'cart_inquiry' },
      { title: '🏠 الأقسام', payload: 'categories' },
    ],
    selected_provider_id: context.selected_provider_id,
    memory,
  }
}

/**
 * Handle go to cart intent
 * "روح للسلة"، "خلص الطلب"، "ادفع"
 */
export function handleGoToCart(context: IntentContext): IntentResult {
  const { cart_items, cart_provider_id } = context

  if (!cart_items || cart_items.length === 0) {
    return {
      reply: getCartEmptyMessage(),
      quick_replies: [
        { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
        { title: '🛒 سوبر ماركت', payload: 'category:supermarket' },
      ],
      selected_provider_id: context.selected_provider_id,
      memory: context.memory,
    }
  }

  // Build order summary
  let summary = '📋 **ملخص طلبك:**\n\n'
  let subtotal = 0

  for (const item of cart_items) {
    const variantText = item.variant_name_ar ? ` (${item.variant_name_ar})` : ''
    const itemTotal = item.quantity * item.unit_price
    subtotal += itemTotal
    summary += `• ${item.quantity}x ${item.name_ar}${variantText} - ${itemTotal} ج.م\n`
  }

  summary += `\n💵 **المجموع: ${subtotal} ج.م**`
  summary += '\n\n✅ جاهز تكمل الطلب؟'

  return {
    reply: summary,
    quick_replies: [
      { title: '✅ تأكيد الطلب', payload: `navigate:/ar/checkout` },
      { title: '➕ أضف صنف آخر', payload: cart_provider_id ? `add_more:${cart_provider_id}` : 'categories' },
      { title: '🗑️ امسح السلة', payload: 'clear_cart' },
    ],
    selected_provider_id: context.selected_provider_id,
    memory: context.memory,
  }
}
