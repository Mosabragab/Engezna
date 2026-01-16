/**
 * API Utilities for Engezna
 *
 * Usage:
 * import {
 *   withValidation,
 *   withErrorHandler,
 *   successResponse,
 *   errorResponse
 * } from '@/lib/api';
 */

export {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
  withErrorHandler,
  type ApiResponse,
} from './error-handler';

export { withValidation, validateBody, validateQuery, validateParams } from './validate';
