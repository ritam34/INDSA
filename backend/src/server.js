import dotenv from "dotenv";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: envFile });

import http from "http";
import app from "./app.js";
import { initializeQueues, closeQueues } from "./config/queue/queue.config.js";
import { startAllWorkers } from "./workers/index.js";
import { prisma } from "./config/database.config.js";
import logger from "./utils/logger.js";
import emailService from "./services/email.service.js";
import { initializeWebSocket } from "./config/websocket.config.js";
import { setupSubmissionSocket } from "./websocket/submission.socket.js";
import { setupContestSocket } from "./websocket/contest.socket.js";
import { setupNotificationSocket } from "./websocket/notification.socket.js";
import { initializeSecurity } from "./middleware/securityHeaders.middleware.js";
import { initializePerformanceMonitoring } from "./middleware/performance.middleware.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    initializeSecurity();
    logger.info("Security monitoring initialized");

    initializePerformanceMonitoring();
    logger.info("Performance monitoring initialized");

    await prisma.$connect();
    logger.info("Database connected successfully");

    await emailService.initialize();
    logger.info("Email service initialized");

    if (process.env.ENABLE_BACKGROUND_JOBS === "true") {
      await initializeQueues();
      logger.info("Queues initialized");

      const workersStarted = await startAllWorkers();
      if (workersStarted) {
        logger.info("Background workers started");
      } else {
        logger.warn("Workers failed to start - jobs will be skipped");
      }
    } else {
      logger.info(
        "Background jobs disabled (set ENABLE_BACKGROUND_JOBS=true to enable)",
      );
    }

    const server = http.createServer(app);

    let io = null;
    if (process.env.ENABLE_WEBSOCKET === "true") {
      try {
        io = initializeWebSocket(server);
        logger.info("WebSocket server initialized");

        setupSubmissionSocket(io);
        setupContestSocket(io);
        setupNotificationSocket(io);
        logger.info("WebSocket handlers registered");
      } catch (error) {
        logger.error("Failed to initialize WebSocket:", error);
        logger.warn("Server will continue without WebSocket support");
      }
    } else {
      logger.info("WebSocket disabled (set ENABLE_WEBSOCKET=true to enable)");
    }

    server.listen(PORT, () => {
      logger.info(`Server Started Successfully`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`Port: ${PORT}`);
      logger.info(`API: http://localhost:${PORT}`);
      logger.info(`Health Check: http://localhost:${PORT}/health`);

      if (process.env.ENABLE_BACKGROUND_JOBS === "true") {
        logger.info(`Queue UI: http://localhost:${PORT}/admin/queues`);
      }

      if (process.env.ENABLE_WEBSOCKET === "true") {
        logger.info(`WebSocket: ws://localhost:${PORT}`);
      }
    });
    setInterval(
      async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          logger.debug("Health check: Database OK");
        } catch (error) {
          logger.error("Health check: Database FAILED", error);
        }
      },
      30 * 60 * 1000,
    );
    const gracefulShutdown = async (signal) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info("HTTP server closed");

        try {
          if (io) {
            logger.info("Closing WebSocket connections...");
            io.close(() => {
              logger.info("WebSocket connections closed");
            });
          }

          if (process.env.ENABLE_BACKGROUND_JOBS === "true") {
            logger.info("Closing queue connections...");
            await closeQueues();
            logger.info("Queues closed");
          }

          logger.info("Closing database connection...");
          await prisma.$disconnect();
          logger.info("Database disconnected");

          logger.info("Graceful shutdown complete");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown:", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error(
          "Could not close connections in time, forcefully shutting down",
        );
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    return server;
  } catch (error) {
    logger.error("Server startup failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  logger.error("Stack:", error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise);
  logger.error("Reason:", reason);
  process.exit(1);
});

startServer();
