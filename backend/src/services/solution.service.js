import { prisma } from '../config/database.config.js';
import {ApiError} from '../utils/apiError.js';
import { sanitizePaginationParams, createPaginatedResponse } from '../utils/pagination.utils.js';
import logger from '../utils/logger.js';

export const createSolution = async (problemSlug, solutionData, userId) => {
  const { title, content, language, code, complexity } = solutionData;
  const problem = await prisma.problem.findUnique({
    where: { 
      slug: problemSlug,
      deletedAt: null 
    },
    select: { id: true, title: true }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  const hasSolved = await prisma.problemSolved.findUnique({
    where: {
      userId_problemId: {
        userId,
        problemId: problem.id
      }
    }
  });

  if (!hasSolved) {
    throw new ApiError(403, 'You must solve the problem before posting a solution');
  }
  const solution = await prisma.solution.create({
    data: {
      problemId: problem.id,
      userId,
      title,
      content,
      language,
      code,
      complexity: complexity || null
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true
        }
      },
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true
        }
      }
    }
  });
  await prisma.userStats.update({
    where: { userId },
    data: {
      solutionsWritten: { increment: 1 }
    }
  }).catch(() => {});

  logger.info('Solution created', { solutionId: solution.id, userId, problemId: problem.id });

  return solution;
};

export const getProblemSolutions = async (problemSlug, filters, currentUserId = null) => {
  const { page, limit, language, sortBy } = filters;
  const problem = await prisma.problem.findUnique({
    where: { slug: problemSlug },
    select: { id: true }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const where = {
    problemId: problem.id,
    deletedAt: null,
    ...(language && { language: language.toLowerCase() })
  };

  const orderByMap = {
    recent: { createdAt: 'desc' },
    popular: { views: 'desc' },
    most_voted: { upvotes: 'desc' }
  };

  const [solutions, total] = await Promise.all([
    prisma.solution.findMany({
      where,
      select: {
        id: true,
        title: true,
        language: true,
        upvotes: true,
        downvotes: true,
        views: true,
        isOfficial: true,
        createdAt: true,
        complexity: true,
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { isOfficial: 'desc' },
        ...(Array.isArray(orderByMap[sortBy]) ? orderByMap[sortBy] : [orderByMap[sortBy]])
      ],
      skip,
      take: pageLimit
    }),
    prisma.solution.count({ where })
  ]);

  if (currentUserId) {
    const solutionIds = solutions.map(s => s.id);
    const userVotes = await prisma.solutionVote.findMany({
      where: {
        userId: currentUserId,
        solutionId: { in: solutionIds }
      },
      select: {
        solutionId: true,
        value: true
      }
    });

    const voteMap = new Map(userVotes.map(v => [v.solutionId, v.value]));

    const solutionsWithVotes = solutions.map(solution => ({
      ...solution,
      userVote: voteMap.get(solution.id) || null
    }));

    return createPaginatedResponse(solutionsWithVotes, page, limit, total);
  }

  return createPaginatedResponse(solutions, page, limit, total);
};

export const getSolutionById = async (solutionId, currentUserId = null) => {
  const solution = await prisma.solution.findUnique({
    where: { 
      id: solutionId,
      deletedAt: null 
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true
        }
      },
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true
        }
      }
    }
  });

  if (!solution) {
    throw new ApiError(404, 'Solution not found');
  }
  prisma.solution.update({
    where: { id: solutionId },
    data: { views: { increment: 1 } }
  }).catch(() => {});

  if (currentUserId) {
    const userVote = await prisma.solutionVote.findUnique({
      where: {
        userId_solutionId: {
          userId: currentUserId,
          solutionId
        }
      }
    });

    return {
      ...solution,
      userVote: userVote?.value || null
    };
  }

  return solution;
};

export const updateSolution = async (solutionId, updateData, userId) => {
  const existingSolution = await prisma.solution.findUnique({
    where: { 
      id: solutionId,
      deletedAt: null 
    }
  });

  if (!existingSolution) {
    throw new ApiError(404, 'Solution not found');
  }

  if (existingSolution.userId !== userId && !existingSolution.isOfficial) {
    throw new ApiError(403, 'You do not have permission to update this solution');
  }
  const updatedSolution = await prisma.solution.update({
    where: { id: solutionId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatar: true
        }
      }
    }
  });

  logger.info('Solution updated', { solutionId, userId });

  return updatedSolution;
};

export const deleteSolution = async (solutionId, userId, isAdmin = false) => {
  const solution = await prisma.solution.findUnique({
    where: { 
      id: solutionId,
      deletedAt: null 
    }
  });

  if (!solution) {
    throw new ApiError(404, 'Solution not found');
  }

  if (solution.userId !== userId && !isAdmin) {
    throw new ApiError(403, 'You do not have permission to delete this solution');
  }

  if (solution.isOfficial && !isAdmin) {
    throw new ApiError(403, 'Cannot delete official solutions');
  }

  await prisma.solution.update({
    where: { id: solutionId },
    data: { deletedAt: new Date() }
  });

  logger.info('Solution deleted', { solutionId, userId });

  return { message: 'Solution deleted successfully' };
};

export const voteSolution = async (solutionId, value, userId) => {
  const solution = await prisma.solution.findUnique({
    where: { 
      id: solutionId,
      deletedAt: null 
    }
  });

  if (!solution) {
    throw new ApiError(404, 'Solution not found');
  }
  const existingVote = await prisma.solutionVote.findUnique({
    where: {
      userId_solutionId: {
        userId,
        solutionId
      }
    }
  });

  if (existingVote) {
    if (existingVote.value === value) {
      await prisma.solutionVote.delete({
        where: {
          userId_solutionId: {
            userId,
            solutionId
          }
        }
      });

      const updateField = value === 1 ? 'upvotes' : 'downvotes';
      await prisma.solution.update({
        where: { id: solutionId },
        data: {
          [updateField]: { decrement: 1 }
        }
      });

      logger.info('Solution vote removed', { solutionId, userId, value });

      return { message: 'Vote removed', action: 'removed' };
    }
    await prisma.solutionVote.update({
      where: {
        userId_solutionId: {
          userId,
          solutionId
        }
      },
      data: { value }
    });
    const oldUpdateField = existingVote.value === 1 ? 'upvotes' : 'downvotes';
    const newUpdateField = value === 1 ? 'upvotes' : 'downvotes';

    await prisma.solution.update({
      where: { id: solutionId },
      data: {
        [oldUpdateField]: { decrement: 1 },
        [newUpdateField]: { increment: 1 }
      }
    });

    logger.info('Solution vote changed', { solutionId, userId, oldValue: existingVote.value, newValue: value });

    return { message: 'Vote changed', action: 'changed' };
  }

  await prisma.solutionVote.create({
    data: {
      userId,
      solutionId,
      value
    }
  });

  const updateField = value === 1 ? 'upvotes' : 'downvotes';
  await prisma.solution.update({
    where: { id: solutionId },
    data: {
      [updateField]: { increment: 1 }
    }
  });

  logger.info('Solution vote added', { solutionId, userId, value });

  return { message: 'Vote added', action: 'added' };
};

export const getUserSolutions = async (username, filters) => {
  const { page, limit } = filters;

  const user = await prisma.user.findUnique({
    where: { 
      username,
      deletedAt: null 
    },
    select: { id: true }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const [solutions, total] = await Promise.all([
    prisma.solution.findMany({
      where: {
        userId: user.id,
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        language: true,
        upvotes: true,
        downvotes: true,
        views: true,
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
    prisma.solution.count({
      where: {
        userId: user.id,
        deletedAt: null
      }
    })
  ]);

  return createPaginatedResponse(solutions, page, limit, total);
};

export const markAsOfficial = async (solutionId) => {
  const solution = await prisma.solution.findUnique({
    where: { 
      id: solutionId,
      deletedAt: null 
    }
  });

  if (!solution) {
    throw new ApiError(404, 'Solution not found');
  }

  const updated = await prisma.solution.update({
    where: { id: solutionId },
    data: { isOfficial: true }
  });

  logger.info('Solution marked as official', { solutionId });

  return updated;
};