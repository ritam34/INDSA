import express from "express";
import { prisma } from "../config/database.config.js";
import { getConnectedSocketsCount } from "../config/websocket.config.js";
import { queues } from "../config/queue/queue.config.js";

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get("/", async (req, res) => {
  try {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      services: {},
    };

    // Check Database
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.services.database = {
        status: "connected",
        type: "PostgreSQL",
      };
    } catch (error) {
      health.services.database = {
        status: "disconnected",
        error: error.message,
      };
      health.status = "degraded";
    }

    // Check WebSocket
    if (process.env.ENABLE_WEBSOCKET === "true") {
      try {
        const connectedClients = await getConnectedSocketsCount();
        health.services.websocket = {
          status: "active",
          connectedClients,
        };
      } catch (error) {
        health.services.websocket = {
          status: "error",
          error: error.message,
        };
      }
    } else {
      health.services.websocket = {
        status: "disabled",
      };
    }

    // Check Background Jobs
    if (process.env.ENABLE_BACKGROUND_JOBS === "true") {
      try {
        const queueStats = {};

        for (const [name, queue] of Object.entries(queues)) {
          if (queue) {
            const counts = await queue.getJobCounts();
            queueStats[name] = {
              waiting: counts.waiting,
              active: counts.active,
              completed: counts.completed,
              failed: counts.failed,
            };
          }
        }

        health.services.backgroundJobs = {
          status: "active",
          queues: queueStats,
        };
      } catch (error) {
        health.services.backgroundJobs = {
          status: "error",
          error: error.message,
        };
      }
    } else {
      health.services.backgroundJobs = {
        status: "disabled",
      };
    }

    // Memory usage
    const memoryUsage = process.memoryUsage();
    health.memory = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    };

    // CPU usage
    health.cpu = {
      user: process.cpuUsage().user,
      system: process.cpuUsage().system,
    };

    const statusCode = health.status === "ok" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Readiness check endpoint (for k8s/docker)
 * GET /health/ready
 */
router.get("/ready", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready" });
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      error: error.message,
    });
  }
});

/**
 * Liveness check endpoint (for k8s/docker)
 * GET /health/live
 */
router.get("/live", (req, res) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

export default router;