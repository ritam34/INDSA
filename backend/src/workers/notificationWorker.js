import { queues } from "../config/queue/queue.config.js";
import { prisma } from "../config/database.config.js";
import logger from "../utils/logger.js";

const processNotification = async (job) => {
  const { userId, type, title, message, data } = job.data;

  try {
    logger.info(`Sending notification to user ${userId}`);

    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || {},
      },
    });

    logger.info(`Notification sent to ${userId}`);

    return { userId, type };
  } catch (error) {
    logger.error(`Failed to send notification to ${userId}:`, error);
    throw error;
  }
};

export const startNotificationWorker = () => {
  if (!queues.notification) {
    logger.warn(
      "Notification queue not initialized - notification worker disabled",
    );
    return;
  }

  queues.notification.process("send-notification", 10, processNotification);

  logger.info("Notification worker started (concurrency: 10)");
};

export default startNotificationWorker;
