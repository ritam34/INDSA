import { initializeQueues, closeQueues } from "../config/queue/queue.config.js";
import { startSubmissionWorker } from "./submissionWorker.js";
import { startEmailWorker } from "./emailWorker.js";
import { startStatsWorker } from "./statsWorker.js";
import { startBadgeWorker } from "./badgeWorker.js";
import { startNotificationWorker } from "./notificationWorker.js";
import logger from "../utils/logger.js";

export const startAllWorkers = async () => {
  try {
    logger.info("Starting all workers...");

    const queuesInitialized = await initializeQueues();

    if (!queuesInitialized) {
      logger.warn("Queues not initialized - workers disabled");
      return false;
    }

    startSubmissionWorker();
    startEmailWorker();
    startStatsWorker();
    startBadgeWorker();
    startNotificationWorker();

    logger.info("All workers started successfully");

    const shutdown = async (signal) => {
      logger.info(`${signal} received, closing workers...`);
      await closeQueues();
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    return true;
  } catch (error) {
    logger.error("Failed to start workers:", error);
    return false;
  }
};

export const stopAllWorkers = async () => {
  try {
    logger.info("Stopping all workers...");
    await closeQueues();
    logger.info("All workers stopped");
  } catch (error) {
    logger.error("Error stopping workers:", error);
    throw error;
  }
};

export default startAllWorkers;
