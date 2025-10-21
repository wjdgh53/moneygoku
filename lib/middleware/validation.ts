/**
 * API Input Validation Middleware
 *
 * Provides Zod-based validation for API route inputs.
 * Ensures type safety and prevents invalid data from reaching the application.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '@/lib/utils/logger';

/**
 * Validation error response
 */
interface ValidationErrorResponse {
  error: string;
  details?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Validate request body against a Zod schema
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));

      logger.warn('Validation error', { details });

      return {
        data: null,
        error: NextResponse.json<ValidationErrorResponse>(
          {
            error: 'Validation failed',
            details,
          },
          { status: 400 }
        ),
      };
    }

    logger.error('Unexpected validation error', error);

    return {
      data: null,
      error: NextResponse.json<ValidationErrorResponse>(
        {
          error: 'Invalid request body',
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const data = schema.parse(params);
    return { data, error: null };
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));

      logger.warn('Query validation error', { details });

      return {
        data: null,
        error: NextResponse.json<ValidationErrorResponse>(
          {
            error: 'Invalid query parameters',
            details,
          },
          { status: 400 }
        ),
      };
    }

    logger.error('Unexpected query validation error', error);

    return {
      data: null,
      error: NextResponse.json<ValidationErrorResponse>(
        {
          error: 'Invalid query parameters',
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * Bot ID parameter
   */
  botId: z.object({
    id: z.string().cuid(),
  }),

  /**
   * Symbol parameter
   */
  symbol: z.object({
    symbol: z.string().min(1).max(10).toUpperCase(),
  }),

  /**
   * Pagination parameters
   */
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),

  /**
   * Date range parameters
   */
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

/**
 * Example usage in an API route:
 *
 * ```typescript
 * import { validateRequest } from '@/lib/middleware/validation';
 * import { z } from 'zod';
 *
 * const CreateBotSchema = z.object({
 *   name: z.string().min(1),
 *   symbol: z.string().min(1),
 *   fundAllocation: z.number().positive(),
 * });
 *
 * export async function POST(request: NextRequest) {
 *   const { data, error } = await validateRequest(request, CreateBotSchema);
 *   if (error) return error;
 *
 *   // data is now typed and validated
 *   const bot = await createBot(data);
 *   return NextResponse.json(bot);
 * }
 * ```
 */
