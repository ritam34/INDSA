import express from "express";
import * as contestController from "../controllers/contest.controllers.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/role.middleware.js";
import {
  validate,
  validateParams,
} from "../middleware/validation.middleware.js";
import {
  createContestSchema,
  updateContestSchema,
  contestSlugSchema,
  contestIdSchema,
  contestSubmissionSchema,
} from "../validators/contest.validator.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

/**
 * @route   GET /api/contests
 * @desc    Get all contests with filters
 * @access  Public
 */
router.get("/", contestController.getAllContests);

/**
 * @route   GET /api/contests/:slug
 * @desc    Get contest by slug
 * @access  Public
 */
router.get(
  "/:slug",
  validateParams(contestSlugSchema),
  contestController.getContestBySlug,
);

/**
 * @route   GET /api/contests/:slug/leaderboard
 * @desc    Get contest leaderboard
 * @access  Public
 */
router.get(
  "/:slug/leaderboard",
  validateParams(contestSlugSchema),
  contestController.getContestLeaderboard,
);

/**
 * @route   GET /api/contests/:slug/standings
 * @desc    Get live contest standings
 * @access  Public
 */
router.get(
  "/:slug/standings",
  validateParams(contestSlugSchema),
  contestController.getContestStandings,
);

/**
 * @route   GET /api/contests/:slug/stats
 * @desc    Get contest statistics
 * @access  Public
 */
router.get(
  "/:slug/stats",
  validateParams(contestSlugSchema),
  contestController.getContestStats,
);

/**
 * @route   GET /api/contests/user/:username/history
 * @desc    Get user's contest history
 * @access  Public
 */
router.get("/user/:username/history", contestController.getUserContestHistory);

/**
 * @route   POST /api/contests/:slug/register
 * @desc    Register for contest
 * @access  Private
 */
router.post(
  "/:slug/register",
  authenticate,
  validateParams(contestSlugSchema),
  contestController.registerForContest,
);

/**
 * @route   DELETE /api/contests/:slug/register
 * @desc    Unregister from contest
 * @access  Private
 */
router.delete(
  "/:slug/register",
  authenticate,
  validateParams(contestSlugSchema),
  contestController.unregisterFromContest,
);

/**
 * @route   GET /api/contests/:slug/problems
 * @desc    Get contest problems (only for registered users)
 * @access  Private
 */
router.get(
  "/:slug/problems",
  authenticate,
  validateParams(contestSlugSchema),
  contestController.getContestProblems,
);

/**
 * @route   POST /api/contests/:slug/submit
 * @desc    Submit solution to contest problem
 * @access  Private
 */
router.post(
  "/:slug/submit",
  authenticate,
  validateParams(contestSlugSchema),
  validate(contestSubmissionSchema),
  rateLimit({ maxRequests: 50, windowMs: 60 * 60 * 1000 }),
  contestController.submitContestSolution,
);

/**
 * @route   GET /api/contests/:slug/my-submissions
 * @desc    Get user's contest submissions
 * @access  Private
 */
router.get(
  "/:slug/my-submissions",
  authenticate,
  validateParams(contestSlugSchema),
  contestController.getMyContestSubmissions,
);

/**
 * @route   POST /api/contests
 * @desc    Create new contest
 * @access  Private (Admin only)
 */
router.post(
  "/",
  authenticate,
  isAdmin,
  validate(createContestSchema),
  contestController.createContest,
);

/**
 * @route   PATCH /api/contests/:id
 * @desc    Update contest
 * @access  Private (Admin only)
 */
router.patch(
  "/:id",
  authenticate,
  isAdmin,
  validateParams(contestIdSchema),
  validate(updateContestSchema),
  contestController.updateContest,
);

/**
 * @route   DELETE /api/contests/:id
 * @desc    Delete contest (soft delete)
 * @access  Private (Admin only)
 */
router.delete(
  "/:id",
  authenticate,
  isAdmin,
  validateParams(contestIdSchema),
  contestController.deleteContest,
);

/**
 * @route   POST /api/contests/:slug/finalize
 * @desc    Finalize contest and calculate ratings
 * @access  Private (Admin only)
 */
router.post(
  "/:slug/finalize",
  authenticate,
  isAdmin,
  validateParams(contestSlugSchema),
  contestController.finalizeContest,
);

export default router;