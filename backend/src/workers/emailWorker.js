import { queues } from "../config/queue/queue.config.js";
import emailService from "../services/email.service.js";
import logger from "../utils/logger.js";

const processEmail = async (job) => {
  const { recipient, data, type } = job.data;

  try {
    logger.info(`Sending ${type} email to ${recipient.email}`);

    let result;

    switch (type) {
      case "welcome":
        result = await emailService.sendWelcomeEmail(
          recipient.email,
          recipient.name,
        );
        break;

      case "password-reset":
        result = await emailService.sendPasswordResetEmail(
          recipient.email,
          recipient.name,
          data.resetToken,
        );
        break;

      case "verification":
        result = await emailService.sendVerificationEmail(
          recipient.email,
          recipient.name,
          data.verificationToken,
        );
        break;

      case "badge-earned":
        result = await emailService.sendBadgeEmail(
          { email: recipient.email, fullName: recipient.name },
          data.badge,
        );
        break;

      case "contest-reminder":
        result = await emailService.sendContestReminderEmail(
          { email: recipient.email, fullName: recipient.name },
          data.contest,
          data.minutesUntilStart,
        );
        break;

      case "submission":
        result = await emailService.sendSubmissionEmail(
          { email: recipient.email, fullName: recipient.name },
          data.submission,
          data.problem,
        );
        break;

      case "discussion-reply":
        result = await emailService.sendDiscussionReplyEmail(
          { email: recipient.email, fullName: recipient.name },
          data.discussion,
          data.replierName,
          data.replyContent,
        );
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    logger.info(`Email sent successfully: ${type} to ${recipient.email}`);

    return {
      success: true,
      type,
      recipient: recipient.email,
      result,
    };
  } catch (error) {
    logger.error(`Failed to send ${type} email to ${recipient.email}:`, error);
    throw error;
  }
};

export const startEmailWorker = () => {
  if (!queues.email) {
    logger.warn("Email queue not initialized - email worker disabled");
    return;
  }

  queues.email.process(10, processEmail);

  logger.info("Email worker started (concurrency: 10)");
};

export default startEmailWorker;
