import { AppError } from './AppError';

/**
 * Error for rate limit exceeded
 * HTTP Status: 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;
  public readonly limit?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number, limit?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, {
      ...(retryAfter && { retryAfter }),
      ...(limit && { limit }),
    });
    this.retryAfter = retryAfter;
    this.limit = limit;
  }

  static tooManyAttempts(retryAfterSeconds?: number) {
    return new RateLimitError('Too many attempts. Please try again later', retryAfterSeconds);
  }

  static otpLimit(retryAfterSeconds: number = 600) {
    return new RateLimitError(
      'Too many OTP requests. Please wait before requesting a new code',
      retryAfterSeconds,
      5
    );
  }

  static loginLimit(retryAfterSeconds: number = 1800) {
    return new RateLimitError(
      'Too many login attempts. Account temporarily locked',
      retryAfterSeconds,
      10
    );
  }

  /**
   * Get headers to include in response
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.retryAfter) {
      headers['Retry-After'] = String(this.retryAfter);
    }
    return headers;
  }
}
