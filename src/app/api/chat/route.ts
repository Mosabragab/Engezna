/**
 * AI Chat API Route - Agent-Based Implementation
 *
 * Uses OpenAI GPT-4o-mini with Function Calling for an AI Agent that can
 * interact with the database and help customers with their orders.
 *
 * @version 2.0.0 - Complete rewrite using AI Agent architecture
 */

import { NextRequest, NextResponse } from 'next/server'
import { runAgentStream, type AgentStreamEvent, type AgentMessage } from '@/lib/ai/agentHandler'
import type { AgentContext } from '@/lib/ai/agentPrompt'

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
  cart_provider_id?: string
  cart_items?: Array<{
    id: string
    name: string
    quantity: number
    price: number
  }>
  cart_total?: number
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

    // Build agent context
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
      cartItems: body.cart_items,
      cartProviderId: body.cart_provider_id,
      cartTotal: body.cart_total
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
                controller.enqueue(sse.encode('message', {
                  content: response?.content || fullContent,
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
                  navigate_to: response?.navigateTo
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

    // Build context
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
      cartItems: body.cart_items,
      cartProviderId: body.cart_provider_id,
      cartTotal: body.cart_total
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

    return NextResponse.json({
      content: finalResponse?.content || fullContent,
      suggestions: finalResponse?.suggestions || [],
      quick_replies: finalResponse?.quickReplies || [],
      products: finalResponse?.products || []
    })

  } catch (error) {
    console.error('[Chat API Error]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
