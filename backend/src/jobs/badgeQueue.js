export const checkUserBadges = async (userId) => {
  try {
    const job = await queues.badge.add(
      'check-badges',
      { userId },
      {
        attempts: 3,
        delay: 2000
      }
    );

    logger.info('Badge check job added', { jobId: job.id, userId });
    return job;
  } catch (error) {
    logger.error('Failed to add badge check job:', error);
    throw error;
  }
};

export const batchCheckBadges = async (userIds) => {
  try {
    const jobs = userIds.map(userId => ({
      name: 'check-badges',
      data: { userId },
      opts: {
        attempts: 3,
        delay: 2000
      }
    }));

    const addedJobs = await queues.badge.addBulk(jobs);
    
    logger.info(`Added ${addedJobs.length} badge check jobs`);
    
    return addedJobs;
  } catch (error) {
    logger.error('Failed to add batch badge check jobs:', error);
    throw error;
  }
};

export const awardBadgeJob = async (userId, badgeId) => {
  try {
    const job = await queues.badge.add(
      'award-badge',
      { userId, badgeId },
      {
        attempts: 3
      }
    );

    logger.info('Award badge job added', { jobId: job.id, userId, badgeId });
    return job;
  } catch (error) {
    logger.error('Failed to add award badge job:', error);
    throw error;
  }
};