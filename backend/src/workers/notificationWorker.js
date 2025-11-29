import { createNotification } from "../services/notification.service.js";

const processNotification = async (job) => {
  const { userId, type, title, message, data } = job.data;

  try {
    logger.info(`Sending notification to user ${userId}`);

    await createNotification({
      userId,
      type,
      title,
      message,
      data,
    });

    logger.info(`Notification sent to ${userId}`);

    return { userId, type };
  } catch (error) {
    logger.error(`Failed to send notification to ${userId}:`, error);
    throw error;
  }
};

export const startNotificationWorker = () => {
  queues.notification.process("send-notification", 10, processNotification);

  logger.info("Notification worker started (concurrency: 10)");
};

export {
  startNotificationWorker
};
