import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/role.middleware.js";
import {
  getAllQueuesStats,
  getQueueStats,
  cleanOldJobs,
} from "../config/queue/queue.config.js";
import { queues } from "../config/queue/queue.config.js";

const router = express.Router();

router.use(authenticate, isAdmin);

router.get("/stats", async (req, res) => {
  try {
    const stats = await getAllQueuesStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/stats/:queueName", async (req, res) => {
  try {
    const stats = await getQueueStats(req.params.queueName);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:queueName/failed", async (req, res) => {
  try {
    const queue = queues[req.params.queueName];
    if (!queue) {
      return res
        .status(404)
        .json({ success: false, message: "Queue not found" });
    }

    const failedJobs = await queue.getFailed(0, 50);
    res.json({ success: true, data: failedJobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:queueName/retry/:jobId", async (req, res) => {
  try {
    const queue = queues[req.params.queueName];
    const job = await queue.getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    await job.retry();
    res.json({ success: true, message: "Job retry initiated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/clean", async (req, res) => {
  try {
    await cleanOldJobs();
    res.json({ success: true, message: "Old jobs cleaned" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:queueName/pause", async (req, res) => {
  try {
    const queue = queues[req.params.queueName];
    if (!queue) {
      return res
        .status(404)
        .json({ success: false, message: "Queue not found" });
    }

    await queue.pause();
    res.json({ success: true, message: "Queue paused" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/:queueName/resume", async (req, res) => {
  try {
    const queue = queues[req.params.queueName];
    if (!queue) {
      return res
        .status(404)
        .json({ success: false, message: "Queue not found" });
    }

    await queue.resume();
    res.json({ success: true, message: "Queue resumed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;