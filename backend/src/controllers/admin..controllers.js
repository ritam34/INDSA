import * as adminService from '../services/admin.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();

  res.status(200).json(
    new ApiResponse(200, stats, 'Dashboard statistics retrieved successfully')
  );
});

/**
 * @desc    Get user analytics
 * @route   GET /api/admin/analytics/users
 * @access  Private (Admin only)
 */
export const getUserAnalytics = asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';

  const analytics = await adminService.getUserAnalytics(period);

  res.status(200).json(
    new ApiResponse(200, analytics, 'User analytics retrieved successfully')
  );
});

/**
 * @desc    Get problem analytics
 * @route   GET /api/admin/analytics/problems
 * @access  Private (Admin only)
 */
export const getProblemAnalytics = asyncHandler(async (req, res) => {
  const analytics = await adminService.getProblemAnalytics();

  res.status(200).json(
    new ApiResponse(200, analytics, 'Problem analytics retrieved successfully')
  );
});

/**
 * @desc    Get submission analytics
 * @route   GET /api/admin/analytics/submissions
 * @access  Private (Admin only)
 */
export const getSubmissionAnalytics = asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';

  const analytics = await adminService.getSubmissionAnalytics(period);

  res.status(200).json(
    new ApiResponse(200, analytics, 'Submission analytics retrieved successfully')
  );
});

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const filters = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    role: req.query.role,
    isActive: req.query.isActive,
    search: req.query.search,
    sortBy: req.query.sortBy || 'createdAt',
    order: req.query.order || 'desc'
  };

  const result = await adminService.getAllUsers(filters);

  res.status(200).json(
    new ApiResponse(200, result, 'Users retrieved successfully')
  );
});

/**
 * @desc    Update user role
 * @route   PATCH /api/admin/users/:userId/role
 * @access  Private (Admin only)
 */
export const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const adminId = req.user.id;

  const user = await adminService.updateUserRole(userId, role, adminId);

  res.status(200).json(
    new ApiResponse(200, user, 'User role updated successfully')
  );
});

/**
 * @desc    Ban user
 * @route   POST /api/admin/users/:userId/ban
 * @access  Private (Admin only)
 */
export const banUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const banData = req.body;
  const adminId = req.user.id;

  const user = await adminService.banUser(userId, banData, adminId);

  res.status(200).json(
    new ApiResponse(200, user, 'User banned successfully')
  );
});

/**
 * @desc    Unban user
 * @route   POST /api/admin/users/:userId/unban
 * @access  Private (Admin only)
 */
export const unbanUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const adminId = req.user.id;

  const user = await adminService.unbanUser(userId, adminId);

  res.status(200).json(
    new ApiResponse(200, user, 'User unbanned successfully')
  );
});

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:userId
 * @access  Private (Admin only)
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const adminId = req.user.id;

  await adminService.deleteUser(userId, adminId);

  res.status(200).json(
    new ApiResponse(200, null, 'User deleted successfully')
  );
});

/**
 * @desc    Get pending content for moderation
 * @route   GET /api/admin/moderation/pending
 * @access  Private (Admin only)
 */
export const getPendingContent = asyncHandler(async (req, res) => {
  const content = await adminService.getPendingContent();

  res.status(200).json(
    new ApiResponse(200, content, 'Pending content retrieved successfully')
  );
});

/**
 * @desc    Moderate content
 * @route   POST /api/admin/moderation/:contentType/:contentId
 * @access  Private (Admin only)
 */
export const moderateContent = asyncHandler(async (req, res) => {
  const { contentType, contentId } = req.params;
  const { action } = req.body;
  const adminId = req.user.id;

  const result = await adminService.moderateContent(
    contentType,
    contentId,
    action,
    adminId
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Content moderated successfully')
  );
});

/**
 * @desc    Get system logs
 * @route   GET /api/admin/logs
 * @access  Private (Admin only)
 */
export const getSystemLogs = asyncHandler(async (req, res) => {
  const filters = {
    level: req.query.level,
    limit: parseInt(req.query.limit) || 100
  };

  const logs = await adminService.getSystemLogs(filters);

  res.status(200).json(
    new ApiResponse(200, logs, 'System logs retrieved successfully')
  );
});