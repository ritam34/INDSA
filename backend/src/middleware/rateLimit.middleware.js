import { prisma } from '../config/database.config.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';

export const rateLimit = (options = {}) => {
  const {
    windowMs = 60 * 1000,      // 1 minute default
    maxRequests = 10,      // 10 requests default
    action = 'submission'
  } = options;

  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const userId = req.user.id;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    let rateLimit = await prisma.rateLimit.findFirst({
      where: {
        userId,
        action,
        windowStart: {
          gte: windowStart
        }
      }
    });

    if (!rateLimit) {
      rateLimit = await prisma.rateLimit.create({
        data: {
          userId,
          action,
          count: 1,
          windowStart: now,
          lastAttemptAt: now
        }
      });

      logger.info('Rate limit window created', { userId, action });
      return next();
    }

    if (rateLimit.count >= maxRequests) {
      const resetTime = new Date(rateLimit.windowStart.getTime() + windowMs);
      const secondsUntilReset = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);

      logger.warn('Rate limit exceeded', { 
        userId, 
        action, 
        count: rateLimit.count,
        maxRequests 
      });

      throw new ApiError(
        429, 
        `Too many requests. Please try again in ${secondsUntilReset} seconds.`
      );
    }

    await prisma.rateLimit.update({
      where: { id: rateLimit.id },
      data: {
        count: { increment: 1 },
        lastAttemptAt: now
      }
    });

    logger.info('Rate limit checked', { 
      userId, 
      action, 
      count: rateLimit.count + 1,
      maxRequests 
    });

    next();
  });
};
export const cleanupRateLimits = async () => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const deleted = await prisma.rateLimit.deleteMany({
      where: {
        windowStart: {
          lt: oneDayAgo
        }
      }
    });

    logger.info('Rate limits cleaned up', { deletedCount: deleted.count });
  } catch (error) {
    logger.error('Failed to cleanup rate limits', { error: error.message });
  }
};