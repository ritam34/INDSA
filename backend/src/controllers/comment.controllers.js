import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import * as commentService from "../services/comment.service.js";

/**
 * @route   POST /api/discussions/:id/comments
 * @desc    Create comment on discussion
 * @access  Private
 */
export const createComment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comment = await commentService.createComment(id, req.body, req.user.id);

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment created successfully"));
});

/**
 * @route   PATCH /api/comments/:id
 * @desc    Update comment
 * @access  Private (Owner only)
 */
export const updateComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const comment = await commentService.updateComment(id, content, req.user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

/**
 * @route   DELETE /api/comments/:id
 * @desc    Delete comment
 * @access  Private (Owner/Admin)
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === "ADMIN" || req.user.role === "MODERATOR";

  const result = await commentService.deleteComment(id, req.user.id, isAdmin);

  return res.status(200).json(new ApiResponse(200, result, result.message));
});

/**
 * @route   POST /api/comments/:id/vote
 * @desc    Vote on comment
 * @access  Private
 */
export const voteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;

  const result = await commentService.voteComment(id, value, req.user.id);

  return res.status(200).json(new ApiResponse(200, result, result.message));
});

/**
 * @route   GET /api/comments/:id/replies
 * @desc    Get comment replies
 * @access  Public
 */
export const getCommentReplies = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const replies = await commentService.getCommentReplies(id);

  return res
    .status(200)
    .json(new ApiResponse(200, replies, "Replies fetched successfully"));
});