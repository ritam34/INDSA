import express from "express";
import * as solutionController from "../controllers/solution.controllers.js";
import { authenticate, optionalAuth } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/role.middleware.js";
import {
  validate,
  validateParams,
  validateQuery,
} from "../middleware/validation.middleware.js";
import {
  createSolutionSchema,
  updateSolutionSchema,
  solutionQuerySchema,
  solutionIdSchema,
  voteSchema,
} from "../validators/solution.validator.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

/**
 * @route   GET /api/solutions/user/:username
 * @desc    Get user's solutions
 * @access  Public
 */
router.get(
  "/user/:username",
  validateQuery(solutionQuerySchema),
  solutionController.getUserSolutions,
);

/**
 * @route   GET /api/solutions/problems/:slug
 * @desc    Get all solutions for a problem
 * @access  Public
 */
router.get(
  "/problems/:slug",
  optionalAuth,
  validateQuery(solutionQuerySchema),
  solutionController.getProblemSolutions,
);

/**
 * @route   POST /api/solutions/problems/:slug
 * @desc    Create solution for a problem
 * @access  Private
 */
router.post(
  "/problems/:slug",
  authenticate,
  rateLimit({ windowMs: 3600000, maxRequests: 5, action: "solution" }), // 5 per hour
  validate(createSolutionSchema),
  solutionController.createSolution,
);

/**
 * @route   GET /api/solutions/:id
 * @desc    Get solution by ID
 * @access  Public
 */
router.get(
  "/:id",
  optionalAuth,
  validateParams(solutionIdSchema),
  solutionController.getSolutionById,
);

/**
 * @route   PATCH /api/solutions/:id
 * @desc    Update solution
 * @access  Private (Owner only)
 */
router.patch(
  "/:id",
  authenticate,
  validateParams(solutionIdSchema),
  validate(updateSolutionSchema),
  solutionController.updateSolution,
);

/**
 * @route   DELETE /api/solutions/:id
 * @desc    Delete solution
 * @access  Private (Owner/Admin)
 */
router.delete(
  "/:id",
  authenticate,
  validateParams(solutionIdSchema),
  solutionController.deleteSolution,
);

/**
 * @route   POST /api/solutions/:id/vote
 * @desc    Vote on solution
 * @access  Private
 */
router.post(
  "/:id/vote",
  authenticate,
  validateParams(solutionIdSchema),
  validate(voteSchema),
  solutionController.voteSolution,
);

/**
 * @route   POST /api/solutions/:id/official
 * @desc    Mark solution as official
 * @access  Private (Admin only)
 */
router.post(
  "/:id/official",
  authenticate,
  isAdmin,
  validateParams(solutionIdSchema),
  solutionController.markAsOfficial,
);

export default router;