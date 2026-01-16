import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitKey,
  OTP_SEND_LIMIT,
  OTP_VERIFY_LIMIT,
  LOGIN_LIMIT,
  PASSWORD_RESET_LIMIT,
} from '@/lib/utils/rate-limit';

describe('Rate Limit Utility', () => {
  beforeEach(() => {
    // Reset rate limit state before each test by using unique identifiers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    const config = {
      maxAttempts: 3,
      windowMs: 60000, // 1 minute
      blockDurationMs: 120000, // 2 minutes
    };

    it('should allow first request', () => {
      const result = checkRateLimit('test-first-request', config);

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(2);
      expect(result.retryAfterMs).toBeNull();
      expect(result.message).toBe('OK');
    });

    it('should track multiple requests within window', () => {
      const identifier = 'test-multiple-requests';

      const result1 = checkRateLimit(identifier, config);
      expect(result1.remainingAttempts).toBe(2);

      const result2 = checkRateLimit(identifier, config);
      expect(result2.remainingAttempts).toBe(1);

      const result3 = checkRateLimit(identifier, config);
      expect(result3.remainingAttempts).toBe(0);
    });

    it('should block after exceeding limit', () => {
      const identifier = 'test-exceed-limit';

      // Use up all attempts
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);

      // This should exceed the limit
      const result = checkRateLimit(identifier, config);

      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.retryAfterMs).toBe(config.blockDurationMs);
      expect(result.message).toContain('Too many attempts');
    });

    it('should unblock after block duration', () => {
      const identifier = 'test-unblock';

      // Exceed limit
      for (let i = 0; i <= config.maxAttempts; i++) {
        checkRateLimit(identifier, config);
      }

      // Verify blocked
      expect(checkRateLimit(identifier, config).allowed).toBe(false);

      // Advance time past block duration
      vi.advanceTimersByTime(config.blockDurationMs + 1000);

      // Should be allowed again
      const result = checkRateLimit(identifier, config);
      expect(result.allowed).toBe(true);
    });

    it('should reset window after windowMs', () => {
      const identifier = 'test-reset-window';

      // Use some attempts
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);

      // Advance time past window
      vi.advanceTimersByTime(config.windowMs + 1000);

      // Should have full attempts again
      const result = checkRateLimit(identifier, config);
      expect(result.remainingAttempts).toBe(2);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for identifier', () => {
      const identifier = 'test-reset';
      const config = { maxAttempts: 3, windowMs: 60000, blockDurationMs: 120000 };

      // Use up attempts
      checkRateLimit(identifier, config);
      checkRateLimit(identifier, config);

      // Reset
      resetRateLimit(identifier);

      // Should have full attempts again
      const result = checkRateLimit(identifier, config);
      expect(result.remainingAttempts).toBe(2);
    });
  });

  describe('getRateLimitKey', () => {
    it('should generate consistent keys', () => {
      const key1 = getRateLimitKey('192.168.1.1', 'user@example.com', 'login');
      const key2 = getRateLimitKey('192.168.1.1', 'user@example.com', 'login');

      expect(key1).toBe(key2);
      expect(key1).toBe('login:192.168.1.1:user@example.com');
    });

    it('should differentiate by action', () => {
      const loginKey = getRateLimitKey('192.168.1.1', 'user@example.com', 'login');
      const otpKey = getRateLimitKey('192.168.1.1', 'user@example.com', 'otp');

      expect(loginKey).not.toBe(otpKey);
    });

    it('should differentiate by IP', () => {
      const key1 = getRateLimitKey('192.168.1.1', 'user@example.com', 'login');
      const key2 = getRateLimitKey('192.168.1.2', 'user@example.com', 'login');

      expect(key1).not.toBe(key2);
    });
  });

  describe('Pre-configured limits', () => {
    it('OTP_SEND_LIMIT should have correct config', () => {
      expect(OTP_SEND_LIMIT.maxAttempts).toBe(5);
      expect(OTP_SEND_LIMIT.windowMs).toBe(10 * 60 * 1000); // 10 minutes
      expect(OTP_SEND_LIMIT.blockDurationMs).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('OTP_VERIFY_LIMIT should have correct config', () => {
      expect(OTP_VERIFY_LIMIT.maxAttempts).toBe(5);
      expect(OTP_VERIFY_LIMIT.windowMs).toBe(5 * 60 * 1000); // 5 minutes
      expect(OTP_VERIFY_LIMIT.blockDurationMs).toBe(15 * 60 * 1000); // 15 minutes
    });

    it('LOGIN_LIMIT should have correct config', () => {
      expect(LOGIN_LIMIT.maxAttempts).toBe(10);
      expect(LOGIN_LIMIT.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(LOGIN_LIMIT.blockDurationMs).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('PASSWORD_RESET_LIMIT should have correct config', () => {
      expect(PASSWORD_RESET_LIMIT.maxAttempts).toBe(3);
      expect(PASSWORD_RESET_LIMIT.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(PASSWORD_RESET_LIMIT.blockDurationMs).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  describe('Integration scenarios', () => {
    it('should handle OTP verification flow', () => {
      const identifier = 'otp-flow-test';

      // Try to verify OTP multiple times (wrong codes)
      for (let i = 0; i < OTP_VERIFY_LIMIT.maxAttempts; i++) {
        const result = checkRateLimit(identifier, OTP_VERIFY_LIMIT);
        expect(result.allowed).toBe(true);
      }

      // Next attempt should be blocked
      const blocked = checkRateLimit(identifier, OTP_VERIFY_LIMIT);
      expect(blocked.allowed).toBe(false);

      // Simulate successful verification - reset the limit
      resetRateLimit(identifier);

      // Should be allowed again
      const afterReset = checkRateLimit(identifier, OTP_VERIFY_LIMIT);
      expect(afterReset.allowed).toBe(true);
    });

    it('should handle login with different IPs', () => {
      const email = 'test@example.com';

      // Different IPs should have separate limits
      const ip1Key = getRateLimitKey('192.168.1.1', email, 'login');
      const ip2Key = getRateLimitKey('192.168.1.2', email, 'login');

      // Use up attempts from IP1
      for (let i = 0; i <= LOGIN_LIMIT.maxAttempts; i++) {
        checkRateLimit(ip1Key, LOGIN_LIMIT);
      }

      // IP1 should be blocked
      expect(checkRateLimit(ip1Key, LOGIN_LIMIT).allowed).toBe(false);

      // IP2 should still be allowed
      expect(checkRateLimit(ip2Key, LOGIN_LIMIT).allowed).toBe(true);
    });
  });
});
