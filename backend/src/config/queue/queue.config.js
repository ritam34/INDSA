import Queue from "bull";
import logger from "../../utils/logger.js";

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const defaultQueueOptions = {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

export const queues = {
  submission: null,
  email: null,
  stats: null,
  badge: null,
};

export const initializeQueues = async () => {
  try {
    if (process.env.ENABLE_BACKGROUND_JOBS !== "true") {
      logger.info("Background jobs disabled - skipping queue initialization");
      return null;
    }

    queues.submission = new Queue("submission-queue", defaultQueueOptions);
    queues.email = new Queue("email-queue", defaultQueueOptions);
    queues.stats = new Queue("stats-queue", defaultQueueOptions);
    queues.badge = new Queue("badge-queue", defaultQueueOptions);

    logger.info("All queues initialized successfully");
    return queues;
  } catch (error) {
    logger.error(
      "Failed to initialize queues (background jobs will be disabled):",
      error.message,
    );
    return null;
  }
};

export const closeQueues = async () => {
  try {
    const closePromises = Object.values(queues)
      .filter((queue) => queue)
      .map((queue) => queue.close());

    await Promise.all(closePromises);
    logger.info("All queues closed successfully");
  } catch (error) {
    logger.error("Error closing queues:", error);
  }
};

export const addJob = async (queueName, jobName, data) => {
  try {
    const queue = queues[queueName];

    if (!queue) {
      logger.warn(`Queue ${queueName} not initialized - job will be skipped`);
      return null;
    }

    const job = await queue.add(jobName, data);
    logger.info(`Job added to ${queueName}:`, jobName);
    return job;
  } catch (error) {
    logger.error(`Failed to add job to ${queueName}:`, error);
    return null;
  }
};

export default queues;
