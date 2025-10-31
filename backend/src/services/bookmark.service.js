import { prisma } from '../config/database.config.js';
import { ApiError } from '../utils/apiError.js';
import { sanitizePaginationParams, createPaginatedResponse } from '../utils/pagination.utils.js';
import logger from '../utils/logger.js';

export const createBookmark = async (bookmarkData, userId) => {
  const { problemId, notes, tags } = bookmarkData;
  const problem = await prisma.problem.findUnique({
    where: { 
      id: problemId,
      deletedAt: null 
    },
    select: { id: true, title: true }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }
  const existingBookmark = await prisma.bookmark.findUnique({
    where: {
      userId_problemId: {
        userId,
        problemId
      }
    }
  });

  if (existingBookmark) {
    throw new ApiError(400, 'Problem already bookmarked');
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      problemId,
      notes: notes || null,
      tags: tags || []
    },
    include: {
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          tags: true,
          acceptanceRate: true
        }
      }
    }
  });

  logger.info('Bookmark created', { bookmarkId: bookmark.id, userId, problemId });

  return bookmark;
};

export const getUserBookmarks = async (userId, filters) => {
  const { page, limit, tags, difficulty, search } = filters;
  const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

  const where = {
    userId,
    ...(tags && { tags: { hasSome: tags.split(',') } }),
    ...(search && {
      OR: [
        { notes: { contains: search, mode: 'insensitive' } },
        { problem: { title: { contains: search, mode: 'insensitive' } } }
      ]
    }),
    problem: {
      deletedAt: null,
      ...(difficulty && { difficulty: difficulty.toUpperCase() })
    }
  };

  const [bookmarks, total] = await Promise.all([
    prisma.bookmark.findMany({
      where,
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
            tags: true,
            acceptanceRate: true,
            totalSubmissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageLimit
    }),
    prisma.bookmark.count({ where })
  ]);

  const problemIds = bookmarks.map(b => b.problemId);
  const solvedProblems = await prisma.problemSolved.findMany({
    where: {
      userId,
      problemId: { in: problemIds },
      deletedAt: null
    },
    select: { problemId: true }
  });

  const solvedIds = new Set(solvedProblems.map(p => p.problemId));

  const bookmarksWithStatus = bookmarks.map(bookmark => ({
    ...bookmark,
    problem: {
      ...bookmark.problem,
      isSolved: solvedIds.has(bookmark.problemId)
    }
  }));

  return createPaginatedResponse(bookmarksWithStatus, page, limit, total);
};

export const getBookmarkById = async (bookmarkId, userId) => {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId },
    include: {
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          tags: true,
          acceptanceRate: true,
          description: true
        }
      }
    }
  });

  if (!bookmark) {
    throw new ApiError(404, 'Bookmark not found');
  }

  if (bookmark.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to access this bookmark');
  }

  const isSolved = await prisma.problemSolved.findUnique({
    where: {
      userId_problemId: {
        userId,
        problemId: bookmark.problemId
      }
    }
  });

  return {
    ...bookmark,
    problem: {
      ...bookmark.problem,
      isSolved: !!isSolved
    }
  };
};

export const updateBookmark = async (bookmarkId, updateData, userId) => {
  const existingBookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId }
  });

  if (!existingBookmark) {
    throw new ApiError(404, 'Bookmark not found');
  }

  if (existingBookmark.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to update this bookmark');
  }

  const updatedBookmark = await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: updateData,
    include: {
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          tags: true
        }
      }
    }
  });

  logger.info('Bookmark updated', { bookmarkId, userId });

  return updatedBookmark;
};

export const deleteBookmark = async (bookmarkId, userId) => {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId }
  });

  if (!bookmark) {
    throw new ApiError(404, 'Bookmark not found');
  }

  if (bookmark.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to delete this bookmark');
  }

  await prisma.bookmark.delete({
    where: { id: bookmarkId }
  });

  logger.info('Bookmark deleted', { bookmarkId, userId });

  return { message: 'Bookmark deleted successfully' };
};

export const toggleBookmark = async (problemId, userId) => {
  const problem = await prisma.problem.findUnique({
    where: { 
      id: problemId,
      deletedAt: null 
    },
    select: { id: true, title: true }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  const existingBookmark = await prisma.bookmark.findUnique({
    where: {
      userId_problemId: {
        userId,
        problemId
      }
    }
  });

  if (existingBookmark) {
    await prisma.bookmark.delete({
      where: {
        userId_problemId: {
          userId,
          problemId
        }
      }
    });

    logger.info('Bookmark removed', { problemId, userId });

    return { 
      message: 'Bookmark removed',
      bookmarked: false
    };
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      problemId,
      tags: []
    }
  });

  logger.info('Bookmark added', { bookmarkId: bookmark.id, userId, problemId });

  return { 
    message: 'Bookmark added',
    bookmarked: true,
    bookmark
  };
};

export const isBookmarked = async (problemId, userId) => {
  const bookmark = await prisma.bookmark.findUnique({
    where: {
      userId_problemId: {
        userId,
        problemId
      }
    }
  });

  return {
    bookmarked: !!bookmark,
    bookmarkId: bookmark?.id || null
  };
};

export const getBookmarkStats = async (userId) => {
  const [total, byDifficulty] = await Promise.all([
    prisma.bookmark.count({
      where: { userId }
    }),
    prisma.bookmark.groupBy({
      by: ['userId'],
      where: { userId },
      _count: true
    })
  ]);

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: {
      problem: {
        select: { difficulty: true }
      }
    }
  });

  const stats = {
    total,
    easy: bookmarks.filter(b => b.problem.difficulty === 'EASY').length,
    medium: bookmarks.filter(b => b.problem.difficulty === 'MEDIUM').length,
    hard: bookmarks.filter(b => b.problem.difficulty === 'HARD').length
  };

  return stats;
};

export const getUserBookmarkTags = async (userId) => {
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    select: { tags: true }
  });

  const allTags = bookmarks.flatMap(b => b.tags);
  const uniqueTags = [...new Set(allTags)];

  return uniqueTags.sort();
};