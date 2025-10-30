import express from 'express';
import * as discussionController from '../controllers/discussion.controllers.js';
import * as commentController from '../controllers/comment.controllers.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { isModerator } from '../middleware/role.middleware.js';
import { validate, validateParams, validateQuery } from '../middleware/validation.middleware.js';
import {
  createDiscussionSchema,
  updateDiscussionSchema,
  discussionQuerySchema,
  createCommentSchema,
  updateCommentSchema,
  voteSchema,
  discussionIdSchema,
  commentIdSchema
} from '../validators/discussion.validator.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

// DISCUSSION ROUTES

/**
 * @route   GET /api/discussions/user/:username
 * @desc    Get user's discussions
 * @access  Public
 */
router.get(
  '/user/:username',
  validateQuery(discussionQuerySchema),
  discussionController.getUserDiscussions
);

/**
 * @route   GET /api/discussions/problems/:slug
 * @desc    Get all discussions for a problem
 * @access  Public
 */
router.get(
  '/problems/:slug',
  validateQuery(discussionQuerySchema),
  discussionController.getProblemDiscussions
);

/**
 * @route   POST /api/discussions/problems/:slug
 * @desc    Create discussion for a problem
 * @access  Private
 */
router.post(
  '/problems/:slug',
  authenticate,
  rateLimit({ windowMs: 300000, maxRequests: 5, action: 'discussion' }), // 5 per 5 minutes
  validate(createDiscussionSchema),
  discussionController.createDiscussion
);

/**
 * @route   GET /api/discussions/:id
 * @desc    Get discussion by ID
 * @access  Public
 */
router.get(
  '/:id',
  validateParams(discussionIdSchema),
  discussionController.getDiscussionById
);

/**
 * @route   PATCH /api/discussions/:id
 * @desc    Update discussion
 * @access  Private (Owner only)
 */
router.patch(
  '/:id',
  authenticate,
  validateParams(discussionIdSchema),
  validate(updateDiscussionSchema),
  discussionController.updateDiscussion
);

/**
 * @route   DELETE /api/discussions/:id
 * @desc    Delete discussion
 * @access  Private (Owner/Admin)
 */
router.delete(
  '/:id',
  authenticate,
  validateParams(discussionIdSchema),
  discussionController.deleteDiscussion
);

/**
 * @route   POST /api/discussions/:id/vote
 * @desc    Vote on discussion
 * @access  Private
 */
router.post(
  '/:id/vote',
  authenticate,
  validateParams(discussionIdSchema),
  validate(voteSchema),
  discussionController.voteDiscussion
);

/**
 * @route   POST /api/discussions/:id/pin
 * @desc    Pin/Unpin discussion
 * @access  Private (Admin/Moderator)
 */
router.post(
  '/:id/pin',
  authenticate,
  isModerator,
  validateParams(discussionIdSchema),
  discussionController.togglePinDiscussion
);

/**
 * @route   POST /api/discussions/:id/lock
 * @desc    Lock/Unlock discussion
 * @access  Private (Admin/Moderator)
 */
router.post(
  '/:id/lock',
  authenticate,
  isModerator,
  validateParams(discussionIdSchema),
  discussionController.toggleLockDiscussion
);

// COMMENT ROUTES

/**
 * @route   POST /api/discussions/:id/comments
 * @desc    Create comment on discussion
 * @access  Private
 */
router.post(
  '/:id/comments',
  authenticate,
  rateLimit({ windowMs: 60000, maxRequests: 10, action: 'comment' }), // 10 per minute
  validateParams(discussionIdSchema),
  validate(createCommentSchema),
  commentController.createComment
);

/**
 * @route   PATCH /api/comments/:id
 * @desc    Update comment
 * @access  Private (Owner only)
 */
router.patch(
  '/comments/:id',
  authenticate,
  validateParams(commentIdSchema),
  validate(updateCommentSchema),
  commentController.updateComment
);

/**
 * @route   DELETE /api/comments/:id
 * @desc    Delete comment
 * @access  Private (Owner/Admin)
 */
router.delete(
  '/comments/:id',
  authenticate,
  validateParams(commentIdSchema),
  commentController.deleteComment
);

/**
 * @route   POST /api/comments/:id/vote
 * @desc    Vote on comment
 * @access  Private
 */
router.post(
  '/comments/:id/vote',
  authenticate,
  validateParams(commentIdSchema),
  validate(voteSchema),
  commentController.voteComment
);

/**
 * @route   GET /api/comments/:id/replies
 * @desc    Get comment replies
 * @access  Public
 */
router.get(
  '/comments/:id/replies',
  validateParams(commentIdSchema),
  commentController.getCommentReplies
);

export default router;