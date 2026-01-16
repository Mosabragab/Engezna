import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConflictError,
  isAppError,
  isOperationalError,
} from '@/lib/errors';
import { z } from 'zod';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom values', () => {
      const error = new AppError('Custom error', 400, 'CUSTOM_CODE', true, { foo: 'bar' });

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.details).toEqual({ foo: 'bar' });
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_CODE');
      const json = error.toJSON();

      expect(json).toEqual({
        success: false,
        error: {
          code: 'TEST_CODE',
          message: 'Test error',
        },
      });
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field errors', () => {
      const error = new ValidationError('Validation failed', [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ]);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toHaveLength(2);
    });

    it('should create from Zod error', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const result = schema.safeParse({ email: 'invalid', age: 10 });

      if (!result.success) {
        const error = ValidationError.fromZodError(result.error);

        expect(error.statusCode).toBe(400);
        expect(error.errors.length).toBeGreaterThan(0);
        expect(error.errors.some((e) => e.field === 'email')).toBe(true);
      }
    });

    it('should create single field error', () => {
      const error = ValidationError.field('email', 'Invalid email format');

      expect(error.errors).toHaveLength(1);
      expect(error.errors[0].field).toBe('email');
      expect(error.errors[0].message).toBe('Invalid email format');
    });
  });

  describe('AuthenticationError', () => {
    it('should create with default message', () => {
      const error = new AuthenticationError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toBe('Authentication required');
    });

    it('should create invalid credentials error', () => {
      const error = AuthenticationError.invalidCredentials();

      expect(error.message).toBe('Invalid email or password');
    });

    it('should create token expired error', () => {
      const error = AuthenticationError.tokenExpired();

      expect(error.message).toContain('expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should create with default message', () => {
      const error = new AuthorizationError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should create admin only error', () => {
      const error = AuthorizationError.adminOnly();

      expect(error.requiredRole).toBe('admin');
      expect(error.message).toContain('admin');
    });

    it('should create provider only error', () => {
      const error = AuthorizationError.providerOnly();

      expect(error.requiredRole).toBe('provider');
    });
  });

  describe('NotFoundError', () => {
    it('should create with default message', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create resource specific error', () => {
      const error = NotFoundError.resource('User', '123');

      expect(error.message).toBe('User with ID 123 not found');
      expect(error.resource).toBe('User');
      expect(error.resourceId).toBe('123');
    });

    it('should have convenience methods', () => {
      expect(NotFoundError.user('123').resource).toBe('User');
      expect(NotFoundError.order('456').resource).toBe('Order');
      expect(NotFoundError.provider('789').resource).toBe('Provider');
    });
  });

  describe('RateLimitError', () => {
    it('should create with retry after', () => {
      const error = new RateLimitError('Too many requests', 60);

      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
    });

    it('should return headers', () => {
      const error = new RateLimitError('Too many requests', 120, 10);
      const headers = error.getHeaders();

      expect(headers['Retry-After']).toBe('120');
    });

    it('should create OTP limit error', () => {
      const error = RateLimitError.otpLimit();

      expect(error.retryAfter).toBe(600);
      expect(error.limit).toBe(5);
    });
  });

  describe('ConflictError', () => {
    it('should create with default message', () => {
      const error = new ConflictError();

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT_ERROR');
    });

    it('should create duplicate error', () => {
      const error = ConflictError.duplicate('email', 'test@example.com');

      expect(error.message).toContain('email');
      expect(error.message).toContain('test@example.com');
      expect(error.conflictField).toBe('email');
    });

    it('should have convenience methods', () => {
      expect(ConflictError.emailExists().conflictField).toBe('email');
      expect(ConflictError.phoneExists().conflictField).toBe('phone');
    });
  });

  describe('Type Guards', () => {
    it('should identify AppError', () => {
      const appError = new AppError('Test');
      const regularError = new Error('Test');

      expect(isAppError(appError)).toBe(true);
      expect(isAppError(regularError)).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });

    it('should identify operational errors', () => {
      const operationalError = new ValidationError('Test');
      const nonOperationalError = new AppError('Test', 500, 'ERROR', false);

      expect(isOperationalError(operationalError)).toBe(true);
      expect(isOperationalError(nonOperationalError)).toBe(false);
      expect(isOperationalError(new Error('Test'))).toBe(false);
    });
  });
});
