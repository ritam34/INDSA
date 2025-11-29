import { prisma } from '../config/database.config.js';
import { calculateStreak } from '../utils/date.utils.js';
import logger from '../utils/logger.js';

export const updateUserStatsAfterSubmission = async (userId, problemId, isAccepted) => {
  try {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { difficulty: true }
    });

    if (!problem) {
      logger.error('Problem not found when updating stats', { problemId });
      return;
    }

    let userStats = await prisma.userStats.findUnique({
      where: { userId }
    });

    if (!userStats) {
      userStats = await prisma.userStats.create({
        data: {
          userId,
          totalSubmissions: 0,
          acceptedSubmissions: 0,
          easyProblemsSolved: 0,
          mediumProblemsSolved: 0,
          hardProblemsSolved: 0,
          totalSolved: 0,
          streak: 0,
          longestStreak: 0
        }
      });
    }

    const existingSolve = await prisma.problemSolved.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId
        }
      }
    });

    const updateData = {
      totalSubmissions: { increment: 1 }
    };

    if (isAccepted) {
      updateData.acceptedSubmissions = { increment: 1 };

      if (!existingSolve) {
        const difficultyField = `${problem.difficulty.toLowerCase()}ProblemsSolved`;

        updateData[difficultyField] = { increment: 1 };
        updateData.totalSolved = { increment: 1 };

        await prisma.problemSolved.create({
          data: { userId, problemId }
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastSolvedDate = userStats.lastSolvedDate
        ? new Date(userStats.lastSolvedDate)
        : null;

      if (lastSolvedDate) {
        lastSolvedDate.setHours(0, 0, 0, 0);
        const daysDiff =
          Math.floor((today - lastSolvedDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
          updateData.lastSolvedDate = new Date();
        } else if (daysDiff === 1) {
          const newStreak = userStats.streak + 1;
          updateData.streak = newStreak;
          updateData.longestStreak = Math.max(newStreak, userStats.longestStreak);
          updateData.lastSolvedDate = new Date();
        } else {
          updateData.streak = 1;
          updateData.lastSolvedDate = new Date();
        }
      } else {
        updateData.streak = 1;
        updateData.longestStreak = 1;
        updateData.lastSolvedDate = new Date();
      }
    }

    const updatedStats = await prisma.userStats.update({
      where: { userId },
      data: updateData
    });

    logger.info('User stats updated', {
      userId,
      problemId,
      difficulty: problem.difficulty,
      isAccepted,
      totalSolved: updatedStats.totalSolved,
      streak: updatedStats.streak
    });

    return updatedStats;

  } catch (error) {
    logger.error('Failed to update user stats', {
      error: error.message,
      userId,
      problemId
    });
    throw error;
  }
};

export const updateStreak = async (userId) => {
  try {
    const solvedProblems = await prisma.problemSolved.findMany({
      where: { 
        userId,
        deletedAt: null 
      },
      select: { firstSolvedAt: true },
      orderBy: { firstSolvedAt: 'desc' }
    });

    const dates = solvedProblems.map(p => p.firstSolvedAt);
    const currentStreak = calculateStreak(dates);
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
      select: { longestStreak: true }
    });

    const longestStreak = Math.max(currentStreak, userStats?.longestStreak || 0);

    await prisma.userStats.update({
      where: { userId },
      data: {
        streak: currentStreak,
        longestStreak,
        lastSolvedDate: new Date()
      }
    });

    logger.info('User streak updated', { userId, currentStreak, longestStreak });
  } catch (error) {
    logger.error('Failed to update user streak', { 
      error: error.message, 
      userId 
    });
  }
};

export const updateGlobalRanking = async () => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      include: {
        stats: true
      },
      orderBy: [
        { stats: { reputation: 'desc' } }
      ]
    });
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if (user.stats) {
        await prisma.userStats.update({
          where: { userId: user.id },
          data: { globalRanking: i + 1 }
        });
      }
    }

    logger.info('Global rankings updated', { totalUsers: users.length });
  } catch (error) {
    logger.error('Failed to update global rankings', { error: error.message });
  }
};

export const calculateReputation = async (userId) => {
  try {
    const stats = await prisma.userStats.findUnique({
      where: { userId }
    });

    if (!stats) return 0;

    const reputation = 
      (stats.easyProblemsSolved * 1) +
      (stats.mediumProblemsSolved * 3) +
      (stats.hardProblemsSolved * 5) +
      (stats.contestsParticipated * 10) +
      (stats.streak * 2);

    await prisma.userStats.update({
      where: { userId },
      data: { reputation }
    });

    return reputation;
  } catch (error) {
    logger.error('Failed to calculate reputation', { 
      error: error.message, 
      userId 
    });
    return 0;
  }
};

export const getLeaderboard = async (limit = 100, sortBy = 'reputation') => {
  try {
    const orderByMap = {
      reputation: { stats: { reputation: 'desc' } },
      problems_solved: { stats: { easyProblemsSolved: 'desc' } },
      contest_rating: { stats: { contestRating: 'desc' } },
      streak: { stats: { streak: 'desc' } }
    };

    const users = await prisma.user.findMany({
      where: { 
        deletedAt: null,
        stats: {
          isNot: null
        }
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        location: true,
        isPremium: true,
        stats: {
          select: {
            easyProblemsSolved: true,
            mediumProblemsSolved: true,
            hardProblemsSolved: true,
            reputation: true,
            contestRating: true,
            globalRanking: true,
            streak: true
          }
        }
      },
      orderBy: orderByMap[sortBy] || orderByMap.reputation,
      take: limit
    });
    return users.map((user, index) => ({
      ...user,
      rank: index + 1,
      totalProblemsSolved: user.stats 
        ? user.stats.easyProblemsSolved + user.stats.mediumProblemsSolved + user.stats.hardProblemsSolved
        : 0
    }));
  } catch (error) {
    logger.error('Failed to get leaderboard', { error: error.message });
    return [];
  }
};