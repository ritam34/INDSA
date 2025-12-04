export class DatabaseError extends ApiError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(500, message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}