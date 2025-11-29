import express from 'express';
import {
  getAllBadges,
  getBadgeById,
  getMyBadges,
  getUserBadges,
  checkEligibility,
  getBadgeProgress,
  getBadgeLeaderboard,
  getRarityStatistics,
  createBadge,
  updateBadge,
  deleteBadge
} from '../controllers/badge.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  createBadgeSchema,
  updateBadgeSchema,
  getBadgesQuerySchema,
  leaderboardQuerySchema
} from '../validators/badge.validator.js';

const router = express.Router();

router.get(
  '/',
  validate(getBadgesQuerySchema, 'query'),
  getAllBadges
);

router.get(
  '/leaderboard',
  validate(leaderboardQuerySchema, 'query'),
  getBadgeLeaderboard
);

router.get(
  '/statistics/rarity',
  getRarityStatistics
);

router.get(
  '/:id',
  getBadgeById
);

router.get(
  '/user/:username',
  validate(getBadgesQuerySchema, 'query'),
  getUserBadges
);

router.use(authenticate);

router.get(
  '/me/badges',
  validate(getBadgesQuerySchema, 'query'),
  getMyBadges
);

router.post(
  '/check-eligibility',
  checkEligibility
);

router.get(
  '/:id/progress',
  getBadgeProgress
);

router.post(
  '/',
  isAdmin,
  validate(createBadgeSchema),
  createBadge
);

router.patch(
  '/:id',
  isAdmin,
  validate(updateBadgeSchema),
  updateBadge
);

router.delete(
  '/:id',
  isAdmin,
  deleteBadge
);

export default router;