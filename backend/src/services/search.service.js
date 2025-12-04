import { prisma } from '../config/database.config.js';
import { ApiError } from '../utils/apiError.js';
import logger from '../utils/logger.js';

/**
 * Calculate Elo rating change
 * @param {number} rating - Current rating
 * @param {number} expectedRank - Expected rank based on rating
 * @param {number} actualRank - Actual rank achieved
 * @param {number} participantCount - Total participants
 * @returns {number} Rating change (delta)
 */
const calculateEloChange = (rating, expectedRank, actualRank, participantCount) => {
  const K = 32;
  
  const expected = (participantCount - expectedRank + 1) / participantCount;
  
  const actual = (participantCount - actualRank + 1) / participantCount;
 
  const delta = Math.round(K * (actual - expected));
  
  return delta;
};

/**
 * Calculate expected rank based on rating
 * @param {number} userRating - User's current rating
 * @param {Array} allRatings - Array of all participants' ratings
 * @returns {number} Expected rank
 */
const calculateExpectedRank = (userRating, allRatings) => {
  let betterCount = 0;
  
  for (const rating of allRatings) {
    if (rating > userRating) {
      betterCount++;
    } else if (rating === userRating) {
      betterCount += 0.5;
    }
  }
  
  return betterCount + 1;
};

/**
 * Get rank color based on rating
 * @param {number} rating - User's rating
 * @returns {string} Rank color/title
 */
export const getRankColor = (rating) => {
  if (rating >= 2400) return 'LEGENDARY_GRANDMASTER';
  if (rating >= 2200) return 'GRANDMASTER';
  if (rating >= 2000) return 'MASTER';
  if (rating >= 1800) return 'CANDIDATE_MASTER';
  if (rating >= 1600) return 'EXPERT';
  if (rating >= 1400) return 'SPECIALIST';
  if (rating >= 1200) return 'PUPIL';
  return 'NEWBIE';
};

/**
 * Calculate ratings for all contest participants
 * @param {string} contestSlug - Contest slug
 */
export const calculateContestRatings = async (contestSlug) => {
  try {
    const contest = await prisma.contest.findUnique({
      where: { slug: contestSlug },
      include: {
        participants: {
          where: { hasParticipated: true },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                rating: true
              }
            }
          },
          orderBy: {
            rank: 'asc'
          }
        }
      }
    });

    if (!contest) {
      throw new ApiError(404, 'Contest not found');
    }

    if (contest.status !== 'COMPLETED') {
      throw new ApiError(400, 'Contest must be completed before calculating ratings');
    }

    if (contest.ratingsCalculated) {
      throw new ApiError(400, 'Ratings have already been calculated for this contest');
    }

    const participants = contest.participants;
    const participantCount = participants.length;

    if (participantCount === 0) {
      logger.info('No participants to calculate ratings for');
      return;
    }
    const allRatings = participants.map(p => p.user.rating || 1200);

    const ratingUpdates = [];

    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      const currentRating = participant.user.rating || 1200;
      const actualRank = participant.rank;
      
      const expectedRank = calculateExpectedRank(currentRating, allRatings);
      
      const ratingDelta = calculateEloChange(
        currentRating,
        expectedRank,
        actualRank,
        participantCount
      );
      
      const newRating = Math.max(0, currentRating + ratingDelta); // Rating can't go below 0
      const rankColor = getRankColor(newRating);

      ratingUpdates.push({
        userId: participant.userId,
        contestId: contest.id,
        oldRating: currentRating,
        newRating: newRating,
        ratingChange: ratingDelta,
        rank: actualRank,
        problemsSolved: participant.problemsSolved,
        totalPenalty: participant.totalPenalty,
        rankColor
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.ratingHistory.createMany({
        data: ratingUpdates
      });

      for (const update of ratingUpdates) {
        await tx.user.update({
          where: { id: update.userId },
          data: {
            rating: update.newRating,
            maxRating: {
              set: Math.max(update.newRating, update.oldRating)
            },
            contestsParticipated: {
              increment: 1
            }
          }
        });
      }

      await tx.contest.update({
        where: { id: contest.id },
        data: { ratingsCalculated: true }
      });
    });

    logger.info(`Ratings calculated for contest: ${contestSlug}`, {
      participantCount,
      avgRatingChange: ratingUpdates.reduce((sum, u) => sum + u.ratingChange, 0) / participantCount
    });

    return ratingUpdates;
  } catch (error) {
    logger.error('Error calculating contest ratings:', error);
    throw error;
  }
};

/**
 * Get user's rating history
 * @param {string} userId - User ID
 * @param {number} limit - Number of records to fetch
 */
export const getUserRatingHistory = async (userId, limit = 50) => {
  const history = await prisma.ratingHistory.findMany({
    where: { userId },
    include: {
      contest: {
        select: {
          id: true,
          title: true,
          slug: true,
          startTime: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  });

  return history;
};

/**
 * Get rating distribution for a contest
 * @param {string} contestId - Contest ID
 */
export const getContestRatingDistribution = async (contestId) => {
  const ratings = await prisma.ratingHistory.findMany({
    where: { contestId },
    select: {
      rankColor: true,
      ratingChange: true
    }
  });

  const distribution = ratings.reduce((acc, rating) => {
    acc[rating.rankColor] = (acc[rating.rankColor] || 0) + 1;
    return acc;
  }, {});

  return {
    distribution,
    totalParticipants: ratings.length,
    averageRatingChange: ratings.reduce((sum, r) => sum + r.ratingChange, 0) / ratings.length
  };
};

/**
 * Recalculate ratings (admin function, use with caution)
 * @param {string} contestSlug - Contest slug
 */
export const recalculateRatings = async (contestSlug) => {
  const contest = await prisma.contest.findUnique({
    where: { slug: contestSlug },
    include: {
      ratingHistory: {
        include: {
          user: true
        }
      }
    }
  });

  if (!contest) {
    throw new ApiError(404, 'Contest not found');
  }
  await prisma.$transaction(async (tx) => {
    for (const history of contest.ratingHistory) {
      await tx.user.update({
        where: { id: history.userId },
        data: {
          rating: history.oldRating,
          contestsParticipated: {
            decrement: 1
          }
        }
      });
    }
    await tx.ratingHistory.deleteMany({
      where: { contestId: contest.id }
    });

    await tx.contest.update({
      where: { id: contest.id },
      data: { ratingsCalculated: false }
    });
  });

  return await calculateContestRatings(contestSlug);
};