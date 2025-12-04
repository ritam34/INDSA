import { queues } from "../config/queue/queue.config.js";
import logger from "../utils/logger.js";

export const addEmailJob = async (emailData) => {
  try {
    const { type, recipient, data, priority = "normal" } = emailData;

    const job = await queues.email.add(
      type,
      {
        recipient,
        data,
        type,
      },
      {
        priority: priority === "high" ? 1 : priority === "low" ? 10 : 5,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    );

    logger.info("Email job added", {
      jobId: job.id,
      type,
      recipient: recipient.email,
    });

    return job;
  } catch (error) {
    logger.error("Failed to add email job:", error);
    throw error;
  }
};

export const sendWelcomeEmail = async (user) => {
  return addEmailJob({
    type: "welcome",
    recipient: {
      email: user.email,
      name: user.fullName,
    },
    data: {
      username: user.username,
      verificationLink: `${process.env.FRONTEND_URL}/verify-email/${user.verificationToken}`,
    },
    priority: "high",
  });
};

export const sendPasswordResetEmail = async (user, resetToken) => {
  return addEmailJob({
    type: "password-reset",
    recipient: {
      email: user.email,
      name: user.fullName,
    },
    data: {
      username: user.username,
      resetLink: `${process.env.FRONTEND_URL}/reset-password/${resetToken}`,
    },
    priority: "high",
  });
};

export const sendContestReminderEmail = async (user, contest) => {
  return addEmailJob({
    type: "contest-reminder",
    recipient: {
      email: user.email,
      name: user.fullName,
    },
    data: {
      contestName: contest.title,
      contestSlug: contest.slug,
      startTime: contest.startTime,
      contestLink: `${process.env.FRONTEND_URL}/contests/${contest.slug}`,
    },
    priority: "normal",
  });
};

export const sendBadgeEarnedEmail = async (user, badge) => {
  return addEmailJob({
    type: "badge-earned",
    recipient: {
      email: user.email,
      name: user.fullName,
    },
    data: {
      badgeName: badge.name,
      badgeDescription: badge.description,
      badgeTier: badge.tier,
      profileLink: `${process.env.FRONTEND_URL}/profile/${user.username}`,
    },
    priority: "low",
  });
};

export const sendBulkEmails = async (recipients, emailData) => {
  try {
    const jobs = recipients.map((recipient) => ({
      name: emailData.type,
      data: {
        recipient,
        data: emailData.data,
        type: emailData.type,
      },
      opts: {
        priority: 10,
        attempts: 3,
      },
    }));

    const addedJobs = await queues.email.addBulk(jobs);

    logger.info(`Added ${addedJobs.length} bulk email jobs`);

    return addedJobs;
  } catch (error) {
    logger.error("Failed to add bulk email jobs:", error);
    throw error;
  }
};

export const sendWeeklyDigestEmail = async (user, digestData) => {
  return addEmailJob({
    type: "weekly-digest",
    recipient: {
      email: user.email,
      name: user.fullName,
    },
    data: {
      problemsSolvedThisWeek: digestData.problemsSolved,
      currentStreak: digestData.streak,
      newBadges: digestData.badges,
      upcomingContests: digestData.contests,
    },
    priority: "low",
  });
};