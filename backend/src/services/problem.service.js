import { prisma } from '../config/database.config.js';
import { ApiError } from '../utils/apiError.js';
import { generateSlug, generateSlugWithRandom } from '../utils/slug.utils.js';
import { sanitizePaginationParams, createPaginatedResponse } from '../utils/pagination.utils.js';
import logger from '../utils/logger.js';

export const createProblem = async (problemData, userId) => {
  const { 
    title, 
    description, 
    difficulty, 
    tags, 
    examples, 
    constraints, 
    hints, 
    editorial,
    testCases,
    codeSnippets,
    referenceSolutions,
    isPublic,
    isPremium,
    status
  } = problemData;

  let slug = generateSlug(title);
  
  const existingProblem = await prisma.problem.findUnique({
    where: { slug }
  });

  if (existingProblem) {
    slug = generateSlugWithRandom(title);
  }

  const lastProblem = await prisma.problem.findFirst({
    orderBy: { order: 'desc' },
    select: { order: true }
  });

  const nextOrder = lastProblem?.order ? lastProblem.order + 1 : 1;

  const problem = await prisma.problem.create({
    data: {
      title,
      slug,
      description,
      difficulty,
      tags,
      examples,
      constraints,
      hints: hints || null,
      editorial: editorial || null,
      isPublic,
      isPremium,
      status,
      order: nextOrder,
      userId,
      testCases: {
        create: testCases.map(tc => ({
          input: tc.input,
          output: tc.output,
          explanation: tc.explanation || null,
          isPublic: tc.isPublic,
          order: tc.order,
          weight: tc.weight || 1
        }))
      },
      codeSnippets: {
        create: codeSnippets.map(cs => ({
          language: cs.language,
          code: cs.code
        }))
      },
      referenceSolutions: {
        create: referenceSolutions.map(rs => ({
          language: rs.language,
          code: rs.code,
          explanation: rs.explanation || null,
          complexity: rs.complexity || null
        }))
      }
    },
    include: {
      testCases: true,
      codeSnippets: true,
      referenceSolutions: true
    }
  });

  logger.info('Problem created', { problemId: problem.id, slug, userId });

  return problem;
};

export const getProblems = async (filters, userId = null) => {
  const { 
    page, 
    limit, 
    difficulty, 
    tags, 
    status, 
    search, 
    sortBy, 
    order 
  } = filters;

  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const where = {
    deletedAt: null,
    ...(difficulty && { difficulty: difficulty.toUpperCase() }),
    ...(status && { status: status.toUpperCase() }),
    ...(tags && { tags: { hasSome: tags.split(',') } }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }),
    ...(!userId && { status: 'PUBLISHED', isPublic: true })
  };

  const orderByMap = {
    title: { title: order },
    difficulty: { difficulty: order },
    acceptance_rate: { acceptanceRate: order },
    created_at: { createdAt: order },
    order: { order: order }
  };

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        tags: true,
        isPublic: true,
        isPremium: true,
        status: true,
        order: true,
        acceptanceRate: true,
        totalSubmissions: true,
        totalAccepted: true,
        likes: true,
        dislikes: true,
        createdAt: true
      },
      orderBy: orderByMap[sortBy] || orderByMap.order,
      skip,
      take: pageLimit
    }),
    prisma.problem.count({ where })
  ]);

  let problemsWithStatus = problems;
  if (userId) {
    const solvedProblemIds = await prisma.problemSolved.findMany({
      where: { 
        userId,
        deletedAt: null 
      },
      select: { problemId: true }
    });

    const solvedIds = new Set(solvedProblemIds.map(p => p.problemId));

    problemsWithStatus = problems.map(problem => ({
      ...problem,
      isSolved: solvedIds.has(problem.id)
    }));
  }

  return createPaginatedResponse(problemsWithStatus, page, limit, total);
};

export const getProblemBySlug = async (slug, userId = null) => {
  const problem = await prisma.problem.findUnique({
    where: { 
      slug,
      deletedAt: null 
    },
    include: {
      testCases: {
        where: { isPublic: true },
        orderBy: { order: 'asc' }
      },
      codeSnippets: true,
      referenceSolutions: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true
        }
      },
      topicTags: {
        include: {
          topic: true
        }
      },
      companyTags: {
        include: {
          company: true
        }
      }
    }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  if (problem.status !== 'PUBLISHED' && (!userId || problem.userId !== userId)) {
    throw new ApiError(403, 'You do not have access to this problem');
  }

  prisma.problem.update({
    where: { id: problem.id },
    data: { discussionCount: { increment: 0 } } // Placeholder for view count if added
  }).catch(() => {});

  let isSolved = false;
  let userAttempts = null;
  if (userId) {
    const solved = await prisma.problemSolved.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId: problem.id
        }
      }
    });

    isSolved = !!solved;

    userAttempts = await prisma.problemAttempt.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId: problem.id
        }
      },
      select: {
        attempts: true,
        solved: true,
        lastAttemptAt: true
      }
    });
  }

  return {
    ...problem,
    isSolved,
    userAttempts
  };
};

export const updateProblem = async (problemId, updateData, userId) => {
  const existingProblem = await prisma.problem.findUnique({
    where: { 
      id: problemId,
      deletedAt: null 
    }
  });

  if (!existingProblem) {
    throw new ApiError(404, 'Problem not found');
  }

  if (existingProblem.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to update this problem');
  }

  if (updateData.title) {
    updateData.slug = generateSlug(updateData.title);
    
    const slugExists = await prisma.problem.findFirst({
      where: {
        slug: updateData.slug,
        id: { not: problemId }
      }
    });

    if (slugExists) {
      updateData.slug = generateSlugWithRandom(updateData.title);
    }
  }

  const updatedProblem = await prisma.problem.update({
    where: { id: problemId },
    data: updateData,
    include: {
      testCases: true,
      codeSnippets: true,
      referenceSolutions: true
    }
  });

  logger.info('Problem updated', { problemId, userId, fields: Object.keys(updateData) });

  return updatedProblem;
};

export const deleteProblem = async (problemId, userId) => {
  const problem = await prisma.problem.findUnique({
    where: { 
      id: problemId,
      deletedAt: null 
    }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  if (problem.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to delete this problem');
  }

  await prisma.problem.update({
    where: { id: problemId },
    data: { deletedAt: new Date() }
  });

  logger.info('Problem deleted (soft delete)', { problemId, userId });

  return { message: 'Problem deleted successfully' };
};

export const addTestCase = async (problemId, testCaseData, userId) => {
  const problem = await prisma.problem.findUnique({
    where: { 
      id: problemId,
      deletedAt: null 
    }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  if (problem.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to modify this problem');
  }

  const testCase = await prisma.testCase.create({
    data: {
      ...testCaseData,
      problemId
    }
  });

  logger.info('Test case added', { problemId, testCaseId: testCase.id, userId });

  return testCase;
};

export const addCodeSnippet = async (problemId, snippetData, userId) => {
  const problem = await prisma.problem.findUnique({
    where: { 
      id: problemId,
      deletedAt: null 
    }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  if (problem.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to modify this problem');
  }

  const existingSnippet = await prisma.codeSnippet.findFirst({
    where: {
      problemId,
      language: snippetData.language
    }
  });

  if (existingSnippet) {
    // Update existing
    const updated = await prisma.codeSnippet.update({
      where: { id: existingSnippet.id },
      data: { code: snippetData.code }
    });
    return updated;
  }

  // Create new
  const snippet = await prisma.codeSnippet.create({
    data: {
      ...snippetData,
      problemId
    }
  });

  logger.info('Code snippet added', { problemId, language: snippet.language, userId });

  return snippet;
};

export const getProblemStats = async () => {
  const [totalProblems, easyCount, mediumCount, hardCount] = await Promise.all([
    prisma.problem.count({
      where: { 
        deletedAt: null,
        status: 'PUBLISHED'
      }
    }),
    prisma.problem.count({
      where: { 
        deletedAt: null,
        status: 'PUBLISHED',
        difficulty: 'EASY'
      }
    }),
    prisma.problem.count({
      where: { 
        deletedAt: null,
        status: 'PUBLISHED',
        difficulty: 'MEDIUM'
      }
    }),
    prisma.problem.count({
      where: { 
        deletedAt: null,
        status: 'PUBLISHED',
        difficulty: 'HARD'
      }
    })
  ]);

  return {
    total: totalProblems,
    easy: easyCount,
    medium: mediumCount,
    hard: hardCount
  };
};

export const searchProblems = async (searchQuery, userId = null) => {
  const problems = await prisma.problem.findMany({
    where: {
      deletedAt: null,
      status: 'PUBLISHED',
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { tags: { hasSome: [searchQuery] } }
      ]
    },
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      tags: true,
      acceptanceRate: true
    },
    take: 10
  });

  if (userId) {
    const solvedProblemIds = await prisma.problemSolved.findMany({
      where: { 
        userId,
        deletedAt: null 
      },
      select: { problemId: true }
    });

    const solvedIds = new Set(solvedProblemIds.map(p => p.problemId));

    return problems.map(problem => ({
      ...problem,
      isSolved: solvedIds.has(problem.id)
    }));
  }

  return problems;
};

export const getRandomProblem = async (difficulty = null) => {
  const where = {
    deletedAt: null,
    status: 'PUBLISHED',
    isPublic: true,
    ...(difficulty && { difficulty: difficulty.toUpperCase() })
  };

  const count = await prisma.problem.count({ where });
  
  if (count === 0) {
    throw new ApiError(404, 'No problems found');
  }

  const skip = Math.floor(Math.random() * count);

  const problem = await prisma.problem.findFirst({
    where,
    skip,
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      tags: true
    }
  });

  return problem;
};