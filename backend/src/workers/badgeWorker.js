import { checkAndAwardBadges, awardBadge } from "../services/badge.service.js";

const processBadgeCheck = async (job) => {
  const { userId } = job.data;

  try {
    logger.info(`Checking badges for user ${userId}`);

    const newBadges = await checkAndAwardBadges(userId);

    logger.info(
      `Badge check complete for ${userId}: ${newBadges.length} new badges`,
    );

    return {
      userId,
      newBadges: newBadges.length,
      badges: newBadges,
    };
  } catch (error) {
    logger.error(`Failed to check badges for ${userId}:`, error);
    throw error;
  }
};

const processAwardBadge = async (job) => {
  const { userId, badgeId } = job.data;

  try {
    logger.info(`Awarding badge ${badgeId} to user ${userId}`);

    const result = await awardBadge(userId, badgeId);

    logger.info(`Badge awarded to ${userId}`);

    return result;
  } catch (error) {
    logger.error(`Failed to award badge to ${userId}:`, error);
    throw error;
  }
};

export const startBadgeWorker = () => {
  queues.badge.process("check-badges", 5, processBadgeCheck);
  queues.badge.process("award-badge", 5, processAwardBadge);

  logger.info("Badge worker started");
};

export { startBadgeWorker };
