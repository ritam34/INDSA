import { queues } from "../config/queue/queue.config.js";
import badgeService from "../services/badge.service.js";
import logger from "../utils/logger.js";

const processBadgeCheck = async (job) => {
  const { userId } = job.data;

  try {
    logger.info(`Checking badges for user ${userId}`);

    const newBadges = await badgeService.checkAndAwardBadges(userId);

    logger.info(
      `Badge check complete for ${userId}: ${newBadges.length} new badges`,
    );

    await job.progress(100);

    return {
      success: true,
      userId,
      newBadgesCount: newBadges.length,
      badges: newBadges.map((badge) => ({
        id: badge.id,
        badgeId: badge.badgeId,
        name: badge.name,
        rarity: badge.rarity,
        category: badge.category,
      })),
    };
  } catch (error) {
    logger.error(`Failed to check badges for ${userId}:`, error);
    throw error;
  }
};

const processAwardBadge = async (job) => {
  const { userId, badgeId, metadata = {} } = job.data;

  try {
    logger.info(`Awarding badge ${badgeId} to user ${userId}`);

    const result = await badgeService.awardBadge(userId, badgeId, metadata);

    logger.info(`Badge ${badgeId} awarded to ${userId}`);

    await job.progress(100);

    return {
      success: true,
      userId,
      badgeId,
      badge: {
        id: result.id,
        name: result.name,
        rarity: result.rarity,
        earnedAt: result.earnedAt,
      },
    };
  } catch (error) {
    logger.error(`Failed to award badge ${badgeId} to ${userId}:`, error);
    throw error;
  }
};

const processBulkBadgeCheck = async (job) => {
  const { userIds } = job.data;

  try {
    logger.info(`Checking badges for ${userIds.length} users`);

    const results = [];
    const total = userIds.length;

    for (let i = 0; i < total; i++) {
      const userId = userIds[i];

      try {
        const newBadges = await badgeService.checkAndAwardBadges(userId);
        results.push({
          userId,
          success: true,
          newBadgesCount: newBadges.length,
        });
      } catch (error) {
        logger.error(`Failed to check badges for user ${userId}:`, error);
        results.push({
          userId,
          success: false,
          error: error.message,
        });
      }

      await job.progress(Math.round(((i + 1) / total) * 100));
    }

    logger.info(`Bulk badge check complete: ${results.length} users processed`);

    return {
      success: true,
      totalUsers: userIds.length,
      results,
    };
  } catch (error) {
    logger.error("Failed to process bulk badge check:", error);
    throw error;
  }
};

const onCompleted = (job, result) => {
  logger.info(`Badge job ${job.id} completed:`, {
    jobType: job.name,
    jobId: job.id,
    result,
  });
};

const onFailed = (job, error) => {
  logger.error(`Badge job ${job.id} failed:`, {
    jobType: job.name,
    jobId: job.id,
    error: error.message,
    stack: error.stack,
  });
};

const onProgress = (job, progress) => {
  logger.debug(`Badge job ${job.id} progress: ${progress}%`);
};

export const startBadgeWorker = () => {
  if (!queues.badge) {
    logger.warn("Badge queue not initialized - badge worker disabled");
    return null;
  }

  try {
    queues.badge.process("check-badges", 5, processBadgeCheck);
    queues.badge.process("award-badge", 5, processAwardBadge);
    queues.badge.process("bulk-check-badges", 2, processBulkBadgeCheck);

    queues.badge.on("completed", onCompleted);
    queues.badge.on("failed", onFailed);
    queues.badge.on("progress", onProgress);

    queues.badge.on("stalled", (job) => {
      logger.warn(`Badge job ${job.id} has stalled`);
    });

    queues.badge.on("active", (job) => {
      logger.debug(`Badge job ${job.id} started processing`);
    });

    logger.info("Badge worker started successfully");

    return queues.badge;
  } catch (error) {
    logger.error("Failed to start badge worker:", error);
    throw error;
  }
};

export const stopBadgeWorker = async () => {
  if (!queues.badge) {
    logger.warn("Badge queue not initialized - nothing to stop");
    return;
  }

  try {
    logger.info("Stopping badge worker...");

    await queues.badge.close();

    logger.info("Badge worker stopped successfully");
  } catch (error) {
    logger.error("Failed to stop badge worker:", error);
    throw error;
  }
};

export const queueBadgeCheck = async (userId, options = {}) => {
  if (!queues.badge) {
    throw new Error("Badge queue not initialized");
  }

  return await queues.badge.add(
    "check-badges",
    { userId },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    },
  );
};

export const queueBadgeAward = async (
  userId,
  badgeId,
  metadata = {},
  options = {},
) => {
  if (!queues.badge) {
    throw new Error("Badge queue not initialized");
  }

  return await queues.badge.add(
    "award-badge",
    { userId, badgeId, metadata },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    },
  );
};

export const queueBulkBadgeCheck = async (userIds, options = {}) => {
  if (!queues.badge) {
    throw new Error("Badge queue not initialized");
  }

  return await queues.badge.add(
    "bulk-check-badges",
    { userIds },
    {
      attempts: 2,
      timeout: 300000,
      removeOnComplete: true,
      removeOnFail: false,
      ...options,
    },
  );
};

export default startBadgeWorker;
