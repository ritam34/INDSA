import logger from "./logger.js";

export class ErrorResponse {
  constructor(statusCode, message, errors = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.success = false;

    if (errors) {
      this.errors = errors;
    }
  }

  send(res) {
    return res.status(this.statusCode).json(this);
  }
}

export class SuccessResponse {
  constructor(data, message = "Success", meta = null) {
    this.success = true;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();

    if (meta) {
      this.meta = meta;
    }
  }

  send(res, statusCode = 200) {
    return res.status(statusCode).json(this);
  }
}

export class PaginatedResponse extends SuccessResponse {
  constructor(data, pagination, message = "Success") {
    super(data, message, pagination);
    this.pagination = {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1,
    };
  }
}

export const sendError = (res, statusCode, message, errors = null) => {
  logger.error("Sending error response", { statusCode, message, errors });
  return new ErrorResponse(statusCode, message, errors).send(res);
};

export const sendSuccess = (
  res,
  data,
  message = "Success",
  statusCode = 200,
  meta = null,
) => {
  return new SuccessResponse(data, message, meta).send(res, statusCode);
};

export const sendPaginated = (res, data, pagination, message = "Success") => {
  return new PaginatedResponse(data, pagination, message).send(res);
};

export const sendBadRequest = (res, message = "Bad Request", errors = null) => {
  return sendError(res, 400, message, errors);
};

export const sendUnauthorized = (res, message = "Unauthorized") => {
  return sendError(res, 401, message);
};

export const sendForbidden = (res, message = "Forbidden") => {
  return sendError(res, 403, message);
};

export const sendNotFound = (res, message = "Not Found") => {
  return sendError(res, 404, message);
};

export const sendConflict = (res, message = "Conflict") => {
  return sendError(res, 409, message);
};

export const sendTooManyRequests = (
  res,
  message = "Too Many Requests",
  retryAfter = 60,
) => {
  res.set("Retry-After", retryAfter);
  return sendError(res, 429, message);
};

export const sendInternalError = (res, message = "Internal Server Error") => {
  return sendError(res, 500, message);
};

export const sendServiceUnavailable = (
  res,
  message = "Service Unavailable",
  retryAfter = 300,
) => {
  res.set("Retry-After", retryAfter);
  return sendError(res, 503, message);
};

export default {
  ErrorResponse,
  SuccessResponse,
  PaginatedResponse,
  sendError,
  sendSuccess,
  sendPaginated,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendTooManyRequests,
  sendInternalError,
  sendServiceUnavailable,
};
