/**
 * AI Agent Handler for Engezna Smart Assistant
 *
 * This file handles the AI agent conversation loop using OpenAI with function calling.
 */

import OpenAI from 'openai'
import {
  AGENT_TOOLS,
  executeAgentTool,
  getAvailableTools,
  type ToolContext,
  type ToolResult
} from './agentTools'
import {
  buildSystemPrompt,
  type AgentContext,
  type AgentResponse,
  type ConversationTurn
} from './agentPrompt'

// =============================================================================
// TYPES
// =============================================================================

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentStreamEvent {
  type: 'content' | 'tool_call' | 'tool_result' | 'done' | 'error'
  content?: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: ToolResult
  error?: string
  response?: AgentResponse
}

export interface AgentHandlerOptions {
  context: AgentContext
  messages: AgentMessage[]
  onStream?: (event: AgentStreamEvent) => void
}

// =============================================================================
// OPENAI CLIENT (Lazy initialization)
// =============================================================================

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  return openaiClient
}

// =============================================================================
// CONVERT TOOLS TO OPENAI FORMAT
// =============================================================================

function convertToolsToOpenAI(context: ToolContext): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const availableTools = getAvailableTools(context)

  return availableTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))
}

// =============================================================================
// MAIN AGENT HANDLER
// =============================================================================

export async function runAgent(options: AgentHandlerOptions): Promise<AgentResponse> {
  const { context, messages, onStream } = options

  // Build system prompt
  const systemPrompt = buildSystemPrompt(context)

  // Convert tools to OpenAI format
  const tools = convertToolsToOpenAI(context)

  // Build messages array for OpenAI
  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))
  ]

  // Track conversation turns for this request
  const turns: ConversationTurn[] = []
  let finalResponse: AgentResponse = { content: '' }

  // Run the agent loop (max 5 iterations to prevent infinite loops)
  for (let iteration = 0; iteration < 5; iteration++) {
    try {
      // Call OpenAI
      const completion = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: openaiMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 1000
      })

      const choice = completion.choices[0]
      const message = choice.message

      // Check if the model wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Add assistant message with tool calls to history
        openaiMessages.push({
          role: 'assistant',
          content: message.content || '',
          tool_calls: message.tool_calls
        })

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          // Handle different tool call types
          if (toolCall.type !== 'function') continue
          const toolName = toolCall.function.name
          const toolArgs = JSON.parse(toolCall.function.arguments)

          // Stream tool call event
          onStream?.({
            type: 'tool_call',
            toolName,
            toolArgs
          })

          // Execute the tool
          const result = await executeAgentTool(toolName, toolArgs, context)

          // Stream tool result event
          onStream?.({
            type: 'tool_result',
            toolName,
            toolResult: result
          })

          // Add tool result to conversation
          turns.push({
            role: 'tool',
            content: JSON.stringify(result),
            toolName,
            toolResult: result,
            timestamp: new Date()
          })

          // Add tool result to OpenAI messages
          openaiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          })
        }

        // Continue the loop to get the final response
        continue
      }

      // No tool calls - this is the final response
      const content = message.content || ''

      // Stream content
      onStream?.({
        type: 'content',
        content
      })

      // Parse the response to extract structured data
      finalResponse = parseAgentOutput(content, turns)

      // Stream done event
      onStream?.({
        type: 'done',
        response: finalResponse
      })

      break

    } catch (error) {
      console.error('[Agent Error]:', error)

      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير متوقع'

      onStream?.({
        type: 'error',
        error: errorMessage
      })

      finalResponse = {
        content: 'عذراً، حدث خطأ. من فضلك حاول مرة تانية.',
        suggestions: ['🔄 حاول مرة تانية']
      }

      break
    }
  }

  return finalResponse
}

// =============================================================================
// STREAMING AGENT HANDLER
// =============================================================================

export async function* runAgentStream(options: AgentHandlerOptions): AsyncGenerator<AgentStreamEvent> {
  const { context, messages } = options

  // Build system prompt
  const systemPrompt = buildSystemPrompt(context)

  // Convert tools to OpenAI format
  const tools = convertToolsToOpenAI(context)

  // Build messages array for OpenAI
  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))
  ]

  const turns: ConversationTurn[] = []

  // Run the agent loop
  for (let iteration = 0; iteration < 5; iteration++) {
    try {
      const stream = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true
      })

      let accumulatedContent = ''
      const toolCalls: Array<{
        id: string
        name: string
        arguments: string
      }> = []

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        // Handle content streaming
        if (delta?.content) {
          accumulatedContent += delta.content
          yield {
            type: 'content',
            content: delta.content
          }
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              if (!toolCalls[toolCallDelta.index]) {
                toolCalls[toolCallDelta.index] = {
                  id: toolCallDelta.id || '',
                  name: toolCallDelta.function?.name || '',
                  arguments: ''
                }
              }

              if (toolCallDelta.id) {
                toolCalls[toolCallDelta.index].id = toolCallDelta.id
              }
              if (toolCallDelta.function?.name) {
                toolCalls[toolCallDelta.index].name = toolCallDelta.function.name
              }
              if (toolCallDelta.function?.arguments) {
                toolCalls[toolCallDelta.index].arguments += toolCallDelta.function.arguments
              }
            }
          }
        }
      }

      // Process tool calls if any
      if (toolCalls.length > 0) {
        // Add assistant message with tool calls
        openaiMessages.push({
          role: 'assistant',
          content: accumulatedContent || null,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: tc.arguments
            }
          }))
        })

        // Execute each tool
        for (const toolCall of toolCalls) {
          const toolArgs = JSON.parse(toolCall.arguments)

          yield {
            type: 'tool_call',
            toolName: toolCall.name,
            toolArgs
          }

          const result = await executeAgentTool(toolCall.name, toolArgs, context)

          yield {
            type: 'tool_result',
            toolName: toolCall.name,
            toolResult: result
          }

          turns.push({
            role: 'tool',
            content: JSON.stringify(result),
            toolName: toolCall.name,
            toolResult: result,
            timestamp: new Date()
          })

          openaiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          })
        }

        // Continue loop
        continue
      }

      // Final response
      const finalResponse = parseAgentOutput(accumulatedContent, turns)

      yield {
        type: 'done',
        response: finalResponse
      }

      return

    } catch (error) {
      console.error('[Agent Stream Error]:', error)

      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
      }

      return
    }
  }

  // Max iterations reached
  yield {
    type: 'done',
    response: {
      content: 'عذراً، مش قادر أكمل الطلب دلوقتي. حاول مرة تانية.',
      suggestions: ['🔄 حاول مرة تانية']
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse agent output to extract structured response
 */
function parseAgentOutput(content: string, turns: ConversationTurn[]): AgentResponse {
  const response: AgentResponse = {
    content: content.trim(),
    suggestions: [],
    quickReplies: [],
    products: []
  }

  // Extract products from tool results
  for (const turn of turns) {
    if (turn.role === 'tool' && turn.toolResult) {
      const result = turn.toolResult as ToolResult
      if (result.success && Array.isArray(result.data)) {
        // Check if it looks like menu items
        const items = result.data as Array<Record<string, unknown>>
        if (items.length > 0 && items[0].name_ar && items[0].price) {
          response.products = items.slice(0, 5).map(item => ({
            id: item.id as string,
            name: item.name_ar as string,
            price: item.price as number,
            image: item.image_url as string | undefined,
            hasVariants: item.has_variants as boolean | undefined,
            providerId: item.provider_id as string | undefined,
            providerName: (item.providers as { name_ar?: string })?.name_ar
          }))
        }
      }
    }
  }

  // Generate contextual suggestions
  if (response.products && response.products.length > 0) {
    response.suggestions = ['🛒 أضف للسلة', '📋 شوف تفاصيل أكتر', '🔍 بحث تاني']
    response.quickReplies = [
      { title: '🛒 أضف للسلة', payload: `add_to_cart:${response.products[0]?.id}` },
      { title: '📋 تفاصيل', payload: `item_details:${response.products[0]?.id}` },
      { title: '🔍 بحث تاني', payload: 'search_again' }
    ]
  } else if (content.includes('طلب') || content.includes('order')) {
    response.suggestions = ['📦 تتبع الطلب', '❌ إلغاء', '🏠 الرئيسية']
  } else {
    response.suggestions = ['🍽️ المنيو', '🔥 العروض', '📦 طلباتي']
  }

  return response
}

/**
 * Simple agent for quick responses (no streaming)
 */
export async function quickAgentResponse(
  userMessage: string,
  context: AgentContext
): Promise<AgentResponse> {
  return runAgent({
    context,
    messages: [{ role: 'user', content: userMessage }]
  })
}
