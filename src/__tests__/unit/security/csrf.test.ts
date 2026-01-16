import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  generateCsrfToken,
  validateCsrfToken,
  withCsrf,
  requiresCsrfProtection,
  isCsrfExempt,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
} from '@/lib/security/csrf';

// Mock Next.js request
function createMockRequest(
  method: string,
  options?: {
    cookieToken?: string;
    headerToken?: string;
    pathname?: string;
  }
): NextRequest {
  const { cookieToken, headerToken, pathname = '/api/test' } = options ?? {};

  const headers = new Headers();
  if (headerToken) {
    headers.set('x-csrf-token', headerToken);
  }

  const cookies = new Map<string, { value: string }>();
  if (cookieToken) {
    cookies.set('__csrf', { value: cookieToken });
  }

  return {
    method,
    headers,
    nextUrl: { pathname },
    cookies: {
      get: (name: string) => cookies.get(name),
      getAll: () => Array.from(cookies.entries()).map(([name, { value }]) => ({ name, value })),
    },
  } as unknown as NextRequest;
}

describe('CSRF Protection', () => {
  describe('generateCsrfToken', () => {
    it('should generate a 64 character hex token', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateCsrfToken()));
      expect(tokens.size).toBe(100);
    });
  });

  describe('validateCsrfToken', () => {
    it('should return true when cookie and header tokens match', () => {
      const token = 'valid-token-12345';
      const request = createMockRequest('POST', {
        cookieToken: token,
        headerToken: token,
      });

      expect(validateCsrfToken(request)).toBe(true);
    });

    it('should return false when tokens do not match', () => {
      const request = createMockRequest('POST', {
        cookieToken: 'token-a',
        headerToken: 'token-b',
      });

      expect(validateCsrfToken(request)).toBe(false);
    });

    it('should return false when cookie token is missing', () => {
      const request = createMockRequest('POST', {
        headerToken: 'some-token',
      });

      expect(validateCsrfToken(request)).toBe(false);
    });

    it('should return false when header token is missing', () => {
      const request = createMockRequest('POST', {
        cookieToken: 'some-token',
      });

      expect(validateCsrfToken(request)).toBe(false);
    });

    it('should return false when both tokens are missing', () => {
      const request = createMockRequest('POST');
      expect(validateCsrfToken(request)).toBe(false);
    });
  });

  describe('requiresCsrfProtection', () => {
    it('should require protection for POST requests', () => {
      const request = createMockRequest('POST');
      expect(requiresCsrfProtection(request)).toBe(true);
    });

    it('should require protection for PUT requests', () => {
      const request = createMockRequest('PUT');
      expect(requiresCsrfProtection(request)).toBe(true);
    });

    it('should require protection for PATCH requests', () => {
      const request = createMockRequest('PATCH');
      expect(requiresCsrfProtection(request)).toBe(true);
    });

    it('should require protection for DELETE requests', () => {
      const request = createMockRequest('DELETE');
      expect(requiresCsrfProtection(request)).toBe(true);
    });

    it('should NOT require protection for GET requests', () => {
      const request = createMockRequest('GET');
      expect(requiresCsrfProtection(request)).toBe(false);
    });

    it('should NOT require protection for HEAD requests', () => {
      const request = createMockRequest('HEAD');
      expect(requiresCsrfProtection(request)).toBe(false);
    });

    it('should NOT require protection for OPTIONS requests', () => {
      const request = createMockRequest('OPTIONS');
      expect(requiresCsrfProtection(request)).toBe(false);
    });
  });

  describe('isCsrfExempt', () => {
    it('should exempt webhook paths', () => {
      expect(isCsrfExempt('/api/webhooks/stripe')).toBe(true);
      expect(isCsrfExempt('/api/webhooks/payment')).toBe(true);
    });

    it('should exempt public API paths', () => {
      expect(isCsrfExempt('/api/public/products')).toBe(true);
    });

    it('should exempt health check endpoint', () => {
      expect(isCsrfExempt('/api/health')).toBe(true);
    });

    it('should NOT exempt regular API paths', () => {
      expect(isCsrfExempt('/api/orders')).toBe(false);
      expect(isCsrfExempt('/api/users')).toBe(false);
    });
  });

  describe('withCsrf middleware', () => {
    it('should allow GET requests without CSRF token', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withCsrf(handler);

      const request = createMockRequest('GET');
      const response = await wrappedHandler(request);

      expect(handler).toHaveBeenCalledWith(request, undefined);
      expect(response.status).not.toBe(403);
    });

    it('should allow POST requests with valid CSRF token', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withCsrf(handler);

      const token = 'valid-csrf-token';
      const request = createMockRequest('POST', {
        cookieToken: token,
        headerToken: token,
      });
      const response = await wrappedHandler(request);

      expect(handler).toHaveBeenCalled();
      expect(response.status).not.toBe(403);
    });

    it('should reject POST requests without CSRF token', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withCsrf(handler);

      const request = createMockRequest('POST');
      const response = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body.error.code).toBe('CSRF_VALIDATION_FAILED');
    });

    it('should reject POST requests with mismatched CSRF tokens', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withCsrf(handler);

      const request = createMockRequest('POST', {
        cookieToken: 'token-a',
        headerToken: 'token-b',
      });
      const response = await wrappedHandler(request);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('getCsrfTokenFromCookie', () => {
    it('should return token from cookie', () => {
      const request = createMockRequest('GET', { cookieToken: 'my-token' });
      expect(getCsrfTokenFromCookie(request)).toBe('my-token');
    });

    it('should return null when cookie is missing', () => {
      const request = createMockRequest('GET');
      expect(getCsrfTokenFromCookie(request)).toBeNull();
    });
  });

  describe('getCsrfTokenFromHeader', () => {
    it('should return token from header', () => {
      const request = createMockRequest('GET', { headerToken: 'my-token' });
      expect(getCsrfTokenFromHeader(request)).toBe('my-token');
    });

    it('should return null when header is missing', () => {
      const request = createMockRequest('GET');
      expect(getCsrfTokenFromHeader(request)).toBeNull();
    });
  });
});
