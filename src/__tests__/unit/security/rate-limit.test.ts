import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  withRateLimit,
  checkGlobalRateLimit,
  getClientIp,
  createRateLimitHeaders,
  resetGlobalRateLimit,
  clearAllRateLimits,
  RATE_LIMIT_CONFIGS,
} from '@/lib/security/rate-limit-middleware';

// Mock Next.js request
function createMockRequest(options?: {
  ip?: string;
  pathname?: string;
  forwardedFor?: string;
  realIp?: string;
}): NextRequest {
  const { pathname = '/api/test', forwardedFor, realIp } = options ?? {};

  const headers = new Headers();
  if (forwardedFor) {
    headers.set('x-forwarded-for', forwardedFor);
  }
  if (realIp) {
    headers.set('x-real-ip', realIp);
  }

  return {
    method: 'GET',
    headers,
    nextUrl: { pathname },
  } as unknown as NextRequest;
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearAllRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest({ forwardedFor: '192.168.1.1, 10.0.0.1' });
      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = createMockRequest({ realIp: '192.168.1.2' });
      expect(getClientIp(request)).toBe('192.168.1.2');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = createMockRequest({
        forwardedFor: '192.168.1.1',
        realIp: '192.168.1.2',
      });
      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    it('should return "unknown" when no IP headers present', () => {
      const request = createMockRequest();
      expect(getClientIp(request)).toBe('unknown');
    });
  });

  describe('checkGlobalRateLimit', () => {
    it('should allow first request', () => {
      const result = checkGlobalRateLimit('test-key', {
        limit: 5,
        windowMs: 60000,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should track multiple requests', () => {
      const config = { limit: 5, windowMs: 60000 };

      checkGlobalRateLimit('test-key-2', config);
      checkGlobalRateLimit('test-key-2', config);
      const result = checkGlobalRateLimit('test-key-2', config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should block requests after limit exceeded', () => {
      const config = { limit: 3, windowMs: 60000 };

      checkGlobalRateLimit('test-key-3', config);
      checkGlobalRateLimit('test-key-3', config);
      checkGlobalRateLimit('test-key-3', config);
      const result = checkGlobalRateLimit('test-key-3', config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeDefined();
    });

    it('should reset after window expires', () => {
      const config = { limit: 2, windowMs: 60000 };

      checkGlobalRateLimit('test-key-4', config);
      checkGlobalRateLimit('test-key-4', config);

      // Should be at limit
      let result = checkGlobalRateLimit('test-key-4', config);
      expect(result.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      result = checkGlobalRateLimit('test-key-4', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('should isolate different keys', () => {
      const config = { limit: 2, windowMs: 60000 };

      checkGlobalRateLimit('key-a', config);
      checkGlobalRateLimit('key-a', config);

      // Key A is at limit
      const resultA = checkGlobalRateLimit('key-a', config);
      expect(resultA.allowed).toBe(false);

      // Key B should still be allowed
      const resultB = checkGlobalRateLimit('key-b', config);
      expect(resultB.allowed).toBe(true);
    });
  });

  describe('createRateLimitHeaders', () => {
    it('should include standard rate limit headers', () => {
      const headers = createRateLimitHeaders({
        allowed: true,
        limit: 100,
        remaining: 95,
        resetMs: 30000,
      });

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('95');
      expect(headers['X-RateLimit-Reset']).toBe('30');
    });

    it('should include Retry-After when rate limited', () => {
      const headers = createRateLimitHeaders({
        allowed: false,
        limit: 100,
        remaining: 0,
        resetMs: 45000,
        retryAfterMs: 45000,
      });

      expect(headers['Retry-After']).toBe('45');
    });

    it('should not include Retry-After when allowed', () => {
      const headers = createRateLimitHeaders({
        allowed: true,
        limit: 100,
        remaining: 50,
        resetMs: 30000,
      });

      expect(headers['Retry-After']).toBeUndefined();
    });
  });

  describe('withRateLimit middleware', () => {
    it('should allow requests within limit', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withRateLimit(handler, { limit: 10, windowMs: 60000 });

      const request = createMockRequest({ forwardedFor: '1.2.3.4' });
      const response = await wrappedHandler(request);

      expect(handler).toHaveBeenCalled();
      expect(response.status).not.toBe(429);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    });

    it('should block requests exceeding limit', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const config = { limit: 2, windowMs: 60000 };
      const wrappedHandler = withRateLimit(handler, config);

      const request = createMockRequest({ forwardedFor: '5.6.7.8' });

      // First two requests should pass
      await wrappedHandler(request);
      await wrappedHandler(request);

      // Third request should be blocked
      const response = await wrappedHandler(request);

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should use custom key generator', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withRateLimit(handler, {
        limit: 1,
        windowMs: 60000,
        keyGenerator: () => 'custom-key',
      });

      const request1 = createMockRequest({ forwardedFor: '1.1.1.1' });
      const request2 = createMockRequest({ forwardedFor: '2.2.2.2' });

      await wrappedHandler(request1);
      const response = await wrappedHandler(request2);

      // Both requests use same key, so second is blocked
      expect(response.status).toBe(429);
    });

    it('should skip rate limiting when skip function returns true', async () => {
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withRateLimit(handler, {
        limit: 1,
        windowMs: 60000,
        skip: () => true,
      });

      const request = createMockRequest({ forwardedFor: '3.3.3.3' });

      // Multiple requests should all pass when skipped
      await wrappedHandler(request);
      await wrappedHandler(request);
      const response = await wrappedHandler(request);

      expect(response.status).not.toBe(429);
    });

    it('should use custom onRateLimit handler', async () => {
      const customResponse = NextResponse.json({ custom: 'response' }, { status: 429 });
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withRateLimit(handler, {
        limit: 1,
        windowMs: 60000,
        onRateLimit: () => customResponse,
      });

      const request = createMockRequest({ forwardedFor: '4.4.4.4' });

      await wrappedHandler(request);
      const response = await wrappedHandler(request);

      const body = await response.json();
      expect(body.custom).toBe('response');
    });
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('should have standard config', () => {
      expect(RATE_LIMIT_CONFIGS.standard.limit).toBe(100);
      expect(RATE_LIMIT_CONFIGS.standard.windowMs).toBe(60000);
    });

    it('should have strict config', () => {
      expect(RATE_LIMIT_CONFIGS.strict.limit).toBe(10);
    });

    it('should have auth config', () => {
      expect(RATE_LIMIT_CONFIGS.auth.limit).toBe(20);
    });

    it('should have search config', () => {
      expect(RATE_LIMIT_CONFIGS.search.limit).toBe(30);
    });

    it('should have public config', () => {
      expect(RATE_LIMIT_CONFIGS.public.limit).toBe(60);
    });
  });

  describe('resetGlobalRateLimit', () => {
    it('should reset rate limit for specific key', () => {
      const config = { limit: 2, windowMs: 60000 };

      checkGlobalRateLimit('reset-test', config);
      checkGlobalRateLimit('reset-test', config);

      // At limit
      let result = checkGlobalRateLimit('reset-test', config);
      expect(result.allowed).toBe(false);

      // Reset
      resetGlobalRateLimit('reset-test');

      // Should be allowed again
      result = checkGlobalRateLimit('reset-test', config);
      expect(result.allowed).toBe(true);
    });
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limits', () => {
      const config = { limit: 1, windowMs: 60000 };

      checkGlobalRateLimit('clear-test-1', config);
      checkGlobalRateLimit('clear-test-2', config);

      // Both at limit
      expect(checkGlobalRateLimit('clear-test-1', config).allowed).toBe(false);
      expect(checkGlobalRateLimit('clear-test-2', config).allowed).toBe(false);

      // Clear all
      clearAllRateLimits();

      // Both should be allowed again
      expect(checkGlobalRateLimit('clear-test-1', config).allowed).toBe(true);
      expect(checkGlobalRateLimit('clear-test-2', config).allowed).toBe(true);
    });
  });
});
