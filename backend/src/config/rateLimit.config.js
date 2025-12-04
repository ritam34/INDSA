import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import slowDown from "express-slow-down";
import logger from "../utils/logger.js";

let redisClient = null;

if (process.env.ENABLE_REDIS_RATE_LIMIT === "true") {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 1,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on("error", (err) => {
    logger.error("Redis rate limit client error:", err);
  });

  redisClient.on("connect", () => {
    logger.info("Redis rate limit store connected");
  });
}

const rateLimitHandler = (req, res) => {
  logger.security("Rate limit exceeded", {
    ip: req.ip,
    path: req.path,
    userId: req.user?.id,
  });

  res.status(429).json({
    success: false,
    statusCode: 429,
    message: "Too many requests, please try again later",
    retryAfter: req.rateLimit?.resetTime
      ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
      : 60,
    timestamp: new Date().toISOString(),
  });
};

const skipRateLimit = (req) => {
  if (req.path === "/health" || req.path === "/health/live") {
    return true;
  }

  if (req.user?.role === "ADMIN" && process.env.NODE_ENV === "development") {
    return true;
  }

  return false;
};

const storeConfig = redisClient
  ? {
      store: new RedisStore({
        client: redisClient,
        prefix: "rl:",
      }),
    }
  : {};

export const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  ...storeConfig,
});

export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts, please try again later",
  skipSuccessfulRequests: true,
  handler: rateLimitHandler,
  ...storeConfig,
});

export const submissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Too many submissions, please slow down",
  handler: rateLimitHandler,
  skip: skipRateLimit,
  keyGenerator: (req) => {
    return req.user?.id || ipKeyGenerator(req);
  },
  ...storeConfig,
});

export const createContentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: "Too many posts, please slow down",
  handler: rateLimitHandler,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req),
  ...storeConfig,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Too many password reset attempts, please try again later",
  handler: rateLimitHandler,
  ...storeConfig,
});

export const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many verification emails requested",
  handler: rateLimitHandler,
  ...storeConfig,
});

export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: () => 500,
  maxDelayMs: 20000,
  skipSuccessfulRequests: false,
  skip: skipRateLimit,
});

export const contestSubmissionLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 30,
  message: "Maximum submissions reached for this contest",
  handler: rateLimitHandler,
  keyGenerator: (req) => {
    const contestId = req.params.contestId || req.body.contestId;
    return `${req.user?.id || ipKeyGenerator(req)}-${contestId}`;
  },
  ...storeConfig,
});

export const docsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: "Too many requests to API docs",
  standardHeaders: true,
  ...storeConfig,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many file uploads",
  handler: rateLimitHandler,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req),
  ...storeConfig,
});

process.on("SIGTERM", async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info("Redis rate limit connection closed");
  }
});

export default {
  generalLimiter,
  authLimiter,
  submissionLimiter,
  createContentLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  speedLimiter,
  contestSubmissionLimiter,
  docsLimiter,
  uploadLimiter,
};
