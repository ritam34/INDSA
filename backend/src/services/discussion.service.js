import { prisma } from '../config/database.config.js';
import { ApiError } from '../utils/apiError.js';
import { sanitizePaginationParams, createPaginatedResponse } from '../utils/pagination.utils.js';
import logger from '../utils/logger.js';

export const createDiscussion = async (problemSlug, discussionData, userId) => {
  const { title, content } = discussionData;

  const problem = await prisma.problem.findUnique({
    where: { 
      slug: problemSlug,
      deletedAt: null 
    },
    select: { id: true }
  });

  if (!problem) {
    throw new ApiError(404, 'Problem not found');
  }

  const discussion = await prisma.discussion.create({
    data: {
      problemId: problem.id,
      userId,
      title,
      content
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
          slug: true
        }
      }
    }
  });

  logger.info('Discussion created', { discussionId: discussion.id, userId });

  return discussion;
};

export const getProblemDiscussions = async (problemSlug, filters) => {
  const { page, limit, sortBy, search } = filters;

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
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const orderByMap = {
    recent: { createdAt: 'desc' },
    popular: { views: 'desc' },
    most_voted: { upvotes: 'desc' },
    most_viewed: { views: 'desc' }
  };

  const [discussions, total] = await Promise.all([
    prisma.discussion.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        upvotes: true,
        downvotes: true,
        views: true,
        isPinned: true,
        isLocked: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatar: true
          }
        },
        _count: {
          select: {
            comments: {
              where: { deletedAt: null }
            }
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        ...(Array.isArray(orderByMap[sortBy]) ? orderByMap[sortBy] : [orderByMap[sortBy]])
      ],
      skip,
      take: pageLimit
    }),
    prisma.discussion.count({ where })
  ]);

  const discussionsWithCount = discussions.map(d => ({
    ...d,
    commentCount: d._count.comments
  }));

  return createPaginatedResponse(discussionsWithCount, page, limit, total);
};

export const getDiscussionById = async (discussionId) => {
  const discussion = await prisma.discussion.findUnique({
    where: { 
      id: discussionId,
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
          slug: true
        }
      },
      comments: {
        where: { 
          deletedAt: null,
          parentId: null 
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
          replies: {
            where: { deletedAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  username: true,
                  avatar: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          _count: {
            select: {
              votes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: {
          comments: {
            where: { deletedAt: null }
          }
        }
      }
    }
  });

  if (!discussion) {
    throw new ApiError(404, 'Discussion not found');
  }

  prisma.discussion.update({
    where: { id: discussionId },
    data: { views: { increment: 1 } }
  }).catch(() => {});

  return {
    ...discussion,
    commentCount: discussion._count.comments
  };
};

export const updateDiscussion = async (discussionId, updateData, userId) => {
  const existingDiscussion = await prisma.discussion.findUnique({
    where: { 
      id: discussionId,
      deletedAt: null 
    }
  });

  if (!existingDiscussion) {
    throw new ApiError(404, 'Discussion not found');
  }

  if (existingDiscussion.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to update this discussion');
  }

  const updatedDiscussion = await prisma.discussion.update({
    where: { id: discussionId },
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

  logger.info('Discussion updated', { discussionId, userId });

  return updatedDiscussion;
};

export const deleteDiscussion = async (discussionId, userId, isAdmin = false) => {
  const discussion = await prisma.discussion.findUnique({
    where: { 
      id: discussionId,
      deletedAt: null 
    }
  });

  if (!discussion) {
    throw new ApiError(404, 'Discussion not found');
  }

  if (discussion.userId !== userId && !isAdmin) {
    throw new ApiError(403, 'You do not have permission to delete this discussion');
  }

  await prisma.discussion.update({
    where: { id: discussionId },
    data: { deletedAt: new Date() }
  });

  logger.info('Discussion deleted', { discussionId, userId });

  return { message: 'Discussion deleted successfully' };
};

export const voteDiscussion = async (discussionId, value, userId) => {
  const discussion = await prisma.discussion.findUnique({
    where: { 
      id: discussionId,
      deletedAt: null 
    }
  });

  if (!discussion) {
    throw new ApiError(404, 'Discussion not found');
  }

  const existingVote = await prisma.discussionVote.findUnique({
    where: {
      userId_discussionId: {
        userId,
        discussionId
      }
    }
  });

  if (existingVote) {
    if (existingVote.value === value) {
      await prisma.discussionVote.delete({
        where: {
          userId_discussionId: {
            userId,
            discussionId
          }
        }
      });

      const updateField = value === 1 ? 'upvotes' : 'downvotes';
      await prisma.discussion.update({
        where: { id: discussionId },
        data: {
          [updateField]: { decrement: 1 }
        }
      });

      logger.info('Discussion vote removed', { discussionId, userId, value });

      return { message: 'Vote removed', action: 'removed' };
    }

    await prisma.discussionVote.update({
      where: {
        userId_discussionId: {
          userId,
          discussionId
        }
      },
      data: { value }
    });

    const oldUpdateField = existingVote.value === 1 ? 'upvotes' : 'downvotes';
    const newUpdateField = value === 1 ? 'upvotes' : 'downvotes';

    await prisma.discussion.update({
      where: { id: discussionId },
      data: {
        [oldUpdateField]: { decrement: 1 },
        [newUpdateField]: { increment: 1 }
      }
    });

    logger.info('Discussion vote changed', { discussionId, userId, oldValue: existingVote.value, newValue: value });

    return { message: 'Vote changed', action: 'changed' };
  }

  await prisma.discussionVote.create({
    data: {
      userId,
      discussionId,
      value
    }
  });

  const updateField = value === 1 ? 'upvotes' : 'downvotes';
  await prisma.discussion.update({
    where: { id: discussionId },
    data: {
      [updateField]: { increment: 1 }
    }
  });

  logger.info('Discussion vote added', { discussionId, userId, value });

  return { message: 'Vote added', action: 'added' };
};

export const togglePinDiscussion = async (discussionId) => {
  const discussion = await prisma.discussion.findUnique({
    where: { 
      id: discussionId,
      deletedAt: null 
    }
  });

  if (!discussion) {
    throw new ApiError(404, 'Discussion not found');
  }

  const updated = await prisma.discussion.update({
    where: { id: discussionId },
    data: { isPinned: !discussion.isPinned }
  });

  logger.info('Discussion pin toggled', { discussionId, isPinned: updated.isPinned });

  return {
    message: updated.isPinned ? 'Discussion pinned' : 'Discussion unpinned',
    isPinned: updated.isPinned
  };
};

export const toggleLockDiscussion = async (discussionId) => {
  const discussion = await prisma.discussion.findUnique({
    where: { 
      id: discussionId,
      deletedAt: null 
    }
  });

  if (!discussion) {
    throw new ApiError(404, 'Discussion not found');
  }

  const updated = await prisma.discussion.update({
    where: { id: discussionId },
    data: { isLocked: !discussion.isLocked }
  });

  logger.info('Discussion lock toggled', { discussionId, isLocked: updated.isLocked });

  return {
    message: updated.isLocked ? 'Discussion locked' : 'Discussion unlocked',
    isLocked: updated.isLocked
  };
};

export const getUserDiscussions = async (username, filters) => {
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

  const [discussions, total] = await Promise.all([
    prisma.discussion.findMany({
      where: {
        userId: user.id,
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        content: true,
        upvotes: true,
        downvotes: true,
        views: true,
        createdAt: true,
        problem: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        },
        _count: {
          select: {
            comments: {
              where: { deletedAt: null }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageLimit
    }),
    prisma.discussion.count({
      where: {
        userId: user.id,
        deletedAt: null
      }
    })
  ]);

  const discussionsWithCount = discussions.map(d => ({
    ...d,
    commentCount: d._count.comments
  }));

  return createPaginatedResponse(discussionsWithCount, page, limit, total);
};