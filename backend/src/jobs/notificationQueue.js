export const sendNotification = async (notificationData) => {
  try {
    const job = await queues.notification.add(
      "send-notification",
      notificationData,
      {
        attempts: 3,
      },
    );

    logger.info("Notification job added", {
      jobId: job.id,
      userId: notificationData.userId,
    });

    return job;
  } catch (error) {
    logger.error("Failed to add notification job:", error);
    throw error;
  }
};

export const sendBatchNotifications = async (notifications) => {
  try {
    const jobs = notifications.map((notification) => ({
      name: "send-notification",
      data: notification,
      opts: {
        attempts: 3,
      },
    }));

    const addedJobs = await queues.notification.addBulk(jobs);

    logger.info(`Added ${addedJobs.length} notification jobs`);

    return addedJobs;
  } catch (error) {
    logger.error("Failed to add batch notification jobs:", error);
    throw error;
  }
};