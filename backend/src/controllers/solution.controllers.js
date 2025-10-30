import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import * as solutionService from '../services/solution.service.js';

/**
 * @route   POST /api/solutions/problems/:slug
 * @desc    Create solution for a problem
 * @access  Private
 */
export const createSolution = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  
  const solution = await solutionService.createSolution(
    slug,
    req.body,
    req.user.id
  );
  
  return res.status(201).json(
    new ApiResponse(201, solution, 'Solution created successfully')
  );
});

/**
 * @route   GET /api/solutions/problems/:slug
 * @desc    Get all solutions for a problem
 * @access  Public
 */
export const getProblemSolutions = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const currentUserId = req.user?.id;
  
  const solutions = await solutionService.getProblemSolutions(
    slug,
    req.query,
    currentUserId
  );
  
  return res.status(200).json(
    new ApiResponse(200, solutions, 'Solutions fetched successfully')
  );
});

/**
 * @route   GET /api/solutions/:id
 * @desc    Get solution by ID
 * @access  Public
 */
export const getSolutionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;
  
  const solution = await solutionService.getSolutionById(id, currentUserId);
  
  return res.status(200).json(
    new ApiResponse(200, solution, 'Solution fetched successfully')
  );
});

/**
 * @route   PATCH /api/solutions/:id
 * @desc    Update solution
 * @access  Private (Owner only)
 */
export const updateSolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const solution = await solutionService.updateSolution(
    id,
    req.body,
    req.user.id
  );
  
  return res.status(200).json(
    new ApiResponse(200, solution, 'Solution updated successfully')
  );
});

/**
 * @route   DELETE /api/solutions/:id
 * @desc    Delete solution
 * @access  Private (Owner/Admin)
 */
export const deleteSolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'MODERATOR';
  
  const result = await solutionService.deleteSolution(
    id,
    req.user.id,
    isAdmin
  );
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   POST /api/solutions/:id/vote
 * @desc    Vote on solution
 * @access  Private
 */
export const voteSolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;
  
  const result = await solutionService.voteSolution(
    id,
    value,
    req.user.id
  );
  
  return res.status(200).json(
    new ApiResponse(200, result, result.message)
  );
});

/**
 * @route   GET /api/solutions/user/:username
 * @desc    Get user's solutions
 * @access  Public
 */
export const getUserSolutions = asyncHandler(async (req, res) => {
  const { username } = req.params;
  
  const solutions = await solutionService.getUserSolutions(
    username,
    req.query
  );
  
  return res.status(200).json(
    new ApiResponse(200, solutions, 'User solutions fetched successfully')
  );
});

/**
 * @route   POST /api/solutions/:id/official
 * @desc    Mark solution as official
 * @access  Private (Admin only)
 */
export const markAsOfficial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const solution = await solutionService.markAsOfficial(id);
  
  return res.status(200).json(
    new ApiResponse(200, solution, 'Solution marked as official')
  );
});