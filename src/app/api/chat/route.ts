/**
 * AI Chat API Route with Streaming Support
 * Uses GPT-4o-mini for cost-effective, fast responses
 */

import { OpenAI } from 'openai'
import { buildCustomerContext, getLastOrder } from '@/lib/ai/context-builder'
import { searchProducts, searchProviders, getPopularProducts, getPromotionProducts, getActivePromotions } from '@/lib/ai/product-search'
import { compareProvidersForProduct, generateComparisonText } from '@/lib/ai/comparison-engine'
import {
  INTENT_DETECTION_PROMPT,
  ASSISTANT_PERSONALITY,
  RESPONSE_GENERATION_PROMPT,
  buildContextPrompt,
  buildDataPrompt,
} from '@/lib/ai/chat-prompts'
import type { ChatAPIRequest, ParsedIntent, ChatMessage, ChatProduct, ChatProvider } from '@/types/chat'

// Lazy initialize OpenAI client (to avoid build-time errors when API key is not available)
let openaiClient: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// Rate limiting (simple in-memory)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 50 // messages per day
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24 hours

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false
  }

  userLimit.count++
  return true
}

/**
 * Parse user intent using GPT-4o-mini
 */
async function parseIntent(message: string, conversationHistory: ChatMessage[]): Promise<ParsedIntent> {
  try {
    const historyText = conversationHistory
      .slice(-5)
      .map(m => `${m.role === 'user' ? 'المستخدم' : 'المساعد'}: ${m.content}`)
      .join('\n')

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: INTENT_DETECTION_PROMPT },
        {
          role: 'user',
          content: `المحادثة السابقة:\n${historyText}\n\nالرسالة الجديدة: ${message}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from intent parser')
    }

    return JSON.parse(content) as ParsedIntent
  } catch (error) {
    console.error('Intent parsing error:', error)
    return {
      type: 'unclear',
      confidence: 0,
      entities: {},
    }
  }
}

/**
 * Fetch relevant data based on intent
 */
async function fetchRelevantData(
  intent: ParsedIntent,
  cityId?: string
): Promise<{
  products: ChatProduct[]
  providers: ChatProvider[]
  comparison: string | null
}> {
  let products: ChatProduct[] = []
  let providers: ChatProvider[] = []
  let comparison: string | null = null

  try {
    switch (intent.type) {
      case 'search_product':
      case 'get_recommendations':
        products = await searchProducts(intent, cityId, 6)
        break

      case 'search_provider':
        providers = await searchProviders(intent, cityId, 5)
        break

      case 'compare':
        if (intent.entities.products && intent.entities.products.length > 0) {
          const comparisonResult = await compareProvidersForProduct(
            intent.entities.products[0],
            cityId
          )
          if (comparisonResult) {
            comparison = generateComparisonText(comparisonResult)
            products = comparisonResult.providers.map(p => p.product)
          }
        }
        break

      case 'browse_category':
        providers = await searchProviders(intent, cityId, 5)
        break

      default:
        // For greetings and unclear intents, get popular products
        if (intent.type === 'greeting' || intent.type === 'unclear') {
          products = await getPopularProducts(cityId, 4)
        }
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  }

  return { products, providers, comparison }
}

/**
 * Generate streaming response
 */
async function* generateStreamingResponse(
  message: string,
  intent: ParsedIntent,
  context: Awaited<ReturnType<typeof buildCustomerContext>>,
  data: { products: ChatProduct[]; providers: ChatProvider[]; comparison: string | null },
  conversationHistory: ChatMessage[]
): AsyncGenerator<string> {
  const contextPrompt = buildContextPrompt({
    customerName: context.customer?.name,
    cityName: context.customer?.city_name || 'بني سويف',
    timeOfDay: context.currentContext.time,
    dayOfWeek: context.currentContext.dayOfWeek,
    totalOrders: context.orderHistory.totalOrders,
    averageOrderValue: context.orderHistory.averageOrderValue,
    favoriteProviders: context.orderHistory.favoriteProviders.map(p => p.name_ar),
    favoriteProducts: context.orderHistory.favoriteProducts.map(p => p.name_ar),
  })

  const dataPrompt = buildDataPrompt({
    products: data.products.map(p => ({
      name_ar: p.name_ar,
      price: p.price,
      provider_name: p.provider_name_ar,
      rating: p.rating,
    })),
    providers: data.providers.map(p => ({
      name_ar: p.name_ar,
      rating: p.rating,
      delivery_time: p.delivery_time_min,
      delivery_fee: p.delivery_fee,
    })),
    intentType: intent.type,
  })

  // Build conversation history for context
  const historyMessages = conversationHistory.slice(-6).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // If we have a comparison, include it
  let additionalContext = ''
  if (data.comparison) {
    additionalContext = `\n\n## نتيجة المقارنة:\n${data.comparison}`
  }

  try {
    const stream = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ASSISTANT_PERSONALITY },
        { role: 'system', content: contextPrompt },
        { role: 'system', content: dataPrompt + additionalContext },
        { role: 'system', content: RESPONSE_GENERATION_PROMPT },
        ...historyMessages,
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  } catch (error) {
    console.error('Streaming error:', error)
    yield 'عذراً، حصلت مشكلة. ممكن تجرب تاني؟ 🙏'
  }
}

/**
 * POST /api/chat - Main chat endpoint with streaming
 */
export async function POST(request: Request) {
  try {
    const body: ChatAPIRequest = await request.json()
    const { message, conversationHistory, userId, cityId, governorateId } = body

    if (!message || message.trim().length === 0) {
      return Response.json(
        { success: false, error: 'الرسالة مطلوبة' },
        { status: 400 }
      )
    }

    // Rate limiting
    const rateLimitKey = userId || request.headers.get('x-forwarded-for') || 'anonymous'
    if (!checkRateLimit(rateLimitKey)) {
      return Response.json(
        { success: false, error: 'لقد تجاوزت الحد الأقصى للرسائل اليومية. جرب بكرة! 😊' },
        { status: 429 }
      )
    }

    // Build customer context
    const context = await buildCustomerContext(userId, cityId, governorateId)

    // Parse intent
    const intent = await parseIntent(message, conversationHistory || [])

    // Handle special intents
    if (intent.type === 'reorder' && userId) {
      const lastOrder = await getLastOrder(userId)
      if (lastOrder) {
        // Handle providers being either array or object (Supabase type inference)
        const providerData = lastOrder.providers
        const providerName = Array.isArray(providerData)
          ? (providerData[0] as { name_ar: string })?.name_ar
          : (providerData as { name_ar: string } | null)?.name_ar || 'غير معروف'

        // Handle order_items with menu_items being array or object
        type OrderItem = { quantity: number; unit_price: number; menu_items: unknown }
        const orderItems = lastOrder.order_items as OrderItem[]
        const itemsText = orderItems.map(item => {
          const menuItem = Array.isArray(item.menu_items)
            ? (item.menu_items[0] as { name_ar: string })
            : (item.menu_items as { name_ar: string })
          return `• ${item.quantity}x ${menuItem?.name_ar || 'منتج'} (${item.unit_price} ج.م)`
        }).join('\n')

        const orderText = `آخر طلب ليك كان من ${providerName}:\n\n` +
          itemsText +
          `\n\n💰 الإجمالي: ${lastOrder.total} ج.م\n\nتحب تكرر نفس الطلب؟`

        return Response.json({
          success: true,
          message: {
            id: Date.now().toString(),
            role: 'assistant',
            content: orderText,
            timestamp: new Date(),
            intent,
            actions: ['show_order_history'],
            suggestions: ['✅ نعم، اطلب', '✏️ عدّل الطلب', '❌ لا، حاجة تانية'],
          },
        })
      }
    }

    // Handle show_promotions quick action
    if (intent.type === 'get_recommendations' &&
        (message.includes('عرض') || message.includes('عروض') ||
         message.includes('خصم') || message.includes('ورني العروض'))) {

      // Get both active promotions from promotions table and discounted products
      const [activePromotions, promoProducts] = await Promise.all([
        getActivePromotions(cityId, 6),
        getPromotionProducts(cityId, 6),
      ])

      console.log('[Chat] Active promotions:', activePromotions.length, 'Promo products:', promoProducts.length)

      let promoText = ''

      // Show active promotions first
      if (activePromotions.length > 0) {
        promoText += '🎉 العروض النشطة دلوقتي:\n\n'
        activePromotions.slice(0, 4).forEach(promo => {
          const discountText = promo.type === 'percentage'
            ? `خصم ${promo.discount_value}%`
            : promo.type === 'fixed'
              ? `خصم ${promo.discount_value} ج.م`
              : `اشتري واحد وخد واحد`

          promoText += `🏷️ ${promo.name_ar} - ${discountText}\n   من ${promo.provider_name_ar}\n\n`
        })
      }

      // Also show discounted products if available
      if (promoProducts.length > 0) {
        if (promoText) promoText += '---\n\n'
        promoText += '🔥 منتجات بخصومات:\n\n'
        promoProducts.slice(0, 3).forEach(p => {
          const discount = p.original_price ? Math.round((1 - p.price / p.original_price) * 100) : 0
          promoText += `• ${p.name_ar} - ${p.price} ج.م ${discount > 0 ? `(كان ${p.original_price} ج.م)` : ''}\n  من ${p.provider_name_ar}\n\n`
        })
      }

      if (promoText) {
        return Response.json({
          success: true,
          message: {
            id: Date.now().toString(),
            role: 'assistant',
            content: promoText.trim(),
            timestamp: new Date(),
            intent,
            actions: ['show_promotions'],
            products: promoProducts,
            suggestions: ['عايز أطلب', 'ورني حاجة تانية', '🏠 الرئيسية'],
          },
        })
      }
    }

    // Fetch relevant data
    const data = await fetchRelevantData(intent, cityId)

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''

        try {
          for await (const chunk of generateStreamingResponse(
            message,
            intent,
            context,
            data,
            conversationHistory || []
          )) {
            fullResponse += chunk
            // Send chunk with SSE format
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`))
          }

          // Send final message with metadata
          const finalMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
            intent,
            products: data.products.length > 0 ? data.products : undefined,
            providers: data.providers.length > 0 ? data.providers : undefined,
            suggestions: generateSuggestions(intent, data),
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, message: finalMessage })}\n\n`))
        } catch (error) {
          console.error('Stream error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'حصلت مشكلة' })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json(
      { success: false, error: 'حصلت مشكلة في السيرفر' },
      { status: 500 }
    )
  }
}

/**
 * Generate contextual suggestions based on intent and data
 */
function generateSuggestions(
  intent: ParsedIntent,
  data: { products: ChatProduct[]; providers: ChatProvider[] }
): string[] {
  const suggestions: string[] = []

  switch (intent.type) {
    case 'search_product':
      if (data.products.length > 0) {
        suggestions.push(...data.products.slice(0, 2).map(p => p.provider_name_ar))
        suggestions.push('قارن بينهم')
      } else {
        suggestions.push('🔍 ابحث عن حاجة تانية')
        suggestions.push('🔥 العروض')
      }
      break

    case 'search_provider':
      if (data.providers.length > 0) {
        suggestions.push(...data.providers.slice(0, 2).map(p => `أطلب من ${p.name_ar}`))
      }
      break

    case 'greeting':
      suggestions.push('🍕 بيتزا', '🍔 برجر', '🔥 العروض', '🔄 آخر طلب')
      break

    case 'compare':
      suggestions.push('أطلب من الأول', 'ورني حاجة تانية')
      break

    default:
      suggestions.push('🔥 العروض', '⭐ الأكثر طلباً', '🔄 آخر طلب')
  }

  return suggestions.slice(0, 4)
}

/**
 * GET /api/chat - Health check
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'Engezna AI Smart Assistant',
    model: 'gpt-4o-mini',
  })
}
