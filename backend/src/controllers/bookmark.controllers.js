import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import * as bookmarkService from "../services/bookmark.service.js";

/**
 * @route   POST /api/bookmarks
 * @desc    Create bookmark
 * @access  Private
 */
export const createBookmark = asyncHandler(async (req, res) => {
  const bookmark = await bookmarkService.createBookmark(req.body, req.user.id);

  return res
    .status(201)
    .json(new ApiResponse(201, bookmark, "Bookmark created successfully"));
});

/**
 * @route   GET /api/bookmarks
 * @desc    Get user's bookmarks
 * @access  Private
 */
export const getUserBookmarks = asyncHandler(async (req, res) => {
  const bookmarks = await bookmarkService.getUserBookmarks(
    req.user.id,
    req.query,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, bookmarks, "Bookmarks fetched successfully"));
});

/**
 * @route   GET /api/bookmarks/stats
 * @desc    Get bookmark statistics
 * @access  Private
 */
export const getBookmarkStats = asyncHandler(async (req, res) => {
  const stats = await bookmarkService.getBookmarkStats(req.user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Bookmark stats fetched successfully"));
});

/**
 * @route   GET /api/bookmarks/tags
 * @desc    Get user's bookmark tags
 * @access  Private
 */
export const getUserBookmarkTags = asyncHandler(async (req, res) => {
  const tags = await bookmarkService.getUserBookmarkTags(req.user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, tags, "Bookmark tags fetched successfully"));
});

/**
 * @route   GET /api/bookmarks/:id
 * @desc    Get bookmark by ID
 * @access  Private
 */
export const getBookmarkById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bookmark = await bookmarkService.getBookmarkById(id, req.user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, bookmark, "Bookmark fetched successfully"));
});

/**
 * @route   PATCH /api/bookmarks/:id
 * @desc    Update bookmark
 * @access  Private
 */
export const updateBookmark = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bookmark = await bookmarkService.updateBookmark(
    id,
    req.body,
    req.user.id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, bookmark, "Bookmark updated successfully"));
});

/**
 * @route   DELETE /api/bookmarks/:id
 * @desc    Delete bookmark
 * @access  Private
 */
export const deleteBookmark = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await bookmarkService.deleteBookmark(id, req.user.id);

  return res.status(200).json(new ApiResponse(200, result, result.message));
});

/**
 * @route   POST /api/bookmarks/toggle/:problemId
 * @desc    Toggle bookmark (add/remove)
 * @access  Private
 */
export const toggleBookmark = asyncHandler(async (req, res) => {
  const { problemId } = req.params;

  const result = await bookmarkService.toggleBookmark(problemId, req.user.id);

  return res.status(200).json(new ApiResponse(200, result, result.message));
});

/**
 * @route   GET /api/bookmarks/check/:problemId
 * @desc    Check if problem is bookmarked
 * @access  Private
 */
export const checkBookmark = asyncHandler(async (req, res) => {
  const { problemId } = req.params;

  const result = await bookmarkService.isBookmarked(problemId, req.user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Bookmark status checked"));
});