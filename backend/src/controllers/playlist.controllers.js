import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import * as playlistService from "../services/playlist.service.js";

/**
 * @route   POST /api/playlists
 * @desc    Create playlist
 * @access  Private
 */
export const createPlaylist = asyncHandler(async (req, res) => {
  const playlist = await playlistService.createPlaylist(req.body, req.user.id);

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

/**
 * @route   GET /api/playlists/discover
 * @desc    Get public playlists
 * @access  Public
 */
export const getPublicPlaylists = asyncHandler(async (req, res) => {
  const playlists = await playlistService.getPublicPlaylists(req.query);

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "Public playlists fetched successfully"),
    );
});

/**
 * @route   GET /api/playlists/user/:username
 * @desc    Get user's playlists
 * @access  Public
 */
export const getUserPlaylists = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user?.id;

  const playlists = await playlistService.getUserPlaylists(
    username,
    req.query,
    currentUserId,
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "User playlists fetched successfully"),
    );
});

/**
 * @route   GET /api/playlists/:id
 * @desc    Get playlist by ID
 * @access  Public
 */
export const getPlaylistById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;

  const playlist = await playlistService.getPlaylistById(id, currentUserId);

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

/**
 * @route   GET /api/playlists/user/:username/:slug
 * @desc    Get playlist by slug
 * @access  Public
 */
export const getPlaylistBySlug = asyncHandler(async (req, res) => {
  const { username, slug } = req.params;
  const currentUserId = req.user?.id;

  const playlist = await playlistService.getPlaylistBySlug(
    username,
    slug,
    currentUserId,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

/**
 * @route   PATCH /api/playlists/:id
 * @desc    Update playlist
 * @access  Private (Owner only)
 */
export const updatePlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const playlist = await playlistService.updatePlaylist(
    id,
    req.body,
    req.user.id,
  );

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

/**
 * @route   DELETE /api/playlists/:id
 * @desc    Delete playlist
 * @access  Private (Owner only)
 */
export const deletePlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await playlistService.deletePlaylist(id, req.user.id);

  return res.status(200).json(new ApiResponse(200, result, result.message));
});

/**
 * @route   POST /api/playlists/:id/problems
 * @desc    Add problem to playlist
 * @access  Private (Owner only)
 */
export const addProblemToPlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const problem = await playlistService.addProblemToPlaylist(
    id,
    req.body,
    req.user.id,
  );

  return res
    .status(201)
    .json(
      new ApiResponse(201, problem, "Problem added to playlist successfully"),
    );
});

/**
 * @route   DELETE /api/playlists/:id/problems/:problemId
 * @desc    Remove problem from playlist
 * @access  Private (Owner only)
 */
export const removeProblemFromPlaylist = asyncHandler(async (req, res) => {
  const { id, problemId } = req.params;

  const result = await playlistService.removeProblemFromPlaylist(
    id,
    problemId,
    req.user.id,
  );

  return res.status(200).json(new ApiResponse(200, result, result.message));
});

/**
 * @route   PATCH /api/playlists/:id/reorder
 * @desc    Reorder problems in playlist
 * @access  Private (Owner only)
 */
export const reorderProblems = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { problemOrders } = req.body;

  const result = await playlistService.reorderProblems(
    id,
    problemOrders,
    req.user.id,
  );

  return res.status(200).json(new ApiResponse(200, result, result.message));
});