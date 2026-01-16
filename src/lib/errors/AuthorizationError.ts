import { AppError } from './AppError';

/**
 * Error for authorization/permission failures
 * HTTP Status: 403 Forbidden
 */
export class AuthorizationError extends AppError {
  public readonly requiredRole?: string;
  public readonly userRole?: string;

  constructor(message: string = 'Access denied', requiredRole?: string, userRole?: string) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, {
      ...(requiredRole && { requiredRole }),
      ...(userRole && { userRole }),
    });
    this.requiredRole = requiredRole;
    this.userRole = userRole;
  }

  static insufficientPermissions(requiredRole?: string, userRole?: string) {
    return new AuthorizationError(
      'You do not have permission to perform this action',
      requiredRole,
      userRole
    );
  }

  static adminOnly() {
    return new AuthorizationError('This action requires admin privileges', 'admin');
  }

  static providerOnly() {
    return new AuthorizationError('This action is only available for providers', 'provider');
  }

  static ownerOnly() {
    return new AuthorizationError('You can only access your own resources');
  }
}
