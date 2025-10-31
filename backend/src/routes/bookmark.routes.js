import express from 'express';
import * as bookmarkController from '../controllers/bookmark.controllers.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, validateParams, validateQuery } from '../middleware/validation.middleware.js';
import {
  createBookmarkSchema,
  updateBookmarkSchema,
  bookmarkQuerySchema,
  bookmarkIdSchema
} from '../validators/bookmark.validator.js';

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/bookmarks/stats
 * @desc    Get bookmark statistics
 * @access  Private
 */
router.get('/stats', bookmarkController.getBookmarkStats);

/**
 * @route   GET /api/bookmarks/tags
 * @desc    Get user's bookmark tags
 * @access  Private
 */
router.get('/tags', bookmarkController.getUserBookmarkTags);

/**
 * @route   GET /api/bookmarks/check/:problemId
 * @desc    Check if problem is bookmarked
 * @access  Private
 */
router.get('/check/:problemId', bookmarkController.checkBookmark);

/**
 * @route   POST /api/bookmarks/toggle/:problemId
 * @desc    Toggle bookmark (add/remove)
 * @access  Private
 */
router.post('/toggle/:problemId', bookmarkController.toggleBookmark);

/**
 * @route   GET /api/bookmarks
 * @desc    Get user's bookmarks
 * @access  Private
 */
router.get(
  '/',
  validateQuery(bookmarkQuerySchema),
  bookmarkController.getUserBookmarks
);

/**
 * @route   POST /api/bookmarks
 * @desc    Create bookmark
 * @access  Private
 */
router.post(
  '/',
  validate(createBookmarkSchema),
  bookmarkController.createBookmark
);

/**
 * @route   GET /api/bookmarks/:id
 * @desc    Get bookmark by ID
 * @access  Private
 */
router.get(
  '/:id',
  validateParams(bookmarkIdSchema),
  bookmarkController.getBookmarkById
);

/**
 * @route   PATCH /api/bookmarks/:id
 * @desc    Update bookmark
 * @access  Private
 */
router.patch(
  '/:id',
  validateParams(bookmarkIdSchema),
  validate(updateBookmarkSchema),
  bookmarkController.updateBookmark
);

/**
 * @route   DELETE /api/bookmarks/:id
 * @desc    Delete bookmark
 * @access  Private
 */
router.delete(
  '/:id',
  validateParams(bookmarkIdSchema),
  bookmarkController.deleteBookmark
);

export default router;