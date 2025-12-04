import helmet from "helmet";
import logger from "../utils/logger.js";

const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://cdn.jsdelivr.net",
      "https://cdnjs.cloudflare.com",
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://cdn.jsdelivr.net",
      "https://fonts.googleapis.com",
    ],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    imgSrc: ["'self'", "data:", "https:", "http:"],
    connectSrc: [
      "'self'",
      process.env.FRONTEND_URL || "http://localhost:3000",
      "wss://localhost:5000",
      "ws://localhost:5000",
    ],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
  },
  reportOnly: process.env.NODE_ENV === "development",
};

export const securityHeaders = helmet({
  contentSecurityPolicy: cspConfig,

  dnsPrefetchControl: {
    allow: false,
  },

  expectCt: {
    enforce: true,
    maxAge: 30,
  },

  frameguard: {
    action: "deny",
  },

  hidePoweredBy: true,

  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  ieNoOpen: true,

  noSniff: true,

  permittedCrossDomainPolicies: {
    permittedPolicies: "none",
  },

  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },

  xssFilter: true,
});

export const customSecurityHeaders = (req, res, next) => {
  res.removeHeader("X-Powered-By");
  res.removeHeader("Server");

  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()",
  );

  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  if (req.path.includes("/auth") || req.path.includes("/user")) {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    const contentType = req.get("Content-Type");
    if (
      contentType &&
      !contentType.includes("application/json") &&
      !contentType.includes("multipart/form-data")
    ) {
      logger.security("Invalid content type", {
        contentType,
        path: req.path,
        ip: req.ip,
      });
    }
  }

  next();
};

export const corsConfig = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000", "http://localhost:5173"];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.security("CORS origin blocked", {
        origin,
        allowedOrigins,
      });
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-HTTP-Method-Override",
    "Accept",
  ],
  exposedHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
    "X-Response-Time",
  ],
  maxAge: 86400,
};

export const requestId = (req, res, next) => {
  const id =
    req.get("X-Request-ID") ||
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  req.id = id;
  res.setHeader("X-Request-ID", id);

  next();
};

export const responseTime = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    res.setHeader("X-Response-Time", `${duration}ms`);

    if (duration > 1000) {
      logger.performance("Slow response", {
        requestId: req.id,
        path: req.path,
        method: req.method,
        duration: `${duration}ms`,
      });
    }
  });

  next();
};

const blockedIPs = new Set();
const suspiciousIPs = new Map();

export const ipValidation = (req, res, next) => {
  const ip = req.ip;

  if (blockedIPs.has(ip)) {
    logger.security("Blocked IP attempted access", { ip, path: req.path });
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  if (suspiciousIPs.has(ip)) {
    const data = suspiciousIPs.get(ip);
    data.count++;
    data.lastAttempt = Date.now();

    if (data.count > 50) {
      blockedIPs.add(ip);
      logger.security("IP automatically blocked", { ip, attempts: data.count });
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
  }

  next();
};

export const markSuspiciousIP = (ip) => {
  if (!suspiciousIPs.has(ip)) {
    suspiciousIPs.set(ip, { count: 1, lastAttempt: Date.now() });
  } else {
    const data = suspiciousIPs.get(ip);
    data.count++;
    data.lastAttempt = Date.now();
  }

  logger.security("IP marked as suspicious", {
    ip,
    count: suspiciousIPs.get(ip).count,
  });
};

export const cleanupSuspiciousIPs = () => {
  setInterval(
    () => {
      const now = Date.now();
      const threshold = 24 * 60 * 60 * 1000;

      for (const [ip, data] of suspiciousIPs.entries()) {
        if (now - data.lastAttempt > threshold) {
          suspiciousIPs.delete(ip);
        }
      }

      logger.info("Cleaned up suspicious IP records", {
        remaining: suspiciousIPs.size,
      });
    },
    60 * 60 * 1000,
  );
};

export const initializeSecurity = () => {
  cleanupSuspiciousIPs();

  logger.info("Security monitoring initialized", {
    blockedIPs: blockedIPs.size,
    suspiciousIPs: suspiciousIPs.size,
  });
};

export default {
  securityHeaders,
  customSecurityHeaders,
  corsConfig,
  requestId,
  responseTime,
  ipValidation,
  markSuspiciousIP,
  initializeSecurity,
};