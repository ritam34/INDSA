import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import { Prisma } from "@prisma/client";

const handlePrismaError = (error) => {
  logger.error("Prisma Error:", {
    code: error.code,
    meta: error.meta,
    message: error.message,
  });

  switch (error.code) {
    case "P2002":
      const field = error.meta?.target?.[0] || "field";
      return new ApiError(409, `${field} already exists`);

    case "P2025":
      return new ApiError(404, "Resource not found");

    case "P2003":
      return new ApiError(400, "Invalid reference to related resource");

    case "P2014":
      return new ApiError(400, "Invalid relation in query");

    case "P2021":
      return new ApiError(500, "Database schema error");

    default:
      return new ApiError(500, "Database operation failed");
  }
};

const handleJWTError = (error) => {
  if (error.name === "JsonWebTokenError") {
    return new ApiError(401, "Invalid token");
  }
  if (error.name === "TokenExpiredError") {
    return new ApiError(401, "Token expired");
  }
  return new ApiError(401, "Authentication failed");
};

const handleValidationError = (error) => {
  const errors =
    error.details?.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
    })) || [];

  return new ApiError(400, "Validation failed", true, "", errors);
};

const sendErrorDev = (err, res) => {
  const response = {
    status: "error",
    statusCode: err.statusCode,
    message: err.message,
    error: err,
    stack: err.stack,
    timestamp: err.timestamp || new Date().toISOString(),
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  res.status(err.statusCode).json(response);
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    const response = {
      status: "error",
      statusCode: err.statusCode,
      message: err.message,
      timestamp: err.timestamp || new Date().toISOString(),
    };

    if (err.errors) {
      response.errors = err.errors;
    }

    if (err.retryAfter) {
      res.set("Retry-After", err.retryAfter);
      response.retryAfter = err.retryAfter;
    }

    res.status(err.statusCode).json(response);
  } else {
    logger.error("CRITICAL ERROR:", err);

    res.status(500).json({
      status: "error",
      statusCode: 500,
      message: "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.isOperational = err.isOperational || false;

  logger.error("Error Handler Triggered:", {
    name: err.name,
    message: err.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    stack: err.stack,
  });

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  } else if (
    err.name === "JsonWebTokenError" ||
    err.name === "TokenExpiredError"
  ) {
    error = handleJWTError(err);
  } else if (err.name === "ValidationError" && err.details) {
    error = handleValidationError(err);
  } else if (err.name === "CastError") {
    error = handleCastError(err);
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(
      error.statusCode,
      error.message || "Something went wrong",
      false,
    );
  }

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
