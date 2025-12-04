import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import helmet from "helmet";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";

export const sanitizeData = mongoSanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    logger.security("Data sanitization triggered", {
      ip: req.ip,
      path: req.path,
      key,
      userAgent: req.get("user-agent"),
    });
  },
});

export const preventXSS = xss();

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

export const suspiciousActivityDetector = (req, res, next) => {
  const suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /\.\.\//g,
    /union.*select/gi,
    /exec\s*\(/gi,
  ];

  const checkString = `${req.originalUrl}${JSON.stringify(req.body)}${JSON.stringify(req.query)}`;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logger.security("Suspicious activity detected", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        pattern: pattern.toString(),
        userAgent: req.get("user-agent"),
        body: req.body,
        query: req.query,
      });

      if (process.env.NODE_ENV === "production") {
        return next(new ApiError(400, "Invalid request"));
      }
    }
  }

  next();
};

export const ipRateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const ipRequests = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    if (!ipRequests.has(ip)) {
      ipRequests.set(ip, { count: 0, resetTime: now + windowMs });
    }

    const record = ipRequests.get(ip);

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count++;

    if (record.count > maxRequests) {
      logger.security("Rate limit exceeded", {
        ip,
        requests: record.count,
        maxRequests,
        path: req.path,
      });

      return res.status(429).json({
        status: "error",
        message: "Too many requests, please try again later",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    res.set({
      "X-RateLimit-Limit": maxRequests,
      "X-RateLimit-Remaining": maxRequests - record.count,
      "X-RateLimit-Reset": new Date(record.resetTime).toISOString(),
    });

    next();
  };
};

export const validateContentType = (allowedTypes = ["application/json"]) => {
  return (req, res, next) => {
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const contentType = req.get("Content-Type");

      if (!contentType) {
        return next(new ApiError(400, "Content-Type header is required"));
      }

      const isAllowed = allowedTypes.some((type) => contentType.includes(type));

      if (!isAllowed) {
        logger.security("Invalid content type", {
          ip: req.ip,
          path: req.path,
          contentType,
          allowedTypes,
        });

        return next(
          new ApiError(
            415,
            `Unsupported content type. Allowed: ${allowedTypes.join(", ")}`,
          ),
        );
      }
    }

    next();
  };
};

export const preventParameterPollution = (whitelist = []) => {
  return (req, res, next) => {
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value) && !whitelist.includes(key)) {
          logger.security("Parameter pollution detected", {
            ip: req.ip,
            path: req.path,
            parameter: key,
            value,
          });

          req.query[key] = value[value.length - 1];
        }
      }
    }
    next();
  };
};

export const requestSizeValidator = (maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get("Content-Length") || "0");

    if (contentLength > maxSize) {
      logger.security("Request size exceeded", {
        ip: req.ip,
        path: req.path,
        size: contentLength,
        maxSize,
      });

      return next(new ApiError(413, "Request entity too large"));
    }

    next();
  };
};

export const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000"];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.security("CORS origin blocked", { origin });
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

export default {
  sanitizeData,
  preventXSS,
  securityHeaders,
  suspiciousActivityDetector,
  ipRateLimiter,
  validateContentType,
  preventParameterPollution,
  requestSizeValidator,
  corsOptions,
};
