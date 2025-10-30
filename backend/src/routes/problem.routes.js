import express from 'express';
import * as problemController from '../controllers/problem.controllers.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/role.middleware.js';
import { validate, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import {
  createProblemSchema,
  updateProblemSchema,
  problemQuerySchema,
  problemSlugSchema,
  problemIdSchema,
  addTestCaseSchema,
  addCodeSnippetSchema
} from '../validators/problem.validator.js';

const router = express.Router();

/**
 * @route   GET /api/problems/stats/overview
 * @desc    Get problem statistics
 * @access  Public
 */
router.get('/stats/overview', problemController.getProblemStats);

/**
 * @route   GET /api/problems/random
 * @desc    Get random problem
 * @access  Public
 */
router.get('/random', problemController.getRandomProblem);

/**
 * @route   GET /api/problems/search/:query
 * @desc    Search problems
 * @access  Public
 */
router.get('/search/:query', optionalAuth, problemController.searchProblems);

/**
 * @route   GET /api/problems
 * @desc    Get all problems (with filters)
 * @access  Public
 */
router.get(
  '/',
  optionalAuth,
  validateQuery(problemQuerySchema),
  problemController.getAllProblems
);

/**
 * @route   POST /api/problems
 * @desc    Create a new problem
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  isAdmin,
  validate(createProblemSchema),
  problemController.createProblem
);

/**
 * @route   GET /api/problems/:slug
 * @desc    Get problem by slug
 * @access  Public
 */
router.get(
  '/:slug',
  optionalAuth,
  validateParams(problemSlugSchema),
  problemController.getProblemBySlug
);

/**
 * @route   PATCH /api/problems/:id
 * @desc    Update problem
 * @access  Private (Admin/Creator)
 */
router.patch(
  '/:id',
  authenticate,
  isAdmin,
  validateParams(problemIdSchema),
  validate(updateProblemSchema),
  problemController.updateProblem
);

/**
 * @route   DELETE /api/problems/:id
 * @desc    Delete problem (soft delete)
 * @access  Private (Admin/Creator)
 */
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  validateParams(problemIdSchema),
  problemController.deleteProblem
);

/**
 * @route   POST /api/problems/:id/test-cases
 * @desc    Add test case to problem
 * @access  Private (Admin/Creator)
 */
router.post(
  '/:id/test-cases',
  authenticate,
  isAdmin,
  validateParams(problemIdSchema),
  validate(addTestCaseSchema),
  problemController.addTestCase
);

/**
 * @route   POST /api/problems/:id/code-snippets
 * @desc    Add code snippet to problem
 * @access  Private (Admin/Creator)
 */
router.post(
  '/:id/code-snippets',
  authenticate,
  isAdmin,
  validateParams(problemIdSchema),
  validate(addCodeSnippetSchema),
  problemController.addCodeSnippet
);

export default router;