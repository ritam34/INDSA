import express from 'express';
import * as adminController from '../controllers/admin..controllers.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/role.middleware.js';
import { validate, validateParams } from '../middleware/validation.middleware.js';
import {
  updateUserRoleSchema,
  banUserSchema,
  moderateContentSchema,
  userIdSchema,
  contentIdSchema
} from '../validators/admin.validator.js';

const router = express.Router();

router.use(authenticate, isAdmin);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics overview
 * @access  Private (Admin only)
 */
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @route   GET /api/admin/analytics/users
 * @desc    Get user analytics
 * @access  Private (Admin only)
 */
router.get('/analytics/users', adminController.getUserAnalytics);

/**
 * @route   GET /api/admin/analytics/problems
 * @desc    Get problem analytics
 * @access  Private (Admin only)
 */
router.get('/analytics/problems', adminController.getProblemAnalytics);

/**
 * @route   GET /api/admin/analytics/submissions
 * @desc    Get submission analytics
 * @access  Private (Admin only)
 */
router.get('/analytics/submissions', adminController.getSubmissionAnalytics);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Private (Admin only)
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   PATCH /api/admin/users/:userId/role
 * @desc    Update user role
 * @access  Private (Admin only)
 */
router.patch(
  '/users/:userId/role',
  validateParams(userIdSchema),
  validate(updateUserRoleSchema),
  adminController.updateUserRole
);

/**
 * @route   POST /api/admin/users/:userId/ban
 * @desc    Ban user
 * @access  Private (Admin only)
 */
router.post(
  '/users/:userId/ban',
  validateParams(userIdSchema),
  validate(banUserSchema),
  adminController.banUser
);

/**
 * @route   POST /api/admin/users/:userId/unban
 * @desc    Unban user
 * @access  Private (Admin only)
 */
router.post(
  '/users/:userId/unban',
  validateParams(userIdSchema),
  adminController.unbanUser
);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user (hard delete)
 * @access  Private (Admin only)
 */
router.delete(
  '/users/:userId',
  validateParams(userIdSchema),
  adminController.deleteUser
);

/**
 * @route   GET /api/admin/moderation/pending
 * @desc    Get pending content for moderation
 * @access  Private (Admin only)
 */
router.get('/moderation/pending', adminController.getPendingContent);

/**
 * @route   POST /api/admin/moderation/:contentType/:contentId
 * @desc    Moderate content (approve/reject/delete)
 * @access  Private (Admin only)
 */
router.post(
  '/moderation/:contentType/:contentId',
  validate(moderateContentSchema),
  adminController.moderateContent
);

/**
 * @route   GET /api/admin/logs
 * @desc    Get system logs
 * @access  Private (Admin only)
 */
router.get('/logs', adminController.getSystemLogs);

export default router;