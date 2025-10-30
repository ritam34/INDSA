import express from 'express';
import * as playlistController from '../controllers/playlist.controllers.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { validate, validateParams, validateQuery } from '../middleware/validation.middleware.js';
import {
  createPlaylistSchema,
  updatePlaylistSchema,
  addProblemSchema,
  reorderProblemsSchema,
  playlistQuerySchema,
  playlistIdSchema,
  playlistSlugSchema
} from '../validators/playlist.validator.js';

const router = express.Router();

/**
 * @route   GET /api/playlists/discover
 * @desc    Get public playlists
 * @access  Public
 */
router.get(
  '/discover',
  validateQuery(playlistQuerySchema),
  playlistController.getPublicPlaylists
);

/**
 * @route   GET /api/playlists/user/:username
 * @desc    Get user's playlists
 * @access  Public
 */
router.get(
  '/user/:username',
  optionalAuth,
  validateQuery(playlistQuerySchema),
  playlistController.getUserPlaylists
);

/**
 * @route   GET /api/playlists/user/:username/:slug
 * @desc    Get playlist by slug
 * @access  Public
 */
router.get(
  '/user/:username/:slug',
  optionalAuth,
  playlistController.getPlaylistBySlug
);

/**
 * @route   POST /api/playlists
 * @desc    Create playlist
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validate(createPlaylistSchema),
  playlistController.createPlaylist
);

/**
 * @route   GET /api/playlists/:id
 * @desc    Get playlist by ID
 * @access  Public
 */
router.get(
  '/:id',
  optionalAuth,
  validateParams(playlistIdSchema),
  playlistController.getPlaylistById
);

/**
 * @route   PATCH /api/playlists/:id
 * @desc    Update playlist
 * @access  Private (Owner only)
 */
router.patch(
  '/:id',
  authenticate,
  validateParams(playlistIdSchema),
  validate(updatePlaylistSchema),
  playlistController.updatePlaylist
);

/**
 * @route   DELETE /api/playlists/:id
 * @desc    Delete playlist
 * @access  Private (Owner only)
 */
router.delete(
  '/:id',
  authenticate,
  validateParams(playlistIdSchema),
  playlistController.deletePlaylist
);

/**
 * @route   POST /api/playlists/:id/problems
 * @desc    Add problem to playlist
 * @access  Private (Owner only)
 */
router.post(
  '/:id/problems',
  authenticate,
  validateParams(playlistIdSchema),
  validate(addProblemSchema),
  playlistController.addProblemToPlaylist
);

/**
 * @route   DELETE /api/playlists/:id/problems/:problemId
 * @desc    Remove problem from playlist
 * @access  Private (Owner only)
 */
router.delete(
  '/:id/problems/:problemId',
  authenticate,
  validateParams(playlistIdSchema),
  playlistController.removeProblemFromPlaylist
);

/**
 * @route   PATCH /api/playlists/:id/reorder
 * @desc    Reorder problems in playlist
 * @access  Private (Owner only)
 */
router.patch(
  '/:id/reorder',
  authenticate,
  validateParams(playlistIdSchema),
  validate(reorderProblemsSchema),
  playlistController.reorderProblems
);

export default router;