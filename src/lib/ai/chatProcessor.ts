/**
 * Smart Chat Processor for AI Agent
 *
 * Handles pre-processing and post-processing of chat messages
 * to reduce reliance on prompt engineering for complex logic.
 */

// =============================================================================
// ARABIC NUMBER PARSING
// =============================================================================

/**
 * Parse Arabic/Egyptian slang numbers to digits
 * Examples:
 * - "ربعين" → 2 (Egyptian slang for اتنين)
 * - "نصين" → 2
 * - "تلاته" → 3
 * - "واحد" → 1
 */
export function parseArabicNumbers(text: string): string {
  const numberMap: Record<string, string> = {
    // Egyptian slang
    ربعين: '2', // Two (Egyptian slang)
    نصين: '2', // Two halves
    تنين: '2', // Two

    // Standard Arabic numbers
    واحد: '1',
    واحدة: '1',
    اتنين: '2',
    اثنين: '2',
    تلاته: '3',
    تلاتة: '3',
    ثلاثة: '3',
    تلات: '3',
    أربعه: '4',
    أربعة: '4',
    اربعه: '4',
    اربعة: '4',
    أربع: '4',
    اربع: '4',
    خمسه: '5',
    خمسة: '5',
    خمس: '5',
    سته: '6',
    ستة: '6',
    ست: '6',
    سبعه: '7',
    سبعة: '7',
    سبع: '7',
    تمنيه: '8',
    ثمانية: '8',
    تمانية: '8',
    تمن: '8',
    تسعه: '9',
    تسعة: '9',
    تسع: '9',
    عشره: '10',
    عشرة: '10',
    عشر: '10',
  };

  let result = text;

  // Sort by length (longer first) to avoid partial replacements
  const sortedKeys = Object.keys(numberMap).sort((a, b) => b.length - a.length);

  for (const arabic of sortedKeys) {
    const regex = new RegExp(arabic, 'g');
    result = result.replace(regex, numberMap[arabic]);
  }

  return result;
}

/**
 * Extract quantity-product pairs from user message
 * Example: "عايز 2 بيتزا و3 برجر" → [{quantity: 2, product: "بيتزا"}, {quantity: 3, product: "برجر"}]
 */
export interface ParsedOrder {
  quantity: number;
  product: string;
  size?: string;
  raw: string;
}

export function parseOrderFromMessage(message: string): ParsedOrder[] {
  // First normalize Arabic numbers
  const normalizedMessage = parseArabicNumbers(message);

  const orders: ParsedOrder[] = [];

  // Pattern: number followed by product name
  // Matches: "2 بيتزا", "3 برجر كبير", "1 شاورما"
  const orderPattern = /(\d+)\s+([^\d,،و]+?)(?=\s*(?:\d|,|،|و\s*\d|$))/g;

  let match;
  while ((match = orderPattern.exec(normalizedMessage)) !== null) {
    const quantity = parseInt(match[1], 10);
    const productWithSize = match[2].trim();

    // Check for size indicators
    const sizePatterns = [
      { pattern: /(.+?)\s*(ربع\s*كيلو|ربع)/i, size: 'ربع كيلو' },
      { pattern: /(.+?)\s*(نص\s*كيلو|نص)/i, size: 'نص كيلو' },
      { pattern: /(.+?)\s*(كيلو)/i, size: 'كيلو' },
      { pattern: /(.+?)\s*(صغير)/i, size: 'صغير' },
      { pattern: /(.+?)\s*(وسط)/i, size: 'وسط' },
      { pattern: /(.+?)\s*(كبير)/i, size: 'كبير' },
      { pattern: /(.+?)\s*(عادي)/i, size: 'عادي' },
      { pattern: /(.+?)\s*(سوبر)/i, size: 'سوبر' },
    ];

    let product = productWithSize;
    let size: string | undefined;

    for (const { pattern, size: sizeValue } of sizePatterns) {
      const sizeMatch = productWithSize.match(pattern);
      if (sizeMatch) {
        product = sizeMatch[1].trim();
        size = sizeValue;
        break;
      }
    }

    if (quantity > 0 && product) {
      orders.push({
        quantity,
        product,
        size,
        raw: match[0],
      });
    }
  }

  return orders;
}

// =============================================================================
// CART ACTION DEDUPLICATION
// =============================================================================

export interface CartAction {
  type: 'ADD_ITEM' | 'REMOVE_ITEM' | 'UPDATE_QUANTITY' | 'CLEAR_CART';
  provider_id: string;
  menu_item_id: string;
  menu_item_name_ar: string;
  quantity: number;
  unit_price: number;
  variant_id?: string;
  variant_name_ar?: string;
}

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variant_id?: string;
}

/**
 * Filter out duplicate cart actions
 * Prevents adding items that are already in the cart
 */
export function deduplicateCartActions(
  actions: CartAction[],
  existingCart: CartItem[]
): { actions: CartAction[]; skipped: CartAction[]; reason: string[] } {
  const skipped: CartAction[] = [];
  const reasons: string[] = [];

  const filteredActions = actions.filter((action) => {
    if (action.type !== 'ADD_ITEM') return true;

    // Check if this exact item (with same variant) is already in cart
    const existingItem = existingCart.find((item) => {
      // Match by item ID and variant ID
      const itemMatch = item.id === action.menu_item_id;
      const variantMatch = !action.variant_id || item.variant_id === action.variant_id;
      return itemMatch && variantMatch;
    });

    if (existingItem) {
      skipped.push(action);
      reasons.push(
        `${action.menu_item_name_ar} موجود في السلة أصلاً (${existingItem.quantity} قطعة)`
      );
      return false;
    }

    return true;
  });

  return { actions: filteredActions, skipped, reason: reasons };
}

/**
 * Merge duplicate cart actions within the same request
 * If AI tries to add the same item twice, merge into one action with combined quantity
 */
export function mergeCartActions(actions: CartAction[]): CartAction[] {
  const merged = new Map<string, CartAction>();

  for (const action of actions) {
    if (action.type !== 'ADD_ITEM') {
      // For non-add actions, keep as-is
      merged.set(`${action.type}-${action.menu_item_id}-${Date.now()}`, action);
      continue;
    }

    // Create a unique key for the item+variant combination
    const key = `${action.menu_item_id}-${action.variant_id || 'no-variant'}`;

    const existing = merged.get(key);
    if (existing && existing.type === 'ADD_ITEM') {
      // Merge quantities
      existing.quantity += action.quantity;
    } else {
      merged.set(key, { ...action });
    }
  }

  return Array.from(merged.values());
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate cart actions before execution
 */
export function validateCartActions(actions: CartAction[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const action of actions) {
    if (action.type === 'ADD_ITEM') {
      // Check for missing required fields
      if (!action.menu_item_id || action.menu_item_id === 'undefined') {
        errors.push(`المنتج "${action.menu_item_name_ar}" مفيش له ID صحيح`);
      }

      if (!action.provider_id || action.provider_id === 'undefined') {
        errors.push(`المنتج "${action.menu_item_name_ar}" مفيش له provider_id`);
      }

      // Check for suspicious quantities
      if (action.quantity > 20) {
        warnings.push(`كمية كبيرة: ${action.quantity} ${action.menu_item_name_ar}. متأكد؟`);
      }

      if (action.quantity <= 0) {
        errors.push(`كمية غير صحيحة: ${action.quantity} ${action.menu_item_name_ar}`);
      }

      // Check for missing variant on items that might need it
      if (!action.variant_id && action.menu_item_name_ar) {
        // This is just a warning, the actual check happens in add_to_cart
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// PRE-PROCESSING
// =============================================================================

export interface PreProcessedMessage {
  originalMessage: string;
  normalizedMessage: string;
  parsedOrders: ParsedOrder[];
  metadata: {
    hasQuantities: boolean;
    hasProductNames: boolean;
    isOrderRequest: boolean;
    isConfirmation: boolean;
  };
}

/**
 * Pre-process user message before sending to AI
 */
export function preProcessMessage(message: string): PreProcessedMessage {
  const normalizedMessage = parseArabicNumbers(message);
  const parsedOrders = parseOrderFromMessage(message);

  // Detect intent
  const lowerMessage = message.toLowerCase();
  const isConfirmation = /^(أيوه|ايوه|تمام|ماشي|ضيفهم|اضيفهم|أكيد|اكيد|صح|اه|آه|نعم)/.test(
    message.trim()
  );
  const isOrderRequest = /عايز|عاوز|ابغى|نفسي|هات|جيب/.test(lowerMessage);

  return {
    originalMessage: message,
    normalizedMessage,
    parsedOrders,
    metadata: {
      hasQuantities: parsedOrders.length > 0,
      hasProductNames: parsedOrders.some((o) => o.product.length > 0),
      isOrderRequest,
      isConfirmation,
    },
  };
}

// =============================================================================
// POST-PROCESSING
// =============================================================================

export interface PostProcessedResponse {
  cartActions: CartAction[];
  skippedActions: CartAction[];
  warnings: string[];
  errors: string[];
}

/**
 * Post-process AI response before sending to frontend
 */
export function postProcessCartActions(
  actions: CartAction[],
  existingCart: CartItem[]
): PostProcessedResponse {
  // Step 1: Merge duplicate actions within the response
  const mergedActions = mergeCartActions(actions);

  // Step 2: Remove actions for items already in cart
  const {
    actions: dedupedActions,
    skipped,
    reason,
  } = deduplicateCartActions(mergedActions, existingCart);

  // Step 3: Validate remaining actions
  const validation = validateCartActions(dedupedActions);

  return {
    cartActions: dedupedActions,
    skippedActions: skipped,
    warnings: [...validation.warnings, ...reason],
    errors: validation.errors,
  };
}
