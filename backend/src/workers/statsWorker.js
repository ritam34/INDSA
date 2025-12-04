import { queues } from "../config/queue/queue.config.js";
import { prisma } from "../config/database.config.js";
import logger from "../utils/logger.js";

const processUserStatsUpdate = async (job) => {
  const { userId } = job.data;

  try {
    logger.info(`Updating stats for user ${userId}`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        problemsSolved: {
          include: {
            problem: {
              select: { difficulty: true },
            },
          },
        },
        submissions: {
          where: { status: "ACCEPTED" },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const totalSolved = user.problemsSolved.length;
    const easySolved = user.problemsSolved.filter(
      (ps) => ps.problem.difficulty === "EASY",
    ).length;
    const mediumSolved = user.problemsSolved.filter(
      (ps) => ps.problem.difficulty === "MEDIUM",
    ).length;
    const hardSolved = user.problemsSolved.filter(
      (ps) => ps.problem.difficulty === "HARD",
    ).length;

    await prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        totalSubmissions: user.submissions.length,
      },
      update: {
        totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        totalSubmissions: user.submissions.length,
      },
    });

    logger.info(`User stats updated for ${userId}`);

    return { userId, totalSolved };
  } catch (error) {
    logger.error(`Failed to update user stats for ${userId}:`, error);
    throw error;
  }
};

const processProblemStatsUpdate = async (job) => {
  const { problemId } = job.data;

  try {
    logger.info(`Updating stats for problem ${problemId}`);

    const [totalSubmissions, totalAccepted] = await Promise.all([
      prisma.submission.count({
        where: { problemId },
      }),
      prisma.submission.count({
        where: {
          problemId,
          status: "ACCEPTED",
        },
      }),
    ]);

    const acceptanceRate =
      totalSubmissions > 0 ? (totalAccepted / totalSubmissions) * 100 : 0;

    await prisma.problem.update({
      where: { id: problemId },
      data: {
        totalSubmissions,
        totalAccepted,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
      },
    });

    logger.info(`Problem stats updated for ${problemId}`);

    return { problemId, totalSubmissions, totalAccepted, acceptanceRate };
  } catch (error) {
    logger.error(`Failed to update problem stats for ${problemId}:`, error);
    throw error;
  }
};

const processAllStreaksUpdate = async (job) => {
  try {
    logger.info("Updating streaks for all users");

    const users = await prisma.user.findMany({
      select: { id: true, lastActive: true, currentStreak: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const user of users) {
      const lastActiveDate = new Date(user.lastActive);
      lastActiveDate.setHours(0, 0, 0, 0);

      let newStreak = user.currentStreak;

      if (lastActiveDate.getTime() === yesterday.getTime()) {
        continue;
      } else if (lastActiveDate < yesterday) {
        newStreak = 0;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { currentStreak: newStreak },
      });
    }

    logger.info("Streaks updated for all users");

    return { message: "Streaks updated successfully" };
  } catch (error) {
    logger.error("Failed to update streaks:", error);
    throw error;
  }
};

export const startStatsWorker = () => {
  if (!queues.stats) {
    logger.warn("Stats queue not initialized - stats worker disabled");
    return;
  }

  queues.stats.process("update-user-stats", 5, processUserStatsUpdate);
  queues.stats.process("update-problem-stats", 5, processProblemStatsUpdate);
  queues.stats.process("update-all-streaks", 1, processAllStreaksUpdate);

  logger.info("Stats worker started");
};

export default startStatsWorker;
