import * as studyPlanService from '../services/studyPlan.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * @desc    Get all study plans with filters
 * @route   GET /api/study-plans
 * @access  Public
 */
export const getAllStudyPlans = asyncHandler(async (req, res) => {
  const filters = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
    difficulty: req.query.difficulty,
    category: req.query.category,
    isPremium: req.query.isPremium,
    search: req.query.search,
    sortBy: req.query.sortBy || 'popularity',
    order: req.query.order || 'desc'
  };

  const result = await studyPlanService.getAllStudyPlans(filters);

  res.status(200).json(
    new ApiResponse(200, result, 'Study plans retrieved successfully')
  );
});

/**
 * @desc    Get study plan by slug
 * @route   GET /api/study-plans/:slug
 * @access  Public
 */
export const getStudyPlanBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user?.id;

  const studyPlan = await studyPlanService.getStudyPlanBySlug(slug, userId);

  res.status(200).json(
    new ApiResponse(200, studyPlan, 'Study plan retrieved successfully')
  );
});

/**
 * @desc    Create study plan
 * @route   POST /api/study-plans
 * @access  Private (Admin only)
 */
export const createStudyPlan = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const studyPlanData = req.body;

  const studyPlan = await studyPlanService.createStudyPlan(studyPlanData, userId);

  res.status(201).json(
    new ApiResponse(201, studyPlan, 'Study plan created successfully')
  );
});

/**
 * @desc    Update study plan
 * @route   PATCH /api/study-plans/:id
 * @access  Private (Admin only)
 */
export const updateStudyPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updateData = req.body;

  const studyPlan = await studyPlanService.updateStudyPlan(id, updateData, userId);

  res.status(200).json(
    new ApiResponse(200, studyPlan, 'Study plan updated successfully')
  );
});

/**
 * @desc    Delete study plan
 * @route   DELETE /api/study-plans/:id
 * @access  Private (Admin only)
 */
export const deleteStudyPlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  await studyPlanService.deleteStudyPlan(id, userId);

  res.status(200).json(
    new ApiResponse(200, null, 'Study plan deleted successfully')
  );
});

/**
 * @desc    Enroll in study plan
 * @route   POST /api/study-plans/:slug/enroll
 * @access  Private
 */
export const enrollInStudyPlan = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user.id;
  const { startDate } = req.body;

  const enrollment = await studyPlanService.enrollInStudyPlan(slug, userId, startDate);

  res.status(201).json(
    new ApiResponse(201, enrollment, 'Successfully enrolled in study plan')
  );
});

/**
 * @desc    Unenroll from study plan
 * @route   DELETE /api/study-plans/:slug/enroll
 * @access  Private
 */
export const unenrollFromStudyPlan = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user.id;

  await studyPlanService.unenrollFromStudyPlan(slug, userId);

  res.status(200).json(
    new ApiResponse(200, null, 'Successfully unenrolled from study plan')
  );
});

/**
 * @desc    Get study plan progress
 * @route   GET /api/study-plans/:slug/progress
 * @access  Private
 */
export const getStudyPlanProgress = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const userId = req.user.id;

  const progress = await studyPlanService.getStudyPlanProgress(slug, userId);

  res.status(200).json(
    new ApiResponse(200, progress, 'Progress retrieved successfully')
  );
});

/**
 * @desc    Mark problem as complete
 * @route   POST /api/study-plans/:slug/complete/:problemId
 * @access  Private
 */
export const completeProblem = asyncHandler(async (req, res) => {
  const { slug, problemId } = req.params;
  const userId = req.user.id;
  const { submissionId, notes } = req.body;

  const result = await studyPlanService.completeProblem(slug, userId, problemId, submissionId, notes);

  res.status(200).json(
    new ApiResponse(200, result, 'Problem marked as complete')
  );
});

/**
 * @desc    Get user's enrolled study plans
 * @route   GET /api/study-plans/my-plans
 * @access  Private
 */
export const getUserStudyPlans = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const studyPlans = await studyPlanService.getUserStudyPlans(userId);

  res.status(200).json(
    new ApiResponse(200, studyPlans, 'User study plans retrieved successfully')
  );
});