import express from 'express';
import * as studyPlanController from '../controllers/studyPlan.controllers.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/role.middleware.js';
import { validate, validateParams } from '../middleware/validation.middleware.js';
import {
  createStudyPlanSchema,
  updateStudyPlanSchema,
  studyPlanSlugSchema,
  studyPlanIdSchema,
  problemIdSchema,
  enrollStudyPlanSchema,
  completeProblemSchema
} from '../validators/studyPlan.validator.js';

const router = express.Router();

/**
 * @route   GET /api/study-plans
 * @desc    Get all study plans with filters
 * @access  Public
 */
router.get('/', studyPlanController.getAllStudyPlans);

/**
 * @route   GET /api/study-plans/:slug
 * @desc    Get study plan by slug (with enrollment status if authenticated)
 * @access  Public (optionally authenticated)
 */
router.get(
  '/:slug',
  optionalAuth,
  validateParams(studyPlanSlugSchema),
  studyPlanController.getStudyPlanBySlug
);

/**
 * @route   GET /api/study-plans/my-plans
 * @desc    Get user's enrolled study plans
 * @access  Private
 */
router.get(
  '/my-plans',
  authenticate,
  studyPlanController.getUserStudyPlans
);

/**
 * @route   POST /api/study-plans/:slug/enroll
 * @desc    Enroll in study plan
 * @access  Private
 */
router.post(
  '/:slug/enroll',
  authenticate,
  validateParams(studyPlanSlugSchema),
  validate(enrollStudyPlanSchema),
  studyPlanController.enrollInStudyPlan
);

/**
 * @route   DELETE /api/study-plans/:slug/enroll
 * @desc    Unenroll from study plan
 * @access  Private
 */
router.delete(
  '/:slug/enroll',
  authenticate,
  validateParams(studyPlanSlugSchema),
  studyPlanController.unenrollFromStudyPlan
);

/**
 * @route   GET /api/study-plans/:slug/progress
 * @desc    Get study plan progress
 * @access  Private
 */
router.get(
  '/:slug/progress',
  authenticate,
  validateParams(studyPlanSlugSchema),
  studyPlanController.getStudyPlanProgress
);

/**
 * @route   POST /api/study-plans/:slug/complete/:problemId
 * @desc    Mark problem as complete in study plan
 * @access  Private
 */
router.post(
  '/:slug/complete/:problemId',
  authenticate,
  validateParams(studyPlanSlugSchema),
  validateParams(problemIdSchema),
  validate(completeProblemSchema),
  studyPlanController.completeProblem
);

/**
 * @route   POST /api/study-plans
 * @desc    Create study plan
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  isAdmin,
  validate(createStudyPlanSchema),
  studyPlanController.createStudyPlan
);

/**
 * @route   PATCH /api/study-plans/:id
 * @desc    Update study plan
 * @access  Private (Admin only)
 */
router.patch(
  '/:id',
  authenticate,
  isAdmin,
  validateParams(studyPlanIdSchema),
  validate(updateStudyPlanSchema),
  studyPlanController.updateStudyPlan
);

/**
 * @route   DELETE /api/study-plans/:id
 * @desc    Delete study plan (soft delete)
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  validateParams(studyPlanIdSchema),
  studyPlanController.deleteStudyPlan
);

export default router;