import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import notificationService from '../services/notification.service.js';

/**
 * Get user notifications
 * @route GET /api/notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, isRead, type } = req.query;

  const result = await notificationService.getUserNotifications(
    req.user.id,
    { page, limit, isRead, type }
  );

  res.status(200).json(
    new ApiResponse(200, result, 'Notifications retrieved successfully')
  );
});

/**
 * Get unread notifications count
 * @route GET /api/notifications/unread-count
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);

  res.status(200).json(
    new ApiResponse(200, { count }, 'Unread count retrieved successfully')
  );
});

/**
 * Mark notification as read
 * @route PATCH /api/notifications/:id/read
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.params.id,
    req.user.id
  );

  res.status(200).json(
    new ApiResponse(200, notification, 'Notification marked as read')
  );
});

/**
 * Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);

  res.status(200).json(
    new ApiResponse(
      200,
      { count: result.count },
      `${result.count} notification(s) marked as read`
    )
  );
});

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteNotification(
    req.params.id,
    req.user.id
  );

  res.status(200).json(
    new ApiResponse(200, null, result.message)
  );
});

/**
 * Delete all read notifications
 * @route DELETE /api/notifications/read
 */
export const deleteReadNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteReadNotifications(req.user.id);

  res.status(200).json(
    new ApiResponse(
      200,
      { count: result.count },
      `${result.count} notification(s) deleted`
    )
  );
});

/**
 * Get notification settings
 * @route GET /api/notifications/settings
 */
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await notificationService.getNotificationSettings(req.user.id);

  res.status(200).json(
    new ApiResponse(200, settings, 'Notification settings retrieved successfully')
  );
});

/**
 * Update notification settings
 * @route PATCH /api/notifications/settings
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await notificationService.updateNotificationSettings(
    req.user.id,
    req.body
  );

  res.status(200).json(
    new ApiResponse(200, settings, 'Notification settings updated successfully')
  );
});