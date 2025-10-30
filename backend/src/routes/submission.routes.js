import express from 'express';
import * as submissionController from '../controllers/submission.controllers.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import {
  runCodeSchema,
  submitSolutionSchema,
  submissionQuerySchema
} from '../validators/submission.validator.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/submissions/languages
 * @desc    Get supported languages
 * @access  Public
 */
router.get('/languages', submissionController.getSupportedLanguages);

/**
 * @route   POST /api/submissions/run
 * @desc    Run code with public test cases or custom input
 * @access  Private
 */
router.post(
  '/run',
  authenticate,
  rateLimit({ windowMs: 60000, maxRequests: 10 }), // 10 requests per minute
  validate(runCodeSchema),
  submissionController.runCode
);

/**
 * @route   POST /api/submissions/submit
 * @desc    Submit solution (run all test cases)
 * @access  Private
 */
router.post(
  '/submit',
  authenticate,
  rateLimit({ windowMs: 60000, maxRequests: 5 }), // 5 submissions per minute
  validate(submitSolutionSchema),
  submissionController.submitSolution
);

/**
 * @route   GET /api/submissions/user/me
 * @desc    Get current user's submissions
 * @access  Private
 */
router.get(
  '/user/me',
  authenticate,
  validateQuery(submissionQuerySchema),
  submissionController.getMySubmissions
);

/**
 * @route   GET /api/submissions/problem/:slug
 * @desc    Get submissions for a specific problem
 * @access  Private
 */
router.get(
  '/problem/:slug',
  authenticate,
  validateQuery(submissionQuerySchema),
  submissionController.getProblemSubmissions
);

/**
 * @route   GET /api/submissions/:id
 * @desc    Get submission by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  submissionController.getSubmissionById
);

export default router;