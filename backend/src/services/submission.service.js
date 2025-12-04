import { prisma } from "../config/database.config.js";
import { ApiError } from "../utils/apiError.js";
import { executeCode, executeCodeWithTestCases } from "./judge.service.js";
import {
  sanitizePaginationParams,
  createPaginatedResponse,
} from "../utils/pagination.utils.js";
import { updateUserStatsAfterSubmission } from "./stats.service.js";
import { checkBadgesAfterSubmission } from "../hooks/badge.hooks.js";
import logger from "../utils/logger.js";
import { addSubmissionJob } from "../jobs/submissionQueue.js";

export const runCode = async (
  problemSlug,
  sourceCode,
  language,
  stdin,
  userId,
) => {
  const problem = await prisma.problem.findUnique({
    where: {
      slug: problemSlug,
      deletedAt: null,
    },
    include: {
      testCases: {
        where: { isPublic: true },
        orderBy: { order: "asc" },
        take: 3,
      },
    },
  });

  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }

  if (stdin) {
    const result = await executeCode(sourceCode, language, stdin);
    return {
      type: "custom_input",
      result,
    };
  }

  if (problem.testCases.length === 0) {
    throw new ApiError(400, "No public test cases available");
  }

  const results = await executeCodeWithTestCases(
    sourceCode,
    language,
    problem.testCases.map((tc) => ({
      input: tc.input,
      output: tc.output,
    })),
  );

  return {
    type: "test_cases",
    results,
    totalTests: results.length,
    passedTests: results.filter((r) => r.passed).length,
  };
};

export const submitSolution = async (
  problemSlug,
  sourceCode,
  language,
  userId,
) => {
  const problem = await prisma.problem.findUnique({
    where: {
      slug: problemSlug,
      deletedAt: null,
    },
    include: {
      testCases: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }

  if (!problem.testCases.length) {
    throw new ApiError(400, "No test cases available for this problem");
  }

  const submission = await prisma.submission.create({
    data: {
      userId,
      problemId: problem.id,
      sourceCode,
      language,
      status: "PENDING",
      passedTests: 0,
      totalTests: problem.testCases.length,
    },
  });

  await addSubmissionJob({
    submissionId: submission.id,
    userId,
    problemId: problem.id,
    language,
    sourceCode,
    testCases: problem.testCases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.output,
    })),
  });

  return {
    submissionId: submission.id,
    status: "PENDING",
    message: "Your submission is being processed",
  };
};
async function handleAcceptedSubmission(userId, problemId, submissionId) {
  try {
    const existingSolve = await prisma.problemSolved.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId,
        },
      },
    });

    let isFirstSolve = false;

    if (!existingSolve) {
      await prisma.problemSolved.create({
        data: {
          userId,
          problemId,
          firstSolvedAt: new Date(),
          totalAttempts: 1,
        },
      });
      isFirstSolve = true;
    } else {
      await prisma.problemSolved.update({
        where: {
          userId_problemId: {
            userId,
            problemId,
          },
        },
        data: {
          totalAttempts: { increment: 1 },
        },
      });
    }

    await prisma.problemAttempt.upsert({
      where: {
        userId_problemId: {
          userId,
          problemId,
        },
      },
      create: {
        userId,
        problemId,
        attempts: 1,
        solved: true,
        lastAttemptAt: new Date(),
      },
      update: {
        attempts: { increment: 1 },
        solved: true,
        lastAttemptAt: new Date(),
      },
    });

    await updateUserStatsAfterSubmission(userId, problemId, true);

    return isFirstSolve;
  } catch (error) {
    logger.error("Failed to handle accepted submission", {
      error: error.message,
      userId,
      problemId,
    });
    return false;
  }
}

async function updateProblemStats(problemId, isAccepted) {
  try {
    const updateData = {
      totalSubmissions: { increment: 1 },
    };

    if (isAccepted) {
      updateData.totalAccepted = { increment: 1 };
    }

    await prisma.problem.update({
      where: { id: problemId },
      data: updateData,
    });

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        totalSubmissions: true,
        totalAccepted: true,
      },
    });

    if (problem.totalSubmissions > 0) {
      const acceptanceRate =
        (problem.totalAccepted / problem.totalSubmissions) * 100;

      await prisma.problem.update({
        where: { id: problemId },
        data: {
          acceptanceRate: parseFloat(acceptanceRate.toFixed(2)),
        },
      });
    }
  } catch (error) {
    logger.error("Failed to update problem stats", {
      error: error.message,
      problemId,
    });
  }
}

export const getSubmissionById = async (submissionId, userId) => {
  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
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
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true,
        },
      },
      testcases: {
        orderBy: { testcase: "asc" },
      },
    },
  });

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  if (submission.userId !== userId && !submission.isPublic) {
    throw new ApiError(
      403,
      "You do not have permission to view this submission",
    );
  }

  return submission;
};

export const getUserSubmissions = async (userId, filters) => {
  const { page, limit, status, language, problemId } = filters;
  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const where = {
    userId,
    deletedAt: null,
    ...(status && { status }),
    ...(language && { language }),
    ...(problemId && { problemId }),
  };

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      select: {
        id: true,
        status: true,
        language: true,
        time: true,
        memory: true,
        passedTests: true,
        totalTests: true,
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
    prisma.submission.count({ where }),
  ]);

  return createPaginatedResponse(submissions, page, limit, total);
};

export const getProblemSubmissions = async (problemSlug, userId, filters) => {
  const problem = await prisma.problem.findUnique({
    where: { slug: problemSlug },
    select: { id: true },
  });

  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }

  const { page, limit, status } = filters;
  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const where = {
    problemId: problem.id,
    userId,
    deletedAt: null,
    ...(status && { status }),
  };

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
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
      orderBy: { createdAt: "desc" },
      skip,
      take: pageLimit,
    }),
    prisma.submission.count({ where }),
  ]);

  return createPaginatedResponse(submissions, page, limit, total);
};
