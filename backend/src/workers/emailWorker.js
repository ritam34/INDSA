import { queues } from '../config/queue/queue.config.js';
import { sendEmail } from '../services/email.service.js';
import logger from '../utils/logger.js';

const processEmail = async (job) => {
  const { recipient, data, type } = job.data;

  try {
    logger.info(`Sending ${type} email to ${recipient.email}`);

    await sendEmail({
      to: recipient.email,
      subject: getEmailSubject(type, data),
      template: type,
      data: {
        ...data,
        recipientName: recipient.name
      }
    });

    logger.info(`Email sent successfully: ${type} to ${recipient.email}`);

    return {
      success: true,
      type,
      recipient: recipient.email
    };

  } catch (error) {
    logger.error(`Failed to send ${type} email to ${recipient.email}:`, error);
    throw error;
  }
};

const getEmailSubject = (type, data) => {
  const subjects = {
    'welcome': 'Welcome to LeetCode Clone! 🎉',
    'password-reset': 'Reset Your Password',
    'contest-reminder': `Contest Reminder: ${data.contestName}`,
    'badge-earned': `You earned a ${data.badgeTier} badge! 🏆`,
    'weekly-digest': 'Your Weekly Progress Report',
    'submission-accepted': 'Your Solution Was Accepted! ✅'
  };

  return subjects[type] || 'Notification from LeetCode Clone';
};

export const startEmailWorker = () => {
  queues.email.process(10, processEmail);

  logger.info('Email worker started (concurrency: 10)');
};

export{
     startEmailWorker
}