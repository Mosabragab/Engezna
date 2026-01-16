/**
 * XSS Sanitization Module
 *
 * Provides utilities to sanitize user input and prevent XSS attacks.
 * Uses a whitelist approach for allowed HTML tags and attributes.
 */

/**
 * HTML entities that need to be escaped
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML entities in a string
 * This is the safest approach - escapes all special characters
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Unescape HTML entities (reverse of escapeHtml)
 * Use with caution - only for displaying previously escaped content
 */
export function unescapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }

  const reverseEntities: Record<string, string> = {};
  for (const [char, entity] of Object.entries(HTML_ENTITIES)) {
    reverseEntities[entity] = char;
  }

  return str.replace(
    /&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D);/g,
    (entity) => reverseEntities[entity] || entity
  );
}

/**
 * Strip all HTML tags from a string
 * Returns plain text only
 */
export function stripHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  // Remove all HTML tags
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Allowed tags for rich text (minimal safe set)
 */
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'b',
  'i',
  'u',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code',
  'pre',
]);

/**
 * Allowed attributes (very restricted)
 */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
  img: new Set(['src', 'alt', 'title']),
};

/**
 * Dangerous patterns to remove (for sanitization)
 * Uses global flag for replace operations
 */
const DANGEROUS_PATTERNS_REPLACE = [
  // Event handlers
  /\bon\w+\s*=/gi,
  // JavaScript protocol
  /javascript\s*:/gi,
  // Data protocol (can contain scripts)
  /data\s*:/gi,
  // VBScript
  /vbscript\s*:/gi,
  // Expression (IE)
  /expression\s*\(/gi,
  // Script tags with content (even if malformed)
  /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
  // Unclosed script tags
  /<\s*script[^>]*>/gi,
  // Style with expression
  /style\s*=\s*["'][^"']*expression/gi,
];

/**
 * Dangerous patterns for detection (no global flag to avoid state issues)
 */
const DANGEROUS_PATTERNS_DETECT = [
  // Event handlers
  /\bon\w+\s*=/i,
  // JavaScript protocol
  /javascript\s*:/i,
  // Data protocol (can contain scripts)
  /data\s*:/i,
  // VBScript
  /vbscript\s*:/i,
  // Expression (IE)
  /expression\s*\(/i,
  // Script tags
  /<\s*script/i,
  // Style with expression
  /style\s*=\s*["'][^"']*expression/i,
];

/**
 * Sanitize HTML string - remove dangerous content but keep safe tags
 * For rich text content where some HTML is needed
 */
export function sanitizeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }

  let result = str;

  // Remove dangerous patterns first
  for (const pattern of DANGEROUS_PATTERNS_REPLACE) {
    result = result.replace(pattern, '');
  }

  // Remove all tags except allowed ones
  result = result.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tagName) => {
    const tag = tagName.toLowerCase();

    // Check if tag is allowed
    if (!ALLOWED_TAGS.has(tag)) {
      return ''; // Remove the tag entirely
    }

    // For closing tags, just return the simple closing tag
    if (match.startsWith('</')) {
      return `</${tag}>`;
    }

    // For opening tags, strip all attributes (safest approach)
    // Self-closing check
    const isSelfClosing = match.endsWith('/>');
    return isSelfClosing ? `<${tag} />` : `<${tag}>`;
  });

  return result;
}

/**
 * Sanitize a URL - ensure it's safe to use
 * Returns null for dangerous URLs
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return null;
    }
  }

  // Allow relative URLs, http, https, mailto, tel
  const safeProtocols = ['http://', 'https://', 'mailto:', 'tel:', '//', '/'];
  const hasProtocol = safeProtocols.some((p) => trimmed.startsWith(p));

  // If no protocol and doesn't start with /, it's a relative URL
  if (!hasProtocol && !trimmed.includes(':')) {
    return url.trim();
  }

  // If has a safe protocol, allow it
  if (hasProtocol) {
    return url.trim();
  }

  // Unknown protocol - block it
  return null;
}

/**
 * Sanitize object properties recursively
 * Escapes all string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = escapeHtml(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? escapeHtml(item)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Sanitize user input for database storage
 * - Trims whitespace
 * - Removes null bytes
 * - Normalizes unicode
 * - Optionally escapes HTML
 */
export interface SanitizeInputOptions {
  escapeHtml?: boolean;
  maxLength?: number;
  allowNewlines?: boolean;
}

export function sanitizeInput(str: string, options: SanitizeInputOptions = {}): string {
  if (typeof str !== 'string') {
    return '';
  }

  const { escapeHtml: shouldEscape = true, maxLength, allowNewlines = true } = options;

  let result = str
    // Trim whitespace
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Normalize unicode
    .normalize('NFC');

  // Remove newlines if not allowed
  if (!allowNewlines) {
    result = result.replace(/[\r\n]/g, ' ');
  }

  // Escape HTML if requested
  if (shouldEscape) {
    result = escapeHtml(result);
  }

  // Truncate if max length specified
  if (maxLength && result.length > maxLength) {
    result = result.slice(0, maxLength);
  }

  return result;
}

/**
 * Check if a string contains potentially dangerous content
 * Useful for logging/alerting without modifying content
 */
export function containsDangerousContent(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }

  return DANGEROUS_PATTERNS_DETECT.some((pattern) => pattern.test(str));
}
