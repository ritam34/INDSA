import * as contestService from '../services/contest.service.js';
import * as contestSubmissionService from '../services/contestSubmission.service.js';
import * as ratingService from '../services/rating.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Get all contests with filters
 * @route   GET /api/contests
 * @access  Public
 */
export const getAllContests = asyncHandler(async (req, res) => {
  const filters = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    status: req.query.status, // UPCOMING, ONGOING, COMPLETED
    difficulty: req.query.difficulty,
    search: req.query.search
  };

  const result = await contestService.getAllContests(filters);

  res.status(200).json(
    new ApiResponse(200, result, 'Contests retrieved successfully')
  );
});

/**
 * @desc    Get contest by slug
 * @route   GET /api/contests/:slug
 * @access  Public
 */
export const getContestBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user?.id;

  const contest = await contestService.getContestBySlug(slug, userId);

  res.status(200).json(
    new ApiResponse(200, contest, 'Contest retrieved successfully')
  );
});

/**
 * @desc    Create new contest
 * @route   POST /api/contests
 * @access  Private (Admin only)
 */
export const createContest = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const contestData = req.body;

  const contest = await contestService.createContest(contestData, userId);

  res.status(201).json(
    new ApiResponse(201, contest, 'Contest created successfully')
  );
});

/**
 * @desc    Update contest
 * @route   PATCH /api/contests/:id
 * @access  Private (Admin only)
 */
export const updateContest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const userId = req.user.id;

  const contest = await contestService.updateContest(id, updateData, userId);

  res.status(200).json(
    new ApiResponse(200, contest, 'Contest updated successfully')
  );
});

/**
 * @desc    Delete contest
 * @route   DELETE /api/contests/:id
 * @access  Private (Admin only)
 */
export const deleteContest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  await contestService.deleteContest(id, userId);

  res.status(200).json(
    new ApiResponse(200, null, 'Contest deleted successfully')
  );
});

/**
 * @desc    Register for contest
 * @route   POST /api/contests/:slug/register
 * @access  Private
 */
export const registerForContest = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user.id;

  const registration = await contestService.registerForContest(slug, userId);

  res.status(201).json(
    new ApiResponse(201, registration, 'Successfully registered for contest')
  );
});

/**
 * @desc    Unregister from contest
 * @route   DELETE /api/contests/:slug/register
 * @access  Private
 */
export const unregisterFromContest = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user.id;

  await contestService.unregisterFromContest(slug, userId);

  res.status(200).json(
    new ApiResponse(200, null, 'Successfully unregistered from contest')
  );
});

/**
 * @desc    Get contest problems
 * @route   GET /api/contests/:slug/problems
 * @access  Private (Registered users only)
 */
export const getContestProblems = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user.id;

  const problems = await contestService.getContestProblems(slug, userId);

  res.status(200).json(
    new ApiResponse(200, problems, 'Contest problems retrieved successfully')
  );
});

/**
 * @desc    Submit solution to contest problem
 * @route   POST /api/contests/:slug/submit
 * @access  Private (Registered users only)
 */
export const submitContestSolution = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user.id;
  const { problemId, code, languageId } = req.body;

  const submission = await contestSubmissionService.createContestSubmission(
    slug,
    userId,
    problemId,
    code,
    languageId
  );

  res.status(201).json(
    new ApiResponse(201, submission, 'Solution submitted successfully')
  );
});

/**
 * @desc    Get contest leaderboard
 * @route   GET /api/contests/:slug/leaderboard
 * @access  Public
 */
export const getContestLeaderboard = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;

  const leaderboard = await contestService.getContestLeaderboard(slug, page, limit);

  res.status(200).json(
    new ApiResponse(200, leaderboard, 'Leaderboard retrieved successfully')
  );
});

/**
 * @desc    Get user's contest submissions
 * @route   GET /api/contests/:slug/my-submissions
 * @access  Private
 */
export const getMyContestSubmissions = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user.id;

  const submissions = await contestSubmissionService.getUserContestSubmissions(
    slug,
    userId
  );

  res.status(200).json(
    new ApiResponse(200, submissions, 'Submissions retrieved successfully')
  );
});

/**
 * @desc    Get contest standings (live ranking during contest)
 * @route   GET /api/contests/:slug/standings
 * @access  Public
 */
export const getContestStandings = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const standings = await contestService.getContestStandings(slug);

  res.status(200).json(
    new ApiResponse(200, standings, 'Contest standings retrieved successfully')
  );
});

/**
 * @desc    Finalize contest and calculate ratings
 * @route   POST /api/contests/:slug/finalize
 * @access  Private (Admin only)
 */
export const finalizeContest = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user.id;

  await ratingService.calculateContestRatings(slug);
  await contestService.finalizeContest(slug, userId);

  res.status(200).json(
    new ApiResponse(200, null, 'Contest finalized and ratings calculated')
  );
});

/**
 * @desc    Get user's contest history
 * @route   GET /api/contests/user/:username/history
 * @access  Public
 */
export const getUserContestHistory = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const history = await contestService.getUserContestHistory(username, page, limit);

  res.status(200).json(
    new ApiResponse(200, history, 'Contest history retrieved successfully')
  );
});

/**
 * @desc    Get contest statistics
 * @route   GET /api/contests/:slug/stats
 * @access  Public
 */
export const getContestStats = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const stats = await contestService.getContestStats(slug);

  res.status(200).json(
    new ApiResponse(200, stats, 'Contest statistics retrieved successfully')
  );
});