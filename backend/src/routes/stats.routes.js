import express from 'express';
import * as statsController from '../controllers/stats.controllers.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/role.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/stats/leaderboard
 * @desc    Get global leaderboard
 * @access  Public
 */
router.get('/leaderboard', statsController.getLeaderboard);

/**
 * @route   POST /api/stats/update-rankings
 * @desc    Update global rankings (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/update-rankings',
  authenticate,
  isAdmin,
  statsController.updateRankings
);

export default router;