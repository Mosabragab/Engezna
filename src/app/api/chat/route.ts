/**
 * AI Chat API Route - New Implementation
 * Uses GPT-4o-mini with Function Calling + Streaming
 */

import { OpenAI } from 'openai'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT, CATEGORY_MAPPING } from '@/lib/ai/systemPrompt'
import { tools } from '@/lib/ai/tools'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// Types
interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  customer_id?: string
  city_id: string
  selected_provider_id?: string
  selected_provider_category?: string
  memory?: Record<string, unknown>
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

      // Name search
      if (args.query) {
        query = query.ilike('name_ar', `%${args.query}%`)
      }

      const { data } = await query
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false })
        .limit((args.limit as number) || 10)

      result = data || []
      break
    }

    case 'get_provider_menu': {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name_ar, price, pricing_type, has_variants, price_from, image_url, description_ar, is_available, has_stock')
        .eq('provider_id', args.provider_id as string)
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
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name_ar, price, pricing_type, has_variants, image_url, is_available, has_stock')
        .eq('provider_id', args.provider_id as string)
        .eq('is_available', true)
        .or('has_stock.eq.true,has_stock.is.null')
        .or(`name_ar.ilike.%${args.query}%,name_en.ilike.%${args.query}%,description_ar.ilike.%${args.query}%`)
        .limit((args.limit as number) || 8)

      if (error) {
        console.error('❌ [AI DB ERROR] search_in_provider:', error)
      }

      // 📦 Detailed logging for search
      console.log('📦 [AI SEARCH RESULT]', {
        tool: 'search_in_provider',
        providerId: args.provider_id,
        query: args.query,
        count: data?.length ?? 0,
        items: data?.map(i => ({
          id: i.id,
          name: i.name_ar,
          price: i.price,
          is_available: i.is_available,
          has_stock: i.has_stock,
        })),
      })

      // 🚨 Warning if no results
      if (!data || data.length === 0) {
        console.warn('🚨 [AI EMPTY RESULT]', {
          tool: 'search_in_provider',
          providerId: args.provider_id,
          query: args.query,
          filters: {
            is_available: true,
            has_stock: 'true OR null',
          },
        })
      }

      result = data || []
      break
    }

    case 'get_menu_item_details': {
      const { data } = await supabase
        .from('menu_items')
        .select('*, providers(id, name_ar)')
        .eq('id', args.menu_item_id as string)
        .maybeSingle()

      result = data
      break
    }

    case 'get_item_variants': {
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
      let query = supabase
        .from('promotions')
        .select('*, providers(id, name_ar)')
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now)

      if (args.provider_id) {
        query = query.eq('provider_id', args.provider_id as string)
      }

      const { data } = await query.limit((args.limit as number) || 10)
      result = data || []
      break
    }

    case 'search_product_in_city': {
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

      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name_ar, price, provider_id, is_available, has_stock, providers(id, name_ar)')
        .in('provider_id', providerIds)
        .eq('is_available', true)
        .or('has_stock.eq.true,has_stock.is.null')
        .or(`name_ar.ilike.%${args.query}%,name_en.ilike.%${args.query}%`)
        .limit((args.limit as number) || 10)

      if (error) {
        console.error('❌ [AI DB ERROR] search_product_in_city:', error)
      }

      // 📦 Detailed logging for city-wide search
      console.log('📦 [AI CITY SEARCH RESULT]', {
        tool: 'search_product_in_city',
        cityId,
        query: args.query,
        providersInCity: providers.length,
        count: data?.length ?? 0,
        items: data?.map(i => ({
          id: i.id,
          name: i.name_ar,
          price: i.price,
          provider: i.providers,
          is_available: i.is_available,
          has_stock: i.has_stock,
        })),
      })

      // 🚨 Warning if no results
      if (!data || data.length === 0) {
        console.warn('🚨 [AI EMPTY CITY SEARCH]', {
          tool: 'search_product_in_city',
          cityId,
          query: args.query,
          providersSearched: providers.length,
        })
      }

      result = data || []
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
 */
async function processWithTools(
  messages: ChatCompletionMessageParam[],
  cityId: string
): Promise<{
  content: string
  quick_replies?: QuickReply[]
  cart_action?: CartAction
}> {
  const openai = getOpenAI()

  // First call with tools
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ],
    tools,
    tool_choice: 'auto',
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

  for (const toolCall of assistantMessage.tool_calls) {
    // Skip non-function tool calls
    if (toolCall.type !== 'function') continue

    const name = toolCall.function.name
    const args = JSON.parse(toolCall.function.arguments || '{}')

    console.log(`[Tool Call] ${name}:`, args)

    const result = await handleToolCall(name, args, cityId)

    console.log(`[Tool Result] ${name}:`, JSON.stringify(result).slice(0, 200))

    toolResults.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    })
  }

  // Second call with tool results
  const followUpResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
      assistantMessage as ChatCompletionMessageParam,
      ...toolResults,
    ],
    temperature: 0.7,
    max_tokens: 1000,
  })

  return parseAssistantResponse(followUpResponse.choices[0].message.content || '')
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
    const { messages, customer_id, city_id, selected_provider_id, selected_provider_category, memory } = body

    // Validate city_id
    if (!city_id) {
      return Response.json({
        reply: 'اختار المدينة من فوق الأول 🏙️',
        quick_replies: [],
      })
    }

    // Rate limiting
    const rateLimitKey = customer_id || request.headers.get('x-forwarded-for') || 'anonymous'
    if (!checkRateLimit(rateLimitKey)) {
      return Response.json({
        reply: 'لقد تجاوزت الحد الأقصى للرسائل. جرب بكرة! 😊',
        quick_replies: [],
      }, { status: 429 })
    }

    // Build context message
    const contextInfo = `
[Context]
city_id: ${city_id}
${customer_id ? `customer_id: ${customer_id}` : ''}
${selected_provider_id ? `selected_provider_id: ${selected_provider_id}` : ''}
${selected_provider_category ? `selected_provider_category: ${selected_provider_category}` : ''}
${memory ? `memory: ${JSON.stringify(memory)}` : ''}
`

    // Convert messages to OpenAI format
    const openaiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: contextInfo },
      ...messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    // Process with tools
    const result = await processWithTools(openaiMessages, city_id)

    // Generate default quick replies if none provided
    if (!result.quick_replies || result.quick_replies.length === 0) {
      result.quick_replies = generateDefaultQuickReplies(
        messages[messages.length - 1]?.content || '',
        selected_provider_id
      )
    }

    return Response.json({
      reply: result.content,
      quick_replies: result.quick_replies,
      cart_action: result.cart_action,
      selected_provider_id,
      selected_provider_category,
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
 * Generate default quick replies based on context
 */
function generateDefaultQuickReplies(lastMessage: string, providerId?: string): QuickReply[] {
  // If we have a provider selected, offer menu navigation
  if (providerId) {
    return [
      { title: '📋 شوف المنيو', payload: `provider:${providerId}` },
      { title: '🔍 ابحث', payload: 'search' },
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
