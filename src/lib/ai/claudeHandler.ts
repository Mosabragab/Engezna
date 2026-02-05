/**
 * Claude AI Agent Handler for Engezna Smart Assistant
 *
 * Uses Anthropic Claude 3.5 Haiku with Tool Use for the AI Agent.
 * Drop-in replacement for OpenAI handler.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  executeAgentTool,
  getAvailableTools,
  type ToolContext,
  type ToolResult,
} from './agentTools';
import { validateToolParams, checkRateLimit } from './toolValidation';
import {
  buildSystemPrompt,
  type AgentContext,
  type AgentResponse,
  type ConversationTurn,
} from './agentPrompt';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ClaudeAgent');

// =============================================================================
// TYPES
// =============================================================================

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentStreamEvent {
  type: 'content' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: ToolResult;
  error?: string;
  response?: AgentResponse;
}

export interface AgentHandlerOptions {
  context: AgentContext;
  messages: AgentMessage[];
  onStream?: (event: AgentStreamEvent) => void;
}

// =============================================================================
// ANTHROPIC CLIENT (Lazy initialization)
// =============================================================================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    // Support both ANTHROPIC_API_KEY and CLAUDE_API_KEY
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY or CLAUDE_API_KEY environment variable is not set');
    }
    anthropicClient = new Anthropic({
      apiKey,
    });
  }
  return anthropicClient;
}

// =============================================================================
// CONVERT TOOLS TO ANTHROPIC FORMAT
// =============================================================================

function convertToolsToAnthropic(context: ToolContext): Anthropic.Tool[] {
  const availableTools = getAvailableTools(context);

  return availableTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Tool['input_schema'],
  }));
}

// =============================================================================
// CONVERT MESSAGES FOR ANTHROPIC
// =============================================================================

type AnthropicMessage = Anthropic.MessageParam;

function convertMessagesToAnthropic(messages: AgentMessage[]): AnthropicMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

// =============================================================================
// STREAMING AGENT HANDLER (Claude)
// =============================================================================

export async function* runClaudeAgentStream(
  options: AgentHandlerOptions
): AsyncGenerator<AgentStreamEvent> {
  const { context, messages } = options;

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY SELECTION ENFORCEMENT (Pre-AI Check)
  // Same logic as OpenAI handler - check before calling Claude
  // ═══════════════════════════════════════════════════════════════════════════
  const lastUserMessage =
    messages
      .filter((m) => m.role === 'user')
      .pop()
      ?.content?.toLowerCase() || '';
  const isCategorySelection = lastUserMessage.startsWith('category:');
  const hasProviderContext = !!(context.providerId || context.cartProviderId);
  const hasCategorySelected = !!context.selectedCategory;

  const orderingKeywords = [
    'عايز',
    'عاوز',
    'عايزة',
    'عاوزة',
    'محتاج',
    'نفسي',
    'ابغى',
    'ابي',
    'بيتزا',
    'برجر',
    'شاورما',
    'فراخ',
    'كفتة',
    'فتة',
    'رز',
    'مكرونة',
    'مشروب',
    'عصير',
    'قهوة',
    'شاي',
    'كولا',
    'بيبسي',
    'سوبر',
    'ماركت',
    'خضار',
    'فاكهة',
    'لبن',
    'جبنة',
    'بيض',
    'حلو',
    'حلويات',
    'كيك',
    'جاتوه',
    'بسبوسة',
    'كنافة',
    'بن',
    'نوتيلا',
    'شوكولاتة',
  ];
  const seemsLikeOrdering = orderingKeywords.some((kw) => lastUserMessage.includes(kw));

  if (!hasCategorySelected && !hasProviderContext && !isCategorySelection && seemsLikeOrdering) {
    logger.debug('No category selected - returning prompt before calling AI');

    const categoryPromptContent = 'عشان أقدر أساعدك، اختار القسم اللي عايز تطلب منه الأول 👇';

    yield {
      type: 'content',
      content: categoryPromptContent,
    };

    yield {
      type: 'done',
      response: {
        content: categoryPromptContent,
        suggestions: ['🍔 مطاعم', '🛒 سوبر ماركت', '🍌 خضروات وفواكه', '☕ البن والحلويات'],
        quickReplies: [
          { title: '🍔 مطاعم', payload: 'category:restaurant_cafe' },
          { title: '🛒 سوبر ماركت', payload: 'category:grocery' },
          { title: '🍌 خضروات وفواكه', payload: 'category:vegetables_fruits' },
          { title: '☕ البن والحلويات', payload: 'category:coffee_sweets' },
        ],
      },
    };
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY SELECTION HANDLER - Transform payload to natural language
  // ═══════════════════════════════════════════════════════════════════════════
  let effectiveMessages = messages;
  if (isCategorySelection) {
    const categoryCode = lastUserMessage.replace('category:', '');
    logger.debug('Category selected - transforming for AI', { categoryCode });

    const categoryNames: Record<string, string> = {
      restaurant_cafe: 'مطاعم',
      coffee_sweets: 'البن والحلويات',
      grocery: 'سوبر ماركت',
      vegetables_fruits: 'خضروات وفواكه',
    };

    const categoryName = categoryNames[categoryCode] || categoryCode;

    // Find the original ordering request from conversation history
    const previousUserMessages = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .slice(0, -1);

    const originalRequest = previousUserMessages.find((msg) =>
      orderingKeywords.some((kw) => msg.toLowerCase().includes(kw))
    );

    const transformedMessage = originalRequest
      ? `اخترت قسم ${categoryName}. دور لي على: "${originalRequest}"`
      : `اخترت قسم ${categoryName}. ورّيني المتاح`;

    logger.debug('Transformed message for AI', { transformedMessage, categoryName });

    effectiveMessages = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === 'user') {
        return { ...m, content: transformedMessage };
      }
      return m;
    });
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(context);

  // Convert tools to Anthropic format
  const tools = convertToolsToAnthropic(context);

  // Convert messages to Anthropic format (use effectiveMessages which may be transformed)
  const anthropicMessages: AnthropicMessage[] = convertMessagesToAnthropic(effectiveMessages);

  const turns: ConversationTurn[] = [];

  // Run the agent loop (max 5 iterations)
  for (let iteration = 0; iteration < 5; iteration++) {
    try {
      // Create streaming message with Claude (optimized for speed)
      const stream = getAnthropicClient().messages.stream({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024, // Reduced for faster responses
        temperature: 0.7, // Slightly lower for faster, more focused responses
        system: systemPrompt,
        messages: anthropicMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? { type: 'auto' } : undefined,
      });

      let accumulatedContent = '';
      const toolUses: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
        inputJson: string; // Accumulate JSON string during streaming
      }> = [];
      let currentToolIndex = -1;

      // Process the stream
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta;

          // Handle text content
          if (delta.type === 'text_delta') {
            // Filter out tool intention text that shouldn't be shown to user
            const text = delta.text;
            if (
              !text.includes('[سأنفذ') &&
              !text.includes('[سأستخدم') &&
              !text.includes('[سأقوم') &&
              !text.includes('add_to_cart') &&
              !text.includes('search_menu')
            ) {
              accumulatedContent += text;
              yield {
                type: 'content',
                content: text,
              };
            }
          }

          // Handle tool input (collect JSON during streaming)
          if (delta.type === 'input_json_delta' && currentToolIndex >= 0) {
            toolUses[currentToolIndex].inputJson += delta.partial_json;
          }
        }

        // Handle content block start (for tool use)
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            currentToolIndex = toolUses.length;
            toolUses.push({
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
              inputJson: '',
            });
          }
        }

        // Handle content block stop (parse accumulated JSON)
        if (event.type === 'content_block_stop' && currentToolIndex >= 0) {
          try {
            if (toolUses[currentToolIndex].inputJson) {
              toolUses[currentToolIndex].input = JSON.parse(toolUses[currentToolIndex].inputJson);
            }
          } catch {
            // Will fallback to finalMessage
          }
        }
      }

      // Only get finalMessage if we have tool uses (optimization)
      const finalMessage = toolUses.length > 0 ? await stream.finalMessage() : null;

      // Extract tool uses from final message (fallback for any missed inputs)
      if (finalMessage) {
        for (const block of finalMessage.content) {
          if (block.type === 'tool_use') {
            const existingTool = toolUses.find((t) => t.id === block.id);
            if (existingTool && Object.keys(existingTool.input).length === 0) {
              // Only update if we don't have input from streaming
              existingTool.input = block.input as Record<string, unknown>;
            }
          }
        }
      }

      // Process tool uses if any
      if (toolUses.length > 0 && finalMessage?.stop_reason === 'tool_use') {
        // Add assistant message with tool uses
        anthropicMessages.push({
          role: 'assistant',
          content: finalMessage.content,
        });

        // Prepare tool results for the next message
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        // Execute each tool
        for (const toolUse of toolUses) {
          const toolName = toolUse.name;
          const toolArgs = toolUse.input;

          yield {
            type: 'tool_call',
            toolName,
            toolArgs,
          };

          // Validate tool parameters
          const validation = validateToolParams(toolName, toolArgs, context);
          if (!validation.valid) {
            const validationResult: ToolResult = {
              success: false,
              error: validation.error,
              message: validation.message,
            };

            yield {
              type: 'tool_result',
              toolName,
              toolResult: validationResult,
            };

            turns.push({
              role: 'tool',
              content: JSON.stringify(validationResult),
              toolName,
              toolResult: validationResult,
              timestamp: new Date(),
            });

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(validationResult),
            });

            continue;
          }

          // Check rate limits
          const conversationId = context.customerId || 'anonymous';
          const rateLimit = checkRateLimit(toolName, conversationId);
          if (!rateLimit.allowed) {
            const rateLimitResult: ToolResult = {
              success: false,
              error: 'rate_limited',
              message: rateLimit.message,
            };

            yield {
              type: 'tool_result',
              toolName,
              toolResult: rateLimitResult,
            };

            turns.push({
              role: 'tool',
              content: JSON.stringify(rateLimitResult),
              toolName,
              toolResult: rateLimitResult,
              timestamp: new Date(),
            });

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(rateLimitResult),
            });

            continue;
          }

          // Execute the tool
          const result = await executeAgentTool(toolName, toolArgs, context);

          yield {
            type: 'tool_result',
            toolName,
            toolResult: result,
          };

          turns.push({
            role: 'tool',
            content: JSON.stringify(result),
            toolName,
            toolResult: result,
            timestamp: new Date(),
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        }

        // Add tool results as user message (Anthropic format)
        anthropicMessages.push({
          role: 'user',
          content: toolResults,
        });

        // Continue loop to get final response
        continue;
      }

      // No tool uses or end_turn - this is the final response
      const finalResponse = parseAgentOutput(
        accumulatedContent,
        turns,
        context.providerId || context.cartProviderId
      );

      yield {
        type: 'done',
        response: finalResponse,
      };

      return;
    } catch (error) {
      logger.error('Claude Agent stream error', {
        error: error instanceof Error ? error.message : String(error),
        iteration,
      });

      yield {
        type: 'done',
        response: {
          content: 'مش لاقي نتائج دلوقتي. جرب تاني أو اسألني سؤال تاني',
          suggestions: ['جرب تاني', 'المنيو', 'الرئيسية'],
        },
      };

      return;
    }
  }

  // Max iterations reached
  yield {
    type: 'done',
    response: {
      content: 'عذرا، مش قادر أكمل الطلب دلوقتي. حاول مرة تانية.',
      suggestions: ['حاول مرة تانية'],
    },
  };
}

// =============================================================================
// NON-STREAMING AGENT HANDLER (Claude)
// =============================================================================

export async function runClaudeAgent(options: AgentHandlerOptions): Promise<AgentResponse> {
  let finalResponse: AgentResponse = { content: '' };

  for await (const event of runClaudeAgentStream(options)) {
    if (event.type === 'done' && event.response) {
      finalResponse = event.response;
    }
  }

  return finalResponse;
}

// =============================================================================
// HELPER FUNCTIONS (same as OpenAI handler)
// =============================================================================

function generateDynamicQuickReplies(
  content: string,
  hasCartAction: boolean,
  hasProducts: boolean,
  productId?: string,
  toolsUsed?: string[],
  providerId?: string
): { suggestions: string[]; quickReplies: AgentResponse['quickReplies'] } {
  const menuPayload = providerId ? `navigate:/ar/providers/${providerId}` : 'ورّيني المنيو';

  const contentLower = content.toLowerCase();

  // Size/Variant selection
  const isAskingVariant =
    contentLower.includes('حجم') ||
    contentLower.includes('أي حجم') ||
    (contentLower.includes('صغير') && contentLower.includes('كبير'));

  const hasStandardSizes =
    contentLower.includes('صغير') && contentLower.includes('وسط') && contentLower.includes('كبير');

  if (isAskingVariant && hasProducts && hasStandardSizes) {
    return {
      suggestions: ['صغير', 'وسط', 'كبير'],
      quickReplies: [
        { title: 'صغير', payload: 'عايز الحجم الصغير' },
        { title: 'وسط', payload: 'عايز الحجم الوسط' },
        { title: 'كبير', payload: 'عايز الحجم الكبير' },
      ],
    };
  }

  // After adding to cart
  if (hasCartAction) {
    return {
      suggestions: ['شوف السلة', 'أضف حاجة تانية', 'كمل للدفع'],
      quickReplies: [
        { title: 'شوف السلة', payload: 'ايه في السلة؟' },
        { title: 'أضف حاجة تانية', payload: 'عايز أضيف حاجة تانية' },
        { title: 'كمل للدفع', payload: 'navigate:/ar/checkout' },
      ],
    };
  }

  // Products found
  if (hasProducts && productId) {
    return {
      suggestions: ['ضيف للسلة', 'تفاصيل أكتر', 'حاجة تانية'],
      quickReplies: [
        { title: 'ضيف للسلة', payload: 'ضيف الأول للسلة' },
        { title: 'تفاصيل أكتر', payload: 'عايز تفاصيل أكتر' },
        { title: 'حاجة تانية', payload: 'عايز أبحث عن حاجة تانية' },
      ],
    };
  }

  // Promotions
  if (
    toolsUsed?.includes('get_promotions') ||
    contentLower.includes('عرض') ||
    contentLower.includes('خصم')
  ) {
    return {
      suggestions: ['استخدم العرض', 'شوف المنيو', 'بحث'],
      quickReplies: [
        { title: 'استخدم العرض', payload: 'عايز أستخدم العرض ده' },
        { title: 'شوف المنيو', payload: menuPayload },
        { title: 'بحث', payload: 'عايز أبحث عن حاجة' },
      ],
    };
  }

  // Greeting - guide to provider selection
  if (
    contentLower.includes('أهلاً') ||
    contentLower.includes('أهلا') ||
    contentLower.includes('عايز تطلب منين') ||
    contentLower.includes('عايزة تطلبي منين')
  ) {
    return {
      suggestions: ['🏪 عندي مكان معين', '🔍 ساعدني أختار', '🔥 اللي عندهم عروض'],
      quickReplies: [
        { title: '🏪 عندي مكان معين', payload: 'عايز أطلب من مكان معين' },
        { title: '🔍 ساعدني أختار', payload: 'ساعدني أختار مكان' },
        { title: '🔥 اللي عندهم عروض', payload: 'ورّيني الأماكن اللي عندها عروض' },
      ],
    };
  }

  // Default - context-aware
  if (providerId) {
    return {
      suggestions: ['🍽️ شوف المنيو', '🔥 العروض', '📦 طلباتي'],
      quickReplies: [
        { title: '🍽️ شوف المنيو', payload: menuPayload },
        { title: '🔥 العروض', payload: 'فيه عروض ايه؟' },
        { title: '📦 طلباتي', payload: 'فين طلباتي؟' },
      ],
    };
  }

  return {
    suggestions: ['🏪 عندي مكان معين', '🔍 ساعدني أختار', '🔥 اللي عندهم عروض'],
    quickReplies: [
      { title: '🏪 عندي مكان معين', payload: 'عايز أطلب من مكان معين' },
      { title: '🔍 ساعدني أختار', payload: 'ساعدني أختار مكان' },
      { title: '🔥 اللي عندهم عروض', payload: 'ورّيني الأماكن اللي عندها عروض' },
    ],
  };
}

function sanitizeAgentResponse(content: string): string {
  let sanitized = content;

  // Remove markdown images
  sanitized = sanitized.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  // Remove links but keep text
  sanitized = sanitized.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove URLs
  sanitized = sanitized.replace(/https?:\/\/[^\s<>"\)]+/gi, '');
  // Remove markdown formatting
  sanitized = sanitized.replace(/\*\*([^*]+)\*\*/g, '$1');
  sanitized = sanitized.replace(/\*([^*]+)\*/g, '$1');
  // Remove code blocks
  sanitized = sanitized.replace(/```[\s\S]*?```/g, '');
  sanitized = sanitized.replace(/`([^`]+)`/g, '$1');
  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, '');
  // Clean whitespace
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  sanitized = sanitized.replace(/  +/g, ' ');

  return sanitized.trim();
}

function parseAgentOutput(
  content: string,
  turns: ConversationTurn[],
  providerId?: string
): AgentResponse {
  const sanitizedContent = sanitizeAgentResponse(content);

  const response: AgentResponse = {
    content: sanitizedContent,
    suggestions: [],
    quickReplies: [],
    products: [],
    cartActions: [],
  };

  const toolsUsed: string[] = [];

  for (const turn of turns) {
    if (turn.role === 'tool' && turn.toolResult) {
      if (turn.toolName) {
        toolsUsed.push(turn.toolName);
      }

      const result = turn.toolResult as ToolResult;
      if (result.success && result.data) {
        const data = result.data as Record<string, unknown>;

        if (data.cart_action) {
          const cartAction = data.cart_action as AgentResponse['cartAction'];
          response.cartActions!.push(cartAction!);
          response.cartAction = cartAction;
        }

        if (Array.isArray(result.data)) {
          const items = result.data as Array<Record<string, unknown>>;
          if (items.length > 0 && items[0].name_ar && items[0].price) {
            response.products = items.slice(0, 5).map((item) => ({
              id: item.id as string,
              name: item.name_ar as string,
              price: item.price as number,
              image: item.image_url as string | undefined,
              hasVariants: item.has_variants as boolean | undefined,
              providerId: item.provider_id as string | undefined,
              providerName: (item.providers as { name_ar?: string })?.name_ar,
            }));
          }
        }
      }
    }
  }

  const effectiveProviderId = response.products?.[0]?.providerId || providerId;

  const { suggestions, quickReplies } = generateDynamicQuickReplies(
    content,
    !!response.cartAction,
    !!(response.products && response.products.length > 0),
    response.products?.[0]?.id,
    toolsUsed,
    effectiveProviderId
  );

  response.suggestions = suggestions;
  response.quickReplies = quickReplies;

  return response;
}

/**
 * Quick agent response (non-streaming)
 */
export async function quickClaudeAgentResponse(
  userMessage: string,
  context: AgentContext
): Promise<AgentResponse> {
  return runClaudeAgent({
    context,
    messages: [{ role: 'user', content: userMessage }],
  });
}
