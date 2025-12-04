import { prisma } from "../config/database.config.js";
import { ApiError } from "../utils/apiError.js";

class BadgeService {
  async getAllBadges(filters = {}) {
    const { category, rarity, isActive = true } = filters;

    const where = { isActive };

    if (category) where.category = category;
    if (rarity) where.rarity = rarity;

    const badges = await prisma.badge.findMany({
      where,
      orderBy: [{ rarity: "desc" }, { category: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { userBadges: true },
        },
      },
    });

    return badges.map((badge) => ({
      ...badge,
      earnedByCount: badge._count.userBadges,
    }));
  }

  async getBadgeById(badgeId) {
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        _count: {
          select: { userBadges: true },
        },
      },
    });

    if (!badge) {
      throw new ApiError(404, "Badge not found");
    }

    return {
      ...badge,
      earnedByCount: badge._count.userBadges,
    };
  }

  async getUserBadges(userId, options = {}) {
    const { category, rarity, includeProgress = false } = options;

    const where = {
      userId,
      ...(category && { badge: { category } }),
      ...(rarity && { badge: { rarity } }),
    };

    const userBadges = await prisma.userBadge.findMany({
      where,
      include: {
        badge: true,
      },
      orderBy: [{ earnedAt: "desc" }],
    });

    if (includeProgress) {
      const earnedBadgeIds = userBadges.map((ub) => ub.badgeId);

      const unearnedBadges = await prisma.badge.findMany({
        where: {
          id: { notIn: earnedBadgeIds },
          isActive: true,
          ...(category && { category }),
          ...(rarity && { rarity }),
        },
      });

      const userStats = await prisma.userStats.findUnique({
        where: { userId },
      });

      const badgesWithProgress = await Promise.all(
        unearnedBadges.map(async (badge) => {
          const progress = await this.calculateBadgeProgress(
            userId,
            badge,
            userStats,
          );
          return {
            ...badge,
            earned: false,
            progress,
          };
        }),
      );

      return {
        earned: userBadges.map((ub) => ({
          ...ub,
          earned: true,
          progress: 100,
        })),
        unearned: badgesWithProgress,
      };
    }

    return userBadges;
  }

  async calculateBadgeProgress(userId, badge, userStats = null) {
    if (!userStats) {
      userStats = await prisma.userStats.findUnique({
        where: { userId },
      });
    }

    const criteria = badge.criteria;
    let current = 0;
    let required = 0;

    switch (badge.category) {
      case "PROBLEM_SOLVING":
        if (criteria.totalProblems) {
          current = userStats?.totalSolved || 0;
          required = criteria.totalProblems;
        } else if (criteria.easyProblems) {
          current = userStats?.easyProblemsSolved || 0;
          required = criteria.easyProblems;
        } else if (criteria.mediumProblems) {
          current = userStats?.mediumProblemsSolved || 0;
          required = criteria.mediumProblems;
        } else if (criteria.hardProblems) {
          current = userStats?.hardProblemsSolved || 0;
          required = criteria.hardProblems;
        }
        break;

      case "STREAK":
        if (criteria.streakDays) {
          current = userStats?.streak || 0;
          required = criteria.streakDays;
        }
        break;

      case "CONTEST":
        if (criteria.contestsParticipated) {
          const contestCount = await prisma.contestParticipant.count({
            where: { userId },
          });
          current = contestCount;
          required = criteria.contestsParticipated;
        } else if (criteria.contestWins) {
          const winsCount = await prisma.contestParticipant.count({
            where: { userId, rank: 1 },
          });
          current = winsCount;
          required = criteria.contestWins;
        }
        break;

      case "COMMUNITY":
        if (criteria.discussionsCreated) {
          const discussionCount = await prisma.discussion.count({
            where: { userId },
          });
          current = discussionCount;
          required = criteria.discussionsCreated;
        } else if (criteria.solutionsShared) {
          const solutionCount = await prisma.solution.count({
            where: { userId, isOfficial: false },
          });
          current = solutionCount;
          required = criteria.solutionsShared;
        }
        break;

      default:
        return { current: 0, required: 1, percentage: 0 };
    }

    const percentage =
      required > 0 ? Math.min((current / required) * 100, 100) : 0;

    return {
      current,
      required,
      percentage: Math.round(percentage),
    };
  }

  async awardBadge(userId, badgeId, metadata = {}) {
    const existing = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: { userId, badgeId },
      },
    });

    if (existing) {
      return existing;
    }

    const userBadge = await prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        metadata,
      },
      include: {
        badge: true,
      },
    });

    try {
      const notificationService = (await import("./notification.service.js"))
        .default;
      await notificationService.createBadgeNotification(
        userId,
        userBadge.badge,
      );
    } catch (error) {
      console.error("Failed to create badge notification:", error);
    }

    return userBadge;
  }

  async checkAndAwardBadges(userId) {
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) return [];

    const earnedBadgeIds = await prisma.userBadge
      .findMany({
        where: { userId },
        select: { badgeId: true },
      })
      .then((badges) => badges.map((b) => b.badgeId));

    const availableBadges = await prisma.badge.findMany({
      where: {
        id: { notIn: earnedBadgeIds },
        isActive: true,
      },
    });

    const newlyEarnedBadges = [];

    for (const badge of availableBadges) {
      const isEligible = await this.checkBadgeEligibility(
        userId,
        badge,
        userStats,
      );

      if (isEligible) {
        const awarded = await this.awardBadge(userId, badge.id);
        newlyEarnedBadges.push(awarded);
      }
    }

    return newlyEarnedBadges;
  }

  async checkBadgeEligibility(userId, badge, userStats = null) {
    if (!userStats) {
      userStats = await prisma.userStats.findUnique({
        where: { userId },
      });
    }

    const criteria = badge.criteria;

    switch (badge.category) {
      case "PROBLEM_SOLVING":
        return this.checkProblemSolvingCriteria(userStats, criteria);

      case "STREAK":
        return this.checkStreakCriteria(userStats, criteria);

      case "CONTEST":
        return await this.checkContestCriteria(userId, criteria);

      case "COMMUNITY":
        return await this.checkCommunityCriteria(userId, criteria);

      case "MILESTONE":
        return this.checkMilestoneCriteria(userStats, criteria);

      default:
        return false;
    }
  }

  checkProblemSolvingCriteria(userStats, criteria) {
    if (
      criteria.totalProblems &&
      userStats.totalSolved < criteria.totalProblems
    ) {
      return false;
    }
    if (
      criteria.easyProblems &&
      userStats.easyProblemsSolved < criteria.easyProblems
    ) {
      return false;
    }
    if (
      criteria.mediumProblems &&
      userStats.mediumProblemsSolved < criteria.mediumProblems
    ) {
      return false;
    }
    if (
      criteria.hardProblems &&
      userStats.hardProblemsSolved < criteria.hardProblems
    ) {
      return false;
    }
    return true;
  }

  checkStreakCriteria(userStats, criteria) {
    if (criteria.streakDays && userStats.streak < criteria.streakDays) {
      return false;
    }
    if (criteria.maxStreak && userStats.longestStreak < criteria.maxStreak) {
      return false;
    }
    return true;
  }

  async checkContestCriteria(userId, criteria) {
    if (criteria.contestsParticipated) {
      const contestCount = await prisma.contestParticipant.count({
        where: { userId },
      });
      if (contestCount < criteria.contestsParticipated) return false;
    }

    if (criteria.contestWins) {
      const winsCount = await prisma.contestParticipant.count({
        where: { userId, rank: 1 },
      });
      if (winsCount < criteria.contestWins) return false;
    }

    if (criteria.topRankings) {
      const topRankings = await prisma.contestParticipant.count({
        where: {
          userId,
          rank: { lte: 10 },
        },
      });
      if (topRankings < criteria.topRankings) return false;
    }

    return true;
  }

  async checkCommunityCriteria(userId, criteria) {
    if (criteria.discussionsCreated) {
      const discussionCount = await prisma.discussion.count({
        where: { userId },
      });
      if (discussionCount < criteria.discussionsCreated) return false;
    }

    if (criteria.solutionsShared) {
      const solutionCount = await prisma.solution.count({
        where: { userId, isOfficial: false },
      });
      if (solutionCount < criteria.solutionsShared) return false;
    }

    if (criteria.helpfulVotes) {
      const totalUpvotes = await prisma.discussion.aggregate({
        where: { userId },
        _sum: { upvotes: true },
      });
      if ((totalUpvotes._sum.upvotes || 0) < criteria.helpfulVotes)
        return false;
    }

    return true;
  }

  checkMilestoneCriteria(userStats, criteria) {
    if (criteria.customCheck) {
      return false;
    }
    return true;
  }

  async createBadge(badgeData) {
    const badge = await prisma.badge.create({
      data: {
        name: badgeData.name,
        slug:
          badgeData.slug || badgeData.name.toLowerCase().replace(/\s+/g, "-"),
        description: badgeData.description,
        icon: badgeData.icon,
        category: badgeData.category,
        rarity: badgeData.rarity,
        criteria: badgeData.criteria || {},
        points: badgeData.points || 0,
        isActive: badgeData.isActive ?? true,
      },
    });

    return badge;
  }

  async updateBadge(badgeId, updateData) {
    const badge = await prisma.badge.update({
      where: { id: badgeId },
      data: updateData,
    });

    return badge;
  }

  async deleteBadge(badgeId) {
    await prisma.badge.update({
      where: { id: badgeId },
      data: { isActive: false },
    });

    return { message: "Badge deactivated successfully" };
  }

  async getBadgeLeaderboard(limit = 50) {
    const topUsers = await prisma.user.findMany({
      take: limit,
      orderBy: {
        userBadges: {
          _count: "desc",
        },
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        _count: {
          select: { userBadges: true },
        },
        userBadges: {
          include: {
            badge: true,
          },
          orderBy: {
            badge: {
              rarity: "desc",
            },
          },
        },
      },
    });

    return topUsers.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatar,
      totalBadges: user._count.userBadges,
      badges: user.userBadges,
    }));
  }

  async getRarityStatistics() {
    const stats = await prisma.badge.groupBy({
      by: ["rarity"],
      where: { isActive: true },
      _count: {
        _all: true,
      },
    });

    const rarityStats = await Promise.all(
      stats.map(async (stat) => {
        const earnedCount = await prisma.userBadge.count({
          where: {
            badge: {
              rarity: stat.rarity,
            },
          },
        });

        return {
          rarity: stat.rarity,
          totalBadges: stat._count._all,
          totalEarned: earnedCount,
        };
      }),
    );

    return rarityStats;
  }
}

export default new BadgeService();