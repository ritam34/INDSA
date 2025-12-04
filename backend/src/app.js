import express from "express";
import cors from "cors";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.config.js";

import {
  sanitizeData,
  preventXSS,
  suspiciousActivityDetector,
  validateContentType,
  preventParameterPollution,
  requestSizeValidator,
} from "./middleware/security.middleware.js";

import {
  securityHeaders,
  customSecurityHeaders,
  corsConfig,
  requestId,
  responseTime,
  ipValidation,
} from "./middleware/securityHeaders.middleware.js";
import { generalLimiter, docsLimiter } from "./config/rateLimit.config.js";
import { performanceMiddleware } from "./middleware/performance.middleware.js";

import {
  requestLogger,
  slowRequestLogger,
  largeResponseLogger,
} from "./middleware/requestLogger.middleware.js";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.middleware.js";

import { authenticate } from "./middleware/auth.middleware.js";
import { isAdmin } from "./middleware/role.middleware.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import problemRoutes from "./routes/problem.routes.js";
import submissionRoutes from "./routes/submission.routes.js";
import discussionRoutes from "./routes/discussion.routes.js";
import playlistRoutes from "./routes/playlist.routes.js";
import solutionRoutes from "./routes/solution.routes.js";
import bookmarkRoutes from "./routes/bookmark.routes.js";
import contestRoutes from "./routes/contest.routes.js";
import studyPlanRoutes from "./routes/studyPlan.routes.js";
import badgeRoutes from "./routes/badge.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import healthRoutes from "./routes/health.routes.js";

import logger from "./utils/logger.js";

const app = express();

app.set("trust proxy", 1);

app.use(performanceMiddleware);
app.use(requestId);
app.use(responseTime);

app.use(securityHeaders);
app.use(customSecurityHeaders);
app.use(ipValidation);

app.use("/api-docs", docsLimiter);
app.use("/api", generalLimiter);

app.use(cors(corsConfig));
app.use(preventParameterPollution(["tags", "sort", "fields"]));
app.use(requestSizeValidator(10 * 1024 * 1024));

app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(sanitizeData);
app.use(preventXSS);
app.use(validateContentType(["application/json", "multipart/form-data"]));
app.use(suspiciousActivityDetector);

app.use(requestLogger);
app.use(slowRequestLogger(1000));
app.use(largeResponseLogger(1024 * 1024));

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024,
    level: 6,
  }),
);

app.use("/health", healthRoutes);

app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "LeetCode Clone API Docs",
    customfavIcon: "/favicon.ico",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "none",
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      syntaxHighlight: {
        activate: true,
        theme: "monokai",
      },
    },
  }),
);

import { getPerformanceMetrics } from "./middleware/performance.middleware.js";

app.get("/api/metrics", authenticate, isAdmin, getPerformanceMetrics);

const API_PREFIX = "/api";

app.use(API_PREFIX, (req, res, next) => {
  logger.api("API Request", {
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.id,
  });
  next();
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/stats`, statsRoutes);
app.use(`${API_PREFIX}/problems`, problemRoutes);
app.use(`${API_PREFIX}/submissions`, submissionRoutes);
app.use(`${API_PREFIX}/discussions`, discussionRoutes);
app.use(`${API_PREFIX}/playlists`, playlistRoutes);
app.use(`${API_PREFIX}/solutions`, solutionRoutes);
app.use(`${API_PREFIX}/bookmarks`, bookmarkRoutes);
app.use(`${API_PREFIX}/contests`, contestRoutes);
app.use(`${API_PREFIX}/study-plans`, studyPlanRoutes);
app.use(`${API_PREFIX}/badges`, badgeRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

app.get("/", (req, res) => {
  res.json({
    name: "LeetCode Clone API",
    version: "1.0.0",
    status: "running",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      health: "/health",
      api: "/api",
      docs: "/api-docs",
      metrics: "/api/metrics (admin only)",
    },
    features: {
      rateLimit: process.env.ENABLE_REDIS_RATE_LIMIT === "true",
      cache: process.env.ENABLE_REDIS_CACHE === "true",
      websocket: process.env.ENABLE_WEBSOCKET === "true",
      backgroundJobs: process.env.ENABLE_BACKGROUND_JOBS === "true",
    },
    timestamp: new Date().toISOString(),
    requestId: req.id,
  });
});

if (process.env.ENABLE_BACKGROUND_JOBS === "true") {
  try {
    const bullBoardAdapter = (await import("./config/queue/bullBoard.js"))
      .default;

    app.use(
      "/admin/queues",
      authenticate,
      isAdmin,
      bullBoardAdapter.getRouter(),
    );

    logger.info("Bull Board UI enabled at /admin/queues");
  } catch (err) {
    logger.warn("Bull Board failed to load:", err.message);
  }
}

app.use(notFoundHandler);
app.use(errorHandler);

process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("UNHANDLED REJECTION", reason);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM RECEIVED. Shutting down...");
});

export default app;
