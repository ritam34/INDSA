import { prisma } from "../config/database.config.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword, comparePassword } from "../utils/password.utils.js";
import {
  sanitizePaginationParams,
  createPaginatedResponse,
} from "../utils/pagination.utils.js";
import logger from "../utils/logger.js";

export const getUserProfile = async (username, currentUserId = null) => {
  const user = await prisma.user.findUnique({
    where: {
      username,
      deletedAt: null,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: currentUserId ? true : false,
      avatar: true,
      bio: true,
      location: true,
      website: true,
      github: true,
      linkedin: true,
      role: true,
      isPremium: true,
      createdAt: true,
      stats: {
        select: {
          easyProblemsSolved: true,
          mediumProblemsSolved: true,
          hardProblemsSolved: true,
          totalSubmissions: true,
          acceptedSubmissions: true,
          streak: true,
          longestStreak: true,
          globalRanking: true,
          reputation: true,
          contestRating: true,
          contestsParticipated: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const totalSolved = user.stats
    ? user.stats.easyProblemsSolved +
      user.stats.mediumProblemsSolved +
      user.stats.hardProblemsSolved
    : 0;

  return {
    ...user,
    totalProblemsSolved: totalSolved,
  };
};

export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      location: true,
      website: true,
      github: true,
      linkedin: true,
      role: true,
      isEmailVerified: true,
      isPremium: true,
      premiumExpiresAt: true,
      createdAt: true,
      stats: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

export const updateProfile = async (userId, updateData) => {
  const { username, ...otherData } = updateData;

  if (username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        id: { not: userId },
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ApiError(409, "Username already taken");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username && { username }),
      ...otherData,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      location: true,
      website: true,
      github: true,
      linkedin: true,
      role: true,
      isPremium: true,
      updatedAt: true,
    },
  });

  logger.info("User profile updated", {
    userId,
    fields: Object.keys(updateData),
  });

  return updatedUser;
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      password: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }
  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  logger.info("User password changed", { userId });

  return { message: "Password changed successfully" };
};

export const deleteAccount = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: new Date(),
      refreshToken: null,
      emailVerificationToken: null,
      forgotPasswordToken: null,
    },
  });

  logger.info("User account deleted (soft delete)", { userId });

  return { message: "Account deleted successfully" };
};

export const getUserStats = async (username) => {
  const user = await prisma.user.findUnique({
    where: {
      username,
      deletedAt: null,
    },
    select: {
      id: true,
      username: true,
      stats: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const recentSubmissions = await prisma.submission.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      language: true,
      createdAt: true,
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const solvedProblems = await prisma.problemSolved.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
    },
    include: {
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
        },
      },
    },
    orderBy: { firstSolvedAt: "desc" },
  });

  const solvedByDifficulty = {
    EASY: solvedProblems.filter((p) => p.problem.difficulty === "EASY"),
    MEDIUM: solvedProblems.filter((p) => p.problem.difficulty === "MEDIUM"),
    HARD: solvedProblems.filter((p) => p.problem.difficulty === "HARD"),
  };

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const submissions = await prisma.submission.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: oneYearAgo },
      deletedAt: null,
    },
    select: {
      createdAt: true,
    },
  });

  const heatmapData = {};
  submissions.forEach((sub) => {
    const date = sub.createdAt.toISOString().split("T")[0];
    heatmapData[date] = (heatmapData[date] || 0) + 1;
  });

  return {
    stats: user.stats,
    recentSubmissions,
    solvedByDifficulty: {
      easy: solvedByDifficulty.EASY.length,
      medium: solvedByDifficulty.MEDIUM.length,
      hard: solvedByDifficulty.HARD.length,
      total: solvedProblems.length,
    },
    heatmapData,
  };
};

export const getUserSubmissions = async (username, page, limit) => {
  const user = await prisma.user.findUnique({
    where: {
      username,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        language: true,
        time: true,
        memory: true,
        createdAt: true,
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageLimit,
    }),
    prisma.submission.count({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    }),
  ]);

  return createPaginatedResponse(submissions, page, limit, total);
};

export const getUserSolvedProblems = async (
  username,
  page,
  limit,
  difficulty = null,
) => {
  const user = await prisma.user.findUnique({
    where: {
      username,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const where = {
    userId: user.id,
    deletedAt: null,
    ...(difficulty && {
      problem: {
        difficulty: difficulty.toUpperCase(),
      },
    }),
  };

  const [solvedProblems, total] = await Promise.all([
    prisma.problemSolved.findMany({
      where,
      select: {
        id: true,
        firstSolvedAt: true,
        totalAttempts: true,
        bestTime: true,
        bestMemory: true,
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
            tags: true,
            acceptanceRate: true,
          },
        },
      },
      orderBy: { firstSolvedAt: "desc" },
      skip,
      take: pageLimit,
    }),
    prisma.problemSolved.count({ where }),
  ]);

  return createPaginatedResponse(solvedProblems, page, limit, total);
};

export const getAllUsers = async (filters) => {
  const { page, limit, search, sortBy, order } = filters;
  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const where = {
    deletedAt: null,
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const orderByMap = {
    reputation: { stats: { reputation: order } },
    problems_solved: { stats: { easyProblemsSolved: order } },
    created_at: { createdAt: order },
    contest_rating: { stats: { contestRating: order } },
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        username: true,
        avatar: true,
        location: true,
        role: true,
        isPremium: true,
        createdAt: true,
        stats: {
          select: {
            easyProblemsSolved: true,
            mediumProblemsSolved: true,
            hardProblemsSolved: true,
            reputation: true,
            contestRating: true,
            globalRanking: true,
          },
        },
      },
      orderBy: orderByMap[sortBy] || { createdAt: "desc" },
      skip,
      take: pageLimit,
    }),
    prisma.user.count({ where }),
  ]);

  const usersWithTotal = users.map((user) => ({
    ...user,
    totalProblemsSolved: user.stats
      ? user.stats.easyProblemsSolved +
        user.stats.mediumProblemsSolved +
        user.stats.hardProblemsSolved
      : 0,
  }));

  return createPaginatedResponse(usersWithTotal, page, limit, total);
};

export const getUserBadges = async (username) => {
  const user = await prisma.user.findUnique({
    where: {
      username,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const badges = await prisma.userBadge.findMany({
    where: { userId: user.id },
    include: {
      badge: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          type: true,
          rarity: true,
          points: true,
        },
      },
    },
    orderBy: { earnedAt: "desc" },
  });

  return badges.map((ub) => ({
    ...ub.badge,
    earnedAt: ub.earnedAt,
  }));
};
