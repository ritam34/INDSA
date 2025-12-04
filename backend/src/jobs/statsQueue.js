import { queues } from "../config/queue/queue.config.js";
import logger from "../utils/logger.js";

export const updateUserStats = async (userId) => {
  try {
    const job = await queues.stats.add(
      "update-user-stats",
      { userId },
      {
        attempts: 3,
        delay: 5000,
      },
    );

    logger.info("User stats update job added", { jobId: job.id, userId });
    return job;
  } catch (error) {
    logger.error("Failed to add user stats job:", error);
    throw error;
  }
};

export const updateProblemStats = async (problemId) => {
  try {
    const job = await queues.stats.add(
      "update-problem-stats",
      { problemId },
      {
        attempts: 3,
        delay: 5000,
      },
    );

    logger.info("Problem stats update job added", { jobId: job.id, problemId });
    return job;
  } catch (error) {
    logger.error("Failed to add problem stats job:", error);
    throw error;
  }
};

export const updateAllUsersStreaks = async () => {
  try {
    const job = await queues.stats.add(
      "update-all-streaks",
      {},
      {
        attempts: 3,
        repeat: {
          cron: "0 0 * * *",
        },
      },
    );

    logger.info("All users streak update job scheduled");
    return job;
  } catch (error) {
    logger.error("Failed to schedule streak update job:", error);
    throw error;
  }
};

export const calculateGlobalLeaderboard = async () => {
  try {
    const job = await queues.stats.add(
      "calculate-leaderboard",
      {},
      {
        attempts: 3,
        repeat: {
          cron: "0 2 * * 0",
        },
      },
    );

    logger.info("Leaderboard calculation job scheduled");
    return job;
  } catch (error) {
    logger.error("Failed to schedule leaderboard job:", error);
    throw error;
  }
};