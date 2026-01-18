/**
 * Zod Validation Middleware
 *
 * Provides utilities to validate request bodies in API routes.
 * Returns structured error responses for validation failures.
 *
 * @version 1.0.0 - Phase 1.3 Implementation
 * @see docs/MASTER_IMPLEMENTATION_PLAN.md - Section 1.3
 */

import { NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: NextResponse;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Validation Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate request body against a Zod schema
 *
 * @example
 * ```ts
 * const result = await validateBody(chatRequestSchema, request);
 * if (!result.success) return result.error;
 * const { messages, providerId } = result.data;
 * ```
 */
export async function validateBody<T>(
  schema: ZodSchema<T>,
  request: Request
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const details: ValidationErrorDetail[] = error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));

      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation Error',
            error_ar: 'خطأ في البيانات المدخلة',
            details,
          },
          { status: 400 }
        ),
      };
    }

    // JSON parse error
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Invalid JSON',
            error_ar: 'صيغة JSON غير صالحة',
          },
          { status: 400 }
        ),
      };
    }

    // Unknown error
    return {
      success: false,
      error: NextResponse.json(
        {
          error: 'Invalid request body',
          error_ar: 'بيانات الطلب غير صالحة',
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate data directly (not from request)
 * Useful for validating data from other sources
 */
export function validateData<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ValidationErrorDetail[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: ValidationErrorDetail[] = error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      }));
      return { success: false, errors };
    }
    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Validation failed' }],
    };
  }
}

/**
 * Create a validation error response manually
 * Useful when you need to return validation errors from custom logic
 */
export function createValidationErrorResponse(details: ValidationErrorDetail[]): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation Error',
      error_ar: 'خطأ في البيانات المدخلة',
      details,
    },
    { status: 400 }
  );
}

/**
 * Helper to check if validation result is successful
 * TypeScript type guard
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is ValidationSuccess<T> {
  return result.success === true;
}
