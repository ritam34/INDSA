import express from 'express';
import * as userController from '../controllers/user.controllers.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  usernameParamSchema,
  userQuerySchema
} from '../validators/user.validator.js';

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (leaderboard)
 * @access  Public
 */
router.get(
  '/',
  validateQuery(userQuerySchema),
  userController.getAllUsers
);

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, userController.getCurrentUser);

/**
 * @route   PATCH /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  userController.updateProfile
);

/**
 * @route   DELETE /api/users/me
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/me', authenticate, userController.deleteAccount);

/**
 * @route   PATCH /api/users/password
 * @desc    Change password
 * @access  Private
 */
router.patch(
  '/password',
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword
);

/**
 * @route   GET /api/users/:username
 * @desc    Get user profile by username
 * @access  Public (with optional auth)
 */
router.get(
  '/:username',
  optionalAuth,
  validateParams(usernameParamSchema),
  userController.getUserProfile
);

/**
 * @route   GET /api/users/:username/stats
 * @desc    Get user statistics
 * @access  Public
 */
router.get(
  '/:username/stats',
  validateParams(usernameParamSchema),
  userController.getUserStats
);

/**
 * @route   GET /api/users/:username/submissions
 * @desc    Get user submissions
 * @access  Public
 */
router.get(
  '/:username/submissions',
  validateParams(usernameParamSchema),
  userController.getUserSubmissions
);

/**
 * @route   GET /api/users/:username/solved
 * @desc    Get user solved problems
 * @access  Public
 */
router.get(
  '/:username/solved',
  validateParams(usernameParamSchema),
  userController.getUserSolvedProblems
);

/**
 * @route   GET /api/users/:username/badges
 * @desc    Get user badges
 * @access  Public
 */
router.get(
  '/:username/badges',
  validateParams(usernameParamSchema),
  userController.getUserBadges
);

export default router;