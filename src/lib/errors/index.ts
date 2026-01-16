/**
 * Centralized Error Classes for Engezna
 *
 * Usage:
 * import { ValidationError, NotFoundError } from '@/lib/errors';
 *
 * throw ValidationError.field('email', 'Invalid email format');
 * throw NotFoundError.order('123');
 */

export { AppError } from './AppError';
export { ValidationError, type ValidationErrorDetail } from './ValidationError';
export { AuthenticationError } from './AuthenticationError';
export { AuthorizationError } from './AuthorizationError';
export { NotFoundError } from './NotFoundError';
export { RateLimitError } from './RateLimitError';
export { ConflictError } from './ConflictError';

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is import('./AppError').AppError {
  return error instanceof Error && 'statusCode' in error && 'code' in error;
}

/**
 * Type guard to check if error is operational (expected)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
