import { AppError } from './AppError';

/**
 * Error for resource not found
 * HTTP Status: 404 Not Found
 */
export class NotFoundError extends AppError {
  public readonly resource?: string;
  public readonly resourceId?: string;

  constructor(message: string = 'Resource not found', resource?: string, resourceId?: string) {
    super(message, 404, 'NOT_FOUND', true, {
      ...(resource && { resource }),
      ...(resourceId && { resourceId }),
    });
    this.resource = resource;
    this.resourceId = resourceId;
  }

  static resource(resource: string, id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    return new NotFoundError(message, resource, id);
  }

  static user(id?: string) {
    return NotFoundError.resource('User', id);
  }

  static order(id?: string) {
    return NotFoundError.resource('Order', id);
  }

  static provider(id?: string) {
    return NotFoundError.resource('Provider', id);
  }

  static product(id?: string) {
    return NotFoundError.resource('Product', id);
  }

  static broadcast(id?: string) {
    return NotFoundError.resource('Broadcast', id);
  }
}
