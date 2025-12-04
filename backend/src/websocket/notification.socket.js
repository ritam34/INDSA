import { getIO } from "../config/websocket.config.js";
import { prisma } from "../config/database.config.js";
import logger from "../utils/logger.js";

export const setupNotificationSocket = (io) => {
  io.on("connection", async (socket) => {
    try {
      const unreadCount = await prisma.notification.count({
        where: {
          userId: socket.userId,
          isRead: false,
        },
      });

      socket.emit("notification:unread:count", {
        count: unreadCount,
      });
    } catch (error) {
      logger.error("Failed to send unread count:", error);
    }

    socket.on("notification:read", async (notificationId) => {
      try {
        await prisma.notification.update({
          where: {
            id: notificationId,
            userId: socket.userId,
          },
          data: {
            isRead: true,
          },
        });

        const unreadCount = await prisma.notification.count({
          where: {
            userId: socket.userId,
            isRead: false,
          },
        });

        socket.emit("notification:unread:count", {
          count: unreadCount,
        });

        logger.debug(`Notification ${notificationId} marked as read`);
      } catch (error) {
        logger.error("Failed to mark notification as read:", error);
      }
    });

    socket.on("notification:read:all", async () => {
      try {
        await prisma.notification.updateMany({
          where: {
            userId: socket.userId,
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });

        socket.emit("notification:unread:count", {
          count: 0,
        });

        socket.emit("notification:read:all:success", {
          message: "All notifications marked as read",
        });

        logger.debug(
          `All notifications marked as read for user ${socket.userId}`,
        );
      } catch (error) {
        logger.error("Failed to mark all notifications as read:", error);
      }
    });

    socket.on(
      "notification:list:request",
      async ({ limit = 20, offset = 0 }) => {
        try {
          const notifications = await prisma.notification.findMany({
            where: {
              userId: socket.userId,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: limit,
            skip: offset,
          });

          socket.emit("notification:list", {
            notifications,
            limit,
            offset,
          });
        } catch (error) {
          logger.error("Failed to fetch notifications:", error);
          socket.emit("notification:error", {
            message: "Failed to fetch notifications",
          });
        }
      },
    );
  });
};

export const emitNotification = async (userId, notification) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("notification:new", {
      notification,
      timestamp: new Date(),
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    io.to(`user:${userId}`).emit("notification:unread:count", {
      count: unreadCount,
    });

    logger.debug(`Notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Failed to emit notification:", error);
  }
};

export const emitBadgeEarned = (userId, badge) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("badge:earned", {
      badge: {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
      },
      message: `🎉 Congratulations! You earned the "${badge.name}" badge!`,
      timestamp: new Date(),
    });

    logger.info(`Badge earned notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Failed to emit badge earned:", error);
  }
};

export const emitProblemMilestone = (userId, milestone) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("milestone:achieved", {
      type: "PROBLEM_SOLVED",
      milestone,
      message: `🎯 Milestone achieved! You've solved ${milestone} problems!`,
      timestamp: new Date(),
    });

    logger.info(`Milestone notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Failed to emit milestone:", error);
  }
};

export const emitStreakMilestone = (userId, streak) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("milestone:achieved", {
      type: "STREAK",
      streak,
      message: `🔥 Amazing! ${streak} day streak!`,
      timestamp: new Date(),
    });

    logger.info(`Streak milestone notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Failed to emit streak milestone:", error);
  }
};

export const emitDiscussionReply = (userId, reply) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("discussion:reply", {
      reply: {
        id: reply.id,
        discussionId: reply.discussionId,
        content: reply.content,
        author: reply.user?.username,
      },
      message: "Someone replied to your discussion",
      timestamp: new Date(),
    });

    logger.debug(`Discussion reply notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Failed to emit discussion reply:", error);
  }
};

export const emitCommentReply = (userId, reply) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("comment:reply", {
      reply: {
        id: reply.id,
        commentId: reply.parentId,
        content: reply.content,
        author: reply.user?.username,
      },
      message: "Someone replied to your comment",
      timestamp: new Date(),
    });

    logger.debug(`Comment reply notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Failed to emit comment reply:", error);
  }
};

export const emitSolutionUpvote = (userId, solution) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("solution:upvote", {
      solutionId: solution.id,
      upvotes: solution.upvotes,
      message: "Someone upvoted your solution! 👍",
      timestamp: new Date(),
    });

    logger.debug(`Solution upvote notification sent to user ${userId}`);
  } catch (error) {
    logger.error("Failed to emit solution upvote:", error);
  }
};

export const emitSystemAnnouncement = (announcement) => {
  try {
    const io = getIO();

    io.emit("system:announcement", {
      announcement,
      timestamp: new Date(),
    });

    logger.info("System announcement broadcasted");
  } catch (error) {
    logger.error("Failed to emit system announcement:", error);
  }
};

export const emitStatsUpdate = (userId, stats) => {
  try {
    const io = getIO();

    io.to(`user:${userId}`).emit("stats:update", {
      stats: {
        totalSolved: stats.totalSolved,
        easyProblemsSolved: stats.easyProblemsSolved,
        mediumProblemsSolved: stats.mediumProblemsSolved,
        hardProblemsSolved: stats.hardProblemsSolved,
        streak: stats.streak,
        globalRanking: stats.globalRanking,
      },
      timestamp: new Date(),
    });

    logger.debug(`Stats update sent to user ${userId}`);
  } catch (error) {
    logger.error("Failed to emit stats update:", error);
  }
};

export const emitOnlineUsersCount = async () => {
  try {
    const io = getIO();
    const sockets = await io.fetchSockets();
    const count = sockets.length;

    io.emit("users:online:count", {
      count,
      timestamp: new Date(),
    });

    logger.debug(`Online users count: ${count}`);
  } catch (error) {
    logger.error("Failed to emit online users count:", error);
  }
};

export default {
  setupNotificationSocket,
  emitNotification,
  emitBadgeEarned,
  emitProblemMilestone,
  emitStreakMilestone,
  emitDiscussionReply,
  emitCommentReply,
  emitSolutionUpvote,
  emitSystemAnnouncement,
  emitStatsUpdate,
  emitOnlineUsersCount,
};
