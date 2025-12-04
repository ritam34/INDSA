export class ServiceUnavailableError extends ApiError {
  constructor(service = 'Service', retryAfter = 300) {
    super(503, `${service} is currently unavailable`);
    this.name = 'ServiceUnavailableError';
    this.service = service;
    this.retryAfter = retryAfter;
  }
}