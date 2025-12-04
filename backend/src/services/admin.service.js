import { prisma } from "../config/database.config.js";
import { ApiError } from "../utils/apiError.js";
import logger from "../utils/logger.js";

export const getDashboardStats = async () => {
  const [
    totalUsers,
    activeUsers,
    totalProblems,
    totalSubmissions,
    totalContests,
    recentSignups,
    pendingReports,
    systemHealth,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        lastActive: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    prisma.problem.count({
      where: { deletedAt: null },
    }),

    prisma.submission.count(),

    prisma.contest.count({
      where: { deletedAt: null },
    }),

    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    prisma.report
      .count({
        where: { status: "PENDING" },
      })
      .catch(() => 0),

    getSystemHealth(),
  ]);

  return {
    overview: {
      totalUsers,
      activeUsers,
      totalProblems,
      totalSubmissions,
      totalContests,
      recentSignups,
      pendingReports,
    },
    systemHealth,
  };
};

const getSystemHealth = async () => {
  const [avgResponseTime, errorRate, dbSize] = await Promise.all([
    Promise.resolve(145), // ms

    Promise.resolve(0.02), // 2%

    Promise.resolve(2.4), // GB
  ]);

  return {
    status: "healthy",
    avgResponseTime,
    errorRate: errorRate * 100,
    dbSize,
    uptime: process.uptime() / 3600,
  };
};

export const getUserAnalytics = async (period = "month") => {
  const now = new Date();
  let startDate;

  switch (period) {
    case "day":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0);
  }

  const [newUsers, activeUsers, usersByCountry, topContributors] =
    await Promise.all([
      prisma.user.groupBy({
        by: ["createdAt"],
        where: {
          createdAt: { gte: startDate },
        },
        _count: true,
      }),

      prisma.user.count({
        where: {
          lastActive: { gte: startDate },
        },
      }),

      prisma.user
        .groupBy({
          by: ["country"],
          _count: true,
          orderBy: {
            _count: {
              country: "desc",
            },
          },
          take: 10,
        })
        .catch(() => []),

      prisma.user.findMany({
        take: 10,
        orderBy: {
          problemsSolved: {
            _count: "desc",
          },
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          _count: {
            select: {
              problemsSolved: true,
              submissions: true,
            },
          },
        },
      }),
    ]);

  return {
    newUsers: newUsers.length,
    activeUsers,
    usersByCountry,
    topContributors: topContributors.map((user) => ({
      ...user,
      problemsSolved: user._count.problemsSolved,
      submissions: user._count.submissions,
    })),
  };
};

export const getProblemAnalytics = async () => {
  const [
    problemsByDifficulty,
    problemsByAcceptanceRate,
    mostAttempted,
    leastAttempted,
    recentlyAdded,
  ] = await Promise.all([
    prisma.problem.groupBy({
      by: ["difficulty"],
      where: { deletedAt: null },
      _count: true,
    }),

    prisma.problem.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        difficulty: true,
        acceptanceRate: true,
        totalSubmissions: true,
        totalAccepted: true,
      },
      orderBy: { acceptanceRate: "asc" },
      take: 10,
    }),

    prisma.problem.findMany({
      where: { deletedAt: null },
      orderBy: { totalSubmissions: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        totalSubmissions: true,
        totalAccepted: true,
        acceptanceRate: true,
      },
    }),

    prisma.problem.findMany({
      where: {
        deletedAt: null,
        totalSubmissions: { gt: 0 },
      },
      orderBy: { totalSubmissions: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        totalSubmissions: true,
      },
    }),

    prisma.problem.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    problemsByDifficulty,
    hardestProblems: problemsByAcceptanceRate,
    mostAttempted,
    leastAttempted,
    recentlyAdded,
  };
};

export const getSubmissionAnalytics = async (period = "month") => {
  const now = new Date();
  let startDate;

  switch (period) {
    case "day":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0);
  }

  const [
    submissionsByStatus,
    submissionsByLanguage,
    submissionsOverTime,
    avgExecutionTime,
  ] = await Promise.all([
    prisma.submission.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    }),

    prisma.submission.groupBy({
      by: ["language"],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: {
        _count: {
          language: "desc",
        },
      },
    }),

    prisma.submission.count({
      where: {
        createdAt: { gte: startDate },
      },
    }),

    prisma.submission.aggregate({
      where: {
        createdAt: { gte: startDate },
        status: "ACCEPTED",
      },
      _avg: {
        executionTime: true,
      },
    }),
  ]);

  return {
    submissionsByStatus,
    submissionsByLanguage,
    totalSubmissions: submissionsOverTime,
    avgExecutionTime: avgExecutionTime._avg.executionTime || 0,
  };
};

export const getAllUsers = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    role,
    isActive,
    search,
    sortBy = "createdAt",
    order = "desc",
  } = filters;

  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  const where = {};

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === "true";
  }

  if (search) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderByMap = {
    createdAt: { createdAt: order },
    username: { username: order },
    rating: { rating: order },
    problemsSolved: { problemsSolved: { _count: order } },
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: orderByMap[sortBy] || orderByMap.createdAt,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        rating: true,
        createdAt: true,
        lastActive: true,
        _count: {
          select: {
            problemsSolved: true,
            submissions: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map((user) => ({
      ...user,
      problemsSolved: user._count.problemsSolved,
      totalSubmissions: user._count.submissions,
    })),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    },
  };
};

export const updateUserRole = async (userId, newRole, adminId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.id === adminId) {
    throw new ApiError(400, "Cannot change your own role");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  logger.info("User role updated", { userId, newRole, adminId });

  return updated;
};

export const banUser = async (userId, banData, adminId) => {
  const { reason, duration, permanent = false } = banData;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.id === adminId) {
    throw new ApiError(400, "Cannot ban yourself");
  }

  if (user.role === "ADMIN") {
    throw new ApiError(400, "Cannot ban an admin");
  }

  let bannedUntil = null;
  if (!permanent && duration) {
    bannedUntil = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      bannedAt: new Date(),
      bannedUntil,
      banReason: reason,
    },
  });

  logger.warn("User banned", { userId, reason, permanent, duration, adminId });

  return updated;
};

export const unbanUser = async (userId, adminId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: true,
      bannedAt: null,
      bannedUntil: null,
      banReason: null,
    },
  });

  logger.info("User unbanned", { userId, adminId });

  return updated;
};

export const deleteUser = async (userId, adminId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.id === adminId) {
    throw new ApiError(400, "Cannot delete yourself");
  }

  if (user.role === "ADMIN") {
    throw new ApiError(400, "Cannot delete an admin");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  logger.warn("User deleted", { userId, adminId });

  return { message: "User deleted successfully" };
};

export const getPendingContent = async () => {
  const [
    pendingProblems,
    pendingDiscussions,
    pendingSolutions,
    flaggedContent,
  ] = await Promise.all([
    prisma.problem.findMany({
      where: {
        status: "DRAFT",
        deletedAt: null,
      },
      take: 20,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        createdAt: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.discussion
      .findMany({
        where: {
          isFlagged: true,
          deletedAt: null,
        },
        take: 20,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              username: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),

    prisma.solution
      .findMany({
        where: {
          status: "PENDING",
          deletedAt: null,
        },
        take: 20,
        select: {
          id: true,
          title: true,
          createdAt: true,
          user: {
            select: {
              username: true,
            },
          },
          problem: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),

    prisma.report
      .findMany({
        where: {
          status: "PENDING",
        },
        take: 20,
        include: {
          reporter: {
            select: {
              username: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
  ]);

  return {
    pendingProblems,
    pendingDiscussions,
    pendingSolutions,
    flaggedContent,
  };
};

export const moderateContent = async (
  contentType,
  contentId,
  action,
  adminId,
) => {
  let result;

  switch (contentType) {
    case "problem":
      result = await moderateProblem(contentId, action, adminId);
      break;
    case "discussion":
      result = await moderateDiscussion(contentId, action, adminId);
      break;
    case "solution":
      result = await moderateSolution(contentId, action, adminId);
      break;
    default:
      throw new ApiError(400, "Invalid content type");
  }

  return result;
};

const moderateProblem = async (problemId, action, adminId) => {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
  });

  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }

  let updateData = {};

  switch (action) {
    case "APPROVE":
      updateData = { status: "PUBLISHED" };
      break;
    case "REJECT":
      updateData = { status: "ARCHIVED" };
      break;
    case "DELETE":
      updateData = { deletedAt: new Date() };
      break;
    default:
      throw new ApiError(400, "Invalid action");
  }

  const updated = await prisma.problem.update({
    where: { id: problemId },
    data: updateData,
  });

  logger.info("Problem moderated", { problemId, action, adminId });

  return updated;
};

const moderateDiscussion = async (discussionId, action, adminId) => {
  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId },
  });

  if (!discussion) {
    throw new ApiError(404, "Discussion not found");
  }

  let updateData = {};

  switch (action) {
    case "APPROVE":
      updateData = { isFlagged: false };
      break;
    case "DELETE":
      updateData = { deletedAt: new Date() };
      break;
    default:
      throw new ApiError(400, "Invalid action");
  }

  const updated = await prisma.discussion.update({
    where: { id: discussionId },
    data: updateData,
  });

  logger.info("Discussion moderated", { discussionId, action, adminId });

  return updated;
};

const moderateSolution = async (solutionId, action, adminId) => {
  const solution = await prisma.solution.findUnique({
    where: { id: solutionId },
  });

  if (!solution) {
    throw new ApiError(404, "Solution not found");
  }

  let updateData = {};

  switch (action) {
    case "APPROVE":
      updateData = { status: "APPROVED" };
      break;
    case "REJECT":
      updateData = { status: "REJECTED" };
      break;
    case "DELETE":
      updateData = { deletedAt: new Date() };
      break;
    default:
      throw new ApiError(400, "Invalid action");
  }

  const updated = await prisma.solution.update({
    where: { id: solutionId },
    data: updateData,
  });

  logger.info("Solution moderated", { solutionId, action, adminId });

  return updated;
};

export const getSystemLogs = async (filters = {}) => {
  const { level = "error", limit = 100 } = filters;
  return {
    logs: [],
    message:
      "System logs would be fetched from logging service (Winston, etc.)",
  };
};
