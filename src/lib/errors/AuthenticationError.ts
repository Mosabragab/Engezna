import { AppError } from './AppError';

/**
 * Error for authentication failures
 * HTTP Status: 401 Unauthorized
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }

  static invalidCredentials() {
    return new AuthenticationError('Invalid email or password');
  }

  static tokenExpired() {
    return new AuthenticationError('Session expired. Please login again');
  }

  static invalidToken() {
    return new AuthenticationError('Invalid or malformed token');
  }

  static noToken() {
    return new AuthenticationError('No authentication token provided');
  }
}
