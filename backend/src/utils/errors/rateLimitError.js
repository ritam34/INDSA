export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(429, message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}