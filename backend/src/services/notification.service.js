import { prisma } from "../config/database.config.js";
import { ApiError } from "../utils/apiError.js";
import {
  sanitizePaginationParams,
  createPaginatedResponse,
} from "../utils/pagination.utils.js";
import logger from "../utils/logger.js";

class NotificationService {
  async createNotification(data) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || null,
          link: data.link || null,
          isRead: false,
        },
      });

      logger.info("Notification created", {
        notificationId: notification.id,
        userId: data.userId,
        type: data.type,
      });

      return notification;
    } catch (error) {
      logger.error("Failed to create notification", {
        error: error.message,
        data,
      });
      throw error;
    }
  }

  async createBadgeNotification(userId, badge) {
    return this.createNotification({
      userId,
      type: "ACHIEVEMENT",
      title: "New Badge Earned!",
      message: `Congratulations! You've earned the "${badge.name}" badge!`,
      data: {
        badgeId: badge.id,
        badgeName: badge.name,
        badgeIcon: badge.icon,
        badgeRarity: badge.rarity,
        badgePoints: badge.points,
      },
      link: `/badges/${badge.slug}`,
    });
  }

  async createSubmissionNotification(userId, submission, problem) {
    const isAccepted = submission.status === "ACCEPTED";

    return this.createNotification({
      userId,
      type: "SUBMISSION",
      title: isAccepted ? "Solution Accepted!" : "Submission Failed",
      message: isAccepted
        ? `Your solution to "${problem.title}" was accepted!`
        : `Your solution to "${problem.title}" failed with status: ${submission.status}`,
      data: {
        submissionId: submission.id,
        problemId: problem.id,
        problemSlug: problem.slug,
        status: submission.status,
        passedTests: submission.passedTests,
        totalTests: submission.totalTests,
      },
      link: `/submissions/${submission.id}`,
    });
  }

  async createDiscussionReplyNotification(
    authorId,
    discussion,
    comment,
    replierUsername,
  ) {
    return this.createNotification({
      userId: authorId,
      type: "DISCUSSION",
      title: "New Reply to Your Discussion",
      message: `${replierUsername} replied to your discussion: "${discussion.title}"`,
      data: {
        discussionId: discussion.id,
        commentId: comment.id,
        replierUsername,
      },
      link: `/problems/${discussion.problem.slug}/discussions/${discussion.id}`,
    });
  }

  async createCommentReplyNotification(
    authorId,
    comment,
    reply,
    replierUsername,
  ) {
    return this.createNotification({
      userId: authorId,
      type: "COMMENT",
      title: "New Reply to Your Comment",
      message: `${replierUsername} replied to your comment`,
      data: {
        commentId: comment.id,
        replyId: reply.id,
        replierUsername,
      },
      link: `/discussions/${comment.discussionId}#comment-${reply.id}`,
    });
  }

  async createContestNotification(userId, contest, type = "STARTING") {
    const messages = {
      STARTING: {
        title: "Contest Starting Soon!",
        message: `Contest "${contest.title}" starts in 1 hour!`,
      },
      STARTED: {
        title: "Contest Started!",
        message: `Contest "${contest.title}" has started. Good luck!`,
      },
      ENDING: {
        title: "Contest Ending Soon!",
        message: `Contest "${contest.title}" ends in 15 minutes!`,
      },
      ENDED: {
        title: "Contest Ended!",
        message: `Contest "${contest.title}" has ended. Check your ranking!`,
      },
    };

    const config = messages[type] || messages.STARTING;

    return this.createNotification({
      userId,
      type: "CONTEST",
      title: config.title,
      message: config.message,
      data: {
        contestId: contest.id,
        contestSlug: contest.slug,
        contestType: type,
      },
      link: `/contests/${contest.slug}`,
    });
  }

  async createSystemNotification(userId, title, message, data = null) {
    return this.createNotification({
      userId,
      type: "SYSTEM",
      title,
      message,
      data,
      link: null,
    });
  }

  async bulkCreateNotifications(userIds, notificationData) {
    try {
      const notifications = userIds.map((userId) => ({
        userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || null,
        link: notificationData.link || null,
        isRead: false,
      }));

      const created = await prisma.notification.createMany({
        data: notifications,
      });

      logger.info("Bulk notifications created", {
        count: created.count,
        type: notificationData.type,
      });

      return created;
    } catch (error) {
      logger.error("Failed to create bulk notifications", {
        error: error.message,
        userCount: userIds.length,
      });
      throw error;
    }
  }

  async getUserNotifications(userId, filters = {}) {
    const { page = 1, limit = 20, isRead, type } = filters;
    const { skip, limit: pageLimit } = sanitizePaginationParams(page, limit);

    const where = {
      userId,
      ...(isRead !== undefined && { isRead: isRead === "true" }),
      ...(type && { type }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageLimit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    return {
      ...createPaginatedResponse(notifications, page, limit, total),
      unreadCount,
    };
  }

  async getUnreadCount(userId) {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return count;
  }

  async markAsRead(notificationId, userId) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }

    if (notification.userId !== userId) {
      throw new ApiError(
        403,
        "You do not have permission to update this notification",
      );
    }

    if (notification.isRead) {
      return notification;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return updated;
  }

  async markAllAsRead(userId) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    logger.info("Marked all notifications as read", {
      userId,
      count: result.count,
    });

    return result;
  }

  async deleteNotification(notificationId, userId) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new ApiError(404, "Notification not found");
    }

    if (notification.userId !== userId) {
      throw new ApiError(
        403,
        "You do not have permission to delete this notification",
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: "Notification deleted successfully" };
  }

  async deleteReadNotifications(userId) {
    const result = await prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
      },
    });

    logger.info("Deleted read notifications", {
      userId,
      count: result.count,
    });

    return result;
  }

  async getNotificationSettings(userId) {
    let settings = await prisma.notificationSetting.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.notificationSetting.create({
        data: {
          userId,
          emailOnSubmission: true,
          emailOnDiscussionReply: true,
          emailOnCommentReply: true,
          emailOnContest: true,
          emailOnAchievement: true,
          emailOnSystemUpdate: true,
          pushOnSubmission: false,
          pushOnDiscussionReply: true,
          pushOnCommentReply: true,
          pushOnContest: true,
          pushOnAchievement: true,
          weeklyDigest: true,
          marketingEmails: false,
        },
      });
    }

    return settings;
  }

  async updateNotificationSettings(userId, updates) {
    const settings = await prisma.notificationSetting.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });

    logger.info("Notification settings updated", {
      userId,
      updates: Object.keys(updates),
    });

    return settings;
  }

  async isNotificationEnabled(userId, notificationType) {
    const settings = await this.getNotificationSettings(userId);

    const typeMap = {
      SUBMISSION: "emailOnSubmission",
      DISCUSSION: "emailOnDiscussionReply",
      COMMENT: "emailOnCommentReply",
      CONTEST: "emailOnContest",
      ACHIEVEMENT: "emailOnAchievement",
      SYSTEM: "emailOnSystemUpdate",
    };

    const settingKey = typeMap[notificationType];
    return settingKey ? settings[settingKey] : true;
  }

  async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
        isRead: true,
      },
    });

    logger.info("Cleaned up old notifications", {
      count: result.count,
      olderThan: thirtyDaysAgo,
    });

    return result;
  }
}

export default new NotificationService();