export class InternalError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, message);
    this.name = 'InternalError';
  }
}