import { AppError } from './AppError';

/**
 * Error for data conflicts (duplicate entries, etc.)
 * HTTP Status: 409 Conflict
 */
export class ConflictError extends AppError {
  public readonly conflictField?: string;

  constructor(message: string = 'Resource conflict', conflictField?: string) {
    super(message, 409, 'CONFLICT_ERROR', true, {
      ...(conflictField && { conflictField }),
    });
    this.conflictField = conflictField;
  }

  static duplicate(field: string, value?: string) {
    const message = value
      ? `A record with ${field} "${value}" already exists`
      : `A record with this ${field} already exists`;
    return new ConflictError(message, field);
  }

  static emailExists() {
    return ConflictError.duplicate('email');
  }

  static phoneExists() {
    return ConflictError.duplicate('phone');
  }

  static orderAlreadyProcessed() {
    return new ConflictError('Order has already been processed');
  }

  static broadcastAlreadyCompleted() {
    return new ConflictError('Broadcast has already been completed or cancelled');
  }
}
