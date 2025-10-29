import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import * as userService from '../services/user.service.js';

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await userService.getCurrentUser(req.user.id);
  
  return res.status(200).json(
    new ApiResponse(200, user, 'Profile fetched successfully')
  );
});

/**
 * @route   GET /api/users/:username
 * @desc    Get user profile by username
 * @access  Public
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user?.id;
  
  const user = await userService.getUserProfile(username, currentUserId);
  
  return res.status(200).json(
    new ApiResponse(200, user, 'User profile fetched successfully')
  );
});

/**
 * @route   PATCH /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateProfile(req.user.id, req.body);
  
  return res.status(200).json(
    new ApiResponse(200, updatedUser, 'Profile updated successfully')
  );
});

/**
 * @route   PATCH /api/users/password
 * @desc    Change password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  const result = await userService.changePassword(
    req.user.id, 
    currentPassword, 
    newPassword
  );
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   DELETE /api/users/me
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  const result = await userService.deleteAccount(req.user.id);
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   GET /api/users/:username/stats
 * @desc    Get user statistics
 * @access  Public
 */
export const getUserStats = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  const stats = await userService.getUserStats(username);
  
  return res.status(200).json(
    new ApiResponse(200, stats, 'User stats fetched successfully')
  );
});

/**
 * @route   GET /api/users/:username/submissions
 * @desc    Get user submissions
 * @access  Public
 */
export const getUserSubmissions = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  const submissions = await userService.getUserSubmissions(username, page, limit);
  
  return res.status(200).json(
    new ApiResponse(200, submissions, 'User submissions fetched successfully')
  );
});

/**
 * @route   GET /api/users/:username/solved
 * @desc    Get user solved problems
 * @access  Public
 */
export const getUserSolvedProblems = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page = 1, limit = 20, difficulty } = req.query;
  
  const solvedProblems = await userService.getUserSolvedProblems(
    username, 
    page, 
    limit, 
    difficulty
  );
  
  return res.status(200).json(
    new ApiResponse(200, solvedProblems, 'Solved problems fetched successfully')
  );
});

/**
 * @route   GET /api/users
 * @desc    Get all users (leaderboard)
 * @access  Public
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const filters = req.query;
  
  const users = await userService.getAllUsers(filters);
  
  return res.status(200).json(
    new ApiResponse(200, users, 'Users fetched successfully')
  );
});

/**
 * @route   GET /api/users/:username/badges
 * @desc    Get user badges
 * @access  Public
 */
export const getUserBadges = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  const badges = await userService.getUserBadges(username);
  
  return res.status(200).json(
    new ApiResponse(200, badges, 'User badges fetched successfully')
  );
});