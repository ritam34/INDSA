import { prisma } from "../config/database.config.js";
import { ApiError } from "../utils/apiError.js";
import { generateSlug, generateSlugWithRandom } from "../utils/slug.utils.js";
import {
  sanitizePaginationParams,
  createPaginatedResponse,
} from "../utils/pagination.utils.js";
import logger from "../utils/logger.js";
import { sendContestReminderEmail } from "../jobs/emailQueue.js";

export const createContest = async (contestData, userId) => {
  const {
    title,
    description,
    startTime,
    duration,
    isPublic,
    isRated,
    problems,
  } = contestData;

  let slug = generateSlug(title);
  const existingContest = await prisma.contest.findUnique({
    where: { slug },
  });

  if (existingContest) {
    slug = generateSlugWithRandom(title);
  }

  const endTime = new Date(new Date(startTime).getTime() + duration * 60000);

  const problemIds = problems.map((p) => p.problemId);
  const existingProblems = await prisma.problem.findMany({
    where: {
      id: { in: problemIds },
      deletedAt: null,
    },
  });

  if (existingProblems.length !== problemIds.length) {
    throw new ApiError(400, "One or more problems not found");
  }

  const contest = await prisma.contest.create({
    data: {
      title,
      slug,
      description: description || null,
      startTime: new Date(startTime),
      endTime,
      duration,
      isPublic,
      isRated,
      createdBy: userId,
      problems: {
        create: problems.map((p) => ({
          problemId: p.problemId,
          points: p.points || 500,
          order: p.order,
        })),
      },
    },
    include: {
      problems: {
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true,
              difficulty: true,
              tags: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
      creator: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  logger.info("Contest created", { contestId: contest.id, slug, userId });

  return contest;
};

export const getAllContests = async (filters) => {
  const { page, limit, status, isPublic } = filters;
  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const now = new Date();
  let whereCondition = {
    deletedAt: null,
    ...(isPublic !== undefined && { isPublic }),
  };

  if (status === "upcoming") {
    whereCondition.startTime = { gt: now };
  } else if (status === "ongoing") {
    whereCondition.startTime = { lte: now };
    whereCondition.endTime = { gt: now };
  } else if (status === "past") {
    whereCondition.endTime = { lt: now };
  }

  const [contests, total] = await Promise.all([
    prisma.contest.findMany({
      where: whereCondition,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        startTime: true,
        endTime: true,
        duration: true,
        isPublic: true,
        isRated: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            participants: true,
            problems: true,
          },
        },
      },
      orderBy: { startTime: status === "past" ? "desc" : "asc" },
      skip,
      take: pageLimit,
    }),
    prisma.contest.count({ where: whereCondition }),
  ]);

  const contestsWithStatus = contests.map((contest) => ({
    ...contest,
    status: getContestStatus(contest.startTime, contest.endTime),
    participantCount: contest._count.participants,
    problemCount: contest._count.problems,
  }));

  return createPaginatedResponse(contestsWithStatus, page, limit, total);
};

export const getContestBySlug = async (slug, userId = null) => {
  const contest = await prisma.contest.findUnique({
    where: {
      slug,
      deletedAt: null,
    },
    include: {
      problems: {
        include: {
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
        orderBy: { order: "asc" },
      },
      creator: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true,
        },
      },
      _count: {
        select: {
          participants: true,
          submissions: true,
        },
      },
    },
  });

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  let isRegistered = false;
  if (userId) {
    const registration = await prisma.contestParticipant.findUnique({
      where: {
        contestId_userId: {
          contestId: contest.id,
          userId,
        },
      },
    });
    isRegistered = !!registration;
  }

  return {
    ...contest,
    status: getContestStatus(contest.startTime, contest.endTime),
    participantCount: contest._count.participants,
    submissionCount: contest._count.submissions,
    isRegistered,
  };
};

export const updateContest = async (contestId, updateData, userId) => {
  const contest = await prisma.contest.findUnique({
    where: {
      id: contestId,
      deletedAt: null,
    },
  });

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  if (contest.createdBy !== userId) {
    throw new ApiError(
      403,
      "You do not have permission to update this contest",
    );
  }

  if (new Date() >= contest.startTime) {
    throw new ApiError(400, "Cannot update contest that has already started");
  }

  if (updateData.startTime) {
    const duration = updateData.duration || contest.duration;
    updateData.endTime = new Date(
      new Date(updateData.startTime).getTime() + duration * 60000,
    );
  } else if (updateData.duration) {
    updateData.endTime = new Date(
      new Date(contest.startTime).getTime() + updateData.duration * 60000,
    );
  }

  const updatedContest = await prisma.contest.update({
    where: { id: contestId },
    data: updateData,
    include: {
      problems: {
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
      },
    },
  });

  logger.info("Contest updated", { contestId, userId });

  return updatedContest;
};

export const deleteContest = async (contestId, userId, isAdmin = false) => {
  const contest = await prisma.contest.findUnique({
    where: {
      id: contestId,
      deletedAt: null,
    },
  });

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  if (contest.createdBy !== userId && !isAdmin) {
    throw new ApiError(
      403,
      "You do not have permission to delete this contest",
    );
  }

  if (new Date() >= contest.startTime) {
    throw new ApiError(400, "Cannot delete contest that has started");
  }

  await prisma.contest.update({
    where: { id: contestId },
    data: { deletedAt: new Date() },
  });

  logger.info("Contest deleted", { contestId, userId });

  return { message: "Contest deleted successfully" };
};

export const registerForContest = async (contestId, userId) => {
  const contest = await prisma.contest.findUnique({
    where: {
      id: contestId,
      deletedAt: null,
    },
  });

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  if (new Date() >= contest.endTime) {
    throw new ApiError(400, "Contest has already ended");
  }

  const existingRegistration = await prisma.contestParticipant.findUnique({
    where: {
      contestId_userId: {
        contestId,
        userId,
      },
    },
  });

  if (existingRegistration) {
    throw new ApiError(400, "Already registered for this contest");
  }

  const participant = await prisma.contestParticipant.create({
    data: {
      contestId,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  logger.info("User registered for contest", { contestId, userId });

  return participant;
};

export const getContestLeaderboard = async (contestId, filters = {}) => {
  const { page = 1, limit = 100 } = filters;
  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const contest = await prisma.contest.findUnique({
    where: {
      id: contestId,
      deletedAt: null,
    },
  });

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  const [participants, total] = await Promise.all([
    prisma.contestParticipant.findMany({
      where: { contestId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: [{ score: "desc" }, { penalty: "asc" }, { finishTime: "asc" }],
      skip,
      take: pageLimit,
    }),
    prisma.contestParticipant.count({ where: { contestId } }),
  ]);

  const leaderboard = participants.map((participant, index) => ({
    rank: skip + index + 1,
    user: participant.user,
    score: participant.score,
    penalty: participant.penalty,
    finishTime: participant.finishTime,
  }));

  return createPaginatedResponse(leaderboard, page, limit, total);
};

function getContestStatus(startTime, endTime) {
  const now = new Date();

  if (now < startTime) {
    return "upcoming";
  } else if (now >= startTime && now < endTime) {
    return "ongoing";
  } else {
    return "past";
  }
}

export const getUserContestSubmissions = async (contestId, userId) => {
  const contest = await prisma.contest.findUnique({
    where: {
      id: contestId,
      deletedAt: null,
    },
  });

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  const submissions = await prisma.contestSubmission.findMany({
    where: {
      contestId,
      userId,
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
      submission: {
        select: {
          id: true,
          status: true,
          language: true,
          time: true,
          memory: true,
          passedTests: true,
          totalTests: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return submissions;
};

export const isContestActive = async (contestId) => {
  const contest = await prisma.contest.findUnique({
    where: {
      id: contestId,
      deletedAt: null,
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  if (!contest) {
    return false;
  }

  const now = new Date();
  return now >= contest.startTime && now < contest.endTime;
};
export const sendContestReminders = async (contestId) => {
  const participants = await prisma.contestParticipant.findMany({
    where: { contestId },
    include: {
      user: true,
      contest: true,
    },
  });

  for (const participant of participants) {
    await sendContestReminderEmail(participant.user, participant.contest);
  }
};