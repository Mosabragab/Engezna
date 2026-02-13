'use client';

/**
 * Client-side CSRF token utility
 *
 * Reads the CSRF token from the cookie (set by middleware)
 * and provides helpers to include it in API requests.
 */

const CSRF_COOKIE_NAME = '__csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Read CSRF token from cookies
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Get headers object with CSRF token included
 * Merge with other headers when making API calls
 *
 * Usage:
 * ```ts
 * fetch('/api/some-endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     ...csrfHeaders(),
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (!token) return {};
  return { [CSRF_HEADER_NAME]: token };
}
