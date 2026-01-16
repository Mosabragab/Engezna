import { AppError } from './AppError';
import type { ZodError } from 'zod';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

/**
 * Error for validation failures
 * HTTP Status: 400 Bad Request
 */
export class ValidationError extends AppError {
  public readonly errors: ValidationErrorDetail[];

  constructor(message: string = 'Validation failed', errors: ValidationErrorDetail[] = []) {
    super(message, 400, 'VALIDATION_ERROR', true, { errors });
    this.errors = errors;
  }

  /**
   * Create from Zod error (supports Zod v4.x)
   */
  static fromZodError(zodError: ZodError): ValidationError {
    const errors: ValidationErrorDetail[] = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    return new ValidationError('Validation failed', errors);
  }

  /**
   * Create single field error
   */
  static field(field: string, message: string) {
    return new ValidationError('Validation failed', [{ field, message }]);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        errors: this.errors,
      },
    };
  }
}
