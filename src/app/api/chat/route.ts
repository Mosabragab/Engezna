/**
 * AI Chat API Route - New Implementation
 * Uses GPT-4o-mini with Function Calling + Streaming
 * With Zapier-style Intent Router for tool forcing
 * + Direct Payload Handlers for item/variant/provider buttons
 */

import { OpenAI } from 'openai'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT, CATEGORY_MAPPING } from '@/lib/ai/systemPrompt'
import { tools } from '@/lib/ai/tools'
import { normalizeArabic, filterByNormalizedArabic, logNormalization } from '@/lib/ai/normalizeArabic'
import {
  getTimeBasedGreeting,
  getProviderSelectedMessage,
  getItemFoundMessage,
  getItemNotFoundMessage,
  getQuantityAskMessage,
  getVariantAskMessage,
  getAddedToCartMessage,
  getCartEmptyMessage,
  getCartClearedMessage,
  getCancelResponse,
  getRecommendationHeader,
  getConfirmationHeader,
  randomChoice,
  getUpsellSuggestions,
  UPSELL_SUGGESTIONS,
} from '@/lib/ai/responsePersonality'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'

// Types
interface PendingItem {
  id: string
  name_ar: string
  price: number
  provider_id: string
  provider_name_ar?: string
  has_variants?: boolean
}

interface PendingVariant {
  id: string
  name_ar: string
  price: number
}

// Current provider context - persists after cart addition
interface CurrentProvider {
  id: string
  name_ar: string
}

interface ChatMemory {
  pending_item?: PendingItem | null
  pending_variant?: PendingVariant | null
  pending_quantity?: number | null
  awaiting_quantity?: boolean
  awaiting_confirmation?: boolean
  current_provider?: CurrentProvider | null // Persists after cart addition for follow-up orders
  [key: string]: unknown
}

// Cart item for inquiry
interface CartItemInfo {
  name_ar: string
  quantity: number
  unit_price: number
  variant_name_ar?: string
}

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  customer_id?: string
  city_id: string
  selected_provider_id?: string
  selected_provider_category?: string
  selected_category?: string // User's chosen category (restaurant_cafe, grocery, etc.)
  memory?: ChatMemory
  cart_provider_id?: string // Provider ID of items currently in cart (for conflict detection)
  cart_provider_name?: string // Provider name for user-friendly messages
  cart_items?: CartItemInfo[] // Cart contents for inquiry
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(id: unknown): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id)
}

// =============================================================================
// ARABIC QUANTITY PARSER - Converts Arabic words/numbers to integers
// =============================================================================

const ARABIC_NUMBER_WORDS: Record<string, number> = {
  // Arabic words
  'واحد': 1, 'واحده': 1, 'واحدة': 1,
  'اتنين': 2, 'اثنين': 2, 'اتنان': 2,
  'تلاته': 3, 'ثلاثه': 3, 'ثلاثة': 3, 'تلاتة': 3,
  'اربعه': 4, 'أربعه': 4, 'أربعة': 4, 'اربعة': 4,
  'خمسه': 5, 'خمسة': 5,
  'سته': 6, 'ستة': 6, 'ستّة': 6,
  'سبعه': 7, 'سبعة': 7,
  'تمنيه': 8, 'ثمانية': 8, 'تمانية': 8,
  'تسعه': 9, 'تسعة': 9,
  'عشره': 10, 'عشرة': 10,
  // Common phrases
  'كام': 0, // Question, not a quantity
  'عاديه': 1, 'عادي': 1, 'عادية': 1, // "normal" = 1
  'كتير': 5, // "many" = 5 as default
}

/**
 * Parse Arabic quantity from user message
 * Returns 0 if not a valid quantity
 */
function parseArabicQuantity(message: string): number {
  const trimmed = message.trim().toLowerCase()

  // Check for Arabic word numbers
  if (ARABIC_NUMBER_WORDS[trimmed] !== undefined) {
    return ARABIC_NUMBER_WORDS[trimmed]
  }

  // Check for numeric digits (Arabic or English)
  const arabicNumerals = trimmed
    .replace(/[٠]/g, '0')
    .replace(/[١]/g, '1')
    .replace(/[٢]/g, '2')
    .replace(/[٣]/g, '3')
    .replace(/[٤]/g, '4')
    .replace(/[٥]/g, '5')
    .replace(/[٦]/g, '6')
    .replace(/[٧]/g, '7')
    .replace(/[٨]/g, '8')
    .replace(/[٩]/g, '9')

  const numericMatch = arabicNumerals.match(/^(\d+)$/)
  if (numericMatch) {
    const num = parseInt(numericMatch[1], 10)
    if (num > 0 && num <= 99) {
      return num
    }
  }

  return 0
}

/**
 * Extract quantity and product name from search queries like "عايز 2 بيتزا" or "عايز اتنين بيتزا"
 * Returns { quantity: number, product: string }
 */
function extractQuantityFromSearch(searchText: string): { quantity: number; product: string } {
  const trimmed = searchText.trim()

  // Pattern 1: Number at the start "2 بيتزا" or "٢ بيتزا"
  const numericStartMatch = trimmed.match(/^(\d+|[٠-٩]+)\s+(.+)$/)
  if (numericStartMatch) {
    const arabicNumerals = numericStartMatch[1]
      .replace(/[٠]/g, '0')
      .replace(/[١]/g, '1')
      .replace(/[٢]/g, '2')
      .replace(/[٣]/g, '3')
      .replace(/[٤]/g, '4')
      .replace(/[٥]/g, '5')
      .replace(/[٦]/g, '6')
      .replace(/[٧]/g, '7')
      .replace(/[٨]/g, '8')
      .replace(/[٩]/g, '9')
    const qty = parseInt(arabicNumerals, 10)
    if (qty > 0 && qty <= 99) {
      return { quantity: qty, product: numericStartMatch[2].trim() }
    }
  }

  // Pattern 2: Arabic word number at the start "اتنين بيتزا"
  const words = trimmed.split(/\s+/)
  if (words.length >= 2) {
    const firstWord = words[0]
    const qty = ARABIC_NUMBER_WORDS[firstWord]
    if (qty && qty > 0) {
      return { quantity: qty, product: words.slice(1).join(' ') }
    }
  }

  // Pattern 3: Number after product "بيتزا 2" or "بيتزا اتنين"
  const numericEndMatch = trimmed.match(/^(.+?)\s+(\d+|[٠-٩]+)$/)
  if (numericEndMatch) {
    const arabicNumerals = numericEndMatch[2]
      .replace(/[٠]/g, '0')
      .replace(/[١]/g, '1')
      .replace(/[٢]/g, '2')
      .replace(/[٣]/g, '3')
      .replace(/[٤]/g, '4')
      .replace(/[٥]/g, '5')
      .replace(/[٦]/g, '6')
      .replace(/[٧]/g, '7')
      .replace(/[٨]/g, '8')
      .replace(/[٩]/g, '9')
    const qty = parseInt(arabicNumerals, 10)
    if (qty > 0 && qty <= 99) {
      return { quantity: qty, product: numericEndMatch[1].trim() }
    }
  }

  // Pattern 4: Arabic word at end "بيتزا اتنين"
  if (words.length >= 2) {
    const lastWord = words[words.length - 1]
    const qty = ARABIC_NUMBER_WORDS[lastWord]
    if (qty && qty > 0) {
      return { quantity: qty, product: words.slice(0, -1).join(' ') }
    }
  }

  // No quantity found, return default
  return { quantity: 1, product: trimmed }
}

// =============================================================================
// DIRECT PAYLOAD HANDLERS - Handle button clicks without GPT
// =============================================================================

interface PayloadHandlerResult {
  reply: string
  quick_replies: QuickReply[]
  cart_action?: CartAction
  selected_provider_id?: string | null // null explicitly clears the provider
  selected_category?: string | null
  memory?: ChatMemory
}

/**
 * Handle category:xxx payload
 */
async function handleCategoryPayload(
  categoryCode: string,
  cityId: string
): Promise<PayloadHandlerResult> {
  const supabase = await createClient()

  console.log('📦 [PAYLOAD] category:', categoryCode)

  // Get providers in this category
  const mappedCategories = CATEGORY_MAPPING[categoryCode] || [categoryCode]

  const { data: providers } = await supabase
    .from('providers')
    .select('id, name_ar, rating, logo_url, category')
    .eq('city_id', cityId)
    .eq('status', 'open')
    .neq('name_ar', '')
    .in('category', mappedCategories)
    .order('is_featured', { ascending: false })
    .order('rating', { ascending: false })
    .limit(10)

  if (!providers || providers.length === 0) {
    return {
      reply: 'مش لاقي متاجر في القسم ده دلوقتي 😕 جرب قسم تاني',
      quick_replies: [
        { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
        { title: '🛒 سوبر ماركت', payload: 'category:grocery' },
      ],
      selected_category: categoryCode,
      selected_provider_id: null, // null (not undefined) so JSON includes it
      // Clear provider context when browsing categories
      memory: {
        pending_item: null,
        pending_variant: null,
        current_provider: null,
      },
    }
  }

  const categoryNames: Record<string, string> = {
    'restaurant_cafe': 'المطاعم والكافيهات',
    'grocery': 'السوبر ماركت',
    'coffee_patisserie': 'البن والحلويات',
    'vegetables_fruits': 'الخضروات والفواكه',
  }

  return {
    reply: `هنا المتاجر المتاحة في ${categoryNames[categoryCode] || 'القسم ده'} 👇`,
    quick_replies: providers.map(p => ({
      title: `📍 ${p.name_ar}`,
      payload: `provider:${p.id}`,
    })),
    selected_category: categoryCode,
    selected_provider_id: null, // null (not undefined) so JSON includes it
    // IMPORTANT: Clear provider context when browsing categories
    memory: {
      pending_item: null,
      pending_variant: null,
      current_provider: null,
    },
  }
}

/**
 * Handle provider:xxx payload
 */
async function handleProviderPayload(
  providerId: string,
  cityId: string
): Promise<PayloadHandlerResult> {
  const supabase = await createClient()

  console.log('📦 [PAYLOAD] provider:', providerId)

  // Get provider info
  const { data: provider } = await supabase
    .from('providers')
    .select('id, name_ar, rating, category')
    .eq('id', providerId)
    .single()

  if (!provider) {
    return {
      reply: 'مش لاقي المتجر ده 😕 جرب تاني',
      quick_replies: [
        { title: '🏠 الأقسام', payload: 'categories' },
      ],
    }
  }

  // Get provider's own menu categories
  const { data: providerCategories } = await supabase
    .from('provider_categories')
    .select('id, name_ar, icon')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .order('display_order')
    .limit(8)

  // Get category emoji based on provider category
  const categoryEmoji = provider.category === 'restaurant_cafe' ? '🍽️' :
    provider.category === 'grocery' ? '🛒' :
    provider.category === 'coffee_patisserie' ? '☕' : '📍'

  // Build quick replies
  const quickReplies: QuickReply[] = [
    { title: '📋 شوف المنيو', payload: `navigate:/ar/providers/${providerId}` },
  ]

  // Add provider's own categories if available
  if (providerCategories && providerCategories.length > 0) {
    providerCategories.slice(0, 6).forEach(cat => {
      quickReplies.push({
        title: `${cat.icon || '📂'} ${cat.name_ar}`,
        payload: `provider_category:${cat.id}`,
      })
    })
  }

  // Conversational approach: Ask what they want instead of showing full menu
  // Use personality-driven response
  return {
    reply: getProviderSelectedMessage(provider.name_ar, provider.rating),
    quick_replies: quickReplies,
    selected_provider_id: providerId,
    memory: {
      current_provider: {
        id: providerId,
        name_ar: provider.name_ar,
      },
    },
  }
}

/**
 * Handle item:xxx payload
 * Now checks for active promotions and applies discounts
 */
async function handleItemPayload(
  itemId: string,
  selectedProviderId?: string
): Promise<PayloadHandlerResult> {
  const supabase = await createClient()

  console.log('📦 [PAYLOAD] item:', itemId)

  // Get item details
  const { data: item } = await supabase
    .from('menu_items')
    .select('id, name_ar, price, original_price, has_variants, pricing_type, provider_id, providers(name_ar)')
    .eq('id', itemId)
    .single()

  if (!item) {
    return {
      reply: 'مش لاقي الصنف ده 😕 جرب تاني',
      quick_replies: [
        { title: '🏠 الأقسام', payload: 'categories' },
      ],
    }
  }

  // providers is returned as array from join, get first element
  const providersData = item.providers as { name_ar: string }[] | { name_ar: string } | null
  const providerName = Array.isArray(providersData)
    ? providersData[0]?.name_ar || ''
    : providersData?.name_ar || ''

  // Check for active promotions on this item
  let appliedDiscount: { type: string; value: number; name?: string } | null = null
  let discountedPrice = item.price

  // 1. Check promotions table for this item
  const { data: promotions } = await supabase
    .from('promotions')
    .select('id, name_ar, type, discount_value, product_ids, applies_to')
    .eq('provider_id', item.provider_id)
    .eq('is_active', true)
    .lte('start_date', new Date().toISOString())
    .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
    .limit(10)

  // Find promotion that applies to this item
  for (const promo of promotions || []) {
    const productIds = promo.product_ids as string[] | null
    if (promo.applies_to === 'specific' && productIds && productIds.includes(itemId)) {
      if (promo.type === 'percentage' && promo.discount_value) {
        discountedPrice = Math.round(item.price * (1 - promo.discount_value / 100))
        appliedDiscount = { type: 'percentage', value: promo.discount_value, name: promo.name_ar }
      } else if (promo.type === 'fixed' && promo.discount_value) {
        discountedPrice = Math.max(0, item.price - promo.discount_value)
        appliedDiscount = { type: 'fixed', value: promo.discount_value, name: promo.name_ar }
      }
      break
    } else if (promo.applies_to === 'all' || promo.applies_to === 'category') {
      // Promotion applies to all items from this provider
      if (promo.type === 'percentage' && promo.discount_value) {
        discountedPrice = Math.round(item.price * (1 - promo.discount_value / 100))
        appliedDiscount = { type: 'percentage', value: promo.discount_value, name: promo.name_ar }
      } else if (promo.type === 'fixed' && promo.discount_value) {
        discountedPrice = Math.max(0, item.price - promo.discount_value)
        appliedDiscount = { type: 'fixed', value: promo.discount_value, name: promo.name_ar }
      }
      break
    }
  }

  // 2. Check for product-level discount (original_price > price)
  if (!appliedDiscount && item.original_price && item.original_price > item.price) {
    const discountPercent = Math.round(((item.original_price - item.price) / item.original_price) * 100)
    appliedDiscount = { type: 'percentage', value: discountPercent }
    discountedPrice = item.price // Price is already discounted
  }

  // Build discount text for display
  let discountText = ''
  if (appliedDiscount) {
    if (appliedDiscount.type === 'percentage') {
      discountText = ` 🏷️ خصم ${appliedDiscount.value}%`
    } else if (appliedDiscount.type === 'fixed') {
      discountText = ` 🏷️ خصم ${appliedDiscount.value} ج.م`
    }
  }

  console.log('💰 [ITEM] price:', item.price, 'discountedPrice:', discountedPrice, 'appliedDiscount:', appliedDiscount)

  // Check if item has variants
  if (item.has_variants || item.pricing_type === 'variants') {
    // Get variants
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, name_ar, price, is_default')
      .eq('product_id', itemId)
      .eq('is_available', true)
      .order('is_default', { ascending: false })
      .order('price', { ascending: true })
      .limit(10)

    if (variants && variants.length > 0) {
      // Apply discount to variant prices
      const variantsWithDiscount = variants.map(v => {
        let variantDiscountedPrice = v.price
        if (appliedDiscount) {
          if (appliedDiscount.type === 'percentage') {
            variantDiscountedPrice = Math.round(v.price * (1 - appliedDiscount.value / 100))
          } else if (appliedDiscount.type === 'fixed') {
            variantDiscountedPrice = Math.max(0, v.price - appliedDiscount.value)
          }
        }
        return { ...v, discountedPrice: variantDiscountedPrice }
      })

      return {
        reply: `${item.name_ar} له اختيارات مختلفة${discountText} 👇`,
        quick_replies: variantsWithDiscount.map(v => ({
          title: appliedDiscount
            ? `${v.name_ar} (${v.discountedPrice} ج.م بدل ${v.price})`
            : `${v.name_ar} (${v.price} ج.م)`,
          payload: `variant:${v.id}`,
        })),
        selected_provider_id: item.provider_id,
        memory: {
          pending_item: {
            id: item.id,
            name_ar: item.name_ar,
            price: discountedPrice, // Use discounted price
            provider_id: item.provider_id,
            provider_name_ar: providerName,
            has_variants: true,
          },
          // Store discount info for later use
          applied_discount: appliedDiscount,
        },
      }
    }
  }

  // No variants - ask for quantity directly
  const priceDisplay = appliedDiscount
    ? `${discountedPrice} ج.م${discountText} (بدل ${item.price} ج.م)`
    : `${item.price} ج.م`

  return {
    reply: `${item.name_ar} بـ ${priceDisplay} 🍽️\n\nكام واحدة تحب؟`,
    quick_replies: [
      { title: '1️⃣ واحدة', payload: 'qty:1' },
      { title: '2️⃣ اتنين', payload: 'qty:2' },
      { title: '3️⃣ تلاتة', payload: 'qty:3' },
    ],
    selected_provider_id: item.provider_id,
    memory: {
      pending_item: {
        id: item.id,
        name_ar: item.name_ar,
        price: discountedPrice, // Use discounted price
        provider_id: item.provider_id,
        provider_name_ar: providerName,
        has_variants: false,
      },
      awaiting_quantity: true,
      applied_discount: appliedDiscount,
    },
  }
}

/**
 * Handle variant:xxx payload
 */
async function handleVariantPayload(
  variantId: string,
  existingMemory?: ChatMemory
): Promise<PayloadHandlerResult> {
  const supabase = await createClient()

  console.log('📦 [PAYLOAD] variant:', variantId)

  // Get variant details with product info
  const { data: variant } = await supabase
    .from('product_variants')
    .select('id, name_ar, price, product_id')
    .eq('id', variantId)
    .single()

  if (!variant) {
    return {
      reply: 'مش لاقي الاختيار ده 😕 جرب تاني',
      quick_replies: [
        { title: '🏠 الأقسام', payload: 'categories' },
      ],
    }
  }

  // Get parent product info if not in memory
  let pendingItem = existingMemory?.pending_item
  if (!pendingItem) {
    const { data: product } = await supabase
      .from('menu_items')
      .select('id, name_ar, price, provider_id, providers(name_ar)')
      .eq('id', variant.product_id)
      .single()

    if (product) {
      // providers is returned as array from join, get first element
      const providersData = product.providers as { name_ar: string }[] | { name_ar: string } | null
      const providerName = Array.isArray(providersData)
        ? providersData[0]?.name_ar || ''
        : providersData?.name_ar || ''

      pendingItem = {
        id: product.id,
        name_ar: product.name_ar,
        price: product.price,
        provider_id: product.provider_id,
        provider_name_ar: providerName,
        has_variants: true,
      }
    }
  }

  // Apply discount from memory if exists
  const appliedDiscount = existingMemory?.applied_discount as { type: string; value: number } | null
  let discountedVariantPrice = variant.price

  if (appliedDiscount) {
    if (appliedDiscount.type === 'percentage') {
      discountedVariantPrice = Math.round(variant.price * (1 - appliedDiscount.value / 100))
    } else if (appliedDiscount.type === 'fixed') {
      discountedVariantPrice = Math.max(0, variant.price - appliedDiscount.value)
    }
  }

  const priceDisplay = appliedDiscount
    ? `${discountedVariantPrice} ج.م (بدل ${variant.price}) 🏷️`
    : `${variant.price} ج.م`

  return {
    reply: `${pendingItem?.name_ar || 'الصنف'} - ${variant.name_ar} بـ ${priceDisplay} 🍽️\n\nكام واحدة تحب؟`,
    quick_replies: [
      { title: '1️⃣ واحدة', payload: 'qty:1' },
      { title: '2️⃣ اتنين', payload: 'qty:2' },
      { title: '3️⃣ تلاتة', payload: 'qty:3' },
    ],
    selected_provider_id: pendingItem?.provider_id,
    memory: {
      pending_item: pendingItem,
      pending_variant: {
        id: variant.id,
        name_ar: variant.name_ar,
        price: discountedVariantPrice, // Use discounted price
      },
      awaiting_quantity: true,
      applied_discount: appliedDiscount, // Pass through
    },
  }
}

/**
 * Handle qty:x payload or quantity input when awaiting_quantity is true
 * NOW: Shows confirmation instead of directly adding to cart
 */
function handleQuantityInput(
  quantity: number,
  memory: ChatMemory,
  cartProviderId?: string,
  cartProviderName?: string
): PayloadHandlerResult | null {
  const { pending_item, pending_variant } = memory

  if (!pending_item) {
    return null
  }

  console.log('📦 [PAYLOAD] quantity:', quantity, 'for item:', pending_item.name_ar, 'cart_provider:', cartProviderId)

  const finalPrice = pending_variant?.price || pending_item.price
  const variantText = pending_variant ? ` - ${pending_variant.name_ar}` : ''
  const totalPrice = quantity * finalPrice
  const providerName = pending_item.provider_name_ar || 'المتجر'

  // Check for cart provider conflict
  if (cartProviderId && cartProviderId !== pending_item.provider_id) {
    // Cart has items from different provider - show conflict warning
    const existingProviderName = cartProviderName || 'متجر آخر'
    return {
      reply: `⚠️ السلة فيها منتجات من ${existingProviderName}\n\nمينفعش تضيف منتجات من ${providerName} لنفس الطلب.\n\nتحب تفضي السلة وتبدأ طلب جديد من ${providerName}؟`,
      quick_replies: [
        { title: '🗑️ فضي السلة وأضف', payload: 'clear_cart_and_add' },
        { title: `🔙 ارجع لـ ${existingProviderName}`, payload: `provider:${cartProviderId}` },
        { title: '🏠 الأقسام', payload: 'categories' },
      ],
      selected_provider_id: pending_item.provider_id,
      memory: {
        // Keep pending items for potential clear_cart_and_add action
        pending_item,
        pending_variant,
        pending_quantity: quantity,
        awaiting_quantity: false,
        awaiting_confirmation: false,
        awaiting_cart_clear: true, // New state for cart clearing
      },
    }
  }

  // No conflict - show normal confirmation
  return {
    reply: `📋 تأكيد الطلب:\n\n${quantity}x ${pending_item.name_ar}${variantText}\n💰 الإجمالي: ${totalPrice} ج.م\n\nتأكيد الإضافة للسلة؟`,
    quick_replies: [
      { title: '✅ تأكيد وإضافة', payload: 'confirm_add' },
      { title: '🔄 تغيير الكمية', payload: `item:${pending_item.id}` },
      { title: '🔙 رجوع للمنيو', payload: `provider:${pending_item.provider_id}` },
    ],
    selected_provider_id: pending_item.provider_id,
    memory: {
      // Keep pending items and store quantity for confirmation
      pending_item,
      pending_variant,
      pending_quantity: quantity,
      awaiting_quantity: false,
      awaiting_confirmation: true,
    },
  }
}

/**
 * Handle confirm_add payload - Actually add item to cart after user confirmation
 */
function handleConfirmAdd(memory: ChatMemory): PayloadHandlerResult | null {
  const { pending_item, pending_variant, pending_quantity } = memory

  if (!pending_item || !pending_quantity) {
    return null
  }

  console.log('✅ [CONFIRM] Adding to cart:', pending_quantity, 'x', pending_item.name_ar, 'from', pending_item.provider_name_ar)

  const finalPrice = pending_variant?.price || pending_item.price
  const variantText = pending_variant ? ` - ${pending_variant.name_ar}` : ''
  const totalPrice = pending_quantity * finalPrice
  const providerName = pending_item.provider_name_ar || 'المتجر'

  const cart_action: CartAction = {
    type: 'ADD_ITEM',
    provider_id: pending_item.provider_id,
    menu_item_id: pending_item.id,
    menu_item_name_ar: pending_item.name_ar,
    quantity: pending_quantity,
    unit_price: finalPrice,
    variant_id: pending_variant?.id,
    variant_name_ar: pending_variant?.name_ar,
  }

  // Use personality-driven response with smart upselling
  const baseReply = getAddedToCartMessage(pending_quantity, `${pending_item.name_ar}${variantText}`, totalPrice, providerName)

  // Smart upselling based on item name (Phase 2)
  const itemNameLower = pending_item.name_ar.toLowerCase()
  let upsellCategory = 'default'
  if (itemNameLower.includes('بيتزا') || itemNameLower.includes('pizza')) upsellCategory = 'pizza'
  else if (itemNameLower.includes('برجر') || itemNameLower.includes('burger')) upsellCategory = 'burger'
  else if (itemNameLower.includes('فراخ') || itemNameLower.includes('دجاج')) upsellCategory = 'chicken'
  else if (itemNameLower.includes('باستا') || itemNameLower.includes('مكرونة')) upsellCategory = 'pasta'
  else if (itemNameLower.includes('قهوة') || itemNameLower.includes('coffee')) upsellCategory = 'coffee'

  const upsellItems = getUpsellSuggestions(upsellCategory)
  const upsellMessage = randomChoice(UPSELL_SUGGESTIONS)(upsellItems)

  return {
    reply: `${baseReply}\n\n${upsellMessage}`,
    quick_replies: [
      { title: `🥤 ${upsellItems[0]}`, payload: `search:${upsellItems[0]}` },
      { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
      { title: '➕ أضف صنف آخر', payload: `add_more:${pending_item.provider_id}` },
    ],
    cart_action,
    selected_provider_id: pending_item.provider_id,
    memory: {
      // Clear pending items but PRESERVE current_provider for follow-up orders
      pending_item: undefined,
      pending_variant: undefined,
      pending_quantity: undefined,
      awaiting_quantity: false,
      awaiting_confirmation: false,
      // Keep track of the provider for follow-up "كمان" requests
      current_provider: {
        id: pending_item.provider_id,
        name_ar: providerName,
      },
    },
  }
}

/**
 * Handle clear_cart_and_add payload - Clear cart and add pending item
 * Used when user confirms they want to switch providers
 */
function handleClearCartAndAdd(memory: ChatMemory): PayloadHandlerResult | null {
  const { pending_item, pending_variant, pending_quantity } = memory

  if (!pending_item || !pending_quantity) {
    return null
  }

  console.log('🗑️ [CLEAR_CART] Clearing cart and adding:', pending_quantity, 'x', pending_item.name_ar)

  const finalPrice = pending_variant?.price || pending_item.price
  const variantText = pending_variant ? ` - ${pending_variant.name_ar}` : ''
  const totalPrice = pending_quantity * finalPrice
  const providerName = pending_item.provider_name_ar || 'المتجر'

  const cart_action: CartAction = {
    type: 'CLEAR_AND_ADD', // Frontend will clear cart first, then add
    provider_id: pending_item.provider_id,
    menu_item_id: pending_item.id,
    menu_item_name_ar: pending_item.name_ar,
    quantity: pending_quantity,
    unit_price: finalPrice,
    variant_id: pending_variant?.id,
    variant_name_ar: pending_variant?.name_ar,
  }

  return {
    reply: `تمام! ✅ فضيت السلة وضفت ${pending_quantity}x ${pending_item.name_ar}${variantText} من ${providerName} (${totalPrice} ج.م)\n\nتحب تضيف حاجة تانية من ${providerName}؟`,
    quick_replies: [
      { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
      { title: '➕ أضف صنف آخر', payload: `add_more:${pending_item.provider_id}` },
      { title: '📋 شوف المنيو', payload: `navigate:/ar/providers/${pending_item.provider_id}` },
    ],
    cart_action,
    selected_provider_id: pending_item.provider_id,
    memory: {
      pending_item: undefined,
      pending_variant: undefined,
      pending_quantity: undefined,
      awaiting_quantity: false,
      awaiting_confirmation: false,
      awaiting_cart_clear: false,
      current_provider: {
        id: pending_item.provider_id,
        name_ar: providerName,
      },
    },
  }
}

// =============================================================================
// DIRECT SEARCH HELPER - Unified search logic for all search patterns
// =============================================================================

interface DirectSearchResult {
  reply: string
  quick_replies: QuickReply[]
  selected_provider_id?: string
  selected_category?: string
  memory?: ChatMemory
}

/**
 * Perform direct search without GPT - used by all search pattern handlers
 * Returns item buttons (not provider buttons) for found items
 */
async function performDirectSearch(
  searchQuery: string,
  cityId: string,
  selectedProviderId?: string,
  memory?: ChatMemory
): Promise<DirectSearchResult> {
  const supabase = await createClient()

  // If we have a selected provider, search in it
  if (selectedProviderId && isValidUUID(selectedProviderId)) {
    // ALWAYS use normalization-based search for better Arabic matching
    // This handles ه/ة, أ/ا, etc. variations that ilike cannot
    const normalizedQuery = normalizeArabic(searchQuery)
    logNormalization('performDirectSearch (provider)', searchQuery, normalizedQuery)

    // Fetch all available items and filter with normalization
    const { data: allItems } = await supabase
      .from('menu_items')
      .select('id, name_ar, price, has_variants')
      .eq('provider_id', selectedProviderId)
      .eq('is_available', true)
      .or('has_stock.eq.true,has_stock.is.null')
      .limit(100)

    // Apply Arabic normalization filter (handles سلطه↔سلطة, كفته↔كفتة, etc.)
    let filteredItems = filterByNormalizedArabic(allItems || [], searchQuery, (item) => [item.name_ar])

    // If normalization didn't find anything, try exact ilike as fallback
    if (filteredItems.length === 0) {
      const { data: exactItems } = await supabase
        .from('menu_items')
        .select('id, name_ar, price, has_variants')
        .eq('provider_id', selectedProviderId)
        .eq('is_available', true)
        .or('has_stock.eq.true,has_stock.is.null')
        .ilike('name_ar', `%${searchQuery}%`)
        .limit(10)

      filteredItems = exactItems || []
    }

    // Get provider name
    const { data: provider } = await supabase
      .from('providers')
      .select('name_ar')
      .eq('id', selectedProviderId)
      .single()

    if (filteredItems.length > 0) {
      return {
        reply: `أيوه موجود ${searchQuery} عند ${provider?.name_ar || 'المطعم'} 👇`,
        quick_replies: filteredItems.slice(0, 8).map(item => ({
          title: `${item.name_ar} (${item.price} ج.م)`,
          payload: `item:${item.id}`,
        })),
        selected_provider_id: selectedProviderId,
        memory,
      }
    } else {
      return {
        reply: `مش لاقي ${searchQuery} في ${provider?.name_ar || 'المتجر ده'}. تحب تدور على حاجة تانية؟`,
        quick_replies: [
          { title: '➕ دور على صنف تاني', payload: `add_more:${selectedProviderId}` },
          { title: '🔍 ابحث في مكان تاني', payload: 'search_elsewhere' },
        ],
        selected_provider_id: selectedProviderId,
        memory,
      }
    }
  } else {
    // No provider selected - search city-wide
    // ALWAYS use normalization-based search for better Arabic matching
    const normalizedQuery = normalizeArabic(searchQuery)
    logNormalization('performDirectSearch (city-wide)', searchQuery, normalizedQuery)

    const { data: providers } = await supabase
      .from('providers')
      .select('id')
      .eq('city_id', cityId)
      .eq('status', 'open')

    if (providers && providers.length > 0) {
      const providerIds = providers.map(p => p.id)

      // Fetch more items for normalization filtering
      const { data: allItems } = await supabase
        .from('menu_items')
        .select('id, name_ar, price, provider_id, providers(name_ar)')
        .in('provider_id', providerIds)
        .eq('is_available', true)
        .or('has_stock.eq.true,has_stock.is.null')
        .limit(200)

      // Apply Arabic normalization filter (handles سلطه↔سلطة, كفته↔كفتة, etc.)
      let filteredItems = filterByNormalizedArabic(allItems || [], searchQuery, (item) => [item.name_ar])

      // If normalization didn't find enough, try exact ilike as fallback
      if (filteredItems.length === 0) {
        const { data: exactItems } = await supabase
          .from('menu_items')
          .select('id, name_ar, price, provider_id, providers(name_ar)')
          .in('provider_id', providerIds)
          .eq('is_available', true)
          .or('has_stock.eq.true,has_stock.is.null')
          .ilike('name_ar', `%${searchQuery}%`)
          .limit(20)

        filteredItems = exactItems || []
      }

      if (filteredItems.length > 0) {
        // Group by provider for the message
        const byProvider = new Map<string, { name: string; items: typeof filteredItems }>()
        for (const item of filteredItems) {
          const providerData = item.providers as { name_ar: string } | { name_ar: string }[] | null
          const providerName = Array.isArray(providerData) ? providerData[0]?.name_ar : providerData?.name_ar
          if (!byProvider.has(item.provider_id)) {
            byProvider.set(item.provider_id, { name: providerName || 'متجر', items: [] })
          }
          byProvider.get(item.provider_id)?.items.push(item)
        }

        const providerList = Array.from(byProvider.entries())
          .map(([, data]) => data.name)
          .slice(0, 3)
          .join(' و')

        // IMPORTANT: Return ITEM buttons, not provider buttons
        return {
          reply: `أيوه موجود ${searchQuery} عند ${providerList} 👇`,
          quick_replies: filteredItems.slice(0, 8).map(item => {
            const providerData = item.providers as { name_ar: string } | { name_ar: string }[] | null
            const providerName = Array.isArray(providerData) ? providerData[0]?.name_ar : providerData?.name_ar
            return {
              title: `${item.name_ar} (${item.price} ج.م) - ${providerName || ''}`,
              payload: `item:${item.id}`,
            }
          }),
          memory,
        }
      }
    }

    return {
      reply: `مش لاقي ${searchQuery} دلوقتي. تحب تدور على حاجة تانية؟`,
      quick_replies: [
        { title: '🏠 الأقسام', payload: 'categories' },
        { title: '🔥 العروض', payload: 'show_promotions' },
      ],
      memory,
    }
  }
}

// =============================================================================
// INTENT ROUTER - Zapier-style intent detection and tool forcing
// =============================================================================

interface DetectedIntent {
  type: 'promotions' | 'provider_selection' | 'product_search' | 'greeting' | 'general'
  forcedTool?: string
  forcedArgs?: Record<string, unknown>
  confidence: 'high' | 'medium' | 'low'
}

// Keywords for intent detection
const PROMOTION_KEYWORDS = ['عروض', 'خصم', 'خصومات', 'promo', 'promotions', 'offers', 'show_promotions', 'العروض']
const PRODUCT_SEARCH_KEYWORDS = ['عايز', 'عاوز', 'عاوزه', 'موجود', 'فين', 'عندكم', 'ابحث', 'دور']
const GREETING_KEYWORDS = ['هاي', 'هلو', 'السلام', 'صباح', 'مساء', 'أهلا', 'اهلا', 'مرحبا']
const PROVIDER_NAME_PATTERNS = [
  /^(?:من|عند|في)\s+(.+?)$/,
  /^(.+?)\s+(?:المطعم|السوبر|المحل)$/,
  /^مطعم\s+(.+)$/,
  /^سوبر\s*ماركت\s+(.+)$/,
]

/**
 * Detect user intent from message
 */
function detectIntent(
  message: string,
  selectedProviderId?: string,
  selectedCategory?: string
): DetectedIntent {
  const lowerMessage = message.toLowerCase().trim()
  const normalizedMessage = normalizeArabic(message)

  console.log('🎯 [INTENT ROUTER] Analyzing:', { message, selectedProviderId, selectedCategory })

  // Skip payload messages (handled by specific handlers)
  if (message.startsWith('category:') ||
      message.startsWith('provider:') ||
      message.startsWith('item:') ||
      message.startsWith('variant:')) {
    console.log('🎯 [INTENT] Detected: PAYLOAD (skip forcing)')
    return { type: 'general', confidence: 'low' }
  }

  // 1. Check for promotions intent
  if (PROMOTION_KEYWORDS.some(kw => lowerMessage.includes(kw) || normalizedMessage.includes(normalizeArabic(kw)))) {
    console.log('🎯 [INTENT] Detected: PROMOTIONS')
    return {
      type: 'promotions',
      forcedTool: 'get_promotions',
      forcedArgs: selectedProviderId && isValidUUID(selectedProviderId)
        ? { provider_id: selectedProviderId }
        : {},
      confidence: 'high'
    }
  }

  // 2. Check for greeting (should show categories)
  const isGreeting = GREETING_KEYWORDS.some(kw => lowerMessage.includes(kw)) ||
                     /^(hi|hello|hey|مرحب|اهل|اهلا)/i.test(lowerMessage)
  if (isGreeting && message.length < 30) {
    console.log('🎯 [INTENT] Detected: GREETING')
    return {
      type: 'greeting',
      forcedTool: 'get_available_categories_in_city',
      forcedArgs: {},
      confidence: 'high'
    }
  }

  // 3. Check for product search intent
  if (PRODUCT_SEARCH_KEYWORDS.some(kw => lowerMessage.includes(kw))) {
    // Extract what they want (everything after the keyword)
    let searchQuery = message
    for (const kw of PRODUCT_SEARCH_KEYWORDS) {
      const kwIndex = lowerMessage.indexOf(kw)
      if (kwIndex !== -1) {
        searchQuery = message.slice(kwIndex + kw.length).trim()
        break
      }
    }

    if (selectedProviderId && isValidUUID(selectedProviderId)) {
      console.log('🎯 [INTENT] Detected: PRODUCT_SEARCH (in provider)', searchQuery)
      return {
        type: 'product_search',
        forcedTool: 'search_in_provider',
        forcedArgs: { provider_id: selectedProviderId, query: searchQuery || message },
        confidence: 'high'
      }
    } else {
      console.log('🎯 [INTENT] Detected: PRODUCT_SEARCH (city-wide)', searchQuery)
      return {
        type: 'product_search',
        forcedTool: 'search_product_in_city',
        forcedArgs: { query: searchQuery || message },
        confidence: 'high'
      }
    }
  }

  // 4. Check for provider name selection
  // This should be more liberal - any short Arabic text that isn't a known command
  const isShortMessage = message.length <= 30
  const providerNameMatch = PROVIDER_NAME_PATTERNS.find(p => p.test(message))
  const looksLikeProviderName = /^[؀-ۿ\s]+$/.test(message.trim()) && message.length >= 3 // Arabic text, at least 3 chars

  // Don't treat as provider name if it contains known keywords
  const containsKnownKeywords =
    GREETING_KEYWORDS.some(kw => lowerMessage.includes(kw)) ||
    PROMOTION_KEYWORDS.some(kw => lowerMessage.includes(kw)) ||
    PRODUCT_SEARCH_KEYWORDS.some(kw => lowerMessage.includes(kw))

  if ((providerNameMatch || (isShortMessage && looksLikeProviderName)) && !containsKnownKeywords && !selectedProviderId) {
    // Extract provider name
    let providerName = message.trim()
    if (providerNameMatch) {
      const match = message.match(providerNameMatch)
      if (match && match[1]) {
        providerName = match[1].trim()
      }
    }

    // Clean the provider name
    providerName = providerName.replace(/^(?:مطعم|سوبر\s*ماركت|محل|من|عند|في)\s*/i, '').trim()

    if (providerName.length >= 2) {
      console.log('🎯 [INTENT] Detected: PROVIDER_SELECTION, name:', providerName)
      return {
        type: 'provider_selection',
        forcedTool: 'search_providers',
        forcedArgs: { query: providerName },
        confidence: providerNameMatch ? 'high' : 'medium'
      }
    }
  }

  // 5. Default: general intent
  console.log('🎯 [INTENT] Detected: GENERAL')
  return { type: 'general', confidence: 'low' }
}

// Regex to detect provider name mentions in Arabic
const PROVIDER_NAME_REGEX = /(?:من|عند|في)\s+(.+?)(?:\s*$|[،,?؟])/

/**
 * Try to resolve a provider name to UUID
 * Used when user mentions provider by name instead of selecting from buttons
 * Supports multiple search strategies for better Arabic matching
 */
async function resolveProviderByName(
  name: string,
  cityId: string
): Promise<{ id: string; name_ar: string } | null> {
  const supabase = await createClient()

  const normalizedName = normalizeArabic(name)
  logNormalization('resolveProviderByName', name, normalizedName)

  // Remove common prefixes like "مطعم", "سوبر ماركت", etc.
  const cleanName = name
    .replace(/^(?:مطعم|سوبر\s*ماركت|محل|من|عند|في)\s*/i, '')
    .trim()

  console.log('🔍 [PROVIDER RESOLVE] Searching for:', { original: name, cleaned: cleanName, normalized: normalizedName })

  // Strategy 1: Try exact ilike match with original name
  let { data: providers } = await supabase
    .from('providers')
    .select('id, name_ar')
    .eq('city_id', cityId)
    .eq('status', 'open')
    .neq('name_ar', '')
    .ilike('name_ar', `%${name}%`)
    .limit(10)

  // Strategy 2: Try with cleaned name if no results
  if ((!providers || providers.length === 0) && cleanName !== name) {
    const result = await supabase
      .from('providers')
      .select('id, name_ar')
      .eq('city_id', cityId)
      .eq('status', 'open')
      .neq('name_ar', '')
      .ilike('name_ar', `%${cleanName}%`)
      .limit(10)
    providers = result.data
  }

  // Strategy 3: Get all providers and filter with normalization
  if (!providers || providers.length === 0) {
    console.log('🔍 [PROVIDER RESOLVE] Trying full list with normalization...')
    const result = await supabase
      .from('providers')
      .select('id, name_ar')
      .eq('city_id', cityId)
      .eq('status', 'open')
      .neq('name_ar', '')
      .limit(100)

    if (result.data && result.data.length > 0) {
      // Apply Arabic normalization filter
      providers = filterByNormalizedArabic(result.data, cleanName, (p) => [p.name_ar])
    }
  }

  if (!providers || providers.length === 0) {
    console.log('🔍 [PROVIDER RESOLVE] No providers found for:', name)
    return null
  }

  // Apply Arabic normalization to filter results further
  const filtered = filterByNormalizedArabic(providers, cleanName, (p) => [p.name_ar])

  if (filtered.length === 1) {
    console.log('✅ [PROVIDER RESOLVE] Found exact match:', filtered[0].name_ar)
    return filtered[0]
  }

  if (filtered.length > 1) {
    // Return the first one but log that there are multiple matches
    console.log('⚠️ [PROVIDER RESOLVE] Multiple matches for:', name, filtered.map(p => p.name_ar))
    return filtered[0]
  }

  // Fallback to first result from DB
  console.log('⚠️ [PROVIDER RESOLVE] Using first DB result:', providers[0].name_ar)
  return providers[0]
}

interface QuickReply {
  title: string
  payload: string
}

interface CartAction {
  type: 'ADD_ITEM' | 'CLEAR_AND_ADD' | 'REMOVE_ITEM' | 'CLEAR_CART' // CLEAR_AND_ADD clears cart first, then adds item
  provider_id: string
  menu_item_id: string
  menu_item_name_ar: string
  quantity: number
  unit_price: number
  variant_id?: string
  variant_name_ar?: string
}

// Lazy OpenAI client
let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 100
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(key)
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (limit.count >= RATE_LIMIT) return false
  limit.count++
  return true
}

/**
 * Handle tool calls - Execute Supabase queries
 */
async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  cityId: string
): Promise<unknown> {
  const supabase = await createClient()

  // 🔍 Log tool call start
  console.log('🔍 [AI TOOL CALL]', {
    tool: name,
    args,
    cityId,
    timestamp: new Date().toISOString(),
  })

  let result: unknown

  switch (name) {
    case 'get_customer_name': {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', args.customer_id as string)
        .maybeSingle()
      result = { name: data?.full_name ?? null }
      break
    }

    case 'get_available_categories_in_city': {
      const { data } = await supabase
        .from('providers')
        .select('category')
        .eq('city_id', cityId)
        .eq('status', 'open')
        .neq('name_ar', '')

      const categories = [...new Set(data?.map(p => p.category) || [])]
      result = categories
      break
    }

    case 'search_providers': {
      const searchQuery = args.query as string || ''

      // Log normalization
      if (searchQuery) {
        logNormalization('search_providers', searchQuery, normalizeArabic(searchQuery))
      }

      let query = supabase
        .from('providers')
        .select('id, name_ar, rating, is_featured, category, logo_url')
        .eq('city_id', cityId)
        .eq('status', 'open')
        .neq('name_ar', '')

      // Category filter with mapping
      if (args.category) {
        const mappedCategories = CATEGORY_MAPPING[args.category as string] || [args.category]
        query = query.in('category', mappedCategories)
      }

      // Name search (using DB ilike as first pass)
      if (searchQuery) {
        query = query.ilike('name_ar', `%${searchQuery}%`)
      }

      const { data: rawData } = await query
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false })
        .limit(50) // Get more results for normalization filter

      // Apply Arabic normalization filter
      let filtered = rawData || []
      if (searchQuery && filtered.length > 0) {
        const beforeCount = filtered.length
        filtered = filterByNormalizedArabic(filtered, searchQuery, (p) => [p.name_ar])

        console.log('🔤 [NORM FILTER] search_providers:', {
          query: searchQuery,
          beforeFilter: beforeCount,
          afterFilter: filtered.length,
        })
      }

      // Limit final results
      result = filtered.slice(0, (args.limit as number) || 10)
      break
    }

    case 'get_provider_menu': {
      let providerId = args.provider_id as string

      // Try to resolve provider_id if it's not a valid UUID (might be a name)
      if (!isValidUUID(providerId)) {
        console.log('🔍 [AI] get_provider_menu: provider_id is not UUID, trying to resolve name:', providerId)
        const resolved = await resolveProviderByName(providerId, cityId)
        if (resolved) {
          providerId = resolved.id
          console.log('✅ [AI] Resolved provider name to UUID:', providerId, '(' + resolved.name_ar + ')')
        } else {
          console.warn('🚨 [AI] Could not resolve provider name:', providerId)
          result = { error: 'Provider not found', items: [] }
          break
        }
      }

      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name_ar, price, pricing_type, has_variants, price_from, image_url, description_ar, is_available, has_stock')
        .eq('provider_id', providerId)
        .eq('is_available', true)
        .or('has_stock.eq.true,has_stock.is.null')
        .gte('price', 15) // Filter out extras
        .order('price', { ascending: false })
        .limit((args.limit as number) || 12)

      if (error) {
        console.error('❌ [AI DB ERROR] get_provider_menu:', error)
      }

      // 📦 Detailed logging for menu items
      console.log('📦 [AI MENU RESULT]', {
        tool: 'get_provider_menu',
        providerId: args.provider_id,
        count: data?.length ?? 0,
        items: data?.slice(0, 5).map(i => ({
          id: i.id,
          name: i.name_ar,
          price: i.price,
          is_available: i.is_available,
          has_stock: i.has_stock,
        })),
      })

      result = data || []
      break
    }

    case 'search_in_provider': {
      let providerId = args.provider_id as string

      // Try to resolve provider_id if it's not a valid UUID (might be a name)
      if (!isValidUUID(providerId)) {
        console.log('🔍 [AI] provider_id is not UUID, trying to resolve name:', providerId)
        const resolved = await resolveProviderByName(providerId, cityId)
        if (resolved) {
          providerId = resolved.id
          console.log('✅ [AI] Resolved provider name to UUID:', providerId, '(' + resolved.name_ar + ')')
        } else {
          console.warn('🚨 [AI] Could not resolve provider name:', providerId)
          result = { error: 'Provider not found', items: [] }
          break
        }
      }

      const searchQuery = args.query as string || ''
      const normalizedQuery = normalizeArabic(searchQuery)
      logNormalization('search_in_provider', searchQuery, normalizedQuery)

      // Get more results from DB for normalization filter
      const { data: rawData, error } = await supabase
        .from('menu_items')
        .select('id, name_ar, name_en, description_ar, price, pricing_type, has_variants, image_url, is_available, has_stock')
        .eq('provider_id', providerId)
        .eq('is_available', true)
        .or('has_stock.eq.true,has_stock.is.null')
        .limit(50)

      if (error) {
        console.error('❌ [AI DB ERROR] search_in_provider:', error)
      }

      // Apply Arabic normalization filter
      let filtered = rawData || []
      if (searchQuery && filtered.length > 0) {
        const beforeCount = filtered.length
        filtered = filterByNormalizedArabic(filtered, searchQuery, (item) => [
          item.name_ar || '',
          item.name_en || '',
          item.description_ar || '',
        ])

        console.log('🔤 [NORM FILTER] search_in_provider:', {
          query: searchQuery,
          normalizedQuery,
          beforeFilter: beforeCount,
          afterFilter: filtered.length,
          firstFewNames: filtered.slice(0, 3).map(i => i.name_ar),
        })
      }

      // Limit final results
      const finalData = filtered.slice(0, (args.limit as number) || 8)

      // 📦 Detailed logging for search
      console.log('📦 [AI SEARCH RESULT]', {
        tool: 'search_in_provider',
        providerId,
        query: searchQuery,
        count: finalData.length,
        items: finalData.map(i => ({
          id: i.id,
          name: i.name_ar,
          price: i.price,
          is_available: i.is_available,
          has_stock: i.has_stock,
        })),
      })

      // 🚨 Warning if no results
      if (finalData.length === 0) {
        console.warn('🚨 [AI EMPTY RESULT]', {
          tool: 'search_in_provider',
          providerId,
          query: searchQuery,
          normalizedQuery,
          filters: { is_available: true, has_stock: 'true OR null' },
        })
      }

      result = finalData
      break
    }

    case 'get_menu_item_details': {
      // Validate menu_item_id is a valid UUID
      if (!isValidUUID(args.menu_item_id)) {
        console.warn('🚨 [AI INVALID UUID] get_menu_item_details menu_item_id:', args.menu_item_id)
        result = { error: 'Invalid menu_item_id format', item: null }
        break
      }

      const { data } = await supabase
        .from('menu_items')
        .select('*, providers(id, name_ar)')
        .eq('id', args.menu_item_id as string)
        .maybeSingle()

      result = data
      break
    }

    case 'get_item_variants': {
      // Validate menu_item_id is a valid UUID
      if (!isValidUUID(args.menu_item_id)) {
        console.warn('🚨 [AI INVALID UUID] get_item_variants menu_item_id:', args.menu_item_id)
        result = { error: 'Invalid menu_item_id format', variants: [] }
        break
      }

      const { data } = await supabase
        .from('product_variants')
        .select('id, name_ar, price, is_default')
        .eq('product_id', args.menu_item_id as string)
        .eq('is_available', true)
        .order('is_default', { ascending: false })
        .limit((args.limit as number) || 12)

      result = data || []
      break
    }

    case 'get_variant_details': {
      // Validate variant_id is a valid UUID
      if (!isValidUUID(args.variant_id)) {
        console.warn('🚨 [AI INVALID UUID] get_variant_details variant_id:', args.variant_id)
        result = { error: 'Invalid variant_id format', variant: null }
        break
      }

      const { data } = await supabase
        .from('product_variants')
        .select('*')
        .eq('id', args.variant_id as string)
        .maybeSingle()

      result = data
      break
    }

    case 'get_promotions': {
      const now = new Date().toISOString()

      // If provider_id is specified, validate it or try to resolve name
      let providerId = args.provider_id as string | undefined
      if (providerId && !isValidUUID(providerId)) {
        console.log('🔍 [AI] promotion provider_id is not UUID, trying to resolve:', providerId)
        const resolved = await resolveProviderByName(providerId, cityId)
        if (resolved) {
          providerId = resolved.id
        } else {
          console.warn('🚨 [AI] Could not resolve provider for promotions:', providerId)
          providerId = undefined
        }
      }

      // Query promotions with provider join for city filtering
      // promotions table has NO city_id, so we join via providers
      // Also select applies_to and product_ids for specific promotions
      let query = supabase
        .from('promotions')
        .select('*, providers!inner(id, name_ar, city_id)')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .eq('providers.city_id', cityId)

      if (providerId) {
        query = query.eq('provider_id', providerId)
      }

      const { data: promotions, error } = await query.limit((args.limit as number) || 10)

      if (error) {
        console.error('❌ [AI DB ERROR] get_promotions:', error)
      }

      // For promotions with applies_to='specific', fetch the affected products
      const promotionsWithProducts = await Promise.all(
        (promotions || []).map(async (promo) => {
          // Check if this promotion applies to specific products
          if (promo.applies_to === 'specific' && promo.product_ids && Array.isArray(promo.product_ids) && promo.product_ids.length > 0) {
            // Fetch the specific products
            const { data: products } = await supabase
              .from('menu_items')
              .select('id, name_ar, price, provider_id')
              .in('id', promo.product_ids)
              .limit(10)

            return {
              ...promo,
              affected_products: products || [],
            }
          }
          return {
            ...promo,
            affected_products: [],
          }
        })
      )

      // ========================================================================
      // ALSO fetch items with product-level discounts (original_price > price)
      // These are individual item discounts, not promotions table entries
      // ========================================================================
      let discountedItemsQuery = supabase
        .from('menu_items')
        .select('id, name_ar, price, original_price, provider_id, providers!inner(id, name_ar, city_id)')
        .eq('is_available', true)
        .eq('providers.city_id', cityId)
        .not('original_price', 'is', null)
        .gt('original_price', 0)

      if (providerId) {
        discountedItemsQuery = discountedItemsQuery.eq('provider_id', providerId)
      }

      const { data: discountedItems } = await discountedItemsQuery.limit(20)

      // Filter items where original_price > price (actual discount)
      const actualDiscountedItems = (discountedItems || []).filter(
        item => item.original_price && item.original_price > item.price
      ).map(item => ({
        ...item,
        discount_percentage: Math.round(((item.original_price - item.price) / item.original_price) * 100),
      }))

      // 📦 Log promotions result with products
      console.log('📦 [AI PROMOTIONS RESULT]', {
        tool: 'get_promotions',
        cityId,
        providerId,
        promotionsCount: promotionsWithProducts.length,
        discountedItemsCount: actualDiscountedItems.length,
        promotions: promotionsWithProducts.map(p => ({
          id: p.id,
          title: p.name_ar,
          provider: p.providers?.name_ar,
          type: p.type,
          discount_value: p.discount_value,
          applies_to: p.applies_to,
          affected_products_count: p.affected_products?.length || 0,
        })),
      })

      // Return both promotions AND discounted items
      result = {
        promotions: promotionsWithProducts,
        discounted_items: actualDiscountedItems,
      }
      break
    }

    case 'search_product_in_city': {
      const searchQuery = args.query as string || ''
      const normalizedQuery = normalizeArabic(searchQuery)
      logNormalization('search_product_in_city', searchQuery, normalizedQuery)

      // First get providers in city
      const { data: providers } = await supabase
        .from('providers')
        .select('id')
        .eq('city_id', cityId)
        .eq('status', 'open')

      if (!providers?.length) {
        console.warn('🚨 [AI] No providers found in city:', cityId)
        result = []
        break
      }

      const providerIds = providers.map(p => p.id)

      // Get more results for normalization filter
      const { data: rawData, error } = await supabase
        .from('menu_items')
        .select('id, name_ar, name_en, description_ar, price, provider_id, is_available, has_stock, providers(id, name_ar)')
        .in('provider_id', providerIds)
        .eq('is_available', true)
        .or('has_stock.eq.true,has_stock.is.null')
        .limit(100) // Get more for filtering

      if (error) {
        console.error('❌ [AI DB ERROR] search_product_in_city:', error)
      }

      // Apply Arabic normalization filter
      let filtered = rawData || []
      if (searchQuery && filtered.length > 0) {
        const beforeCount = filtered.length
        filtered = filterByNormalizedArabic(filtered, searchQuery, (item) => [
          item.name_ar || '',
          item.name_en || '',
          item.description_ar || '',
        ])

        console.log('🔤 [NORM FILTER] search_product_in_city:', {
          query: searchQuery,
          normalizedQuery,
          beforeFilter: beforeCount,
          afterFilter: filtered.length,
        })
      }

      // Limit final results
      const finalData = filtered.slice(0, (args.limit as number) || 10)

      // 📦 Detailed logging for city-wide search
      console.log('📦 [AI CITY SEARCH RESULT]', {
        tool: 'search_product_in_city',
        cityId,
        query: searchQuery,
        normalizedQuery,
        providersInCity: providers.length,
        count: finalData.length,
        items: finalData.map(i => ({
          id: i.id,
          name: i.name_ar,
          price: i.price,
          provider: i.providers,
          is_available: i.is_available,
          has_stock: i.has_stock,
        })),
      })

      // 🚨 Warning if no results
      if (finalData.length === 0) {
        console.warn('🚨 [AI EMPTY CITY SEARCH]', {
          tool: 'search_product_in_city',
          cityId,
          query: searchQuery,
          normalizedQuery,
          providersSearched: providers.length,
        })
      }

      result = finalData
      break
    }

    default:
      console.warn(`⚠️ [AI] Unknown tool: ${name}`)
      result = []
  }

  // 📊 Log final result summary
  const resultArray = Array.isArray(result) ? result : [result]
  console.log('✅ [AI TOOL RESULT]', {
    tool: name,
    resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
    hasData: resultArray.length > 0 && resultArray[0] !== null,
  })

  return result
}

/**
 * Process message with function calling
 * Supports forced tool choice via Zapier-style Intent Router
 */
async function processWithTools(
  messages: ChatCompletionMessageParam[],
  cityId: string,
  contextInfo: string,
  forcedTool?: string,
  forcedArgs?: Record<string, unknown>
): Promise<{
  content: string
  quick_replies?: QuickReply[]
  cart_action?: CartAction
  tool_results?: unknown[] // Return tool results for generating quick_replies
}> {
  const openai = getOpenAI()

  // Combine SYSTEM_PROMPT with context (single system message to avoid confusion)
  const fullSystemPrompt = `${SYSTEM_PROMPT}\n\n${contextInfo}`

  // Determine tool_choice based on intent detection
  let toolChoice: 'auto' | { type: 'function'; function: { name: string } } = 'auto'
  if (forcedTool) {
    toolChoice = { type: 'function', function: { name: forcedTool } }
    console.log('🎯 [INTENT ROUTER] Forcing tool:', forcedTool, 'with args:', forcedArgs)
  }

  // First call with tools
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: fullSystemPrompt },
      ...messages,
    ],
    tools,
    tool_choice: toolChoice,
    temperature: 0.7,
    max_tokens: 1000,
  })

  const assistantMessage = response.choices[0].message

  // If no tool calls, return the content directly
  if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
    return parseAssistantResponse(assistantMessage.content || '')
  }

  // Process tool calls
  const toolResults: ChatCompletionMessageParam[] = []
  const rawToolResults: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = []

  for (const toolCall of assistantMessage.tool_calls) {
    // Skip non-function tool calls
    if (toolCall.type !== 'function') continue

    const name = toolCall.function.name
    let args = JSON.parse(toolCall.function.arguments || '{}')

    // If we have forced args from intent router, merge them
    if (forcedTool === name && forcedArgs) {
      args = { ...args, ...forcedArgs }
      console.log('🎯 [INTENT ROUTER] Merged forced args:', args)
    }

    console.log(`[Tool Call] ${name}:`, args)

    const result = await handleToolCall(name, args, cityId)

    console.log(`[Tool Result] ${name}:`, JSON.stringify(result).slice(0, 200))

    toolResults.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    })

    // Track raw results for quick_replies generation
    rawToolResults.push({ name, args, result })
  }

  // Second call with tool results (same system prompt)
  const followUpResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: fullSystemPrompt },
      ...messages,
      assistantMessage as ChatCompletionMessageParam,
      ...toolResults,
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  const parsed = parseAssistantResponse(followUpResponse.choices[0].message.content || '')

  return {
    ...parsed,
    tool_results: rawToolResults,
  }
}

/**
 * Parse assistant response for quick_replies and cart_action
 */
function parseAssistantResponse(content: string): {
  content: string
  quick_replies?: QuickReply[]
  cart_action?: CartAction
} {
  let cleanContent = content
  let quick_replies: QuickReply[] | undefined
  let cart_action: CartAction | undefined

  // Try to extract JSON blocks from the response
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (parsed.quick_replies) quick_replies = parsed.quick_replies
      if (parsed.cart_action) cart_action = parsed.cart_action
      cleanContent = content.replace(/```json[\s\S]*?```/g, '').trim()
    } catch {
      // Ignore parse errors
    }
  }

  // Also check for inline JSON
  const cartActionMatch = content.match(/"cart_action"\s*:\s*(\{[^}]+\})/)
  if (cartActionMatch) {
    try {
      cart_action = JSON.parse(cartActionMatch[1])
      cleanContent = content.replace(/"cart_action"\s*:\s*\{[^}]+\}/, '').trim()
    } catch {
      // Ignore
    }
  }

  return { content: cleanContent, quick_replies, cart_action }
}

/**
 * POST /api/chat - Main endpoint
 */
export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, customer_id, city_id, selected_provider_id, selected_provider_category, selected_category, memory, cart_provider_id, cart_provider_name, cart_items } = body

    // Get the last user message (extracted early for pre-validation handlers)
    const lastUserMessage = messages[messages.length - 1]?.content || ''

    // 🔍 Log incoming request
    console.log('🔍 [AI REQUEST]', {
      cityId: city_id,
      customerId: customer_id,
      selectedProviderId: selected_provider_id,
      selectedProviderCategory: selected_provider_category,
      selectedCategory: selected_category,
      cartProviderId: cart_provider_id,
      cartProviderName: cart_provider_name,
      cartItemsCount: cart_items?.length || 0,
      messageCount: messages?.length,
      lastMessage: lastUserMessage?.slice(0, 100),
      memory: memory,
    })

    // =========================================================================
    // 🚀 PRE-VALIDATION HANDLERS - These don't need city_id
    // =========================================================================

    // Handle cart inquiry - "ايه في السلة", "السلة فيها ايه", "ايه اللي عندي في السله"
    const cartInquiryPatterns = [
      /(?:ايه|إيه|ايش|شو|وش)\s*(?:اللي\s*)?(?:في|فى|ب|عندي\s*في)\s*(?:ال)?سل[ةه]/i,
      /(?:ال)?سل[ةه]\s*(?:فيها|فيه)\s*(?:ايه|إيه|ايش|شو)/i,
      /(?:عايز|عاوز)\s*(?:اعرف|اشوف)\s*(?:ال)?سل[ةه]/i,
      /(?:وريني|فرجني|ارني)\s*(?:ال)?سل[ةه]/i,
      /(?:محتويات|محتوى)\s*(?:ال)?سل[ةه]/i,
      /^(?:ال)?سل[ةه]$/i,
      /(?:ايه|إيه)\s*(?:اللي\s*)?عندي/i, // "ايه اللي عندي"
    ]

    if (cartInquiryPatterns.some(pattern => pattern.test(lastUserMessage))) {
      console.log('🚀 [PRE-VALIDATION HANDLER] cart_inquiry')

      if (!cart_items || cart_items.length === 0) {
        return Response.json({
          reply: getCartEmptyMessage(),
          quick_replies: [
            { title: '🏠 الأقسام', payload: 'categories' },
            { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
          ],
          selected_provider_id,
          selected_category,
          memory,
        })
      }

      // Build cart summary
      let cartSummary = '🛒 **السلة الحالية:**\n\n'
      let total = 0

      for (const item of cart_items) {
        const variantText = item.variant_name_ar ? ` (${item.variant_name_ar})` : ''
        const itemTotal = item.quantity * item.unit_price
        total += itemTotal
        cartSummary += `• ${item.quantity}x ${item.name_ar}${variantText} - ${itemTotal} ج.م\n`
      }

      cartSummary += `\n💰 **الإجمالي: ${total} ج.م**`
      if (cart_provider_name) {
        cartSummary += `\n📍 من: ${cart_provider_name}`
      }

      return Response.json({
        reply: cartSummary,
        quick_replies: [
          { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
          { title: '➕ أضف صنف آخر', payload: cart_provider_id ? `add_more:${cart_provider_id}` : 'categories' },
          { title: '🗑️ امسح السلة', payload: 'clear_cart' },
        ],
        selected_provider_id,
        selected_category,
        memory,
      })
    }

    // Handle compound commands - "كنسل الكشري وضيف 2 فته", "الغي البيتزا و اضف برجر"
    // Pattern: (cancel item) + و/and + (add item with optional quantity)
    const compoundCommandPatterns = [
      /(?:الغ[يى]|كنسل|امسح|شيل)\s+(?:ال)?(.+?)\s+(?:و|وبعدين|ثم)\s*(?:ضيف|أضف|اضف|زود|هات)\s*(\d+|واحد|اتنين|تلاته|اربعه|خمسه)?\s*(.+)/i,
      /(?:بدل|غير)\s+(?:ال)?(.+?)\s+(?:ب|الى|إلى)\s*(\d+|واحد|اتنين|تلاته|اربعه|خمسه)?\s*(.+)/i,
    ]

    for (const pattern of compoundCommandPatterns) {
      const match = lastUserMessage.match(pattern)
      if (match) {
        const itemToRemove = match[1]?.trim()
        const quantityWord = match[2]?.trim()
        const itemToAdd = match[3]?.trim()

        if (itemToRemove && itemToAdd) {
          console.log('🚀 [PRE-VALIDATION HANDLER] compound_command:', itemToRemove, '->', quantityWord, 'x', itemToAdd)

          // Parse quantity
          let quantity = 1
          if (quantityWord) {
            const parsed = parseArabicQuantity(quantityWord)
            if (parsed > 0) quantity = parsed
          }

          // Find the item to remove in cart
          let removedItem: CartItemInfo | undefined
          let cartAction: CartAction | undefined

          if (cart_items && cart_items.length > 0) {
            const normalizedSearch = normalizeArabic(itemToRemove)
            removedItem = cart_items.find(item => {
              const normalizedName = normalizeArabic(item.name_ar)
              return normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName)
            })

            if (removedItem) {
              cartAction = {
                type: 'REMOVE_ITEM' as const,
                provider_id: cart_provider_id || '',
                menu_item_id: '',
                menu_item_name_ar: removedItem.name_ar,
                quantity: 0,
                unit_price: 0,
              }
            }
          }

          // Now search for the item to add
          const providerId = cart_provider_id || selected_provider_id || memory?.current_provider?.id

          if (providerId && isValidUUID(providerId)) {
            const supabase = await createClient()

            // Search for the new item
            const { data: searchResults } = await supabase
              .from('menu_items')
              .select('id, name_ar, name_en, price, description_ar, has_variants, provider_id, providers!inner(name_ar)')
              .eq('provider_id', providerId)
              .eq('is_available', true)
              .limit(20)

            if (searchResults && searchResults.length > 0) {
              const normalizedAddSearch = normalizeArabic(itemToAdd)
              const filtered = filterByNormalizedArabic(searchResults, normalizedAddSearch, 'name_ar')

              if (filtered.length > 0) {
                const item = filtered[0] as { id: string; name_ar: string; price: number; has_variants?: boolean; provider_id: string; providers: { name_ar: string } }
                const providerName = (item.providers as { name_ar: string })?.name_ar || 'المتجر'

                let removeMessage = ''
                if (removedItem) {
                  removeMessage = `تمام! ✅ شلت ${removedItem.name_ar} من السلة.\n\n`
                }

                if (item.has_variants) {
                  // Item has variants, need to show variants
                  const { data: variants } = await supabase
                    .from('menu_item_variants')
                    .select('id, name_ar, price')
                    .eq('menu_item_id', item.id)
                    .eq('is_available', true)

                  if (variants && variants.length > 0) {
                    const variantButtons = variants.slice(0, 4).map((v: { id: string; name_ar: string; price: number }) => ({
                      title: `${v.name_ar} - ${v.price} ج.م`,
                      payload: `variant:${v.id}`,
                    }))

                    return Response.json({
                      reply: `${removeMessage}${getVariantAskMessage(item.name_ar)}\n\nعايز كام؟ (${quantity} ${item.name_ar})`,
                      quick_replies: variantButtons,
                      cart_action: cartAction,
                      selected_provider_id: providerId,
                      selected_category,
                      memory: {
                        ...memory,
                        pending_item: {
                          id: item.id,
                          name_ar: item.name_ar,
                          price: item.price,
                          provider_id: item.provider_id,
                          provider_name_ar: providerName,
                          has_variants: true,
                        },
                        pending_quantity: quantity,
                        awaiting_quantity: false,
                      },
                    })
                  }
                }

                // No variants - proceed with confirmation
                const totalPrice = quantity * item.price

                return Response.json({
                  reply: `${removeMessage}لقيت ${item.name_ar} بـ ${item.price} ج.م 👇\n\n${quantity}x ${item.name_ar} = ${totalPrice} ج.م\n\nتأكيد الإضافة للسلة؟`,
                  quick_replies: [
                    { title: '✅ أيوه، أضف', payload: 'confirm_add' },
                    { title: '🔢 غير الكمية', payload: `ask_quantity:${item.id}` },
                    { title: '❌ لا', payload: 'cancel_item' },
                  ],
                  cart_action: cartAction,
                  selected_provider_id: providerId,
                  selected_category,
                  memory: {
                    ...memory,
                    pending_item: {
                      id: item.id,
                      name_ar: item.name_ar,
                      price: item.price,
                      provider_id: item.provider_id,
                      provider_name_ar: providerName,
                      has_variants: false,
                    },
                    pending_quantity: quantity,
                    awaiting_quantity: false,
                    awaiting_confirmation: true,
                  },
                })
              }
            }
          }

          // Couldn't find the item to add
          let reply = ''
          if (removedItem) {
            reply = `تمام! ✅ شلت ${removedItem.name_ar} من السلة.\n\nبس مش لاقي "${itemToAdd}" 🤔 جرب تكتبه بطريقة تانية`
          } else if (cart_items && cart_items.length > 0) {
            reply = `مش لاقي "${itemToRemove}" في السلة ومش لاقي "${itemToAdd}" 🤔\n\nتحب تشوف السلة؟`
          } else {
            reply = `السلة فاضية ومش لاقي "${itemToAdd}" 🤔 تحب تبحث بطريقة تانية؟`
          }

          return Response.json({
            reply,
            quick_replies: [
              { title: '🛒 شوف السلة', payload: 'cart_inquiry' },
              { title: '📋 شوف المنيو', payload: cart_provider_id ? `provider:${cart_provider_id}` : 'categories' },
            ],
            cart_action: cartAction,
            selected_provider_id,
            selected_category,
            memory,
          })
        }
      }
    }

    // Handle remove specific item from cart - "امسح الكشري من السله", "شيل البيتزا"
    // Pattern: (امسح|شيل|الغي|كنسل) + item_name + (من السلة)?
    const removeItemPatterns = [
      /(?:امسح|شيل|الغ[يى]|كنسل)\s+(?:ال)?(.+?)\s+(?:من\s*)?(?:ال)?سل[ةه]/i,
      /(?:امسح|شيل|الغ[يى]|كنسل)\s+(?:ال)?(.+?)\s+(?:من\s*)?(?:ال)?كارت/i,
    ]

    for (const pattern of removeItemPatterns) {
      const match = lastUserMessage.match(pattern)
      if (match && match[1]) {
        const itemToRemove = match[1].trim()
        console.log('🚀 [PRE-VALIDATION HANDLER] remove_item:', itemToRemove)

        // Find the item in cart
        if (cart_items && cart_items.length > 0) {
          const normalizedSearch = normalizeArabic(itemToRemove)
          const matchedItem = cart_items.find(item => {
            const normalizedName = normalizeArabic(item.name_ar)
            return normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName)
          })

          if (matchedItem) {
            return Response.json({
              reply: `تمام! ✅ شلت ${matchedItem.name_ar} من السلة.\n\nتحب تكمل طلبك ولا تضيف حاجة تانية؟`,
              quick_replies: [
                { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
                { title: '➕ أضف صنف آخر', payload: cart_provider_id ? `add_more:${cart_provider_id}` : 'categories' },
              ],
              cart_action: {
                type: 'REMOVE_ITEM' as const,
                provider_id: cart_provider_id || '',
                menu_item_id: '', // Frontend will match by name
                menu_item_name_ar: matchedItem.name_ar,
                quantity: 0,
                unit_price: 0,
              },
              selected_provider_id,
              selected_category,
              memory,
            })
          } else {
            return Response.json({
              reply: `مش لاقي "${itemToRemove}" في السلة 🤔\n\nتحب تشوف اللي في السلة؟`,
              quick_replies: [
                { title: '🛒 شوف السلة', payload: 'cart_inquiry' },
                { title: '🗑️ امسح كل السلة', payload: 'clear_cart' },
              ],
              selected_provider_id,
              selected_category,
              memory,
            })
          }
        } else {
          return Response.json({
            reply: 'السلة فاضية أصلاً! 🛒 تحب تطلب حاجة؟',
            quick_replies: [
              { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
              { title: '🛒 سوبر ماركت', payload: 'category:supermarket' },
            ],
            selected_provider_id,
            selected_category,
            memory,
          })
        }
      }
    }

    // Handle clear cart/order - "الغي الاوردر", "امسح السلة", "فضي السلة"
    // This clears the cart completely and starts fresh
    const clearCartPatterns = [
      /(?:الغ[يى]|امسح|فض[يى]|شيل)\s*(?:ال)?(?:اوردر|الاوردر|طلب|الطلب|سل[ةه]|السل[ةه]|كارت)/i,
      /(?:مش\s*)?(?:عايز|عاوز)\s*(?:ال)?(?:اوردر|طلب|سل[ةه])\s*(?:ده|دا|دي)?/i,
      /^(?:ال)?(?:سل[ةه]|اوردر|طلب)\s*(?:الغ[يى]|امسح|فض[يى])/i,
      /(?:ابدأ|نبدأ)\s*(?:من\s*)?(?:ال)?(?:اول|جديد)/i,
      /^clear\s*cart$/i,
    ]

    if (clearCartPatterns.some(pattern => pattern.test(lastUserMessage))) {
      console.log('🚀 [PRE-VALIDATION HANDLER] clear_cart/order')

      return Response.json({
        reply: getCartClearedMessage(),
        quick_replies: [
          { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
          { title: '🛒 سوبر ماركت', payload: 'category:supermarket' },
          { title: '🏠 الأقسام', payload: 'categories' },
        ],
        cart_action: {
          type: 'CLEAR_CART',
        },
        selected_provider_id: null, // Clear provider context
        selected_category: null,
        memory: {
          // Reset all memory
          pending_item: undefined,
          pending_variant: undefined,
          pending_quantity: undefined,
          awaiting_quantity: false,
          awaiting_confirmation: false,
          current_provider: undefined,
        },
      })
    }

    // Handle cancel/undo - "لأ مش عايز", "الغي", "تراجع", etc.
    const cancelPatterns = [
      /^(?:لا|لأ|لاء)\s*(?:مش|مو)?\s*(?:عايز|عاوز|ابي|ابغى)/i,
      /^(?:الغ[يى]|كانسل|cancel)/i,
      /^(?:تراجع|ارجع|رجعني)/i,
      /^(?:مش|مو)\s*(?:عايز|عاوز|ابي)/i,
      /^(?:غير|بدل)\s*(?:رأي[ي]?|راي)/i,
      /^(?:لا|لأ)\s*(?:شكرا|خلاص)?$/i,
      /^(?:امسح|شيل)\s*(?:ده|دا|هذا)?$/i,
    ]

    if (cancelPatterns.some(pattern => pattern.test(lastUserMessage))) {
      console.log('🚀 [PRE-VALIDATION HANDLER] cancel/undo')

      // Determine what to cancel based on memory state
      const hasSelectedItem = memory?.selected_item_id
      const hasSelectedVariant = memory?.selected_variant_id
      const hasSelectedProvider = memory?.current_provider || selected_provider_id
      const hasCartItems = cart_items && cart_items.length > 0

      let reply = ''
      let quick_replies: { title: string; payload: string }[] = []
      let updatedMemory = { ...memory }
      let keepProviderId = selected_provider_id

      if (hasSelectedVariant) {
        // Cancel variant selection, go back to item
        reply = getCancelResponse('variant')
        updatedMemory.selected_variant_id = undefined
        quick_replies = [
          { title: '↩️ اختار حجم تاني', payload: `item:${hasSelectedItem}` },
          { title: '📋 شوف المنيو', payload: hasSelectedProvider ? `provider:${typeof hasSelectedProvider === 'object' ? hasSelectedProvider.id : hasSelectedProvider}` : 'categories' },
          { title: '🏠 الرئيسية', payload: 'categories' },
        ]
      } else if (hasSelectedItem) {
        // Cancel item selection, go back to provider
        reply = getCancelResponse('item')
        updatedMemory.selected_item_id = undefined
        quick_replies = [
          { title: '📋 شوف المنيو', payload: hasSelectedProvider ? `provider:${typeof hasSelectedProvider === 'object' ? hasSelectedProvider.id : hasSelectedProvider}` : 'categories' },
          { title: '🏠 الرئيسية', payload: 'categories' },
        ]
      } else if (hasSelectedProvider) {
        // Cancel provider selection - check if user has items in cart
        if (hasCartItems) {
          // User has items in cart, don't suggest changing provider
          reply = getCancelResponse('provider_with_cart')
          // Keep the provider context since they have items from this provider
          quick_replies = [
            { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
            { title: '➕ أضف صنف آخر', payload: cart_provider_id ? `add_more:${cart_provider_id}` : `provider:${typeof hasSelectedProvider === 'object' ? hasSelectedProvider.id : hasSelectedProvider}` },
            { title: '📋 شوف المنيو', payload: `provider:${typeof hasSelectedProvider === 'object' ? hasSelectedProvider.id : hasSelectedProvider}` },
          ]
          // Keep the provider context
          keepProviderId = cart_provider_id || (typeof hasSelectedProvider === 'object' ? hasSelectedProvider.id : hasSelectedProvider)
        } else {
          // No items in cart, ok to go back to categories
          reply = getCancelResponse('provider')
          updatedMemory.current_provider = undefined
          keepProviderId = undefined
          quick_replies = [
            { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
            { title: '🛒 سوبر ماركت', payload: 'category:supermarket' },
            { title: '🏠 الأقسام', payload: 'categories' },
          ]
        }
      } else {
        // Nothing to cancel - check if has cart items
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

      return Response.json({
        reply,
        quick_replies,
        selected_provider_id: keepProviderId,
        selected_category,
        memory: updatedMemory,
      })
    }

    // Handle delivery info inquiry - "التوصيل بكام", "مصاريف الشحن", "بكام التوصيل" etc.
    const deliveryInfoPatterns = [
      /(?:ال)?توصيل\s*(?:بكام|كام|بكم)/i,
      /(?:مصاريف|تكلف[ةه]?|سعر)\s*(?:ال)?(?:توصيل|شحن|دليفري)/i,
      /(?:ال)?(?:دليفري|delivery)\s*(?:بكام|كام)/i,
      /كام\s*(?:ال)?توصيل/i,
      /(?:في|فيه)\s*توصيل/i,
      /بكام\s*(?:ال)?(?:توصيل|دليفري|شحن)/i, // "بكام التوصيل"
      /(?:ال)?(?:شحن|دليفري)\s*(?:بكام|كام)/i,
    ]

    if (deliveryInfoPatterns.some(pattern => pattern.test(lastUserMessage))) {
      console.log('🚀 [PRE-VALIDATION HANDLER] delivery_info')

      // Check all possible provider contexts - cart_provider_id is most reliable
      const providerId = cart_provider_id || selected_provider_id || memory?.current_provider?.id

      if (providerId && isValidUUID(providerId)) {
        const supabase = await createClient()

        const { data: provider } = await supabase
          .from('providers')
          .select('name_ar, delivery_fee, min_order_amount, estimated_delivery_time, free_delivery_threshold')
          .eq('id', providerId)
          .single()

        if (provider) {
          let deliveryInfo = `🚚 **معلومات التوصيل من ${provider.name_ar}:**\n\n`

          if (provider.delivery_fee === 0 || provider.delivery_fee === null) {
            deliveryInfo += '✅ التوصيل مجاني!\n'
          } else {
            deliveryInfo += `💰 رسوم التوصيل: ${provider.delivery_fee} ج.م\n`
          }

          if (provider.free_delivery_threshold) {
            deliveryInfo += `🎁 توصيل مجاني للطلبات فوق ${provider.free_delivery_threshold} ج.م\n`
          }

          if (provider.min_order_amount) {
            deliveryInfo += `📦 الحد الأدنى للطلب: ${provider.min_order_amount} ج.م\n`
          }

          if (provider.estimated_delivery_time) {
            deliveryInfo += `⏱️ وقت التوصيل المتوقع: ${provider.estimated_delivery_time} دقيقة\n`
          }

          return Response.json({
            reply: deliveryInfo,
            quick_replies: [
              { title: '📋 شوف المنيو', payload: `provider:${providerId}` },
              { title: '🛒 السلة', payload: 'cart_inquiry' },
            ],
            selected_provider_id: providerId,
            selected_category,
            memory,
          })
        }
      }

      // No provider context - give general info
      return Response.json({
        reply: '🚚 رسوم التوصيل بتختلف من مكان للتاني.\n\nاختار مطعم أو متجر وهقولك تفاصيل التوصيل بتاعه 👇',
        quick_replies: [
          { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
          { title: '🛒 سوبر ماركت', payload: 'category:supermarket' },
        ],
        selected_provider_id,
        selected_category,
        memory,
      })
    }

    // Handle recommendations - "اقترح عليا", "ايه الحلو", "بترشح ايه"
    const recommendationPatterns = [
      /^(?:اقترح|قترح|رشح|رشحلي|اقترحلي)\s*(?:عليا?|لي)?/i,
      /^(?:ايه|إيه|شو)\s*(?:ال)?(?:حلو|مميز|جميل|كويس|احسن|الأفضل)/i,
      /^(?:بترشح|ترشح|تقترح)\s*(?:ايه|إيه|شو)/i,
      /^(?:عندك|عندكم)\s*(?:ايه|إيه|شو)\s*(?:حلو|مميز)/i,
    ]

    if (recommendationPatterns.some(pattern => pattern.test(lastUserMessage))) {
      console.log('🚀 [PRE-VALIDATION HANDLER] recommendations')

      const supabase = await createClient()
      const providerId = selected_provider_id || memory?.current_provider?.id

      if (providerId && isValidUUID(providerId)) {
        const { data: items } = await supabase
          .from('menu_items')
          .select('id, name_ar, price, is_featured')
          .eq('provider_id', providerId)
          .eq('is_available', true)
          .order('is_featured', { ascending: false })
          .order('price', { ascending: true })
          .limit(8)

        const { data: provider } = await supabase
          .from('providers')
          .select('name_ar')
          .eq('id', providerId)
          .single()

        if (items && items.length > 0) {
          return Response.json({
            reply: getRecommendationHeader(provider?.name_ar),
            quick_replies: items.slice(0, 6).map(item => ({
              title: `${item.name_ar} (${item.price} ج.م)`,
              payload: `item:${item.id}`,
            })),
            selected_provider_id: providerId,
            selected_category,
            memory,
          })
        }
      }

      // No provider context - show top providers
      const { data: providers } = await supabase
        .from('providers')
        .select('id, name_ar, rating, is_featured')
        .eq('city_id', city_id)
        .eq('status', 'open')
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false })
        .limit(6)

      if (providers && providers.length > 0) {
        return Response.json({
          reply: getRecommendationHeader(),
          quick_replies: providers.map(p => ({
            title: `📍 ${p.name_ar}${p.rating ? ` ⭐${p.rating}` : ''}`,
            payload: `provider:${p.id}`,
          })),
          selected_provider_id,
          selected_category,
          memory,
        })
      }
    }

    // Handle price inquiry - "البيتزا بكام", "سعر الكباب"
    const priceInquiryPatterns = [
      /^(.+?)\s*(?:بكام|بكم|سعره?[ا]?)\s*(?:\?|؟)?$/i,
      /^(?:سعر|ثمن|تمن)\s+(.+?)(?:\?|؟)?$/i,
      /^(?:بكام|بكم)\s+(.+?)(?:\?|؟)?$/i,
    ]

    for (const pattern of priceInquiryPatterns) {
      const priceMatch = lastUserMessage.match(pattern)
      if (priceMatch) {
        const productName = priceMatch[1].trim()
        if (productName.length < 2 || productName.includes(':')) continue

        console.log('🚀 [PRE-VALIDATION HANDLER] price_inquiry:', productName)

        const providerIdToSearch = selected_provider_id || memory?.current_provider?.id
        const searchResult = await performDirectSearch(productName, city_id, providerIdToSearch, memory)

        if (searchResult.quick_replies.length > 0) {
          return Response.json({
            reply: `💰 أسعار ${productName}:\n\n` + searchResult.quick_replies.slice(0, 5).map(qr => `• ${qr.title}`).join('\n') + '\n\nاختار واحد عشان تضيفه للسلة 👇',
            quick_replies: searchResult.quick_replies.slice(0, 5),
            selected_provider_id: providerIdToSearch || selected_provider_id,
            selected_category,
            memory,
          })
        }
        break
      }
    }

    // Handle provider_category:xxx payload - Show items from provider's menu category
    // This doesn't need city_id because it gets provider_id from the category itself
    if (lastUserMessage.startsWith('provider_category:')) {
      const categoryId = lastUserMessage.replace('provider_category:', '')
      if (isValidUUID(categoryId)) {
        console.log('🚀 [DIRECT HANDLER] provider_category:', categoryId)

        const supabase = await createClient()

        // Get category info
        const { data: category } = await supabase
          .from('provider_categories')
          .select('id, name_ar, provider_id')
          .eq('id', categoryId)
          .single()

        if (category) {
          // Get items in this category
          const { data: items } = await supabase
            .from('menu_items')
            .select('id, name_ar, price')
            .eq('provider_id', category.provider_id)
            .eq('category_id', categoryId)
            .eq('is_available', true)
            .order('display_order')
            .limit(10)

          if (items && items.length > 0) {
            return Response.json({
              reply: `📂 ${category.name_ar}\n\nاختار الصنف اللي تحبه 👇`,
              quick_replies: items.map(item => ({
                title: `${item.name_ar} (${item.price} ج.م)`,
                payload: `item:${item.id}`,
              })),
              selected_provider_id: category.provider_id,
              selected_category,
              memory: {
                ...memory,
                current_provider: memory?.current_provider,
              },
            })
          } else {
            return Response.json({
              reply: `مفيش منتجات متاحة في ${category.name_ar} دلوقتي 😕`,
              quick_replies: [
                { title: '📋 شوف المنيو', payload: `navigate:/ar/providers/${category.provider_id}` },
                { title: '🏠 الأقسام', payload: 'categories' },
              ],
              selected_provider_id: category.provider_id,
              selected_category,
              memory,
            })
          }
        }
      }
    }

    // Handle item:xxx payload - Show item details (doesn't need city_id)
    if (lastUserMessage.startsWith('item:')) {
      const itemId = lastUserMessage.replace('item:', '')
      if (isValidUUID(itemId)) {
        console.log('🚀 [PRE-VALIDATION HANDLER] item:', itemId)

        const result = await handleItemPayload(itemId, selected_provider_id)
        return Response.json({
          reply: result.reply,
          quick_replies: result.quick_replies,
          cart_action: result.cart_action,
          selected_provider_id: result.selected_provider_id || selected_provider_id,
          selected_provider_category: selected_provider_category,
          selected_category: selected_category,
          memory: result.memory || memory,
        })
      }
    }

    // Handle variant:xxx payload (doesn't need city_id)
    if (lastUserMessage.startsWith('variant:')) {
      const variantId = lastUserMessage.replace('variant:', '')
      if (isValidUUID(variantId)) {
        console.log('🚀 [PRE-VALIDATION HANDLER] variant:', variantId)

        const result = await handleVariantPayload(variantId, memory as ChatMemory)
        return Response.json({
          reply: result.reply,
          quick_replies: result.quick_replies,
          cart_action: result.cart_action,
          selected_provider_id: result.selected_provider_id || selected_provider_id,
          selected_provider_category: selected_provider_category,
          selected_category: selected_category,
          memory: result.memory || memory,
        })
      }
    }

    // Handle qty:x payload (doesn't need city_id)
    if (lastUserMessage.startsWith('qty:')) {
      const qtyStr = lastUserMessage.replace('qty:', '')
      const quantity = parseInt(qtyStr, 10)
      if (quantity > 0 && memory?.pending_item) {
        console.log('🚀 [PRE-VALIDATION HANDLER] qty:', quantity)

        const result = handleQuantityInput(quantity, memory as ChatMemory, cart_provider_id, cart_provider_name)
        if (result) {
          return Response.json({
            reply: result.reply,
            quick_replies: result.quick_replies,
            cart_action: result.cart_action,
            selected_provider_id: result.selected_provider_id || selected_provider_id,
            selected_provider_category: selected_provider_category,
            selected_category: selected_category,
            memory: result.memory,
          })
        }
      }
    }

    // Handle quantity input when awaiting_quantity is true (doesn't need city_id)
    if (memory?.awaiting_quantity && memory?.pending_item) {
      const quantity = parseArabicQuantity(lastUserMessage)
      if (quantity > 0) {
        console.log('🚀 [PRE-VALIDATION HANDLER] parsed quantity:', quantity, 'from:', lastUserMessage)

        const result = handleQuantityInput(quantity, memory as ChatMemory, cart_provider_id, cart_provider_name)
        if (result) {
          return Response.json({
            reply: result.reply,
            quick_replies: result.quick_replies,
            cart_action: result.cart_action,
            selected_provider_id: result.selected_provider_id || selected_provider_id,
            selected_provider_category: selected_provider_category,
            selected_category: selected_category,
            memory: result.memory,
          })
        }
      }
    }

    // Handle confirm_add payload (doesn't need city_id)
    if (lastUserMessage === 'confirm_add' && memory?.awaiting_confirmation && memory?.pending_item) {
      console.log('🚀 [PRE-VALIDATION HANDLER] confirm_add')

      const result = handleConfirmAdd(memory as ChatMemory)
      if (result) {
        return Response.json({
          reply: result.reply,
          quick_replies: result.quick_replies,
          cart_action: result.cart_action,
          selected_provider_id: result.selected_provider_id || selected_provider_id,
          selected_provider_category: selected_provider_category,
          selected_category: selected_category,
          memory: result.memory,
        })
      }
    }

    // Handle clear_cart_and_add payload (doesn't need city_id)
    if (lastUserMessage === 'clear_cart_and_add' && memory?.awaiting_cart_clear && memory?.pending_item) {
      console.log('🚀 [PRE-VALIDATION HANDLER] clear_cart_and_add')

      const result = handleClearCartAndAdd(memory as ChatMemory)
      if (result) {
        return Response.json({
          reply: result.reply,
          quick_replies: result.quick_replies,
          cart_action: result.cart_action,
          selected_provider_id: result.selected_provider_id || selected_provider_id,
          selected_provider_category: selected_provider_category,
          selected_category: selected_category,
          memory: result.memory,
        })
      }
    }

    // Handle provider:xxx payload (doesn't need city_id - just looks up provider by ID)
    if (lastUserMessage.startsWith('provider:')) {
      const providerId = lastUserMessage.replace('provider:', '')
      if (isValidUUID(providerId)) {
        console.log('🚀 [PRE-VALIDATION HANDLER] provider:', providerId)

        const result = await handleProviderPayload(providerId, city_id || '')
        return Response.json({
          reply: result.reply,
          quick_replies: result.quick_replies,
          cart_action: result.cart_action,
          selected_provider_id: result.selected_provider_id || providerId,
          selected_provider_category: selected_provider_category,
          selected_category: selected_category,
          memory: result.memory || memory,
        })
      }
    }

    // Handle add_more:xxx payload (doesn't need city_id)
    if (lastUserMessage.startsWith('add_more:')) {
      const providerId = lastUserMessage.replace('add_more:', '')
      if (isValidUUID(providerId)) {
        console.log('🚀 [PRE-VALIDATION HANDLER] add_more:', providerId)

        const supabase = await createClient()
        const { data: provider } = await supabase
          .from('providers')
          .select('name_ar')
          .eq('id', providerId)
          .single()

        const providerName = provider?.name_ar || 'المتجر'

        return Response.json({
          reply: `عايز تضيف إيه من ${providerName}؟ 🍽️\n\nاكتب اسم الصنف وهلاقيهولك...`,
          quick_replies: [
            { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
            { title: '📋 شوف المنيو', payload: `navigate:/ar/providers/${providerId}` },
          ],
          selected_provider_id: providerId,
          selected_provider_category: selected_provider_category,
          selected_category: selected_category,
          memory: {
            ...memory,
            pending_item: null,
            pending_variant: null,
            pending_quantity: null,
            awaiting_quantity: false,
            awaiting_confirmation: false,
            current_provider: {
              id: providerId,
              name_ar: providerName,
            },
          },
        })
      }
    }

    // Validate city_id
    if (!city_id) {
      return Response.json({
        reply: 'اختار المدينة من فوق الأول 🏙️',
        quick_replies: [],
      })
    }

    // Validate selected_provider_id if provided
    if (selected_provider_id && !isValidUUID(selected_provider_id)) {
      console.warn('🚨 [AI INVALID UUID] selected_provider_id:', selected_provider_id)
    }

    // Rate limiting
    const rateLimitKey = customer_id || request.headers.get('x-forwarded-for') || 'anonymous'
    if (!checkRateLimit(rateLimitKey)) {
      return Response.json({
        reply: 'لقد تجاوزت الحد الأقصى للرسائل. جرب بكرة! 😊',
        quick_replies: [],
      }, { status: 429 })
    }

    // =======================================================================
    // 🚀 DIRECT PAYLOAD HANDLERS - Handle button payloads WITHOUT calling GPT
    // This ensures consistent, fast responses for button clicks
    // =======================================================================

    // Handle category:xxx payload
    if (lastUserMessage.startsWith('category:')) {
      const categoryCode = lastUserMessage.replace('category:', '')
      console.log('🚀 [DIRECT HANDLER] category:', categoryCode)

      const result = await handleCategoryPayload(categoryCode, city_id)
      return Response.json({
        reply: result.reply,
        quick_replies: result.quick_replies,
        cart_action: result.cart_action,
        selected_provider_id: result.selected_provider_id || selected_provider_id,
        selected_provider_category: selected_provider_category,
        selected_category: result.selected_category || selected_category,
        memory: result.memory || memory,
      })
    }

    // =======================================================================
    // Handle clear cart request - "امسح السلة", "فضي السلة", etc.
    // =======================================================================
    const isClearCartRequest = /^(?:امسح|امحي|فضي|فرغ|نظف|شيل)\s*(?:ال)?سل[ةه]/i.test(lastUserMessage) ||
      lastUserMessage === 'clear_cart' ||
      lastUserMessage === '🗑️ امسح السلة'

    if (isClearCartRequest) {
      console.log('🚀 [DIRECT HANDLER] clear_cart')
      return Response.json({
        reply: 'تمام! ✅ تم تفريغ السلة.\n\nتحب تطلب من أنهي مكان؟',
        quick_replies: [
          { title: '🏠 الأقسام', payload: 'categories' },
          { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
          { title: '🔥 العروض', payload: 'show_promotions' },
        ],
        cart_action: {
          type: 'CLEAR_CART' as const,
          provider_id: '',
          menu_item_id: '',
          menu_item_name_ar: '',
          quantity: 0,
          unit_price: 0,
        },
        selected_provider_id: null, // null (not undefined) so JSON includes it
        selected_category: null,
        memory: {
          pending_item: null,
          pending_variant: null,
          pending_quantity: null,
          awaiting_quantity: false,
          awaiting_confirmation: false,
          current_provider: null, // Clear provider for city-wide search
        },
      })
    }

    // =======================================================================
    // Handle navigate: payload - Direct navigation commands
    // =======================================================================
    if (lastUserMessage.startsWith('navigate:')) {
      const targetRoute = lastUserMessage.replace('navigate:', '')
      console.log('🚀 [DIRECT HANDLER] navigate:', targetRoute)

      return Response.json({
        reply: 'تمام! 🚀',
        quick_replies: [
          { title: '➕ أضف المزيد', payload: 'categories' },
        ],
        navigate_to: targetRoute,
        selected_provider_id,
        selected_category,
        memory: { ...memory, pending_item: undefined, pending_variant: undefined, awaiting_quantity: false, awaiting_confirmation: false },
      })
    }

    // Handle go_to_cart payload (navigate to cart - frontend handles actual navigation)
    // Also handle Arabic variations like "اذهب للسلة", "السلة", etc.
    const isGoToCart = lastUserMessage === 'go_to_cart' ||
      lastUserMessage === '🛒 اذهب للسلة' ||
      lastUserMessage === '🛒 فتح السلة' || // Direct match for the button text
      /^(?:اذهب|روح|خدني)?\s*(?:لل?سل[ةه]|للكارت|for cart|to cart)$/i.test(lastUserMessage) ||
      /^(?:افتح|فتح|شوف)\s*(?:ال)?سل[ةه]$/i.test(lastUserMessage)

    if (isGoToCart) {
      console.log('🚀 [DIRECT HANDLER] go_to_cart')

      // Phase 6: Show order summary before checkout
      if (cart_items && cart_items.length > 0) {
        let summary = '📋 **ملخص طلبك:**\n\n'
        let subtotal = 0

        for (const item of cart_items) {
          const variantText = item.variant_name_ar ? ` (${item.variant_name_ar})` : ''
          const itemTotal = item.quantity * item.unit_price
          subtotal += itemTotal
          summary += `• ${item.quantity}x ${item.name_ar}${variantText} - ${itemTotal} ج.م\n`
        }

        summary += `\n💵 **المجموع: ${subtotal} ج.م**`

        // Add delivery info if we have provider context
        if (cart_provider_id && isValidUUID(cart_provider_id)) {
          const supabase = await createClient()
          const { data: provider } = await supabase
            .from('providers')
            .select('delivery_fee, free_delivery_threshold')
            .eq('id', cart_provider_id)
            .single()

          if (provider) {
            const deliveryFee = provider.delivery_fee || 0
            const freeThreshold = provider.free_delivery_threshold

            if (freeThreshold && subtotal >= freeThreshold) {
              summary += '\n🚚 التوصيل: مجاني! 🎉'
            } else if (deliveryFee > 0) {
              summary += `\n🚚 التوصيل: ${deliveryFee} ج.م`
              summary += `\n💰 **الإجمالي: ${subtotal + deliveryFee} ج.م**`
              if (freeThreshold) {
                const remaining = freeThreshold - subtotal
                if (remaining > 0) {
                  summary += `\n\n💡 ضيف ${remaining} ج.م كمان والتوصيل هيبقى مجاني!`
                }
              }
            }
          }
        }

        summary += '\n\n✅ جاهز تكمل الطلب؟'

        return Response.json({
          reply: summary,
          quick_replies: [
            { title: '✅ أكمل الطلب', payload: 'navigate:/ar/cart' },
            { title: '➕ أضف حاجة كمان', payload: cart_provider_id ? `add_more:${cart_provider_id}` : 'categories' },
            { title: '🗑️ فضي السلة', payload: 'clear_cart' },
          ],
          navigate_to: '/ar/cart',
          selected_provider_id,
          selected_category,
          memory: { ...memory, pending_item: undefined, pending_variant: undefined, awaiting_quantity: false, awaiting_confirmation: false },
        })
      }

      // Empty cart
      return Response.json({
        reply: getCartEmptyMessage(),
        quick_replies: [
          { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
          { title: '🛒 سوبر ماركت', payload: 'category:supermarket' },
        ],
        selected_provider_id,
        selected_category,
        memory: { ...memory, pending_item: undefined, pending_variant: undefined, awaiting_quantity: false, awaiting_confirmation: false },
      })
    }

    // =======================================================================
    // Handle cart content queries - "ايه اللي في السلة؟", "فيه ايه في السلة؟"
    // =======================================================================
    const isCartQuery = /^(?:ايه|ايش|فيه?\s*(?:ايه|ايش)|عايز اعرف)?(?:\s*اللي|\s*الي)?\s*(?:في|ف)\s*(?:ال)?سل[ةه]/i.test(lastUserMessage) ||
      /^(?:فيه?\s*(?:ايه|ايش))\s*(?:في|ف)\s*(?:ال)?سل[ةه]/i.test(lastUserMessage) ||
      /^(?:السل[ةه]\s*فيها?\s*(?:ايه|ايش))/i.test(lastUserMessage) ||
      /^(?:محتويات|محتوى)\s*(?:ال)?سل[ةه]/i.test(lastUserMessage)

    if (isCartQuery) {
      console.log('🚀 [DIRECT HANDLER] cart_query')
      // We don't have direct access to cart from backend
      // Best approach: tell user to check cart and offer navigation
      return Response.json({
        reply: 'عشان تشوف اللي في السلة، اضغط على أيقونة السلة في أعلى الشاشة 🛒\n\nأو اضغط هنا 👇',
        quick_replies: [
          { title: '🛒 فتح السلة', payload: 'navigate:/ar/cart' },
          { title: '➕ أضف حاجة جديدة', payload: 'categories' },
        ],
        navigate_to: '/ar/cart',
        selected_provider_id,
        selected_category,
        memory,
      })
    }

    // =======================================================================
    // Handle reorder_last payload - Show items from user's last order
    // =======================================================================
    if (lastUserMessage === 'reorder_last' || lastUserMessage === 'اخر طلب' || lastUserMessage === 'آخر طلب' || lastUserMessage === '🔄 اخر طلب') {
      console.log('🚀 [DIRECT HANDLER] reorder_last')

      if (!customer_id) {
        return Response.json({
          reply: 'لازم تسجل دخول الأول عشان أقدر أجيبلك طلبك الأخير 🔐',
          quick_replies: [
            { title: '🏠 الأقسام', payload: 'categories' },
            { title: '🔥 العروض', payload: 'show_promotions' },
          ],
          selected_provider_id,
          selected_category,
          memory,
        })
      }

      const supabase = await createClient()

      console.log('🔄 [REORDER] Looking for orders for customer:', customer_id)

      // First try delivered/completed orders
      let { data: lastOrder } = await supabase
        .from('orders')
        .select('id, provider_id, status, providers(name_ar)')
        .eq('customer_id', customer_id)
        .in('status', ['delivered', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // If no delivered orders, try any recent order
      if (!lastOrder) {
        console.log('🔄 [REORDER] No delivered orders, trying any order...')
        const { data: anyOrder } = await supabase
          .from('orders')
          .select('id, provider_id, status, providers(name_ar)')
          .eq('customer_id', customer_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (anyOrder) {
          console.log('🔄 [REORDER] Found order with status:', anyOrder.status)
          lastOrder = anyOrder
        }
      }

      if (!lastOrder) {
        console.log('🔄 [REORDER] No orders found for customer:', customer_id)
        return Response.json({
          reply: 'مش لاقي طلبات سابقة ليك 😕 يلا نبدأ طلب جديد!',
          quick_replies: [
            { title: '🏠 الأقسام', payload: 'categories' },
            { title: '🔥 العروض', payload: 'show_promotions' },
          ],
          selected_provider_id,
          selected_category,
          memory,
        })
      }

      console.log('🔄 [REORDER] Found order:', lastOrder.id, 'status:', lastOrder.status)

      // Get order items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, menu_item_id, item_name_ar, unit_price, quantity')
        .eq('order_id', lastOrder.id)
        .limit(10)

      if (!orderItems || orderItems.length === 0) {
        return Response.json({
          reply: 'مش لاقي تفاصيل الطلب السابق 😕 يلا نبدأ طلب جديد!',
          quick_replies: [
            { title: '🏠 الأقسام', payload: 'categories' },
            { title: '🔥 العروض', payload: 'show_promotions' },
          ],
          selected_provider_id,
          selected_category,
          memory,
        })
      }

      const providerData = lastOrder.providers as { name_ar: string } | { name_ar: string }[] | null
      const providerName = Array.isArray(providerData) ? providerData[0]?.name_ar : providerData?.name_ar || 'المتجر'

      // Build quick replies for order items
      const validOrderItems = orderItems.filter(item => item.menu_item_id)
      const quickReplies: QuickReply[] = validOrderItems.map(item => ({
        title: `${item.item_name_ar} (${item.unit_price} ج.م)`,
        payload: `item:${item.menu_item_id}`,
      }))

      if (quickReplies.length === 0) {
        return Response.json({
          reply: 'الأصناف اللي طلبتها قبل كده مش متاحة دلوقتي 😕 يلا نبدأ طلب جديد!',
          quick_replies: [
            { title: '🏠 الأقسام', payload: 'categories' },
            { title: '🔥 العروض', payload: 'show_promotions' },
          ],
          selected_provider_id,
          selected_category,
          memory,
        })
      }

      // Add "Add All to Cart" button if multiple items
      if (validOrderItems.length > 1) {
        quickReplies.unshift({
          title: `🛒 ضيف الكل للسلة (${validOrderItems.length} أصناف)`,
          payload: 'add_all_reorder_items',
        })
      }

      // Add "add more items" option instead of full menu
      quickReplies.push({
        title: '➕ أضف صنف آخر',
        payload: `add_more:${lastOrder.provider_id}`,
      })

      // Store reorder items in memory for "add all" functionality
      const reorderItems = validOrderItems.map(item => ({
        menu_item_id: item.menu_item_id,
        name_ar: item.item_name_ar,
        price: item.unit_price,
        quantity: item.quantity || 1,
      }))

      return Response.json({
        reply: `🔄 آخر طلب ليك كان من ${providerName}!\n\nتحب تطلب نفس الأصناف تاني؟ 👇`,
        quick_replies: quickReplies.slice(0, 10),
        selected_provider_id: lastOrder.provider_id,
        selected_category,
        memory: {
          // CLEAR pending states to avoid conflicts
          pending_item: undefined,
          pending_variant: undefined,
          pending_quantity: undefined,
          awaiting_quantity: false,
          awaiting_confirmation: false,
          // Set current provider and store reorder items
          current_provider: {
            id: lastOrder.provider_id,
            name_ar: providerName,
          },
          reorder_items: reorderItems,
          reorder_provider_id: lastOrder.provider_id,
          reorder_provider_name: providerName,
        },
      })
    }

    // =======================================================================
    // Handle add_all_reorder_items payload - Add all items from last order to cart
    // Also handles text patterns like "اه ضيفهم", "ضيفهم كلهم", "نفس الاصناف"
    // =======================================================================
    const isAddAllReorder = lastUserMessage === 'add_all_reorder_items' ||
      /^(?:اه|أيوه|اي|نعم|تمام)?\s*(?:ضيفهم|ضيفيهم|اضيفهم|أضيفهم|حطهم|خدهم)(?:\s*(?:كلهم|كلها|للسلة|في السلة))?$/i.test(lastUserMessage) ||
      /^(?:اه|أيوه|اي|نعم|تمام)\s*(?:نفس الاصناف|نفس الحاجات|زي ما هو|زي الاول)$/i.test(lastUserMessage)

    if (isAddAllReorder && memory?.reorder_items && Array.isArray(memory.reorder_items) && memory.reorder_items.length > 0) {
      console.log('🚀 [DIRECT HANDLER] add_all_reorder_items:', memory.reorder_items.length, 'items')

      const reorderItems = memory.reorder_items as Array<{
        menu_item_id: string
        name_ar: string
        price: number
        quantity: number
      }>
      const providerId = memory.reorder_provider_id as string
      const providerName = (memory.reorder_provider_name as string) || 'المتجر'

      // Build cart actions for all items
      const cartActions: CartAction[] = reorderItems.map(item => ({
        type: 'ADD_ITEM' as const,
        provider_id: providerId,
        menu_item_id: item.menu_item_id,
        menu_item_name_ar: item.name_ar,
        quantity: item.quantity,
        unit_price: item.price,
      }))

      // Calculate total
      const totalPrice = reorderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const itemsList = reorderItems.map(item => `• ${item.quantity}x ${item.name_ar}`).join('\n')

      return Response.json({
        reply: `تمام! ✅ ضفت كل الأصناف للسلة من ${providerName}:\n\n${itemsList}\n\n💰 الإجمالي: ${totalPrice} ج.م\n\nتحب تضيف حاجة تانية؟`,
        quick_replies: [
          { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
          { title: '➕ أضف صنف آخر', payload: `add_more:${providerId}` },
          { title: '📋 شوف المنيو', payload: `navigate:/ar/providers/${providerId}` },
        ],
        cart_actions: cartActions, // Multiple cart actions
        selected_provider_id: providerId,
        selected_category,
        memory: {
          // Clear reorder items and set current provider
          pending_item: undefined,
          pending_variant: undefined,
          pending_quantity: undefined,
          awaiting_quantity: false,
          awaiting_confirmation: false,
          reorder_items: undefined,
          reorder_provider_id: undefined,
          reorder_provider_name: undefined,
          current_provider: {
            id: providerId,
            name_ar: providerName,
          },
        },
      })
    }

    // Handle "search elsewhere" - Clear provider context and show categories
    const isSearchElsewhere = lastUserMessage === '🔍 ابحث في مكان تاني' ||
      /^(?:ابحث|دور)\s*(?:في|ف)?\s*(?:مكان|محل)\s*(?:تاني|اخر|آخر)$/i.test(lastUserMessage)

    if (isSearchElsewhere) {
      console.log('🚀 [DIRECT HANDLER] search_elsewhere - clearing provider context')
      return Response.json({
        reply: 'تمام! 🔍 هدور في كل المتاجر المتاحة.\n\nاختار القسم اللي تحبه 👇',
        quick_replies: [
          { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
          { title: '🛒 سوبر ماركت', payload: 'category:grocery' },
          { title: '🍰 البن والحلويات', payload: 'category:coffee_patisserie' },
          { title: '🥦 خضروات وفواكه', payload: 'category:vegetables_fruits' },
        ],
        selected_provider_id: null, // null (not undefined) so JSON includes it
        selected_category: null,
        memory: {
          pending_item: null,
          pending_variant: null,
          pending_quantity: null,
          awaiting_quantity: false,
          awaiting_confirmation: false,
          current_provider: null, // CLEAR provider context!
        },
      })
    }

    // Handle special payloads
    if (lastUserMessage === 'categories' || lastUserMessage === 'الأقسام' || lastUserMessage === '🏠 الأقسام') {
      console.log('🚀 [DIRECT HANDLER] categories')
      return Response.json({
        reply: 'اختار القسم اللي تحبه 👇',
        quick_replies: [
          { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
          { title: '🛒 سوبر ماركت', payload: 'category:grocery' },
          { title: '🍰 البن والحلويات', payload: 'category:coffee_patisserie' },
          { title: '🥦 خضروات وفواكه', payload: 'category:vegetables_fruits' },
        ],
        selected_provider_id: null, // null (not undefined) so JSON includes it
        selected_category: null,
        // IMPORTANT: Clear current_provider to allow city-wide search
        memory: {
          pending_item: null,
          pending_variant: null,
          pending_quantity: null,
          awaiting_quantity: false,
          awaiting_confirmation: false,
          current_provider: null, // null (not undefined) for JSON
        },
      })
    }

    // =======================================================================
    // Handle show_promotions payload - Direct handler without GPT
    // Shows BOTH promotions AND product-level discounts with item buttons
    // =======================================================================
    if (lastUserMessage === 'show_promotions' || lastUserMessage === 'العروض' || lastUserMessage === 'promotions' || lastUserMessage === '🔥 العروض') {
      console.log('🚀 [DIRECT HANDLER] show_promotions')

      const supabase = await createClient()
      const now = new Date().toISOString()

      // 1. Get promotions from promotions table
      let promotionsQuery = supabase
        .from('promotions')
        .select('*, providers!inner(id, name_ar, city_id)')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)
        .eq('providers.city_id', city_id)

      if (selected_provider_id && isValidUUID(selected_provider_id)) {
        promotionsQuery = promotionsQuery.eq('provider_id', selected_provider_id)
      }

      const { data: promotions } = await promotionsQuery.limit(10)

      // For specific promotions, get affected products
      const promotionsWithProducts = await Promise.all(
        (promotions || []).map(async (promo) => {
          if (promo.applies_to === 'specific' && promo.product_ids && Array.isArray(promo.product_ids) && promo.product_ids.length > 0) {
            const { data: products } = await supabase
              .from('menu_items')
              .select('id, name_ar, price, provider_id')
              .in('id', promo.product_ids)
              .limit(10)
            return { ...promo, affected_products: products || [] }
          }
          return { ...promo, affected_products: [] }
        })
      )

      // 2. Get items with product-level discounts (original_price > price)
      let discountedQuery = supabase
        .from('menu_items')
        .select('id, name_ar, price, original_price, provider_id, providers!inner(id, name_ar, city_id)')
        .eq('is_available', true)
        .eq('providers.city_id', city_id)
        .not('original_price', 'is', null)
        .gt('original_price', 0)

      if (selected_provider_id && isValidUUID(selected_provider_id)) {
        discountedQuery = discountedQuery.eq('provider_id', selected_provider_id)
      }

      const { data: discountedItems } = await discountedQuery.limit(20)

      // Filter actual discounts and calculate percentages
      const actualDiscountedItems = (discountedItems || [])
        .filter(item => item.original_price && item.original_price > item.price)
        .map(item => ({
          ...item,
          discount_percentage: Math.round(((item.original_price - item.price) / item.original_price) * 100),
        }))
        .sort((a, b) => b.discount_percentage - a.discount_percentage) // Sort by highest discount

      // Build response
      const quickReplies: QuickReply[] = []
      let replyText = ''

      // Add specific promotion products as item buttons
      for (const promo of promotionsWithProducts) {
        if (promo.affected_products && promo.affected_products.length > 0) {
          for (const item of promo.affected_products.slice(0, 4)) {
            // Check for discount based on promotion type and discount_value
            // Database schema: type = 'percentage' | 'fixed' | 'buy_x_get_y', discount_value = number
            let discountText = ''
            let displayPrice = item.price

            if (promo.type === 'percentage' && promo.discount_value && promo.discount_value > 0) {
              discountText = ` -${promo.discount_value}%`
              displayPrice = Math.round(item.price * (1 - promo.discount_value / 100))
            } else if (promo.type === 'fixed' && promo.discount_value && promo.discount_value > 0) {
              discountText = ` -${promo.discount_value} ج.م`
              displayPrice = Math.max(0, item.price - promo.discount_value)
            } else if (promo.type === 'buy_x_get_y') {
              discountText = ` 🎁 اشتري ${promo.buy_quantity || 1} واحصل على ${promo.get_quantity || 1}`
            } else if (promo.name_ar) {
              // Show promotion name if no specific discount value
              discountText = ` 🏷️`
            }

            quickReplies.push({
              title: `🏷️ ${item.name_ar} (${displayPrice} ج.م)${discountText}`,
              payload: `item:${item.id}`,
            })
          }
        }
      }

      // Add discounted items as item buttons
      for (const item of actualDiscountedItems.slice(0, 8)) {
        // Avoid duplicates
        if (!quickReplies.some(qr => qr.payload === `item:${item.id}`)) {
          // Handle providers which could be array or object from Supabase join
          const providersData = item.providers as { name_ar: string }[] | { name_ar: string } | null
          const providerName = Array.isArray(providersData)
            ? providersData[0]?.name_ar || ''
            : providersData?.name_ar || ''
          quickReplies.push({
            title: `🔥 ${item.name_ar} (${item.price} ج.م) -${item.discount_percentage}% ${providerName}`,
            payload: `item:${item.id}`,
          })
        }
      }

      // Build reply text
      if (quickReplies.length > 0) {
        const promoCount = promotionsWithProducts.filter(p => p.affected_products && p.affected_products.length > 0).length
        const discountCount = actualDiscountedItems.length
        replyText = `🔥 لقيت ${quickReplies.length} عرض متاح دلوقتي!\n\n`
        if (promoCount > 0) {
          replyText += `🏷️ ${promoCount} عرض خاص\n`
        }
        if (discountCount > 0) {
          replyText += `💰 ${discountCount} منتج بخصم مباشر\n`
        }
        replyText += '\nاختار العرض اللي يعجبك 👇'
      } else {
        replyText = 'مفيش عروض متاحة دلوقتي 😕 جرب تدور في الأقسام'
        quickReplies.push(
          { title: '🏠 الأقسام', payload: 'categories' },
          { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' }
        )
      }

      return Response.json({
        reply: replyText,
        quick_replies: quickReplies.slice(0, 10),
        selected_provider_id,
        selected_category,
        memory,
      })
    }

    // =======================================================================
    // Handle show_popular payload - Show most popular/ordered items
    // =======================================================================
    if (lastUserMessage === 'show_popular' || lastUserMessage === 'الأكثر طلباً' || lastUserMessage === '⭐ الأكثر طلباً') {
      console.log('🚀 [DIRECT HANDLER] show_popular')

      const supabase = await createClient()

      // Get popular items based on is_popular flag or high order count
      let query = supabase
        .from('menu_items')
        .select('id, name_ar, price, provider_id, providers!inner(id, name_ar, city_id)')
        .eq('is_available', true)
        .eq('providers.city_id', city_id)
        .or('has_stock.eq.true,has_stock.is.null')
        .eq('is_popular', true)
        .limit(15)

      if (selected_provider_id && isValidUUID(selected_provider_id)) {
        query = query.eq('provider_id', selected_provider_id)
      }

      const { data: popularItems } = await query

      if (popularItems && popularItems.length > 0) {
        const quickReplies: QuickReply[] = popularItems.slice(0, 10).map(item => {
          const providerData = item.providers as { name_ar: string } | { name_ar: string }[] | null
          const providerName = Array.isArray(providerData) ? providerData[0]?.name_ar : providerData?.name_ar || ''
          return {
            title: `${item.name_ar} (${item.price} ج.م) - ${providerName}`,
            payload: `item:${item.id}`,
          }
        })

        return Response.json({
          reply: `⭐ الأكثر طلباً في مدينتك 👇`,
          quick_replies: quickReplies,
          selected_provider_id,
          selected_category,
          memory,
        })
      } else {
        return Response.json({
          reply: 'مفيش منتجات مميزة دلوقتي 😕 جرب تدور في الأقسام',
          quick_replies: [
            { title: '🏠 الأقسام', payload: 'categories' },
            { title: '🔥 العروض', payload: 'show_promotions' },
          ],
          selected_provider_id,
          selected_category,
          memory,
        })
      }
    }

    // =======================================================================
    // Handle show_nearby payload - Show nearest providers
    // =======================================================================
    if (lastUserMessage === 'show_nearby' || lastUserMessage === 'الأقرب' || lastUserMessage === '📍 الأقرب') {
      console.log('🚀 [DIRECT HANDLER] show_nearby')

      const supabase = await createClient()

      // Get providers in user's city (sorted by featured/rating)
      const { data: nearbyProviders } = await supabase
        .from('providers')
        .select('id, name_ar, category, rating, is_featured')
        .eq('city_id', city_id)
        .eq('status', 'open')
        .neq('name_ar', '')
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(10)

      if (nearbyProviders && nearbyProviders.length > 0) {
        const quickReplies: QuickReply[] = nearbyProviders.map(provider => {
          const ratingText = provider.rating ? ` ⭐${provider.rating}` : ''
          const featuredText = provider.is_featured ? ' 🌟' : ''
          return {
            title: `${provider.name_ar}${ratingText}${featuredText}`,
            payload: `provider:${provider.id}`,
          }
        })

        return Response.json({
          reply: `📍 أقرب المتاجر ليك 👇`,
          quick_replies: quickReplies,
          selected_provider_id,
          selected_category,
          memory,
        })
      } else {
        return Response.json({
          reply: 'مفيش متاجر قريبة منك دلوقتي 😕 جرب تدور في الأقسام',
          quick_replies: [
            { title: '🏠 الأقسام', payload: 'categories' },
            { title: '🔥 العروض', payload: 'show_promotions' },
          ],
          selected_provider_id,
          selected_category,
          memory,
        })
      }
    }

    // Handle category text buttons (in case sent as text instead of payload)
    const categoryTextMap: Record<string, string> = {
      '🍽️ مطاعم وكافيهات': 'restaurant_cafe',
      '🍕 مطاعم وكافيهات': 'restaurant_cafe',
      'مطاعم وكافيهات': 'restaurant_cafe',
      '🛒 سوبر ماركت': 'grocery',
      'سوبر ماركت': 'grocery',
      '🍰 البن والحلويات': 'coffee_patisserie',
      '☕ البن والحلويات': 'coffee_patisserie',
      'البن والحلويات': 'coffee_patisserie',
      '🥦 خضروات وفواكه': 'vegetables_fruits',
      '🥬 خضروات وفواكه': 'vegetables_fruits',
      'خضروات وفواكه': 'vegetables_fruits',
    }

    if (categoryTextMap[lastUserMessage]) {
      const categoryCode = categoryTextMap[lastUserMessage]
      console.log('🚀 [DIRECT HANDLER] category text:', lastUserMessage, '→', categoryCode)

      const result = await handleCategoryPayload(categoryCode, city_id)
      return Response.json({
        reply: result.reply,
        quick_replies: result.quick_replies,
        cart_action: result.cart_action,
        selected_provider_id: result.selected_provider_id || selected_provider_id,
        selected_provider_category: selected_provider_category,
        selected_category: result.selected_category || selected_category,
        memory: result.memory || memory,
      })
    }

    // =======================================================================
    // Handle search queries - Direct search without GPT
    // This fixes the inconsistent search results issue
    // Patterns: "كمان X", "في X", "الاقي X فين", "ولا X", "عايز X", "هطلب X"
    // =======================================================================

    // Pattern 0: "كمان X" / "وكمان X" / "برضو X" (also X / I also want X)
    // Uses current_provider from memory to search in the same provider first
    const kamanQueryMatch = lastUserMessage.match(/^(?:كمان|وكمان|برضو|برضه|وبرضو|ومعاه|ومعاها|زود|زودلي)\s+(.+?)$/i)
    if (kamanQueryMatch) {
      const searchQuery = kamanQueryMatch[1].trim()
      console.log('🚀 [DIRECT HANDLER] "كمان X" query:', searchQuery, 'current_provider:', memory?.current_provider)

      // Use current_provider from memory if available
      const providerIdToSearch = memory?.current_provider?.id || selected_provider_id

      if (providerIdToSearch && isValidUUID(providerIdToSearch)) {
        // Search in the current provider first
        const searchResult = await performDirectSearch(searchQuery, city_id, providerIdToSearch, memory)

        // If found items, return them
        if (searchResult.quick_replies.length > 0 && !searchResult.reply.includes('مش لاقي')) {
          return Response.json({
            ...searchResult,
            selected_provider_id: providerIdToSearch,
            selected_category,
          })
        }

        // If not found in current provider, search city-wide and inform user
        const cityWideResult = await performDirectSearch(searchQuery, city_id, undefined, memory)
        if (cityWideResult.quick_replies.length > 0 && !cityWideResult.reply.includes('مش لاقي')) {
          const providerName = memory?.current_provider?.name_ar || 'المتجر الحالي'
          return Response.json({
            reply: `مش لاقي ${searchQuery} في ${providerName}، بس لقيته في أماكن تانية 👇`,
            quick_replies: cityWideResult.quick_replies,
            selected_provider_id: providerIdToSearch,
            selected_category,
            memory,
          })
        }

        // Not found anywhere
        const providerName = memory?.current_provider?.name_ar || 'المتجر'
        return Response.json({
          reply: `مش لاقي ${searchQuery} في ${providerName} ولا في أماكن تانية. تحب تدور على حاجة مختلفة؟`,
          quick_replies: [
            { title: '➕ دور على صنف تاني', payload: `add_more:${providerIdToSearch}` },
            { title: '🏠 الأقسام', payload: 'categories' },
          ],
          selected_provider_id: providerIdToSearch,
          selected_category,
          memory,
        })
      } else {
        // No current provider, search city-wide
        const searchResult = await performDirectSearch(searchQuery, city_id, undefined, memory)
        return Response.json({
          ...searchResult,
          selected_provider_id,
          selected_category,
        })
      }
    }

    // Pattern 1: "الاقي X فين" / "ألاقي X فين" / "الاقي فين X" (where can I find X)
    // Handles both word orders: "الاقي البيض فين" AND "الاقي فين البيض"
    const ala2iQueryMatch = lastUserMessage.match(/^(?:الاقي|ألاقي|الاقى|ألاقى|لاقي|لاقى|هلاقي|هلاقى)\s+(.+?)\s+(?:فين|فن|وين)(?:\?|؟)?$/i)
    const ala2iReversedMatch = lastUserMessage.match(/^(?:الاقي|ألاقي|الاقى|ألاقى|لاقي|لاقى|هلاقي|هلاقى)\s+(?:فين|فن|وين)\s+(.+?)(?:\?|؟)?$/i)
    if (ala2iQueryMatch || ala2iReversedMatch) {
      const searchQuery = (ala2iQueryMatch?.[1] || ala2iReversedMatch?.[1])?.trim() || ''
      console.log('🚀 [DIRECT HANDLER] "الاقي X فين" query:', searchQuery)

      const searchResult = await performDirectSearch(searchQuery, city_id, selected_provider_id, memory)
      return Response.json(searchResult)
    }

    // Pattern 2: "ولا X" / "ومفيش X" (is there no X / checking if X exists)
    const walaQueryMatch = lastUserMessage.match(/^(?:ولا|ومفيش|معندكمش|مفيش|مش موجود)\s+(.+?)(?:\?|؟)?$/i)
    if (walaQueryMatch) {
      const searchQuery = walaQueryMatch[1].trim()
      console.log('🚀 [DIRECT HANDLER] "ولا X" query:', searchQuery)

      const searchResult = await performDirectSearch(searchQuery, city_id, selected_provider_id, memory)
      return Response.json(searchResult)
    }

    // Pattern 3: "عايز X" / "عاوز X" / "عايزين X" / "هطلب X" / "نفسي في X" (I want X / I'll order X)
    // Includes plural forms: عايزين, عاوزين
    // Now supports quantity: "عايز 2 بيتزا" or "عايز اتنين بيتزا"
    // Uses current_provider from memory as fallback
    const ayezQueryMatch = lastUserMessage.match(/^(?:عايز|عايزين|عاوز|عاوزين|عاوزه|عايزه|هطلب|هنطلب|نفسي في|نفسي فى|ابي|أبي|ابغى|أبغى|نبي|نبغى)\s+(.+?)$/i)
    if (ayezQueryMatch) {
      const rawQuery = ayezQueryMatch[1].trim()
      // Extract quantity from search query (e.g., "2 بيتزا" → quantity=2, product="بيتزا")
      const { quantity, product: searchQuery } = extractQuantityFromSearch(rawQuery)
      const providerIdToSearch = selected_provider_id || memory?.current_provider?.id
      console.log('🚀 [DIRECT HANDLER] "عايز X" query:', searchQuery, 'quantity:', quantity, 'provider:', providerIdToSearch)

      const searchResult = await performDirectSearch(searchQuery, city_id, providerIdToSearch, memory)

      // Store quantity in memory if > 1 so it's used when item is selected
      const updatedMemory = {
        ...searchResult.memory,
        pending_quantity: quantity > 1 ? quantity : undefined,
      }

      return Response.json({
        ...searchResult,
        reply: quantity > 1
          ? `${searchResult.reply}\n\n📝 هضيف ${quantity} من اللي تختاره`
          : searchResult.reply,
        selected_provider_id: providerIdToSearch || selected_provider_id,
        selected_category,
        memory: updatedMemory,
      })
    }

    // Pattern 3.5: "عنده X" / "عندهم X" / "معاه X" (does he/they have X - asking about current provider)
    const andoQueryMatch = lastUserMessage.match(/^(?:عنده|عندهم|عندها|معاه|معاهم|يبيع)\s+(.+?)(?:\?|؟)?$/i)
    if (andoQueryMatch) {
      const searchQuery = andoQueryMatch[1].trim()
      const providerIdToSearch = selected_provider_id || memory?.current_provider?.id
      console.log('🚀 [DIRECT HANDLER] "عنده X" query:', searchQuery, 'provider:', providerIdToSearch)

      if (providerIdToSearch && isValidUUID(providerIdToSearch)) {
        const searchResult = await performDirectSearch(searchQuery, city_id, providerIdToSearch, memory)
        return Response.json({
          ...searchResult,
          selected_provider_id: providerIdToSearch,
          selected_category,
        })
      } else {
        // No provider context, search city-wide
        const searchResult = await performDirectSearch(searchQuery, city_id, undefined, memory)
        return Response.json({
          ...searchResult,
          selected_provider_id,
          selected_category,
        })
      }
    }

    // Pattern 4a: Cross-provider search - "في X في مطعم Y" / "في X عند Y"
    // Handles user asking about products in a SPECIFIC provider (different from current context)
    const crossProviderMatch = lastUserMessage.match(/^(?:في|فى|فيه|فية)\s+(.+?)\s+(?:في|فى|عند|من)\s+(?:مطعم\s+|محل\s+)?(.+?)(?:\?|؟)?$/i)
    if (crossProviderMatch) {
      const searchQuery = crossProviderMatch[1].trim()
      const providerName = crossProviderMatch[2].trim()
      console.log('🚀 [DIRECT HANDLER] cross-provider search:', searchQuery, 'in provider:', providerName)

      // Try to resolve the provider by name
      const resolved = await resolveProviderByName(providerName, city_id)
      if (resolved) {
        const searchResult = await performDirectSearch(searchQuery, city_id, resolved.id, memory)
        return Response.json({
          ...searchResult,
          selected_provider_id: resolved.id,
          selected_category,
          memory: { ...memory, current_provider: { id: resolved.id, name_ar: resolved.name_ar } },
        })
      } else {
        // Provider not found
        return Response.json({
          reply: `مش لاقي ${providerName} 😕 جرب تدور في الأقسام أو اكتب اسم المطعم صح`,
          quick_replies: [
            { title: '🏠 الأقسام', payload: 'categories' },
            { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
          ],
          selected_provider_id,
          selected_category,
          memory,
        })
      }
    }

    // Pattern 4b: "ايه اللي في/عند [provider]" - What's at this provider?
    const whatAtProviderMatch = lastUserMessage.match(/^(?:ايه|ايش|شو|عايز اعرف)\s*(?:اللي|الي)?\s*(?:موجود|متاح)?\s*(?:في|فى|عند|من)\s+(?:مطعم\s+|محل\s+)?(.+?)(?:\?|؟)?$/i)
    if (whatAtProviderMatch) {
      const providerName = whatAtProviderMatch[1].trim()
      console.log('🚀 [DIRECT HANDLER] what at provider:', providerName)

      const resolved = await resolveProviderByName(providerName, city_id)
      if (resolved) {
        const result = await handleProviderPayload(resolved.id, city_id)
        return Response.json({
          reply: result.reply,
          quick_replies: result.quick_replies,
          selected_provider_id: resolved.id,
          selected_category,
          memory: { ...memory, current_provider: { id: resolved.id, name_ar: resolved.name_ar } },
        })
      } else {
        return Response.json({
          reply: `مش لاقي ${providerName} 😕 جرب تدور في الأقسام`,
          quick_replies: [
            { title: '🏠 الأقسام', payload: 'categories' },
            { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
          ],
          selected_provider_id,
          selected_category,
          memory,
        })
      }
    }

    // Pattern 4: "في X" / "فيه X" (is there X?)
    // Uses current_provider from memory as fallback
    const fiQueryMatch = lastUserMessage.match(/^(?:في|فى|فيه|فية)\s+(.+?)(?:\?|؟)?$/i)
    if (fiQueryMatch) {
      const searchQuery = fiQueryMatch[1].trim()
      const providerIdToSearch = selected_provider_id || memory?.current_provider?.id
      console.log('🚀 [DIRECT HANDLER] "في X" query:', searchQuery, 'provider:', providerIdToSearch)

      const searchResult = await performDirectSearch(searchQuery, city_id, providerIdToSearch, memory)
      return Response.json({
        ...searchResult,
        selected_provider_id: providerIdToSearch || selected_provider_id,
        selected_category,
      })
    }

    // Handle provider name text (when user types provider name directly)
    // This is useful when user selects from search results like "الصفا" or "سلطان بيتزا"
    const providerNameMatch = lastUserMessage.match(/^(?:📍\s*)?(.+)$/)
    if (providerNameMatch && lastUserMessage.length <= 30 && !lastUserMessage.includes(':')) {
      const potentialProviderName = providerNameMatch[1].trim()

      // Check if this looks like a provider name (not a product search)
      const isLikelyProviderName = !PRODUCT_SEARCH_KEYWORDS.some(kw => lastUserMessage.includes(kw)) &&
                                    !GREETING_KEYWORDS.some(kw => lastUserMessage.includes(kw)) &&
                                    !PROMOTION_KEYWORDS.some(kw => lastUserMessage.includes(kw))

      if (isLikelyProviderName) {
        // Try to resolve provider by name
        const resolved = await resolveProviderByName(potentialProviderName, city_id)
        if (resolved) {
          console.log('🚀 [DIRECT HANDLER] provider name:', potentialProviderName, '→', resolved.id)

          const result = await handleProviderPayload(resolved.id, city_id)
          return Response.json({
            reply: result.reply,
            quick_replies: result.quick_replies,
            cart_action: result.cart_action,
            selected_provider_id: result.selected_provider_id || resolved.id,
            selected_provider_category: selected_provider_category,
            selected_category: selected_category,
            memory: result.memory || memory,
          })
        }
      }
    }

    // =======================================================================
    // 🧠 SMART INTENT EXTRACTION - Use GPT to understand ANY phrase
    // This handles all the variations like "محتاج بيض", "جيبلي بيض", "ممكن بيض", etc.
    // =======================================================================

    // Check if message looks like it might be a product search (has Arabic text, not a command)
    const looksLikeProductSearch = /[؀-ۿ]/.test(lastUserMessage) && // Has Arabic
      !lastUserMessage.startsWith('category:') &&
      !lastUserMessage.startsWith('provider:') &&
      !lastUserMessage.startsWith('item:') &&
      !lastUserMessage.startsWith('variant:') &&
      !lastUserMessage.startsWith('qty:') &&
      lastUserMessage.length > 2 &&
      lastUserMessage.length < 100

    if (looksLikeProductSearch) {
      try {
        // Use a quick GPT call to extract the search intent
        const openai = getOpenAI()
        const extractionResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `أنت مساعد لاستخراج نية المستخدم. حلل الرسالة وأرجع JSON فقط:
{
  "intent": "product_search" | "greeting" | "question" | "other",
  "product": "اسم المنتج المطلوب (لو intent = product_search)" | null
}

أمثلة:
- "عايز بيض" → {"intent": "product_search", "product": "بيض"}
- "محتاج شوية بيض" → {"intent": "product_search", "product": "بيض"}
- "جيبلي كباب" → {"intent": "product_search", "product": "كباب"}
- "ممكن بيتزا" → {"intent": "product_search", "product": "بيتزا"}
- "في تونة؟" → {"intent": "product_search", "product": "تونة"}
- "البيض فين" → {"intent": "product_search", "product": "بيض"}
- "اهلا" → {"intent": "greeting", "product": null}
- "احنا فين؟" → {"intent": "question", "product": null}

أرجع JSON فقط بدون أي نص إضافي.`
            },
            { role: 'user', content: lastUserMessage }
          ],
          temperature: 0,
          max_tokens: 100,
        })

        const extractionContent = extractionResponse.choices[0].message.content || ''
        console.log('🧠 [SMART EXTRACTION] Raw response:', extractionContent)

        // Parse the JSON response
        const jsonMatch = extractionContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0])
          console.log('🧠 [SMART EXTRACTION] Parsed:', extracted)

          if (extracted.intent === 'product_search' && extracted.product) {
            // Use our direct search with the extracted product name
            const providerIdToSearch = selected_provider_id || memory?.current_provider?.id
            console.log('🧠 [SMART EXTRACTION] Searching for:', extracted.product, 'in provider:', providerIdToSearch)

            const searchResult = await performDirectSearch(extracted.product, city_id, providerIdToSearch, memory)
            return Response.json({
              ...searchResult,
              selected_provider_id: providerIdToSearch || selected_provider_id,
              selected_category,
            })
          }

          if (extracted.intent === 'greeting') {
            // Show categories for greeting
            return Response.json({
              reply: 'أهلاً بيك! 👋 اختار القسم اللي تحبه 👇',
              quick_replies: [
                { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
                { title: '🛒 سوبر ماركت', payload: 'category:grocery' },
                { title: '🍰 البن والحلويات', payload: 'category:coffee_patisserie' },
                { title: '🥦 خضروات وفواكه', payload: 'category:vegetables_fruits' },
              ],
              selected_provider_id,
              selected_category,
              memory,
            })
          }
        }
      } catch (extractionError) {
        console.warn('🧠 [SMART EXTRACTION] Failed:', extractionError)
        // Continue to normal GPT fallback
      }
    }

    // =======================================================================
    // 🤖 GPT FALLBACK - For complex queries that don't match any pattern
    // =======================================================================

    // Build context as part of system prompt (NOT as a separate message)
    // This avoids the "double system message" issue
    const contextInfo = `
[Current Context - REQUIRED for all tool calls]
city_id: ${city_id}
${customer_id ? `customer_id: ${customer_id}` : ''}
${selected_provider_id && isValidUUID(selected_provider_id) ? `selected_provider_id: ${selected_provider_id}` : ''}
${selected_provider_category ? `selected_provider_category: ${selected_provider_category}` : ''}
${selected_category ? `selected_category: ${selected_category}` : ''}
${memory ? `memory: ${JSON.stringify(memory)}` : ''}
`

    // Convert messages to OpenAI format (NO extra system message - context is in SYSTEM_PROMPT)
    const openaiMessages: ChatCompletionMessageParam[] = messages.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // 🎯 INTENT ROUTER: Detect intent and determine forced tool
    const detectedIntent = detectIntent(
      lastUserMessage,
      selected_provider_id,
      selected_category
    )

    console.log('🎯 [INTENT DETECTION RESULT]', {
      message: lastUserMessage.slice(0, 50),
      intent: detectedIntent.type,
      confidence: detectedIntent.confidence,
      forcedTool: detectedIntent.forcedTool,
    })

    // Process with tools (context is passed as part of the system prompt)
    // Pass forced tool if intent has high confidence
    const result = await processWithTools(
      openaiMessages,
      city_id,
      contextInfo,
      detectedIntent.confidence === 'high' ? detectedIntent.forcedTool : undefined,
      detectedIntent.confidence === 'high' ? detectedIntent.forcedArgs : undefined
    )

    // Generate quick replies from tool results first (if we have them)
    if ((!result.quick_replies || result.quick_replies.length === 0) && result.tool_results && result.tool_results.length > 0) {
      result.quick_replies = generateQuickRepliesFromToolResults(
        result.tool_results as Array<{ name: string; args: Record<string, unknown>; result: unknown }>
      )
      console.log('🔘 [QUICK REPLIES] Generated from tool results:', result.quick_replies?.length)
    }

    // Fall back to default quick replies if still none
    if (!result.quick_replies || result.quick_replies.length === 0) {
      result.quick_replies = generateDefaultQuickReplies(
        messages[messages.length - 1]?.content || '',
        selected_provider_id,
        selected_category
      )
    }

    return Response.json({
      reply: result.content,
      quick_replies: result.quick_replies,
      cart_action: result.cart_action,
      selected_provider_id,
      selected_provider_category,
      selected_category,
      memory,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json({
      reply: 'عذراً، حصلت مشكلة. جرب تاني 🙏',
      quick_replies: [],
    }, { status: 500 })
  }
}

/**
 * Generate quick replies from tool results
 * This converts DB results into clickable buttons
 */
function generateQuickRepliesFromToolResults(
  toolResults: Array<{ name: string; args: Record<string, unknown>; result: unknown }>
): QuickReply[] {
  const replies: QuickReply[] = []

  for (const { name, result } of toolResults) {
    if (!Array.isArray(result)) continue

    switch (name) {
      case 'search_providers':
        // Generate provider buttons
        for (const provider of result.slice(0, 8)) {
          if (provider.id && provider.name_ar) {
            replies.push({
              title: provider.name_ar,
              payload: `provider:${provider.id}`,
            })
          }
        }
        break

      case 'get_provider_menu':
      case 'search_in_provider':
        // Generate menu item buttons
        for (const item of result.slice(0, 8)) {
          if (item.id && item.name_ar) {
            const priceText = item.price ? ` (${item.price} ج.م)` : ''
            replies.push({
              title: `${item.name_ar}${priceText}`,
              payload: `item:${item.id}`,
            })
          }
        }
        break

      case 'get_item_variants':
        // Generate variant buttons
        for (const variant of result.slice(0, 8)) {
          if (variant.id && variant.name_ar) {
            const priceText = variant.price ? ` (${variant.price} ج.م)` : ''
            replies.push({
              title: `${variant.name_ar}${priceText}`,
              payload: `variant:${variant.id}`,
            })
          }
        }
        break

      case 'get_available_categories_in_city':
        // Generate category buttons
        const categoryMap: Record<string, string> = {
          'restaurant_cafe': '🍽️ مطاعم وكافيهات',
          'grocery': '🛒 سوبر ماركت',
          'coffee_patisserie': '🍰 البن والحلويات',
          'vegetables_fruits': '🥦 خضروات وفواكه',
        }
        for (const cat of result) {
          if (typeof cat === 'string' && categoryMap[cat]) {
            replies.push({
              title: categoryMap[cat],
              payload: `category:${cat}`,
            })
          }
        }
        break

      case 'search_product_in_city':
        // Generate ITEM buttons (not provider buttons) for city-wide search
        // This allows users to directly click on items they want
        for (const item of result.slice(0, 8)) {
          if (item.id && item.name_ar) {
            const priceText = item.price ? ` (${item.price} ج.م)` : ''
            const providerName = item.providers?.name_ar || ''
            const providerSuffix = providerName ? ` - ${providerName}` : ''
            replies.push({
              title: `${item.name_ar}${priceText}${providerSuffix}`,
              payload: `item:${item.id}`,
            })
          }
        }
        break

      case 'get_promotions':
        // Handle new format: { promotions: [...], discounted_items: [...] }
        const promoResult = result as { promotions?: unknown[]; discounted_items?: unknown[] }
        const promotionsList = promoResult.promotions || (Array.isArray(result) ? result : [])
        const discountedItemsList = promoResult.discounted_items || []

        // Generate promotion-related buttons
        // For specific promotions, show the affected products as item buttons
        for (const promo of (promotionsList as Array<{
          applies_to?: string
          affected_products?: Array<{ id: string; name_ar: string; price: number }>
          type?: 'percentage' | 'fixed' | 'buy_x_get_y'
          discount_value?: number
          buy_quantity?: number
          get_quantity?: number
          provider_id?: string
          providers?: { name_ar: string }
        }>).slice(0, 5)) {
          if (promo.applies_to === 'specific' && promo.affected_products && Array.isArray(promo.affected_products)) {
            // Show affected products as item buttons
            for (const item of promo.affected_products.slice(0, 5)) {
              if (item.id && item.name_ar) {
                // Calculate discount text based on promotion type
                let discountText = ''
                let displayPrice = item.price
                if (promo.type === 'percentage' && promo.discount_value) {
                  discountText = ` -${promo.discount_value}%`
                  displayPrice = Math.round(item.price * (1 - promo.discount_value / 100))
                } else if (promo.type === 'fixed' && promo.discount_value) {
                  discountText = ` -${promo.discount_value} ج.م`
                  displayPrice = Math.max(0, item.price - promo.discount_value)
                } else if (promo.type === 'buy_x_get_y') {
                  discountText = ` 🎁`
                }
                const priceText = displayPrice ? ` (${displayPrice} ج.م)` : ''
                replies.push({
                  title: `🏷️ ${item.name_ar}${priceText}${discountText}`,
                  payload: `item:${item.id}`,
                })
              }
            }
          } else if (promo.provider_id && promo.providers?.name_ar) {
            // For general promotions, show the provider
            replies.push({
              title: `🎉 ${promo.providers.name_ar}`,
              payload: `provider:${promo.provider_id}`,
            })
          }
        }

        // Also add discounted items (product-level discounts)
        for (const item of (discountedItemsList as Array<{
          id: string
          name_ar: string
          price: number
          discount_percentage: number
          providers?: { name_ar: string }
        }>).slice(0, 8)) {
          if (item.id && item.name_ar) {
            const priceText = item.price ? ` (${item.price} ج.م)` : ''
            const discountText = item.discount_percentage ? ` -${item.discount_percentage}%` : ''
            replies.push({
              title: `🔥 ${item.name_ar}${priceText}${discountText}`,
              payload: `item:${item.id}`,
            })
          }
        }
        break
    }
  }

  return replies
}

/**
 * Generate default quick replies based on context
 */
function generateDefaultQuickReplies(lastMessage: string, providerId?: string, selectedCategory?: string): QuickReply[] {
  // If we have a provider selected, offer to add more items
  if (providerId && isValidUUID(providerId)) {
    return [
      { title: '➕ أضف صنف', payload: `add_more:${providerId}` },
      { title: '🔍 ابحث', payload: 'search' },
      { title: '🏠 الأقسام', payload: 'categories' },
    ]
  }

  // If category is selected but no provider, offer to list providers
  if (selectedCategory) {
    return [
      { title: '🔍 اعرض المحلات', payload: `category:${selectedCategory}` },
      { title: '🔥 العروض', payload: 'promotions' },
      { title: '🏠 الأقسام', payload: 'categories' },
    ]
  }

  // Default: show categories
  return [
    { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
    { title: '🛒 سوبر ماركت', payload: 'category:grocery' },
    { title: '🍰 البن والحلويات', payload: 'category:coffee_patisserie' },
    { title: '🥦 خضروات وفواكه', payload: 'category:vegetables_fruits' },
  ]
}

/**
 * GET /api/chat - Health check
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'Engezna AI Smart Assistant',
    model: 'gpt-4o-mini',
    version: '2.0',
  })
}
