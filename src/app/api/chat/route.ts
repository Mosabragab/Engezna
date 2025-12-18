/**
 * AI Chat API Route - Agent-Based Implementation
 *
 * Uses OpenAI GPT-4o-mini with Function Calling for an AI Agent that can
 * interact with the database and help customers with their orders.
 *
 * @version 2.1.0 - Added Customer Memory for personalized conversations
 */

import { NextRequest, NextResponse } from 'next/server'
import { runAgentStream, type AgentStreamEvent, type AgentMessage } from '@/lib/ai/agentHandler'
import type { AgentContext } from '@/lib/ai/agentPrompt'
import { getCustomerMemory } from '@/lib/ai/customerMemory'
import {
  postProcessCartActions,
  type CartAction,
  type CartItem
} from '@/lib/ai/chatProcessor'

// =============================================================================
// TYPES
// =============================================================================

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  customer_id?: string
  city_id?: string
  governorate_id?: string
  customer_name?: string
  selected_provider_id?: string
  selected_provider_name?: string
  selected_category?: string  // User's chosen category (restaurant_cafe, grocery, etc.)
  cart_provider_id?: string
  cart_provider_name?: string
  cart_items?: Array<{
    menu_item_id: string  // For deduplication
    name_ar: string
    quantity: number
    unit_price: number
    variant_id?: string   // For deduplication
    variant_name_ar?: string
  }>
  cart_total?: number
  // Session memory for pending items from previous messages
  memory?: Record<string, unknown>
}

// =============================================================================
// STREAMING ENCODER
// =============================================================================

function createSSEEncoder() {
  const encoder = new TextEncoder()

  return {
    encode: (event: string, data: unknown) => {
      const jsonData = JSON.stringify(data)
      return encoder.encode(`event: ${event}\ndata: ${jsonData}\n\n`)
    },
    encodeError: (error: string) => {
      return encoder.encode(`event: error\ndata: ${JSON.stringify({ error })}\n\n`)
    },
    encodeDone: () => {
      return encoder.encode('event: done\ndata: {}\n\n')
    }
  }
}

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest

    // Validate required fields
    if (!body.messages || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      )
    }

    // Calculate cart total if not provided
    const cartTotal = body.cart_total || body.cart_items?.reduce(
      (sum, item) => sum + (item.unit_price * item.quantity), 0
    ) || 0

    // Fetch customer memory for personalization (only for logged-in users)
    const customerMemory = body.customer_id
      ? await getCustomerMemory(body.customer_id)
      : null

    // Build agent context with customer memory
    const context: AgentContext = {
      customerId: body.customer_id,
      providerId: body.selected_provider_id,
      cityId: body.city_id,
      governorateId: body.governorate_id,
      locale: 'ar',
      customerName: body.customer_name,
      providerContext: body.selected_provider_id && body.selected_provider_name
        ? { id: body.selected_provider_id, name: body.selected_provider_name }
        : undefined,
      // Selected category (required before ordering)
      selectedCategory: body.selected_category,
      // Map cart items to context format (with proper IDs for deduplication)
      cartItems: body.cart_items?.map(item => ({
        id: item.menu_item_id,
        name: item.name_ar,
        quantity: item.quantity,
        price: item.unit_price,
        variant_id: item.variant_id
      })),
      cartProviderId: body.cart_provider_id,
      cartTotal: cartTotal,
      // Customer memory for personalization
      customerMemory: customerMemory || undefined,
      // Session memory for pending items/variants from previous messages
      sessionMemory: body.memory as AgentContext['sessionMemory']
    }

    // Convert messages to agent format
    const agentMessages: AgentMessage[] = body.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const sse = createSSEEncoder()

        try {
          // Run the agent with streaming
          const agentStream = runAgentStream({
            context,
            messages: agentMessages
          })

          let fullContent = ''

          for await (const event of agentStream) {
            switch (event.type) {
              case 'content':
                // Stream content chunks
                if (event.content) {
                  fullContent += event.content
                  controller.enqueue(sse.encode('content', {
                    chunk: event.content
                  }))
                }
                break

              case 'tool_call':
                // Optionally notify about tool calls (for debugging/UI feedback)
                controller.enqueue(sse.encode('tool_call', {
                  tool: event.toolName,
                  args: event.toolArgs
                }))
                break

              case 'tool_result':
                // Tool results (for debugging)
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[Tool Result] ${event.toolName}:`, event.toolResult)
                }
                break

              case 'done':
                // Final response with all data
                const response = event.response

                // 🔄 POST-PROCESS: Deduplicate cart actions against existing cart
                let processedCartActions = response?.cartActions
                let cartWarnings: string[] = []
                let cartErrors: string[] = []

                if (response?.cartActions && response.cartActions.length > 0) {
                  // Map existing cart items for deduplication check
                  const existingCartItems: CartItem[] = (context.cartItems || []).map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    variant_id: item.variant_id
                  }))

                  // Post-process: merge duplicates within response + dedupe against cart
                  const postProcessed = postProcessCartActions(
                    response.cartActions as CartAction[],
                    existingCartItems
                  )

                  processedCartActions = postProcessed.cartActions
                  cartWarnings = postProcessed.warnings
                  cartErrors = postProcessed.errors

                  // Log skipped actions for debugging
                  if (postProcessed.skippedActions.length > 0) {
                    console.log('[Cart Dedup] Skipped duplicate actions:', postProcessed.skippedActions.map(a => a.menu_item_name_ar))
                  }
                  if (cartWarnings.length > 0) {
                    console.log('[Cart Warnings]:', cartWarnings)
                  }
                }

                // Build response content (append warnings if any)
                let responseContent = response?.content || fullContent
                if (cartWarnings.length > 0 && !cartErrors.length) {
                  // Add warnings as hints to the user
                  responseContent += '\n\n⚠️ ' + cartWarnings.join('\n⚠️ ')
                }
                if (cartErrors.length > 0) {
                  responseContent += '\n\n❌ ' + cartErrors.join('\n❌ ')
                }

                controller.enqueue(sse.encode('message', {
                  content: responseContent,
                  suggestions: response?.suggestions || [],
                  quick_replies: response?.quickReplies?.map(qr => ({
                    title: qr.title,
                    payload: qr.payload
                  })) || [],
                  products: response?.products?.map(p => ({
                    id: p.id,
                    name_ar: p.name,
                    price: p.price,
                    image_url: p.image,
                    has_variants: p.hasVariants,
                    provider_id: p.providerId,
                    provider_name_ar: p.providerName
                  })) || [],
                  navigate_to: response?.navigateTo,
                  cart_action: response?.cartAction,
                  cart_actions: processedCartActions && processedCartActions.length > 0
                    ? processedCartActions
                    : undefined,  // Send array of cart actions for multiple items
                  // FIX: Send discovered provider ID to frontend for context persistence
                  selected_provider_id: response?.discoveredProviderId,
                  selected_provider_name: response?.discoveredProviderName,
                  // FIX: Send session memory for pending items
                  memory: response?.sessionMemory
                }))
                break

              case 'error':
                controller.enqueue(sse.encodeError(event.error || 'Unknown error'))
                break
            }
          }

          // Send done event
          controller.enqueue(sse.encodeDone())
          controller.close()

        } catch (error) {
          console.error('[Chat API Error]:', error)
          controller.enqueue(sse.encodeError(
            error instanceof Error ? error.message : 'An error occurred'
          ))
          controller.close()
        }
      }
    })

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    })

  } catch (error) {
    console.error('[Chat API Error]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// NON-STREAMING ENDPOINT (for simple queries)
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest

    if (!body.messages || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      )
    }

    // Calculate cart total if not provided
    const cartTotal = body.cart_total || body.cart_items?.reduce(
      (sum, item) => sum + (item.unit_price * item.quantity), 0
    ) || 0

    // Fetch customer memory for personalization (only for logged-in users)
    const customerMemory = body.customer_id
      ? await getCustomerMemory(body.customer_id)
      : null

    // Build context with customer memory
    const context: AgentContext = {
      customerId: body.customer_id,
      providerId: body.selected_provider_id,
      cityId: body.city_id,
      governorateId: body.governorate_id,
      locale: 'ar',
      customerName: body.customer_name,
      providerContext: body.selected_provider_id && body.selected_provider_name
        ? { id: body.selected_provider_id, name: body.selected_provider_name }
        : undefined,
      // Selected category (required before ordering)
      selectedCategory: body.selected_category,
      // Map cart items to context format (with proper IDs for deduplication)
      cartItems: body.cart_items?.map(item => ({
        id: item.menu_item_id,
        name: item.name_ar,
        quantity: item.quantity,
        price: item.unit_price,
        variant_id: item.variant_id
      })),
      cartProviderId: body.cart_provider_id,
      cartTotal: cartTotal,
      // Customer memory for personalization
      customerMemory: customerMemory || undefined,
      // Session memory for pending items/variants from previous messages
      sessionMemory: body.memory as AgentContext['sessionMemory']
    }

    // Convert messages
    const agentMessages: AgentMessage[] = body.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Run agent without streaming
    let fullContent = ''
    let finalResponse: AgentStreamEvent['response'] = undefined

    const agentStream = runAgentStream({
      context,
      messages: agentMessages
    })

    for await (const event of agentStream) {
      if (event.type === 'content' && event.content) {
        fullContent += event.content
      }
      if (event.type === 'done') {
        finalResponse = event.response
      }
    }

    // 🔄 POST-PROCESS: Deduplicate cart actions against existing cart
    let processedCartActions = finalResponse?.cartActions
    if (finalResponse?.cartActions && finalResponse.cartActions.length > 0) {
      const existingCartItems: CartItem[] = (context.cartItems || []).map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        variant_id: item.variant_id
      }))

      const postProcessed = postProcessCartActions(
        finalResponse.cartActions as CartAction[],
        existingCartItems
      )

      processedCartActions = postProcessed.cartActions
    }

    return NextResponse.json({
      content: finalResponse?.content || fullContent,
      suggestions: finalResponse?.suggestions || [],
      quick_replies: finalResponse?.quickReplies || [],
      products: finalResponse?.products || [],
      cart_actions: processedCartActions
    })

  } catch (error) {
    console.error('[Chat API Error]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
