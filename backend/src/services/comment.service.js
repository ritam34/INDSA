import { prisma } from '../config/database.config.js';
import { ApiError } from '../utils/apiError.js';
import logger from '../utils/logger.js';


export const createComment = async (discussionId, commentData, userId) => {
  const { content, parentId } = commentData;

  const discussion = await prisma.discussion.findUnique({
    where: { 
      id: discussionId,
      deletedAt: null 
    }
  });

  if (!discussion) {
    throw new ApiError(404, 'Discussion not found');
  }

  if (discussion.isLocked) {
    throw new ApiError(403, 'This discussion is locked. No new comments allowed.');
  }

  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { 
        id: parentId,
        deletedAt: null 
      }
    });

    if (!parentComment) {
      throw new ApiError(404, 'Parent comment not found');
    }

    if (parentComment.discussionId !== discussionId) {
      throw new ApiError(400, 'Parent comment does not belong to this discussion');
    }
  }

  const comment = await prisma.comment.create({
    data: {
      discussionId,
      userId,
      parentId: parentId || null,
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
      }
    }
  });

  logger.info('Comment created', { commentId: comment.id, discussionId, userId });

  return comment;
};

export const updateComment = async (commentId, content, userId) => {
  const existingComment = await prisma.comment.findUnique({
    where: { 
      id: commentId,
      deletedAt: null 
    }
  });

  if (!existingComment) {
    throw new ApiError(404, 'Comment not found');
  }

  if (existingComment.userId !== userId) {
    throw new ApiError(403, 'You do not have permission to update this comment');
  }

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
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

  logger.info('Comment updated', { commentId, userId });

  return updatedComment;
};

export const deleteComment = async (commentId, userId, isAdmin = false) => {
  const comment = await prisma.comment.findUnique({
    where: { 
      id: commentId,
      deletedAt: null 
    }
  });

  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  if (comment.userId !== userId && !isAdmin) {
    throw new ApiError(403, 'You do not have permission to delete this comment');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() }
  });

  logger.info('Comment deleted', { commentId, userId });

  return { message: 'Comment deleted successfully' };
};

export const voteComment = async (commentId, value, userId) => {
  const comment = await prisma.comment.findUnique({
    where: { 
      id: commentId,
      deletedAt: null 
    }
  });

  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }
  const existingVote = await prisma.commentVote.findUnique({
    where: {
      userId_commentId: {
        userId,
        commentId
      }
    }
  });

  if (existingVote) {
    if (existingVote.value === value) {
      await prisma.commentVote.delete({
        where: {
          userId_commentId: {
            userId,
            commentId
          }
        }
      });

      const updateField = value === 1 ? 'upvotes' : 'downvotes';
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          [updateField]: { decrement: 1 }
        }
      });

      logger.info('Comment vote removed', { commentId, userId, value });

      return { message: 'Vote removed', action: 'removed' };
    }

    await prisma.commentVote.update({
      where: {
        userId_commentId: {
          userId,
          commentId
        }
      },
      data: { value }
    });
    const oldUpdateField = existingVote.value === 1 ? 'upvotes' : 'downvotes';
    const newUpdateField = value === 1 ? 'upvotes' : 'downvotes';

    await prisma.comment.update({
      where: { id: commentId },
      data: {
        [oldUpdateField]: { decrement: 1 },
        [newUpdateField]: { increment: 1 }
      }
    });

    logger.info('Comment vote changed', { commentId, userId, oldValue: existingVote.value, newValue: value });

    return { message: 'Vote changed', action: 'changed' };
  }
  await prisma.commentVote.create({
    data: {
      userId,
      commentId,
      value
    }
  });
  const updateField = value === 1 ? 'upvotes' : 'downvotes';
  await prisma.comment.update({
    where: { id: commentId },
    data: {
      [updateField]: { increment: 1 }
    }
  });

  logger.info('Comment vote added', { commentId, userId, value });

  return { message: 'Vote added', action: 'added' };
};

export const getCommentReplies = async (commentId) => {
  const comment = await prisma.comment.findUnique({
    where: { 
      id: commentId,
      deletedAt: null 
    }
  });

  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  const replies = await prisma.comment.findMany({
    where: {
      parentId: commentId,
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
      _count: {
        select: {
          votes: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  return replies;
};