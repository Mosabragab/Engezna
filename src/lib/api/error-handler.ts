import { NextResponse } from 'next/server';
import { AppError, isAppError, RateLimitError } from '@/lib/errors';
import { alertApiError } from '@/lib/monitoring/slack-alerting';

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    errors?: Array<{ field: string; message: string }>;
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create an error response from an Error object
 */
export function errorResponse(error: unknown): NextResponse<ApiResponse> {
  // Handle AppError instances
  if (isAppError(error)) {
    const headers: Record<string, string> = {};

    // Add rate limit headers if applicable
    if (error instanceof RateLimitError) {
      const rateLimitHeaders = error.getHeaders();
      Object.assign(headers, rateLimitHeaders);
    }

    return NextResponse.json(error.toJSON(), {
      status: error.statusCode,
      headers,
    });
  }

  // Handle Zod validation errors
  if (
    error &&
    typeof error === 'object' &&
    'errors' in error &&
    Array.isArray((error as { errors: unknown[] }).errors)
  ) {
    const zodError = error as { errors: Array<{ path: (string | number)[]; message: string }> };
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: zodError.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  // Handle standard Error
  if (error instanceof Error) {
    // Log unexpected errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', error);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message:
            process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}

/**
 * Wrapper for API route handlers with automatic error handling
 *
 * Usage:
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await fetchData();
 *   return successResponse(data);
 * });
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Send Slack alert for 500-level (non-operational) errors
      const isOperational = isAppError(error) && error.isOperational;
      if (!isOperational) {
        const route =
          args[0] && typeof args[0] === 'object' && 'url' in args[0]
            ? new URL((args[0] as Request).url).pathname
            : 'unknown';
        alertApiError(route, error).catch(() => {});
      }

      return errorResponse(error);
    }
  };
}

/**
 * Create a 201 Created response
 */
export function createdResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return successResponse(data, 201);
}

/**
 * Create a 204 No Content response
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
