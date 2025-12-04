export class ValidationError extends ApiError {
  constructor(message, errors = []) {
    super(400, message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}