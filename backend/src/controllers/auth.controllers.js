import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import * as authService from '../services/auth.service.js';

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
export const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);
  
  return res.status(201).json(
    new ApiResponse(201, result, result.message)
  );
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  
  return res.status(200).json(
    new ApiResponse(200, result, 'Login successful')
  );
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  
  return res.status(200).json(
    new ApiResponse(200, result, 'Token refreshed successfully')
  );
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user email
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const result = await authService.verifyEmail(token);
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendVerificationEmail(email);
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.user.id);
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});