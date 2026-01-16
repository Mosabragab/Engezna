import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ValidationError } from '@/lib/errors';
import { errorResponse } from './error-handler';

/**
 * Validation middleware for API routes
 */

type ValidatedData<TBody, TQuery, TParams> = {
  body: TBody;
  query: TQuery;
  params: TParams;
};

type ValidationSchemas<TBody, TQuery, TParams> = {
  body?: z.ZodType<TBody>;
  query?: z.ZodType<TQuery>;
  params?: z.ZodType<TParams>;
};

/**
 * Create a validated API route handler
 *
 * Usage:
 * export const POST = withValidation(
 *   { body: createOrderSchema },
 *   async (request, { body }) => {
 *     // body is fully typed and validated
 *     const order = await createOrder(body);
 *     return successResponse(order, 201);
 *   }
 * );
 */
export function withValidation<TBody = unknown, TQuery = unknown, TParams = unknown>(
  schemas: ValidationSchemas<TBody, TQuery, TParams>,
  handler: (
    request: NextRequest,
    validated: ValidatedData<TBody, TQuery, TParams>,
    context?: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      const validated: ValidatedData<TBody, TQuery, TParams> = {
        body: undefined as TBody,
        query: undefined as TQuery,
        params: undefined as TParams,
      };

      // Validate body if schema provided
      if (schemas.body) {
        let bodyData: unknown;
        try {
          bodyData = await request.json();
        } catch {
          throw ValidationError.field('body', 'Invalid JSON body');
        }

        const result = schemas.body.safeParse(bodyData);
        if (!result.success) {
          throw ValidationError.fromZodError(result.error);
        }
        validated.body = result.data;
      }

      // Validate query parameters if schema provided
      if (schemas.query) {
        const searchParams = request.nextUrl.searchParams;
        const queryObject: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          queryObject[key] = value;
        });

        const result = schemas.query.safeParse(queryObject);
        if (!result.success) {
          throw ValidationError.fromZodError(result.error);
        }
        validated.query = result.data;
      }

      // Validate route parameters if schema provided
      if (schemas.params && context?.params) {
        const paramsData = await context.params;
        const result = schemas.params.safeParse(paramsData);
        if (!result.success) {
          throw ValidationError.fromZodError(result.error);
        }
        validated.params = result.data;
      }

      return await handler(request, validated, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * Simple body validation helper
 *
 * Usage:
 * const body = await validateBody(request, createOrderSchema);
 */
export async function validateBody<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  let bodyData: unknown;
  try {
    bodyData = await request.json();
  } catch {
    throw ValidationError.field('body', 'Invalid JSON body');
  }

  const result = schema.safeParse(bodyData);
  if (!result.success) {
    throw ValidationError.fromZodError(result.error);
  }

  return result.data;
}

/**
 * Simple query validation helper
 *
 * Usage:
 * const query = validateQuery(request, paginationSchema);
 */
export function validateQuery<T>(request: NextRequest, schema: z.ZodType<T>): T {
  const searchParams = request.nextUrl.searchParams;
  const queryObject: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    queryObject[key] = value;
  });

  const result = schema.safeParse(queryObject);
  if (!result.success) {
    throw ValidationError.fromZodError(result.error);
  }

  return result.data;
}

/**
 * Simple params validation helper
 *
 * Usage:
 * const { id } = await validateParams(context.params, z.object({ id: uuidSchema }));
 */
export async function validateParams<T>(
  params: Promise<Record<string, string>>,
  schema: z.ZodType<T>
): Promise<T> {
  const paramsData = await params;
  const result = schema.safeParse(paramsData);
  if (!result.success) {
    throw ValidationError.fromZodError(result.error);
  }

  return result.data;
}
