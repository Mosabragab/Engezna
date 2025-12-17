/**
 * AI Agent Handler for Engezna Smart Assistant
 *
 * This file handles the AI agent conversation loop.
 * Supports both OpenAI (GPT-4o-mini) and Anthropic (Claude 3.5 Haiku).
 *
 * Set AI_PROVIDER=claude in .env to use Claude, otherwise defaults to OpenAI.
 */

import OpenAI from 'openai'
import {
  AGENT_TOOLS,
  executeAgentTool,
  getAvailableTools,
  type ToolContext,
  type ToolResult,
  loadCustomerInsights,
  saveCustomerInsights,
  analyzeConversationForInsights
} from './agentTools'
import { validateToolParams, checkRateLimit } from './toolValidation'
import {
  buildSystemPrompt,
  type AgentContext,
  type AgentResponse,
  type ConversationTurn
} from './agentPrompt'
import { runClaudeAgentStream, runClaudeAgent } from './claudeHandler'

// =============================================================================
// AI PROVIDER CONFIGURATION
// =============================================================================

type AIProvider = 'openai' | 'claude'

function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase()
  if (provider === 'claude' || provider === 'anthropic') {
    return 'claude'
  }
  return 'openai'
}

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
// MAIN AGENT HANDLER (Provider-agnostic)
// =============================================================================

export async function runAgent(options: AgentHandlerOptions): Promise<AgentResponse> {
  // Check which AI provider to use
  const provider = getAIProvider()

  if (provider === 'claude') {
    // Delegate to Claude handler
    return runClaudeAgent(options)
  }

  // OpenAI implementation below
  const { context, messages, onStream } = options

  // Load customer insights if customer is logged in
  let enrichedContext = { ...context }
  if (context.customerId) {
    try {
      const insights = await loadCustomerInsights(context.customerId)
      if (insights) {
        console.log('[runAgent] Loaded customer insights:', insights.conversation_style?.customer_type)
        enrichedContext = {
          ...context,
          customerMemory: {
            ...context.customerMemory,
            preferences: insights.preferences as { spicy?: boolean; vegetarian?: boolean; notes?: string[] },
          }
        }
      }
    } catch (error) {
      console.error('[runAgent] Failed to load customer insights:', error)
    }
  }

  // Build system prompt with enriched context
  const systemPrompt = buildSystemPrompt(enrichedContext)

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
      // Call OpenAI with optimized settings for natural conversation
      const completion = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini', // Can upgrade to 'gpt-4o' for better conversation quality
        messages: openaiMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.85, // Higher for more natural, varied responses
        max_tokens: 1500,  // More room for detailed, helpful responses
        presence_penalty: 0.1, // Slight penalty to reduce repetition
        frequency_penalty: 0.1 // Encourage diverse vocabulary
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

          // Validate tool parameters before execution
          const validation = validateToolParams(toolName, toolArgs, context)
          if (!validation.valid) {
            // Return validation error as tool result
            const validationResult: ToolResult = {
              success: false,
              error: validation.error,
              message: validation.message
            }

            onStream?.({
              type: 'tool_result',
              toolName,
              toolResult: validationResult
            })

            turns.push({
              role: 'tool',
              content: JSON.stringify(validationResult),
              toolName,
              toolResult: validationResult,
              timestamp: new Date()
            })

            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(validationResult)
            })

            continue
          }

          // Check rate limits (using a simple conversation identifier)
          const conversationId = context.customerId || 'anonymous'
          const rateLimit = checkRateLimit(toolName, conversationId)
          if (!rateLimit.allowed) {
            const rateLimitResult: ToolResult = {
              success: false,
              error: 'rate_limited',
              message: rateLimit.message
            }

            onStream?.({
              type: 'tool_result',
              toolName,
              toolResult: rateLimitResult
            })

            turns.push({
              role: 'tool',
              content: JSON.stringify(rateLimitResult),
              toolName,
              toolResult: rateLimitResult,
              timestamp: new Date()
            })

            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(rateLimitResult)
            })

            continue
          }

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
      finalResponse = parseAgentOutput(content, turns, context.providerId || context.cartProviderId)

      // Stream done event
      onStream?.({
        type: 'done',
        response: finalResponse
      })

      break

    } catch (error) {
      console.error('[Agent Error]:', error)

      // Never expose technical errors to users - just show a friendly message
      // Log the actual error for debugging but give user a positive experience

      finalResponse = {
        content: 'مش لاقي نتائج دلوقتي. جرب تاني أو اسألني سؤال تاني 😊',
        suggestions: ['🔄 جرب تاني', '🛒 المنتجات', '🏠 الرئيسية']
      }

      onStream?.({
        type: 'done',
        response: finalResponse
      })

      break
    }
  }

  // Save customer insights after conversation (non-blocking)
  if (context.customerId && turns.length > 0) {
    const toolResults = turns
      .filter(t => t.role === 'tool' && t.toolResult)
      .map(t => ({ toolName: t.toolName || '', result: t.toolResult as ToolResult }))

    const insights = analyzeConversationForInsights(
      messages.map(m => ({ role: m.role, content: m.content })),
      toolResults
    )

    // Save insights asynchronously (don't block the response)
    saveCustomerInsights(context.customerId, insights).catch(err => {
      console.error('[runAgent] Failed to save customer insights:', err)
    })
  }

  return finalResponse
}

// =============================================================================
// STREAMING AGENT HANDLER (Provider-agnostic)
// =============================================================================

export async function* runAgentStream(options: AgentHandlerOptions): AsyncGenerator<AgentStreamEvent> {
  // Check which AI provider to use
  const provider = getAIProvider()

  if (provider === 'claude') {
    // Delegate to Claude handler
    yield* runClaudeAgentStream(options)
    return
  }

  // OpenAI implementation below
  const { context, messages } = options

  // Load customer insights if customer is logged in
  let enrichedContext = { ...context }
  if (context.customerId) {
    try {
      const insights = await loadCustomerInsights(context.customerId)
      if (insights) {
        console.log('[runAgentStream] Loaded customer insights:', insights.conversation_style?.customer_type)
        enrichedContext = {
          ...context,
          customerMemory: {
            ...context.customerMemory,
            preferences: insights.preferences as { spicy?: boolean; vegetarian?: boolean; notes?: string[] },
          }
        }
      }
    } catch (error) {
      console.error('[runAgentStream] Failed to load customer insights:', error)
    }
  }

  // Build system prompt with enriched context
  const systemPrompt = buildSystemPrompt(enrichedContext)

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
      // Streaming with optimized settings for natural conversation
      const stream = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini', // Can upgrade to 'gpt-4o' for better conversation quality
        messages: openaiMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.85, // Higher for more natural, varied responses
        max_tokens: 1500,  // More room for detailed, helpful responses
        presence_penalty: 0.1, // Slight penalty to reduce repetition
        frequency_penalty: 0.1, // Encourage diverse vocabulary
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
          const toolName = toolCall.name

          yield {
            type: 'tool_call',
            toolName,
            toolArgs
          }

          // Validate tool parameters before execution
          const validation = validateToolParams(toolName, toolArgs, context)
          if (!validation.valid) {
            const validationResult: ToolResult = {
              success: false,
              error: validation.error,
              message: validation.message
            }

            yield {
              type: 'tool_result',
              toolName,
              toolResult: validationResult
            }

            turns.push({
              role: 'tool',
              content: JSON.stringify(validationResult),
              toolName,
              toolResult: validationResult,
              timestamp: new Date()
            })

            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(validationResult)
            })

            continue
          }

          // Check rate limits
          const conversationId = context.customerId || 'anonymous'
          const rateLimit = checkRateLimit(toolName, conversationId)
          if (!rateLimit.allowed) {
            const rateLimitResult: ToolResult = {
              success: false,
              error: 'rate_limited',
              message: rateLimit.message
            }

            yield {
              type: 'tool_result',
              toolName,
              toolResult: rateLimitResult
            }

            turns.push({
              role: 'tool',
              content: JSON.stringify(rateLimitResult),
              toolName,
              toolResult: rateLimitResult,
              timestamp: new Date()
            })

            openaiMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(rateLimitResult)
            })

            continue
          }

          const result = await executeAgentTool(toolName, toolArgs, context)

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
      const finalResponse = parseAgentOutput(accumulatedContent, turns, context.providerId || context.cartProviderId)

      // Save customer insights after conversation (non-blocking)
      if (context.customerId && turns.length > 0) {
        const toolResults = turns
          .filter(t => t.role === 'tool' && t.toolResult)
          .map(t => ({ toolName: t.toolName || '', result: t.toolResult as ToolResult }))

        const insights = analyzeConversationForInsights(
          messages.map(m => ({ role: m.role, content: m.content })),
          toolResults
        )

        saveCustomerInsights(context.customerId, insights).catch(err => {
          console.error('[runAgentStream] Failed to save customer insights:', err)
        })
      }

      yield {
        type: 'done',
        response: finalResponse
      }

      return

    } catch (error) {
      console.error('[Agent Stream Error]:', error)

      // Never expose technical errors to users - just show a friendly message
      yield {
        type: 'done',
        response: {
          content: 'مش لاقي نتائج دلوقتي. جرب تاني أو اسألني سؤال تاني 😊',
          suggestions: ['🔄 جرب تاني', '🛒 المنتجات', '🏠 الرئيسية']
        }
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
 * Smart Quick Reply Generator
 *
 * Analyzes the AI response content and tool results to generate
 * contextually relevant quick replies. More intelligent than hardcoded logic.
 */
function generateDynamicQuickReplies(
  content: string,
  hasCartAction: boolean,
  hasProducts: boolean,
  productId?: string,
  toolsUsed?: string[],
  providerId?: string
): { suggestions: string[]; quickReplies: AgentResponse['quickReplies'] } {

  // Helper: create products navigation payload
  const menuPayload = providerId
    ? `navigate:/ar/providers/${providerId}`
    : 'عايز أشوف المنتجات'

  // Analyze content for intent signals
  const contentLower = content.toLowerCase()

  // =================================================================
  // INTENT DETECTION: Analyze what the AI said to determine best actions
  // =================================================================

  // Check if AI is asking about size/variant selection
  const isAskingVariant = contentLower.includes('حجم') ||
    contentLower.includes('أي حجم') ||
    contentLower.includes('صغير') && contentLower.includes('كبير') ||
    contentLower.includes('اختار')

  // Check if AI is asking about quantity
  const isAskingQuantity = contentLower.includes('كام واحد') ||
    contentLower.includes('كام واحدة') ||
    contentLower.includes('الكمية')

  // Check if AI is confirming something
  const isConfirming = contentLower.includes('صح؟') ||
    contentLower.includes('صح كده') ||
    contentLower.includes('تمام كده')

  // Check if search returned no results
  const noResults = contentLower.includes('مش لاقي') ||
    contentLower.includes('ملقتش') ||
    contentLower.includes('مفيش')

  // Check if AI is showing promotions
  const showingPromotions = toolsUsed?.includes('get_promotions') ||
    contentLower.includes('عرض') || contentLower.includes('خصم')

  // =================================================================
  // CONTEXTUAL QUICK REPLIES (Order matters! Most decisive checks first)
  // =================================================================

  // 🔴 HIGHEST PRIORITY: After adding to cart - always show cart buttons
  // This MUST come first because cart action is the most decisive signal
  if (hasCartAction) {
    return {
      suggestions: ['🛒 شوف السلة', '➕ أضف حاجة تانية', '✅ كمل للدفع'],
      quickReplies: [
        { title: '🛒 شوف السلة', payload: 'ايه في السلة؟' },
        { title: '➕ أضف حاجة تانية', payload: 'عايز أضيف حاجة تانية' },
        { title: '✅ كمل للدفع', payload: 'navigate:/ar/checkout' }
      ]
    }
  }

  // AI asking about provider preference (من مطعم معين؟ ولا أساعدك؟)
  const isAskingProviderPreference =
    (contentLower.includes('مطعم معين') || contentLower.includes('مكان معين')) &&
    (contentLower.includes('أساعدك') || contentLower.includes('اختيار') || contentLower.includes('ولا'))

  if (isAskingProviderPreference) {
    return {
      suggestions: ['🔍 ساعدني أختار', '🏪 عندي مطعم معين', '🔥 شوف العروض'],
      quickReplies: [
        { title: '🔍 ساعدني أختار', payload: 'ساعدني أختار أحسن مكان' },
        { title: '🏪 عندي مطعم معين', payload: 'أيوه عندي مطعم معين' },
        { title: '🔥 شوف العروض', payload: 'ورّيني العروض الأول' }
      ]
    }
  }

  // Size/Variant selection needed
  // Only show size buttons if the content explicitly mentions these standard sizes
  // Don't show for other variants like "عادي/سوبر" or "ربع كيلو/نص كيلو"
  const hasStandardSizes = contentLower.includes('صغير') &&
    contentLower.includes('وسط') &&
    contentLower.includes('كبير')

  if (isAskingVariant && hasProducts && hasStandardSizes) {
    return {
      suggestions: ['صغير', 'وسط', 'كبير'],
      quickReplies: [
        { title: '📏 صغير', payload: 'عايز الحجم الصغير' },
        { title: '📏 وسط', payload: 'عايز الحجم الوسط' },
        { title: '📏 كبير', payload: 'عايز الحجم الكبير' }
      ]
    }
  }

  // For other variant types (عادي/سوبر, ربع/نص كيلو), show generic add button
  if (isAskingVariant && hasProducts && !hasStandardSizes) {
    return {
      suggestions: ['ضيف للسلة', 'تفاصيل أكتر'],
      quickReplies: [
        { title: '✅ ضيف للسلة', payload: 'ضيفه للسلة' },
        { title: '📋 تفاصيل أكتر', payload: 'عايز تفاصيل أكتر' },
        { title: '🔍 حاجة تانية', payload: 'عايز حاجة تانية' }
      ]
    }
  }

  // Quantity selection needed
  if (isAskingQuantity) {
    return {
      suggestions: ['1️⃣ واحدة', '2️⃣ اتنين', '3️⃣ تلاتة'],
      quickReplies: [
        { title: '1️⃣ واحدة', payload: 'واحدة بس' },
        { title: '2️⃣ اتنين', payload: 'اتنين' },
        { title: '3️⃣ تلاتة', payload: 'تلاتة' }
      ]
    }
  }

  // Confirmation needed
  if (isConfirming) {
    return {
      suggestions: ['✅ أيوه تمام', '❌ لأ غير', '🔄 عدل الكمية'],
      quickReplies: [
        { title: '✅ أيوه تمام', payload: 'أيوه ضيف للسلة' },
        { title: '❌ لأ غير', payload: 'لأ عايز أغير' },
        { title: '🔄 عدل الكمية', payload: 'عايز أغير الكمية' }
      ]
    }
  }

  // Provider selection/disambiguation - when asking user to choose a provider
  const isProviderSelection = contentLower.includes('تفضل تطلب من مين') ||
    contentLower.includes('اختار المطعم') ||
    contentLower.includes('تفضل مين') ||
    (contentLower.includes('لقيت') && contentLower.includes('مكان'))

  if (isProviderSelection) {
    return {
      suggestions: ['🏆 الأعلى تقييماً', '💰 الأرخص', '🔥 اللي عنده عروض'],
      quickReplies: [
        { title: '🏆 الأعلى تقييماً', payload: 'عايز الأعلى تقييماً' },
        { title: '💰 الأرخص', payload: 'عايز الأرخص' },
        { title: '🔥 اللي عنده عروض', payload: 'عايز اللي عنده عروض' },
        { title: '🔍 حاجة تانية', payload: 'عايز حاجة تانية خالص' }
      ]
    }
  }

  // No results found - help user search differently
  if (noResults) {
    return {
      suggestions: ['🔍 بحث تاني', '🛒 شوف المنتجات', '🔥 العروض'],
      quickReplies: [
        { title: '🔍 بحث تاني', payload: 'عايز أبحث عن حاجة تانية' },
        { title: '🛒 شوف المنتجات', payload: menuPayload },
        { title: '🔥 العروض', payload: 'فيه عروض ايه دلوقتي؟' }
      ]
    }
  }

  // After search with products found
  if (hasProducts && productId) {
    return {
      suggestions: ['✅ ضيف للسلة', '📋 تفاصيل أكتر', '🔍 حاجة تانية'],
      quickReplies: [
        { title: '✅ ضيف للسلة', payload: 'ضيف الأول للسلة' },
        { title: '📋 تفاصيل أكتر', payload: 'عايز تفاصيل أكتر' },
        { title: '🔍 حاجة تانية', payload: 'عايز أبحث عن حاجة تانية' }
      ]
    }
  }

  // Showing promotions
  if (showingPromotions) {
    return {
      suggestions: ['🎁 استخدم العرض', '🛒 شوف المنتجات', '🔍 بحث'],
      quickReplies: [
        { title: '🎁 استخدم العرض', payload: 'عايز أستخدم العرض ده' },
        { title: '🛒 شوف المنتجات', payload: menuPayload },
        { title: '🔍 بحث', payload: 'عايز أبحث عن حاجة' }
      ]
    }
  }

  // Order tracking context
  if (toolsUsed?.includes('track_order') || toolsUsed?.includes('get_order_status')) {
    return {
      suggestions: ['📍 تتبع الطلب', '📞 اتصل بالمطعم', '❌ إلغاء الطلب'],
      quickReplies: [
        { title: '📍 تتبع الطلب', payload: 'فين طلبي دلوقتي؟' },
        { title: '📞 اتصل بالمطعم', payload: 'عايز رقم المطعم' },
        { title: '❌ إلغاء الطلب', payload: 'عايز ألغي الطلب' }
      ]
    }
  }

  // Complaint or problem context
  if (contentLower.includes('مشكلة') || contentLower.includes('شكوى') ||
      contentLower.includes('زعلان') || contentLower.includes('معلش')) {
    return {
      suggestions: ['📞 كلم خدمة العملاء', '📝 اكتب شكوى', '🔙 رجوع'],
      quickReplies: [
        { title: '📞 كلم خدمة العملاء', payload: 'عايز أكلم حد من خدمة العملاء' },
        { title: '📝 اكتب شكوى', payload: 'عايز أعمل شكوى رسمية' },
        { title: '🔙 رجوع', payload: 'خلاص مش محتاج' }
      ]
    }
  }

  // Cart summary context
  if (toolsUsed?.includes('get_cart_summary') ||
      (contentLower.includes('السلة') && contentLower.includes('فيها'))) {
    return {
      suggestions: ['✅ كمل للدفع', '➕ أضف حاجة', '🗑️ فضي السلة'],
      quickReplies: [
        { title: '✅ كمل للدفع', payload: 'navigate:/ar/checkout' },
        { title: '➕ أضف حاجة', payload: 'عايز أضيف حاجة تانية' },
        { title: '🗑️ فضي السلة', payload: 'امسح السلة كلها' }
      ]
    }
  }

  // Delivery info context - show products button instead of "تمام اطلب"
  if (toolsUsed?.includes('get_delivery_info') ||
      contentLower.includes('توصيل') || contentLower.includes('رسوم')) {
    return {
      suggestions: ['🛒 شوف المنتجات', '🔍 بحث تاني', '🔥 العروض'],
      quickReplies: [
        { title: '🛒 شوف المنتجات', payload: menuPayload },
        { title: '🔍 بحث تاني', payload: 'عايز أبحث عن حاجة' },
        { title: '🔥 العروض', payload: 'فيه عروض ايه؟' }
      ]
    }
  }

  // Menu/categories context
  if (toolsUsed?.includes('get_provider_categories') || toolsUsed?.includes('get_menu_items')) {
    return {
      suggestions: ['🍕 بيتزا', '🍔 برجر', '🥗 سلطات', '🔍 بحث'],
      quickReplies: [
        { title: '🍕 بيتزا', payload: 'عايز بيتزا' },
        { title: '🍔 برجر', payload: 'عايز برجر' },
        { title: '🥗 سلطات', payload: 'عايز سلطة' },
        { title: '🔍 بحث', payload: 'عايز أبحث عن حاجة معينة' }
      ]
    }
  }

  // Greeting/welcome context - guide to provider selection
  if (contentLower.includes('أهلاً') || contentLower.includes('أهلا') ||
      contentLower.includes('صباح') || contentLower.includes('مساء') ||
      contentLower.includes('عايز تطلب منين') || contentLower.includes('عايزة تطلبي منين')) {
    return {
      suggestions: ['🏪 عندي مكان معين', '🔍 ساعدني أختار', '🔥 اللي عندهم عروض'],
      quickReplies: [
        { title: '🏪 عندي مكان معين', payload: 'عايز أطلب من مكان معين' },
        { title: '🔍 ساعدني أختار', payload: 'ساعدني أختار مكان' },
        { title: '🔥 اللي عندهم عروض', payload: 'ورّيني الأماكن اللي عندها عروض' }
      ]
    }
  }

  // Default suggestions - context-aware
  // If user has selected a provider, show products button; otherwise guide to provider selection
  if (providerId) {
    return {
      suggestions: ['🛒 شوف المنتجات', '🔥 العروض', '📦 طلباتي'],
      quickReplies: [
        { title: '🛒 شوف المنتجات', payload: menuPayload },
        { title: '🔥 العروض', payload: 'فيه عروض ايه؟' },
        { title: '📦 طلباتي', payload: 'فين طلباتي؟' }
      ]
    }
  }

  // No provider selected - guide to selection
  return {
    suggestions: ['🏪 عندي مكان معين', '🔍 ساعدني أختار', '🔥 اللي عندهم عروض'],
    quickReplies: [
      { title: '🏪 عندي مكان معين', payload: 'عايز أطلب من مكان معين' },
      { title: '🔍 ساعدني أختار', payload: 'ساعدني أختار مكان' },
      { title: '🔥 اللي عندهم عروض', payload: 'ورّيني الأماكن اللي عندها عروض' }
    ]
  }
}

/**
 * Sanitize AI response to remove unsafe content
 * This is a POST-PROCESSING GUARDRAIL to ensure no URLs or markdown images slip through
 */
function sanitizeAgentResponse(content: string): string {
  let sanitized = content

  // Remove markdown image syntax: ![alt](url)
  sanitized = sanitized.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')

  // Remove markdown links but keep the text: [text](url) -> text
  sanitized = sanitized.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

  // Remove raw URLs (http, https, ftp)
  sanitized = sanitized.replace(/https?:\/\/[^\s<>"\)]+/gi, '')
  sanitized = sanitized.replace(/ftp:\/\/[^\s<>"\)]+/gi, '')

  // Remove any remaining URL-like patterns
  sanitized = sanitized.replace(/www\.[^\s<>"\)]+/gi, '')

  // Remove bold/italic markdown that might look odd
  sanitized = sanitized.replace(/\*\*([^*]+)\*\*/g, '$1')
  sanitized = sanitized.replace(/\*([^*]+)\*/g, '$1')
  sanitized = sanitized.replace(/__([^_]+)__/g, '$1')
  sanitized = sanitized.replace(/_([^_]+)_/g, '$1')

  // Remove code blocks
  sanitized = sanitized.replace(/```[\s\S]*?```/g, '')
  sanitized = sanitized.replace(/`([^`]+)`/g, '$1')

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, '')

  // Remove JSON blocks (sometimes AI outputs raw JSON)
  sanitized = sanitized.replace(/\{[\s\S]*?"[\s\S]*?\}/g, '')

  // Clean up extra whitespace
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n')
  sanitized = sanitized.replace(/  +/g, ' ')

  return sanitized.trim()
}

/**
 * Parse agent output to extract structured response
 */
function parseAgentOutput(content: string, turns: ConversationTurn[], providerId?: string): AgentResponse {
  // Apply post-processing guardrails to sanitize the response
  const sanitizedContent = sanitizeAgentResponse(content)

  const response: AgentResponse = {
    content: sanitizedContent,
    suggestions: [],
    quickReplies: [],
    products: [],
    cartActions: []  // Collect ALL cart actions from multiple tool calls
  }

  // Track which tools were used
  const toolsUsed: string[] = []

  // Extract products and cart actions from tool results
  for (const turn of turns) {
    if (turn.role === 'tool' && turn.toolResult) {
      if (turn.toolName) {
        toolsUsed.push(turn.toolName)
      }

      const result = turn.toolResult as ToolResult

      // ═══════════════════════════════════════════════════════════════════
      // FIX: Extract discovered_provider_id from tool results
      // Check BOTH root level (lookup_provider) AND inside data (search_menu)
      // ═══════════════════════════════════════════════════════════════════
      if (result.discovered_provider_id && !response.discoveredProviderId) {
        response.discoveredProviderId = result.discovered_provider_id
        response.discoveredProviderName = result.discovered_provider_name
        console.log('[parseAgentOutput] Discovered provider (root):', result.discovered_provider_id, result.discovered_provider_name)
      }

      if (result.success && result.data) {
        const data = result.data as Record<string, unknown>

        // Also check inside data (for search_menu)
        if (data.discovered_provider_id && !response.discoveredProviderId) {
          response.discoveredProviderId = data.discovered_provider_id as string
          response.discoveredProviderName = data.discovered_provider_name as string | undefined
          console.log('[parseAgentOutput] Discovered provider (data):', data.discovered_provider_id, data.discovered_provider_name)
        }

        // Check for cart_action (from add_to_cart tool)
        // Collect ALL cart actions instead of overwriting
        if (data.cart_action) {
          const cartAction = data.cart_action as AgentResponse['cartAction']
          response.cartActions!.push(cartAction!)
          // Also set single cartAction for backward compatibility (last one)
          response.cartAction = cartAction
        }

        // Check if it's an array of menu items
        if (Array.isArray(result.data)) {
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

            // ═══════════════════════════════════════════════════════════════════
            // FIX: Store pending item in sessionMemory for next request
            // This allows the AI to remember the item IDs when user says "ضيف"
            // ═══════════════════════════════════════════════════════════════════
            const firstItem = items[0]
            const variants = firstItem.variants as Array<{ id: string; name_ar: string; price: number }> | undefined

            response.sessionMemory = {
              pending_item: {
                id: firstItem.id as string,
                name_ar: firstItem.name_ar as string,
                price: firstItem.price as number,
                provider_id: firstItem.provider_id as string,
                provider_name_ar: (firstItem.providers as { name_ar?: string })?.name_ar,
                has_variants: firstItem.has_variants as boolean | undefined,
                variants: variants?.map(v => ({
                  id: v.id,
                  name_ar: v.name_ar,
                  price: v.price
                }))
              }
            }
            console.log('[parseAgentOutput] Stored pending item:', response.sessionMemory.pending_item?.name_ar, 'with', variants?.length || 0, 'variants')
          }
        }
      }
    }
  }

  // Generate dynamic quick replies based on context
  // Use provider ID from first product if available, otherwise fall back to context
  const effectiveProviderId = response.products?.[0]?.providerId || providerId

  // Check for cart actions (both singular and plural)
  const hasAnyCartAction = !!(response.cartAction || (response.cartActions && response.cartActions.length > 0))

  const { suggestions, quickReplies } = generateDynamicQuickReplies(
    content,
    hasAnyCartAction,
    !!(response.products && response.products.length > 0),
    response.products?.[0]?.id,
    toolsUsed,
    effectiveProviderId
  )

  response.suggestions = suggestions
  response.quickReplies = quickReplies

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
