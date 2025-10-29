import { prisma } from '../config/database.config.js';
import { calculateStreak } from '../utils/date.utils.js';
import logger from '../utils/logger.js';

export const updateUserStatsAfterSubmission = async (userId, problemId, isAccepted) => {
  try {
    const userStats = await prisma.userStats.findUnique({
      where: { userId }
    });

    if (!userStats) {
      logger.error('User stats not found', { userId });
      return;
    }
    await prisma.userStats.update({
      where: { userId },
      data: {
        totalSubmissions: { increment: 1 },
        ...(isAccepted && { acceptedSubmissions: { increment: 1 } })
      }
    });
    if (isAccepted) {
      const existingSolve = await prisma.problemSolved.findUnique({
        where: {
          userId_problemId: {
            userId,
            problemId
          }
        }
      });

      if (!existingSolve) {
        const problem = await prisma.problem.findUnique({
          where: { id: problemId },
          select: { difficulty: true }
        });
        const difficultyField = `${problem.difficulty.toLowerCase()}ProblemsSolved`;
        
        await prisma.userStats.update({
          where: { userId },
          data: {
            [difficultyField]: { increment: 1 }
          }
        });

        await updateStreak(userId);

        updateGlobalRanking().catch(err => {
          logger.error('Failed to update global ranking', { error: err.message });
        });
      }
    }

    logger.info('User stats updated', { userId, problemId, isAccepted });
  } catch (error) {
    logger.error('Failed to update user stats', { 
      error: error.message, 
      userId, 
      problemId 
    });
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