export class ExternalServiceError extends ApiError {
  constructor(service, message = 'External service error') {
    super(502, message);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}