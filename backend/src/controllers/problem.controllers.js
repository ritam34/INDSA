import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import * as problemService from "../services/problem.service.js";

/**
 * @route   POST /api/problems
 * @desc    Create a new problem
 * @access  Private (Admin)
 */
export const createProblem = asyncHandler(async (req, res) => {
  const problem = await problemService.createProblem(req.body, req.user.id);

  return res
    .status(201)
    .json(new ApiResponse(201, problem, "Problem created successfully"));
});

/**
 * @route   GET /api/problems
 * @desc    Get all problems (with filters)
 * @access  Public
 */
export const getAllProblems = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const problems = await problemService.getProblems(req.query, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, problems, "Problems fetched successfully"));
});

/**
 * @route   GET /api/problems/:slug
 * @desc    Get problem by slug
 * @access  Public
 */
export const getProblemBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user?.id;

  const problem = await problemService.getProblemBySlug(slug, userId);

  return res
    .status(200)
    .json(new ApiResponse(200, problem, "Problem fetched successfully"));
});

/**
 * @route   PATCH /api/problems/:id
 * @desc    Update problem
 * @access  Private (Admin/Creator)
 */
export const updateProblem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const problem = await problemService.updateProblem(id, req.body, req.user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, problem, "Problem updated successfully"));
});

/**
 * @route   DELETE /api/problems/:id
 * @desc    Delete problem (soft delete)
 * @access  Private (Admin/Creator)
 */
export const deleteProblem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await problemService.deleteProblem(id, req.user.id);

  return res.status(200).json(new ApiResponse(200, result, result.message));
});

/**
 * @route   POST /api/problems/:id/test-cases
 * @desc    Add test case to problem
 * @access  Private (Admin/Creator)
 */
export const addTestCase = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const testCase = await problemService.addTestCase(id, req.body, req.user.id);

  return res
    .status(201)
    .json(new ApiResponse(201, testCase, "Test case added successfully"));
});

/**
 * @route   POST /api/problems/:id/code-snippets
 * @desc    Add code snippet to problem
 * @access  Private (Admin/Creator)
 */
export const addCodeSnippet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const snippet = await problemService.addCodeSnippet(
    id,
    req.body,
    req.user.id,
  );

  return res
    .status(201)
    .json(new ApiResponse(201, snippet, "Code snippet added successfully"));
});

/**
 * @route   GET /api/problems/stats/overview
 * @desc    Get problem statistics
 * @access  Public
 */
export const getProblemStats = asyncHandler(async (req, res) => {
  const stats = await problemService.getProblemStats();

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Problem stats fetched successfully"));
});

/**
 * @route   GET /api/problems/search/:query
 * @desc    Search problems
 * @access  Public
 */
export const searchProblems = asyncHandler(async (req, res) => {
  const { query } = req.params;
  const userId = req.user?.id;

  const problems = await problemService.searchProblems(query, userId);

  return res
    .status(200)
    .json(
      new ApiResponse(200, problems, "Search results fetched successfully"),
    );
});

/**
 * @route   GET /api/problems/random
 * @desc    Get random problem
 * @access  Public
 */
export const getRandomProblem = asyncHandler(async (req, res) => {
  const { difficulty } = req.query;

  const problem = await problemService.getRandomProblem(difficulty);

  return res
    .status(200)
    .json(new ApiResponse(200, problem, "Random problem fetched successfully"));
});