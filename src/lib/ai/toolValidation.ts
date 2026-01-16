/**
 * Tool Validation Layer for AI Agent
 *
 * Provides pre-execution validation for all AI agent tools.
 * This ensures parameters are valid before executing expensive database operations.
 */

import type { ToolContext } from './agentTools';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  message?: string; // User-friendly message in Arabic
  suggestion?: string; // Suggested alternative action
}

export type ToolValidator = (
  params: Record<string, unknown>,
  context: ToolContext
) => ValidationResult;

// =============================================================================
// VALIDATORS
// =============================================================================

export const TOOL_VALIDATORS: Record<string, ToolValidator> = {
  /**
   * Validate search_menu parameters
   */
  search_menu: (params, context) => {
    const query = params.query as string | undefined;

    // Query is required
    if (!query || typeof query !== 'string') {
      return {
        valid: false,
        error: 'missing_query',
        message: 'محتاج تقولي عايز تبحث عن ايه',
      };
    }

    // Query must be at least 2 characters
    if (query.trim().length < 2) {
      return {
        valid: false,
        error: 'query_too_short',
        message: 'كلمة البحث قصيرة أوي، اكتب كلمة أطول',
      };
    }

    // Query shouldn't be too long (prevent abuse)
    if (query.length > 100) {
      return {
        valid: false,
        error: 'query_too_long',
        message: 'كلمة البحث طويلة أوي',
      };
    }

    return { valid: true };
  },

  /**
   * Validate add_to_cart parameters
   */
  add_to_cart: (params, context) => {
    const { item_id, item_name, provider_id, price, quantity, variant_id } = params as {
      item_id?: string;
      item_name?: string;
      provider_id?: string;
      price?: number;
      quantity?: number;
      variant_id?: string;
    };

    // Required fields
    if (!item_id) {
      return {
        valid: false,
        error: 'missing_item_id',
        message: 'محتاج أعرف المنتج الأول',
      };
    }

    if (!provider_id) {
      return {
        valid: false,
        error: 'missing_provider_id',
        message: 'محتاج أعرف المطعم الأول',
      };
    }

    if (!item_name) {
      return {
        valid: false,
        error: 'missing_item_name',
        message: 'محتاج أعرف اسم المنتج',
      };
    }

    if (typeof price !== 'number' || price <= 0) {
      return {
        valid: false,
        error: 'invalid_price',
        message: 'فيه مشكلة في السعر',
      };
    }

    // Quantity validation
    if (quantity !== undefined) {
      if (typeof quantity !== 'number' || quantity < 1 || quantity > 50) {
        return {
          valid: false,
          error: 'invalid_quantity',
          message: 'الكمية لازم تكون بين 1 و 50',
        };
      }
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(item_id)) {
      return {
        valid: false,
        error: 'invalid_item_id_format',
        message: 'فيه مشكلة في معرف المنتج',
      };
    }

    if (!uuidRegex.test(provider_id)) {
      return {
        valid: false,
        error: 'invalid_provider_id_format',
        message: 'فيه مشكلة في معرف المطعم',
      };
    }

    if (variant_id && !uuidRegex.test(variant_id)) {
      return {
        valid: false,
        error: 'invalid_variant_id_format',
        message: 'فيه مشكلة في معرف الحجم',
      };
    }

    return { valid: true };
  },

  /**
   * Validate get_item_details parameters
   */
  get_item_details: (params) => {
    const item_id = params.item_id as string | undefined;

    if (!item_id) {
      return {
        valid: false,
        error: 'missing_item_id',
        message: 'محتاج أعرف المنتج الأول',
      };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(item_id)) {
      return {
        valid: false,
        error: 'invalid_item_id_format',
        message: 'فيه مشكلة في معرف المنتج',
      };
    }

    return { valid: true };
  },

  /**
   * Validate get_provider_info parameters
   */
  get_provider_info: (params) => {
    const provider_id = params.provider_id as string | undefined;

    if (!provider_id) {
      return {
        valid: false,
        error: 'missing_provider_id',
        message: 'محتاج أعرف المطعم الأول',
      };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(provider_id)) {
      return {
        valid: false,
        error: 'invalid_provider_id_format',
        message: 'فيه مشكلة في معرف المطعم',
      };
    }

    return { valid: true };
  },

  /**
   * Validate cancel_order parameters
   */
  cancel_order: (params, context) => {
    const order_id = params.order_id as string | undefined;

    if (!order_id) {
      return {
        valid: false,
        error: 'missing_order_id',
        message: 'محتاج رقم الطلب عشان ألغيه',
      };
    }

    // Must be logged in to cancel orders
    if (!context.customerId) {
      return {
        valid: false,
        error: 'not_authenticated',
        message: 'لازم تسجل دخول الأول عشان تلغي الطلب',
      };
    }

    return { valid: true };
  },

  /**
   * Validate validate_promo_code parameters
   */
  validate_promo_code: (params) => {
    const code = params.code as string | undefined;

    if (!code || typeof code !== 'string') {
      return {
        valid: false,
        error: 'missing_code',
        message: 'محتاج كود الخصم',
      };
    }

    if (code.length < 3 || code.length > 20) {
      return {
        valid: false,
        error: 'invalid_code_length',
        message: 'كود الخصم لازم يكون بين 3 و 20 حرف',
      };
    }

    // Only alphanumeric codes
    if (!/^[A-Za-z0-9]+$/.test(code)) {
      return {
        valid: false,
        error: 'invalid_code_format',
        message: 'كود الخصم لازم يكون حروف وأرقام بس',
      };
    }

    return { valid: true };
  },

  /**
   * Validate create_support_ticket parameters
   */
  create_support_ticket: (params, context) => {
    const { type, subject, description } = params as {
      type?: string;
      subject?: string;
      description?: string;
    };

    // Must be logged in
    if (!context.customerId) {
      return {
        valid: false,
        error: 'not_authenticated',
        message: 'لازم تسجل دخول الأول عشان تفتح تذكرة دعم',
      };
    }

    if (!type) {
      return {
        valid: false,
        error: 'missing_type',
        message: 'محتاج أعرف نوع المشكلة',
      };
    }

    if (!subject || subject.length < 5) {
      return {
        valid: false,
        error: 'missing_subject',
        message: 'محتاج عنوان للمشكلة',
      };
    }

    if (!description || description.length < 10) {
      return {
        valid: false,
        error: 'missing_description',
        message: 'محتاج وصف أكتر للمشكلة',
      };
    }

    return { valid: true };
  },
};

// =============================================================================
// VALIDATION HELPER
// =============================================================================

/**
 * Validate tool parameters before execution
 */
export function validateToolParams(
  toolName: string,
  params: Record<string, unknown>,
  context: ToolContext
): ValidationResult {
  const validator = TOOL_VALIDATORS[toolName];

  // No validator defined = always valid
  if (!validator) {
    return { valid: true };
  }

  return validator(params, context);
}

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, Map<string, RateLimitEntry>>();

// Rate limits per tool per conversation
const TOOL_RATE_LIMITS: Record<string, { maxCalls: number; windowMs: number }> = {
  search_menu: { maxCalls: 10, windowMs: 60000 }, // 10 searches per minute
  add_to_cart: { maxCalls: 20, windowMs: 60000 }, // 20 adds per minute
  cancel_order: { maxCalls: 2, windowMs: 300000 }, // 2 cancels per 5 minutes
  create_support_ticket: { maxCalls: 3, windowMs: 300000 }, // 3 tickets per 5 minutes
  escalate_to_human: { maxCalls: 2, windowMs: 300000 }, // 2 escalations per 5 minutes
};

/**
 * Check if tool call is within rate limits
 */
export function checkRateLimit(
  toolName: string,
  conversationId: string
): { allowed: boolean; message?: string } {
  const limit = TOOL_RATE_LIMITS[toolName];

  // No rate limit defined
  if (!limit) {
    return { allowed: true };
  }

  const now = Date.now();

  // Get or create conversation rate limit store
  let convStore = rateLimitStore.get(conversationId);
  if (!convStore) {
    convStore = new Map();
    rateLimitStore.set(conversationId, convStore);
  }

  // Get or create entry for this tool
  let entry = convStore.get(toolName);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + limit.windowMs };
    convStore.set(toolName, entry);
  }

  // Check limit
  if (entry.count >= limit.maxCalls) {
    return {
      allowed: false,
      message: 'استنى شوية وجرب تاني',
    };
  }

  // Increment count
  entry.count++;

  return { allowed: true };
}

/**
 * Clean up old rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now();

  for (const [convId, convStore] of rateLimitStore.entries()) {
    for (const [toolName, entry] of convStore.entries()) {
      if (entry.resetAt < now) {
        convStore.delete(toolName);
      }
    }

    if (convStore.size === 0) {
      rateLimitStore.delete(convId);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 300000);
}
