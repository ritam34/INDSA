import { prisma } from '../config/database.config.js';
import { ApiError } from '../utils/apiError.js';
import { executeCode, executeCodeWithTestCases } from './judge.service.js';
// getLanguageId not found
import { sanitizePaginationParams, createPaginatedResponse } from '../utils/pagination.utils.js';
import { updateUserStatsAfterSubmission } from './stats.service.js';
import logger from '../utils/logger.js';

export const runCode = async (problemSlug, sourceCode, language, stdin, userId) => {
  const problem = await prisma.problem.findUnique({
    where: { 
      slug: problemSlug,
      deletedAt: null 
    },
    include: {
      testCases: {
        where: { isPublic: true },
        orderBy: { order: 'asc' },
        take: 3 
      }
    }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  if (stdin) {
    const result = await executeCode(sourceCode, language, stdin);
    return {
      type: 'custom_input',
      result
    };
  }

  if (problem.testCases.length === 0) {
    throw new ApiError(400, 'No public test cases available');
  }

  const results = await executeCodeWithTestCases(
    sourceCode,
    language,
    problem.testCases.map(tc => ({
      input: tc.input,
      output: tc.output
    }))
  );

  return {
    type: 'test_cases',
    results,
    totalTests: results.length,
    passedTests: results.filter(r => r.passed).length
  };
};

export const submitSolution = async (problemSlug, sourceCode, language, userId) => {
  const problem = await prisma.problem.findUnique({
    where: { 
      slug: problemSlug,
      deletedAt: null 
    },
    include: {
      testCases: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  if (problem.testCases.length === 0) {
    throw new ApiError(400, 'No test cases available for this problem');
  }

  const submission = await prisma.submission.create({
    data: {
      userId,
      problemId: problem.id,
      sourceCode,
      language,
      status: 'PENDING',
      passedTests: 0,
      totalTests: problem.testCases.length
    }
  });

  try {
    const results = await executeCodeWithTestCases(
      sourceCode,
      language,
      problem.testCases.map(tc => ({
        input: tc.input,
        output: tc.output
      }))
    );

    await Promise.all(
      results.map(result => 
        prisma.testcaseResult.create({
          data: {
            submissionId: submission.id,
            testcase: result.testcase,
            passed: result.passed,
            stdout: result.stdout,
            stderr: result.stderr,
            expectedOutput: result.expectedOutput,
            actualOutput: result.actualOutput,
            compileOutput: result.compile_output,
            memory: result.memory?.toString(),
            time: result.time?.toString(),
            status: result.status
          }
        })
      )
    );
    const passedCount = results.filter(r => r.passed).length;
    const allPassed = passedCount === results.length;
    
    let finalStatus = 'ACCEPTED';
    if (!allPassed) {
      const firstFailed = results.find(r => !r.passed);
      finalStatus = firstFailed.status;
    }

    const avgTime = results.reduce((sum, r) => sum + (parseFloat(r.time) || 0), 0) / results.length;
    const avgMemory = results.reduce((sum, r) => sum + (parseInt(r.memory) || 0), 0) / results.length;

    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: finalStatus,
        passedTests: passedCount,
        time: avgTime.toFixed(3),
        memory: Math.round(avgMemory).toString()
      },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true
          }
        },
        testcaseResults: true
      }
    });

    if (allPassed) {
      await handleAcceptedSubmission(userId, problem.id, submission.id);
    }

    await updateProblemStats(problem.id, allPassed);

    logger.info('Submission processed', { 
      submissionId: submission.id,
      status: finalStatus,
      passedTests: passedCount,
      totalTests: results.length
    });

    return updatedSubmission;

  } catch (error) {
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'INTERNAL_ERROR',
        stderr: error.message
      }
    });

    logger.error('Submission failed', { 
      submissionId: submission.id,
      error: error.message 
    });

    throw error;
  }
};

async function handleAcceptedSubmission(userId, problemId, submissionId) {
  try {
    const existingSolve = await prisma.problemSolved.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId
        }
      }
    });

    if (!existingSolve) {
      await prisma.problemSolved.create({
        data: {
          userId,
          problemId,
          firstSolvedAt: new Date(),
          totalAttempts: 1
        }
      });
    } else {
      await prisma.problemSolved.update({
        where: {
          userId_problemId: {
            userId,
            problemId
          }
        },
        data: {
          totalAttempts: { increment: 1 }
        }
      });
    }

    // Update problem attempt
    await prisma.problemAttempt.upsert({
      where: {
        userId_problemId: {
          userId,
          problemId
        }
      },
      create: {
        userId,
        problemId,
        attempts: 1,
        solved: true,
        lastAttemptAt: new Date()
      },
      update: {
        attempts: { increment: 1 },
        solved: true,
        lastAttemptAt: new Date()
      }
    });

    // Update user stats
    await updateUserStatsAfterSubmission(userId, problemId, true);

  } catch (error) {
    logger.error('Failed to handle accepted submission', { 
      error: error.message,
      userId,
      problemId 
    });
  }
}

async function updateProblemStats(problemId, isAccepted) {
  try {
    const updateData = {
      totalSubmissions: { increment: 1 }
    };

    if (isAccepted) {
      updateData.totalAccepted = { increment: 1 };
    }

    await prisma.problem.update({
      where: { id: problemId },
      data: updateData
    });

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        totalSubmissions: true,
        totalAccepted: true
      }
    });

    if (problem.totalSubmissions > 0) {
      const acceptanceRate = (problem.totalAccepted / problem.totalSubmissions) * 100;
      
      await prisma.problem.update({
        where: { id: problemId },
        data: {
          acceptanceRate: parseFloat(acceptanceRate.toFixed(2))
        }
      });
    }
  } catch (error) {
    logger.error('Failed to update problem stats', { 
      error: error.message,
      problemId 
    });
  }
}

export const getSubmissionById = async (submissionId, userId) => {
  const submission = await prisma.submission.findUnique({
    where: { 
      id: submissionId,
      deletedAt: null 
    },
    include: {
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true
        }
      },
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true
        }
      },
      testcaseResults: {
        orderBy: { testcase: 'asc' }
      }
    }
  });

  if (!submission) {
    throw new ApiError(404, 'Submission not found');
  }

  if (submission.userId !== userId && !submission.isPublic) {
    throw new ApiError(403, 'You do not have permission to view this submission');
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
    ...(problemId && { problemId })
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
            difficulty: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageLimit
    }),
    prisma.submission.count({ where })
  ]);

  return createPaginatedResponse(submissions, page, limit, total);
};

export const getProblemSubmissions = async (problemSlug, userId, filters) => {
  const problem = await prisma.problem.findUnique({
    where: { slug: problemSlug },
    select: { id: true }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  const { page, limit, status } = filters;
  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const where = {
    problemId: problem.id,
    userId,
    deletedAt: null,
    ...(status && { status })
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
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageLimit
    }),
    prisma.submission.count({ where })
  ]);

  return createPaginatedResponse(submissions, page, limit, total);
};