import { initializeQueues, closeQueues } from '../config/queue/queue.config.js';
import { startSubmissionWorker } from './submissionWorker.js';
import { 
  startEmailWorker, 
  startStatsWorker, 
  startBadgeWorker,
  startNotificationWorker 
} from './emailWorker.js';
import logger from '../utils/logger.js';

export const startAllWorkers = async () => {
  try {
    logger.info('Starting all workers...');

    await initializeQueues();

    startSubmissionWorker();
    startEmailWorker();
    startStatsWorker();
    startBadgeWorker();
    startNotificationWorker();

    logger.info('All workers started successfully');

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing workers...');
      await closeQueues();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, closing workers...');
      await closeQueues();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start workers:', error);
    throw error;
  }
};

export const stopAllWorkers = async () => {
  try {
    logger.info('Stopping all workers...');
    await closeQueues();
    logger.info('All workers stopped');
  } catch (error) {
    logger.error('Error stopping workers:', error);
    throw error;
  }
};

export default startAllWorkers;