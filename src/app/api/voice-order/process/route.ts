import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null

function getOpenAIClient() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
}

// Define the tools/functions for GPT-4o mini
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_providers',
      description: 'Search for restaurants, coffee shops, or stores by name or category',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query (restaurant name, food type, or category)',
          },
          category: {
            type: 'string',
            enum: ['restaurant', 'coffee_shop', 'grocery', 'vegetables_fruits'],
            description: 'The category of provider to search',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_menu_items',
      description: 'Search for menu items/products at a specific provider or across all providers',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The item name or description to search for (e.g., shawarma, coffee, burger)',
          },
          providerId: {
            type: 'string',
            description: 'Optional provider ID to search within a specific restaurant',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_provider_menu',
      description: 'Get the full menu of a specific provider',
      parameters: {
        type: 'object',
        properties: {
          providerId: {
            type: 'string',
            description: 'The provider ID',
          },
        },
        required: ['providerId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_cart',
      description: 'Add items to the customer cart',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                productName: { type: 'string' },
                productNameAr: { type: 'string' },
                providerId: { type: 'string' },
                providerName: { type: 'string' },
                providerNameAr: { type: 'string' },
                quantity: { type: 'number' },
                price: { type: 'number' },
                notes: { type: 'string' },
              },
              required: ['productId', 'productName', 'providerId', 'quantity', 'price'],
            },
            description: 'Array of items to add to cart',
          },
        },
        required: ['items'],
      },
    },
  },
]

// Function implementations
async function searchProviders(query: string, category?: string) {
  const supabase = await createClient()

  let dbQuery = supabase
    .from('providers')
    .select('id, name_ar, name_en, category, rating, delivery_fee, estimated_delivery_time_min, status')
    .in('status', ['open', 'closed'])

  if (category) {
    dbQuery = dbQuery.eq('category', category)
  }

  // Search in both Arabic and English names
  dbQuery = dbQuery.or(`name_ar.ilike.%${query}%,name_en.ilike.%${query}%`)

  const { data, error } = await dbQuery.limit(5)

  if (error) {
    console.error('Error searching providers:', error)
    return []
  }

  return data || []
}

async function searchMenuItems(query: string, providerId?: string) {
  const supabase = await createClient()

  let dbQuery = supabase
    .from('menu_items')
    .select(`
      id,
      name_ar,
      name_en,
      description_ar,
      description_en,
      price,
      category,
      is_available,
      provider_id,
      providers!inner(id, name_ar, name_en, status)
    `)
    .eq('is_available', true)

  if (providerId) {
    dbQuery = dbQuery.eq('provider_id', providerId)
  }

  // Search in both Arabic and English names and descriptions
  dbQuery = dbQuery.or(`name_ar.ilike.%${query}%,name_en.ilike.%${query}%,description_ar.ilike.%${query}%,description_en.ilike.%${query}%`)

  const { data, error } = await dbQuery.limit(10)

  if (error) {
    console.error('Error searching menu items:', error)
    return []
  }

  return data || []
}

async function getProviderMenu(providerId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('menu_items')
    .select(`
      id,
      name_ar,
      name_en,
      description_ar,
      description_en,
      price,
      category,
      is_available
    `)
    .eq('provider_id', providerId)
    .eq('is_available', true)
    .order('category')

  if (error) {
    console.error('Error getting provider menu:', error)
    return []
  }

  return data || []
}

// Process function calls from GPT
async function processFunctionCall(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'search_providers':
      return searchProviders(args.query as string, args.category as string | undefined)
    case 'search_menu_items':
      return searchMenuItems(args.query as string, args.providerId as string | undefined)
    case 'get_provider_menu':
      return getProviderMenu(args.providerId as string)
    case 'add_to_cart':
      // Return the items to be added - actual cart addition happens on client
      return { success: true, items: args.items }
    default:
      return { error: 'Unknown function' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = getOpenAIClient()
    if (!client) {
      console.error('OPENAI_API_KEY is not configured')
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { transcript, locale, conversationHistory, currentProviderId } = body

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      )
    }

    // Build the system prompt
    const systemPrompt = `أنت مساعد طلبات ذكي لتطبيق إنجزنا للتوصيل في بني سويف، مصر.
مهمتك مساعدة العملاء في:
1. البحث عن المطاعم والكافيهات والمتاجر
2. البحث عن الأطباق والمنتجات
3. إضافة العناصر لسلة التسوق

قواعد مهمة:
- تحدث ${locale === 'ar' ? 'بالعربية المصرية العامية' : 'بالإنجليزية'} بشكل ودود ومحترف
- عند ذكر أسعار، استخدم "جنيه" للعملة
- إذا لم تجد ما يبحث عنه العميل، اقترح بدائل مشابهة
- قبل إضافة عناصر للسلة، تأكد من الكمية والتفاصيل
- ${currentProviderId ? `العميل يتصفح حالياً مطعم معين (ID: ${currentProviderId})` : 'العميل لم يختر مطعم بعد'}

الرد يجب أن يكون مختصر وواضح (2-3 جمل كحد أقصى).`

    // Build messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-10), // Keep last 10 messages for context
      { role: 'user', content: transcript },
    ]

    // Call GPT-4o mini with function calling
    let response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 500,
      temperature: 0.7,
    })

    let assistantMessage = response.choices[0].message
    let cartItems: unknown[] = []
    let providerId: string | undefined
    let providerName: string | undefined

    // Process any tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

      for (const toolCall of assistantMessage.tool_calls) {
        // Only process function tool calls
        if (toolCall.type !== 'function') continue

        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        console.log(`Calling function: ${functionName}`, functionArgs)

        const result = await processFunctionCall(functionName, functionArgs)

        // Handle special cases
        if (functionName === 'add_to_cart' && (result as { success?: boolean }).success) {
          cartItems = (result as { items?: unknown[] }).items || []
        }

        if (functionName === 'search_providers' && Array.isArray(result) && result.length > 0) {
          providerId = result[0].id
          providerName = locale === 'ar' ? result[0].name_ar : result[0].name_en
        }

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }

      // Continue conversation with function results
      messages.push(assistantMessage as OpenAI.Chat.Completions.ChatCompletionMessageParam)
      messages.push(...toolResults)

      response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: 500,
        temperature: 0.7,
      })

      assistantMessage = response.choices[0].message
    }

    return NextResponse.json({
      response: assistantMessage.content || (locale === 'ar'
        ? 'عذراً، لم أتمكن من معالجة طلبك.'
        : 'Sorry, I could not process your request.'),
      cartItems,
      providerId,
      providerName,
    })
  } catch (error) {
    console.error('Error in process route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
