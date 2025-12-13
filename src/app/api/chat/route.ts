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

interface ChatMemory {
  pending_item?: PendingItem
  pending_variant?: PendingVariant
  awaiting_quantity?: boolean
  [key: string]: unknown
}

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  customer_id?: string
  city_id: string
  selected_provider_id?: string
  selected_provider_category?: string
  selected_category?: string // User's chosen category (restaurant_cafe, grocery, etc.)
  memory?: ChatMemory
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

// =============================================================================
// DIRECT PAYLOAD HANDLERS - Handle button clicks without GPT
// =============================================================================

interface PayloadHandlerResult {
  reply: string
  quick_replies: QuickReply[]
  cart_action?: CartAction
  selected_provider_id?: string
  selected_category?: string
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

  // Get menu items
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, name_ar, price, has_variants, pricing_type, image_url')
    .eq('provider_id', providerId)
    .eq('is_available', true)
    .or('has_stock.eq.true,has_stock.is.null')
    .order('price', { ascending: false })
    .limit(12)

  if (!menuItems || menuItems.length === 0) {
    return {
      reply: `${provider.name_ar} مفيش منتجات متاحة دلوقتي 😕`,
      quick_replies: [
        { title: '🏠 الأقسام', payload: 'categories' },
        { title: '🔥 العروض', payload: 'show_promotions' },
      ],
      selected_provider_id: providerId,
    }
  }

  return {
    reply: `تمام! هنا منيو ${provider.name_ar} ⭐${provider.rating || ''} 👇`,
    quick_replies: menuItems.slice(0, 10).map(item => ({
      title: `${item.name_ar} (${item.price} ج.م)`,
      payload: `item:${item.id}`,
    })),
    selected_provider_id: providerId,
  }
}

/**
 * Handle item:xxx payload
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
    .select('id, name_ar, price, has_variants, pricing_type, provider_id, providers(name_ar)')
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
      return {
        reply: `${item.name_ar} له اختيارات مختلفة 👇`,
        quick_replies: variants.map(v => ({
          title: `${v.name_ar} (${v.price} ج.م)`,
          payload: `variant:${v.id}`,
        })),
        selected_provider_id: item.provider_id,
        memory: {
          pending_item: {
            id: item.id,
            name_ar: item.name_ar,
            price: item.price,
            provider_id: item.provider_id,
            provider_name_ar: providerName,
            has_variants: true,
          },
        },
      }
    }
  }

  // No variants - ask for quantity directly
  return {
    reply: `${item.name_ar} بـ ${item.price} ج.م 🍽️\n\nكام واحدة تحب؟`,
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
        price: item.price,
        provider_id: item.provider_id,
        provider_name_ar: providerName,
        has_variants: false,
      },
      awaiting_quantity: true,
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

  return {
    reply: `${pendingItem?.name_ar || 'الصنف'} - ${variant.name_ar} بـ ${variant.price} ج.م 🍽️\n\nكام واحدة تحب؟`,
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
        price: variant.price,
      },
      awaiting_quantity: true,
    },
  }
}

/**
 * Handle qty:x payload or quantity input when awaiting_quantity is true
 */
function handleQuantityInput(
  quantity: number,
  memory: ChatMemory
): PayloadHandlerResult | null {
  const { pending_item, pending_variant } = memory

  if (!pending_item) {
    return null
  }

  console.log('📦 [PAYLOAD] quantity:', quantity, 'for item:', pending_item.name_ar)

  const finalPrice = pending_variant?.price || pending_item.price
  const variantText = pending_variant ? ` - ${pending_variant.name_ar}` : ''

  const cart_action: CartAction = {
    type: 'ADD_ITEM',
    provider_id: pending_item.provider_id,
    menu_item_id: pending_item.id,
    menu_item_name_ar: pending_item.name_ar,
    quantity,
    unit_price: finalPrice,
    variant_id: pending_variant?.id,
    variant_name_ar: pending_variant?.name_ar,
  }

  return {
    reply: `تمام! ✅ ضفت ${quantity}x ${pending_item.name_ar}${variantText} للسلة (${quantity * finalPrice} ج.م)\n\nتحب تضيف حاجة تانية؟`,
    quick_replies: [
      { title: '🛒 اذهب للسلة', payload: 'go_to_cart' },
      { title: '➕ أضف المزيد', payload: `provider:${pending_item.provider_id}` },
      { title: '🏠 الأقسام', payload: 'categories' },
    ],
    cart_action,
    selected_provider_id: pending_item.provider_id,
    memory: {
      // Clear pending items after adding to cart
      pending_item: undefined,
      pending_variant: undefined,
      awaiting_quantity: false,
    },
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
  type: 'ADD_ITEM'
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

      // 📦 Log promotions result with products
      console.log('📦 [AI PROMOTIONS RESULT]', {
        tool: 'get_promotions',
        cityId,
        providerId,
        count: promotionsWithProducts.length,
        promotions: promotionsWithProducts.map(p => ({
          id: p.id,
          title: p.title_ar || p.title,
          provider: p.providers?.name_ar,
          discount: p.discount_percentage || p.discount_amount,
          applies_to: p.applies_to,
          affected_products_count: p.affected_products?.length || 0,
        })),
      })

      result = promotionsWithProducts
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
    const { messages, customer_id, city_id, selected_provider_id, selected_provider_category, selected_category, memory } = body

    // 🔍 Log incoming request
    console.log('🔍 [AI REQUEST]', {
      cityId: city_id,
      customerId: customer_id,
      selectedProviderId: selected_provider_id,
      selectedProviderCategory: selected_provider_category,
      selectedCategory: selected_category,
      messageCount: messages?.length,
      lastMessage: messages?.[messages.length - 1]?.content?.slice(0, 100),
      memory: memory,
    })

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

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1]?.content || ''

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

    // Handle provider:xxx payload
    if (lastUserMessage.startsWith('provider:')) {
      const providerId = lastUserMessage.replace('provider:', '')
      if (isValidUUID(providerId)) {
        console.log('🚀 [DIRECT HANDLER] provider:', providerId)

        const result = await handleProviderPayload(providerId, city_id)
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

    // Handle item:xxx payload
    if (lastUserMessage.startsWith('item:')) {
      const itemId = lastUserMessage.replace('item:', '')
      if (isValidUUID(itemId)) {
        console.log('🚀 [DIRECT HANDLER] item:', itemId)

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

    // Handle variant:xxx payload
    if (lastUserMessage.startsWith('variant:')) {
      const variantId = lastUserMessage.replace('variant:', '')
      if (isValidUUID(variantId)) {
        console.log('🚀 [DIRECT HANDLER] variant:', variantId)

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

    // Handle qty:x payload (from quantity buttons)
    if (lastUserMessage.startsWith('qty:')) {
      const qtyStr = lastUserMessage.replace('qty:', '')
      const quantity = parseInt(qtyStr, 10)
      if (quantity > 0 && memory?.pending_item) {
        console.log('🚀 [DIRECT HANDLER] qty:', quantity)

        const result = handleQuantityInput(quantity, memory as ChatMemory)
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

    // Handle quantity input when awaiting_quantity is true
    if (memory?.awaiting_quantity && memory?.pending_item) {
      const quantity = parseArabicQuantity(lastUserMessage)
      if (quantity > 0) {
        console.log('🚀 [DIRECT HANDLER] parsed quantity:', quantity, 'from:', lastUserMessage)

        const result = handleQuantityInput(quantity, memory as ChatMemory)
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

    // Handle special payloads
    if (lastUserMessage === 'categories' || lastUserMessage === 'الأقسام') {
      console.log('🚀 [DIRECT HANDLER] categories')
      return Response.json({
        reply: 'اختار القسم اللي تحبه 👇',
        quick_replies: [
          { title: '🍽️ مطاعم وكافيهات', payload: 'category:restaurant_cafe' },
          { title: '🛒 سوبر ماركت', payload: 'category:grocery' },
          { title: '🍰 البن والحلويات', payload: 'category:coffee_patisserie' },
          { title: '🥦 خضروات وفواكه', payload: 'category:vegetables_fruits' },
        ],
        selected_provider_id: undefined,
        selected_category: undefined,
        memory: { ...memory, pending_item: undefined, pending_variant: undefined, awaiting_quantity: false },
      })
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
    // 🤖 GPT FALLBACK - For natural language that doesn't match payloads
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
        // Generate provider-grouped results
        // Group by provider first
        const byProvider = new Map<string, { providerName: string; items: Array<{ id: string; name_ar: string; price: number }> }>()
        for (const item of result.slice(0, 12)) {
          const providerId = item.provider_id || item.providers?.id
          const providerName = item.providers?.name_ar || 'متجر'
          if (!byProvider.has(providerId)) {
            byProvider.set(providerId, { providerName, items: [] })
          }
          byProvider.get(providerId)?.items.push(item)
        }
        // Show provider buttons
        for (const [pid, data] of byProvider) {
          replies.push({
            title: `📍 ${data.providerName}`,
            payload: `provider:${pid}`,
          })
        }
        break

      case 'get_promotions':
        // Generate promotion-related buttons
        // For specific promotions, show the affected products as item buttons
        for (const promo of result.slice(0, 5)) {
          if (promo.applies_to === 'specific' && promo.affected_products && Array.isArray(promo.affected_products)) {
            // Show affected products as item buttons
            for (const item of promo.affected_products.slice(0, 5)) {
              if (item.id && item.name_ar) {
                const priceText = item.price ? ` (${item.price} ج.م)` : ''
                const discountText = promo.discount_percentage ? ` -${promo.discount_percentage}%` : ''
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
        break
    }
  }

  return replies
}

/**
 * Generate default quick replies based on context
 */
function generateDefaultQuickReplies(lastMessage: string, providerId?: string, selectedCategory?: string): QuickReply[] {
  // If we have a provider selected, offer menu navigation
  if (providerId && isValidUUID(providerId)) {
    return [
      { title: '📋 شوف المنيو', payload: `provider:${providerId}` },
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
