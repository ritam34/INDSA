import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import * as discussionService from '../services/discussion.service.js';

/**
 * @route   POST /api/discussions/problems/:slug
 * @desc    Create discussion for a problem
 * @access  Private
 */
export const createDiscussion = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  const discussion = await discussionService.createDiscussion(
    slug,
    req.body,
    req.user.id
  );
  
  return res.status(201).json(
    new ApiResponse(201, discussion, 'Discussion created successfully')
  );
});

/**
 * @route   GET /api/discussions/problems/:slug
 * @desc    Get all discussions for a problem
 * @access  Public
 */
export const getProblemDiscussions = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  const discussions = await discussionService.getProblemDiscussions(
    slug,
    req.query
  );
  
  return res.status(200).json(
    new ApiResponse(200, discussions, 'Discussions fetched successfully')
  );
});

/**
 * @route   GET /api/discussions/:id
 * @desc    Get discussion by ID
 * @access  Public
 */
export const getDiscussionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const discussion = await discussionService.getDiscussionById(id);
  
  return res.status(200).json(
    new ApiResponse(200, discussion, 'Discussion fetched successfully')
  );
});

/**
 * @route   PATCH /api/discussions/:id
 * @desc    Update discussion
 * @access  Private (Owner only)
 */
export const updateDiscussion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const discussion = await discussionService.updateDiscussion(
    id,
    req.body,
    req.user.id
  );
  
  return res.status(200).json(
    new ApiResponse(200, discussion, 'Discussion updated successfully')
  );
});

/**
 * @route   DELETE /api/discussions/:id
 * @desc    Delete discussion
 * @access  Private (Owner/Admin)
 */
export const deleteDiscussion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'MODERATOR';
  
  const result = await discussionService.deleteDiscussion(
    id,
    req.user.id,
    isAdmin
  );
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   POST /api/discussions/:id/vote
 * @desc    Vote on discussion (upvote/downvote)
 * @access  Private
 */
export const voteDiscussion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;
  
  const result = await discussionService.voteDiscussion(
    id,
    value,
    req.user.id
  );
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   POST /api/discussions/:id/pin
 * @desc    Pin/Unpin discussion
 * @access  Private (Admin/Moderator)
 */
export const togglePinDiscussion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await discussionService.togglePinDiscussion(id);
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   POST /api/discussions/:id/lock
 * @desc    Lock/Unlock discussion
 * @access  Private (Admin/Moderator)
 */
export const toggleLockDiscussion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await discussionService.toggleLockDiscussion(id);
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   GET /api/discussions/user/:username
 * @desc    Get user's discussions
 * @access  Public
 */
export const getUserDiscussions = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  const discussions = await discussionService.getUserDiscussions(
    username,
    req.query
  );
  
  return res.status(200).json(
    new ApiResponse(200, discussions, 'User discussions fetched successfully')
  );
});